const fs = require('fs');
const path = require('path');
const { BotMessage } = require('../dbHelper');

async function safeSend(sock, jid, message, maxRetry = 3) {
  let attempt = 0;
  while (attempt < maxRetry) {
    try {
      const sent = await sock.sendMessage(jid, message);
      return sent;
    } catch (err) {
      attempt++;
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

async function bacaFileUltah() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'ultah.txt'), 'utf-8');
    return data.split('\n').filter(l => l.trim() !== '').map(row => {
      const [nama, tanggal, pesan, tujuan] = row.split(';');
      return { nama, tanggal: tanggal?.replace(/[-]/g, '/'), pesan, tujuan };
    });
  } catch (err) {
    return [];
  }
}

async function cekDanKirimUcapan(sock) {
  if (!sock || !sock.user) return;
  const hariIni = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
  const listUltah = await bacaFileUltah();

  for (const data of listUltah) {
    if (data.tanggal === hariIni) {
      // Cek duplikat hari ini
      const alreadySent = await BotMessage.byTextAndDate(data.tujuan, data.pesan, hariIni);
      if (alreadySent) continue;

      const sent = await safeSend(sock, data.tujuan, { text: data.pesan });
      if (sent) await BotMessage.simpan(sent.key.id, data.tujuan, data.pesan, new Date());
    }
  }
}

module.exports = { cekDanKirimUcapan };
