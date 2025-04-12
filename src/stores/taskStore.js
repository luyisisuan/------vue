// src/stores/taskStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { throttle } from 'lodash-es'; // 用于批量更新节流

const API_BASE_URL = 'http://localhost:8080/api/timeline/tasks'; // 时间轴任务 API

export const useTaskStore = defineStore('timelineTasks', () => {
  // --- State ---
  // 使用一个对象来存储按阶段分组的任务，方便模板直接使用
  const tasksByPhase = ref({
      phase1: [],
      phase2: [],
      phase3: [],
  });
  const isLoading = ref(false);
  const error = ref(null);

  // --- Getters ---
  const phase1Tasks = computed(() => tasksByPhase.value.phase1 || []);
  const phase2Tasks = computed(() => tasksByPhase.value.phase2 || []);
  const phase3Tasks = computed(() => tasksByPhase.value.phase3 || []);

  // 计算各阶段进度
  const progressPhase1 = computed(() => calculateProgress(phase1Tasks.value));
  const progressPhase2 = computed(() => calculateProgress(phase2Tasks.value));
  const progressPhase3 = computed(() => calculateProgress(phase3Tasks.value));

  // 计算总任务摘要
  const taskSummary = computed(() => {
      const all = [...phase1Tasks.value, ...phase2Tasks.value, ...phase3Tasks.value];
      const total = all.length;
      if (total === 0) return '0 / 0';
      const completed = all.filter(task => task.completed).length;
      return `${completed} / ${total}`;
  });


  // 辅助计算函数 - **已修正**
  function calculateProgress(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.completed).length;
    // --- 使用 tasks.length 而不是未定义的 total ---
    return Math.round((completed / tasks.length) * 100);
  }

  // --- Actions ---

  // 从后端加载所有任务并按阶段分组
  async function loadTasks() {
    isLoading.value = true;
    error.value = null;
    try {
      // 调用后端的 grouped API
      const response = await axios.get(`${API_BASE_URL}/grouped`);
      // 直接使用 grouped API 的返回结果，确保 key 存在且值为数组
       tasksByPhase.value = {
           phase1: Array.isArray(response.data.phase1) ? response.data.phase1 : [],
           phase2: Array.isArray(response.data.phase2) ? response.data.phase2 : [],
           phase3: Array.isArray(response.data.phase3) ? response.data.phase3 : [],
       };

      console.log('Timeline tasks loaded and grouped from API.');
    } catch (err) {
      console.error('Error loading timeline tasks:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载时间轴任务: ${backendError}`;
      tasksByPhase.value = { phase1: [], phase2: [], phase3: [] }; // 出错时清空
    } finally {
      isLoading.value = false;
    }
  }

  // 更新单个任务的完成状态
  async function updateTaskCompletion(taskId, completed) {
    error.value = null; // 清除旧错误
    // 尝试在本地查找并更新，提供即时反馈（乐观更新）
    let phase = null;
    let taskIndex = -1;
    if (taskId.includes('phase1')) phase = 'phase1';
    else if (taskId.includes('phase2')) phase = 'phase2';
    else if (taskId.includes('phase3')) phase = 'phase3';

    if (phase) {
        taskIndex = tasksByPhase.value[phase]?.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
            tasksByPhase.value[phase][taskIndex].completed = completed; // 乐观更新
        } else {
            console.warn(`Task ${taskId} not found locally for optimistic update.`);
        }
    }

    try {
      // 发送 PATCH 请求到后端
      await axios.patch(`${API_BASE_URL}/${taskId}`, { completed }); // 请求体 { "completed": true/false }
      console.log(`Task ${taskId} completion updated to ${completed} via API.`);
      // 如果后端确认成功，乐观更新已经是正确的了
      return true;
    } catch (err) {
      console.error(`Error updating task ${taskId} completion:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `更新任务状态失败: ${backendError}`;
      // 如果乐观更新了，这里需要回滚状态
      if (phase && taskIndex !== -1) {
          tasksByPhase.value[phase][taskIndex].completed = !completed; // 回滚
          console.log(`Rolled back optimistic update for task ${taskId}.`);
      }
      return false;
    }
    // 不需要 isLoading 状态
  }

  // --- Initialization ---
  loadTasks(); // 初始化时加载

  // --- Expose ---
  return {
    // State (optional exposure)
    // tasksByPhase,
    isLoading,
    error,
    // Getters (recommended exposure)
    phase1Tasks,
    phase2Tasks,
    phase3Tasks,
    progressPhase1,
    progressPhase2,
    progressPhase3,
    taskSummary,
    // Actions
    loadTasks,
    updateTaskCompletion,
  };
});