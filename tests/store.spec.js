const { test, expect } = require('@playwright/test');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const { spawnSync } = require('node:child_process');

test('banco corrompido não é substituído por um banco vazio', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'divino-corrupt-'));
  const database = path.join(temporary, 'db.json');
  try {
    await fs.writeFile(database, '{invalid-json');
    const result = spawnSync(process.execPath, ['-e', "require('./src/store').update(() => {}).catch(() => { process.exitCode = 1; })"], { env: { ...process.env, DB_PATH: database } });
    expect(result.status).toBe(1);
    expect(await fs.readFile(database, 'utf8')).toBe('{invalid-json');
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});

test('falha de gravação preserva estado e a próxima gravação pode recuperar', async () => {
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'divino-recovery-'));
  const database = path.join(temporary, 'db.json');
  try {
    const script = `
      const fs = require('node:fs/promises');
      const assert = require('node:assert/strict');
      const store = require('./src/store');
      (async () => {
        const before = await store.load();
        await fs.mkdir(process.env.DB_PATH);
        await assert.rejects(store.update(data => { data.hero.title = 'not saved'; }));
        assert.equal((await store.load()).hero.title, before.hero.title);
        await fs.rmdir(process.env.DB_PATH);
        await store.update(data => { data.hero.title = 'saved'; });
        assert.equal(JSON.parse(await fs.readFile(process.env.DB_PATH, 'utf8')).hero.title, 'saved');
      })().catch(error => { console.error(error); process.exitCode = 1; });
    `;
    const result = spawnSync(process.execPath, ['-e', script], { env: { ...process.env, DB_PATH: database } });
    expect(result.status, String(result.stderr)).toBe(0);
  } finally {
    await fs.rm(temporary, { recursive: true, force: true });
  }
});
