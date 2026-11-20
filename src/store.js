const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const dbPath = path.resolve(process.env.DB_PATH || path.join(root, 'data/db.json'));
let db;
let queue = Promise.resolve();

async function load() {
  if (db) return db;
  let raw;
  try {
    raw = await fs.readFile(dbPath, 'utf8');
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    // Read legacy installations without discarding their saved leads.
    if (!process.env.DB_PATH) {
      try { raw = await fs.readFile(path.join(root, 'db.json'), 'utf8'); }
      catch (legacyError) { if (legacyError.code !== 'ENOENT') throw legacyError; }
    }
    if (!raw) raw = await fs.readFile(path.join(root, 'data/content.default.json'), 'utf8');
  }
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Banco JSON inválido');
  db = { ...parsed, leads: parsed.leads || [] };
  if (!Array.isArray(db.leads)) throw new Error('Lista de leads inválida');
  return db;
}

function update(change) {
  const task = queue.then(async () => {
    const next = structuredClone(await load());
    change(next);
    await fs.mkdir(path.dirname(dbPath), { recursive: true });
    const temporary = `${dbPath}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, JSON.stringify(next, null, 2) + '\n', { mode: 0o600 });
      await fs.rename(temporary, dbPath);
      db = next;
    } finally {
      await fs.rm(temporary, { force: true });
    }
  });
  queue = task.catch(() => {});
  return task;
}

module.exports = { load, update, dbPath };
