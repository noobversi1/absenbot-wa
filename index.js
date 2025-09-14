const { startBot } = require('./core/botCore');
const { pasangScheduler } = require('./features/messageScheduler');
const { cekDanKirimUcapan } = require('./features/birthdayWishes');
const { setupMessageReply } = require('./features/messageReply');
const cron = require('node-cron');

(async () => {
  const sock = await startBot();

  pasangScheduler(sock);
  cron.schedule('1 6 * * *', () => cekDanKirimUcapan(sock), { timezone: 'Asia/Jakarta' });
  setupMessageReply(sock);
})();
