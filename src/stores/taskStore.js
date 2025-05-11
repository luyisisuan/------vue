// src/stores/taskStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉
// import { throttle } from 'lodash-es'; // 这个 store 似乎不需要节流

// <<< 不再需要 API_BASE_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/timeline/tasks';

export const useTaskStore = defineStore('timelineTasks', () => {
  // --- State ---
  const tasksByPhase = ref({
      phase1: [],
      phase2: [],
      phase3: [],
  });
  const isLoading = ref(false);
  const error = ref(null);
  // 可以为 updateTaskCompletion 添加一个 isUpdating 状态
  // const isUpdatingTask = ref(false);

  // --- Getters ---
  const phase1Tasks = computed(() => tasksByPhase.value.phase1 || []);
  const phase2Tasks = computed(() => tasksByPhase.value.phase2 || []);
  const phase3Tasks = computed(() => tasksByPhase.value.phase3 || []);

  const progressPhase1 = computed(() => calculateProgress(phase1Tasks.value));
  const progressPhase2 = computed(() => calculateProgress(phase2Tasks.value));
  const progressPhase3 = computed(() => calculateProgress(phase3Tasks.value));

  const taskSummary = computed(() => {
      const all = [...phase1Tasks.value, ...phase2Tasks.value, ...phase3Tasks.value];
      const total = all.length;
      if (total === 0) return '0 / 0';
      const completed = all.filter(task => task.completed).length;
      return `${completed} / ${total}`;
  });

  // 辅助计算函数
  function calculateProgress(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }

  // --- Actions ---
  async function loadTasks() {
    isLoading.value = true;
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /timeline/tasks/grouped >>>
      const response = await apiClient.get('/timeline/tasks/grouped');
      // 确保返回的数据结构符合预期，并处理可能的 null 或 undefined
      tasksByPhase.value = {
           phase1: Array.isArray(response.data?.phase1) ? response.data.phase1 : [],
           phase2: Array.isArray(response.data?.phase2) ? response.data.phase2 : [],
           phase3: Array.isArray(response.data?.phase3) ? response.data.phase3 : [],
       };
      console.log('Timeline tasks loaded and grouped from API.');
    } catch (err) {
      console.error('Error loading timeline tasks:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载时间轴任务: ${backendError}`;
      tasksByPhase.value = { phase1: [], phase2: [], phase3: [] };
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTaskCompletion(taskId, completed) {
    error.value = null;
    // isUpdatingTask.value = true; // 开始更新

    // 本地乐观更新的逻辑保持不变
    let phase = null;
    let taskIndex = -1;
    if (typeof taskId === 'string') { // 添加类型检查以防万一
        if (taskId.includes('phase1')) phase = 'phase1';
        else if (taskId.includes('phase2')) phase = 'phase2';
        else if (taskId.includes('phase3')) phase = 'phase3';
    }

    let originalCompletedState = null; // 用于回滚

    if (phase) {
        taskIndex = tasksByPhase.value[phase]?.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            originalCompletedState = tasksByPhase.value[phase][taskIndex].completed; // 记录原始状态
            tasksByPhase.value[phase][taskIndex].completed = completed; // 乐观更新
        } else {
            console.warn(`Task ${taskId} not found locally for optimistic update.`);
            phase = null; // 防止后续回滚错误
        }
    }

    try {
      // <<< 使用 apiClient 和相对路径 /timeline/tasks/{taskId} >>>
      await apiClient.patch(`/timeline/tasks/${taskId}`, { completed });
      console.log(`Task ${taskId} completion updated to ${completed} via API.`);
      // 后端成功，乐观更新是正确的
      return true;
    } catch (err) {
      console.error(`Error updating task ${taskId} completion:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `更新任务状态失败: ${backendError}`;
      // 回滚乐观更新
      if (phase && taskIndex !== -1 && originalCompletedState !== null) {
          tasksByPhase.value[phase][taskIndex].completed = originalCompletedState;
          console.log(`Rolled back optimistic update for task ${taskId}.`);
      }
      return false;
    } finally {
        // isUpdatingTask.value = false; // 结束更新
    }
  }

  // --- Initialization ---
  loadTasks();

  // --- Expose ---
  return {
    isLoading, error,
    phase1Tasks, phase2Tasks, phase3Tasks,
    progressPhase1, progressPhase2, progressPhase3,
    taskSummary,
    loadTasks, updateTaskCompletion,
    // isUpdatingTask // 如果添加了，需要暴露
  };
});