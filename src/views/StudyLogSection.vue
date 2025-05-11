<template>
  <div class="study-log-page-container">
    <header class="section-header">
      <h1><i class="fas fa-chart-pie icon-gradient"></i> 学习统计</h1>
      <p>回顾你的学习投入和效率。</p>
    </header>

    <!-- 加载状态 -->
    <div v-if="isLoading" class="loading-indicator card">加载统计数据中...</div>
    <!-- 错误状态 -->
    <div v-else-if="statsError || logError" class="error-message card">
      加载数据时出错: {{ statsError || logError || '未知错误' }}
    </div>

    <!-- 主要内容网格 -->
    <div v-else class="study-log-content-grid">
      <!-- 统计卡片 -->
      <div class="card study-stats-card">
        <h2><i class="fas fa-calendar-alt icon-gradient-secondary"></i> 学习时长概览 (来自番茄钟)</h2>
        <div class="study-stats-grid">
          <div class="stat-item">
            <span class="stat-label">今日学习</span>
            <span class="stat-value">{{ formatDuration(todayDurationSeconds) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">本周学习</span>
            <span class="stat-value">{{ formatDuration(weekDurationSeconds) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">本月学习</span>
            <span class="stat-value">{{ formatDuration(monthDurationSeconds) }}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">总计学习</span>
            <span class="stat-value">{{ formatDuration(totalDurationSeconds) }}</span>
          </div>
        </div>
        <!-- 今日在线时长 -->
        <div class="today-online-stat">
            <i class="fas fa-desktop"></i>
            今日在线活跃时长: <strong>{{ formatDuration(displayedOnlineSeconds) }}</strong>
            <span class="tooltip">根据页面活跃时间记录，与专注学习时长分开统计。</span>
        </div>
      </div>

      <!-- 日志列表卡片 -->
      <div class="card study-log-list-card">
        <h2><i class="fas fa-history icon-gradient-secondary"></i> 最近学习记录 (来自番茄钟)</h2>
        <div id="study-log-list" class="study-log-container">
          <div v-if="isLoadingLogs" class="loading-indicator small-indicator">加载日志列表...</div>
          <div v-else-if="logError" class="error-message small-error">加载日志失败: {{ logError }}</div>
          <p v-else-if="logs.length === 0" class="placeholder-text">暂无学习记录。</p>
          <ul v-else class="study-log-list-ul">
            <li v-for="item in logs" :key="item.id" class="study-log-item">
              <span class="activity">{{ item.activity || '专注学习' }}</span>
              <div class="details">
                <span class="duration">{{ formatDuration(item.durationSeconds) }}</span>
                <span class="timestamp" :title="formatTimestamp(item.startTime, 'yyyy-MM-dd HH:mm')">
                  ({{ formatTimestamp(item.startTime, 'yyyy年MM月dd日 HH:mm') }} - {{ formatTimestamp(item.endTime, 'HH:mm') }})
                </span>
              </div>
            </li>
          </ul>
        </div>
        <div class="study-log-actions">
          <button @click="clearLogsHandler" class="btn btn-danger btn-small" :disabled="isLoading || logs.length === 0">
            <i class="fas fa-trash-alt"></i> 清空所有记录
          </button>
          <span v-if="clearError" class="error-message small">{{ clearError }}</span>
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

// --- Store 实例和状态 ---
const studyLogStore = useStudyLogStore();
const {
  logs,
  logError,
  statsError,
  totalDurationSeconds,
  todayDurationSeconds,
  weekDurationSeconds,
  monthDurationSeconds,
  todayOnlineSeconds, // 后端持久化的今日在线总秒数 (基础值)
  isLoadingLogs,
  isLoadingStats
} = storeToRefs(studyLogStore);

const isLoading = computed(() => studyLogStore.isLoading); // isLoading is a computed in store
const appStore = useAppStore();

// --- localStorage Keys (revised for clarity and date handling) ---
// Added _v2 to keys to avoid potential conflicts if old keys are still in user's localStorage
const LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT = 'gwy_today_online_increment_v2';
const LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE = 'gwy_today_increment_last_update_v2';
const LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE = 'gwy_today_increment_date_v2'; // Stores YYYY-MM-DD

// --- 本地状态：用于实时计时器 ---
const secondsSinceStatsUpdate = ref(0); // 本地增量计时器
const localTimerId = ref(null);
const clearError = ref(null);

// --- 计算属性：用于最终显示的时长 ---
const displayedOnlineSeconds = computed(() => {
  const baseSeconds = Number(todayOnlineSeconds.value) || 0;
  const incrementSeconds = Number(secondsSinceStatsUpdate.value) || 0;
  return baseSeconds + incrementSeconds;
});

// Helper to get current date as YYYY-MM-DD string
function getCurrentDateString() {
  return new Date().toISOString().split('T')[0];
}

// --- 方法 ---
async function clearLogsHandler() {
  clearError.value = null;
  if (confirm('确定要清空所有学习记录吗？此操作无法撤销。')) {
    const success = await studyLogStore.clearAllLogs();
    if (!success) {
      clearError.value = studyLogStore.logError || studyLogStore.statsError || '清空日志失败。';
    } else {
      alert('学习记录已清空！');
      secondsSinceStatsUpdate.value = 0;
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
      // Date key can remain, as it will be for "today" with 0 increment.
    }
  }
}

// --- 生命周期钩子 ---
onMounted(async () => { // Make onMounted async for store actions
  // --- 1. Restore Local Online Time Increment (Today's Increment) ---
  const currentDateStr = getCurrentDateString();
  const storedDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE);

  if (storedDateStr === currentDateStr) {
    // It's today, try to load the increment
    const storedIncrementString = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
    if (storedIncrementString !== null) {
      const storedIncrement = parseInt(storedIncrementString, 10);
      if (!isNaN(storedIncrement) && storedIncrement >= 0) {
        secondsSinceStatsUpdate.value = storedIncrement;
        console.log(`[StudyLogSection] Loaded 'today' increment from localStorage: ${storedIncrement}s for date ${currentDateStr}`);
      } else {
        // Invalid stored number, treat as 0
        secondsSinceStatsUpdate.value = 0;
        localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT); // Clean up
      }
    } else {
      // No increment stored for today, start from 0
      secondsSinceStatsUpdate.value = 0;
    }
  } else {
    // Stored data is not for today (or no date stored), reset everything for today
    console.log('[StudyLogSection] No valid increment for today in localStorage, or date mismatch. Starting from 0.');
    secondsSinceStatsUpdate.value = 0;
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
    // Set the date to today for future saves
    localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE, currentDateStr);
  }

  // --- 2. Fetch Study Log Stats and Logs from Store ---
  // Ensures data is loaded/updated when component mounts.
  // These calls should ideally be idempotent in your store or handled by store's own logic
  // (e.g., not re-fetching if data is fresh or already loading).
  try {
    if (!studyLogStore.isLoadingStats) { // Avoid re-fetching if already in progress by store
        // Heuristic: if totalDurationSeconds is undefined, it likely hasn't been loaded.
        // Adjust this condition based on your store's default state for these values.
        if (typeof studyLogStore.totalDurationSeconds === 'undefined' && !studyLogStore.statsError) {
            console.log('[StudyLogSection] Attempting to load activity stats from studyLogStore.');
            await studyLogStore.loadActivityStats(); // ASSUMPTION: this action exists in your store
        }
    }
    if (!studyLogStore.isLoadingLogs) { // Avoid re-fetching if already in progress
        if (studyLogStore.logs.length === 0 && !studyLogStore.logError) { // Heuristic: no logs and no error
            console.log('[StudyLogSection] Attempting to load logs from studyLogStore.');
            await studyLogStore.loadLogs(); // ASSUMPTION: this action exists in your store
        }
    }
  } catch (e) {
      console.error("[StudyLogSection] Error during initial data load from store:", e);
      // Handle store loading errors if necessary, though store itself should set its error state
  }


  // --- 3. Start Local Timer for Online Time ---
  if (localTimerId.value) { // Clear any existing timer
    clearInterval(localTimerId.value);
  }

  localTimerId.value = setInterval(() => {
    const currentTime = Date.now();
    const timerCurrentDateStr = new Date(currentTime).toISOString().split('T')[0];
    const lsDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE);

    // Check if the day has changed while the timer is running
    if (timerCurrentDateStr !== lsDateStr) {
      console.log('[StudyLogSection] Day changed. Resetting online increment for new day.');
      secondsSinceStatsUpdate.value = 0; // Reset for the new day
      localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE, timerCurrentDateStr);
      // Clear old day's increment and last update, new ones will be set below if active
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
      localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
    }

    const lastActivity = appStore.persistentActivityData?.lastActivityTimestamp || currentTime;
    const inactivityTimeout = config.INACTIVITY_TIMEOUT_MS || 15 * 60 * 1000; // 15 minutes default

    if (currentTime - lastActivity <= inactivityTimeout) {
      secondsSinceStatsUpdate.value++;
      // Update localStorage periodically (e.g., every 5 seconds)
      if (secondsSinceStatsUpdate.value % 5 === 0) {
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT, secondsSinceStatsUpdate.value.toString());
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE, currentTime.toString());
        // Ensure date is also current (important if day changed)
        localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE, timerCurrentDateStr);
      }
    }
  }, 1000);
});

onUnmounted(() => {
  if (localTimerId.value) {
    clearInterval(localTimerId.value);
    localTimerId.value = null;
  }
  // Save current increment to localStorage on unmount
  if (typeof secondsSinceStatsUpdate.value === 'number' && secondsSinceStatsUpdate.value >= 0) {
    const currentDateStr = getCurrentDateString();
    localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT, secondsSinceStatsUpdate.value.toString());
    localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE, Date.now().toString());
    localStorage.setItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE, currentDateStr); // Ensure date is saved
    console.log(`[StudyLogSection] Unmounted. Saved increment to localStorage: ${secondsSinceStatsUpdate.value}s for date ${currentDateStr}`);
  } else {
    // If value is invalid for some reason, clear related keys for today to prevent loading bad data next time
    const currentDateStr = getCurrentDateString();
    const storedDateStr = localStorage.getItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE);
    if (storedDateStr === currentDateStr) { // Only clear if it's for today's invalid data
        localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
        localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
    }
  }
});

// --- 监听器 ---
watch(todayOnlineSeconds, (newValue, oldValue) => {
  // React if the value actually changed from its previous state in the store.
  if (newValue !== oldValue) {
    console.log(`[StudyLogSection] Backend 'todayOnlineSeconds' updated from ${oldValue} to ${newValue}. Resetting local counter.`);
    secondsSinceStatsUpdate.value = 0;
    // The local increment is now "stale" as it's based on the old backend base value.
    // Clear localStorage increment for today. The timer will repopulate it starting from 0.
    // The date key (LOCAL_STORAGE_KEY_TODAY_INCREMENT_DATE) should remain, as it's still today.
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_ONLINE_INCREMENT);
    localStorage.removeItem(LOCAL_STORAGE_KEY_TODAY_INCREMENT_LAST_UPDATE);
  }
}, { immediate: false }); // immediate: false is generally correct here.
</script>

<style scoped>
/* Styles remain the same as the previous optimized version */
.study-log-page-container {}
.study-log-content-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; margin-top: 1rem; }
.section-header h1 i.icon-gradient { background: var(--gradient-study); -webkit-background-clip: text; background-clip: text; color: transparent; }
.study-stats-card { border-left: 4px solid var(--study-color); }
.study-stats-card h2 { margin-bottom: 1.5rem; }
.study-stats-card h2 i.icon-gradient-secondary { background: var(--gradient-secondary); -webkit-background-clip: text; background-clip: text; color: transparent; }
.study-stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 1rem; text-align: center; }
.stat-item { background-color: #f8faff; padding: 1rem 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); }
.stat-label { display: block; font-size: 0.85em; color: var(--text-light); margin-bottom: 0.5rem; font-weight: 500; }
.stat-value { display: block; font-size: 1.5rem; font-weight: 700; color: var(--study-color); }
.today-online-stat { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--border-color); text-align: center; font-size: 0.95em; color: var(--text-light); display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;}
.today-online-stat i { margin-right: 0.5em; color: var(--info-color); }
.today-online-stat strong { color: var(--text-color); font-weight: 600; }
.today-online-stat .tooltip { display: inline-block; font-size: 0.8em; font-style: italic; margin-top: 0.3em; cursor: default; }
.study-log-list-card { border-left: 4px solid var(--secondary-color); }
.study-log-list-card h2 i.icon-gradient-secondary { background: var(--gradient-info); -webkit-background-clip: text; background-clip: text; color: transparent; }
.study-log-container { margin-top: 1rem; max-height: 450px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 0; background-color: #fff; }
.study-log-list-ul { list-style: none; padding: 0; margin: 0; }
.study-log-item { display: flex; justify-content: space-between; align-items: center; padding: 0.9rem 1.2rem; border-bottom: 1px solid #f0f4f8; font-size: 0.95rem; gap: 1rem; }
.study-log-item:last-child { border-bottom: none; }
.study-log-item:hover { background-color: #fdfdff; }
.study-log-item .activity { font-weight: 600; color: var(--text-color); word-break: break-word; flex-grow: 1; margin-right: 1rem; }
.study-log-item .details { display: flex; flex-direction: column; align-items: flex-end; text-align: right; flex-shrink: 0; white-space: nowrap; }
.study-log-item .duration { font-weight: 500; color: var(--study-color); font-size: 0.9em; }
.study-log-item .timestamp { font-size: 0.8em; color: var(--text-light); margin-top: 0.2rem; cursor: default; }
.study-log-actions { margin-top: 1rem; text-align: right; display: flex; justify-content: flex-end; align-items: center; gap: 1em; }
.error-message.small { font-size: 0.8em; color: var(--danger-color); }
.placeholder-text { color: var(--text-light); text-align: center; padding: 2rem; font-style: italic; }
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.loading-indicator.small-indicator, .error-message.small-error { padding: 1rem; font-size: 0.9em; }
@media (max-width: 992px) { .study-log-content-grid { grid-template-columns: 1fr; } .study-stats-grid { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 768px) { .study-stats-grid { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); } .stat-value { font-size: 1.4rem; } .study-log-item { flex-direction: column; align-items: flex-start; gap: 0.3rem; padding: 0.8rem 1rem; } .study-log-item .details { align-items: flex-start; text-align: left; margin-top: 0.5rem; } .study-log-item .timestamp { margin-top: 0.1rem; } .study-log-actions { flex-direction: column; align-items: flex-end; gap: 0.5rem; } .error-message.small { margin-left: 0; } }
</style>