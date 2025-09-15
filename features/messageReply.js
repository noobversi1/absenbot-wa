// features/messageReply.js
const { BotMessage, Mapping } = require('../dbHelper');
const { pushMessage, processQueue } = require('./messageQueue');

const adminNumber = '628xxxxxxx@s.whatsapp.net';
const processedIds = new Set();

// Helper contextInfo aman
function safeContextInfo(quotedMessage) {
  if (!quotedMessage) return undefined;
  if (!quotedMessage.conversation && !quotedMessage.extendedTextMessage) {
    return { quotedMessage: { conversation: '' } };
  }
  return { quotedMessage };
}

function setupMessageReply(sock) {
  if (!sock) throw new Error('❌ sockInstance belum terinisialisasi!');

  sock.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    if (processedIds.has(msg.key.id)) return;
    processedIds.add(msg.key.id);

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    // COMMAND #HI
    if (body.toLowerCase() === '#hi') {
      pushMessage(msg.key.remoteJid, { text: '👋 Hai juga! Bot ini aktif dan siap membantu.' });
      processQueue(sock);
    }

    // REPLY KE PESAN BOT DI GRUP
    if (msg.key.remoteJid.endsWith('@g.us') && msg.message.extendedTextMessage?.contextInfo) {
      const context = msg.message.extendedTextMessage.contextInfo;
      const quotedId = context.stanzaId;
      const quotedMsgText = context.quotedMessage?.conversation
        || context.quotedMessage?.extendedTextMessage?.text
        || '';

      let foundBotMsg = quotedId ? BotMessage.byStanza(quotedId) : null;
      if (!foundBotMsg && quotedMsgText) foundBotMsg = BotMessage.byText(msg.key.remoteJid, quotedMsgText);
      if (!foundBotMsg && quotedMsgText) foundBotMsg = BotMessage.byTextLike(msg.key.remoteJid, quotedMsgText);

      if (foundBotMsg) {
        Mapping.simpan(foundBotMsg.stanzaId, msg.key.remoteJid, adminNumber, msg.pushName, context.quotedMessage || {});
        const replyText = msg.message.extendedTextMessage?.text || '';
        pushMessage(adminNumber, { text: `${replyText}` });
        processQueue(sock);
      }
    }

    // BALASAN ADMIN DITERUSKAN KE GRUP
    if (msg.key.remoteJid === adminNumber) {
      const replyText = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
      const lastMap = Mapping.byForward(adminNumber);

      if (lastMap) {
        pushMessage(lastMap.groupId, {
          text: replyText,
          contextInfo: safeContextInfo(lastMap.quotedMessage)
        });
        processQueue(sock);
        console.log(`📤 Balasan admin diteruskan ke grup ${lastMap.groupId}`);
      }
    }
  });
}

module.exports = { setupMessageReply };
