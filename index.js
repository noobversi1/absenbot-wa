const { startBot } = require('./core/botCore');
const { pasangScheduler } = require('./features/messageScheduler');
const { cekDanKirimUcapan } = require('./features/birthdayWishes');
const { setupMessageReply } = require('./features/messageReply');
const { tampilkanDaftarGrup } = require('./core/utils');
const cron = require('node-cron');

(async () => {
  let sock;
  try {
    sock = await startBot();
  } catch (err) {
    console.error('❌ Gagal start bot:', err);
    return process.exit(1);
  }

  // Tunggu socket benar-benar 'open'
  const waitOpen = () => new Promise(resolve => {
    sock.ev.on('connection.update', function onUpdate({ connection, lastDisconnect }) {
      if (connection === 'open') {
        console.log('✅ Bot siap digunakan!');
        sock.ev.off('connection.update', onUpdate);
        resolve();
      } else if (connection === 'close') {
        console.error('❌ Koneksi ditutup:', lastDisconnect?.error || 'unknown');
      }
    });
  });
  await waitOpen();

  // Semua WA API aman di sini
  try { setupMessageReply(sock); } catch (err) { console.error(err); }
  try { pasangScheduler(sock); } catch (err) { console.error(err); }
  try { tampilkanDaftarGrup(sock); } catch (err) { console.error(err); }

  // Scheduler ucapan ulang tahun
  cron.schedule('1 6 * * *', async () => {
    try { await cekDanKirimUcapan(sock); } 
    catch (err) { console.error(err); }
  }, { timezone: 'Asia/Jakarta' });
})();
