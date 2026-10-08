import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import { createPlatformServices, platformKey } from './app/context'
import { createCatalogRepository } from './services/catalog'
import { createMockChatGateway } from './services/mock-chat'
import './styles/tokens.css'
import './styles/base.css'

const services = createPlatformServices(createCatalogRepository(), createMockChatGateway())
createApp(App).provide(platformKey, services).use(router).mount('#app')
