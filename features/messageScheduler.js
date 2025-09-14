const cron = require('node-cron');
const { isConnected, sock } = require('./botCore');
const { BotMessage } = require('./dbHelper');

const groupIds = ['120363334862606010@g.us'];
const scheduledMessage = '📢 *Pengingat Absen:*\nJangan lupa absen ya, semangat beraktivitas!';

async function kirimPesanKeGrup() {
  if (!isConnected) return console.log('⚠️ Bot belum siap, lewati pengiriman pesan grup.');
  
  for (const groupId of groupIds) {
    try {
      const sent = await sock.sendMessage(groupId, { text: scheduledMessage });
      BotMessage.simpan(sent.key.id, groupId, scheduledMessage);
      console.log(`✅ Pesan terkirim ke ${groupId}`);
    } catch (err) {
      console.error(`❌ Gagal kirim ke ${groupId}:`, err);
    }
  }
}

function pasangScheduler() {
  cron.schedule('15 7 * * 1-5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
  cron.schedule('45 7 * * 1-5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
  cron.schedule('15 16 * * 1-4', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
  cron.schedule('0 16 * * 1-4', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
  cron.schedule('45 16 * * 5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
  cron.schedule('30 16 * * 5', kirimPesanKeGrup, { timezone: 'Asia/Jakarta' });
}

module.exports = { kirimPesanKeGrup, pasangScheduler };
