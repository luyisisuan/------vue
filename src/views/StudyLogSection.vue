<template>
  <div class="study-log-page-container">
    <header class="section-header">
      <h1><i class="fas fa-chart-pie icon-gradient"></i> 学习统计</h1>
      <p>回顾你的学习投入和效率。</p>
    </header>

    <div v-if="isLoading" class="loading-indicator card">加载中...</div>
    <div v-else-if="error" class="error-message card" style="color: red;">错误: {{ error }}</div>

    <div v-else class="study-log-content-grid">
      <!-- 统计数据区域 -->
      <div class="card study-stats-card">
        <h2><i class="fas fa-calendar-alt icon-gradient-secondary"></i> 学习时长概览</h2>
        <div class="study-stats-grid">
          <div class="stat-item">
            <span class="stat-label">今日总时长</span>
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
      </div>

      <!-- 最近日志列表 -->
      <div class="card study-log-list-card">
        <h2><i class="fas fa-history icon-gradient-secondary"></i> 最近学习记录</h2>
        <div id="study-log-list" class="study-log-container">
          <p v-if="logs.length === 0" class="placeholder-text">暂无学习记录。</p>
          <ul v-else class="study-log-list-ul">
            <li v-for="item in logs" :key="item.id" class="study-log-item">
              <span class="activity">{{ item.activity || '专注学习' }}</span>
              <div class="details">
                <span class="duration">{{ formatDuration((parseISO(item.endTime) - parseISO(item.startTime)) / 1000) }}</span>
                <span class="timestamp">
                  ({{ formatTimestamp(item.startTime, 'HH:mm') }} - {{ formatTimestamp(item.endTime, 'HH:mm') }})
                  <span class="date-tooltip">{{ formatTimestamp(item.startTime, 'yyyy-MM-dd') }}</span>
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
import { parseISO } from 'date-fns';

const studyLogStore = useStudyLogStore();
const {
  logs,
  isLoading,
  error,
  totalDurationSeconds,
  todayDurationSeconds,
  weekDurationSeconds,
  monthDurationSeconds
} = storeToRefs(studyLogStore);

const clearError = ref(null);

async function clearLogsHandler() {
  clearError.value = null;
  if (confirm('确定要清空所有学习记录吗？此操作无法撤销。')) {
    const success = await studyLogStore.clearAllLogs();
    if (!success) {
      clearError.value = studyLogStore.error || '清空日志失败，请稍后重试。';
    } else {
      alert('学习记录已清空！');
    }
  }
}
</script>

<style scoped>
/* --- Study Log Page Layout --- */
.study-log-page-container {
    /* Optional: Add padding or max-width for the whole page */
}

/* --- Main Content Grid --- */
.study-log-content-grid {
    display: grid;
    /* Define grid columns - adjust as needed */
    /* Example: Two columns, stats taking less space */
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); /* Default: Auto fit */
    /* Example: grid-template-columns: 1fr 2fr; /* Stats | Logs */
    gap: 1.5rem; /* Gap between grid items */
    margin-top: 1rem;
}

/* --- Section Header (Assume global) --- */
.section-header h1 i.icon-gradient {
    background: var(--gradient-study);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

/* --- Statistics Card --- */
.study-stats-card {
    border-left: 4px solid var(--study-color);
    /* Grid placement (optional) */
    /* grid-column: 1 / 2; */
}
.study-stats-card h2 i.icon-gradient-secondary { /* Icon color */
     background: var(--gradient-secondary); /* Or var(--gradient-study) */
    -webkit-background-clip: text; background-clip: text; color: transparent;
}
.study-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Adjust min width */
    gap: 1rem; /* Gap between stat items */
    text-align: center;
    margin-top: 1rem;
}
.stat-item {
    background-color: #f8faff;
    padding: 1rem 0.5rem; /* Adjust padding */
    border-radius: 8px;
    border: 1px solid var(--border-color);
}
.stat-label {
    display: block; font-size: 0.85em; color: var(--text-light);
    margin-bottom: 0.5rem; font-weight: 500;
}
.stat-value {
    display: block; font-size: 1.5rem; /* Slightly smaller */
    font-weight: 700; color: var(--study-color);
}

/* --- Log List Card --- */
.study-log-list-card {
    border-left: 4px solid var(--secondary-color);
    /* Grid placement (optional) */
    /* grid-column: 2 / 3; */
}
.study-log-list-card h2 i.icon-gradient-secondary { /* Icon color */
     background: var(--gradient-info); /* Example: Different color */
    -webkit-background-clip: text; background-clip: text; color: transparent;
}

.study-log-container {
    margin-top: 1rem;
    max-height: 450px; /* Adjust height */
    overflow-y: auto;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0; /* Remove padding here, add to list items */
    background-color: #fff;
}

/* Log list UL */
.study-log-list-ul {
    list-style: none;
    padding: 0;
    margin: 0;
}

/* Individual log item */
.study-log-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.9rem 1.2rem; /* Add padding here */
    border-bottom: 1px solid #f0f4f8;
    font-size: 0.95rem;
    gap: 1rem;
}
.study-log-item:last-child { border-bottom: none; }
.study-log-item:hover { background-color: #fdfdff; } /* Subtle hover */

.study-log-item .activity {
    font-weight: 600; /* Make activity bolder */
    color: var(--text-color);
    word-break: break-word;
    flex-grow: 1; /* Allow activity to take space */
    margin-right: 1rem; /* Add space between activity and details */
}

/* Container for duration and time range */
.study-log-item .details {
    display: flex;
    flex-direction: column; /* Stack duration and time */
    align-items: flex-end; /* Align right */
    text-align: right;
    flex-shrink: 0; /* Prevent shrinking */
    white-space: nowrap;
}

.study-log-item .duration {
    font-weight: 500; /* Regular weight */
    color: var(--study-color);
    font-size: 0.9em; /* Slightly smaller */
}

.study-log-item .timestamp {
    font-size: 0.8em; /* Even smaller */
    color: var(--text-light);
    margin-top: 0.2rem; /* Space between duration and time */
    position: relative; /* For tooltip positioning */
}
/* Simple tooltip for date on hover */
.study-log-item .date-tooltip {
    visibility: hidden;
    width: max-content; /* Adjust width based on content */
    background-color: #555;
    color: #fff;
    text-align: center;
    border-radius: 6px;
    padding: 5px 8px;
    position: absolute;
    z-index: 1;
    bottom: 125%; /* Position above the timestamp */
    left: 50%;
    margin-left: -40px; /* Center the tooltip (adjust if needed) */
    opacity: 0;
    transition: opacity 0.3s;
    font-size: 0.9em; /* Tooltip font size */
}
.study-log-item .timestamp:hover .date-tooltip {
    visibility: visible;
    opacity: 1;
}


/* Log Actions */
.study-log-actions {
     margin-top: 1rem;
     text-align: right;
     display: flex;
     justify-content: flex-end;
     align-items: center;
     gap: 1em;
}
.error-message.small { /* Style for clear error */
     font-size: 0.8em;
     color: var(--danger-color);
}

/* Placeholder and Loading/Error */
.placeholder-text { color: var(--text-light); text-align: center; padding: 2rem; font-style: italic; }
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }


/* --- Responsive Adjustments --- */
@media (max-width: 992px) { /* Larger tablets / smaller desktops */
    .study-log-content-grid {
        grid-template-columns: 1fr; /* Stack cards vertically */
    }
    .study-stats-grid {
        grid-template-columns: repeat(2, 1fr); /* Stats in 2 columns */
    }
}

@media (max-width: 768px) { /* Mobile */
    .study-stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* Keep auto-fit for smaller */
    }
    .stat-value { font-size: 1.4rem; }

    .study-log-item {
        /* Keep stacked layout from previous version or adjust */
        flex-direction: column;
        align-items: flex-start;
        gap: 0.3rem;
        padding: 0.8rem 1rem; /* Adjust padding */
    }
    .study-log-item .details {
        align-items: flex-start; /* Align details left */
        text-align: left;
        margin-top: 0.5rem; /* Add space after activity */
    }
     .study-log-item .timestamp {
        margin-top: 0.1rem; /* Reduce space */
     }
     /* Adjust tooltip position for mobile */
     .study-log-item .timestamp:hover .date-tooltip {
         left: 0;
         margin-left: 0;
         bottom: 130%; /* Adjust vertical position */
     }

    .study-log-actions {
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
    }
}
</style>