// src/utils/apiClient.js
import axios from 'axios';
// 如果你需要从 Pinia store 获取 token，可能需要导入你的认证 store
// import { useAuthStore } from '@/stores/authStore'; // 假设你有一个 authStore

// 从环境变量读取 API 基础 URL
const baseURL = import.meta.env.VITE_API_BASE_URL;

// 在开发模式下打印日志，方便确认 baseURL 是否正确读取
if (import.meta.env.DEV) {
console.log('[API Client] Initializing with baseURL:', baseURL);
if (!baseURL) {
console.warn('[API Client] Warning: VITE_API_BASE_URL environment variable is not set. Requests might fail.');
alert('警告：未能读取到后端 API 地址配置，请检查 .env.development 文件！'); // 强提示
}
}

const apiClient = axios.create({
baseURL: baseURL,
timeout: 15000,
});

apiClient.interceptors.request.use(
config => {
// 处理 Content-Type
if (config.data instanceof FormData) {
delete config.headers['Content-Type'];
} else if (!config.headers['Content-Type']) {
config.headers['Content-Type'] = 'application/json';
}

// --- !!! 核心修改：添加认证 Token !!! ---
// 方式一：从 localStorage 获取 Token (如果你的 Token 存在那里)
const token = localStorage.getItem('authToken'); // 'authToken' 是你存储 Token 时用的 key

// 方式二：从 Pinia store 获取 Token (如果你的 Token 存在认证相关的 store 里)
// const authStore = useAuthStore(); // 确保在 Vue 组件上下文之外正确使用 Pinia store
// const token = authStore.token; // 假设你的 authStore 有一个 token getter 或 state

if (token) {
  config.headers.Authorization = `Bearer ${token}`;
  if (import.meta.env.DEV) {
    console.log('[API Client] Token attached to request headers.');
  }
} else {
  if (import.meta.env.DEV) {
    // 对于某些公共 API 端点，没有 token 可能是正常的
    // 但对于需要认证的端点，这将导致 401 或 403
    console.warn('[API Client] No token found. Request will be sent without Authorization header.');
  }
}
// --- 结束核心修改 ---

// 考虑 CSRF Token (如果后端需要)
// 例如，如果后端在 cookie 中设置了 XSRF-TOKEN，axios 默认会读取并发送 X-XSRF-TOKEN 头
// 如果是其他方式，例如从 meta 标签获取：
// const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
// if (csrfToken) {
//   config.headers['X-CSRF-TOKEN'] = csrfToken;
// }

return config;


},
error => {
return Promise.reject(error);
}
);

// 可选：添加响应拦截器 (例如统一处理错误，特别是 401)
apiClient.interceptors.response.use(
response => {
return response;
},
error => {
console.error('[API Client] Response Error:', error.response || error.message);
if (error.response) {
const status = error.response.status;
if (status === 401) {
// 未授权: Token 可能无效或过期
console.error('[API Client] Unauthorized (401). Token might be invalid or expired.');
// 这里可以做一些全局处理，比如：
// 1. 清除本地存储的 token
localStorage.removeItem('authToken'); // 或 authStore.logout();
// 2. 提示用户
alert('您的会话已过期或无效，请重新登录。');
// 3. 重定向到登录页面
// window.location.href = '/login'; // 或者使用 Vue Router: router.push('/login');
//   确保在这里能访问到 router 实例，或者通过事件总线/回调通知 App.vue 处理
} else if (status === 403) {
// 禁止访问: 用户已认证，但没有权限执行此操作
console.error('[API Client] Forbidden (403). User does not have permission for this action.');
alert('您没有权限执行此操作。');
}
// 对于其他错误，可以根据需要处理或直接抛出
}
return Promise.reject(error); // 必须将错误继续抛出，否则调用方 catch 不到
}
);

export default apiClient;