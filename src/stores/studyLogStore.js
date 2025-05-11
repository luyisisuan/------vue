// src/stores/studyLogStore.js
import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import apiClient from '@/utils/apiClient.js';
import config from '@/config.js'; // 确保 config.js 中有 STATS_POLLING_INTERVAL_MS

const LOGS_API_BASE_PATH = '/pomodoro/log'; // 你的番茄钟日志API路径
const STATS_API_PATH = '/activity/stats';   // 你的活动统计API路径

// 统计数据轮询间隔 (例如：60秒)
const STATS_POLLING_INTERVAL_MS = config.STATS_POLLING_INTERVAL_MS || 60000;

export const useStudyLogStore = defineStore('studyLog', () => {
  // --- State ---
  const logs = ref([]);
  const isLoadingLogs = ref(false);
  const logError = ref(null);

  // 统计数据
  const totalDurationSeconds = ref(0);
  const todayDurationSeconds = ref(0);
  const weekDurationSeconds = ref(0);
  const monthDurationSeconds = ref(0);
  const todayOnlineSeconds = ref(0); // 这个值现在会从 stats.todayOnline 更新

  const isLoadingStats = ref(false);
  const statsError = ref(null);
  const statsPollingIntervalId = ref(null);

  // --- Getters ---
  const isLoading = computed(() => isLoadingLogs.value || isLoadingStats.value);

  // --- Actions ---

  async function loadRecentLogs(limit = 50) {
    isLoadingLogs.value = true;
    logError.value = null;
    try {
      const response = await apiClient.get(`${LOGS_API_BASE_PATH}/recent`, { params: { limit } });
      if (Array.isArray(response.data)) {
          logs.value = response.data;
          console.log(`[StudyLogStore] Loaded ${logs.value.length} recent study logs.`);
      } else {
           logs.value = [];
           logError.value = '加载日志数据格式错误。';
           console.error("[StudyLogStore] Invalid data format for study logs:", response.data);
      }
    } catch (err) {
      logs.value = [];
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      logError.value = `无法加载学习日志: ${backendError}`;
      console.error('[StudyLogStore] Error loading recent study logs:', err);
    } finally {
      isLoadingLogs.value = false;
    }
  }

  async function loadActivityStats() {
      if (isLoadingStats.value && statsPollingIntervalId.value && isLoadingStats.value === true) {
          console.log('[StudyLogStore] Stats loading already in progress (likely by poll), skipping this poll trigger.');
          return;
      }
      isLoadingStats.value = true;
      statsError.value = null;
      try {
          const response = await apiClient.get(STATS_API_PATH);
          const stats = response.data; // stats is: {"total":12852,"week":369,"month":369,"today":369,"todayOnline":4050}

          // 使用后端实际返回的字段名进行赋值
          totalDurationSeconds.value = stats.total || 0;
          weekDurationSeconds.value = stats.week || 0;
          monthDurationSeconds.value = stats.month || 0;
          todayDurationSeconds.value = stats.today || 0;
          todayOnlineSeconds.value = stats.todayOnline || 0; // 这个现在会正确更新

          console.log("[StudyLogStore] Loaded activity stats from backend and mapped to store:", {
            total: totalDurationSeconds.value,
            week: weekDurationSeconds.value,
            month: monthDurationSeconds.value,
            today: todayDurationSeconds.value,
            todayOnline: todayOnlineSeconds.value // 这个值现在是 4050
          });

      } catch (err) {
          console.error("[StudyLogStore] Error loading activity stats:", err);
          if (err.response && err.response.status === 404) {
              statsError.value = `无法找到统计数据接口 (${STATS_API_PATH})。`;
          } else {
              const backendError = err.response?.data?.message || err.message || '未知网络错误';
              statsError.value = `无法加载统计数据: ${backendError}`;
          }
      } finally {
          isLoadingStats.value = false;
      }
  }

  async function addLog(logData) {
    logError.value = null;
    let success = false;
    try {
      const duration = Number(logData.durationSeconds || 0);
      if (duration <= 0) {
        console.warn("[StudyLogStore] Skipping log with zero or negative duration.");
        logError.value = "学习时长必须大于0。";
        return false;
      }
      const dataToSend = { ...logData, durationSeconds: duration };

      await apiClient.post(LOGS_API_BASE_PATH, dataToSend);
      console.log('[StudyLogStore] Study log added via API:', logData.activity);

      console.log('[StudyLogStore] Refreshing stats and logs after adding a new log.');
      await loadActivityStats();
      await loadRecentLogs(50);
      
      success = true;
    } catch (err) {
      console.error('[StudyLogStore] Error adding study log or during post-add refresh:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      logError.value = `记录学习日志或刷新数据失败: ${backendError}`;
      success = false;
    } finally {
      //
    }
    return success;
  }

  async function clearAllLogs() {
     isLoadingLogs.value = true;
     isLoadingStats.value = true;
     logError.value = null;
     statsError.value = null;
     let success = false;
     try {
       await apiClient.delete(`${LOGS_API_BASE_PATH}/all`);
       logs.value = [];
       console.log('[StudyLogStore] All study logs cleared from API.');
       await loadActivityStats();
       success = true;
     } catch (err) {
        console.error('[StudyLogStore] Error clearing study logs:', err);
        const backendError = err.response?.data?.message || err.message || '未知网络错误';
        const errorMsg = `清空日志失败: ${backendError}`;
        logError.value = errorMsg;
        statsError.value = errorMsg;
        success = false;
     } finally {
       isLoadingLogs.value = false;
       isLoadingStats.value = false;
     }
     return success;
  }

  function startStatsPolling() {
      if (statsPollingIntervalId.value) {
          clearInterval(statsPollingIntervalId.value);
          statsPollingIntervalId.value = null;
      }
      console.log('[StudyLogStore] Attempting to start stats polling...');
      loadActivityStats().then(() => {
        if (!statsError.value) {
            statsPollingIntervalId.value = setInterval(() => {
                if (!isLoadingStats.value) {
                    loadActivityStats();
                } else {
                    console.log('[StudyLogStore] Poll: Stats loading is already in progress, skipping this interval.');
                }
            }, STATS_POLLING_INTERVAL_MS);
            console.log(`[StudyLogStore] Started polling activity stats every ${STATS_POLLING_INTERVAL_MS / 1000} seconds.`);
        } else {
            console.warn('[StudyLogStore] Initial stats load failed during polling setup, polling not started. Error:', statsError.value);
        }
      }).catch(err => {
          console.error('[StudyLogStore] Critical error during initial stats load for polling setup, polling not started:', err);
      });
  }

  function stopStatsPolling() {
      if (statsPollingIntervalId.value) {
          clearInterval(statsPollingIntervalId.value);
          statsPollingIntervalId.value = null;
          console.log("[StudyLogStore] Stopped polling activity stats.");
      }
  }

  onUnmounted(() => {
      stopStatsPolling();
  });

  return {
    logs,
    isLoadingLogs,
    logError,
    totalDurationSeconds,
    todayDurationSeconds,
    weekDurationSeconds,
    monthDurationSeconds,
    todayOnlineSeconds,
    isLoadingStats,
    statsError,
    isLoading,
    loadRecentLogs,
    loadActivityStats,
    addLog,
    clearAllLogs,
    startStatsPolling,
    stopStatsPolling,
    async initializeStore() {
        console.log('[StudyLogStore] Initializing...');
        await Promise.all([
            loadRecentLogs(),
        ]);
        startStatsPolling();
        console.log('[StudyLogStore] Initialization complete.');
    }
  };
});