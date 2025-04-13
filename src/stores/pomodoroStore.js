import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { format } from 'date-fns';
import config from '@/config.js';
import { useStudyLogStore } from './studyLogStore';

const API_SETTINGS_URL = 'http://localhost:8080/api/pomodoro/settings';
const API_LOG_URL = 'http://localhost:8080/api/pomodoro/log';

function getTodayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  // State
  const workDuration = ref(25);
  const shortBreakDuration = ref(5);
  const longBreakDuration = ref(15);
  const settingsLoading = ref(false);
  const settingsError = ref(null);
  const currentMode = ref('work');
  const isTimerRunning = ref(false);
  const timerSecondsRemaining = ref((workDuration.value || 25) * 60);
  const timerIntervalId = ref(null);
  const workCyclesCompleted = ref(0);
  const currentSessionStartTime = ref(null);
  const currentSessionActivity = ref('');
  const logLoading = ref(false);
  const logError = ref(null);
  const pomodorosToday = ref(0);
  const lastPomodoroDate = ref(localStorage.getItem('dxcGwyLastPomodoroDate') || '');

  // Getters
  const timerTotalSeconds = computed(() => {
      let durationMinutes;
      switch (currentMode.value) {
          case 'shortBreak': durationMinutes = shortBreakDuration.value; break;
          case 'longBreak': durationMinutes = longBreakDuration.value; break;
          default: durationMinutes = workDuration.value; break;
      }
      const validMinutes = Number.isInteger(durationMinutes) && durationMinutes >= 1
                           ? durationMinutes
                           : (currentMode.value === 'shortBreak' ? 5 : (currentMode.value === 'longBreak' ? 15 : 25));
      return validMinutes * 60;
  });

  const formattedTime = computed(() => {
      const seconds = Math.max(0, typeof timerSecondsRemaining.value === 'number' ? timerSecondsRemaining.value : timerTotalSeconds.value);
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  });

  const modeText = computed(() => {
      const modeMap = { work: '工作', shortBreak: '短休', longBreak: '长休' };
      return modeMap[currentMode.value] || '工作';
  });

  // Actions: 内部定时器逻辑
  function tick() {
    if (!isTimerRunning.value) return;
    timerSecondsRemaining.value--;
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    if (timerSecondsRemaining.value < 0) {
        handleTimerEndInternal();
    }
  }

  async function handleTimerEndInternal() { // 改为 async 以便记录日志
    clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
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
                 await addStudyLogInternal({
                     startTime: startTime.toISOString(), 
                     endTime: endTime.toISOString(),
                     durationSeconds: duration, 
                     activity: currentSessionActivity.value.trim() || '专注学习', 
                     source: 'pomodoro'
                 });
             }
         }
         workCyclesCompleted.value++;
         const longBreakInterval = config?.pomodoroDefaults?.longBreakInterval || 4;
         nextMode = (workCyclesCompleted.value % longBreakInterval === 0) ? 'longBreak' : 'shortBreak';
    } else {
         nextMode = 'work';
    }
    switchModeInternal(nextMode);
  }

  function switchModeInternal(newMode) {
    currentMode.value = newMode;
    timerSecondsRemaining.value = timerTotalSeconds.value;
    currentSessionStartTime.value = (newMode === 'work') ? new Date().toISOString() : null;
    workCyclesCompleted.value = (newMode === 'longBreak') ? 0 : workCyclesCompleted.value;
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    console.log(`Switched mode to: ${newMode}. Total seconds: ${timerTotalSeconds.value}`);
  }

  function resetTimerInternal(silent = false) {
    clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
    isTimerRunning.value = false;
    currentMode.value = 'work';
    workCyclesCompleted.value = 0;
    timerSecondsRemaining.value = (workDuration.value || 25) * 60;
    currentSessionStartTime.value = null;
    currentSessionActivity.value = '';
    if (!silent) {
      console.log("Timer reset in store.");
      document.title = "备考智能驾驶舱 | 段绪程";
    } else {
      timerSecondsRemaining.value = timerTotalSeconds.value;
      document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
    }
  }

  // Actions: 对组件公开的接口
  async function loadSettings() {
    settingsLoading.value = true;
    settingsError.value = null;
    try {
      const response = await axios.get(API_SETTINGS_URL);
      const data = response.data;
      workDuration.value = data.workDuration || 25;
      shortBreakDuration.value = data.shortBreakDuration || 5;
      longBreakDuration.value = data.longBreakDuration || 15;
      if (!isTimerRunning.value) {
          resetTimerInternal(true);
      }
      console.log('Pomodoro settings loaded.');
    } catch (err) {
      settingsError.value = '无法加载设置。';
      console.error('Error loading settings:', err);
    } finally {
      settingsLoading.value = false;
    }
  }

  async function updateSettings(updates) {
    settingsLoading.value = true;
    settingsError.value = null;
    const validUpdates = {};
    if (updates.workDuration >= 1) validUpdates.workDuration = updates.workDuration;
    if (updates.shortBreakDuration >= 1) validUpdates.shortBreakDuration = updates.shortBreakDuration;
    if (updates.longBreakDuration >= 1) validUpdates.longBreakDuration = updates.longBreakDuration;
    if (Object.keys(validUpdates).length === 0) { 
      settingsLoading.value = false; 
      return false; 
    }

    try {
      const response = await axios.patch(API_SETTINGS_URL, validUpdates);
      const data = response.data;
      workDuration.value = data.workDuration;
      shortBreakDuration.value = data.shortBreakDuration;
      longBreakDuration.value = data.longBreakDuration;
      // 当番茄钟未运行时，实时刷新界面（静默模式重置定时器）
      if (!isTimerRunning.value) {
        resetTimerInternal(true);
      }
      console.log('Pomodoro settings updated.');
      return true;
    } catch (err) {
      settingsError.value = `更新设置失败: ${err.response?.data?.message || err.message}`;
      console.error('Error updating settings:', err);
      return false;
    } finally {
      settingsLoading.value = false;
    }
  }

  // 日志记录函数
  async function addStudyLogInternal(logData) {
    const studyLogStore = useStudyLogStore();
    if (!studyLogStore) { return false; }
    logLoading.value = true;
    logError.value = null;
    try {
      const success = await studyLogStore.addLog(logData);
      logError.value = studyLogStore.error;
      return success;
    } catch (err) {
      logError.value = '记录日志时发生意外错误。';
      return false;
    } finally {
      logLoading.value = false;
    }
  }

  function checkAndResetPomodoroCount() {
    const today = getTodayDateString();
    if (lastPomodoroDate.value !== today) {
      pomodorosToday.value = 0;
      lastPomodoroDate.value = today;
      localStorage.setItem('dxcGwyLastPomodoroDate', today);
    }
    const savedCount = parseInt(localStorage.getItem('dxcGwyPomodorosToday') || '0', 10);
    if (lastPomodoroDate.value === today && pomodorosToday.value !== savedCount) {
      pomodorosToday.value = savedCount;
    }
  }
  
  function incrementPomodorosToday() {
    checkAndResetPomodoroCount();
    pomodorosToday.value++;
    localStorage.setItem('dxcGwyPomodorosToday', pomodorosToday.value.toString());
    console.log(`Pomodoros today: ${pomodorosToday.value}`);
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
    console.log("Timer started.");
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
  }

  function pauseTimer() {
    if (!isTimerRunning.value) return;
    clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
    isTimerRunning.value = false;
    console.log("Timer paused.");
    document.title = `暂停 | ${modeText.value} | ${formattedTime.value} - 备考舱`;
  }

  function resetTimer() {
    resetTimerInternal(false);
  }

  // 更新当前活动
  function updateCurrentActivity(activity) {
    currentSessionActivity.value = activity;
  }

  // 定时器清理
  function cleanupTimer() {
    clearInterval(timerIntervalId.value);
    timerIntervalId.value = null;
    console.log("Pomodoro timer interval cleaned up.");
  }

  // 初始化
  loadSettings();
  checkAndResetPomodoroCount();

  // 将所有需要暴露给组件的方法、属性添加进返回对象中
  return {
    workDuration, shortBreakDuration, longBreakDuration,
    settingsLoading, settingsError,
    currentMode, isTimerRunning, timerSecondsRemaining, timerTotalSeconds,
    currentSessionActivity,
    formattedTime, modeText,
    startTimer, pauseTimer, resetTimer,
    updateSettings,    // 确保 updateSettings 暴露出来
    addStudyLog: addStudyLogInternal,
    logLoading, logError,
    pomodorosToday, incrementPomodorosToday,
    updateCurrentActivity,
    cleanupTimer
  };
})