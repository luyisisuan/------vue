// src/stores/goalStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉

// <<< 不再需要 API_BASE_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/goals';

export const useGoalStore = defineStore('studyGoals', () => {
  // --- State ---
  const goals = ref([]);
  const isLoading = ref(false);
  const error = ref(null);

  // --- Actions ---
  async function loadGoals() {
    isLoading.value = true;
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /goals >>>
      const response = await apiClient.get('/goals');
      goals.value = response.data;
      console.log(`Loaded ${goals.value.length} study goals from API.`);
    } catch (err) {
      console.error('Error loading goals from API:', err);
      error.value = '无法加载学习目标，请稍后重试。';
      goals.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function addGoal(text) {
    if (!text || !text.trim()) {
      console.warn('Goal text cannot be empty.');
      return; // 或者可以设置 error.value
    }
    // 可以考虑添加 isAdding 状态
    // isLoading.value = true; // 或者使用 isAdding.value = true;
    error.value = null;
    try {
      const newGoalData = {
        text: text.trim(),
        completed: false // 后端通常会处理默认值
      };
      // <<< 使用 apiClient 和相对路径 /goals >>>
      const response = await apiClient.post('/goals', newGoalData);
      goals.value.unshift(response.data); // 添加到列表开头
      console.log('Goal added via API:', response.data);
    } catch (err) {
      console.error('Error adding goal via API:', err);
      // 尝试获取后端返回的更具体的错误信息
      const backendError = err.response?.data?.message || err.message || '添加目标失败，请稍后重试。';
      error.value = backendError;
    } finally {
      // isLoading.value = false; // isAdding.value = false;
    }
    // 可以在这里返回添加是否成功，或者依赖 error 状态
    // return !error.value;
  }

  async function toggleGoal(id) {
    error.value = null;
    const goalIndex = goals.value.findIndex(g => g.id === id);
    if (goalIndex === -1) {
        console.warn(`Goal with id ${id} not found locally for toggling.`);
        // 可以设置 error 或直接返回
        return;
    }
    // 可以考虑添加 isToggling 状态
    try {
      // <<< 使用 apiClient 和相对路径 /goals/{id}/toggle >>>
      const response = await apiClient.patch(`/goals/${id}/toggle`);
      goals.value[goalIndex] = response.data; // 使用后端返回的最新状态更新
      console.log('Goal completion toggled via API:', response.data);
    } catch (err) {
      console.error('Error toggling goal completion via API:', err);
      const backendError = err.response?.data?.message || err.message || '更新目标状态失败，请稍后重试。';
      error.value = backendError;
      // 如果做了乐观更新，这里需要回滚
    }
  }

  async function removeGoal(id) {
    // 可以考虑添加 isDeleting 状态
    // isLoading.value = true; // 或 isDeleting.value = true;
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /goals/{id} >>>
      await apiClient.delete(`/goals/${id}`);
      goals.value = goals.value.filter(g => g.id !== id);
      console.log(`Goal with id ${id} removed via API.`);
    } catch (err) {
      console.error('Error removing goal via API:', err);
      const backendError = err.response?.data?.message || err.message || '删除目标失败，请稍后重试。';
      error.value = backendError;
    } finally {
      // isLoading.value = false; // isDeleting.value = false;
    }
  }

  // --- Initialization ---
  loadGoals();

  // --- Expose ---
  return {
    goals,
    isLoading,
    error,
    loadGoals,
    addGoal,
    toggleGoal,
    removeGoal,
    // 可以考虑暴露 isAdding, isToggling, isDeleting 状态给 UI
  };
});