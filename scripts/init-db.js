require('dotenv').config({ quiet: true });
const store = require('../src/store');
store.update(() => {}).then(() => console.log(`Banco pronto: ${store.dbPath}`)).catch(error => {
  console.error('Falha ao preparar banco:', error.message);
  process.exitCode = 1;
});
