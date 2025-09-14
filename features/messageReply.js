const { BotMessage, Mapping } = require('../dbHelper');
const { isConnected, sock } = require('../core/botCore');

const adminNumber = '628XXXXXXX@s.whatsapp.net';
const processedIds = new Set();

async function tampilkanDaftarGrup(sockInstance) {
  try {
    const groups = await sockInstance.groupFetchAllParticipating();
    let msg = '📋 *Daftar Grup:* \n';
    for (const [id, group] of Object.entries(groups)) {
      msg += `• ${group.subject} | ID: ${id}\n`;
    }
    return msg;
  } catch (err) {
    console.error('❌ Gagal ambil daftar grup:', err);
    return '❌ Gagal ambil daftar grup.';
  }
}

function setupMessageReply(sockInstance) {
  if (!sockInstance) throw new Error('❌ sockInstance belum terinisialisasi! Pastikan startBot() dipanggil dulu.');

  sockInstance.ev.on('messages.upsert', async ({ messages }) => {
    const msg = messages[0];
    if (!msg.message || msg.key.fromMe) return;
    if (processedIds.has(msg.key.id)) return;
    processedIds.add(msg.key.id);

    const body = msg.message?.conversation || msg.message?.extendedTextMessage?.text || '';

    // Command sederhana
    if (body.toLowerCase() === '#hi') {
      try {
        const sent = await sockInstance.sendMessage(msg.key.remoteJid, { text: '👋 Hai juga! Bot ini aktif dan siap membantu.' });
        BotMessage.simpan(sent.key.id, msg.key.remoteJid, '👋 Hai juga! Bot ini aktif dan siap membantu.');
      } catch (err) {
        console.log('❌ Gagal kirim pesan #hi:', err);
      }
    }

    // Command daftar grup
    if (body.toLowerCase() === '#listgroups') {
      if (!msg.key.fromMe) { // opsional: hanya admin bisa lihat
        const daftar = await tampilkanDaftarGrup(sockInstance);
        await sockInstance.sendMessage(msg.key.remoteJid, { text: daftar });
      }
    }

    // Reply ke pesan bot
    if (msg.key.remoteJid.endsWith('@g.us') && msg.message.extendedTextMessage?.contextInfo) {
      const context = msg.message.extendedTextMessage.contextInfo;
      const quotedId = context.stanzaId;
      const quotedMsgText = context.quotedMessage?.conversation
        || context.quotedMessage?.extendedTextMessage?.text
        || "";

      let foundBotMsg = quotedId ? BotMessage.byStanza(quotedId) : null;
      if (!foundBotMsg && quotedMsgText) foundBotMsg = BotMessage.byText(msg.key.remoteJid, quotedMsgText);
      if (!foundBotMsg && quotedMsgText) foundBotMsg = BotMessage.byTextLike(msg.key.remoteJid, quotedMsgText);

      if (foundBotMsg) {
        Mapping.simpan(
          foundBotMsg.stanzaId,
          msg.key.remoteJid,
          adminNumber,
          msg.pushName,
          context.quotedMessage || {}
        );

        const replyText = msg.message.extendedTextMessage?.text || '';
        await sockInstance.sendMessage(adminNumber, { text: `[Reply ke BOT dari ${msg.pushName}]\n${replyText}` });
      }
    }

    // Balasan admin diteruskan ke grup
    if (msg.key.remoteJid === adminNumber) {
      const replyText = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || '';
      const lastMap = Mapping.byForward(adminNumber);

      if (lastMap) {
        await sockInstance.sendMessage(lastMap.groupId, {
          text: replyText,
          contextInfo: {
            stanzaId: lastMap.stanzaId,
            participant: sockInstance.user.id,
            quotedMessage: lastMap.quotedMessage || {}
          }
        });
        console.log(`📤 Balasan admin diteruskan ke grup ${lastMap.groupId}`);
      }
    }
  });
}

module.exports = { setupMessageReply };
