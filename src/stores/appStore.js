// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loadData, saveData } from '@/utils/storage.js'; // 确认路径
import config from '@/config.js'; // 确认路径
import { throttle } from 'lodash-es';

// 辅助函数 - formatSecondsToHHMMSS
function formatSecondsToHHMMSS(totalSeconds) {
  if (isNaN(totalSeconds) || totalSeconds < 0) { totalSeconds = 0; }
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');
  return `${h}:${m}:${s}`;
}

// 辅助函数 - getNowISO (如果其他地方不用可以移到需要的地方)
// function getNowISO() { return new Date().toISOString(); }

export const useAppStore = defineStore('app', () => {
  // State
  const persistentOnlineTimeData = ref({
      totalSeconds: 0,
      lastActivityTimestamp: Date.now(),
      // sessionStartTime 不再需要，因为不记录在线时长日志了
      // sessionStartTime: getNowISO()
  });
  const formattedOnlineTime = computed(() => formatSecondsToHHMMSS(persistentOnlineTimeData.value.totalSeconds));
  let persistentOnlineTimerInterval = null;
  let lastActivityUpdateTimestamp = 0;

  // Actions
  function loadPersistentOnlineTimeData() {
      const now = Date.now();
      const unloadTimestamp = loadData(config.localStorageKeys.pageUnloadTimestamp, null);
      if (unloadTimestamp !== null) { localStorage.removeItem(config.localStorageKeys.pageUnloadTimestamp); }

      const defaultData = { totalSeconds: 0, lastActivityTimestamp: now };
      const loadedData = loadData(config.localStorageKeys.persistentOnlineTime, defaultData);
      // 只加载需要的字段
      const data = {
          totalSeconds: loadedData.totalSeconds || 0,
          lastActivityTimestamp: loadedData.lastActivityTimestamp || now
      };

      let isShortClosure = false;
      if (unloadTimestamp !== null) {
          const closureDuration = now - unloadTimestamp;
          if (closureDuration >= 0 && closureDuration < config.SHORT_CLOSURE_THRESHOLD_MS) {
              isShortClosure = true;
              console.log(`Short closure detected. Resuming online timer.`);
          } else if (closureDuration >= config.SHORT_CLOSURE_THRESHOLD_MS) {
               console.log(`Long closure detected. Resetting online timer.`);
               data.totalSeconds = 0; data.lastActivityTimestamp = now;
          } else {
              console.warn("Invalid closure duration. Resetting online timer.");
              data.totalSeconds = 0; data.lastActivityTimestamp = now;
          }
      }

      if (!isShortClosure && (now - data.lastActivityTimestamp > config.INACTIVITY_TIMEOUT_MS)) {
          console.log("User inactive on load. Resetting online timer.");
          data.totalSeconds = 0; data.lastActivityTimestamp = now;
      } else if (!isShortClosure) {
          data.lastActivityTimestamp = now; // Update timestamp if active on load
      }

      persistentOnlineTimeData.value = data;
      savePersistentOnlineTimeData(); // Save potentially reset state
  }

  function savePersistentOnlineTimeData() {
    const dataToSave = { // 只保存需要的
        totalSeconds: Math.floor(persistentOnlineTimeData.value.totalSeconds || 0),
        lastActivityTimestamp: persistentOnlineTimeData.value.lastActivityTimestamp || Date.now()
    };
    saveData(config.localStorageKeys.persistentOnlineTime, dataToSave);
  }

  const updateLastActivityTimestamp = throttle(() => {
    const now = Date.now();
    if (now - persistentOnlineTimeData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
        persistentOnlineTimeData.value.lastActivityTimestamp = now;
    }
    lastActivityUpdateTimestamp = now;
  }, config.ACTIVITY_THROTTLE_MS);

  function tickPersistentOnlineTimer() {
    const now = Date.now();
    const data = persistentOnlineTimeData.value;
    if (now - data.lastActivityTimestamp > config.INACTIVITY_TIMEOUT_MS) {
      if (data.totalSeconds > 0) {
        console.log("Inactivity timeout reached while open. Resetting online timer.");
        data.totalSeconds = 0;
        data.lastActivityTimestamp = now; // Reset timestamp
        savePersistentOnlineTimeData(); // Save reset state
      }
    } else {
      data.totalSeconds++;
      // Optionally save periodically, e.g., every minute, instead of on unload only
      // if (data.totalSeconds % 60 === 0) {
      //    savePersistentOnlineTimeData();
      // }
    }
  }

  function handleBeforeUnload() {
     console.log("Beforeunload: Saving final online time state.");
     savePersistentOnlineTimeData(); // Save the latest count and timestamp
     saveData(config.localStorageKeys.pageUnloadTimestamp, Date.now());
  }

  function startOnlineTracking() {
      console.log("Starting online tracking...");
      loadPersistentOnlineTimeData();
      if (persistentOnlineTimerInterval) { clearInterval(persistentOnlineTimerInterval); }
      persistentOnlineTimerInterval = setInterval(tickPersistentOnlineTimer, 1000);
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      activityEvents.forEach(eventType => { document.addEventListener(eventType, updateLastActivityTimestamp, { passive: true }); });
      document.addEventListener('visibilitychange', updateLastActivityTimestamp);
      window.addEventListener('beforeunload', handleBeforeUnload);
      console.log("Activity listeners added.");
  }

  function stopOnlineTracking() {
      console.log("Stopping online tracking...");
      if (persistentOnlineTimerInterval) { clearInterval(persistentOnlineTimerInterval); persistentOnlineTimerInterval = null; }
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      activityEvents.forEach(eventType => { document.removeEventListener(eventType, updateLastActivityTimestamp); });
      document.removeEventListener('visibilitychange', updateLastActivityTimestamp);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log("Activity listeners removed.");
      handleBeforeUnload(); // Ensure final save
  }

  return {
    formattedOnlineTime,
    startOnlineTracking,
    stopOnlineTracking
  };
});