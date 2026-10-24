import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import { createPlatformServices, platformKey } from './app/context'
import { createCatalogRepository } from './services/catalog'
import { createChatGateway } from './services/chat'
import './styles/brand-fonts.css'
import './styles/tokens.css'
import './styles/base.css'

async function start(): Promise<void> {
  const services =
    import.meta.env.DEV && import.meta.env.VITE_AUTH_DISABLED === 'true'
      ? (await import('./preview/services')).createPreviewServices()
      : createPlatformServices(createCatalogRepository(), createChatGateway())
  createApp(App).provide(platformKey, services).use(router).mount('#app')
}
void start()
