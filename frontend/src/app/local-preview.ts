/** Локальный просмотр оболочки без входа; production всегда использует авторизацию. */
export const localPreview = import.meta.env.DEV && import.meta.env.VITE_AUTH_DISABLED === 'true'
