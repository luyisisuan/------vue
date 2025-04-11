<!-- src/views/DashboardSection.vue -->
<template>
  <div>
    <!-- Section Header (使用全局样式) -->
    <header class="section-header">
      <h1><i class="fas fa-tachometer-alt icon-gradient"></i> 导航栏概览</h1>
      <p>欢迎回来，段绪程！</p>
    </header>

    <!-- 信息高亮卡片 -->
    <div class="info-highlight-card">
      <!-- 考生信息 -->
      <div class="info-item">
        <i class="fas fa-user-graduate"></i>
        <div>
          <strong>考生:</strong> 段绪程 (中南林业科大 - 软件工程)<br>
          <strong>毕业:</strong> 预计 2026 | <strong>政治面貌:</strong> 中共预备党员
        </div>
      </div>
      <!-- 倒计时 -->
      <div class="info-item countdown-display">
        <i class="fas fa-flag-checkered"></i>
        <div>
          <strong>目标:</strong> 2025下半年 公务员考试<br>
          <span class="countdown-text">
            距报名约: <strong>{{ daysToReg }}</strong> 天 |
            距笔试约: <strong>{{ daysToExam }}</strong> 天
          </span>
        </div>
      </div>
    </div>

    <!-- 关键进度摘要 -->
    <h2><i class="fas fa-chart-line icon-gradient"></i> 关键进度摘要</h2>
    <!-- 使用全局 .progress-summary-grid 样式 -->
    <div class="progress-summary-grid">
      <!-- 任务摘要卡片 -->
      <div class="summary-card" :class="getSummaryCardClass('tasks')">
        <i class="fas fa-tasks"></i>
        <span class="summary-value">{{ summaryTasks }}</span>
        <span class="summary-label">阶段任务完成</span>
      </div>
      <!-- 课程摘要卡片 -->
      <div class="summary-card" :class="getSummaryCardClass('course')">
        <i class="fas fa-book-open"></i>
        <span class="summary-value">{{ summaryCourse }}</span>
        <span class="summary-label">课程学习进度</span>
      </div>
      <!-- 番茄钟摘要卡片 -->
      <div class="summary-card" :class="getSummaryCardClass('pomodoro')">
        <i class="fas fa-fire"></i>
        <span class="summary-value">{{ pomodorosToday }}</span>
        <span class="summary-label">今日专注次数</span>
      </div>
      <!-- 错题摘要卡片 -->
      <div class="summary-card" :class="getSummaryCardClass('error')">
        <i class="fas fa-exclamation-triangle"></i>
        <span class="summary-value">{{ errorCount }}</span>
        <span class="summary-label">记录错题数</span>
      </div>
      <!-- 知识库摘要卡片 -->
      <div class="summary-card" :class="getSummaryCardClass('knowledge')">
        <i class="fas fa-brain"></i>
        <span class="summary-value">{{ knowledgeItemCount }}</span>
        <span class="summary-label">知识库条目</span>
      </div>
      <!-- 今日学习时长摘要卡片 -->
      <div class="summary-card" :class="getSummaryCardClass('study')">
        <i class="fas fa-clock"></i>
        <span class="summary-value">{{ studyTodayFormatted }}</span>
        <span class="summary-label">今日学习时长</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import config from '@/config.js';
// 导入需要的 Stores
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import { useKnowledgeBaseStore } from '@/stores/knowledgeBaseStore.js';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
// 导入需要的工具函数
import { loadData } from '@/utils/storage.js';
// 导入格式化函数 (如果模板中直接使用)
// import { formatDuration } from '@/utils/formatters.js'; // 不再需要，使用 store 的 getter

// 获取 Store 实例
const pomodoroStore = usePomodoroStore();
const errorLogStore = useErrorLogStore();
const knowledgeBaseStore = useKnowledgeBaseStore();
const studyLogStore = useStudyLogStore();

// --- 响应式状态 (倒计时 & 暂时未放入 Store 的摘要) ---
const daysToReg = ref('...');
const daysToExam = ref('...');
const summaryTasks = ref('0 / 0'); // 任务摘要仍需特殊处理
const summaryCourse = ref('0%'); // 课程摘要仍需特殊处理

// --- 从 Stores 获取响应式数据 ---
const { pomodorosToday } = storeToRefs(pomodoroStore);
const { errorCount } = storeToRefs(errorLogStore);
const { itemCount: knowledgeItemCount } = storeToRefs(knowledgeBaseStore);
const { formattedDurationStats } = storeToRefs(studyLogStore);
const studyTodayFormatted = computed(() => formattedDurationStats.value.today);

// --- 方法 ---
function updateCountdown() {
    try {
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const regDateStr = config.estimatedRegDate;
        const examDateStr = config.estimatedExamDate;
        if (!regDateStr || !examDateStr) throw new Error('Date not configured');
        const regDate = new Date(regDateStr); regDate.setHours(0, 0, 0, 0);
        const examDate = new Date(examDateStr); examDate.setHours(0, 0, 0, 0);
        if (isNaN(regDate.getTime()) || isNaN(examDate.getTime())) throw new Error('Invalid date format in config');
        const msPerDay = 86400000;
        daysToReg.value = Math.max(0, Math.ceil((regDate - now) / msPerDay));
        daysToExam.value = Math.max(0, Math.ceil((examDate - now) / msPerDay));
    } catch(e) {
        console.error("Error calculating countdown:", e);
        daysToReg.value = 'N/A';
        daysToExam.value = 'N/A';
    }
}

function loadRemainingSummaries() {
  // 任务摘要 - 仍依赖 localStorage 或需要 Task Store
  try {
      const progressData = loadData(config.localStorageKeys.progress, { checkboxes: {} });
      const allTaskIds = [ // 这个列表最好由 Task Store 提供
        ...Array.from({length: 6}, (_, i) => `task-phase1-${i+1}-timeline`),
        ...Array.from({length: 5}, (_, i) => `task-phase2-${i+1}-timeline`),
        ...Array.from({length: 5}, (_, i) => `task-phase3-${i+1}-timeline`),
      ];
      const allCheckboxesCount = allTaskIds.length;
      if (allCheckboxesCount > 0) {
          const completedCheckboxesCount = allTaskIds.filter(id => progressData.checkboxes[id]).length;
          summaryTasks.value = `${completedCheckboxesCount} / ${allCheckboxesCount}`;
      } else {
          summaryTasks.value = '0 / 0';
      }
  } catch (e) {
      console.error("Error loading task summary:", e);
      summaryTasks.value = 'Error';
  }

  // 课程摘要 - 仍依赖 localStorage 或需要 Course Store
  try {
      const courseData = loadData(config.localStorageKeys.course, { total: '1', completed: '0' });
      const total = parseInt(courseData.total) || 1;
      const completed = Math.max(0, Math.min(parseInt(courseData.completed) || 0, total));
      const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
      summaryCourse.value = `${percentage}%`;
  } catch(e) {
      console.error("Error loading course summary:", e);
      summaryCourse.value = 'Error';
  }
}

function getSummaryCardClass(type) {
    return `type-${type}`; // 返回简单的类型类名
}

// --- 生命周期 ---
onMounted(() => {
  updateCountdown();
  loadRemainingSummaries();
});

</script>

<style scoped>
/* --- Dashboard Specific Styles (只包含局部样式和局部响应式调整) --- */

/* info-highlight-card 和内部元素的基础样式 */
.info-highlight-card {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    background: var(--gradient-primary);
    color: white;
    padding: 1.5rem;
    border-radius: var(--card-border-radius);
    margin-bottom: 2rem;
    box-shadow: var(--shadow-medium);
}
.info-item {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.info-item i {
    font-size: 2rem;
    opacity: 0.8;
    flex-shrink: 0;
}
.info-item strong {
    font-weight: 600;
}
.countdown-display {
    justify-content: flex-end;
    text-align: right;
}
.countdown-text {
    font-size: 0.9rem;
    opacity: 0.9;
}
.countdown-text strong {
    font-size: 1.1em;
    margin: 0 0.2em;
    display: inline-block;
}

/* summary-card 的局部样式调整 */
.summary-card {
    /* 继承全局 .card 样式 */
    padding: 1.2rem; /* 可能覆盖全局 padding */
    text-align: center;
    transition: var(--transition-default); /* 继承全局过渡 */
}
.summary-card:hover {
    transform: translateY(-5px);
    box-shadow: var(--shadow-medium); /* 继承全局阴影 */
}
.summary-card i {
    font-size: 1.8rem;
    margin-bottom: 0.5rem;
    display: block;
    /* 颜色由下面的类型类决定 */
}
/* 根据类型设置图标颜色 */
.summary-card.type-tasks i { color: var(--primary-color); }
.summary-card.type-course i { color: var(--secondary-color); }
.summary-card.type-pomodoro i { color: var(--accent-color); }
.summary-card.type-error i { color: var(--danger-color); }
.summary-card.type-knowledge i { color: var(--info-color); }
.summary-card.type-study i { color: var(--study-color); }

.summary-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
    color: var(--text-color);
    min-height: 1.3em;
}
.summary-label {
    font-size: 0.85rem;
    color: var(--text-light);
}

/* --- Dashboard Specific Responsive Adjustments (只包含局部的) --- */
@media (max-width: 992px) {
    .info-highlight-card {
         grid-template-columns: 1fr; /* 变为单列 */
    }
    .countdown-display {
        justify-content: flex-start; /* 倒计时左对齐 */
        text-align: left;
    }
    /* .progress-summary-grid 的响应式规则在全局 CSS 中 */
}

@media (max-width: 768px) {
    /* .progress-summary-grid 的响应式规则在全局 CSS 中 */
    /* 调整局部的摘要卡片样式 */
    .summary-card {
        padding: 0.8rem;
    }
    .summary-value {
        font-size: 1.2rem;
    }
    .summary-label {
        font-size: 0.75rem;
    }
    /* 调整局部的 info-item 图标大小等 */
    .info-item i {
        font-size: 1.8rem;
    }
}
</style>