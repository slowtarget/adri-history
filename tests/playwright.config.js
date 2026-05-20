// playwright.config.js
const { defineConfig } = require('@playwright/test');
const path = require('node:path');

module.exports = defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    // Serve the quiz files from the parent directory via a local HTTP server
    baseURL: 'http://localhost:8787',
    headless: true,
  },
  webServer: {
    // Use Python's built-in HTTP server to serve the quiz directory
    command: 'python3 -m http.server 8787 --directory ' + path.join(__dirname, '..'),
    url: 'http://localhost:8787',
    reuseExistingServer: !process.env.CI,
    timeout: 10_000,
  },
});
