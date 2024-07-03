/// <reference types="chrome"/>
import 'ant-design-vue/dist/reset.css' // 引入 Ant Design Vue 的全局样式
import { createApp } from 'vue'
import App from './options/App.vue'

const app = createApp(App)

app.mount('#app')
