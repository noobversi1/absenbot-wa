const { default: makeWASocket, useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const qrcode = require('qrcode-terminal');

let isConnected = false;
let sock;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState('./session');
  const { version } = await fetchLatestBaileysVersion();

  if (sock) {
    try {
      sock.ev.removeAllListeners();
      sock.end();
    } catch {}
  }

  sock = makeWASocket({ version, auth: state });

  sock.ev.on('connection.update', ({ qr, connection, lastDisconnect }) => {
    if (qr) qrcode.generate(qr, { small: true });

    if (connection === 'open') {
      isConnected = true;
      console.log('✅ Bot WhatsApp siap digunakan!');
    }

    if (connection === 'close') {
      isConnected = false;
      const reason = new Boom(lastDisconnect?.error)?.output?.statusCode;
      console.log('🔌 Koneksi terputus. Mencoba menyambung ulang...');
      if (reason !== DisconnectReason.loggedOut) startBot();
      else console.log('❌ Harus login ulang. Hapus folder "session" lalu jalankan ulang.');
    }
  });

  sock.ev.on('creds.update', saveCreds);

  return sock;
}

module.exports = { startBot, isConnected, sock };
