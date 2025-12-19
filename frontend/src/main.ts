import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { VueQueryPlugin } from '@tanstack/vue-query'
import App from './App.vue'
import router from './router'

// 创建 Pinia 实例
const pinia = createPinia()

// 创建 Vue 应用
const app = createApp(App)

// 使用插件
app.use(router)
app.use(pinia)
app.use(VueQueryPlugin)

// 挂载应用
app.mount('#app')