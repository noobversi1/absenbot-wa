// features/birthdayWishes.js
const fs = require('fs');
const path = require('path');
const { BotMessage } = require('../dbHelper');

async function safeSend(sock, jid, message, maxRetry = 3) {
  let attempt = 0;
  while (attempt < maxRetry) {
    try {
      const sent = await sock.sendMessage(jid, message);
      console.log(`✅ Pesan terkirim ke ${jid}`);
      return sent;
    } catch (err) {
      attempt++;
      console.warn(`⚠️ Gagal kirim pesan ke ${jid}, percobaan ${attempt}/${maxRetry}`);
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  console.error(`❌ Gagal kirim pesan ke ${jid} setelah ${maxRetry} percobaan`);
  return null;
}

async function bacaFileUltah() {
  try {
    const data = fs.readFileSync(path.join(__dirname, '..', 'data', 'ultah.txt'), 'utf-8');
    return data.split('\n').filter(l => l.trim() !== '').map(row => {
      const [nama, tanggal, tujuan] = row.split(';');
      // Ambil hanya dd/mm
      const [dd, mm] = tanggal?.replace(/[-]/g, '/').split('/');
      return { nama, tanggal: `${dd}/${mm}`, tujuan };
    });
  } catch (err) {
    console.error('❌ Gagal baca file ultah.txt:', err);
    return [];
  }
}

// Template pesan ulang tahun
function buatPesanUltah(nama) {
  return `🎉 Selamat ulang tahun, ${nama}!\nSemoga setiap langkahmu penuh berkah, setiap harapanmu dimudahkan, dan setiap harimu dipenuhi kebahagiaan.\nTerus jadi versi terbaik dirimu! 🌟`;
}

async function cekDanKirimUcapan(sock) {
  if (!sock || !sock.user) return;

  const hariIni = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
  console.log(`📅 Hari ini: ${hariIni}`);

  const listUltah = await bacaFileUltah();
  console.log(`📂 Jumlah data ultah: ${listUltah.length}`);

  for (const data of listUltah) {
    if (data.tanggal === hariIni) {
      console.log(`🎉 Hari ini ultah: ${data.nama} (${data.tujuan})`);
      const pesan = buatPesanUltah(data.nama);
      
      // Cek duplikat hari ini
      const alreadySent = await BotMessage.byTextAndDate
        ? await BotMessage.byTextAndDate(data.tujuan, pesan, hariIni)
        : await BotMessage.byText(data.tujuan, pesan); // fallback kalau byTextAndDate belum ada

      if (alreadySent) {
        console.log(`⏭ Pesan untuk ${data.nama} sudah dikirim hari ini`);
        continue;
      }

      const sent = await safeSend(sock, data.tujuan, { text: pesan });
      if (sent) {
        const dateStr = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
        await BotMessage.simpan(sent.key.id, data.tujuan, pesan, dateStr);
      }
    }
  }
}

module.exports = { cekDanKirimUcapan };
