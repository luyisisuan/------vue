<!-- src/views/DashboardSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-tachometer-alt icon-gradient"></i> 导航栏概览</h1>
      <p>欢迎回来，段绪程！</p>
    </header>

    <!-- 用户信息与考试倒计时 -->
    <div class="info-highlight-card">
      <div class="info-item"> <i class="fas fa-user-graduate"></i> <div> <strong>考生:</strong> 段绪程 (中南林业科大 - 软件工程)<br> <strong>毕业:</strong> 预计 2026 | <strong>政治面貌:</strong> 中共预备党员 </div> </div>
      <div class="info-item countdown-display"> <i class="fas fa-flag-checkered"></i> <div> <strong>目标:</strong> 2025下半年 公务员考试<br> <span class="countdown-text"> 距报名约: <strong>{{ daysToReg }}</strong> 天 | 距笔试约: <strong>{{ daysToExam }}</strong> 天 </span> </div> </div>
    </div>

    <!-- 进度摘要标题 -->
    <h2><i class="fas fa-chart-line icon-gradient"></i> 关键进度摘要</h2>

    <!-- 加载与错误状态 -->
    <div v-if="isLoadingAny" class="loading-indicator card">加载摘要数据中...</div>
    <div v-else-if="loadingErrorAny" class="error-message card"> 加载摘要数据时出错，部分数据可能不准确。 </div>

    <!-- **修改:** 移除了 progress-summary-grid 类名 -->
    <div v-else class="dashboard-summary-grid-6-items">
      <!-- 备考笔记摘要链接 (放在第一位) -->
      <router-link :to="{ name: 'Notes' }" class="summary-card-link" title="查看备考笔记">
        <div class="summary-card" :class="getSummaryCardClass('notes')">
          <i class="fas fa-sticky-note"></i>
          <span class="summary-value">{{ noteCountDisplay }}</span>
          <span class="summary-label">备考笔记条目</span>
        </div>
      </router-link>
      <!-- 任务摘要链接 -->
      <router-link :to="{ name: 'Timeline' }" class="summary-card-link" title="查看任务时间线">
        <div class="summary-card" :class="getSummaryCardClass('tasks')">
          <i class="fas fa-tasks"></i>
          <span class="summary-value">{{ taskSummaryDisplay }}</span>
          <span class="summary-label">阶段任务完成</span>
        </div>
      </router-link>
      <!-- 番茄钟摘要链接 -->
      <router-link :to="{ name: 'Pomodoro' }" class="summary-card-link" title="查看番茄钟">
        <div class="summary-card" :class="getSummaryCardClass('pomodoro')">
          <i class="fas fa-fire"></i>
          <span class="summary-value">{{ pomodorosToday }}</span>
          <span class="summary-label">总专注次数</span>
        </div>
      </router-link>
      <!-- 错题摘要链接 -->
      <router-link :to="{ name: 'ErrorLog' }" class="summary-card-link" title="查看错题本">
        <div class="summary-card" :class="getSummaryCardClass('error')">
          <i class="fas fa-exclamation-triangle"></i>
          <span class="summary-value">{{ errorCountDisplay }}</span>
          <span class="summary-label">记录错题数</span>
        </div>
      </router-link>
      <!-- 知识库摘要链接 -->
      <router-link :to="{ name: 'KnowledgeBase' }" class="summary-card-link" title="查看知识库">
        <div class="summary-card" :class="getSummaryCardClass('knowledge')">
          <i class="fas fa-brain"></i>
          <span class="summary-value">{{ knowledgeItemCount }}</span>
          <span class="summary-label">知识库条目</span>
        </div>
      </router-link>
      <!-- 学习时长摘要链接 -->
      <router-link :to="{ name: 'StudyLog' }" class="summary-card-link" title="查看学习统计">
        <div class="summary-card" :class="getSummaryCardClass('study')">
           <i class="fas fa-stopwatch"></i>
           <span class="summary-value">{{ todayStudyDurationDisplay }}</span>
           <span class="summary-label">今日学习时长</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import config from '@/config.js';

// Stores
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';
import { useTaskStore } from '@/stores/taskStore.js';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { useNoteStore } from '@/stores/noteStore.js'; // 导入 Note Store
import { formatDuration } from '@/utils/formatters.js';

// Store 实例
const pomodoroStore = usePomodoroStore();
const errorLogStore = useErrorLogStore();
const knowledgeStore = useKnowledgeStore();
const taskStore = useTaskStore();
const studyLogStore = useStudyLogStore();
const noteStore = useNoteStore(); // 获取 Note Store 实例

// 本地状态 - 倒计时
const daysToReg = ref('...');
const daysToExam = ref('...');

// --- 从 Stores 解构状态和 Getters ---
const { pomodorosToday } = storeToRefs(pomodoroStore);
const { taskSummary: taskSummaryFromStore, isLoading: isLoadingTasks, error: tasksError } = storeToRefs(taskStore);
const { errors: errorList, isLoading: isLoadingErrors, error: errorLogError } = storeToRefs(errorLogStore);
const { itemCount: knowledgeItemCount, isLoading: isLoadingKnowledge, error: knowledgeError } = storeToRefs(knowledgeStore);
const { todayDurationSeconds, isLoading: isLoadingStudyLog, error: studyLogError } = storeToRefs(studyLogStore);
const { allNotesSorted, isLoading: isLoadingNotes, error: noteError } = storeToRefs(noteStore);

// --- 计算属性 ---
const taskSummaryDisplay = computed(() => taskSummaryFromStore.value || '0 / 0');
const errorCountDisplay = computed(() => {
  if (errorList && errorList.value && Array.isArray(errorList.value)) return errorList.value.length;
  return 0;
});
const todayStudyDurationDisplay = computed(() => formatDuration(todayDurationSeconds?.value || 0));
const noteCountDisplay = computed(() => {
    if (allNotesSorted && allNotesSorted.value && Array.isArray(allNotesSorted.value)) {
        return allNotesSorted.value.length;
    }
    return 0;
});

// 组合加载状态
const isLoadingAny = computed(() =>
    (isLoadingNotes?.value) ||
    (isLoadingTasks?.value) ||
    (isLoadingErrors?.value) ||
    (isLoadingKnowledge?.value) ||
    (isLoadingStudyLog?.value)
);
// 组合错误状态
const loadingErrorAny = computed(() =>
    (noteError?.value) ||
    (tasksError?.value) ||
    (errorLogError?.value) ||
    (knowledgeError?.value) ||
    (studyLogError?.value)
);

// --- 方法 ---
function updateCountdown() {
    try {
        const now = new Date(); now.setHours(0, 0, 0, 0);
        const regDateStr = config.estimatedRegDate;
        const examDateStr = config.estimatedExamDate;
        if (!regDateStr || !examDateStr) throw new Error('配置文件中未设置考试日期');
        const regDate = new Date(regDateStr); regDate.setHours(0, 0, 0, 0);
        const examDate = new Date(examDateStr); examDate.setHours(0, 0, 0, 0);
        if (isNaN(regDate.getTime()) || isNaN(examDate.getTime())) throw new Error('配置文件中的日期格式无效');
        const msPerDay = 86400000;
        daysToReg.value = Math.max(0, Math.ceil((regDate - now) / msPerDay));
        daysToExam.value = Math.max(0, Math.ceil((examDate - now) / msPerDay));
    } catch(e) {
        console.error("计算倒计时出错:", e);
        daysToReg.value = 'N/A';
        daysToExam.value = 'N/A';
    }
}
function getSummaryCardClass(type) { return `type-${type}`; }

// --- 生命周期钩子 ---
onMounted(() => {
  updateCountdown();
  console.log("DashboardSection mounted.");
});

</script>

<style scoped>
/* 链接卡片样式重置 */
.summary-card-link {
    text-decoration: none;
    color: inherit;
    display: block;
    transition: var(--transition-default);
}
.summary-card-link:hover .summary-card {
    transform: translateY(-5px);
    box-shadow: var(--shadow-medium);
}

/* **修改:** 网格布局 (6列) - 使用组件内部定义的类 */
.dashboard-summary-grid-6-items {
    display: grid;
    grid-template-columns: repeat(6, 1fr); /* 默认6列 */
    gap: 1rem;
}

/* 卡片图标颜色 */
.summary-card.type-notes i { color: var(--success-color); }
.summary-card.type-study i { color: var(--study-color); }
.summary-card.type-tasks i { color: var(--primary-color); }
.summary-card.type-pomodoro i { color: var(--accent-color); }
.summary-card.type-error i { color: var(--danger-color); }
.summary-card.type-knowledge i { color: var(--info-color); }

/* 响应式布局调整 (适应 6 个项目) */
@media (max-width: 1200px) {
    .dashboard-summary-grid-6-items { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
}
@media (max-width: 992px) {
    .dashboard-summary-grid-6-items { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
    .info-highlight-card { grid-template-columns: 1fr; }
    .countdown-display { justify-content: flex-start; text-align: left; }
}
@media (max-width: 768px) {
    .dashboard-summary-grid-6-items { grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); }
    .summary-card { padding: 0.8rem; }
    .summary-value { font-size: 1.2rem; }
    .summary-label { font-size: 0.75rem; }
    .info-item i { font-size: 1.8rem; }
}

/* --- 其他样式 --- */
.info-highlight-card { display: grid; gap: 1.5rem; background: var(--gradient-primary); color: white; padding: 1.5rem; border-radius: var(--card-border-radius); margin-bottom: 2rem; box-shadow: var(--shadow-medium); }
.info-item { display: flex; align-items: center; gap: 1rem; }
.info-item i { font-size: 2rem; opacity: 0.8; flex-shrink: 0; }
.info-item strong { font-weight: 600; }
.countdown-display { justify-content: flex-end; text-align: right; }
.countdown-text { font-size: 0.9rem; opacity: 0.9; }
.countdown-text strong { font-size: 1.1em; margin: 0 0.2em; display: inline-block; }
.summary-card { background-color: var(--card-bg); border-radius: var(--card-border-radius); padding: 1.2rem; text-align: center; box-shadow: var(--shadow-light); border: 1px solid var(--border-color); }
.summary-card i { font-size: 1.8rem; margin-bottom: 0.5rem; display: block; }
.summary-value { display: block; font-size: 1.5rem; font-weight: 700; margin-bottom: 0.2rem; color: var(--text-color); min-height: 1.3em; }
.summary-label { font-size: 0.85rem; color: var(--text-light); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; max-width: 100%; }
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.section-header h1 i.icon-gradient { background: var(--gradient-primary); -webkit-background-clip: text; background-clip: text; color: transparent; }

</style>