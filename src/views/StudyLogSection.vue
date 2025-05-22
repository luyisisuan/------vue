<template>
  <div class="study-log-page-container gov-style-wrapper">
    <header class="section-header">
      <h1><i class="fas fa-calendar-check header-icon animated-icon"></i> 学习时长数据汇总</h1>
      <p>回顾您的学习投入，持续优化备考节奏。</p>
    </header>

    <div v-if="isLoading" class="loading-overlay-fullpage card">
      <div class="elegant-spinner">
        <div></div><div></div><div></div><div></div>
      </div>
      <p>正在生成学习效能报告...</p>
    </div>
    <div v-else-if="statsError || logError" class="error-message card prominent-error">
      <i class="fas fa-exclamation-triangle error-icon-large"></i>
      数据加载异常: {{ statsError || logError || '未知错误' }}
      <button @click="reloadData" class="btn btn-secondary btn-sm retry-btn"> <i class="fas fa-redo"></i> 重试 </button>
    </div>

    <div v-else class="study-log-content-grid">
      <div class="study-stats-summary-card">
          <div class="study-stats-grid">
            <div class="stat-item animated-card" style="--delay: 0.1s">
              <i class="fas fa-cog stat-icon"></i>
              <span class="stat-label">今日专注时长</span>
              <span class="stat-value"><animated-number :value="todayDurationSeconds" :formatter="formatDuration" :duration="1.2" /></span>
            </div>
            <div class="stat-item animated-card" style="--delay: 0.2s">
              <i class="fas fa-calendar-day stat-icon"></i>
              <span class="stat-label">本周累计时长</span>
              <span class="stat-value"><animated-number :value="weekDurationSeconds" :formatter="formatDuration" :duration="1.2" /></span>
            </div>
            <div class="stat-item animated-card" style="--delay: 0.3s">
              <i class="fas fa-calendar-alt stat-icon"></i>
              <span class="stat-label">本月累计时长</span>
              <span class="stat-value"><animated-number :value="monthDurationSeconds" :formatter="formatDuration" :duration="1.2" /></span>
            </div>
            <div class="stat-item total-stat-item animated-card" style="--delay: 0.4s">
               <i class="fas fa-medal stat-icon"></i>
              <span class="stat-label">总计学习投入</span>
              <span class="stat-value"><animated-number :value="totalDurationSeconds" :formatter="formatDuration" :duration="1.5" /></span>
            </div>
          </div>
          <div class="today-online-stat animated-card" style="--delay: 0.5s">
              <i class="fas fa-mouse-pointer online-icon"></i>
              今日在线活跃: <strong class="online-duration-value"><animated-number :value="displayedOnlineSeconds" :formatter="formatDuration" :duration="0.8" /></strong>
              <span class="tooltip">依据页面活跃时间记录，独立于专注学习时长。</span>
          </div>
      </div>

      <div class="card weekly-chart-card animated-card" style="--delay: 0.6s">
        <div class="card-header">
          <h2><i class="fas fa-chart-line card-title-icon"></i> 本周学习趋势</h2>
        </div>
        <div class="card-body">
          <div class="weekly-study-chart-container">
            <div v-if="weeklyChartData.labels.length > 0 && weeklyChartData.values.some(v => v > 0)" class="css-bar-chart">
              <div class="chart-y-axis">
                <span>{{ maxWeeklyHours.toFixed(0) }}h</span>
                <span v-if="maxWeeklyHours > 1">{{ (maxWeeklyHours / 2).toFixed(1) }}h</span>
                <span>0h</span>
              </div>
              <div class="chart-bars">
                <div
                  v-for="(val, index) in weeklyChartData.values"
                  :key="weeklyChartData.labels[index]"
                  class="bar-item-wrapper"
                >
                  <div class="bar" :style="{ height: calculateBarHeight(val) }" :title="`${weeklyChartData.labels[index]}: ${formatDuration(val)}`"></div>
                  <span class="bar-label">{{ weeklyChartData.labels[index] }}</span>
                </div>
              </div>
            </div>
            <p v-else class="placeholder-text small">本周暂无学习数据以生成图表。</p>
          </div>
        </div>
      </div>

      <div class="card study-log-list-card animated-card" style="--delay: 0.7s">
        <div class="card-header">
          <h2><i class="fas fa-clipboard-list card-title-icon"></i> 近期学习明细</h2>
        </div>
        <div class="card-body">
          <div id="study-log-list" class="study-log-container fancy-scrollbar">
            <div v-if="isLoadingLogs && logs.length === 0" class="loading-indicator small-indicator">
                <div class="spinner-small"></div> 加载学习明细...
            </div>
            <div v-else-if="logError && logs.length === 0" class="error-message small-error">加载日志失败: {{ logError }}</div>
            <p v-else-if="logs.length === 0" class="placeholder-text">
                <i class="fas fa-folder-open placeholder-icon-large"></i><br>
                暂无学习记录，开始您的第一次专注吧！
            </p>
            <ul v-else class="study-log-list-ul">
              <transition-group name="list-anim" tag="ul" class="study-log-list-ul-inner">
                <li v-for="(item, index) in logs.slice(0, 20)" :key="item.id" class="study-log-item" :style="{ '--item-delay': index * 0.05 + 's' }">
                  <span class="activity-icon" v-html="getActivityIcon(item.activity)"></span>
                  <div class="activity-details">
                    <span class="activity-name">{{ item.activity || '专注学习' }}</span>
                    <span class="timestamp" :title="formatTimestamp(item.startTime, 'yyyy-MM-dd HH:mm:ss')">
                      {{ formatTimestamp(item.startTime, 'yyyy年M月d日 HH:mm') }} - {{ formatTimestamp(item.endTime, 'HH:mm') }}
                    </span>
                  </div>
                  <span class="duration-badge">{{ formatDuration(item.durationSeconds) }}</span>
                </li>
              </transition-group>
            </ul>
          </div>
          <div class="study-log-actions">
            <button @click="clearLogsHandler" class="btn btn-danger btn-with-icon" :disabled="isLoading || logs.length === 0">
              <i class="fas fa-trash-alt"></i> 清空所有记录
            </button>
            <span v-if="clearError" class="error-message small-text-error">{{ clearError }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { useAppStore } from '@/stores/appStore.js';
import config from '@/config.js';
import { formatDuration, formatTimestamp } from '@/utils/formatters.js';
import AnimatedNumber from '@/components/utils/AnimatedNumber.vue';

const studyLogStore = useStudyLogStore();
const {
  logs, logError, statsError,
  totalDurationSeconds, todayDurationSeconds, weekDurationSeconds, monthDurationSeconds,
  todayOnlineSeconds, isLoadingLogs, isLoadingStats,
  logsLoadedSuccessfully, statsLoadedSuccessfully // Destructure new states
} = storeToRefs(studyLogStore);

const appStore = useAppStore();

// isLoading now primarily driven by stats, logs loading has its own indicator
const isLoading = computed(() => isLoadingStats.value && !statsLoadedSuccessfully.value);


const LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT = 'gwy_today_online_increment_v2';
const LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE = 'gwy_today_increment_last_update_v2';
const LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE = 'gwy_today_increment_date_v2';

const secondsSinceStatsUpdate = ref(0);
const localTimerId = ref(null);
const clearError = ref(null);

const displayedOnlineSeconds = computed(() => {
  const base = Number(todayOnlineSeconds.value) || 0;
  const increment = Number(secondsSinceStatsUpdate.value) || 0;
  return base + increment;
});

const weeklyChartData = ref({ labels: [], values: [] });
const maxWeeklyHours = ref(1);

function calculateBarHeight(valueInSeconds) {
    if (maxWeeklyHours.value === 0 || !valueInSeconds) return '0%';
    const heightPercent = (valueInSeconds / (maxWeeklyHours.value * 3600)) * 100;
    return `${Math.min(100, Math.max(0, heightPercent))}%`;
}

function generateWeeklyChartData() {
  console.log('[Chart] Attempting to generate weekly chart. Logs count:', logs.value.length);
  if (!logs.value || logs.value.length === 0) {
    weeklyChartData.value = { labels: [], values: [] };
    maxWeeklyHours.value = 1;
    console.log('[Chart] No logs available, chart data cleared.');
    return;
  }

  const today = new Date();
  const dayMillis = 24 * 60 * 60 * 1000;
  const labels = [];
  const values = [];
  let maxDurationSecondsInWeek = 0;

  for (let i = 6; i >= 0; i--) {
    const day = new Date(today.getTime() - i * dayMillis);
    labels.push(['日', '一', '二', '三', '四', '五', '六'][day.getDay()]);
    
    const dayLogs = logs.value.filter(log => {
      const logDate = new Date(log.startTime);
      return logDate.getFullYear() === day.getFullYear() &&
             logDate.getMonth() === day.getMonth() &&
             logDate.getDate() === day.getDate();
    });
    const dailyDuration = dayLogs.reduce((sum, log) => sum + log.durationSeconds, 0);
    values.push(dailyDuration);
    if (dailyDuration > maxDurationSecondsInWeek) {
      maxDurationSecondsInWeek = dailyDuration;
    }
  }
  weeklyChartData.value = { labels, values };
  maxWeeklyHours.value = Math.max(1, Math.ceil(maxDurationSecondsInWeek / 3600));
  console.log('[Chart] Generated weeklyChartData:', weeklyChartData.value, 'MaxHours:', maxWeeklyHours.value);
}

function getCurrentDateString() { return new Date().toISOString().split('T')[0]; }

async function clearLogsHandler() {
  clearError.value = null;
  if (confirm('此操作将永久清空所有学习记录，且无法撤销。您确定要继续吗？')) {
    const success = await studyLogStore.clearAllLogs();
    if (!success) {
      clearError.value = studyLogStore.logError || studyLogStore.statsError || '清空日志失败。';
    } else {
      alert('所有学习记录已成功清空！');
      secondsSinceStatsUpdate.value = 0; // Reset local online increment
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
      // generateWeeklyChartData will be called by the watcher on `logs`
    }
  }
}

async function reloadData() {
    // Force reload both stats and logs
    await studyLogStore.loadActivityStats(true);
    await studyLogStore.loadRecentLogs(); // This will trigger the watcher
}

function getActivityIcon(activityText = '') {
    const text = String(activityText).toLowerCase();
    if (text.includes('申论')) return '<i class="fas fa-file-signature activity-icon-type"></i>';
    if (text.includes('行测') || text.includes('数量') || text.includes('判断') || text.includes('资料')) return '<i class="fas fa-calculator activity-icon-type"></i>';
    if (text.includes('言语')) return '<i class="fas fa-comments activity-icon-type"></i>';
    if (text.includes('面试')) return '<i class="fas fa-user-friends activity-icon-type"></i>';
    if (text.includes('常识')) return '<i class="fas fa-landmark activity-icon-type"></i>';
    if (text.includes('视频') || text.includes('课程') || text.includes('看课')) return '<i class="fas fa-video activity-icon-type"></i>';
    if (text.includes('笔记') || text.includes('整理')) return '<i class="fas fa-book-open activity-icon-type"></i>';
    return '<i class="fas fa-brain activity-icon-type"></i>';
}

onMounted(async () => {
  const currentDateStr = getCurrentDateString();
  const storedDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE);
  if (storedDateStr === currentDateStr) {
    const storedIncrement = parseInt(localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT) || '0', 10);
    secondsSinceStatsUpdate.value = isNaN(storedIncrement) || storedIncrement < 0 ? 0 : storedIncrement;
  } else {
    secondsSinceStatsUpdate.value = 0;
    localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE, currentDateStr); // Set new date
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
  }

  try {
    // If stats haven't been successfully loaded yet, load them.
    if (!statsLoadedSuccessfully.value) {
        await studyLogStore.loadActivityStats();
    }
    // If logs haven't been successfully loaded or are empty, load them.
    // The watcher with immediate:true will handle initial chart generation if logs are already present.
    if (!logsLoadedSuccessfully.value || logs.value.length === 0) {
        await studyLogStore.loadRecentLogs();
    }
  } catch (e) { console.error("[StudyLogSection] Error during initial data load in onMounted:", e); }

  if (localTimerId.value) clearInterval(localTimerId.value);
  localTimerId.value = setInterval(() => {
    const currentTime = Date.now();
    const timerCurrentDateStr = new Date(currentTime).toISOString().split('T')[0];
    const lsDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE);

    if (timerCurrentDateStr !== lsDateStr) {
      secondsSinceStatsUpdate.value = 0;
      localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE, timerCurrentDateStr);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
    }

    const lastActivity = appStore.persistentActivityData?.lastActivityTimestamp || currentTime;
    const inactivityTimeout = config.INACTIVITY_TIMEOUT_MS || 15 * 60 * 1000;

    if (currentTime - lastActivity <= inactivityTimeout) {
      secondsSinceStatsUpdate.value++;
      if (secondsSinceStatsUpdate.value % 5 === 0) { // Save every 5 seconds
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT, secondsSinceStatsUpdate.value.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE, currentTime.toString());
        // No need to update LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE here again if it's already current
      }
    }
  }, 1000);
});

onUnmounted(() => {
  if (localTimerId.value) clearInterval(localTimerId.value);
  // Save current increment on unmount if it's a valid number
  if (typeof secondsSinceStatsUpdate.value === 'number' && secondsSinceStatsUpdate.value >= 0) {
    const currentDateStr = getCurrentDateString();
    const storedDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE);
    if(storedDateStr === currentDateStr) { // Only save if it's for the current day
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT, secondsSinceStatsUpdate.value.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE, Date.now().toString());
    }
  }
});

// Watcher for todayOnlineSeconds from store to reset local increment
watch(todayOnlineSeconds, (newValue, oldValue) => {
  if (newValue !== undefined && oldValue !== undefined && newValue !== oldValue) {
    console.log("[StudyLogSection] todayOnlineSeconds changed in store. Resetting local online increment.");
    secondsSinceStatsUpdate.value = 0;
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
    // No need to update LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE here, it's handled by the interval timer
  }
}, { immediate: false }); // Don't run immediately, only on change

// Watcher for logs to regenerate chart
watch(logs, (newLogs) => {
    console.log('[StudyLogSection] Logs watcher triggered. New logs count:', newLogs ? newLogs.length : 'N/A');
    if (newLogs) { // If newLogs is null/undefined, this check prevents error
        generateWeeklyChartData();
    }
}, { deep: true, immediate: true }); // immediate: true to generate chart on initial load if logs are present

</script>

<style scoped>
/* --- Red Government Style Theme Variables --- */
.gov-style-wrapper {
  --gov-primary-red: #C92A2A;
  --gov-primary-red-dark: #A62222;
  --gov-primary-red-light-bg: #FFEBEB;
  --gov-accent-gold: #D4AC0D;
  --gov-accent-blue: #205081;
  --gov-secondary-gray: #495057;
  --gov-text-primary: #343A40;
  --gov-text-secondary: #6C757D;
  --gov-background-light: #F8F9FA;
  --gov-background-white: #FFFFFF;
  --gov-border-color: #DEE2E6;
  --gov-border-color-strong: #CED4DA;
  --gov-danger-red: #DC3545;
  --gov-success-green: #28A745;
  --gov-info-blue: #117A8B;
  --gov-shadow-soft: 0 2px 6px rgba(0,0,0,0.07);
  --gov-shadow-medium: 0 5px 15px rgba(0,0,0,0.1);
  --gov-shadow-strong: 0 8px 25px rgba(0,0,0,0.12);
  --gov-transition-default: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-family: "Microsoft YaHei", "SimSun", "Helvetica Neue", Helvetica, Arial, sans-serif;
}

/* General Styles & Header */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 5px;
  box-shadow: var(--gov-shadow-medium);
  margin-bottom: 1.5rem;
  overflow: hidden;
}
.animated-card {
  opacity: 0;
  transform: translateY(15px);
  animation: cardFadeInUp 0.5s ease-out forwards var(--delay, 0s);
}
@keyframes cardFadeInUp { to { opacity: 1; transform: translateY(0); } }

.card-header {
  padding: 0.9rem 1.25rem;
  background-color: var(--gov-background-light);
  border-bottom: 1px solid var(--gov-border-color);
  display: flex; align-items: center;
}
.card-header h2 {
  margin: 0; font-size: 1.1rem; font-weight: 600; color: var(--gov-text-primary);
  display: flex; align-items: center; gap: 0.5em;
}
.card-title-icon { color: var(--gov-primary-red); }
.card-body { padding: 1.25rem; }

.section-header {
  margin-bottom: 2rem; padding-bottom: 1.25rem;
  border-bottom: 2px solid var(--gov-primary-red);
  text-align: center;
}
.section-header h1 {
  font-size: 1.75rem; font-weight: 700; color: var(--gov-text-primary);
  display: inline-flex; align-items: center;
}
.header-icon.animated-icon {
  color: var(--gov-primary-red); margin-right: 0.75rem; font-size: 1.5rem;
  animation: iconPulse 2s infinite ease-in-out;
}
@keyframes iconPulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.1); } }
.section-header p { font-size: 1rem; color: var(--gov-text-secondary); margin-top: 0.4rem; }

/* Loading & Error States */
.loading-overlay-fullpage {
  position: fixed; top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(248,249,250,0.95); display: flex; flex-direction: column;
  justify-content: center; align-items: center; z-index: 2000;
  border: none; box-shadow: none; margin:0;
}
.loading-overlay-fullpage p { font-size: 1.05rem; color: var(--gov-text-primary); margin-top: 1.25rem; font-weight: 500;}
.elegant-spinner { display: flex; }
.elegant-spinner div {
  width: 9px; height: 27px; background-color: var(--gov-primary-red);
  margin: 0 2.5px; border-radius: 2px; animation: elegantSpinnerStretch 1.2s infinite ease-in-out;
}
.elegant-spinner div:nth-child(2) { animation-delay: -1.1s; }
.elegant-spinner div:nth-child(3) { animation-delay: -1.0s; }
.elegant-spinner div:nth-child(4) { animation-delay: -0.9s; }
@keyframes elegantSpinnerStretch { 0%, 40%, 100% { transform: scaleY(0.4); } 20% { transform: scaleY(1.0); } }

.error-message.prominent-error {
  padding: 1.25rem; text-align: center; color: var(--gov-danger-red);
  border: 1px solid var(--gov-danger-red);
  border-left: 4px solid var(--gov-danger-red); background-color: var(--gov-primary-red-light-bg);
  display: flex; align-items: center; justify-content: center; flex-wrap: wrap; gap: 0.5rem;
}
.error-icon-large { font-size: 1.3rem; }
.retry-btn { margin-left: 0.75rem; padding: 0.3rem 0.7rem; font-size: 0.85rem; }
.retry-btn i { margin-right: 0.3em; }

/* Study Stats Summary Card */
.study-log-content-grid { display: grid; gap: 1.5rem; }
.study-stats-summary-card {
    background: var(--gov-background-white); padding: 1.5rem;
    border-radius: 6px; box-shadow: var(--gov-shadow-medium);
    border: 1px solid var(--gov-border-color);
    grid-column: 1 / -1;
}
.study-stats-grid {
  display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem; margin-bottom: 1.5rem;
}
.stat-item {
  background-color: var(--gov-background-light); padding: 1rem;
  border-radius: 4px; border: 1px solid var(--gov-border-color);
  text-align: center; transition: var(--gov-transition-default);
  box-shadow: var(--gov-shadow-soft);
}
.stat-item:hover { transform: translateY(-3px); box-shadow: var(--gov-shadow-medium); border-color: var(--gov-primary-red); }
.stat-icon { font-size: 1.5rem; color: var(--gov-primary-red); margin-bottom: 0.5rem; display: block; }
.stat-label { display: block; font-size: 0.85rem; color: var(--gov-text-secondary); margin-bottom: 0.25rem; font-weight: 500; }
.stat-value { display: block; font-size: 1.75rem; font-weight: 700; color: var(--gov-text-primary); line-height: 1.2; }
.total-stat-item { background-color: var(--gov-primary-red-light-bg); border-color: var(--gov-primary-red); }
.total-stat-item .stat-icon, .total-stat-item .stat-value { color: var(--gov-primary-red-dark); }
.today-online-stat {
  margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--gov-border-color);
  text-align: center; font-size: 0.95rem; color: var(--gov-text-secondary);
  display: flex; align-items: center; justify-content: center; gap: 0.5em; flex-wrap: wrap;
}
.online-icon { color: var(--gov-accent-gold); font-size: 1.1em;}
.online-duration-value { color: var(--gov-text-primary); font-weight: 600; }
.tooltip { font-size: 0.75rem; color: var(--gov-text-secondary); width: 100%; margin-top:0.2rem;}

/* Weekly Study Chart Card */
.weekly-chart-card { border-top: 4px solid var(--gov-accent-blue); }
.weekly-study-chart-container { margin-top: 0; }
.css-bar-chart { display: flex; height: 160px; align-items: flex-end; gap: 1px; border-bottom: 1px solid var(--gov-border-color-strong); padding-bottom: 0.25rem; position: relative;}
.chart-y-axis { display: flex; flex-direction: column; justify-content: space-between; height: 100%; font-size: 0.7rem; color: var(--gov-text-secondary); padding-right: 0.3rem; border-right: 1px solid var(--gov-border-color); text-align: right; }
.chart-bars { display: flex; flex-grow: 1; height: 100%; align-items: flex-end; justify-content: space-around; padding-left: 0.3rem;}
.bar-item-wrapper { display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; flex-basis: 13%;}
.bar { width: 70%; background: var(--gov-accent-blue); border-radius: 2px 2px 0 0; transition: height 0.4s ease-out, background-color 0.3s ease; position: relative; box-shadow: inset 0 -2px 5px rgba(0,0,0,0.1); }
.bar:hover { background: var(--gov-primary-red); }
.bar-label { font-size: 0.65rem; color: var(--gov-text-secondary); margin-top: 0.25rem; }

/* Study Log List Card */
.study-log-list-card { border-top: 4px solid var(--gov-secondary-gray); }
.study-log-container { max-height: 400px; overflow-y: auto; border: 1px solid var(--gov-border-color); border-radius: 4px; padding: 0.25rem; background-color: var(--gov-background-white); }
.fancy-scrollbar::-webkit-scrollbar { width: 6px; }
.fancy-scrollbar::-webkit-scrollbar-track { background: var(--gov-background-light); border-radius: 3px; }
.fancy-scrollbar::-webkit-scrollbar-thumb { background: var(--gov-border-color-strong); border-radius: 3px; }
.fancy-scrollbar::-webkit-scrollbar-thumb:hover { background: var(--gov-secondary-gray); }
.study-log-list-ul, .study-log-list-ul-inner { list-style: none; padding: 0; margin: 0; }
.study-log-item { display: flex; align-items: center; padding: 0.75rem 1rem; border-bottom: 1px solid var(--gov-border-color); font-size: 0.9rem; gap: 0.75rem; transition: background-color var(--gov-transition-default); opacity: 0; transform: translateX(-15px); animation: listItemFadeInRight 0.4s ease-out forwards var(--item-delay, 0s); }
@keyframes listItemFadeInRight { to { opacity: 1; transform: translateX(0); } }
.study-log-item:last-child { border-bottom: none; }
.study-log-item:hover { background-color: var(--gov-background-light); }
.activity-icon { font-size: 1.1em; color: var(--gov-secondary-gray); width: 20px; text-align:center; flex-shrink: 0; }
.activity-details { flex-grow: 1; }
.activity-name { font-weight: 500; color: var(--gov-text-primary); display: block; margin-bottom: 0.1rem;}
.timestamp { font-size: 0.75rem; color: var(--gov-text-secondary); }
.duration-badge { font-weight: 500; color: var(--gov-background-white); font-size: 0.8rem; background-color: var(--gov-secondary-gray); padding: 0.2em 0.5em; border-radius: 3px; white-space: nowrap; }
.study-log-item:hover .duration-badge { background-color: var(--gov-primary-red); }
.study-log-actions { margin-top: 1.25rem; text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 1em; }
.btn { padding: 0.4rem 0.9rem; font-size: 0.9rem; border-radius: 3px; border: 1px solid transparent; cursor: pointer; transition: var(--gov-transition-default); font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; }
.btn-danger { background-color: var(--gov-danger-red); border-color: var(--gov-danger-red); color: var(--gov-background-white); }
.btn-danger:hover:not(:disabled) { background-color: var(--gov-primary-red-dark); border-color: var(--gov-primary-red-dark); }
.btn-danger:disabled { background-color: #e9a3a3; border-color: #e9a3a3; cursor: not-allowed;}
.btn-secondary.retry-btn { background-color: var(--gov-secondary-gray); color: var(--gov-background-white); border-color: var(--gov-secondary-gray); }
.btn-secondary.retry-btn:hover { background-color: var(--gov-text-primary); border-color: var(--gov-text-primary); }
.btn-with-icon i { margin-right: 0.4em; }
.placeholder-icon-large { font-size: 2.5rem; color: var(--gov-border-color-strong); margin-bottom: 0.5rem;}
#study-log-list > .placeholder-text { padding: 2rem; border-style: dashed; background-color: var(--gov-background-light); }
.placeholder-text.small { font-size: 0.9em; padding: 1rem; background-color: transparent; border-style: dashed;}

/* Small Indicators/Errors */
.loading-indicator.small-indicator { display:flex; align-items:center; justify-content:center; font-size: 0.85em; padding: 0.75rem; gap: 0.5em; color: var(--gov-text-secondary); }
.spinner-small { display: flex; }
.spinner-small div { width: 5px; height: 15px; background-color: var(--gov-primary-red); margin: 0 1.5px; border-radius: 1px; animation: elegantSpinnerStretch 1.2s infinite ease-in-out; }
.spinner-small div:nth-child(2) { animation-delay: -1.1s; }
.spinner-small div:nth-child(3) { animation-delay: -1.0s; }
#study-log-list > .error-message.small-error { padding: 0.75rem; font-size: 0.85em; background-color: var(--gov-primary-red-light-bg); border: 1px dashed var(--gov-danger-red); color: var(--gov-danger-red);}
.study-log-actions .error-message.small-text-error { font-size: 0.8rem; color: var(--gov-danger-red); }

/* Responsive Adjustments */
@media (min-width: 1200px) {
  .study-log-content-grid { grid-template-columns: 1fr 1fr; }
  .study-stats-summary-card { grid-column: 1 / 2; }
  .weekly-chart-card { grid-column: 2 / 3; grid-row: 1 / 2; }
  .study-log-list-card { grid-column: 1 / -1; }
}
@media (max-width: 991px) {
  .study-log-content-grid { grid-template-columns: 1fr; }
}
@media (max-width: 767px) {
  .study-stats-grid { grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
  .stat-item { padding: 0.75rem; }
  .stat-value { font-size: 1.4rem; }
  .study-log-item { flex-direction: column; align-items: flex-start; gap: 0.3rem; padding: 0.75rem; }
  .activity-details { margin-bottom: 0.25rem; }
  .duration-badge { align-self: flex-start; margin-top: 0.25rem; }
  .study-log-actions { flex-direction: column; align-items: flex-end; gap: 0.75rem; }
  .weekly-study-chart-container { margin-top:1rem; padding-top:0.75rem;}
  .css-bar-chart {height: 140px;}
  .section-header h1 {font-size: 1.5rem;}
  .header-icon.animated-icon {font-size: 1.3rem;}
  .section-header p {font-size: 0.9rem;}
}
@media (max-width: 480px) {
    .study-stats-grid { grid-template-columns: 1fr; }
    .stat-item { padding: 0.75rem; }
    .stat-value { font-size: 1.3rem; }
    .activity-name { font-size: 0.85rem; }
    .timestamp, .duration-badge { font-size: 0.7rem; }
    .card-body {padding: 1rem;}
    .card-header {padding: 0.75rem 1rem;}
}
</style>