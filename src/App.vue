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
import { provide, onMounted, onUnmounted, ref, computed } from 'vue'; // 导入 provide, ref, computed
import { useAppStore } from '@/stores/appStore.js'; // 1. 导入 App Store
import { useStudyLogStore } from '@/stores/studyLogStore.js'; // 导入 StudyLog Store 获取在线时长
import { storeToRefs } from 'pinia';

const appStore = useAppStore(); // 2. 获取 App Store 实例
const studyLogStore = useStudyLogStore(); // 获取 StudyLog Store 实例

// 从 studyLogStore 获取在线时长数据
const { todayOnlineSeconds } = storeToRefs(studyLogStore);

// 创建格式化的在线时长计算属性
const formattedOnlineTime = computed(() => {
  const seconds = todayOnlineSeconds.value || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
});

// 4. 在生命周期钩子中调用 store actions
onMounted(() => {
  console.log('App component mounted.');
  appStore.startOnlineTracking(); // 启动在线时长跟踪
  // 加载最新的活动统计数据
  studyLogStore.loadActivityStats();
});

onUnmounted(() => {
  console.log('App component unmounted.');
  appStore.stopOnlineTracking(); // 停止并保存
});

// 5. Provide 格式化的在线时长给子组件
provide('onlineTimeDisplay', formattedOnlineTime);


</script>

<style>
/* App.vue 的全局或布局样式 */
.main-content {
  /* ... 之前的样式 ... */
   position: relative; /* 为了过渡效果 */
}

/* 简单的淡入淡出过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>