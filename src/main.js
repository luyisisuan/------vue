// src/main.js
import { createApp } from 'vue';
import { createPinia } from 'pinia'; // 1. 导入 Pinia

import App from './App.vue';
import router from './router';
import './assets/gwy-global.css';

const app = createApp(App);
const pinia = createPinia(); // 2. 创建 Pinia 实例

app.use(pinia); // 3. 注册 Pinia 插件
app.use(router); // 确保在路由之前或之后注册都可以

app.mount('#app');
