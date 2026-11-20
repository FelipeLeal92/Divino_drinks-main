const fs = require('node:fs/promises');
const path = require('node:path');
require('dotenv').config({ quiet: true });

async function backup() {
  const root = path.resolve(__dirname, '..');
  const source = path.resolve(process.env.DB_PATH || path.join(root, 'data/db.json'));
  const uploads = path.resolve(process.env.UPLOAD_DIR || path.join(root, 'public/imagens/uploads'));
  JSON.parse(await fs.readFile(source, 'utf8'));
  const target = path.join(root, 'backups', `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);
  await fs.mkdir(target, { recursive: true });
  await fs.copyFile(source, path.join(target, 'db.json'));
  try { await fs.cp(uploads, path.join(target, 'uploads'), { recursive: true }); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  await fs.writeFile(path.join(target, 'backup-info.json'), JSON.stringify({ createdAt: new Date().toISOString(), version: require('../package.json').version }, null, 2));
  console.log(`Backup criado: ${target}`);
}
backup().catch(error => { console.error('Falha no backup:', error.message); process.exitCode = 1; });
