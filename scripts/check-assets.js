const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const publicRoot = path.join(root, 'public');
let checked = 0;
const errors = [];
function check(url, source, base = publicRoot) {
  if (!url || /^(https?:|data:|blob:|#|mailto:|tel:)/i.test(url) || /PLACEHOLDER/.test(url)) return;
  const clean = decodeURIComponent(url.split(/[?#]/)[0]);
  if (!/\.(png|jpe?g|webp|svg|ico|css|js|woff2?|ttf|webmanifest)$/i.test(clean)) return;
  checked++;
  const target = clean.startsWith('/') ? path.join(publicRoot, clean) : path.resolve(base, clean);
  if (!fs.existsSync(target)) errors.push(`${source}: ${url}`);
  else if (!fs.statSync(target).size) errors.push(`${source}: arquivo vazio ${url}`);
}
function visit(value, source) {
  if (typeof value === 'string') check(value, source);
  else if (value && typeof value === 'object') Object.values(value).forEach(item => visit(item, source));
}
function walk(directory) {
  for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    if (item.name.startsWith('.') || item.name === 'uploads') continue;
    const target = path.join(directory, item.name);
    if (item.isDirectory()) walk(target);
    else if (/\.(html|css|webmanifest)$/.test(item.name)) {
      const text = fs.readFileSync(target, 'utf8');
      if (item.name.endsWith('webmanifest')) visit(JSON.parse(text), target);
      else if (item.name.endsWith('css')) {
        for (const match of text.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)) check(match[1], target, path.dirname(target));
      } else for (const match of text.matchAll(/(?:src|href)="([^"]+)"/g)) check(match[1], target);
    }
  }
}
walk(publicRoot);
const admin = fs.readFileSync(path.join(root, 'src/views/admin.html'), 'utf8');
for (const match of admin.matchAll(/(?:src|href)="([^"]+)"/g)) check(match[1], 'admin.html');
visit(JSON.parse(fs.readFileSync(path.join(root, 'data/content.default.json'), 'utf8')), 'default content');
const localDb = process.env.DB_PATH || path.join(root, 'data/db.json');
if (fs.existsSync(localDb)) {
  const { leads, ...content } = JSON.parse(fs.readFileSync(localDb, 'utf8'));
  visit(content, 'local content');
}
if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
else console.log(`${checked} referências locais verificadas; nenhum arquivo ausente.`);
