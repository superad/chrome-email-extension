/// <reference types="chrome"/>
import 'ant-design-vue/dist/reset.css' // 引入 Ant Design Vue 的全局样式
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
// 将 createAxiosInstance 挂载到全局

app.mount('#app')
