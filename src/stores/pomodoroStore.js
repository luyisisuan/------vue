// src/stores/pomodoroStore.js
import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import config from '@/config.js';
import { loadData, saveData } from '@/utils/storage.js';
import { formatTimeMMSS } from '@/utils/formatters.js';
import { useStudyLogStore } from './studyLogStore'; // 引入学习日志 store

export const usePomodoroStore = defineStore('pomodoro', () => {
  const studyLogStore = useStudyLogStore(); // 获取学习日志 store 实例

  // --- State ---
  const workDuration = ref(config.pomodoroDefaults.work);
  const shortBreakDuration = ref(config.pomodoroDefaults.shortBreak);
  const longBreakDuration = ref(config.pomodoroDefaults.longBreak);

  const timerMode = ref('work'); // 'work', 'shortBreak', 'longBreak'
  const timerSecondsRemaining = ref(workDuration.value * 60); // 初始值
  const isTimerRunning = ref(false);
  const workCyclesCompleted = ref(0);
  const currentSessionActivity = ref('');
  const currentSessionStartTime = ref(null); // ISO string
  const timerInterval = ref(null);

  // 今日计数 (从 localStorage 加载)
  const pomodorosToday = ref(0);
  const lastResetDate = ref(null); // 用于判断是否新的一天

  // --- Getters (Computed) ---
  const timerModeText = computed(() => { /* ... */ }); // 和组件内一样
  const formattedTimerTime = computed(() => formatTimeMMSS(timerSecondsRemaining.value));
  const timerTotalSeconds = computed(() => { /* ... */ }); // 和组件内一样

  // --- Actions ---
  // 加载设置
  function loadSettings() {
    const settings = loadData(config.localStorageKeys.pomodoro, config.pomodoroDefaults);
    workDuration.value = settings.work;
    shortBreakDuration.value = settings.shortBreak;
    longBreakDuration.value = settings.longBreak;
    // 如果计时器未运行，应用新设置
    if (!isTimerRunning.value) {
      resetTimerInternal(true); // 使用内部重置，避免重复确认
    }
    console.log("[Pinia] Pomodoro settings loaded.");
  }

  // 保存设置
  function saveSettings() {
    const settings = {
      work: workDuration.value,
      shortBreak: shortBreakDuration.value,
      longBreak: longBreakDuration.value,
    };
    saveData(config.localStorageKeys.pomodoro, settings);
    // 如果计时器未运行，应用新设置
    if (!isTimerRunning.value) {
        resetTimerInternal(true);
    }
  }

  // 加载/检查今日计数
  function loadOrResetPomodoroCount() {
      const summaryData = loadData(config.localStorageKeys.summary, { pomodorosToday: 0, lastResetDate: null });
      const todayStr = new Date().toLocaleDateString();
      if(summaryData.lastResetDate === todayStr) {
          pomodorosToday.value = summaryData.pomodorosToday || 0;
          lastResetDate.value = todayStr;
      } else {
          pomodorosToday.value = 0;
          lastResetDate.value = todayStr;
          savePomodoroCountInternal(); // 保存重置后的计数和日期
      }
       console.log(`[Pinia] Pomodoros today: ${pomodorosToday.value}`);
  }

  // 内部保存计数和日期
  function savePomodoroCountInternal() {
       saveData(config.localStorageKeys.summary, {
           pomodorosToday: pomodorosToday.value,
           lastResetDate: lastResetDate.value
       });
  }

   // 内部切换模式逻辑
   function switchModeInternal(newMode, isAutoSwitch = true) {
     const previousMode = timerMode.value;

     // 完成一个工作周期
     if (previousMode === 'work' && isAutoSwitch && timerSecondsRemaining.value <= 0) {
       workCyclesCompleted.value++;
       // 检查是否新的一天，是则重置计数
       const todayStr = new Date().toLocaleDateString();
       if (lastResetDate.value !== todayStr) {
           pomodorosToday.value = 0;
           lastResetDate.value = todayStr;
       }
       pomodorosToday.value++;
       savePomodoroCountInternal(); // 保存计数

       // 使用 studyLogStore 记录日志
       if (currentSessionStartTime.value) {
         const activity = currentSessionActivity.value.trim() || '专注学习';
         studyLogStore.logSession(currentSessionStartTime.value, new Date().toISOString(), activity, false, 'pomodoro');
       } else { console.warn("[Pinia] Pomodoro finished but no start time recorded."); }
     }

     timerMode.value = newMode;
     timerSecondsRemaining.value = timerTotalSeconds.value; // computed 会更新 total

     if (newMode !== 'work') {
       currentSessionActivity.value = ''; // 清空活动描述
       currentSessionStartTime.value = null;
     } else if (!isTimerRunning.value) { // 进入工作模式且计时器未开始
        currentSessionStartTime.value = new Date().toISOString();
     }


     if (newMode === 'longBreak') {
       workCyclesCompleted.value = 0;
     }

     updateDocumentTitle(); // 更新浏览器标题

     if (isTimerRunning.value) { // 如果在切换时计时器还在跑（理论上不该）
         clearInterval(timerInterval.value);
         isTimerRunning.value = false;
     }

     if (isAutoSwitch) {
       notifyUser(`时间到！现在开始 ${timerModeText.value}。`);
     }
   }

   // 内部重置计时器逻辑
   function resetTimerInternal(silent = false) {
     // 记录中断的工作会话
     if (timerMode.value === 'work' && isTimerRunning.value && currentSessionStartTime.value) {
       const endTime = new Date().toISOString();
       const duration = (new Date(endTime).getTime() - new Date(currentSessionStartTime.value).getTime()) / 1000;
       if (duration > 60) { // 至少记录超过1分钟的中断
         const activity = (currentSessionActivity.value.trim() || '专注学习') + " (中断)";
         studyLogStore.logSession(currentSessionStartTime.value, endTime, activity, true, 'pomodoro'); // isInterrupted = true
       }
     }

     clearInterval(timerInterval.value);
     isTimerRunning.value = false;
     timerMode.value = 'work';
     // 使用当前的 workDuration 设置
     timerSecondsRemaining.value = workDuration.value * 60;
     currentSessionActivity.value = '';
     currentSessionStartTime.value = null;
     workCyclesCompleted.value = 0;

     updateDocumentTitle(); // 重置标题

     if (!silent) {
       console.log("[Pinia] Timer reset.");
     }
   }

  // 暴露给组件的 Actions
  function start() {
    if (isTimerRunning.value) return;

    if (timerMode.value === 'work' && !currentSessionStartTime.value) {
      currentSessionStartTime.value = new Date().toISOString();
    }
    if (timerSecondsRemaining.value <= 0 || timerSecondsRemaining.value >= timerTotalSeconds.value) {
      timerSecondsRemaining.value = timerTotalSeconds.value;
    }

    isTimerRunning.value = true;
    updateDocumentTitle();

    timerInterval.value = setInterval(() => {
      timerSecondsRemaining.value--;
      updateDocumentTitle();

      if (timerSecondsRemaining.value < 0) {
        clearInterval(timerInterval.value);
        isTimerRunning.value = false;

        const longBreakInterval = config.pomodoroDefaults.longBreakInterval;
        let nextMode;
        if (timerMode.value === 'work') {
          nextMode = (workCyclesCompleted.value + 1) % longBreakInterval === 0 ? 'longBreak' : 'shortBreak';
        } else {
          nextMode = 'work';
        }
        switchModeInternal(nextMode, true); // 自动切换
      }
    }, 1000);
     console.log("[Pinia] Timer started.");
  }

  function pause() {
    if (!isTimerRunning.value) return;
    clearInterval(timerInterval.value);
    isTimerRunning.value = false;
    updateDocumentTitle();
    console.log("[Pinia] Timer paused.");
  }

  function reset() {
      if (confirm('确定要重置番茄钟吗？当前进度将丢失。')) {
           resetTimerInternal(false);
           return true;
      }
      return false;
  }

  function updateActivity(activityText) {
      currentSessionActivity.value = activityText;
  }

  // --- Helper Functions ---
  function updateDocumentTitle() { /* ... */ } // 和组件内一样
  function notifyUser(message) { /* ... */ } // 和组件内一样

  // --- 初始化 ---
  loadSettings();
  loadOrResetPomodoroCount();
  resetTimerInternal(true); // 初始化计时器状态和时间

  // --- 暴露 ---
  return {
    // State (ref)
    workDuration, shortBreakDuration, longBreakDuration,
    timerMode, timerSecondsRemaining, isTimerRunning,
    currentSessionActivity, // 暴露给组件 v-model
    pomodorosToday,

    // Getters (computed)
    timerModeText, formattedTimerTime, timerTotalSeconds,

    // Actions
    loadSettings, // 允许外部重新加载
    saveSettings, // 当组件内时长改变时调用
    start,
    pause,
    reset,
    updateActivity, // 允许组件更新活动描述
  };
});