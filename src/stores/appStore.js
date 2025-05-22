// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import apiClient from '@/utils/apiClient.js';
import { loadData, saveData } from '@/utils/storage.js';
import config from '@/config.js';
import { throttle } from 'lodash-es';

export const useAppStore = defineStore('app', () => {
  // --- State ---
  const persistentActivityData = ref({
      lastActivityTimestamp: Date.now()
  });

  let activityPingIntervalId = null;

  // --- Sidebar State (NEW) ---
  const isSidebarCollapsed = ref(false); // 初始为展开 (false)
  const isSidebarHidden = ref(false);   // 初始为不隐藏 (false)
  // --- End Sidebar State ---

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

  async function sendActivityPing() {
      // console.log('[AppStore] sendActivityPing function CALLED by setInterval.'); // 可按需开启日志
      const now = Date.now();
      const lastActivity = persistentActivityData.value.lastActivityTimestamp;
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
      const threshold = pingIntervalSeconds * 1000 + 5000; // 允许的延迟
      // console.log(`[AppStore] Ping check: now - lastActivity = ${now - lastActivity}ms vs threshold ${threshold}ms`); // 可按需开启日志

      if (now - lastActivity <= threshold) {
          // console.log(`[AppStore] User active, sending ping for the last ${pingIntervalSeconds} seconds.`); // 可按需开启日志
          try {
              await apiClient.post('/activity/ping', { durationSeconds: pingIntervalSeconds });
              // console.log('[AppStore] Ping request sent successfully.'); // 可按需开启日志
          } catch (err) {
              console.error("[AppStore] Error sending activity ping:", err.response?.data || err.message || err);
          }
      } else {
          // console.log("[AppStore] User inactive based on timestamp check, skipping activity ping."); // 可按需开启日志
      }
      // console.log('[AppStore] sendActivityPing function FINISHED.'); // 可按需开启日志
  }

  const updateLastActivityTimestamp = throttle(() => {
    const now = Date.now();
    if (now - persistentActivityData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
        persistentActivityData.value.lastActivityTimestamp = now;
        saveLastActivityTimestamp();
    }
  }, config.ACTIVITY_THROTTLE_MS);

  function handleBeforeUnload() {
     console.log("[AppStore] Beforeunload: Saving final activity timestamp.");
     saveLastActivityTimestamp();
  }

  function startOnlineTracking() {
      console.log("[AppStore] Starting activity tracking...");
      loadLastActivityTimestamp();
      if (activityPingIntervalId) {
        clearInterval(activityPingIntervalId);
        activityPingIntervalId = null;
      }
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
      activityPingIntervalId = setInterval(sendActivityPing, pingIntervalSeconds * 1000);
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
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      activityEvents.forEach(eventType => {
        document.removeEventListener(eventType, updateLastActivityTimestamp);
      });
      document.removeEventListener('visibilitychange', updateLastActivityTimestamp);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log("[AppStore] Activity listeners removed.");
      handleBeforeUnload();
  }

  // --- Sidebar Actions (NEW) ---
  function setSidebarCollapsed(collapsed) {
    isSidebarCollapsed.value = collapsed;
    // 如果只是收起，确保它不是完全隐藏状态
    if (isSidebarHidden.value && !collapsed) { // 如果之前是隐藏但现在要展开
        // isSidebarHidden.value = false; // 这一步由 setSidebarHidden 处理更合适
    } else if (isSidebarHidden.value && collapsed) {
        // 如果已经是隐藏状态，收起状态也应该是 true，这里不需要额外操作
    } else if (!isSidebarHidden.value && collapsed) {
        // 正常收起
    }
  }

  function setSidebarHidden(hidden) {
    isSidebarHidden.value = hidden;
    // 如果设置为隐藏，那么它也必须是收起状态
    if (hidden) {
      isSidebarCollapsed.value = true;
    }
    // 如果设置为不隐藏，但之前是收起状态，保持收起状态
    // 如果设置为不隐藏，且之前是展开状态，保持展开状态 (由 isSidebarCollapsed 控制)
  }

  function toggleSidebar() { // 一个简单的切换函数，优先切换收起/展开
    if (isSidebarHidden.value) {
        // 如果是隐藏状态，点击切换按钮应该变为展开
        setSidebarHidden(false);
        setSidebarCollapsed(false);
    } else {
        setSidebarCollapsed(!isSidebarCollapsed.value);
    }
  }
  // --- End Sidebar Actions ---

  // --- Expose ---
  return {
    persistentActivityData,
    startOnlineTracking,
    stopOnlineTracking,

    // Sidebar related state and actions
    isSidebarCollapsed,
    isSidebarHidden,
    setSidebarCollapsed,
    setSidebarHidden,
    toggleSidebar, // 可选，如果 Sidebar.vue 内部有切换按钮
  };
});