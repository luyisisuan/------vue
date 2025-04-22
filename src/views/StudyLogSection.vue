<!-- src/views/StudyLogSection.vue -->
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
           <!-- 列表区域也检查加载和错误状态 -->
          <div v-if="isLoading" class="loading-indicator small-indicator">加载日志列表...</div>
          <div v-else-if="logError" class="error-message small-error">加载日志失败: {{ logError }}</div>
          <p v-else-if="logs.length === 0" class="placeholder-text">暂无学习记录。</p>
          <ul v-else class="study-log-list-ul">
            <li v-for="item in logs" :key="item.id" class="study-log-item">
              <span class="activity">{{ item.activity || '专注学习' }}</span>
              <div class="details">
                <span class="duration">{{ formatDuration(item.durationSeconds) }}</span>
                <!-- ****** 这里是修改后的时间格式 ****** -->
                <span class="timestamp" :title="formatTimestamp(item.startTime, 'yyyy-MM-dd HH:mm')">
                   ({{ formatTimestamp(item.startTime, 'yyyy年MM月dd日 HH:mm') }} - {{ formatTimestamp(item.endTime, 'HH:mm') }})
                </span>
                <!-- ************************************* -->
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
// 导入 Vue 相关函数和 Pinia/工具函数
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { useAppStore } from '@/stores/appStore.js'; // <<< 导入 appStore
import config from '@/config.js'; // <<< 导入 config
import { formatDuration, formatTimestamp } from '@/utils/formatters.js';

// --- Store 实例和状态 ---
const studyLogStore = useStudyLogStore();
const {
  logs,
  isLoading,
  logError,
  statsError,
  totalDurationSeconds,
  todayDurationSeconds,
  weekDurationSeconds,
  monthDurationSeconds,
  todayOnlineSeconds // <<< 后端持久化的今日在线总秒数 (基础值)
} = storeToRefs(studyLogStore);

const appStore = useAppStore(); // <<< 获取 appStore 实例

// --- 本地状态：用于实时计时器 ---
const secondsSinceStatsUpdate = ref(0); // 本地计时器：自上次 stats 更新后增加的秒数
const localTimerId = ref(null); // 存储本地 setInterval 的 ID
const clearError = ref(null); // 清空日志时的错误状态

// --- 计算属性：用于最终显示的时长 ---
// 计算最终显示的总在线秒数 = 后端基础值 + 本地增量
const displayedOnlineSeconds = computed(() => {
  // 确保基础值有效，否则视为 0
  const baseSeconds = Number(todayOnlineSeconds.value) || 0;
  return baseSeconds + secondsSinceStatsUpdate.value;
});

// --- 方法 ---
// 清空日志处理函数
async function clearLogsHandler() {
  clearError.value = null;
  if (confirm('确定要清空所有学习记录吗？此操作无法撤销。')) {
    const success = await studyLogStore.clearAllLogs();
    if (!success) {
      clearError.value = studyLogStore.logError || '清空日志失败。';
    } else {
      alert('学习记录已清空！');
      // 清空成功后，本地计数器也应重置 (因为 todayOnlineSeconds 也会变为 0)
      secondsSinceStatsUpdate.value = 0;
    }
  }
}

// --- 生命周期钩子 ---
onMounted(() => {
  // 组件挂载时，启动本地计时器
  if (localTimerId.value) {
    clearInterval(localTimerId.value); // 清除可能存在的旧计时器
  }

  localTimerId.value = setInterval(() => {
    // 每秒钟检查一次用户是否活跃
    const now = Date.now();
    // 直接访问 appStore 实例的响应式数据来获取最新的 lastActivityTimestamp
    // 需要确保 appStore 已经被初始化 (在 App.vue 中 startOnlineTracking 被调用)
    const lastActivity = appStore.persistentActivityData?.lastActivityTimestamp || now;

    // 使用 config.js 中的非活跃超时时间判断 (默认为 15 分钟)
    if (now - lastActivity <= config.INACTIVITY_TIMEOUT_MS) {
      // 如果用户活跃，本地计时器加 1 秒
      secondsSinceStatsUpdate.value++;
    }
    // 如果不活跃，则不增加秒数
  }, 1000); // 每 1 秒执行一次
});

onUnmounted(() => {
  // 组件卸载时，清除本地计时器，防止内存泄漏
  if (localTimerId.value) {
    clearInterval(localTimerId.value);
    localTimerId.value = null;
  }
});

// --- 监听器 ---
// 监听 studyLogStore 中来自后端的 todayOnlineSeconds (基础值) 的变化
watch(todayOnlineSeconds, (newValue, oldValue) => {
  // 当基础值从后端更新时 (通常意味着 loadActivityStats 被调用了)
  // 且新旧值不同时，重置本地的增量计时器
  if (newValue !== oldValue) {
    console.log(`[StudyLogSection] Backend todayOnlineSeconds updated from ${oldValue} to ${newValue}. Resetting local counter.`);
    secondsSinceStatsUpdate.value = 0;
  }
});

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
.today-online-stat { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--border-color); text-align: center; font-size: 0.95em; color: var(--text-light); display: flex; align-items: center; justify-content: center; gap: 8px; flex-wrap: wrap;} /* Added flex for better alignment */
.today-online-stat i { margin-right: 0.5em; color: var(--info-color); }
.today-online-stat strong { color: var(--text-color); font-weight: 600; }
.today-online-stat .tooltip { display: inline-block; font-size: 0.8em; font-style: italic; margin-top: 0.3em; cursor: default; } /* Use inline-block for better flow */
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