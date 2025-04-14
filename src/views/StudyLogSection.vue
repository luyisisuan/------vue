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
             今日在线活跃时长: <strong>{{ formatDuration(todayOnlineSeconds) }}</strong>
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
                <span class="timestamp" :title="formatTimestamp(item.startTime, 'yyyy-MM-dd HH:mm')">
                   ({{ formatTimestamp(item.startTime, 'HH:mm') }} - {{ formatTimestamp(item.endTime, 'HH:mm') }})
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
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { formatDuration, formatTimestamp } from '@/utils/formatters.js';

// Store
const studyLogStore = useStudyLogStore();
const {
  logs,
  isLoading, // Combined loading state
  // error, // General error (can use specific ones below)
  logError,  // Specific error for log operations
  statsError,// Specific error for stats loading
  // Use state refs directly for stats as getters were removed/simplified
  totalDurationSeconds,
  todayDurationSeconds,
  weekDurationSeconds,
  monthDurationSeconds,
  todayOnlineSeconds // Get today's online time state
} = storeToRefs(studyLogStore);

// Local State
const clearError = ref(null); // Error specific to the clear action

// Methods
async function clearLogsHandler() {
  clearError.value = null;
  if (confirm('确定要清空所有学习记录吗？此操作无法撤销。')) {
    const success = await studyLogStore.clearAllLogs();
    if (!success) {
      // Use the specific logError if available
      clearError.value = studyLogStore.logError || '清空日志失败。';
    } else {
      alert('学习记录已清空！');
    }
  }
}

// formatDuration and formatTimestamp are available in the template via imports
</script>

<style scoped>
/* Styles remain the same as the previous optimized version */
/* ... Paste the full CSS from the previous response here ... */
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
.today-online-stat { margin-top: 1.5rem; padding-top: 1rem; border-top: 1px dashed var(--border-color); text-align: center; font-size: 0.95em; color: var(--text-light); }
.today-online-stat i { margin-right: 0.5em; color: var(--info-color); }
.today-online-stat strong { color: var(--text-color); font-weight: 600; }
.today-online-stat .tooltip { display: block; font-size: 0.8em; font-style: italic; margin-top: 0.3em; }
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