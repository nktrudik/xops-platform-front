import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import { createPlatformServices, platformKey } from './app/context'
import { createMockCatalogRepository } from './services/mock-catalog'
import { createMockChatGateway } from './services/mock-chat'
import './styles/tokens.css'
import './styles/base.css'

const services = createPlatformServices(createMockCatalogRepository(), createMockChatGateway())
createApp(App).provide(platformKey, services).use(router).mount('#app')
void services.loadCatalog()
