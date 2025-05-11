// src/stores/pomodoroStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient.js';
import { format } from 'date-fns';
import config from '@/config.js'; // 用于获取默认设置和常量
import { useStudyLogStore } from './studyLogStore'; // 用于记录学习日志

function getTodayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  // --- State ---
  const defaultWork = config?.pomodoroDefaults?.workDuration || 25;
  const defaultShort = config?.pomodoroDefaults?.shortBreakDuration || 5;
  const defaultLong = config?.pomodoroDefaults?.longBreakDuration || 15;

  const workDuration = ref(defaultWork);
  const shortBreakDuration = ref(defaultShort);
  const longBreakDuration = ref(defaultLong);

  const settingsLoading = ref(false);
  const settingsError = ref(null);

  const currentMode = ref('work');
  const isTimerRunning = ref(false);
  const timerSecondsRemaining = ref(workDuration.value * 60);
  const timerIntervalId = ref(null);
  const workCyclesCompleted = ref(0);

  const currentSessionStartTime = ref(null);
  const currentSessionActivity = ref('');

  // 从 pomodoroStore 角度看，这两个是记录 studyLog 的状态
  const isLoggingToStudyLog = ref(false); // 新增：标记是否正在调用 studyLogStore.addLog
  const studyLoggingError = ref(null); // 新增：存储调用 studyLogStore.addLog 相关的错误

  const pomodorosToday = ref(0);
  const lastPomodoroDate = ref('');

  // --- Getters ---
  const timerTotalSeconds = computed(() => {
      let durationMinutes;
      switch (currentMode.value) {
          case 'shortBreak': durationMinutes = shortBreakDuration.value; break;
          case 'longBreak': durationMinutes = longBreakDuration.value; break;
          default: durationMinutes = workDuration.value; break;
      }
      const validMinutes = Number.isFinite(durationMinutes) && durationMinutes >= 1
                           ? durationMinutes
                           : (currentMode.value === 'shortBreak' ? defaultShort : (currentMode.value === 'longBreak' ? defaultLong : defaultWork));
      return validMinutes * 60;
  });

  const formattedTime = computed(() => {
      const seconds = Math.max(0, Number.isFinite(timerSecondsRemaining.value) ? timerSecondsRemaining.value : timerTotalSeconds.value);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });

  const modeText = computed(() => {
      const modeMap = { work: '工作', shortBreak: '短休', longBreak: '长休' };
      return modeMap[currentMode.value] || '工作';
  });

  // --- Actions: 内部定时器逻辑 ---
  function tick() {
    if (!isTimerRunning.value) return;
    timerSecondsRemaining.value--;
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    if (timerSecondsRemaining.value < 0) {
        handleTimerEndInternal();
    }
  }

  async function handleTimerEndInternal() {
    if (timerIntervalId.value) {
        clearInterval(timerIntervalId.value);
        timerIntervalId.value = null;
    }
    isTimerRunning.value = false;
    timerSecondsRemaining.value = 0;

    const previousMode = currentMode.value;
    let nextMode = 'work';

    if (previousMode === 'work') {
         if (currentSessionStartTime.value) {
             const endTime = new Date();
             const startTime = new Date(currentSessionStartTime.value);
             const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

             if (duration >= 60) {
                 incrementPomodorosToday();
                 console.log('[PomodoroStore] Attempting to log study session...');
                 const logSuccess = await addStudyLogInternal({
                     startTime: startTime.toISOString(),
                     endTime: endTime.toISOString(),
                     durationSeconds: duration,
                     activity: currentSessionActivity.value.trim() || '专注学习',
                     source: 'pomodoro'
                 });
                 if (logSuccess) {
                    console.log('[PomodoroStore] Study session successfully logged via studyLogStore.');
                 } else {
                    console.warn('[PomodoroStore] Failed to log study session. Error:', studyLoggingError.value);
                    // UI 可以观察 studyLoggingError 来显示提示
                 }
             } else {
                 console.log(`[PomodoroStore] Work session duration (${duration}s) too short, not logged or counted.`);
             }
         }
         currentSessionStartTime.value = null; // 重置，即使未记录
         currentSessionActivity.value = ''; // 清空活动输入
         workCyclesCompleted.value++;
         const longBreakInterval = config?.pomodoroDefaults?.longBreakInterval || 4;
         nextMode = (workCyclesCompleted.value % longBreakInterval === 0) ? 'longBreak' : 'shortBreak';
    } else {
         nextMode = 'work';
         if (previousMode === 'longBreak') {
             workCyclesCompleted.value = 0;
         }
    }
    switchModeInternal(nextMode);
  }

  function switchModeInternal(newMode) {
    currentMode.value = newMode;
    timerSecondsRemaining.value = timerTotalSeconds.value;
    if (newMode === 'work') {
        currentSessionStartTime.value = new Date().toISOString();
    } else {
        currentSessionStartTime.value = null;
    }
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    console.log(`[PomodoroStore] Switched mode to: ${newMode}. Timer set to ${timerTotalSeconds.value} seconds.`);
  }

  function resetTimerInternal(silent = false) {
    if (timerIntervalId.value) clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
    isTimerRunning.value = false;
    currentMode.value = 'work';
    workCyclesCompleted.value = 0;
    timerSecondsRemaining.value = workDuration.value * 60;
    currentSessionStartTime.value = null;
    currentSessionActivity.value = ''; // 重置时清空活动
    studyLoggingError.value = null; // 清除可能存在的旧日志记录错误
    if (!silent) {
      console.log("[PomodoroStore] Timer reset.");
      document.title = "备考智能驾驶舱 | 段绪程";
    } else {
      document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    }
  }

  // --- Actions: 对组件公开的接口 ---
  async function loadSettings() {
    settingsLoading.value = true;
    settingsError.value = null;
    try {
      const response = await apiClient.get('/pomodoro/settings');
      const data = response.data;
      workDuration.value = data.workDuration || defaultWork;
      shortBreakDuration.value = data.shortBreakDuration || defaultShort;
      longBreakDuration.value = data.longBreakDuration || defaultLong;
      if (!isTimerRunning.value) {
          resetTimerInternal(true);
      }
      console.log('[PomodoroStore] Settings loaded.');
    } catch (err) {
      settingsError.value = '无法加载番茄钟设置。';
      console.error('[PomodoroStore] Error loading pomodoro settings:', err);
      workDuration.value = defaultWork;
      shortBreakDuration.value = defaultShort;
      longBreakDuration.value = defaultLong;
      if (!isTimerRunning.value) resetTimerInternal(true);
    } finally {
      settingsLoading.value = false;
    }
  }

  async function updateSettings(updates) {
    settingsLoading.value = true;
    settingsError.value = null;
    const validUpdates = {};
    if (Number.isFinite(updates.workDuration) && updates.workDuration >= 1) validUpdates.workDuration = updates.workDuration;
    if (Number.isFinite(updates.shortBreakDuration) && updates.shortBreakDuration >= 1) validUpdates.shortBreakDuration = updates.shortBreakDuration;
    if (Number.isFinite(updates.longBreakDuration) && updates.longBreakDuration >= 1) validUpdates.longBreakDuration = updates.longBreakDuration;

    if (Object.keys(validUpdates).length === 0) {
      console.warn("[PomodoroStore] No valid settings provided for update.");
      settingsLoading.value = false;
      settingsError.value = "提供的设置无效。"; // 给用户一些反馈
      return false;
    }

    try {
      const response = await apiClient.patch('/pomodoro/settings', validUpdates);
      const data = response.data;
      workDuration.value = data.workDuration;
      shortBreakDuration.value = data.shortBreakDuration;
      longBreakDuration.value = data.longBreakDuration;
      if (!isTimerRunning.value) {
        resetTimerInternal(true);
      }
      console.log('[PomodoroStore] Settings updated.');
      return true;
    } catch (err) {
      const backendError = err.response?.data?.message || err.message || '未知错误';
      settingsError.value = `更新设置失败: ${backendError}`;
      console.error('[PomodoroStore] Error updating pomodoro settings:', err);
      return false;
    } finally {
      settingsLoading.value = false;
    }
  }

  async function addStudyLogInternal(logData) {
    const studyLogStore = useStudyLogStore(); // 获取实例
    if (!studyLogStore) {
        console.error("[PomodoroStore] Cannot get studyLogStore instance.");
        studyLoggingError.value = '无法访问学习日志模块。'; // 使用 studyLoggingError
        return false;
    }
    isLoggingToStudyLog.value = true; // 标记开始记录
    studyLoggingError.value = null; // 清除旧错误
    try {
      const success = await studyLogStore.addLog(logData);
      // addLog 内部会设置 studyLogStore.logError，我们这里只关心成功与否
      // 如果需要更具体的错误，可以从 studyLogStore.logError 获取，但 addLog 的返回值已足够
      if (!success) {
        studyLoggingError.value = studyLogStore.logError || '学习日志记录未成功。';
      }
      return success;
    } catch (err) {
      // 这个 catch 主要捕获 studyLogStore.addLog() 本身抛出的意外错误
      console.error('[PomodoroStore] Unexpected error calling studyLogStore.addLog:', err);
      studyLoggingError.value = '记录日志时发生意外错误。';
      return false;
    } finally {
      isLoggingToStudyLog.value = false; // 标记结束记录
    }
  }

  function checkAndResetPomodoroCount() {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('dxcGwyLastPomodoroDate');
    if (storedDate !== today) {
      pomodorosToday.value = 0;
      lastPomodoroDate.value = today;
      localStorage.setItem('dxcGwyLastPomodoroDate', today);
      localStorage.setItem('dxcGwyPomodorosToday', '0');
      console.log("[PomodoroStore] New day detected, pomodoro count reset.");
    } else {
      pomodorosToday.value = parseInt(localStorage.getItem('dxcGwyPomodorosToday') || '0', 10);
      lastPomodoroDate.value = today;
    }
  }

  function incrementPomodorosToday() {
    checkAndResetPomodoroCount(); // 确保日期是最新的
    pomodorosToday.value++;
    localStorage.setItem('dxcGwyPomodorosToday', pomodorosToday.value.toString());
    console.log(`[PomodoroStore] Pomodoros completed today: ${pomodorosToday.value}`);
  }

  function startTimer() {
    if (isTimerRunning.value) return;
    if (timerSecondsRemaining.value <= 0) {
      timerSecondsRemaining.value = timerTotalSeconds.value;
    }
    if (currentMode.value === 'work' && !currentSessionStartTime.value) {
      currentSessionStartTime.value = new Date().toISOString();
    }
    isTimerRunning.value = true;
    if (timerIntervalId.value) clearInterval(timerIntervalId.value);
    timerIntervalId.value = setInterval(tick, 1000);
    console.log(`[PomodoroStore] Timer started in ${currentMode.value} mode.`);
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
  }

  function pauseTimer() {
    if (!isTimerRunning.value) return;
    if (timerIntervalId.value) clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
    isTimerRunning.value = false;
    console.log("[PomodoroStore] Timer paused.");
    document.title = `暂停 | ${modeText.value} | ${formattedTime.value} - 备考舱`;
  }

  function resetTimer() {
    resetTimerInternal(false);
  }

  function updateCurrentActivity(activity) {
    currentSessionActivity.value = activity;
  }

  function cleanupTimer() { // 通常在组件 onUnmounted 时调用
    if (timerIntervalId.value) {
      clearInterval(timerIntervalId.value);
      timerIntervalId.value = null;
      console.log("[PomodoroStore] Timer interval cleaned up.");
    }
    // 根据需求，可以在这里保存当前状态，例如如果计时器正在运行且是工作模式
  }
  
  // --- Initialization Action ---
  async function initializeStore() {
    console.log('[PomodoroStore] Initializing...');
    await loadSettings();
    checkAndResetPomodoroCount();
    console.log('[PomodoroStore] Initialization complete.');
  }

  // --- Expose ---
  return {
    workDuration, shortBreakDuration, longBreakDuration,
    settingsLoading, settingsError,
    currentMode, isTimerRunning, timerSecondsRemaining,
    currentSessionActivity,
    isLoggingToStudyLog, // 暴露给UI，例如显示“记录中...”
    studyLoggingError, // 暴露给UI，显示记录日志时的错误
    pomodorosToday,

    timerTotalSeconds, formattedTime, modeText,

    loadSettings,
    updateSettings,
    startTimer, pauseTimer, resetTimer,
    updateCurrentActivity,
    cleanupTimer,
    initializeStore // 暴露初始化方法
  };
});