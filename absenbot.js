const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const cron = require('node-cron');
const fs = require('fs');
const qrcode = require('qrcode-terminal');

const groupIds = [
  //  '120363419214033177@g.us', // Ganti dengan ID grupmu
  '120363334862606010@g.us',
  // 'ID_GRUP_LAINNYA@g.us'
];

const scheduledMessage = '📢 *Pengingat Absen:*\nJangan lupa absen ya, semangat beraktivitas!';

const sheetURL = 'https://docs.google.com/spreadsheets/d/e/......pub?output=csv'; // Ganti sesuai URL Sheet-mu

let isConnected = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    auth: state,
  });

  // Tampilkan QR di terminal
  sock.ev.on('connection.update', ({ qr }) => {
    if (qr) {
      qrcode.generate(qr, { small: true });
    }
  });

  // Simpan sesi secara otomatis
  sock.ev.on('creds.update', saveCreds);

  // Tampilkan daftar grup saat koneksi terbuka
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'open') {
      isConnected = true;
      console.log('✅ Bot WhatsApp siap digunakan!');
      await tampilkanDaftarGrup(sock);
    }

    if (connection === 'close') {
      isConnected = false;
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log('🔌 Koneksi terputus. Mencoba menyambung ulang...');
      if (reason !== DisconnectReason.loggedOut) {
        startBot();
      } else {
        console.log('❌ Harus login ulang. Hapus folder "session" lalu jalankan ulang.');
      }
    }
  });

  // Balas pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message) return;

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';
    const sender = msg.key.remoteJid;

    if (body.toLowerCase() === '#hi') {
      await sock.sendMessage(sender, { text: '👋 Hai juga! Bot ini aktif dan siap membantu.' });
    }
  });

  // Kirim pesan absen terjadwal
  function kirimPesanKeGrup() {
    if (!isConnected) {
      console.log('⚠️ Bot belum siap, lewati pengiriman pesan grup.');
      return;
    }
    groupIds.forEach(async (groupId) => {
      try {
        await sock.sendMessage(groupId, { text: scheduledMessage });
        console.log(`✅ Pesan terkirim ke ${groupId}`);
      } catch (err) {
        console.error(`❌ Gagal kirim ke ${groupId}:`, err);
      }
    });
  }

  // Jadwal pengiriman pesan
  cron.schedule('15 7 * * 1-5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' }); // 07:15 Senin–Jumat
  cron.schedule('45 7 * * 1-5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' }); // 07:45 Senin–Jumat
  cron.schedule('15 16 * * 1-4', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' }); // 16:15 Senin–Kamis
  cron.schedule('45 16 * * 5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' }); // 16:45 Jumat

  // Cek dan kirim ucapan ulang tahun setiap hari jam 06:01
  setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 6 && now.getMinutes() === 1) {
      await cekDanKirimUcapan(sock);
    }
  }, 60 * 1000);
}

// Ambil data ulang tahun dari Google Sheets
async function ambilDataUlangTahun() {
  try {
    const res = await fetch(sheetURL);
    const data = await res.text();
    const rows = data.split('\n').slice(1); // lewati header

    return rows.map(row => {
      const [nama, tanggal, pesan, tujuan] = row.split(',');
      return {
        nama: nama?.trim(),
        tanggal: tanggal?.trim(),
        pesan: pesan?.trim(),
        tujuan: tujuan?.trim().replace(/\r/g, '') // buang \r kalau ada
      };
    });
  } catch (err) {
    console.error('❌ Gagal ambil data ulang tahun:', err);
    return [];
  }
}

// Kirim ucapan ulang tahun
async function cekDanKirimUcapan(sock) {
  if (!isConnected) {
    console.log('⚠️ Bot belum tersambung, tidak mengirim ucapan.');
    return;
  }
  const hariIni = new Date();
  const tglHariIni = hariIni.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: '2-digit'
  });

  const listUltah = await ambilDataUlangTahun();

  for (const data of listUltah) {
    if (data.tanggal === tglHariIni) {
      // Pisahkan tujuan jika ada banyak, dipisah dengan koma
      const tujuanList = data.tujuan.split(',').map(t => t.trim());

      for (const tujuan of tujuanList) {
        try {
          await sock.sendMessage(tujuan, { text: data.pesan });
          console.log(`🎉 Ucapan terkirim ke ${data.nama} (${tujuan})`);
        } catch (err) {
          console.error(`❌ Gagal kirim ke ${data.nama} (${tujuan}):`, err);
        }
      }
    }
  }
}

// Tampilkan semua grup yang terhubung
async function tampilkanDaftarGrup(sock) {
  try {
    const groups = await sock.groupFetchAllParticipating();
    console.log('\n📋 Daftar Grup:');
    for (const [id, group] of Object.entries(groups)) {
      console.log(`• ${group.subject} | ID: ${id}`);
    }
  } catch (err) {
    console.error('❌ Gagal ambil daftar grup:', err);
  }
}

startBot();

