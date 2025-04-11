// src/stores/studyLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import config from '@/config.js';
import { loadData, saveData } from '@/utils/storage.js';
import { generateId } from '@/utils/helpers.js';
import { formatDuration } from '@/utils/formatters.js';

export const useStudyLogStore = defineStore('studyLog', () => {
  // --- State ---
  const logs = ref([]); // 学习日志

  // --- Getters ---
  // 计算统计数据 (秒数)
  const durationStatsSeconds = computed(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const currentDayOfWeek = now.getDay();
    const diff = now.getDate() - currentDayOfWeek + (currentDayOfWeek === 0 ? -6 : 1);
    const weekStart = new Date(now.getFullYear(), now.getMonth(), diff).getTime();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

    let todaySecs = 0, weekSecs = 0, monthSecs = 0, totalSecs = 0;

    logs.value.forEach(item => {
      try {
        const itemStartTime = new Date(item.startTime).getTime();
        const duration = item.durationSeconds || 0;
        if (isNaN(itemStartTime) || isNaN(duration)) return;

        totalSecs += duration;
        if (itemStartTime >= todayStart) todaySecs += duration;
        if (itemStartTime >= weekStart) weekSecs += duration;
        if (itemStartTime >= monthStart) monthSecs += duration;
      } catch (e) { console.error("Error processing study log item for stats:", item, e); }
    });
    return { today: todaySecs, week: weekSecs, month: monthSecs, total: totalSecs };
  });

  // 格式化后的统计数据 (Xh Ym)
  const formattedDurationStats = computed(() => {
      const statsInSeconds = durationStatsSeconds.value;
      return {
          today: formatDuration(statsInSeconds.today),
          week: formatDuration(statsInSeconds.week),
          month: formatDuration(statsInSeconds.month),
          total: formatDuration(statsInSeconds.total),
      }
  });

  // 最近的 N 条日志 (用于显示)
  const recentLogs = computed(() => {
      const maxLogsToShow = 50;
      return logs.value.slice(0, maxLogsToShow);
  });

  // --- Actions ---
  function loadLogs() {
    logs.value = loadData(config.localStorageKeys.studyLog, []);
    console.log(`[Pinia] Loaded ${logs.value.length} study log entries.`);
  }

  function saveLogs() {
    saveData(config.localStorageKeys.studyLog, logs.value);
  }

  /**
   * 记录一次学习会话
   * @param {string} startTimeISO - ISO 格式开始时间
   * @param {string} endTimeISO - ISO 格式结束时间
   * @param {string} activity - 活动描述
   * @param {boolean} isInterrupted - 是否被中断
   * @param {string} source - 来源 (e.g., 'pomodoro', 'manual')
   */
  function logSession(startTimeISO, endTimeISO, activity = '专注学习', isInterrupted = false, source = 'pomodoro') {
    if (!startTimeISO || !endTimeISO) {
      console.error("[Pinia] Cannot log study session: Invalid start or end time.");
      return;
    }
    const startTime = new Date(startTimeISO);
    const endTime = new Date(endTimeISO);
    const durationSeconds = Math.max(0, (endTime.getTime() - startTime.getTime()) / 1000);

    // 记录规则：中断的记录 > 60s，正常的记录 >= 60s
    if (!isInterrupted && durationSeconds < 60) {
      console.log("[Pinia] Study session too short to log:", durationSeconds);
      return;
    }
     if (isInterrupted && durationSeconds <= 60) {
         console.log("[Pinia] Interrupted session too short to log:", durationSeconds);
         return;
     }


    const newLogEntry = {
      id: generateId(),
      startTime: startTimeISO,
      endTime: endTimeISO,
      durationSeconds: Math.round(durationSeconds),
      activity: activity || '专注学习',
      source: source
    };

    logs.value.unshift(newLogEntry);
    saveLogs();
    console.log("[Pinia] Study session logged:", newLogEntry.id);
  }

  function clearLogs() {
    if (confirm('确定要清空所有学习记录吗？此操作无法撤销。')) {
      logs.value = [];
      saveLogs();
      console.log("[Pinia] Study log cleared.");
      return true;
    }
    return false;
  }

  // --- 初始化 ---
  loadLogs();

  // --- 暴露 ---
  return {
    logs,
    durationStatsSeconds, // 暴露秒数，方便其他地方使用
    formattedDurationStats,
    recentLogs,
    loadLogs,
    logSession,
    clearLogs,
  };
});