// src/utils/apiClient.js
import axios from 'axios';

// 从环境变量读取 API 基础 URL
const baseURL = import.meta.env.VITE_API_BASE_URL;

// 在开发模式下打印日志，方便确认 baseURL 是否正确读取
if (import.meta.env.DEV) {
  console.log(`[API Client] Initializing with baseURL: ${baseURL}`);
  if (!baseURL) {
      console.warn('[API Client] Warning: VITE_API_BASE_URL environment variable is not set. Requests might fail.');
      alert('警告：未能读取到后端 API 地址配置，请检查 .env.development 文件！'); // 强提示
  }
}

const apiClient = axios.create({
  baseURL: baseURL, // 使用环境变量设置基础 URL
  timeout: 15000, // 设置请求超时时间，例如 15 秒
  // headers: { // <<< 注意：这里不再强制设置全局 Content-Type 为 application/json
  //   'Content-Type': 'application/json',
  // }
});

// --- 添加请求拦截器 ---
apiClient.interceptors.request.use(
  config => {
    // 检查请求数据是否是 FormData 的实例
    if (config.data instanceof FormData) {
      // 如果是 FormData，则删除可能存在的默认 Content-Type，
      // 让浏览器/axios自动设置正确的 multipart/form-data 类型和 boundary
      delete config.headers['Content-Type'];
    } else if (!config.headers['Content-Type']) {
      // 如果不是 FormData，并且请求头中没有明确设置 Content-Type，
      // 则将其默认为 'application/json' (如果你的大部分API是JSON的话)
      config.headers['Content-Type'] = 'application/json';
    }

    // 你可以在这里添加其他通用的请求头逻辑，例如 token
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }

    return config;
  },
  error => {
    // 对请求错误做些什么
    return Promise.reject(error);
  }
);

// 可选：添加响应拦截器 (例如统一处理错误)
// apiClient.interceptors.response.use(response => {
//   // 对响应数据做点什么
//   return response;
// }, error => {
//   // 对响应错误做点什么
//   console.error('[API Client] Response Error:', error.response || error.message);
//   if (error.response && error.response.status === 401) {
//     // 处理未授权，例如跳转到登录页
//     // router.push('/login');
//   }
//   return Promise.reject(error);
// });

export default apiClient;