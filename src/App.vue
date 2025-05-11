<!-- src/App.vue -->
<template>
  <div class="app-container">
    <Sidebar />
    <main class="main-content">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<script setup>
import Sidebar from './components/Sidebar.vue';
import { RouterView } from 'vue-router';
import { provide, onMounted, onUnmounted, computed } from 'vue';
import { useAppStore } from '@/stores/appStore.js';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const studyLogStore = useStudyLogStore();
const pomodoroStore = usePomodoroStore();

// 从 studyLogStore 获取在线时长数据 (用于显示，与番茄钟学习时长是分开的)
const { todayOnlineSeconds } = storeToRefs(studyLogStore);

// 创建格式化的在线时长计算属性
const formattedOnlineTime = computed(() => {
  const seconds = Number(todayOnlineSeconds.value) || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
});

// 在组件挂载时初始化各个 store
onMounted(async () => {
  console.log('App component mounted. Initializing stores...');

  // 1. 初始化 App Store (负责应用级别的状态，如在线时长跟踪)
  appStore.startOnlineTracking();

  // 2. 并行初始化其他核心 stores
  // 使用 Promise.all 确保它们都完成后再继续（如果需要），或至少都开始初始化
  try {
    await Promise.all([
      studyLogStore.initializeStore(), // 负责学习日志和统计
      pomodoroStore.initializeStore()  // 负责番茄钟逻辑和设置
      // 如果还有其他应用启动时需要初始化的 store，也在这里调用它们的初始化方法
    ]);
    console.log('Core stores (StudyLog, Pomodoro) initialized successfully.');
  } catch (error) {
    console.error('Error during core store initialization in App.vue:', error);
    // 这里可以添加一些全局错误处理逻辑，例如向用户显示一个通用的初始化失败消息
  }
  
  console.log('App.vue onMounted: All initialization tasks queued/completed.');
});

onUnmounted(() => {
  console.log('App component unmounted.');
  // 停止 App Store 的在线跟踪
  appStore.stopOnlineTracking();

  // 各个 store 内部的 onUnmounted 钩子（如果有，例如 studyLogStore 中的 stopStatsPolling）
  // 会在 store 不再被使用时执行清理。
  // 如果 pomodoroStore 有需要在应用级别卸载时执行的特定清理 (如 cleanupTimer)，
  // 且其内部 onUnmounted 不足以覆盖，可以在此调用。
  // pomodoroStore.cleanupTimer();
});

// Provide 格式化的在线时长，如果子组件需要通过 inject 访问
provide('onlineTimeDisplay', formattedOnlineTime);

</script>

<style>
/* App.vue 的全局或布局样式 */
.app-container {
  display: flex;
  min-height: 100vh;
  /* 根据你的 Sidebar.vue 和 main-content 的实际布局调整 */
}

.main-content {
  flex-grow: 1;
  /* 确保 main-content 能正确处理 Sidebar 的宽度 */
  /* 之前的 margin-left: var(--sidebar-width); 可能在 gwy-global.css 中 */
  position: relative; /* 为了路由过渡效果 */
  overflow-y: auto; /* 如果内容过多，允许主内容区滚动 */
  /* padding: var(--content-padding); 可能在 gwy-global.css 中 */
}

/* 简单的淡入淡出路由过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out; /* 调整过渡时间和曲线 */
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>