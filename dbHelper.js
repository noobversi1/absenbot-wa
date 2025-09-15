// dbHelper.js
const Database = require('better-sqlite3');
const path = require('path');

// buka atau buat database di folder data
const dbPath = path.join(__dirname, 'data', 'database.db');
const db = new Database(dbPath);

// bikin tabel kalau belum ada
db.prepare(`
CREATE TABLE IF NOT EXISTS relay_mapping (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stanzaId TEXT,
  groupId TEXT,
  forwardTo TEXT,
  senderName TEXT,
  quotedMessage TEXT
)
`).run();

db.prepare(`
CREATE TABLE IF NOT EXISTS bot_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stanzaId TEXT,
  groupId TEXT,
  message TEXT,
  date TEXT
)
`).run();

// ==================
// Mapping object
// ==================
const Mapping = {
  simpan(stanzaId, groupId, forwardTo, senderName, quotedMessage) {
    const safeSender = (typeof senderName === 'string') ? senderName : JSON.stringify(senderName);
    const safeQuoted = (typeof quotedMessage === 'string') ? quotedMessage : JSON.stringify(quotedMessage);

    db.prepare(`
      INSERT INTO relay_mapping (stanzaId, groupId, forwardTo, senderName, quotedMessage)
      VALUES (?, ?, ?, ?, ?)
    `).run(stanzaId, groupId, forwardTo, safeSender, safeQuoted);

    console.log("✅ Mapping tersimpan:", stanzaId, "->", forwardTo);
  },

  byStanza(stanzaId) {
    return db.prepare(`SELECT * FROM relay_mapping WHERE stanzaId = ?`).get(stanzaId);
  },

  byForward(forwardTo) {
    return db.prepare(`SELECT * FROM relay_mapping WHERE forwardTo = ? ORDER BY id DESC LIMIT 1`).get(forwardTo);
  }
};

// ==================
// BotMessage object
// ==================
const BotMessage = {
  simpan(stanzaId, groupId, message, date) {
    // pastikan date adalah objek Date
    const d = (date instanceof Date) ? date : new Date(date);

    db.prepare(`
      INSERT INTO bot_messages (stanzaId, groupId, message, date)
      VALUES (?, ?, ?, ?)
    `).run(stanzaId, groupId, message, d.toISOString());

    console.log("✅ Pesan bot tersimpan:", stanzaId);
  },

  byStanza(stanzaId) {
    return db.prepare(`SELECT * FROM bot_messages WHERE stanzaId = ?`).get(stanzaId);
  },

  byText(groupId, text) {
    return db.prepare(`SELECT * FROM bot_messages WHERE groupId = ? AND message = ?`).get(groupId, text);
  },

  byTextLike(groupId, text) {
    return db.prepare(`SELECT * FROM bot_messages WHERE groupId = ? AND message LIKE ? ORDER BY id DESC LIMIT 1`).get(groupId, `%${text}%`);
  },

  byTextAndDate(groupId, text, date) {
    return db.prepare(`
      SELECT * FROM bot_messages 
      WHERE groupId = ? AND message = ? AND date = ?
    `).get(groupId, text, date);
  }
};

module.exports = {
  Mapping,
  BotMessage
};
