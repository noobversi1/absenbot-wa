// features/messageQueue.js
let messageQueue = [];
let isProcessing = false;

async function sendMessageWithQueue(sock, jid, messageObj, maxRetry = 3) {
  for (let attempt = 1; attempt <= maxRetry; attempt++) {
    try {
      await sock.sendMessage(jid, messageObj);
      console.log(`✅ Pesan terkirim ke ${jid}`);
      return true;
    } catch (err) {
      console.warn(`⚠️ Gagal kirim pesan ke ${jid}, percobaan ${attempt}/${maxRetry}`);
      if (attempt === maxRetry) throw err;
      await new Promise(r => setTimeout(r, 2000)); // jeda 2 detik sebelum retry
    }
  }
}

async function processQueue(sock) {
  if (isProcessing || messageQueue.length === 0) return;
  isProcessing = true;

  while (messageQueue.length > 0) {
    const { jid, messageObj } = messageQueue.shift();
    try {
      await sendMessageWithQueue(sock, jid, messageObj);
    } catch (err) {
      console.error('❌ Gagal kirim pesan dari queue:', err);
    }
  }

  isProcessing = false;
}

function pushMessage(jid, messageObj) {
  messageQueue.push({ jid, messageObj });
}

module.exports = { messageQueue, pushMessage, processQueue };
