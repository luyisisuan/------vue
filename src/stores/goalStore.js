// src/stores/goalStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios'; // 1. 导入 axios
// 移除不再需要的导入: config, loadData, saveData, generateId
// import config from '@/config.js';
// import { loadData, saveData, generateId } from '@/utils/storage.js';

// 2. 定义后端 API 的基础 URL
//    最好放在配置文件或环境变量中，但暂时先硬编码在这里
const API_BASE_URL = 'http://localhost:8080/api/goals'; // 确保端口号与你的 Spring Boot 应用匹配

export const useGoalStore = defineStore('studyGoals', () => {
  // --- State ---
  const goals = ref([]);
  const isLoading = ref(false); // 新增：加载状态
  const error = ref(null);     // 新增：错误信息

  // --- Actions ---

  // 3. 重写 loadGoals: 从后端 API 获取目标
  async function loadGoals() {
    isLoading.value = true; // 开始加载
    error.value = null;     // 清除旧错误
    try {
      // 发送 GET 请求到 /api/goals
      const response = await axios.get(API_BASE_URL);
      // 使用从后端获取的数据更新 goals 状态
      goals.value = response.data;
      console.log(`Loaded ${goals.value.length} study goals from API.`);
    } catch (err) {
      console.error('Error loading goals from API:', err);
      error.value = '无法加载学习目标，请稍后重试。'; // 设置错误信息
      goals.value = []; // 出错时清空列表或保持旧数据？这里选择清空
    } finally {
      isLoading.value = false; // 加载结束
    }
  }

  // 4. 重写 addGoal: 向后端 API 发送新目标
  async function addGoal(text) {
    if (!text || !text.trim()) {
      console.warn('Goal text cannot be empty.');
      return;
    }
    isLoading.value = true; // 开始添加
    error.value = null;
    try {
      const newGoalData = {
        text: text.trim(),
        completed: false // 后端会处理默认值，但前端也可以发送
      };
      // 发送 POST 请求到 /api/goals，请求体包含新目标数据
      const response = await axios.post(API_BASE_URL, newGoalData);
      // 将后端返回的、包含 ID 的新目标添加到列表开头
      goals.value.unshift(response.data);
      console.log('Goal added via API:', response.data);
    } catch (err) {
      console.error('Error adding goal via API:', err);
      error.value = '添加目标失败，请稍后重试。';
    } finally {
      isLoading.value = false; // 添加结束
    }
  }

  // 5. 重写 toggleGoal: 调用后端 API 切换完成状态
  async function toggleGoal(id) {
    error.value = null; // 清除之前的错误信息
    const goalIndex = goals.value.findIndex(g => g.id === id);
    if (goalIndex === -1) {
        console.warn(`Goal with id ${id} not found locally for toggling.`);
        return;
    }
    // 可选：立即在 UI 上更新状态以提高响应速度（乐观更新）
    // goals.value[goalIndex].completed = !goals.value[goalIndex].completed;

    try {
      // 发送 PATCH 请求到 /api/goals/{id}/toggle
      const response = await axios.patch(`${API_BASE_URL}/${id}/toggle`);
      // 使用后端返回的最新状态更新本地数据
      goals.value[goalIndex] = response.data;
      console.log('Goal completion toggled via API:', response.data);
    } catch (err) {
      console.error('Error toggling goal completion via API:', err);
      error.value = '更新目标状态失败，请稍后重试。';
      // 如果使用了乐观更新，这里需要回滚状态
      // if (goalIndex !== -1) {
      //   goals.value[goalIndex].completed = !goals.value[goalIndex].completed; // Rollback optimistic update
      // }
    }
    // 注意：这里没有设置 isLoading，因为切换状态通常很快，
    // 但如果需要，也可以添加 isLoading 状态管理
  }

  // 6. 重写 removeGoal: 调用后端 API 删除目标
  async function removeGoal(id) {
    isLoading.value = true; // 开始删除
    error.value = null;
    try {
      // 发送 DELETE 请求到 /api/goals/{id}
      await axios.delete(`${API_BASE_URL}/${id}`);
      // 从本地列表中移除该目标
      goals.value = goals.value.filter(g => g.id !== id);
      console.log(`Goal with id ${id} removed via API.`);
    } catch (err) {
      console.error('Error removing goal via API:', err);
      error.value = '删除目标失败，请稍后重试。';
    } finally {
      isLoading.value = false; // 删除结束
    }
  }

  // 7. 移除不再需要的函数: saveGoals, loadData, saveData, generateId

  // --- Initialization ---
  // Store 初始化时自动从 API 加载一次数据
  loadGoals();

  // --- Expose ---
  return {
    goals,
    isLoading, // 暴露加载状态
    error,     // 暴露错误状态
    loadGoals, // 暴露以便可以手动刷新
    addGoal,
    toggleGoal,
    removeGoal,
  };
});