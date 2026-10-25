import {defineConfig} from '@playwright/test';

export default defineConfig({
  testDir:'./tests',
  testMatch:'browser.spec.js',
  timeout:60000,
  workers:1,
  use:{
    baseURL:'http://localhost:4173/juego-mati/',
    browserName:'chromium',
    headless:true,
    launchOptions:{args:['--enable-unsafe-swiftshader']}
  },
  webServer:{
    command:'npm run dev',
    url:'http://localhost:4173/juego-mati/',
    reuseExistingServer:!process.env.CI,
    timeout:30000
  }
});
