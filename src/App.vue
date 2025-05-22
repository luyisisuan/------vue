<!-- src/App.vue -->
<template>
  <!-- 
    根据 appStore 中的 isSidebarHidden 和 isSidebarCollapsed 状态动态添加类名
    - sidebar-hidden-app: 当侧边栏完全隐藏时
    - sidebar-collapsed-app: 当侧边栏收起但未隐藏时
  -->
  <div :class="['app-container', { 
    'sidebar-collapsed-app': appStore.isSidebarCollapsed && !appStore.isSidebarHidden, 
    'sidebar-hidden-app': appStore.isSidebarHidden 
  }]">
    <!-- 仅当 isSidebarHidden 为 false 时渲染 Sidebar 组件 -->
    <Sidebar v-if="!appStore.isSidebarHidden" />
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
import { RouterView, useRoute } from 'vue-router'; // 移除了 useRouter，因为这里不用它
import { provide, onMounted, onUnmounted, computed, watch } from 'vue';
import { useAppStore } from '@/stores/appStore.js';
import { useStudyLogStore } from '@/stores/studyLogStore.js';
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { storeToRefs } from 'pinia';

const appStore = useAppStore();
const studyLogStore = useStudyLogStore();
const pomodoroStore = usePomodoroStore();
const route = useRoute(); // 获取当前路由对象

// 从 studyLogStore 获取在线时长数据
const { todayOnlineSeconds } = storeToRefs(studyLogStore);

const formattedOnlineTime = computed(() => {
  const seconds = Number(todayOnlineSeconds.value) || 0;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
});

// 监听路由变化以更新侧边栏状态
watch(
  () => route.meta, // 监听路由的 meta 对象
  (newMeta) => {
    const behavior = newMeta?.sidebarBehavior; // 使用可选链操作符

    if (behavior === 'collapsed') {
      appStore.setSidebarHidden(false); // 确保不是隐藏状态
      appStore.setSidebarCollapsed(true);
    } else if (behavior === 'expanded') {
      appStore.setSidebarHidden(false); // 确保不是隐藏状态
      appStore.setSidebarCollapsed(false);
    } else if (behavior === 'hidden') {
      appStore.setSidebarHidden(true);
      // 当隐藏时，isSidebarCollapsed 也会被 appStore.setSidebarHidden(true) 设为 true
    } else {
      // 默认行为：如果路由没有定义 sidebarBehavior，则展开
      appStore.setSidebarHidden(false);
      appStore.setSidebarCollapsed(false);
    }
  },
  { immediate: true, deep: true } // immediate: 初始加载时执行, deep: 如果meta是复杂对象可能需要
);


onMounted(async () => {
  console.log('App component mounted. Initializing stores...');
  appStore.startOnlineTracking();
  try {
    await Promise.all([
      studyLogStore.initializeStore(),
      pomodoroStore.initializeStore()
    ]);
    console.log('Core stores (StudyLog, Pomodoro) initialized successfully.');
  } catch (error) {
    console.error('Error during core store initialization in App.vue:', error);
  }
  console.log('App.vue onMounted: All initialization tasks queued/completed.');
});

onUnmounted(() => {
  console.log('App component unmounted.');
  appStore.stopOnlineTracking();
});

provide('onlineTimeDisplay', formattedOnlineTime);

</script>

<style>
/* App.vue 的全局或布局样式 */
:root { /* 确保这些变量在全局定义，例如在 main.css 或这里 */
  --sidebar-width: 260px; /* 侧边栏展开时的宽度 */
  --sidebar-width-collapsed: 70px; /* 侧边栏收起时的宽度 (仅图标) */
  --content-padding: 1.5rem; /* 主内容区的内边距 */
  --transition-speed: 0.3s; /* 过渡动画速度 */
  /* 其他你可能需要的全局颜色、字体等变量 */
  --sidebar-bg: #ffffff;
  --border-color: #e9ecef;
  --text-color: #212529;
  --text-light: #6c757d;
  --primary-color: #D90000;
  --gradient-primary: linear-gradient(45deg, var(--primary-color), #ff5c5c);
  --card-border-radius: 8px;
}

.app-container {
  display: flex;
  min-height: 100vh;
}

.main-content {
  flex-grow: 1;
  position: relative; /* 为了路由过渡 */
  overflow-y: auto; /* 如果内容过多，允许主内容区滚动 */
  background-color: #f8f9fa; /* 主内容区背景色示例 */
  padding: var(--content-padding); /* 上下右内边距 */
  
  /* 默认情况下，main-content 的左内边距适应展开的侧边栏 */
  padding-left: calc(var(--sidebar-width) + var(--content-padding));
  transition: padding-left var(--transition-speed) ease;
}

/* 当侧边栏收起但未隐藏时，调整 main-content 的左内边距 */
.app-container.sidebar-collapsed-app .main-content {
  padding-left: calc(var(--sidebar-width-collapsed) + var(--content-padding));
}

/* 当侧边栏完全隐藏时，main-content 的左内边距恢复为标准内边距 */
.app-container.sidebar-hidden-app .main-content {
  padding-left: var(--content-padding);
}

/* 路由过渡效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease-in-out;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>