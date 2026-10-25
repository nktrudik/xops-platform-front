import { createApp } from 'vue'
import App from './App.vue'
import { router } from './app/router'
import { createPlatformServices, platformKey } from './app/context'
import { createCatalogRepository } from './services/catalog'
import { createChatGateway } from './services/chat'
import './styles/brand-fonts.css'
import './styles/tokens.css'
import './styles/base.css'

const services = createPlatformServices(createCatalogRepository(), createChatGateway())
createApp(App).provide(platformKey, services).use(router).mount('#app')
