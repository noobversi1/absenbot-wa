const cron = require('node-cron');
const { BotMessage } = require('../dbHelper');

const groupIds = ['120363334862606010@g.us'];
const scheduledMessage = '📢 *Pengingat Absen:*\nJangan lupa absen ya, semangat beraktivitas!';

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

async function kirimPesanKeGrup(sock) {
  if (!sock || !sock.user) return;

  for (const groupId of groupIds) {
    // Cek apakah sudah pernah dikirim hari ini
    const today = new Date().toISOString().slice(0, 10);
    const alreadySent = await BotMessage.byTextAndDate(groupId, scheduledMessage, today);
    if (alreadySent) continue;

    const sent = await safeSend(sock, groupId, { text: scheduledMessage });
    if (sent) await BotMessage.simpan(sent.key.id, groupId, scheduledMessage, new Date());
  }
}

function pasangScheduler(sock) {
  const times = [
    '15 7 * * 1-5',
    '45 7 * * 1-5',
    '15 16 * * 1-4',
    '0 16 * * 1-4',
    '45 16 * * 5',
    '30 16 * * 5'
  ];

  times.forEach(t => cron.schedule(t, () => kirimPesanKeGrup(sock), { timezone: 'Asia/Jakarta' }));
}

module.exports = { kirimPesanKeGrup, pasangScheduler };
