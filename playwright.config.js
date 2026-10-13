import {defineConfig} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'browser.spec.js',timeout:60000,workers:1,use:{baseURL:'http://localhost:4173/juego-mati/',channel:'chrome',headless:true,launchOptions:{args:['--enable-unsafe-swiftshader']}}});
