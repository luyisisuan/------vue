// src/stores/studyLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
// 确保导入了 date-fns 相关函数
import { startOfDay, startOfWeek, startOfMonth, parseISO } from 'date-fns';
// 如果需要中文 locale (例如在 format 函数中使用)
// import { zhCN } from 'date-fns/locale';

// 后端 API 地址
const API_LOG_URL = 'http://localhost:8080/api/pomodoro/log'; // 确认 URL 正确

export const useStudyLogStore = defineStore('studyLog', () => {
  // --- State ---
  const logs = ref([]); // 学习日志列表(从 API 获取)
  const isLoading = ref(false); // 是否正在加载日志
  const error = ref(null);     // 加载或操作日志时发生的错误信息

  // --- Getters ---

  // 计算总学习时长 (所有日志记录的总和)
  const totalDurationSeconds = computed(() => {
    return logs.value.reduce((sum, log) => sum + (Number(log.durationSeconds) || 0), 0);
  });

  // 计算今日学习时长
  const todayDurationSeconds = computed(() => {
    const todayStart = startOfDay(new Date()); // 获取今天 00:00:00 的时间戳
    return logs.value.reduce((sum, log) => {
      try {
        // 将后端返回的 ISO 字符串转换为 Date 对象进行比较
        const logStartTime = parseISO(log.startTime);
        if (!isNaN(logStartTime.getTime()) && logStartTime >= todayStart) {
          return sum + (Number(log.durationSeconds) || 0);
        }
      } catch(e) {
          console.warn(`Error parsing log startTime: ${log.startTime}`, e);
      }
      return sum;
    }, 0);
  });

  // 计算本周学习时长 (周一为开始)
  const weekDurationSeconds = computed(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // 获取本周一 00:00:00
    return logs.value.reduce((sum, log) => {
      try {
        const logStartTime = parseISO(log.startTime);
        if (!isNaN(logStartTime.getTime()) && logStartTime >= weekStart) {
          return sum + (Number(log.durationSeconds) || 0);
        }
      } catch(e) {
           console.warn(`Error parsing log startTime: ${log.startTime}`, e);
      }
      return sum;
    }, 0);
  });

  // 计算本月学习时长
  const monthDurationSeconds = computed(() => {
    const monthStart = startOfMonth(new Date()); // 获取本月第一天 00:00:00
    return logs.value.reduce((sum, log) => {
       try {
        const logStartTime = parseISO(log.startTime);
        if (!isNaN(logStartTime.getTime()) && logStartTime >= monthStart) {
          return sum + (Number(log.durationSeconds) || 0);
        }
       } catch(e) {
            console.warn(`Error parsing log startTime: ${log.startTime}`, e);
       }
      return sum;
    }, 0);
  });

  // --- Actions ---

  /**
   * 从后端 API 加载最近的学习日志记录
   * @param {number} limit 加载的记录数量，默认为 50
   */
  async function loadRecentLogs(limit = 50) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.get(`${API_LOG_URL}/recent`, { params: { limit } });
      // 验证返回的是否是数组
      if (Array.isArray(response.data)) {
          logs.value = response.data;
          console.log(`Loaded ${logs.value.length} recent study logs from API.`);
      } else {
           console.error("Invalid data format received for study logs:", response.data);
           logs.value = [];
           error.value = '加载日志数据格式错误。';
      }
    } catch (err) {
      console.error('Error loading recent study logs:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载学习日志: ${backendError}`;
      logs.value = []; // 出错时清空
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 添加一条新的学习日志记录到后端
   * @param {object} logData 包含 startTime (ISO string), endTime (ISO string), durationSeconds (number), activity (string), source (string)
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function addLog(logData) {
    // 添加基本的验证
    if (!logData || !logData.startTime || !logData.endTime || !logData.durationSeconds) {
        console.warn("Attempted to add log with missing data.", logData);
        error.value = '缺少必要的日志信息。';
        return false;
    }
    // 确保 durationSeconds 是正数
    logData.durationSeconds = Number(logData.durationSeconds || 0);
    if (logData.durationSeconds <= 0) {
        console.warn("Attempted to add log with zero or negative duration.");
        // 可以选择不报错，直接返回 false
        // error.value = '学习时长不能为零或负数。';
        return false;
    }
    // 确保时间有效性 (可选)
    try {
        const start = parseISO(logData.startTime);
        const end = parseISO(logData.endTime);
        if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
            console.warn("Invalid start or end time in log data.", logData);
            error.value = '无效的开始或结束时间。';
            return false;
        }
    } catch(e) {
         console.warn("Error parsing time in log data.", e);
         error.value = '时间格式错误。';
         return false;
    }


    // isLoading.value = true; // 添加操作通常很快，可以不设置全局 loading
    error.value = null; // 清除之前的添加错误
    try {
      // 发送 POST 请求
      const response = await axios.post(API_LOG_URL, logData);
      console.log('Study log added via API (from studyLogStore):', response.data);
      // 添加成功后，重新加载日志列表以包含新记录并更新统计
      await loadRecentLogs(); // 重新加载以确保列表和统计更新
      return true; // 表示成功
    } catch (err) {
      console.error('Error adding study log via API (from studyLogStore):', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `记录学习日志失败: ${backendError}`;
      return false; // 表示失败
    } finally {
      // isLoading.value = false;
    }
  }

  /**
   * 清空所有学习日志记录
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function clearAllLogs() {
    isLoading.value = true; // 清空操作可能需要加载状态
    error.value = null;
    try {
      await axios.delete(`${API_LOG_URL}/all`);
      logs.value = []; // 清空前端列表
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
  loadRecentLogs(); // 初始化时加载最近日志

  // --- Expose ---
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
    addLog // 暴露 addLog Action
  };
});