import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { startOfDay, startOfWeek, startOfMonth, parseISO } from 'date-fns';

const API_LOG_URL = 'http://localhost:8080/api/pomodoro/log';

export const useStudyLogStore = defineStore('studyLog', () => {
  // --- State ---
  const logs = ref([]);           // 从 API 获取的学习日志列表
  const isLoading = ref(false);    // 是否正在加载日志
  const error = ref(null);         // 加载或操作日志时的错误信息

  // --- Getters ---
  // 根据日志的开始和结束时间计算学习时长，单位为秒

  const totalDurationSeconds = computed(() => {
    return logs.value.reduce((sum, log) => {
      try {
        const start = parseISO(log.startTime);
        const end = parseISO(log.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
          return sum;
        }
        return sum + (end.getTime() - start.getTime()) / 1000;
      } catch (e) {
        return sum;
      }
    }, 0);
  });

  const todayDurationSeconds = computed(() => {
    const todayStart = startOfDay(new Date());
    return logs.value.reduce((sum, log) => {
      try {
        const start = parseISO(log.startTime);
        const end = parseISO(log.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return sum;
        // 如果日志的开始时间在今天之后，则计入今日学习时长
        if (start >= todayStart) {
          return sum + (end.getTime() - start.getTime()) / 1000;
        }
      } catch (e) {
        console.warn(`Error parsing log time: ${log.startTime} ~ ${log.endTime}`, e);
      }
      return sum;
    }, 0);
  });

  const weekDurationSeconds = computed(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    return logs.value.reduce((sum, log) => {
      try {
        const start = parseISO(log.startTime);
        const end = parseISO(log.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return sum;
        if (start >= weekStart) {
          return sum + (end.getTime() - start.getTime()) / 1000;
        }
      } catch (e) {
        console.warn(`Error parsing log time: ${log.startTime} ~ ${log.endTime}`, e);
      }
      return sum;
    }, 0);
  });

  const monthDurationSeconds = computed(() => {
    const monthStart = startOfMonth(new Date());
    return logs.value.reduce((sum, log) => {
      try {
        const start = parseISO(log.startTime);
        const end = parseISO(log.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return sum;
        if (start >= monthStart) {
          return sum + (end.getTime() - start.getTime()) / 1000;
        }
      } catch (e) {
        console.warn(`Error parsing log time: ${log.startTime} ~ ${log.endTime}`, e);
      }
      return sum;
    }, 0);
  });

  // --- Actions ---

  /**
   * 从后端 API 加载最近的学习日志记录
   * @param {number} limit 加载记录的条数，默认 50 条
   */
  async function loadRecentLogs(limit = 50) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_LOG_URL}/recent`, { params: { limit } });
      if (Array.isArray(response.data)) {
        logs.value = response.data;
        console.log(`Loaded ${logs.value.length} recent study logs from API.`);
      } else {
        console.error("Invalid data format received:", response.data);
        logs.value = [];
        error.value = '加载日志数据格式错误。';
      }
    } catch (err) {
      console.error('Error loading recent study logs:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载学习日志: ${backendError}`;
      logs.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 添加一条新的学习日志记录到后端
   * @param {object} logData 包含 startTime (ISO string), endTime (ISO string), activity (string), source (string)
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function addLog(logData) {
    if (!logData || !logData.startTime || !logData.endTime) {
      console.warn("Attempted to add log with missing data.", logData);
      error.value = '缺少必要的日志信息。';
      return false;
    }
    try {
      const start = parseISO(logData.startTime);
      const end = parseISO(logData.endTime);
      if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
        console.warn("Invalid start or end time in log data.", logData);
        error.value = '无效的开始或结束时间。';
        return false;
      }
    } catch (e) {
      console.warn("Error parsing log time.", e);
      error.value = '时间格式错误。';
      return false;
    }

    error.value = null;
    try {
      const response = await axios.post(API_LOG_URL, logData);
      console.log('Study log added via API:', response.data);
      // 添加成功后重新加载日志列表，确保统计信息更新
      await loadRecentLogs();
      return true;
    } catch (err) {
      console.error('Error adding study log via API:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `记录学习日志失败: ${backendError}`;
      return false;
    }
  }

  /**
   * 清空所有学习日志记录
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function clearAllLogs() {
    isLoading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_LOG_URL}/all`);
      logs.value = [];
      console.log('All study logs cleared via API.');
      return true;
    } catch (err) {
      console.error('Error clearing study logs:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `清空日志失败: ${backendError}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // --- Initialization ---
  loadRecentLogs();

  return {
    // State
    logs,
    isLoading,
    error,
    // Getters
    totalDurationSeconds,
    todayDurationSeconds,
    weekDurationSeconds,
    monthDurationSeconds,
    // Actions
    loadRecentLogs,
    clearAllLogs,
    addLog
  };
});
