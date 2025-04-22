// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { loadData, saveData } from '@/utils/storage.js';
import config from '@/config.js';
import { throttle } from 'lodash-es';


 // 定期发送活跃心跳到后端
 async function sendActivityPing() {
    // --- 新增日志 ---
    console.log('[AppStore] sendActivityPing function CALLED by setInterval.'); // 1. 确认函数被调用

    const now = Date.now();
    const lastActivity = persistentActivityData.value.lastActivityTimestamp;
    const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
    const threshold = pingIntervalSeconds * 1000 + 5000;

    // --- 新增日志 ---
    console.log(`[AppStore] Ping check: now=${now} (${new Date(now).toLocaleTimeString()}), lastActivity=${lastActivity} (${new Date(lastActivity).toLocaleTimeString()}), threshold=${threshold}ms`);
    console.log(`[AppStore] Ping check: now - lastActivity = ${now - lastActivity}ms`);

    // 只有当用户在最近的心跳间隔内(+5秒缓冲)是活跃的，才发送 ping
    if (now - lastActivity <= threshold) {
        // --- 确认进入 if 分支 ---
        console.log('[AppStore] Ping check PASSED. Entering active branch...');
        console.log(`[AppStore] User active, sending ping for the last ${pingIntervalSeconds} seconds.`);
        try {
            await axios.post(API_PING_URL, { durationSeconds: pingIntervalSeconds });
            console.log('[AppStore] Ping request sent successfully (axios promise resolved).'); // 确认发送成功
        } catch (err) {
            console.error("[AppStore] Error sending activity ping:", err);
        }
    } else {
        // --- 确认进入 else 分支 ---
        console.log('[AppStore] Ping check FAILED. Entering inactive branch...');
        console.log("[AppStore] User inactive based on timestamp check, skipping activity ping.");
    }
    // --- 新增日志 ---
    console.log('[AppStore] sendActivityPing function FINISHED.'); // 确认函数执行完毕
}
// 后端活动心跳 API 端点
const API_PING_URL = 'http://localhost:8080/api/activity/ping';

export const useAppStore = defineStore('app', () => {
  // --- State ---
  const persistentActivityData = ref({
      lastActivityTimestamp: Date.now() // 只追踪最后活动时间戳
  });

  let activityPingIntervalId = null; // 用于存储 ping 定时器的 ID
  // let lastActivityUpdateTimestamp = 0; // 这个时间戳似乎不影响核心逻辑，保留或移除均可

  // --- Actions ---

  /**
   * 加载持久化的最后活动时间戳。
   * 新增检查：如果加载的时间戳过于陈旧，则使用当前时间。
   */
  function loadLastActivityTimestamp() {
      const now = Date.now();
      const defaultData = { lastActivityTimestamp: now };
      const loadedData = loadData(config.localStorageKeys.persistentOnlineTime, defaultData);

      let initialTimestamp = loadedData.lastActivityTimestamp || now; // 获取可能存在的时间戳

      // 检查：如果加载的时间戳存在且比设置的非活跃超时时间还旧，则视为无效，使用当前时间
      // 这可以防止因浏览器存储中残留非常旧的时间戳导致启动后长时间无法更新的问题
      const maxAge = config.INACTIVITY_TIMEOUT_MS; // 使用非活跃超时作为最大允许年龄
      // 添加 initialTimestamp !== now 的判断是为了避免 localStorage 为空时也触发警告
      if (initialTimestamp !== now && (now - initialTimestamp > maxAge)) {
          console.warn(`[AppStore] Loaded timestamp ${new Date(initialTimestamp)} is older than ${maxAge / 60000} minutes. Resetting to current time.`);
          initialTimestamp = now; // 重置为当前时间
      }

      persistentActivityData.value = { // 设置最终确定的初始时间戳
          lastActivityTimestamp: initialTimestamp
      };
      console.log("[AppStore] Loaded last activity timestamp:", new Date(persistentActivityData.value.lastActivityTimestamp));
  }

  // 保存最后活动时间戳到 localStorage
  function saveLastActivityTimestamp() {
    const dataToSave = {
        // 确保总是保存一个有效的时间戳
        lastActivityTimestamp: persistentActivityData.value.lastActivityTimestamp || Date.now()
    };
    saveData(config.localStorageKeys.persistentOnlineTime, dataToSave);
  }

  // 定期发送活跃心跳到后端
  async function sendActivityPing() {
      const now = Date.now();
      const lastActivity = persistentActivityData.value.lastActivityTimestamp;
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;

      // 只有当用户在最近的心跳间隔内(+5秒缓冲)是活跃的，才发送 ping
      if (now - lastActivity <= pingIntervalSeconds * 1000 + 5000) {
          console.log(`[AppStore] User active, sending ping for the last ${pingIntervalSeconds} seconds.`);
          try {
              await axios.post(API_PING_URL, { durationSeconds: pingIntervalSeconds });
              // ping 成功
          } catch (err) {
              console.error("[AppStore] Error sending activity ping:", err);
              // 可以考虑添加一些错误处理逻辑，例如几次失败后停止 ping
          }
      } else {
          // 注意：这条日志出现，说明 lastActivityTimestamp 没有被活动事件更新
          console.log("[AppStore] User inactive based on timestamp check, skipping activity ping.");
      }
  }

  // 更新最后活动时间戳 (节流)
  const updateLastActivityTimestamp = throttle(() => {
    const now = Date.now();
    // 如果距离上次记录的活动时间在非活跃超时阈值内，则更新时间戳
    if (now - persistentActivityData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
        persistentActivityData.value.lastActivityTimestamp = now;
        saveLastActivityTimestamp(); // 保存最新的活动时间戳
    } else {
       // 如果超过了阈值，说明用户已经长时间不活跃，不需要再频繁更新了
       // 但可以考虑在这里也更新一次，以便下次判断时起点更新？取决于产品逻辑
       // 例如：即使长时间不活跃后回来，第一次活动也应该更新时间戳
       // persistentActivityData.value.lastActivityTimestamp = now;
       // saveLastActivityTimestamp();
       // console.log('[AppStore] User became active after long inactivity, updating timestamp.');
    }
    // lastActivityUpdateTimestamp = now; // 更新内部时间戳，如果需要
  }, config.ACTIVITY_THROTTLE_MS); // 使用 config 中的节流时间

  // 页面卸载前处理 - 只保存最后活动时间
  function handleBeforeUnload() {
     console.log("[AppStore] Beforeunload: Saving final activity timestamp.");
     saveLastActivityTimestamp();
  }

  // --- 暴露给 App.vue 使用的 Action ---
  function startOnlineTracking() {
      console.log("[AppStore] Starting activity tracking...");
      loadLastActivityTimestamp(); // 加载上次活动时间 (包含陈旧检查)

      // 确保旧的 ping 定时器已清除
      if (activityPingIntervalId) {
        clearInterval(activityPingIntervalId);
        activityPingIntervalId = null;
      }
      // 启动定期 ping 的定时器
      const pingIntervalSeconds = config.ACTIVITY_PING_INTERVAL_SECONDS || 30;
      activityPingIntervalId = setInterval(sendActivityPing, pingIntervalSeconds * 1000);
      console.log(`[AppStore] Activity ping interval set to ${pingIntervalSeconds} seconds.`);

      // 添加活动监听器
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
      // 清除 ping 定时器
      if (activityPingIntervalId) {
        clearInterval(activityPingIntervalId);
        activityPingIntervalId = null;
      }
      // 移除活动监听器
      const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
      activityEvents.forEach(eventType => {
        document.removeEventListener(eventType, updateLastActivityTimestamp);
      });
      document.removeEventListener('visibilitychange', updateLastActivityTimestamp);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      console.log("[AppStore] Activity listeners removed.");
      handleBeforeUnload(); // 确保在停止时也保存最后状态
  }

  // --- Expose ---
  return {
    startOnlineTracking,
    stopOnlineTracking
  };
});