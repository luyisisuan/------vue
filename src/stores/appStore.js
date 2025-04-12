// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { loadData, saveData } from '@/utils/storage.js'; // 假设 storage 工具在此路径
import config from '@/config.js'; // 假设配置文件在此路径
import { throttle } from 'lodash-es'; // 假设已安装 lodash-es
// 导入 studyLogStore 用于记录日志
import { useStudyLogStore } from './studyLogStore'; // 确认 studyLogStore.js 在同级目录

// --- 辅助函数 ---
/**
 * 将总秒数格式化为 HH:MM:SS 字符串
 * @param {number} totalSeconds 总秒数
 * @returns {string} HH:MM:SS 格式的字符串
 */
function formatSecondsToHHMMSS(totalSeconds) {
  // 输入验证
  if (isNaN(totalSeconds) || totalSeconds < 0) {
    totalSeconds = 0;
  }

  // 计算小时、分钟、秒
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60); // 确保是整数秒

  // 格式化为两位数，不足补零
  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');

  // 返回格式化后的字符串
  return `${h}:${m}:${s}`;
}

/**
 * 获取当前时间的 ISO 8601 格式字符串
 * @returns {string} ISO 格式时间字符串
 */
function getNowISO() {
    return new Date().toISOString();
}

export const useAppStore = defineStore('app', () => {
  // --- State ---
  const persistentOnlineTimeData = ref({
      totalSeconds: 0,
      lastActivityTimestamp: Date.now(),
      sessionStartTime: getNowISO() // 添加 sessionStartTime
  });
  const formattedOnlineTime = computed(() => formatSecondsToHHMMSS(persistentOnlineTimeData.value.totalSeconds));
  let persistentOnlineTimerInterval = null;
  let lastActivityUpdateTimestamp = 0; // 用于节流的时间戳

  // --- Actions ---

  // 记录学习会话到 studyLogStore
  function recordStudySession(startTimeISO, endTimeISO, source = 'online_tracker') {
      // 在 action 内部获取 store 实例，避免循环依赖问题
      const studyLogStore = useStudyLogStore();
      if (!studyLogStore) {
          console.error("StudyLogStore not available to record session.");
          return;
      }
      const startTime = new Date(startTimeISO);
      const endTime = new Date(endTimeISO);
      // 确保时间有效
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
           console.warn("Invalid start or end time for recording study session.");
           return;
      }

      const durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

      // 设置一个最短记录时长，例如 60 秒
      const MIN_DURATION_TO_LOG = 60;
      if (durationSeconds >= MIN_DURATION_TO_LOG) {
          // 调用 studyLogStore 的 addLog action
          studyLogStore.addLog({
              startTime: startTimeISO,
              endTime: endTimeISO,
              durationSeconds: durationSeconds,
              activity: '在线活跃', // 或其他默认描述
              source: source
          }).then(success => { // 可选：处理 addLog 的返回结果
              if (success) {
                  console.log(`Recorded study session from ${source}: ${durationSeconds}s`);
              } else {
                  console.warn(`Failed to record study session from ${source} via studyLogStore.`);
              }
          });
      } else {
          console.log(`Session too short to record from ${source}: ${durationSeconds}s`);
      }
  }

  // 加载或初始化持久化在线时间数据
  function loadPersistentOnlineTimeData() {
      const now = Date.now();
      // 1. 加载上次卸载时间戳
      const unloadTimestamp = loadData(config.localStorageKeys.pageUnloadTimestamp, null);
      if (unloadTimestamp !== null) {
          localStorage.removeItem(config.localStorageKeys.pageUnloadTimestamp); // 立即移除
      }

      // 2. 加载核心在线时间数据，提供默认值
      const defaultData = {
          totalSeconds: 0,
          lastActivityTimestamp: now,
          sessionStartTime: getNowISO()
      };
      const loadedData = loadData(config.localStorageKeys.persistentOnlineTime, defaultData);

      // 合并加载的数据和默认值，确保所有字段存在
      const data = { ...defaultData, ...loadedData };
       // 确保 sessionStartTime 有效
      if (!data.sessionStartTime) {
           data.sessionStartTime = getNowISO();
      }


      // 3. 判断是否是短暂关闭
      let isShortClosure = false;
      if (unloadTimestamp !== null) {
          const closureDuration = now - unloadTimestamp;
          if (closureDuration >= 0 && closureDuration < config.SHORT_CLOSURE_THRESHOLD_MS) {
              isShortClosure = true;
              console.log(`Short closure detected (${Math.round(closureDuration/1000)}s). Resuming timer.`);
              // 短暂关闭恢复，保持 sessionStartTime
          } else if (closureDuration >= config.SHORT_CLOSURE_THRESHOLD_MS) {
               console.log(`Long closure detected (${Math.round(closureDuration/1000)}s).`);
                // 长时间关闭，记录之前的 session (如果时长足够且有 unload 时间)
                if (data.totalSeconds > 0 && data.sessionStartTime) {
                    recordStudySession(data.sessionStartTime, new Date(unloadTimestamp).toISOString(), 'long_closure_end');
                }
                data.totalSeconds = 0; // 重置秒数
                data.sessionStartTime = getNowISO(); // 设置新的 session 开始时间
                data.lastActivityTimestamp = now; // 重置活动时间
          } else {
              // closureDuration < 0 (时钟回拨？) 或 unloadTimestamp 无效，当作新 session 处理
              console.warn("Invalid closure duration or unload timestamp. Treating as new session.");
              data.totalSeconds = 0;
              data.sessionStartTime = getNowISO();
              data.lastActivityTimestamp = now;
          }
      }

      // 4. 检查非活动超时 (仅在非短暂关闭情况下)
      if (!isShortClosure && (now - data.lastActivityTimestamp > config.INACTIVITY_TIMEOUT_MS)) {
          console.log("User inactive on load or first load, resetting online time.");
           // 非活动超时，记录之前的 session (如果时长足够且 sessionStartTime 有效)
           if (data.totalSeconds > 0 && data.sessionStartTime) {
               recordStudySession(data.sessionStartTime, new Date(data.lastActivityTimestamp).toISOString(), 'inactivity_timeout_load');
           }
          data.totalSeconds = 0;
          data.lastActivityTimestamp = now;
          data.sessionStartTime = getNowISO(); // 新的 session 开始
      } else if (!isShortClosure) {
          // 如果不是短暂关闭，且用户是活跃的，也更新活动时间戳
          data.lastActivityTimestamp = now;
      }
      // 如果是短暂关闭，不修改 lastActivityTimestamp，让 tick 函数来处理

      persistentOnlineTimeData.value = data; // 更新 store state
      savePersistentOnlineTimeData(); // 保存更新后的状态

      // 返回加载/处理后的数据 (虽然 store 内部已更新，外部可能不需要)
      return data;
  }

  // 保存当前状态到 localStorage
  function savePersistentOnlineTimeData() {
    // 只保存必要的字段，并确保类型正确
    const dataToSave = {
        totalSeconds: Math.floor(persistentOnlineTimeData.value.totalSeconds || 0),
        lastActivityTimestamp: persistentOnlineTimeData.value.lastActivityTimestamp || Date.now(),
        sessionStartTime: persistentOnlineTimeData.value.sessionStartTime || getNowISO()
    };
    saveData(config.localStorageKeys.persistentOnlineTime, dataToSave);
  }

  // 更新最后活动时间戳 (节流)
  const updateLastActivityTimestamp = throttle(() => {
    const now = Date.now();
    // 只在用户未超时的情况下更新时间戳
    if (now - persistentOnlineTimeData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
        persistentOnlineTimeData.value.lastActivityTimestamp = now;
        // 仅更新内存中的时间戳，保存操作由 tick 或 unload 触发
        // savePersistentOnlineTimeData(); // 不建议在这里频繁保存
    } else {
         // 如果已超时，不更新活动时间戳，让 tick 函数处理超时逻辑
         // console.log("Activity detected, but user already timed out.");
    }
    lastActivityUpdateTimestamp = now; // 更新节流辅助时间戳
  }, config.ACTIVITY_THROTTLE_MS); // 使用 config 中的节流时间

  // 定时器滴答函数
  function tickPersistentOnlineTimer() {
    const now = Date.now();
    const data = persistentOnlineTimeData.value;

    if (now - data.lastActivityTimestamp > config.INACTIVITY_TIMEOUT_MS) {
      // 超时检查
      if (data.totalSeconds > 0) { // 只有在之前有计时的情况下才记录和重置
        console.log("Inactivity timeout reached while open, resetting online time.");
        // 非活动超时，记录之前的 session
        if (data.sessionStartTime) {
            recordStudySession(data.sessionStartTime, new Date(data.lastActivityTimestamp).toISOString(), 'inactivity_timeout_open');
        }
        data.totalSeconds = 0;
        data.sessionStartTime = getNowISO(); // 新 session 开始
        data.lastActivityTimestamp = now; // 重置活动时间为当前，防止立即再次超时
        savePersistentOnlineTimeData(); // 保存重置后的状态
      }
       // 如果 totalSeconds 已经是 0，则无需操作
    } else {
      // 未超时，增加秒数
      data.totalSeconds++;
      // 在 tick 中不保存，依赖 unload 或超时保存，减少写 localStorage 次数
      // savePersistentOnlineTimeData();
    }
    // UI 会通过 computed property formattedOnlineTime 自动更新
  }

  // 页面卸载前处理
  function handleBeforeUnload() {
     console.log("Beforeunload triggered.");
     // 记录当前 session (如果时长足够且 sessionStartTime 有效)
     if (persistentOnlineTimeData.value.totalSeconds > 0 && persistentOnlineTimeData.value.sessionStartTime) {
         // 确保结束时间是当前时间
         recordStudySession(persistentOnlineTimeData.value.sessionStartTime, getNowISO(), 'page_unload');
     }
     // 保存最后的活动时间戳、总秒数和 sessionStartTime
     savePersistentOnlineTimeData();
     // 保存卸载时间戳
     saveData(config.localStorageKeys.pageUnloadTimestamp, Date.now());
     console.log("Beforeunload: Saved final online time state.");
  }

  // --- 暴露给 App.vue 使用的 Action ---
  function startOnlineTracking() {
      console.log("Starting online tracking...");
      loadPersistentOnlineTimeData(); // 加载并可能重置/记录
      // 确保清除旧的定时器（如果存在）
      if (persistentOnlineTimerInterval) {
          clearInterval(persistentOnlineTimerInterval);
      }
      persistentOnlineTimerInterval = setInterval(tickPersistentOnlineTimer, 1000);

      // 添加事件监听器
       const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
       activityEvents.forEach(eventType => {
           document.addEventListener(eventType, updateLastActivityTimestamp, { passive: true });
       });
       document.addEventListener('visibilitychange', updateLastActivityTimestamp);
       window.addEventListener('beforeunload', handleBeforeUnload);
       console.log("Activity listeners added.");
  }

  function stopOnlineTracking() {
      console.log("Stopping online tracking...");
      if (persistentOnlineTimerInterval) {
          clearInterval(persistentOnlineTimerInterval);
          persistentOnlineTimerInterval = null;
      }
       // 移除事件监听器
       const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
       activityEvents.forEach(eventType => {
           document.removeEventListener(eventType, updateLastActivityTimestamp);
       });
       document.removeEventListener('visibilitychange', updateLastActivityTimestamp);
       window.removeEventListener('beforeunload', handleBeforeUnload);
       console.log("Activity listeners removed.");

       // 确保最终状态被保存并记录 session
       handleBeforeUnload();
  }

  // --- Expose ---
  return {
    // State/Getters for UI
    formattedOnlineTime,
    // Actions for App.vue lifecycle
    startOnlineTracking,
    stopOnlineTracking
    // 不需要暴露内部状态或方法，除非调试需要
  };
});