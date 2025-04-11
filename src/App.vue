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
import { provide, onMounted, onUnmounted } from 'vue'; // 导入 provide
import { storeToRefs } from 'pinia';
import { useAppStore } from '@/stores/appStore.js'; // 1. 导入 App Store

const appStore = useAppStore(); // 2. 获取实例

// 3. 获取响应式的 formattedOnlineTime getter
const { formattedOnlineTime } = storeToRefs(appStore);

// 4. 在生命周期钩子中调用 store actions
onMounted(() => {
  console.log('App component mounted.');
  appStore.startOnlineTracking(); // 启动在线时长跟踪
});

onUnmounted(() => {
  console.log('App component unmounted.');
  appStore.stopOnlineTracking(); // 停止并保存
});

// 5. Provide 从 store 获取的计算属性
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