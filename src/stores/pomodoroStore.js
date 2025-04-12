// src/stores/pomodoroStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';
import { format } from 'date-fns'; // 使用 date-fns 处理日期: npm install date-fns

const API_SETTINGS_URL = 'http://localhost:8080/api/pomodoro/settings';
const API_LOG_URL = 'http://localhost:8080/api/pomodoro/log';

// 辅助函数：获取今天的日期字符串 (YYYY-MM-DD)
function getTodayDateString() {
  return format(new Date(), 'yyyy-MM-dd');
}

export const usePomodoroStore = defineStore('pomodoro', () => {
  // --- Settings State ---
  const workDuration = ref(25);
  const shortBreakDuration = ref(5);
  const longBreakDuration = ref(15);
  const settingsLoading = ref(false);
  const settingsError = ref(null);

  // --- Log State (Optional: could be in a separate studyLogStore) ---
  const logLoading = ref(false);
  const logError = ref(null);

  // --- Today's Count State (Managed in Frontend Store) ---
  const pomodorosToday = ref(0);
  const lastPomodoroDate = ref(localStorage.getItem('dxcGwyLastPomodoroDate') || ''); // 从 localStorage 恢复上次记录日期

  // --- Actions: Settings ---

  // 从后端加载设置
  async function loadSettings() {
    settingsLoading.value = true;
    settingsError.value = null;
    try {
      const response = await axios.get(API_SETTINGS_URL);
      const data = response.data;
      workDuration.value = data.workDuration || 25;
      shortBreakDuration.value = data.shortBreakDuration || 5;
      longBreakDuration.value = data.longBreakDuration || 15;
      console.log('Pomodoro settings loaded from API.');
    } catch (err) {
      console.error('Error loading pomodoro settings:', err);
      settingsError.value = '无法加载番茄钟设置。';
      // 保留默认值或上次成功加载的值
    } finally {
      settingsLoading.value = false;
    }
  }

  // 更新设置到后端
  async function updateSettings(updates) {
    // 可以添加验证逻辑，确保值是正整数
    const validUpdates = {};
    if (updates.workDuration >= 1) validUpdates.workDuration = updates.workDuration;
    if (updates.shortBreakDuration >= 1) validUpdates.shortBreakDuration = updates.shortBreakDuration;
    if (updates.longBreakDuration >= 1) validUpdates.longBreakDuration = updates.longBreakDuration;

    if (Object.keys(validUpdates).length === 0) {
        console.warn("No valid settings to update.");
        return false;
    }

    settingsLoading.value = true; // 可以为更新操作显示加载状态
    settingsError.value = null;
    try {
      const response = await axios.patch(API_SETTINGS_URL, validUpdates);
      // 更新本地状态以匹配后端返回的最新数据
      const data = response.data;
      workDuration.value = data.workDuration;
      shortBreakDuration.value = data.shortBreakDuration;
      longBreakDuration.value = data.longBreakDuration;
      console.log('Pomodoro settings updated via API.');
      return true;
    } catch (err) {
      console.error('Error updating pomodoro settings:', err);
      settingsError.value = '更新设置失败，请稍后重试。';
      return false;
    } finally {
      settingsLoading.value = false;
    }
  }

  // --- Actions: Study Log ---

  // 添加学习日志到后端
  async function addStudyLog(logData) {
    // logData 应该包含: startTime (ISO string), endTime (ISO string), durationSeconds, activity
    logLoading.value = true;
    logError.value = null;
    try {
      // 确保时间格式正确，如果需要的话进行转换
      // const dataToSend = {
      //     ...logData,
      //     startTime: new Date(logData.startTime).toISOString(), // 确保是 ISO 格式
      //     endTime: new Date(logData.endTime).toISOString()
      // };
      // 假设 logData 中的时间已经是后端可接受的格式 (LocalDateTime 可以解析 ISO 8601)

      const response = await axios.post(API_LOG_URL, logData);
      console.log('Study log added via API:', response.data);
      // 可选：触发 studyLogStore (如果分离了) 重新加载日志
      // studyLogStore.loadLogs();
      return true;
    } catch (err) {
      console.error('Error adding study log via API:', err);
      logError.value = '记录学习日志失败。';
      return false;
    } finally {
      logLoading.value = false;
    }
  }

   // --- Actions: Today's Count (Frontend Logic) ---

   // 检查并重置每日计数器
   function checkAndResetPomodoroCount() {
        const today = getTodayDateString();
        if (lastPomodoroDate.value !== today) {
            console.log('New day detected, resetting pomodorosToday count.');
            pomodorosToday.value = 0;
            lastPomodoroDate.value = today;
            localStorage.setItem('dxcGwyLastPomodoroDate', today); // 更新 localStorage
        }
   }

   // 增加今日专注次数
   function incrementPomodorosToday() {
        checkAndResetPomodoroCount(); // 确保日期是最新的
        pomodorosToday.value++;
        // 可选：将 pomodorosToday 也保存到 localStorage，以便刷新后恢复当日计数
        // localStorage.setItem('dxcGwyPomodorosToday', pomodorosToday.value.toString());
        console.log(`Pomodoros today: ${pomodorosToday.value}`);
   }


  // --- Initialization ---
  loadSettings(); // 初始化时加载设置
  checkAndResetPomodoroCount(); // 初始化时检查日期并可能重置计数器

  // --- Expose ---
  return {
    workDuration,
    shortBreakDuration,
    longBreakDuration,
    settingsLoading,
    settingsError,
    logLoading,
    logError,
    pomodorosToday, // 暴露今日计数

    loadSettings,
    updateSettings,
    addStudyLog,
    incrementPomodorosToday, // 暴露增加计数的方法
    // 不暴露 checkAndResetPomodoroCount，让 increment 内部调用
  };
});