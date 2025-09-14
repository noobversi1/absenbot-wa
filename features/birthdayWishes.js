const fs = require('fs');
const path = require('path');
const { isConnected, sock } = require('./botCore');

async function bacaFileUltah() {
  try {
    const data = fs.readFileSync(path.join(__dirname, 'data', 'ultah.txt'), 'utf-8');
    return data.split('\n').filter(l => l.trim() !== '').map(row => {
      const [nama, tanggal, pesan, tujuan] = row.split(';');
      return { nama: nama?.trim(), tanggal: tanggal?.trim().replace(/[-]/g, '/'), pesan: pesan?.trim(), tujuan: tujuan?.trim() };
    });
  } catch (err) {
    console.error('❌ Gagal baca file ultah.txt:', err);
    return [];
  }
}

async function cekDanKirimUcapan(sockInstance) {
  if (!isConnected) return console.log('⚠️ Bot belum tersambung, tidak mengirim ucapan.');
  const hariIni = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit' });
  const listUltah = await bacaFileUltah();

  for (const data of listUltah) {
    if (data.tanggal === hariIni) {
      try {
        await sockInstance.sendMessage(data.tujuan, { text: data.pesan });
        console.log(`🎉 Ucapan terkirim ke ${data.nama} (${data.tujuan})`);
      } catch (err) {
        console.error(`❌ Gagal kirim ke ${data.nama} (${data.tujuan}):`, err);
      }
    }
  }
}

module.exports = { cekDanKirimUcapan };
