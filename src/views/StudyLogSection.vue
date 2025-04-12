<!-- src/views/StudyLogSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-chart-pie icon-gradient"></i> 学习统计</h1>
      <p>回顾你的学习投入和效率。</p>
    </header>

     <!-- 显示加载或错误状态 -->
     <div v-if="isLoading" class="loading-indicator card">加载中...</div>
     <div v-else-if="error" class="error-message card" style="color: red;">错误: {{ error }}</div>

    <!-- 统计数据卡片 -->
    <div v-else class="card study-stats-card"> <!-- Added specific class -->
      <h2><i class="fas fa-calendar-alt icon-gradient-secondary"></i> 学习时长概览</h2>
      <div class="study-stats-grid">
        <div class="stat-item">
          <span class="stat-label">今日总时长</span>
           <!-- 使用 getter 和 formatDuration -->
          <span class="stat-value" id="stat-today-duration">{{ formatDuration(todayDurationSeconds) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本周总时长</span>
          <span class="stat-value" id="stat-week-duration">{{ formatDuration(weekDurationSeconds) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本月总时长</span>
          <span class="stat-value" id="stat-month-duration">{{ formatDuration(monthDurationSeconds) }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总计学习时长</span>
          <span class="stat-value" id="stat-total-duration">{{ formatDuration(totalDurationSeconds) }}</span>
        </div>
      </div>
      <!-- Placeholder for future chart -->
      <!-- <div id="study-chart-container" style="height: 300px; margin-top: 2rem; background: #f0f0f0; display:flex; align-items:center; justify-content:center; color: #aaa;">图表区域 (待开发)</div> -->
    </div>

    <!-- 最近学习记录卡片 -->
     <div v-if="!isLoading && !error" class="card study-log-list-card"> <!-- Added specific class -->
      <h2><i class="fas fa-history icon-gradient-secondary"></i> 最近学习记录</h2>
      <div id="study-log-list" class="study-log-container">
         <!-- 无数据提示 -->
        <p v-if="logs.length === 0" class="placeholder-text">暂无学习记录。完成番茄钟工作周期会自动记录。</p>
         <!-- 列表渲染 -->
        <div v-else>
           <!-- v-for 遍历 store state -->
          <div class="study-log-item" v-for="item in logs" :key="item.id">
            <span class="activity">{{ item.activity || '专注学习' }}</span>
             <!-- 使用 formatDuration -->
            <span class="duration">{{ formatDuration(item.durationSeconds) }}</span>
             <!-- 使用 formatTimestamp -->
            <span class="timestamp">{{ formatTimestamp(item.startTime) }}</span>
          </div>
        </div>
      </div>
      <!-- 清空按钮 -->
      <div class="study-log-actions">
        <button @click="clearLogsHandler" class="btn btn-danger btn-small" :disabled="isLoading || logs.length === 0">
          <i class="fas fa-trash-alt"></i> 清空所有学习记录
        </button>
         <!-- 显示清空时的错误 -->
         <span v-if="clearError" class="error-message small" style="margin-left: 1em;">{{ clearError }}</span>
      </div>
    </div>

    <!-- Optional: Manual Add Form (Remove or keep as is, requires separate logic) -->
    <!-- ... -->
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'; // Removed onMounted
import { storeToRefs } from 'pinia';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
// 导入格式化函数
import { formatDuration, formatTimestamp } from '@/utils/formatters.js'; // 需要创建 formatters.js

// --- Store ---
const studyLogStore = useStudyLogStore();
// 获取响应式 state 和 getters
const {
  logs,
  isLoading,
  error, // Loading/error for fetching logs
  totalDurationSeconds,
  todayDurationSeconds,
  weekDurationSeconds,
  monthDurationSeconds
} = storeToRefs(studyLogStore);

// --- 本地状态 ---
const clearError = ref(null); // 用于显示清空操作的错误

// --- 方法 ---
async function clearLogsHandler() {
  clearError.value = null; // 清除旧错误
  if (confirm('确定要清空所有学习记录吗？此操作无法撤销。')) {
    const success = await studyLogStore.clearAllLogs();
    if (!success) {
      // 如果 store action 返回 false 或设置了 error ref
      clearError.value = studyLogStore.error || '清空日志失败，请稍后重试。';
    } else {
        alert('学习记录已清空！');
    }
  }
}

// --- 导出 ---
// 导出格式化函数供模板使用
//export { formatDuration, formatTimestamp };

</script>

<style scoped>
/* --- Study Log Specific Styles --- */
.study-stats-card { /* Card for stats */
     border-left: 4px solid var(--study-color);
}
.study-log-list-card { /* Card for log list */
     border-left: 4px solid var(--secondary-color); /* Different color */
}


.study-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 1.5rem;
    text-align: center;
    margin-top: 1rem; /* Space above stats */
}
.stat-item {
    background-color: #f8faff; /* Light background for each stat */
    padding: 1rem;
    border-radius: 8px;
    border: 1px solid var(--border-color);
}
.stat-label {
    display: block;
    font-size: 0.9em;
    color: var(--text-light);
    margin-bottom: 0.5rem;
    font-weight: 500;
}
.stat-value {
    display: block;
    font-size: 1.6rem;
    font-weight: 700;
    color: var(--study-color); /* Use study color for value */
}

/* Log list container */
.study-log-container {
    margin-top: 1.5rem;
    max-height: 400px; /* Limit height and make scrollable */
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.5rem; /* Padding inside the scrollable area */
    background-color: #fff; /* White background */
}

.study-log-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.8rem 1rem; /* Padding for each item */
    border-bottom: 1px solid #f0f4f8; /* Lighter separator */
    font-size: 0.95rem;
    gap: 1rem;
}
.study-log-item:last-child {
    border-bottom: none;
}
.study-log-item:nth-child(even) {
     background-color: #fdfdff; /* Subtle striping */
}
.study-log-item .activity {
    flex-grow: 1;
    font-weight: 500;
    color: var(--text-color);
    word-break: break-word; /* Wrap long activity names */
}
.study-log-item .duration {
    font-weight: 600;
    color: var(--study-color);
    white-space: nowrap; /* Keep duration on one line */
    min-width: 70px;
    text-align: right;
}
.study-log-item .timestamp {
    font-size: 0.85em;
    color: var(--text-light);
    white-space: nowrap;
    min-width: 130px; /* Ensure space for timestamp */
    text-align: right;
}

/* Actions below the list */
.study-log-actions {
     margin-top: 1rem;
     text-align: right; /* Align button right */
     display: flex; /* Use flex for aligning error message */
     justify-content: flex-end;
     align-items: center;
     gap: 1em;
}
/* Error message style */
.error-message.small {
     font-size: 0.8em;
     color: var(--danger-color);
     /* margin-left: 1em; */ /* Handled by gap */
}

/* Placeholder text */
.placeholder-text {
    color: var(--text-light);
    text-align: center;
    padding: 2rem;
    font-style: italic;
}

/* Loading indicator */
.loading-indicator {
    text-align: center;
    padding: 1rem;
    color: var(--text-light);
}

/* Responsive Adjustments */
@media (max-width: 768px) {
    .study-stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
        gap: 1rem;
    }
    .stat-value { font-size: 1.4rem; }

    .study-log-item {
        /* Stack items vertically on mobile */
        flex-direction: column;
        align-items: flex-start; /* Align left */
        gap: 0.3rem;
        padding: 0.8rem;
    }
    .study-log-item .timestamp {
        order: 3; /* Put time last */
        font-size: 0.8em;
        min-width: unset; /* Remove min-width */
        text-align: left; /* Align left */
    }
    .study-log-item .duration {
        order: 2;
        min-width: unset;
        text-align: left;
    }
    .study-log-item .activity { order: 1; }

    .study-log-actions {
        flex-direction: column; /* Stack button and message */
        align-items: flex-end; /* Align right */
        gap: 0.5rem;
    }
    .error-message.small { margin-left: 0; }
}

/* Header icon style (if needed) */
.section-header i.icon-gradient {
    background: var(--gradient-study); /* Use study gradient */
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-size: 1.5em;
}
</style>