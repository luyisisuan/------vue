<!-- src/views/DashboardSection.vue -->
<template>
  <div class="gov-style-wrapper">
    <header class="section-header">
      <h1><i class="fas fa-tachometer-alt header-icon"></i> 导航栏概览</h1>
      <p class="welcome-message">{{ timeBasedGreeting }}，段绪程！</p>
    </header>

    <!-- 用户信息与考试倒计时 -->
    <div class="info-highlight-card">
      <div class="user-info-block">
        <div class="user-avatar-placeholder">
          <i class="fas fa-user-tie"></i>
        </div>
        <div class="info-item">
          <div>
            <strong>考生:</strong> 段绪程
            <span class="user-detail">(中南林业科大 - 软件工程)</span><br>
            <strong>毕业:</strong> 预计 2026 | <strong>政治面貌:</strong> 中共预备党员
          </div>
        </div>
      </div>
      <div class="info-item countdown-display">
        <i class="fas fa-flag-checkered countdown-icon"></i>
        <div>
          <strong>目标:</strong> 2025下半年 公务员考试<br>
          <span class="countdown-text">
            距报名约: <strong class="countdown-number">{{ daysToReg }}</strong> 天 | 距笔试约: <strong class="countdown-number">{{ daysToExam }}</strong> 天
          </span>
        </div>
      </div>
    </div>

    <!-- 快捷操作 (New Section) -->
    <h2 class="section-subtitle with-accent-line">
      <i class="fas fa-rocket subtitle-icon"></i> 快捷操作
    </h2>
    <div class="quick-actions-grid">
      <router-link :to="{ name: 'Pomodoro' }" class="quick-action-btn">
        <i class="fas fa-play-circle"></i> 开始专注
      </router-link>
      <router-link :to="{ name: 'Notes', query: { action: 'add' } }" class="quick-action-btn">
        <i class="fas fa-edit"></i> 添加笔记
      </router-link>
       <router-link :to="{ name: 'ErrorLog', query: { action: 'add' } }" class="quick-action-btn">
        <i class="fas fa-bug"></i> 记录错题
      </router-link>
      <router-link :to="{ name: 'KnowledgeBase', query: { action: 'add' } }" class="quick-action-btn">
        <i class="fas fa-book"></i> 添加知识
      </router-link>
    </div>


    <!-- 进度摘要标题 -->
    <h2 class="section-subtitle with-accent-line">
      <i class="fas fa-chart-pie subtitle-icon"></i> 关键进度摘要
    </h2>

    <div v-if="isLoadingAny" class="loading-indicator card">
        <div class="spinner"></div> 加载摘要数据中...
    </div>
    <div v-else-if="loadingErrorAny" class="error-message card">
        <i class="fas fa-exclamation-triangle"></i>
        加载摘要数据时出错，部分数据可能不准确。
    </div>

    <div v-else class="dashboard-summary-grid">
      <router-link :to="{ name: 'Notes' }" class="summary-card-link" title="查看备考笔记">
        <div class="summary-card type-notes">
          <i class="fas fa-sticky-note card-icon"></i>
          <span class="summary-value">{{ noteCountDisplay }}</span>
          <span class="summary-label">备考笔记</span>
        </div>
      </router-link>
      <router-link :to="{ name: 'Timeline' }" class="summary-card-link" title="查看任务时间线">
        <div class="summary-card type-tasks">
          <i class="fas fa-tasks card-icon"></i>
          <span class="summary-value">{{ taskSummaryDisplay }}</span>
          <span class="summary-label">阶段任务</span>
        </div>
      </router-link>
      <router-link :to="{ name: 'Pomodoro' }" class="summary-card-link" title="查看番茄钟">
        <div class="summary-card type-pomodoro">
          <i class="fas fa-fire card-icon"></i>
          <span class="summary-value">{{ pomodorosToday }}</span>
          <span class="summary-label">今日专注</span>
        </div>
      </router-link>
      <router-link :to="{ name: 'ErrorLog' }" class="summary-card-link" title="查看错题本">
        <div class="summary-card type-error">
          <i class="fas fa-exclamation-triangle card-icon"></i>
          <span class="summary-value">{{ errorCountDisplay }}</span>
          <span class="summary-label">错题记录</span>
        </div>
      </router-link>
      <router-link :to="{ name: 'KnowledgeBase' }" class="summary-card-link" title="查看知识库">
        <div class="summary-card type-knowledge">
          <i class="fas fa-brain card-icon"></i>
          <span class="summary-value">{{ knowledgeItemCount }}</span>
          <span class="summary-label">知识条目</span>
        </div>
      </router-link>
      <router-link :to="{ name: 'StudyLog' }" class="summary-card-link" title="查看学习统计">
        <div class="summary-card type-study">
           <i class="fas fa-stopwatch card-icon"></i>
           <span class="summary-value">{{ todayStudyDurationDisplay }}</span>
           <span class="summary-label">今日学习</span>
        </div>
      </router-link>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import config from '@/config.js';

import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';
import { useTaskStore } from '@/stores/taskStore.js';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { useNoteStore } from '@/stores/noteStore.js';
import { formatDuration } from '@/utils/formatters.js';

const pomodoroStore = usePomodoroStore();
const errorLogStore = useErrorLogStore();
const knowledgeStore = useKnowledgeStore();
const taskStore = useTaskStore();
const studyLogStore = useStudyLogStore();
const noteStore = useNoteStore();

const daysToReg = ref('...');
const daysToExam = ref('...');
const timeBasedGreeting = ref('');

const { pomodorosToday } = storeToRefs(pomodoroStore);
const { taskSummary: taskSummaryFromStore, isLoading: isLoadingTasks, error: tasksError } = storeToRefs(taskStore);
const { errors: errorList, isLoading: isLoadingErrors, error: errorLogError } = storeToRefs(errorLogStore);
const { itemCount: knowledgeItemCount, isLoading: isLoadingKnowledge, error: knowledgeError } = storeToRefs(knowledgeStore);
const { todayDurationSeconds, isLoading: isLoadingStudyLog, error: studyLogError } = storeToRefs(studyLogStore);
const { allNotesSorted, isLoading: isLoadingNotes, error: noteError } = storeToRefs(noteStore);

const taskSummaryDisplay = computed(() => taskSummaryFromStore.value || '0 / 0');
const errorCountDisplay = computed(() => errorList.value?.length || 0);
const todayStudyDurationDisplay = computed(() => formatDuration(todayDurationSeconds?.value || 0));
const noteCountDisplay = computed(() => allNotesSorted.value?.length || 0);

const isLoadingAny = computed(() =>
    isLoadingNotes?.value || isLoadingTasks?.value || isLoadingErrors?.value ||
    isLoadingKnowledge?.value || isLoadingStudyLog?.value
);
const loadingErrorAny = computed(() =>
    noteError?.value || tasksError?.value || errorLogError?.value ||
    knowledgeError?.value || studyLogError?.value
);

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

function setTimeBasedGreeting() {
    const hour = new Date().getHours();
    if (hour < 5) timeBasedGreeting.value = "夜深了，注意休息";
    else if (hour < 9) timeBasedGreeting.value = "早上好";
    else if (hour < 12) timeBasedGreeting.value = "上午好";
    else if (hour < 14) timeBasedGreeting.value = "中午好";
    else if (hour < 18) timeBasedGreeting.value = "下午好";
    else if (hour < 22) timeBasedGreeting.value = "晚上好";
    else timeBasedGreeting.value = "夜深了，早点休息";
}

onMounted(() => {
  updateCountdown();
  setTimeBasedGreeting();
  // Load data from all stores if not already loaded (stores should handle their own loading logic ideally)
  // Example: if (!pomodoroStore.loadedOnce) pomodoroStore.loadData();
});

</script>

<style scoped>
/* --- Red Government Style Theme Variables --- */
.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-primary-red-light: #fdeaea; /* Lighter red for backgrounds/accents */
  --gov-accent-gold: #B8860B;
  --gov-accent-blue: #0056b3;
  --gov-secondary-gray: #6c757d;
  --gov-text-primary: #212529;
  --gov-text-secondary: #495057;
  --gov-text-on-red: #ffffff; /* Text color on primary red background */
  --gov-background-light: #f8f9fa;
  --gov-background-white: #ffffff;
  --gov-border-color: #ced4da;
  --gov-border-color-strong: #adb5bd;
  --gov-danger-red: #dc3545;
  --gov-success-green: #28a745;
  --gov-info-blue: #17a2b8;
  --gov-warning-orange: #fd7e14;
  --gov-shadow-soft: 0 2px 4px rgba(0, 0, 0, 0.06);
  --gov-shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.08);
  --gov-shadow-strong: 0 6px 12px rgba(0, 0, 0, 0.1);
  --gov-transition-default: all 0.25s ease-in-out;

  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
}

/* --- General Component Styles --- */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 5px; /* Slightly more rounded for gov style */
  box-shadow: var(--gov-shadow-soft);
}
.section-header {
  margin-bottom: 2rem; /* Increased margin */
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--gov-primary-red);
}
.section-header h1 {
  font-size: 1.9rem; /* Slightly larger */
  font-weight: 600;
  color: var(--gov-text-primary);
  display: flex;
  align-items: center;
}
.section-header h1 > .header-icon {
  color: var(--gov-primary-red);
  margin-right: 0.8rem;
  font-size: 1.7rem;
}
.welcome-message { /* For section-header p */
  font-size: 1rem;
  color: var(--gov-text-secondary);
  margin-top: 0.3rem;
  font-weight: 500;
}

/* Section Subtitle */
.section-subtitle {
  font-size: 1.4rem; /* Adjusted size */
  color: var(--gov-primary-red-dark);
  margin-top: 2.5rem; /* Space above subtitle */
  margin-bottom: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.6em;
  padding-bottom: 0.5rem;
  position: relative;
}
.section-subtitle.with-accent-line::after {
    content: '';
    position: absolute;
    left: 0;
    bottom: 0;
    width: 60px;
    height: 3px;
    background-color: var(--gov-primary-red);
}
.subtitle-icon { /* For icons in h2 */
  color: var(--gov-primary-red);
  font-size: 1.1em;
  animation: pulseIcon 2s infinite ease-in-out; /* Subtle pulse */
}
@keyframes pulseIcon {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.08); }
}

/* User Info & Countdown Card */
.info-highlight-card {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  background: linear-gradient(135deg, var(--gov-primary-red-dark), var(--gov-primary-red));
  color: var(--gov-text-on-red);
  padding: 1.5rem 2rem; /* Adjusted padding */
  border-radius: 5px;
  margin-bottom: 2.5rem;
  box-shadow: var(--gov-shadow-medium);
}
.user-info-block {
    display: flex;
    align-items: center;
    gap: 1rem;
}
.user-avatar-placeholder {
    width: 60px;
    height: 60px;
    background-color: rgba(255,255,255,0.15);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    border: 2px solid rgba(255,255,255,0.3);
}
.user-avatar-placeholder i {
    font-size: 2rem;
    color: var(--gov-text-on-red);
}
.info-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  line-height: 1.6;
}
.info-item i:not(.fa-user-tie) { /* Exclude avatar icon from this styling */
  font-size: 2rem;
  opacity: 0.8;
  flex-shrink: 0;
}
.user-detail {
    font-size: 0.85em;
    opacity: 0.9;
}
.info-item strong { font-weight: 600; }

.countdown-display {
  /* text-align: right; */ /* Can make it left-aligned for formal style */
}
.countdown-icon { color: var(--gov-accent-gold); } /* Gold for countdown icon */
.countdown-text { font-size: 0.9rem; opacity: 0.95; }
.countdown-number {
  font-size: 1.3em; /* More emphasis on numbers */
  font-weight: 700;
  margin: 0 0.15em;
  display: inline-block;
  min-width: 2ch; /* Minimum width for 2 characters */
  text-align: center;
  padding: 0.1em 0.3em;
  background-color: rgba(0,0,0,0.1);
  border-radius: 3px;
}

/* Quick Actions */
.quick-actions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  margin-bottom: 2.5rem;
}
.quick-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background-color: var(--gov-background-light);
  border: 1px solid var(--gov-border-color);
  color: var(--gov-text-primary);
  font-weight: 500;
  font-size: 0.95rem;
  border-radius: 4px;
  text-decoration: none;
  transition: var(--gov-transition-default);
  box-shadow: var(--gov-shadow-soft);
}
.quick-action-btn:hover {
  background-color: var(--gov-primary-red);
  color: var(--gov-text-on-red);
  border-color: var(--gov-primary-red-dark);
  transform: translateY(-2px);
  box-shadow: var(--gov-shadow-medium);
}
.quick-action-btn i {
  font-size: 1.1em;
  transition: transform 0.2s ease-out;
}
.quick-action-btn:hover i {
  transform: scale(1.1);
}

/* Summary Card Grid & Links */
.dashboard-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); /* More adaptive */
  gap: 1.25rem;
  margin-bottom: 2rem;
}
.summary-card-link {
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: 5px;
  transition: var(--gov-transition-default);
  overflow: hidden; /* For potential inner element effects */
}
.summary-card-link:hover .summary-card,
.summary-card-link:focus-visible .summary-card {
  transform: translateY(-4px) scale(1.02);
  box-shadow: var(--gov-shadow-strong); /* Stronger shadow on hover */
  border-color: var(--gov-primary-red); /* Red border on hover */
}
.summary-card-link:focus-visible {
  outline: 2px solid var(--gov-primary-red);
  outline-offset: 3px;
}

/* Summary Card */
.summary-card {
  background-color: var(--gov-background-white);
  border-radius: 5px;
  padding: 1.25rem 1rem; /* Adjusted padding */
  text-align: center;
  border: 1px solid var(--gov-border-color);
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: inherit;
  position: relative; /* For pseudo-elements */
  overflow: hidden;
}
.summary-card::before { /* Subtle top accent line */
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: transparent; /* Default transparent */
    transition: background-color 0.3s ease;
}
.summary-card-link:hover .summary-card::before {
    background-color: var(--gov-primary-red); /* Red accent line on hover */
}

.card-icon { /* Renamed for clarity */
  font-size: 2.2rem;
  margin-bottom: 0.75rem;
  display: block;
  transition: transform 0.3s ease-out;
}
.summary-card-link:hover .card-icon {
    transform: scale(1.15) rotate(-5deg);
}

.summary-value {
  display: block;
  font-size: 1.9rem;
  font-weight: 700;
  margin-bottom: 0.3rem;
  color: var(--gov-text-primary);
  line-height: 1.2;
  min-height: 1.2em; /* Ensure consistent height */
}
.summary-label {
  font-size: 0.85rem;
  color: var(--gov-text-secondary);
  font-weight: 500; /* Bolder label */
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
  max-width: 100%;
}

/* Card Icon Colors (using semantic names from gov theme) */
.summary-card.type-notes .card-icon { color: var(--gov-success-green); }
.summary-card.type-study .card-icon { color: var(--gov-accent-blue); } /* Changed for variety */
.summary-card.type-tasks .card-icon { color: var(--gov-primary-red); }
.summary-card.type-pomodoro .card-icon { color: var(--gov-warning-orange); }
.summary-card.type-error .card-icon { color: var(--gov-danger-red); }
.summary-card.type-knowledge .card-icon { color: var(--gov-info-blue); }


/* Loading & Error */
.loading-indicator.card, .error-message.card {
  padding: 2rem;
  border-left: 5px solid var(--gov-border-color-strong);
}
.loading-indicator.card { border-left-color: var(--gov-accent-blue); }
.error-message.card {
  border-left-color: var(--gov-danger-red);
  color: var(--gov-danger-red);
  display: flex; align-items: center; gap: 0.5em; justify-content: center;
}
.spinner {
  border: 4px solid var(--gov-background-light);
  border-top: 4px solid var(--gov-primary-red);
  border-radius: 50%;
  width: 30px; height: 30px;
  animation: spin 1s linear infinite;
  margin-right: 0.75rem; /* If used inline with text */
}
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }


/* Responsive */
@media (max-width: 1200px) {
  .info-highlight-card { grid-template-columns: 1fr; text-align: center; }
  .user-info-block, .info-item { justify-content: center; }
  .quick-actions-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
}
@media (max-width: 992px) {
  .dashboard-summary-grid { grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); }
  .section-subtitle { font-size: 1.3rem; }
}
@media (max-width: 768px) {
  .dashboard-summary-grid { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
  .summary-value { font-size: 1.6rem; }
  .card-icon { font-size: 2rem; }
  .info-item i:not(.fa-user-tie) { font-size: 1.8rem; }
  .quick-actions-grid { grid-template-columns: 1fr; } /* Single column for quick actions */
}
@media (max-width: 480px) {
  .dashboard-summary-grid { grid-template-columns: 1fr; }
  .summary-card {
    flex-direction: row; align-items: center; text-align: left; padding: 1rem;
  }
  .card-icon { font-size: 1.6rem; margin-bottom: 0; margin-right: 1rem; }
  .summary-value { font-size: 1.4rem; margin-bottom: 0.1rem; }
  .summary-label { font-size: 0.8rem; }
  .user-avatar-placeholder { width: 50px; height: 50px; }
  .user-avatar-placeholder i { font-size: 1.5rem; }
}
</style>