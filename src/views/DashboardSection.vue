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
            <!-- 倒计时仍然在本地计算 -->
            距报名约: <strong>{{ daysToReg }}</strong> 天 |
            距笔试约: <strong>{{ daysToExam }}</strong> 天
          </span>
        </div>
      </div>
    </div>

    <h2><i class="fas fa-chart-line icon-gradient"></i> 关键进度摘要</h2>

    <!-- 显示全局加载或错误状态 (可选) -->
    <div v-if="isLoadingAny" class="loading-indicator card">加载摘要数据中...</div>
    <div v-else-if="loadingErrorAny" class="error-message card" style="color: red;">
        加载摘要数据时出错，部分数据可能不准确。
    </div>

    <div v-else class="progress-summary-grid">
      <!-- 任务摘要卡片 - **MODIFIED:** 使用 taskStore getter -->
      <div class="summary-card" :class="getSummaryCardClass('tasks')">
        <i class="fas fa-tasks"></i>
        <span class="summary-value">{{ taskSummaryDisplay }}</span>
        <span class="summary-label">阶段任务完成</span>
      </div>
      <!-- 课程摘要卡片 - **MODIFIED:** 使用 courseStore getter -->
      <div class="summary-card" :class="getSummaryCardClass('course')">
        <i class="fas fa-book-open"></i>
        <span class="summary-value">{{ courseProgressDisplay }}%</span>
        <span class="summary-label">课程学习进度</span>
      </div>
      <!-- 番茄钟摘要卡片 - 使用 pomodoroStore state -->
      <div class="summary-card" :class="getSummaryCardClass('pomodoro')">
        <i class="fas fa-fire"></i>
        <span class="summary-value">{{ pomodorosToday }}</span>
        <span class="summary-label">今日专注次数</span>
      </div>
      <!-- 错题摘要卡片 - 使用 errorLogStore getter -->
      <div class="summary-card" :class="getSummaryCardClass('error')">
        <i class="fas fa-exclamation-triangle"></i>
         <!-- errorCount getter 现在可能不存在，需要从列表长度计算 -->
        <span class="summary-value">{{ errorCountDisplay }}</span>
        <span class="summary-label">记录错题数</span>
      </div>
      <!-- 知识库摘要卡片 - 使用 knowledgeStore getter -->
      <div class="summary-card" :class="getSummaryCardClass('knowledge')">
        <i class="fas fa-brain"></i>
        <span class="summary-value">{{ knowledgeItemCount }}</span>
        <span class="summary-label">知识库条目</span>
      </div>
      <!-- 今日学习时长摘要卡片 - 使用 studyLogStore getter -->
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
// 导入所有需要的 Stores
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { useCourseStore } from '@/stores/courseStore.js';
import { useTaskStore } from '@/stores/taskStore.js'; // <<< 导入 Task Store
// 导入格式化函数
import { formatDuration } from '@/utils/formatters.js';
// 移除了 loadData from storage

// 获取 Store 实例
const pomodoroStore = usePomodoroStore();
const errorLogStore = useErrorLogStore();
const knowledgeStore = useKnowledgeStore(); // 使用正确的 Store 名称
const studyLogStore = useStudyLogStore();
const courseStore = useCourseStore();
const taskStore = useTaskStore(); // <<< 获取 Task Store 实例

// --- 响应式状态 (仅倒计时) ---
const daysToReg = ref('...');
const daysToExam = ref('...');

// --- 从 Stores 获取响应式数据 ---
const { pomodorosToday } = storeToRefs(pomodoroStore);
// **MODIFIED:** 从 taskStore 获取任务摘要 getter
const { taskSummary: taskSummaryFromStore, isLoading: isLoadingTasks, error: tasksError } = storeToRefs(taskStore);
// **MODIFIED:** 从 courseStore 获取进度 getter
const { progressPercentage: courseProgressPercentage, isLoading: isLoadingCourse, error: courseError } = storeToRefs(courseStore);
// **MODIFIED:** errorCount 需要重新计算或从 Store 获取列表长度
const { errors: errorList, isLoading: isLoadingErrors, error: errorLogError } = storeToRefs(errorLogStore);
const { itemCount: knowledgeItemCount, isLoading: isLoadingKnowledge, error: knowledgeError } = storeToRefs(knowledgeStore);
// **MODIFIED:** 获取秒数 getter 用于格式化
const { todayDurationSeconds, isLoading: isLoadingStudyLog, error: studyLogError } = storeToRefs(studyLogStore);

// --- 计算属性 (用于模板显示) ---
const studyTodayFormatted = computed(() => formatDuration(todayDurationSeconds.value || 0)); // 添加默认值
const courseProgressDisplay = computed(() => courseProgressPercentage.value || 0); // 添加默认值
const taskSummaryDisplay = computed(() => taskSummaryFromStore.value || '0 / 0'); // 使用 Store 的 getter
// **MODIFIED:** 计算错题数
const errorCountDisplay = computed(() => errorList.value?.length || 0); // 从列表长度计算

// **MODIFIED:** 计算全局加载状态
const isLoadingAny = computed(() =>
    isLoadingTasks.value ||
    isLoadingCourse.value ||
    isLoadingErrors.value ||
    isLoadingKnowledge.value ||
    isLoadingStudyLog.value
);
// **MODIFIED:** 计算是否有任何加载错误
const loadingErrorAny = computed(() =>
    tasksError.value ||
    courseError.value ||
    errorLogError.value ||
    knowledgeError.value ||
    studyLogError.value
);


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

// **REMOVED:** 不再需要 loadRemainingSummaries 或 loadTaskSummary
// function loadTaskSummary() { ... }

function getSummaryCardClass(type) {
    // 可以根据需要添加更多样式逻辑
    return `type-${type}`;
}

// --- 生命周期 ---
onMounted(() => {
  updateCountdown(); // 倒计时仍在本地处理
  // 数据摘要现在依赖于 Pinia Stores 的初始化加载
  console.log("DashboardSection mounted. Data summaries rely on store initialization.");
});

</script>

<style scoped>
/* --- Dashboard Specific Styles --- */

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
.summary-card.type-study i { color: var(--study-color); }
.summary-value { display: block; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.2rem; color: var(--text-color); min-height: 1.3em; /* Ensure consistent height */ }
.summary-label { font-size: 0.85rem; color: var(--text-light); }

/* Loading/Error Styles */
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.section-header h1 i.icon-gradient { /* Ensure header icon style */
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}


/* Responsive */
@media (max-width: 992px) {
    .info-highlight-card { grid-template-columns: 1fr; }
    .countdown-display { justify-content: flex-start; text-align: left; }
    /* Global grid styles handle summary grid */
}
@media (max-width: 768px) {
    .summary-card { padding: 0.8rem; }
    .summary-value { font-size: 1.2rem; }
    .summary-label { font-size: 0.75rem; }
    .info-item i { font-size: 1.8rem; }
}
</style>