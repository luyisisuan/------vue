// src/stores/studyLogStore.js
import { defineStore } from 'pinia';
import { ref, computed, onUnmounted } from 'vue';
import apiClient from '@/utils/apiClient.js';
import config from '@/config.js';

const LOGS_API_BASE_PATH = '/pomodoro/log';
const STATS_API_PATH = '/activity/stats';
const STATS_POLLING_INTERVAL_MS = config.STATS_POLLING_INTERVAL_MS || 60000;

export const useStudyLogStore = defineStore('studyLog', () => {
  // --- State ---
  const logs = ref([]);
  const isLoadingLogs = ref(false);
  const logError = ref(null);
  const logsLoadedSuccessfully = ref(false); // New state

  const totalDurationSeconds = ref(0);
  const todayDurationSeconds = ref(0);
  const weekDurationSeconds = ref(0);
  const monthDurationSeconds = ref(0);
  const todayOnlineSeconds = ref(0);

  const isLoadingStats = ref(false);
  const statsError = ref(null);
  const statsPollingIntervalId = ref(null);
  const statsLoadedSuccessfully = ref(false); // New state

  // --- Getters ---
  const isLoading = computed(() => isLoadingLogs.value || isLoadingStats.value);

  // --- Actions ---

  async function loadRecentLogs(limit = 50) {
    isLoadingLogs.value = true;
    logError.value = null;
    logsLoadedSuccessfully.value = false; // Reset before loading
    try {
      const response = await apiClient.get(`${LOGS_API_BASE_PATH}/recent`, { params: { limit } });
      if (Array.isArray(response.data)) {
          logs.value = response.data;
          logsLoadedSuccessfully.value = true; // Set on success
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

  async function loadActivityStats(isForced = false) { // Added isForced for explicit reload needs
      if (isLoadingStats.value && !isForced) { // Allow forced reload even if already loading
          console.log('[StudyLogStore] Stats loading already in progress, skipping non-forced call.');
          return;
      }
      isLoadingStats.value = true;
      statsError.value = null;
      statsLoadedSuccessfully.value = false; // Reset before loading
      try {
          const response = await apiClient.get(STATS_API_PATH);
          const stats = response.data;

          totalDurationSeconds.value = stats.total || 0;
          weekDurationSeconds.value = stats.week || 0;
          monthDurationSeconds.value = stats.month || 0;
          todayDurationSeconds.value = stats.today || 0;
          todayOnlineSeconds.value = stats.todayOnline || 0;
          statsLoadedSuccessfully.value = true; // Set on success

          console.log("[StudyLogStore] Loaded activity stats from backend:", {
            total: totalDurationSeconds.value,
            week: weekDurationSeconds.value,
            month: monthDurationSeconds.value,
            today: todayDurationSeconds.value,
            todayOnline: todayOnlineSeconds.value
          });

      } catch (err) {
          console.error("[StudyLogStore] Error loading activity stats:", err);
          statsLoadedSuccessfully.value = false; // Ensure it's false on error
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
      // Force reload stats and logs
      await loadActivityStats(true);
      await loadRecentLogs(50); 
      
      success = true;
    } catch (err) {
      console.error('[StudyLogStore] Error adding study log or during post-add refresh:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      logError.value = `记录学习日志或刷新数据失败: ${backendError}`;
      success = false;
    }
    return success;
  }

  async function clearAllLogs() {
     isLoadingLogs.value = true;
     isLoadingStats.value = true; // Also indicate stats might be changing
     logError.value = null;
     statsError.value = null;
     let success = false;
     try {
       await apiClient.delete(`${LOGS_API_BASE_PATH}/all`);
       logs.value = []; // Clear local logs immediately
       logsLoadedSuccessfully.value = true; // Considered "loaded" as empty
       console.log('[StudyLogStore] All study logs cleared from API.');
       await loadActivityStats(true); // Refresh stats
       success = true;
     } catch (err) {
        console.error('[StudyLogStore] Error clearing study logs:', err);
        const backendError = err.response?.data?.message || err.message || '未知网络错误';
        const errorMsg = `清空日志失败: ${backendError}`;
        logError.value = errorMsg;
        statsError.value = errorMsg; // Also set statsError as stats refresh might fail
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
      // Initial load before setting interval
      loadActivityStats().then(() => {
        // Only start polling if the initial load was successful
        if (statsLoadedSuccessfully.value) {
            statsPollingIntervalId.value = setInterval(() => {
                if (!isLoadingStats.value) { // Don't poll if a load is already in progress
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

  async function initializeStore() {
      console.log('[StudyLogStore] Initializing...');
      // Load logs and stats in parallel
      await Promise.all([
          loadRecentLogs(), // Load logs first or in parallel
          loadActivityStats() // Load initial stats
      ]);
      // Start polling only after initial stats are attempted
      if (statsLoadedSuccessfully.value) {
        startStatsPolling();
      } else {
        console.warn("[StudyLogStore] Initial stats load failed in initializeStore, polling not started.");
      }
      console.log('[StudyLogStore] Initialization complete.');
  }

  onUnmounted(() => {
      stopStatsPolling();
  });

  return {
    logs,
    isLoadingLogs,
    logError,
    logsLoadedSuccessfully, // Export new state
    totalDurationSeconds,
    todayDurationSeconds,
    weekDurationSeconds,
    monthDurationSeconds,
    todayOnlineSeconds,
    isLoadingStats,
    statsError,
    statsLoadedSuccessfully, // Export new state
    isLoading,
    loadRecentLogs,
    loadActivityStats,
    addLog,
    clearAllLogs,
    startStatsPolling,
    stopStatsPolling,
    initializeStore
  };
});