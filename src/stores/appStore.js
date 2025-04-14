// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue'; // computed 可能不再需要
import axios from 'axios'; // 导入 axios
import { loadData, saveData } from '@/utils/storage.js';
import config from '@/config.js';
import { throttle } from 'lodash-es';

// **NEW:** API endpoint for activity ping
const API_PING_URL = 'http://localhost:8080/api/activity/ping';

// **REMOVED:** formatSecondsToHHMMSS is no longer needed here
// function formatSecondsToHHMMSS(totalSeconds) { ... }
// **REMOVED:** getNowISO is no longer needed here for sessionStart
// function getNowISO() { ... }

export const useAppStore = defineStore('app', () => {
  // --- State ---
  // **MODIFIED:** persistentOnlineTimeData no longer stores totalSeconds or sessionStart
  const persistentActivityData = ref({
      lastActivityTimestamp: Date.now() // Only track last activity
  });
  // **REMOVED:** formattedOnlineTime computed property
  // const formattedOnlineTime = computed(() => formatSecondsToHHMMSS(...));

  let activityPingIntervalId = null; // Interval for sending pings
  let lastActivityUpdateTimestamp = 0;

  // --- Actions ---

  // 加载持久化的最后活动时间戳
  function loadLastActivityTimestamp() {
      const now = Date.now();
      // **MODIFIED:** Only load lastActivityTimestamp
      const defaultData = { lastActivityTimestamp: now };
      const loadedData = loadData(config.localStorageKeys.persistentOnlineTime, defaultData); // Still use old key for now
      // Ensure loaded timestamp is valid
      persistentActivityData.value = {
          lastActivityTimestamp: loadedData.lastActivityTimestamp || now
      };
      // No need to handle unloadTimestamp or sessionStart here for this logic
      console.log("Loaded last activity timestamp:", new Date(persistentActivityData.value.lastActivityTimestamp));
  }

  // 保存最后活动时间戳到 localStorage
  function saveLastActivityTimestamp() {
    // Only save the timestamp
    const dataToSave = {
        lastActivityTimestamp: persistentActivityData.value.lastActivityTimestamp || Date.now()
    };
    saveData(config.localStorageKeys.persistentOnlineTime, dataToSave); // Use old key or create a new one
  }


  // 定期发送活跃心跳到后端
  async function sendActivityPing() {
      const now = Date.now();
      const lastActivity = persistentActivityData.value.lastActivityTimestamp;
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30; // 从 config 获取间隔，默认 30 秒

      // 只有当用户在最近的心跳间隔内是活跃的，才发送 ping
      if (now - lastActivity <= pingIntervalSeconds * 1000 + 5000) { // 加一点缓冲时间
          console.log(`User active, sending ping for the last ${pingIntervalSeconds} seconds.`);
          try {
              await axios.post(API_PING_URL, { durationSeconds: pingIntervalSeconds });
              // ping 成功，无需特殊处理
          } catch (err) {
              console.error("Error sending activity ping:", err);
              // 可以考虑添加一些错误处理逻辑，例如几次失败后停止 ping
          }
      } else {
          console.log("User inactive, skipping activity ping.");
      }
  }


  // 更新最后活动时间戳 (节流) - 保持不变
  const updateLastActivityTimestamp = throttle(() => {
    const now = Date.now();
    if (now - persistentActivityData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
        persistentActivityData.value.lastActivityTimestamp = now;
        // 保存最新的活动时间戳（可选，但有助于重启后判断）
        saveLastActivityTimestamp();
    }
    lastActivityUpdateTimestamp = now;
  }, config.ACTIVITY_THROTTLE_MS);


  // **REMOVED:** tickPersistentOnlineTimer (不再前端累加)

  // 页面卸载前处理 - 只保存最后活动时间
  function handleBeforeUnload() {
     console.log("Beforeunload: Saving final activity timestamp.");
     saveLastActivityTimestamp();
     // 不再需要 pageUnloadTimestamp 来计算关闭时长
     // saveData(config.localStorageKeys.pageUnloadTimestamp, Date.now());
  }

  // --- 暴露给 App.vue 使用的 Action ---
  function startOnlineTracking() {
      console.log("Starting activity tracking...");
      loadLastActivityTimestamp(); // 加载上次活动时间

      // 确保旧的 ping 定时器已清除
      if (activityPingIntervalId) { clearInterval(activityPingIntervalId); }
      // 启动定期 ping 的定时器
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
      activityPingIntervalId = setInterval(sendActivityPing, pingIntervalSeconds * 1000);
      console.log(`Activity ping interval set to ${pingIntervalSeconds} seconds.`);

      // 添加活动监听器 (保持不变)
       const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
       activityEvents.forEach(eventType => { document.addEventListener(eventType, updateLastActivityTimestamp, { passive: true }); });
       document.addEventListener('visibilitychange', updateLastActivityTimestamp);
       window.addEventListener('beforeunload', handleBeforeUnload);
       console.log("Activity listeners added.");
  }

  function stopOnlineTracking() {
      console.log("Stopping activity tracking...");
      // 清除 ping 定时器
      if (activityPingIntervalId) { clearInterval(activityPingIntervalId); activityPingIntervalId = null; }
       // 移除活动监听器 (保持不变)
       const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
       activityEvents.forEach(eventType => { document.removeEventListener(eventType, updateLastActivityTimestamp); });
       document.removeEventListener('visibilitychange', updateLastActivityTimestamp);
       window.removeEventListener('beforeunload', handleBeforeUnload);
       console.log("Activity listeners removed.");
       handleBeforeUnload(); // 确保保存最后状态
  }

  // --- Expose ---
  return {
    // **REMOVED:** formattedOnlineTime
    // 只暴露启动和停止方法
    startOnlineTracking,
    stopOnlineTracking
  };
});

// **需要更新 config.js 添加 PING_INTERVAL**
// // src/config.js
// export default {
//   // ... 其他配置 ...
//   ACTIVITY_PING_INTERVAL_SECONDS: 30, // 每 30 秒发送一次心跳
//   // ...
// };