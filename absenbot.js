// ========================
// DEPENDENCY
// ========================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason
} = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

// Import helper DB
const { Mapping, BotMessage } = require('./dbHelper');

// ========================
// KONFIG
// ========================
const groupIds = [
  '120363334862606010@g.us',
];
const scheduledMessage = '📢 *Pengingat Absen:*\nJangan lupa absen ya, semangat beraktivitas!';
const adminNumber = '628XXXXXXX@s.whatsapp.net'; // ganti dengan nomor admin
let isConnected = false;
let sock; // socket global
const processedIds = new Set(); // anti-duplikat pesan

// ========================
// START BOT
// ========================
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  // cleanup socket lama
  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch {}
  }

  sock = makeWASocket({ version, auth: state });

  // Tampilkan QR
  sock.ev.on('connection.update', ({ qr }) => {
    if (qr) qrcode.generate(qr, { small: true });
  });

  // Simpan sesi otomatis
  sock.ev.on('creds.update', saveCreds);

  // Update koneksi
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

  // Handle pesan masuk
  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;

    // anti-duplikat
    if (processedIds.has(msg.key.id)) return;
    processedIds.add(msg.key.id);

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    // === Command sederhana ===
    if (body.toLowerCase() === '#hi') {
      const sent = await sock.sendMessage(msg.key.remoteJid, { text: '👋 Hai juga! Bot ini aktif dan siap membantu.' });
      BotMessage.simpan(sent.key.id, msg.key.remoteJid, '👋 Hai juga! Bot ini aktif dan siap membantu.');
    }

    // === Reply ke pesan BOT di grup ===
    if (msg.key.remoteJid.endsWith('@g.us') && msg.message.extendedTextMessage?.contextInfo) {
      const context = msg.message.extendedTextMessage.contextInfo;
      const quotedId = context.stanzaId;
      const quotedMsgText = context.quotedMessage?.conversation
        || context.quotedMessage?.extendedTextMessage?.text
        || "";

      console.log("📩 Incoming reply context:", context);

      // Cari pesan bot
      let foundBotMsg = quotedId ? BotMessage.byStanza(quotedId) : null;
      if (!foundBotMsg && quotedMsgText) {
        foundBotMsg = BotMessage.byText(msg.key.remoteJid, quotedMsgText);
      }
      if (!foundBotMsg && quotedMsgText) {
        foundBotMsg = BotMessage.byTextLike(msg.key.remoteJid, quotedMsgText);
      }

      if (foundBotMsg) {
        console.log("✅ Reply ke PESAN BOT terdeteksi:", foundBotMsg);
        Mapping.simpan(
          foundBotMsg.stanzaId,
          msg.key.remoteJid,
          adminNumber,
          msg.pushName,
          context.quotedMessage || ""
        );

        const replyText = msg.message.extendedTextMessage?.text || '';
        await sock.sendMessage(adminNumber, {
          text: `[Reply ke BOT dari ${msg.pushName}]\n${replyText}`
        });
      } else {
        console.log("⚠️ Reply ini bukan ke pesan BOT yang terekam, diabaikan.");
      }
    }

    // === Kalau admin balas ===
    if (msg.key.remoteJid === adminNumber) {
      const replyText = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || '';
      const lastMap = Mapping.byForward(adminNumber);

      if (lastMap) {
        await sock.sendMessage(lastMap.groupId, {
          text: replyText,
          contextInfo: {
            stanzaId: lastMap.stanzaId,
            participant: sock.user.id,
            quotedMessage: lastMap.quotedMessage || {}
          }
        });
        console.log(`📤 Balasan admin diteruskan ke grup ${lastMap.groupId}`);
      } else {
        console.log("⚠️ Tidak ada mapping untuk admin; tidak ada grup tujuan.");
      }
    }
  });
}

// ========================
// CRON JOB PESAN ABSEN
// ========================
function kirimPesanKeGrup() {
  if (!isConnected) {
    console.log('⚠️ Bot belum siap, lewati pengiriman pesan grup.');
    return;
  }
  groupIds.forEach(async (groupId) => {
    try {
      const sent = await sock.sendMessage(groupId, { text: scheduledMessage });
      BotMessage.simpan(sent.key.id, groupId, scheduledMessage);
      console.log(`✅ Pesan terkirim ke ${groupId}`);
    } catch (err) {
      console.error(`❌ Gagal kirim ke ${groupId}:`, err);
    }
  });
}

// pasang cron sekali aja
cron.schedule('15 7 * * 1-5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
cron.schedule('45 7 * * 1-5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
cron.schedule('15 16 * * 1-4', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
cron.schedule('0 16 * * 1-4', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
cron.schedule('45 16 * * 5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
cron.schedule('30 16 * * 5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });

cron.schedule('1 6 * * *', () => cekDanKirimUcapan(sock), { timezone: 'Asia/Jakarta' });

// ========================
// FUNGSI ULANG TAHUN
// ========================
async function bacaFileUltah() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'ultah.txt'), 'utf-8');
    const rows = data.split('\n').filter(line => line.trim() !== '');
    return rows.map(row => {
      const [nama, tanggal, pesan, tujuan] = row.split(';');
      return {
        nama: nama?.trim(),
        tanggal: tanggal?.trim().replace(/[-]/g, '/'),
        pesan: pesan?.trim(),
        tujuan: tujuan?.trim()
      };
    });
  } catch (err) {
    console.error('❌ Gagal baca file ultah.txt:', err);
    return [];
  }
}

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

  const listUltah = await bacaFileUltah();

  for (const data of listUltah) {
    if (data.tanggal === tglHariIni) {
      try {
        await sock.sendMessage(data.tujuan, { text: data.pesan });
        console.log(`🎉 Ucapan terkirim ke ${data.nama} (${data.tujuan})`);
      } catch (err) {
        console.error(`❌ Gagal kirim ke ${data.nama} (${data.tujuan}):`, err);
      }
    }
  }
}

// ========================
// DAFTAR GRUP
// ========================
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

// jalankan bot
startBot();
