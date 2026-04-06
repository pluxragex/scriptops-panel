interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_TELEGRAM_BOT_NAME?: string
  readonly VITE_TELEGRAM_BOT_SECRET?: string

}
interface ImportMeta {
  readonly env: ImportMetaEnv
}
