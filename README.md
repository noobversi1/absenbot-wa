Install tools dasar
sudo apt install -y git curl wget unzip build-essential

⚙️Install Node.js & npm
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

📦Install PM2 (opsional, bisa juga pakai screen)
sudo npm install -g pm2

📚Clone repo bot kamu
git clone https://github.com/username/absenbot-wa.git
cd absenbot-wa

📦Install dependency project
Di dalam folder bot:
npm install

⏰Install cron (untuk reminder otomatis)
sudo apt install -y cron
sudo systemctl enable cron
sudo systemctl start cron

Kalau bot kamu pakai node-cron, cukup npm install saja:
npm install node-cron

📱Library lain yang biasa dipakai bot WA
Baileys
npm install @whiskeysockets/baileys

qrcode-terminal
npm install qrcode-terminal

better-sqlite3
npm install better-sqlite3


fs (biasanya bawaan Node.js)
moment / dayjs (opsional untuk tanggal)
npm install moment

🚀Jalankan bot
pm2 start index.js --name absenbot-wa
pm2 save
pm2 startup
