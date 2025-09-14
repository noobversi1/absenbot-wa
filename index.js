const { startBot } = require('./botCore');
const { pasangScheduler } = require('./messageScheduler');
const { cekDanKirimUcapan } = require('./birthdayWishes');
const { setupMessageReply } = require('./messageReply');

// Jalankan bot
const sock = startBot();

// Pasang scheduler pesan absen
pasangScheduler(sock);

// Pasang scheduler ucapan ulang tahun (cek tiap jam 6 pagi)
const cron = require('node-cron');
cron.schedule('1 6 * * *', () => cekDanKirimUcapan(sock), { timezone: 'Asia/Jakarta' });

// Setup handler pesan masuk & reply admin
setupMessageReply(sock);
