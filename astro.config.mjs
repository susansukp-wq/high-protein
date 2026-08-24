// @ts-check
import { defineConfig } from 'astro/config'
import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'

import sitemap from '@astrojs/sitemap';

export default defineConfig({
  // โดเมนจริงของเว็บ — มีผลกับ canonical URL, sitemap, robots.txt และ og:image ทุกหน้า
  site: 'https://nomercydiet.com',

  integrations: [
    react(),
    // ไม่เอา endpoint รูป OG เข้า sitemap — เป็นรูป ไม่ใช่หน้าเว็บ
    sitemap({ filter: (page) => !page.includes('/og/') }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },
})