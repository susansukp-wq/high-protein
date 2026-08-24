// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // ⚠️ เปลี่ยนเป็นโดเมนจริงก่อน deploy — มีผลกับ canonical URL และ sitemap
  site: 'https://no-mercy-diet.com',

  integrations: [
    react(),
    // ไม่เอา endpoint รูป OG เข้า sitemap — เป็นรูป ไม่ใช่หน้าเว็บ
    sitemap({ filter: (page) => !page.includes('/og/') }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
})