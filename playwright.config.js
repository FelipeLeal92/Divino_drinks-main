const { defineConfig } = require('@playwright/test');
module.exports = defineConfig({
  testDir: './tests',
  workers: 1,
  fullyParallel: false,
  reporter: 'list',
  use: { headless: true, channel: 'chrome', viewport: { width: 1440, height: 1000 } },
  timeout: 30000
});
