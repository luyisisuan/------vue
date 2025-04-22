<!-- src/views/DashboardSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-tachometer-alt icon-gradient"></i> 导航栏概览</h1>
      <p>欢迎回来，段绪程！</p>
    </header>

    <div class="info-highlight-card">
      <div class="info-item">
        <i class="fas fa-user-graduate"></i>
        <div>
          <strong>考生:</strong> 段绪程 (中南林业科大 - 软件工程)<br>
          <strong>毕业:</strong> 预计 2026 | <strong>政治面貌:</strong> 中共预备党员
        </div>
      </div>
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

    <h2><i class="fas fa-chart-line icon-gradient"></i> 关键进度摘要</h2>

    <div v-if="isLoadingAny" class="loading-indicator card">加载摘要数据中...</div>
    <div v-else-if="loadingErrorAny" class="error-message card">
        加载摘要数据时出错，部分数据可能不准确。
    </div>

    <!-- **MODIFIED:** Reduced grid items -->
    <div v-else class="progress-summary-grid dashboard-summary-grid">
      <div class="summary-card" :class="getSummaryCardClass('tasks')">
        <i class="fas fa-tasks"></i>
        <span class="summary-value">{{ taskSummaryDisplay }}</span>
        <span class="summary-label">阶段任务完成</span>
      </div>
      <div class="summary-card" :class="getSummaryCardClass('course')">
        <i class="fas fa-book-open"></i>
        <span class="summary-value">{{ courseProgressDisplay }}%</span>
        <span class="summary-label">课程学习进度</span>
      </div>
      <div class="summary-card" :class="getSummaryCardClass('pomodoro')">
        <i class="fas fa-fire"></i>
        <span class="summary-value">{{ pomodorosToday }}</span>
        <span class="summary-label">总专注次数</span>
      </div>
      <div class="summary-card" :class="getSummaryCardClass('error')">
        <i class="fas fa-exclamation-triangle"></i>
        <span class="summary-value">{{ errorCountDisplay }}</span>
        <span class="summary-label">记录错题数</span>
      </div>
      <div class="summary-card" :class="getSummaryCardClass('knowledge')">
        <i class="fas fa-brain"></i>
        <span class="summary-value">{{ knowledgeItemCount }}</span>
        <span class="summary-label">知识库条目</span>
      </div>
      <!-- Removed Study Today Card -->
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import config from '@/config.js';
// Import necessary Stores
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';
// **REMOVED:** No longer need StudyLogStore for this component
// import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { useCourseStore } from '@/stores/courseStore.js';
import { useTaskStore } from '@/stores/taskStore.js';
// **REMOVED:** No longer need formatDuration
// import { formatDuration } from '@/utils/formatters.js';

// Get Store instances
const pomodoroStore = usePomodoroStore();
const errorLogStore = useErrorLogStore();
const knowledgeStore = useKnowledgeStore();
const courseStore = useCourseStore();
const taskStore = useTaskStore();

// Local state for countdown
const daysToReg = ref('...');
const daysToExam = ref('...');

// Get reactive state/getters from Stores
const { pomodorosToday } = storeToRefs(pomodoroStore);
const { taskSummary: taskSummaryFromStore, isLoading: isLoadingTasks, error: tasksError } = storeToRefs(taskStore);
const { progressPercentage: courseProgressPercentage, isLoading: isLoadingCourse, error: courseError } = storeToRefs(courseStore);
const { errors: errorList, isLoading: isLoadingErrors, error: errorLogError } = storeToRefs(errorLogStore);
const { itemCount: knowledgeItemCount, isLoading: isLoadingKnowledge, error: knowledgeError } = storeToRefs(knowledgeStore);
// **REMOVED:** No longer need todayDurationSeconds from studyLogStore
// const { todayDurationSeconds, isLoading: isLoadingStudyLog, error: studyLogError } = storeToRefs(studyLogStore);

// Computed properties for display
const courseProgressDisplay = computed(() => courseProgressPercentage.value || 0);
const taskSummaryDisplay = computed(() => taskSummaryFromStore.value || '0 / 0');
const errorCountDisplay = computed(() => errorList.value?.length || 0);

// Combined loading state (remove studyLogStore loading)
const isLoadingAny = computed(() =>
    isLoadingTasks.value ||
    isLoadingCourse.value ||
    isLoadingErrors.value ||
    isLoadingKnowledge.value
    // || isLoadingStudyLog.value // Removed
);
// Combined error state (remove studyLogStore error)
const loadingErrorAny = computed(() =>
    tasksError.value ||
    courseError.value ||
    errorLogError.value ||
    knowledgeError.value
    // || studyLogError.value // Removed
);

// Methods
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

function getSummaryCardClass(type) {
    return `type-${type}`;
}

// Lifecycle
onMounted(() => {
  updateCountdown();
  console.log("DashboardSection mounted.");
});

</script>

<style scoped>
/* Styles remain the same as the previous version, */
/* but you might want to adjust .dashboard-summary-grid if needed */
/* e.g., change grid columns if you have fewer items */
.dashboard-summary-grid {
    /* Example: If you now have 5 items, maybe fit 5 columns on large screens */
    /* grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); */ /* Keeps auto-fit */
     grid-template-columns: repeat(5, 1fr); /* Force 5 columns */
     /* Adjust gap if needed */
     gap: 1rem;
}


/* info-highlight-card Styles */
.info-highlight-card { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; background: var(--gradient-primary); color: white; padding: 1.5rem; border-radius: var(--card-border-radius); margin-bottom: 2rem; box-shadow: var(--shadow-medium); }
.info-item { display: flex; align-items: center; gap: 1rem; }
.info-item i { font-size: 2rem; opacity: 0.8; flex-shrink: 0; }
.info-item strong { font-weight: 600; }
.countdown-display { justify-content: flex-end; text-align: right; }
.countdown-text { font-size: 0.9rem; opacity: 0.9; }
.countdown-text strong { font-size: 1.1em; margin: 0 0.2em; display: inline-block; }

/* summary-card Styles */
.summary-card { background-color: var(--card-bg); border-radius: var(--card-border-radius); padding: 1.2rem; text-align: center; box-shadow: var(--shadow-light); border: 1px solid var(--border-color); transition: var(--transition-default); }
.summary-card:hover { transform: translateY(-5px); box-shadow: var(--shadow-medium); }
.summary-card i { font-size: 1.8rem; margin-bottom: 0.5rem; display: block; }
.summary-card.type-tasks i { color: var(--primary-color); }
.summary-card.type-course i { color: var(--secondary-color); }
.summary-card.type-pomodoro i { color: var(--accent-color); }
.summary-card.type-error i { color: var(--danger-color); }
.summary-card.type-knowledge i { color: var(--info-color); }
/* Removed .type-study */
.summary-value { display: block; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.2rem; color: var(--text-color); min-height: 1.3em; }
.summary-label { font-size: 0.85rem; color: var(--text-light); }

/* Loading/Error Styles */
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.section-header h1 i.icon-gradient { background: var(--gradient-primary); -webkit-background-clip: text; background-clip: text; color: transparent; }

/* Responsive */
@media (max-width: 992px) {
    .info-highlight-card { grid-template-columns: 1fr; }
    .countdown-display { justify-content: flex-start; text-align: left; }
    .dashboard-summary-grid { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); } /* Revert to auto-fit */
}
@media (max-width: 768px) {
    .dashboard-summary-grid { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
    .summary-card { padding: 0.8rem; }
    .summary-value { font-size: 1.2rem; }
    .summary-label { font-size: 0.75rem; }
    .info-item i { font-size: 1.8rem; }
}
</style>