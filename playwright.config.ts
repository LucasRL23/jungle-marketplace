import { defineConfig, devices } from '@playwright/test'
export default defineConfig({timeout:90000,expect:{timeout:15000},testDir:'./tests',fullyParallel:true,reporter:[['html',{open:'never'}],['list']],use:{baseURL:'http://127.0.0.1:5173',trace:'retain-on-failure'},webServer:{command:'pnpm dev --host 127.0.0.1',url:'http://127.0.0.1:5173',reuseExistingServer:!process.env.CI},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13'],defaultBrowserType:'chromium'}}]})

