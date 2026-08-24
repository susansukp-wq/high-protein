/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SUPABASE_URL: string
  readonly PUBLIC_SUPABASE_ANON_KEY: string
  /** รหัส Publisher ของ AdSense เช่น "ca-pub-1234567890123456" — เว้นว่างได้ */
  readonly PUBLIC_ADSENSE_CLIENT_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
