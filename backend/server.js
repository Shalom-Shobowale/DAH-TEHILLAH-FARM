require('dotenv').config();
const app = require('./app');
const config = require('./config/config');
const fs = require('fs');
const path = require('path');

const uploadsDir = path.join(__dirname, 'uploads/proofs');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const PORT = config.port;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║     DA-TEHILLAH FARM VENTURES - Investment System          ║
║════════════════════════════════════════════════════════════║
║  Server running on: http://localhost:${PORT}                   ║
║  Environment: ${config.nodeEnv.padEnd(43)}║
║  API Health: http://localhost:${PORT}/api/health              ║
╚════════════════════════════════════════════════════════════╝
  `);
});

process.on('unhandledRejection', (err) => {
  console.error('Unhandled Promise Rejection:', err);
});

process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
  process.exit(1);
});


