// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉旧的导入
import { loadData, saveData } from '@/utils/storage.js';
import config from '@/config.js';
import { throttle } from 'lodash-es';

// <<< 不再需要 API_PING_URL 常量 >>>
// const API_PING_URL = 'http://localhost:8080/api/activity/ping';

export const useAppStore = defineStore('app', () => {
  // --- State ---
  const persistentActivityData = ref({
      lastActivityTimestamp: Date.now()
  });

  let activityPingIntervalId = null;

  // --- Actions ---

  function loadLastActivityTimestamp() {
      const now = Date.now();
      const defaultData = { lastActivityTimestamp: now };
      const loadedData = loadData(config.localStorageKeys.persistentOnlineTime, defaultData);
      let initialTimestamp = loadedData.lastActivityTimestamp || now;
      const maxAge = config.INACTIVITY_TIMEOUT_MS;
      if (initialTimestamp !== now && (now - initialTimestamp > maxAge)) {
          console.warn(`[AppStore] Loaded timestamp ${new Date(initialTimestamp)} is older than ${maxAge / 60000} minutes. Resetting to current time.`);
          initialTimestamp = now;
      }
      persistentActivityData.value = { lastActivityTimestamp: initialTimestamp };
      console.log("[AppStore] Loaded last activity timestamp:", new Date(persistentActivityData.value.lastActivityTimestamp));
  }

  function saveLastActivityTimestamp() {
    const dataToSave = {
        lastActivityTimestamp: persistentActivityData.value.lastActivityTimestamp || Date.now()
    };
    saveData(config.localStorageKeys.persistentOnlineTime, dataToSave);
  }

  // 定期发送活跃心跳到后端
  async function sendActivityPing() {
      // --- 保持你的日志用于调试 ---
      console.log('[AppStore] sendActivityPing function CALLED by setInterval.');
      const now = Date.now();
      const lastActivity = persistentActivityData.value.lastActivityTimestamp;
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
      const threshold = pingIntervalSeconds * 1000 + 5000;
      console.log(`[AppStore] Ping check: now=${now} (${new Date(now).toLocaleTimeString()}), lastActivity=${lastActivity} (${new Date(lastActivity).toLocaleTimeString()}), threshold=${threshold}ms`);
      console.log(`[AppStore] Ping check: now - lastActivity = ${now - lastActivity}ms`);

      if (now - lastActivity <= threshold) {
          console.log('[AppStore] Ping check PASSED. Entering active branch...');
          console.log(`[AppStore] User active, sending ping for the last ${pingIntervalSeconds} seconds.`);
          try {
              // <<< 使用 apiClient 和相对路径 >>>
              await apiClient.post('/activity/ping', { durationSeconds: pingIntervalSeconds });
              console.log('[AppStore] Ping request sent successfully (apiClient promise resolved).');
          } catch (err) {
              // 注意：如果 apiClient 的响应拦截器处理了错误，这里的 catch 可能不会执行或接收到的 err 不同
              console.error("[AppStore] Error sending activity ping:", err.response?.data || err.message || err);
          }
      } else {
          console.log('[AppStore] Ping check FAILED. Entering inactive branch...');
          console.log("[AppStore] User inactive based on timestamp check, skipping activity ping.");
      }
      console.log('[AppStore] sendActivityPing function FINISHED.');
  }


  // 更新最后活动时间戳 (节流)
  const updateLastActivityTimestamp = throttle(() => {
    const now = Date.now();
    // 检查是否应该更新时间戳 (逻辑保持不变)
    if (now - persistentActivityData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
        persistentActivityData.value.lastActivityTimestamp = now;
        saveLastActivityTimestamp();
    }
    // ... (其他节流逻辑)
  }, config.ACTIVITY_THROTTLE_MS);

  // 页面卸载前处理 (保持不变)
  function handleBeforeUnload() {
     console.log("[AppStore] Beforeunload: Saving final activity timestamp.");
     saveLastActivityTimestamp();
  }

  // --- 暴露给 App.vue 使用的 Action ---
  function startOnlineTracking() {
      console.log("[AppStore] Starting activity tracking...");
      loadLastActivityTimestamp();
      if (activityPingIntervalId) {
        clearInterval(activityPingIntervalId);
        activityPingIntervalId = null;
      }
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
      activityPingIntervalId = setInterval(sendActivityPing, pingIntervalSeconds * 1000);
      console.log(`[AppStore] Activity ping interval set to ${pingIntervalSeconds} seconds.`);
      // 添加活动监听器 (保持不变)
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      activityEvents.forEach(eventType => {
        document.addEventListener(eventType, updateLastActivityTimestamp, { passive: true });
      });
      document.addEventListener('visibilitychange', updateLastActivityTimestamp);
      window.addEventListener('beforeunload', handleBeforeUnload);
      console.log("[AppStore] Activity listeners added.");
  }

  function stopOnlineTracking() {
      console.log("[AppStore] Stopping activity tracking...");
      if (activityPingIntervalId) {
        clearInterval(activityPingIntervalId);
        activityPingIntervalId = null;
      }
      // 移除活动监听器 (保持不变)
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      activityEvents.forEach(eventType => {
        document.removeEventListener(eventType, updateLastActivityTimestamp);
      });
      document.removeEventListener('visibilitychange', updateLastActivityTimestamp);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log("[AppStore] Activity listeners removed.");
      handleBeforeUnload();
  }

  // --- Expose ---
  // **修改:** 确保暴露了 persistentActivityData，如果其他地方需要访问的话
  // (例如 StudyLogSection 可能需要显示在线时长)
  return {
    persistentActivityData, // <<< 暴露这个 ref
    startOnlineTracking,
    stopOnlineTracking
    // 注意：updateLastActivityTimestamp 和 sendActivityPing 通常是内部使用的，
    // 但如果需要外部手动触发（不推荐），也可以暴露。
  };
});