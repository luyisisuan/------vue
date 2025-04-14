// src/stores/studyLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

// API URLs - 确保这些与你的后端路由匹配
const API_LOG_URL = 'http://localhost:8080/api/pomodoro/log';
const API_STATS_URL = 'http://localhost:8080/api/activity/stats';
// const API_TODAY_ONLINE_URL = 'http://localhost:8080/api/activity/today'; // 如果需要单独获取

export const useStudyLogStore = defineStore('studyLog', () => {
  // --- State ---
  const logs = ref([]); // 学习日志列表 (来自番茄钟等明确记录)
  const isLoadingLogs = ref(false);
  const logError = ref(null);

  // 聚合统计数据 (从后端获取)
  const totalDurationSeconds = ref(0);
  const todayDurationSeconds = ref(0); // 番茄钟等学习时长
  const weekDurationSeconds = ref(0);
  const monthDurationSeconds = ref(0);
  const todayOnlineSeconds = ref(0);   // 总在线时长
  const isLoadingStats = ref(false);
  const statsError = ref(null);

  // --- Getters ---
  // 合并加载状态
  const isLoading = computed(() => isLoadingLogs.value || isLoadingStats.value);
  // 暴露 state ref 的 getter (可选，组件可以直接用 storeToRefs 获取 state)
  // const getTotalDuration = computed(() => totalDurationSeconds.value);
  // ... 其他类似 getter ...

  // --- Actions ---

  /**
   * 从后端加载最近的学习日志记录
   */
  async function loadRecentLogs(limit = 50) {
    isLoadingLogs.value = true;
    logError.value = null;
    try {
      const response = await axios.get(`${API_LOG_URL}/recent`, { params: { limit } });
      if (Array.isArray(response.data)) {
          logs.value = response.data;
          console.log(`Loaded ${logs.value.length} recent study logs.`);
      } else {
           logs.value = [];
           logError.value = '加载日志数据格式错误。';
           console.error("Invalid data format for study logs:", response.data);
      }
    } catch (err) {
      logs.value = [];
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      logError.value = `无法加载学习日志: ${backendError}`;
      console.error('Error loading recent study logs:', err);
    } finally {
      isLoadingLogs.value = false;
    }
  }

  /**
   * 从后端加载聚合的学习统计数据
   */
  async function loadActivityStats() {
      isLoadingStats.value = true;
      statsError.value = null;
      try {
          const response = await axios.get(API_STATS_URL);
          const stats = response.data;
          // 假设后端 /stats 返回的字段与 state ref 名称一致
          totalDurationSeconds.value = stats.total || 0;
          weekDurationSeconds.value = stats.week || 0;
          monthDurationSeconds.value = stats.month || 0;
          todayDurationSeconds.value = stats.today || 0;     // 番茄钟时长
          todayOnlineSeconds.value = stats.todayOnline || 0; // 在线时长
          console.log("Loaded activity stats:", stats);
      } catch (err) {
          console.error("Error loading activity stats:", err);
          const backendError = err.response?.data?.message || err.message || '未知网络错误';
          statsError.value = `无法加载统计数据: ${backendError}`;
          // Reset stats on error
          totalDurationSeconds.value = 0; weekDurationSeconds.value = 0;
          monthDurationSeconds.value = 0; todayDurationSeconds.value = 0;
          todayOnlineSeconds.value = 0;
      } finally {
          isLoadingStats.value = false;
      }
  }

  /**
   * 添加一条新的学习日志记录 (由 pomodoroStore 调用)
   */
  async function addLog(logData) {
    logError.value = null;
    try {
      logData.durationSeconds = Number(logData.durationSeconds || 0);
      if (logData.durationSeconds <= 0) { return false; }

      await axios.post(API_LOG_URL, logData);
      console.log('Study log added:', logData.activity);
      // 添加成功后重新加载统计数据
      await loadActivityStats();
      // 可选：也重新加载最近日志列表
      // await loadRecentLogs();
      return true;
    } catch (err) {
      console.error('Error adding study log:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      logError.value = `记录学习日志失败: ${backendError}`;
      return false;
    }
  }

  /**
   * 清空所有学习日志记录
   */
  async function clearAllLogs() {
    isLoadingLogs.value = true;
    isLoadingStats.value = true;
    logError.value = null;
    statsError.value = null;
    let success = false;
    try {
      await axios.delete(`${API_LOG_URL}/all`);
      logs.value = [];
      await loadActivityStats(); // 重新加载统计（应为 0）
      console.log('All study logs cleared.');
      success = true;
    } catch (err) {
       console.error('Error clearing study logs:', err);
       const backendError = err.response?.data?.message || err.message || '未知网络错误';
       logError.value = `清空日志失败: ${backendError}`;
       success = false;
    } finally {
      isLoadingLogs.value = false;
      isLoadingStats.value = false;
    }
    return success;
  }

  // --- Initialization ---
  loadRecentLogs();
  loadActivityStats();

  // --- Expose ---
  return {
    // State (for storeToRefs)
    logs,
    logError,
    statsError,
    totalDurationSeconds,
    todayDurationSeconds,
    weekDurationSeconds,
    monthDurationSeconds,
    todayOnlineSeconds,
    // Computed Getters
    isLoading,
    // Actions
    loadRecentLogs,
    loadActivityStats,
    clearAllLogs,
    addLog
  };
});