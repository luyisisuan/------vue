// src/stores/pomodoroStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient.js';
import { format } from 'date-fns';
import config from '@/config.js';
import { useStudyLogStore } from './studyLogStore';

function getTodayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  // --- State ---
  const defaultWork = config?.pomodoroDefaults?.workDuration || 25;
  const defaultShort = config?.pomodoroDefaults?.shortBreakDuration || 5;
  const defaultLong = config?.pomodoroDefaults?.longBreakDuration || 15;
  const defaultPomodorosPerCycle = config?.pomodoroDefaults?.pomodorosPerCycle || 4; // 新增：默认长休间隔

  const workDuration = ref(defaultWork);
  const shortBreakDuration = ref(defaultShort);
  const longBreakDuration = ref(defaultLong);
  const pomodorosPerCycle = ref(defaultPomodorosPerCycle); // 新增：长休间隔

  const settingsLoading = ref(false);
  const settingsError = ref(null); // 用于加载/更新设置时的错误

  const currentMode = ref('work'); // 'work', 'shortBreak', 'longBreak'
  const isTimerRunning = ref(false);
  const timerSecondsRemaining = ref(workDuration.value * 60);
  const timerIntervalId = ref(null);

  // currentCycle tracks the number of work sessions completed within the current long break cycle
  const currentCycle = ref(1); // 新增：当前专注轮次 (从1开始)
  // workCyclesCompleted tracks total work sessions for deciding long break,
  // but currentCycle is more direct for display "X/Y轮专注"
  // We can simplify and just use currentCycle if it resets after long break.
  // Let's rename workCyclesCompleted to completedWorkSessionsInCycle for clarity if needed, or manage currentCycle directly.
  // For simplicity, `currentCycle` will directly represent the current pomodoro in the cycle.

  const currentSessionStartTime = ref(null);
  const currentSessionActivity = ref('');

  const isLoggingToStudyLog = ref(false);
  const studyLoggingError = ref(null);

  const pomodorosToday = ref(0); // Tracks total completed work pomodoros for the day
  const lastPomodoroDate = ref('');

  // 新增状态，用于 "花样"
  const isSessionCompleted = ref(false); // 标记一个会话（工作或休息）是否刚刚自然结束
  const lastCompletedMode = ref(null); // 记录上一个完成的会话类型 ('work', 'shortBreak', 'longBreak')


  // --- Getters ---
  const timerTotalSeconds = computed(() => {
      let durationMinutes;
      switch (currentMode.value) {
          case 'shortBreak': durationMinutes = shortBreakDuration.value; break;
          case 'longBreak': durationMinutes = longBreakDuration.value; break;
          default: durationMinutes = workDuration.value; break;
      }
      // 确保 durationMinutes 是一个有效的数字
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

  const modeText = computed(() => { // 这个 getter 仍然有用，比如用于 document.title
      const modeMap = { work: '工作', shortBreak: '短休', longBreak: '长休' };
      return modeMap[currentMode.value] || '工作';
  });

  // --- Actions: 内部定时器逻辑 ---
  function tick() {
    if (!isTimerRunning.value) return;
    timerSecondsRemaining.value--;
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    if (timerSecondsRemaining.value < 0) { // 小于0，而不是等于0，以处理可能的微小延迟
        handleTimerEndInternal();
    }
  }

  async function handleTimerEndInternal() {
    if (timerIntervalId.value) {
        clearInterval(timerIntervalId.value);
        timerIntervalId.value = null;
    }
    isTimerRunning.value = false;
    timerSecondsRemaining.value = 0; // 确保计时器停在00:00

    const previousMode = currentMode.value;
    lastCompletedMode.value = previousMode; // 记录完成的模式
    isSessionCompleted.value = true;        // 触发UI完成效果

    let nextMode = 'work'; // 默认下一个是工作模式

    if (previousMode === 'work') {
         if (currentSessionStartTime.value) { // 确保 startTime 有效
             const endTime = new Date();
             const startTime = new Date(currentSessionStartTime.value);
             const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

             // 只记录和计数有效的专注时段 (例如，至少持续1分钟)
             if (duration >= 60) {
                 incrementPomodorosToday(); // 增加今日专注次数
                 console.log('[PomodoroStore] Attempting to log study session...');
                 const logSuccess = await addStudyLogInternal({
                     startTime: startTime.toISOString(),
                     endTime: endTime.toISOString(),
                     durationSeconds: duration,
                     activity: currentSessionActivity.value.trim() || '专注学习', // 使用默认活动名
                     source: 'pomodoro'
                 });
                 if (logSuccess) {
                    console.log('[PomodoroStore] Study session successfully logged via studyLogStore.');
                 } else {
                    console.warn('[PomodoroStore] Failed to log study session. Error:', studyLoggingError.value);
                 }
             } else {
                 console.log(`[PomodoroStore] Work session duration (${duration}s) too short, not logged or counted.`);
             }
         }
         currentSessionStartTime.value = null; // 重置当前会话开始时间
         currentSessionActivity.value = '';    // 清空活动输入

         // 决定下一个模式：短休或长休
         if (currentCycle.value >= pomodorosPerCycle.value) {
             nextMode = 'longBreak';
             currentCycle.value = 0; // 在进入长休后，下一个工作周期将是新的开始 (将在 switchModeInternal 中增到1)
         } else {
             nextMode = 'shortBreak';
         }
    } else { // previousMode 是 shortBreak 或 longBreak
         nextMode = 'work';
         // 如果刚结束的是休息，下一个工作模式总是周期的开始或延续
         // currentCycle 会在 switchModeInternal 中为 'work' 模式递增
    }
    // 短暂延迟后切换模式，给 "印章" 动画留出时间
    // isSessionCompleted 仍然为 true，组件会处理动画
    // acknowledgeSessionCompletion 会在组件动画结束后调用
    setTimeout(() => {
        if (!isTimerRunning.value) { // 确保用户没有手动重置或开始新的计时
             switchModeInternal(nextMode);
        }
    }, 500); // 延迟一点点，让UI有时间反应 isSessionCompleted
  }

  function switchModeInternal(newMode) {
    // 如果当前 isSessionCompleted 为 true，意味着 handleTimerEndInternal 刚结束
    // 此时不应覆盖 isSessionCompleted，让组件有时间处理它
    // isSessionCompleted 会由 acknowledgeSessionCompletion 重置

    currentMode.value = newMode;
    if (newMode === 'work') {
        currentCycle.value++; // 递增当前专注轮次
        currentSessionStartTime.value = new Date().toISOString();
    } else {
        currentSessionStartTime.value = null; // 休息模式不记录开始时间
    }
    timerSecondsRemaining.value = timerTotalSeconds.value;
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    console.log(`[PomodoroStore] Switched mode to: ${newMode}. Current cycle: ${currentCycle.value}. Timer set to ${timerTotalSeconds.value} seconds.`);
  }

  function resetTimerInternal(silent = false) {
    if (timerIntervalId.value) clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
    isTimerRunning.value = false;

    currentMode.value = 'work';
    currentCycle.value = 1; // 重置轮次从1开始
    timerSecondsRemaining.value = workDuration.value * 60;
    currentSessionStartTime.value = null;
    currentSessionActivity.value = '';
    studyLoggingError.value = null;
    isSessionCompleted.value = false; // 重置完成状态
    lastCompletedMode.value = null;

    if (!silent) {
      console.log("[PomodoroStore] Timer reset.");
      document.title = "备考智能驾驶舱"; // 移除用户名的个性化
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
      pomodorosPerCycle.value = data.pomodorosPerCycle || defaultPomodorosPerCycle; // 加载长休间隔
      if (!isTimerRunning.value) { // 只有在计时器未运行时才因设置加载而重置
          resetTimerInternal(true); // 静默重置以应用新时长
      }
      console.log('[PomodoroStore] Settings loaded.');
    } catch (err) {
      settingsError.value = '无法加载番茄钟设置。将使用默认值。';
      console.error('[PomodoroStore] Error loading pomodoro settings:', err);
      // Fallback to defaults
      workDuration.value = defaultWork;
      shortBreakDuration.value = defaultShort;
      longBreakDuration.value = defaultLong;
      pomodorosPerCycle.value = defaultPomodorosPerCycle;
      if (!isTimerRunning.value) resetTimerInternal(true);
    } finally {
      settingsLoading.value = false;
    }
  }

  async function updateSettings(updates) {
    // settingsError.value = null; // 清除旧的错误信息
    settingsLoading.value = true; // 应该在API调用前设置为true

    const validUpdates = {};
    if (Number.isFinite(updates.workDuration) && updates.workDuration >= 1) validUpdates.workDuration = updates.workDuration;
    if (Number.isFinite(updates.shortBreakDuration) && updates.shortBreakDuration >= 1) validUpdates.shortBreakDuration = updates.shortBreakDuration;
    if (Number.isFinite(updates.longBreakDuration) && updates.longBreakDuration >= 1) validUpdates.longBreakDuration = updates.longBreakDuration;
    if (Number.isFinite(updates.pomodorosPerCycle) && updates.pomodorosPerCycle >= 1) validUpdates.pomodorosPerCycle = updates.pomodorosPerCycle; // 验证长休间隔

    if (Object.keys(validUpdates).length === 0) {
      console.warn("[PomodoroStore] No valid settings provided for update.");
      settingsError.value = "提供的设置参数无效。";
      settingsLoading.value = false;
      return false;
    }

    try {
      const response = await apiClient.patch('/pomodoro/settings', validUpdates);
      const data = response.data;
      // 更新 store 中的状态
      if(data.workDuration) workDuration.value = data.workDuration;
      if(data.shortBreakDuration) shortBreakDuration.value = data.shortBreakDuration;
      if(data.longBreakDuration) longBreakDuration.value = data.longBreakDuration;
      if(data.pomodorosPerCycle) pomodorosPerCycle.value = data.pomodorosPerCycle;

      // 如果计时器未运行，或者当前模式的时长被更改，则重置计时器以应用新时长
      if (!isTimerRunning.value ||
          (currentMode.value === 'work' && validUpdates.workDuration && validUpdates.workDuration !== workDuration.value) ||
          (currentMode.value === 'shortBreak' && validUpdates.shortBreakDuration && validUpdates.shortBreakDuration !== shortBreakDuration.value) ||
          (currentMode.value === 'longBreak' && validUpdates.longBreakDuration && validUpdates.longBreakDuration !== longBreakDuration.value)
         ) {
        resetTimerInternal(true); // 静默重置
      }
      console.log('[PomodoroStore] Settings updated.');
      settingsError.value = null; // 成功后清除错误
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
    const studyLogStore = useStudyLogStore();
    if (!studyLogStore) {
        console.error("[PomodoroStore] Cannot get studyLogStore instance.");
        studyLoggingError.value = '无法访问学习日志模块。';
        return false;
    }
    isLoggingToStudyLog.value = true;
    studyLoggingError.value = null;
    try {
      const success = await studyLogStore.addLog(logData);
      if (!success) {
        studyLoggingError.value = studyLogStore.logError || '学习日志记录未成功。';
      }
      return success;
    } catch (err) {
      console.error('[PomodoroStore] Unexpected error calling studyLogStore.addLog:', err);
      studyLoggingError.value = '记录日志时发生意外错误。';
      return false;
    } finally {
      isLoggingToStudyLog.value = false;
    }
  }

  function checkAndResetPomodoroCount() {
    const today = getTodayDateString();
    const storedDate = localStorage.getItem('dxcGwyLastPomodoroDate');
    if (storedDate !== today) {
      pomodorosToday.value = 0;
      lastPomodoroDate.value = today; // 更新内存中的日期
      localStorage.setItem('dxcGwyLastPomodoroDate', today);
      localStorage.setItem('dxcGwyPomodorosToday', '0');
      console.log("[PomodoroStore] New day detected, pomodoro count reset.");
    } else {
      // 如果日期相同，从 localStorage 加载计数值
      pomodorosToday.value = parseInt(localStorage.getItem('dxcGwyPomodorosToday') || '0', 10);
      lastPomodoroDate.value = today; // 确保内存中的日期也是最新的
    }
  }

  function incrementPomodorosToday() {
    checkAndResetPomodoroCount(); // 先检查日期和重置（如果需要）
    pomodorosToday.value++;
    localStorage.setItem('dxcGwyPomodorosToday', pomodorosToday.value.toString());
    // 确保 lastPomodoroDate 也被正确设置，checkAndResetPomodoroCount 会处理
    console.log(`[PomodoroStore] Pomodoros completed today: ${pomodorosToday.value}`);
  }


  function startTimer() {
    if (isTimerRunning.value) return;

    // 如果当前秒数为0（意味着一个会话结束了），则需要先切换到下一个模式
    // 但 handleTimerEndInternal 已经处理了模式切换，所以这里主要处理手动开始
    if (timerSecondsRemaining.value <= 0) {
        // 如果是手动在一个完成的会话后点击开始，通常意味着开始下一个预设的会话
        // 或者，如果用户在00:00时重置了然后点开始，则按当前模式时长
        timerSecondsRemaining.value = timerTotalSeconds.value; // 按当前模式的总时长重置
    }

    if (currentMode.value === 'work' && !currentSessionStartTime.value) {
      // 只有当工作会话真正开始时才设置 startTime
      currentSessionStartTime.value = new Date().toISOString();
    }

    isTimerRunning.value = true;
    isSessionCompleted.value = false; // 开始新计时，清除完成标记

    if (timerIntervalId.value) clearInterval(timerIntervalId.value);
    timerIntervalId.value = setInterval(tick, 1000);
    console.log(`[PomodoroStore] Timer started in ${currentMode.value} mode. Cycle: ${currentCycle.value}`);
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
  }

  function pauseTimer() {
    if (!isTimerRunning.value) return;
    if (timerIntervalId.value) clearInterval(timerIntervalId.value);
    timerIntervalId.value = null; // 清除 ID 很重要
    isTimerRunning.value = false;
    console.log("[PomodoroStore] Timer paused.");
    document.title = `暂停 | ${modeText.value} | ${formattedTime.value} - 备考舱`;
  }

  function resetTimer() { // 这是暴露给外部的 reset
    resetTimerInternal(false); // 调用内部重置，显示日志
  }

  function updateCurrentActivity(activity) {
    currentSessionActivity.value = activity;
  }

  function acknowledgeSessionCompletion() { // 新增：组件调用此方法来重置完成状态
    isSessionCompleted.value = false;
    lastCompletedMode.value = null; // 也可以在这里重置
    console.log("[PomodoroStore] Session completion acknowledged by UI.");
  }

  function cleanupTimer() {
    if (timerIntervalId.value) {
      clearInterval(timerIntervalId.value);
      timerIntervalId.value = null;
      console.log("[PomodoroStore] Timer interval cleaned up on unmount/destroy.");
    }
  }
  
  async function initializeStore() {
    console.log('[PomodoroStore] Initializing...');
    await loadSettings(); // 加载设置，这会基于当前isTimerRunning状态决定是否重置计时器
    checkAndResetPomodoroCount(); // 检查并重置每日番茄钟计数
    // 如果计时器未运行，并且当前秒数不为0，则保持当前状态
    // 如果计时器未运行，并且秒数为0，loadSettings中的resetTimerInternal(true)会处理
    // 如果希望在初始化时，若计时器未运行，总是从当前模式的完整时长开始：
    // if (!isTimerRunning.value) {
    //    timerSecondsRemaining.value = timerTotalSeconds.value;
    // }
    // 上面的 resetTimerInternal(true) 已经包含了对秒数的处理
    console.log('[PomodoroStore] Initialization complete.');
  }


  // --- Expose ---
  return {
    // State & Settings
    workDuration, shortBreakDuration, longBreakDuration, pomodorosPerCycle,
    settingsLoading, settingsError,
    // Timer Core
    currentMode, isTimerRunning, timerSecondsRemaining, timerTotalSeconds,
    // Session Data
    currentSessionActivity, pomodorosToday, currentCycle,
    // UI Interaction Flags
    isSessionCompleted, lastCompletedMode,
    // Logging related
    isLoggingToStudyLog, studyLoggingError,
    // Getters (already computed refs)
    formattedTime, modeText,
    // Actions
    loadSettings, updateSettings,
    startTimer, pauseTimer, resetTimer,
    updateCurrentActivity,
    acknowledgeSessionCompletion,
    cleanupTimer,
    initializeStore
  };
});