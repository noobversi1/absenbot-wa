// ========================
// DAFTAR GRUP
// ========================
async function tampilkanDaftarGrup(sock) {
  try {
    const groups = await sock.groupFetchAllParticipating();
    console.log('\n📋 Daftar Grup:');
    for (const [id, group] of Object.entries(groups)) {
      console.log(`• ${group.subject} | ID: ${id}`);
    }
  } catch (err) {
    console.error('❌ Gagal ambil daftar grup:', err);
  }
}

// Export supaya bisa dipakai di index.js atau file lain
module.exports = { tampilkanDaftarGrup };
