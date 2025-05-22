<!-- src/components/Sidebar.vue -->
<template>
  <!-- 
    动态绑定 'is-collapsed' 类，其值来自 appStore.isSidebarCollapsed
    Sidebar 组件自身不再通过 v-if 控制显隐，这个由 App.vue 控制
  -->
  <aside class="sidebar" :class="{ 'is-collapsed': appStore.isSidebarCollapsed }">
    <div class="sidebar-header">
      <i class="fas fa-rocket logo-icon"></i>
      <span class="logo-text">备考站</span>
    </div>
    <nav class="sidebar-nav">
      <ul>
        <li>
          <router-link to="/dashboard" class="nav-link" aria-label="仪表盘">
            <i class="fas fa-tachometer-alt fa-fw"></i><span>仪表盘</span>
          </router-link>
        </li>
        <li>
          <router-link to="/timeline" class="nav-link" aria-label="备考轴">
            <i class="fas fa-stream fa-fw"></i><span>备考轴</span>
          </router-link>
        </li>
        <li>
          <router-link to="/course-tracker" class="nav-link" aria-label="课程追踪">
            <i class="fas fa-book-reader fa-fw"></i><span>课程追踪</span>
          </router-link>
        </li>
        <li>
          <router-link to="/pomodoro" class="nav-link" aria-label="番茄钟">
            <i class="fas fa-stopwatch-20 fa-fw"></i><span>番茄钟</span>
          </router-link>
        </li>
        <li>
          <router-link to="/error-log" class="nav-link" aria-label="错题本">
            <i class="fas fa-exclamation-triangle fa-fw"></i><span>错题本</span>
          </router-link>
        </li>
        <li>
          <router-link to="/knowledge-base" class="nav-link" aria-label="知识库">
            <i class="fas fa-brain fa-fw"></i><span>知识库</span>
          </router-link>
        </li>
        <li>
          <router-link to="/study-log" class="nav-link" aria-label="学习统计">
            <i class="fas fa-chart-pie fa-fw"></i><span>学习统计</span>
          </router-link>
        </li>
         <li>
          <router-link to="/goals" class="nav-link">
            <i class="fas fa-bullseye fa-fw"></i><span>学习目标</span>
          </router-link>
        </li>
        <li>
          <router-link to="/notes" class="nav-link" aria-label="备考笔记">
            <i class="fas fa-pencil-alt fa-fw"></i><span>备考笔记</span>
          </router-link>
        </li>
        <li>
          <router-link to="/resources" class="nav-link" aria-label="资源库">
            <i class="fas fa-link fa-fw"></i><span>资源库</span>
          </router-link>
        </li>
      </ul>
    </nav>
    <div class="sidebar-footer">
      <span id="current-time">{{ currentTime }}</span>
      <p>©2253864680@qq.com|段绪程</p>
    </div>
    <!-- 可选的切换按钮，调用 appStore 中的 toggleSidebar -->
    <button @click="appStore.toggleSidebar" class="sidebar-toggle-btn" :title="appStore.isSidebarCollapsed && !appStore.isSidebarHidden ? '展开侧边栏' : '收起侧边栏'">
       <i :class="appStore.isSidebarCollapsed && !appStore.isSidebarHidden ? 'fas fa-chevron-right' : 'fas fa-chevron-left'"></i>
    </button>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'; // 移除了 inject 和 computed (如果只用于此组件的sidebar状态)
import { useAppStore } from '@/stores/appStore.js'; // 导入 appStore

const appStore = useAppStore(); // 获取 appStore 实例

const currentTime = ref('--:--:--');
let timeInterval = null;

// 移除了 inject('isSidebarCollapsed') 和 inject('toggleSidebar')
// 现在直接使用 appStore.isSidebarCollapsed 和 appStore.toggleSidebar

function updateCurrentTime() {
  const now = new Date();
  currentTime.value = now.toLocaleTimeString('zh-CN', { hour12: false });
}

onMounted(() => {
  updateCurrentTime();
  timeInterval = setInterval(updateCurrentTime, 1000);
});

onUnmounted(() => {
  clearInterval(timeInterval);
});
</script>

<style scoped>
/* --- Sidebar Base Styles --- */
.sidebar {
    width: var(--sidebar-width);
    background-color: var(--sidebar-bg);
    border-right: 1px solid var(--border-color);
    display: flex;
    flex-direction: column;
    position: fixed; /* 改为 fixed 以便 main-content 可以使用 padding-left 控制布局 */
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    height: 100vh;
    transition: width var(--transition-speed) ease;
}

/* --- Collapsed State Styles --- */
.sidebar.is-collapsed {
    width: var(--sidebar-width-collapsed);
}
.sidebar.is-collapsed .logo-text,
.sidebar.is-collapsed .sidebar-nav .nav-link span,
.sidebar.is-collapsed .sidebar-footer p,
.sidebar.is-collapsed .sidebar-footer #current-time {
    opacity: 0;
    pointer-events: none;
    position: absolute;
    left: -9999px; /* 使用这种方式彻底移出视口，比 visibility:hidden 或 display:none 对过渡更友好 */
    transition: opacity 0.1s ease; /* 快速隐藏的过渡 */
}
.sidebar.is-collapsed .sidebar-header {
    justify-content: center; /* 使 logo-icon 在收起时居中 */
    padding-left: calc((var(--sidebar-width-collapsed) - 24px) / 2); /* (收起宽度 - 图标宽度) / 2 */
    padding-right: calc((var(--sidebar-width-collapsed) - 24px) / 2);
}
.sidebar.is-collapsed .logo-icon {
    /* 如果需要，可以调整 margin 使其严格居中，但 justify-content 通常足够 */
}
.sidebar.is-collapsed .sidebar-nav .nav-link {
    padding-left: calc((var(--sidebar-width-collapsed) - 24px) / 2);
    padding-right: calc((var(--sidebar-width-collapsed) - 24px) / 2);
}
.sidebar.is-collapsed .sidebar-nav .nav-link i {
    margin-right: 0;
}
.sidebar.is-collapsed .sidebar-footer {
    padding-left: calc((var(--sidebar-width-collapsed) - 24px) / 2);
    padding-right: calc((var(--sidebar-width-collapsed) - 24px) / 2);
}


/* --- Header, Nav, Footer - General Styles (保持之前的样式，但确保过渡与 is-collapsed 协调) --- */
.sidebar-header {
    padding: 1.5rem var(--content-padding);
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border-bottom: 1px solid var(--border-color);
    flex-shrink: 0;
    overflow: hidden;
    transition: padding var(--transition-speed) ease, justify-content var(--transition-speed) ease;
}
.logo-icon {
    font-size: 1.8rem;
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    flex-shrink: 0;
    /* transition: margin var(--transition-speed) ease; */ /* 移到 is-collapsed 中处理 */
}
.logo-text {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-color);
    white-space: nowrap;
    transition: opacity var(--transition-speed) ease 0.05s; /* 稍微延迟一点，避免与宽度冲突 */
}

.sidebar-nav {
    flex-grow: 1;
    padding-top: 1rem;
    overflow-y: auto;
    overflow-x: hidden;
}
.sidebar-nav ul {
    list-style: none;
    padding: 0;
    margin: 0;
}
.sidebar-nav .nav-link {
    display: flex;
    align-items: center;
    padding: 0.9rem var(--content-padding);
    margin: 0.3rem 0;
    color: var(--text-light);
    font-weight: 500;
    border-radius: 0 var(--card-border-radius) var(--card-border-radius) 0;
    position: relative;
    overflow: hidden;
    white-space: nowrap;
    text-decoration: none;
    transition: background-color var(--transition-speed) ease,
                color var(--transition-speed) ease,
                padding var(--transition-speed) ease;
}
.sidebar-nav .nav-link i {
    width: 24px; /* 固定图标宽度 */
    margin-right: 1rem;
    font-size: 1.1rem;
    flex-shrink: 0;
    text-align: center;
    transition: transform var(--transition-speed) ease, margin-right var(--transition-speed) ease;
}
.sidebar-nav .nav-link span {
    transition: opacity var(--transition-speed) ease 0.05s; /* 稍微延迟 */
    overflow: hidden;
    text-overflow: ellipsis; /* 如果文本太长，显示省略号 */
}
.sidebar-nav .nav-link::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: var(--primary-color);
    transform: scaleY(0);
    transition: transform var(--transition-speed) ease;
    border-radius: 0 4px 4px 0;
}
.sidebar-nav .nav-link:hover {
    background-color: #f0f4f8; /* 考虑使用CSS变量: var(--sidebar-hover-bg, #f0f4f8); */
    color: var(--primary-color);
}
/* 激活状态的样式 */
.sidebar-nav .nav-link.router-link-active, /* Vue Router 3 and below */
.sidebar-nav .nav-link.router-link-exact-active { /* Vue Router 4+ */
    color: var(--primary-color);
    background-color: #e9eff8; /* 考虑使用CSS变量: var(--sidebar-active-bg, #e9eff8); */
    font-weight: 600;
}
.sidebar-nav .nav-link.router-link-active::before,
.sidebar-nav .nav-link.router-link-exact-active::before {
    transform: scaleY(1);
}
.sidebar-nav .nav-link.router-link-active i,
.sidebar-nav .nav-link.router-link-exact-active i {
    transform: scale(1.1); /* 轻微放大激活的图标 */
}

.sidebar-footer {
    padding: 1.5rem var(--content-padding);
    border-top: 1px solid var(--border-color);
    font-size: 0.8rem;
    color: var(--text-light);
    text-align: center;
    flex-shrink: 0;
    overflow: hidden; /* 防止内容溢出 */
    transition: padding var(--transition-speed) ease, opacity var(--transition-speed) ease;
}
.sidebar-footer #current-time {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
    transition: opacity var(--transition-speed) ease 0.05s;
}
.sidebar-footer p {
    margin-top: 0.5rem;
    margin-bottom: 0;
    white-space: nowrap;
    transition: opacity var(--transition-speed) ease 0.05s;
}

/* --- Toggle Button (Optional) --- */
.sidebar-toggle-btn {
    position: absolute;
    /* Vertically align it with the header content, adjust top based on your header's actual height */
    top: calc(1.5rem + (1.8rem * 1.2 / 2)); /* Approx. header padding + half of logo icon height */
    right: -15px; /* Half of the button outside */
    transform: translateY(-50%);
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background-color: var(--sidebar-bg);
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 5px rgba(0,0,0,0.1);
    color: var(--text-light);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1001; /* Above sidebar itself */
    transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease, transform var(--transition-speed) ease;
}
.sidebar-toggle-btn:hover {
    background-color: var(--primary-color);
    color: white;
}
/* No special style for .sidebar.is-collapsed .sidebar-toggle-btn needed unless you want to move it */

/* --- Responsive Adjustments (Simplified as 'is-collapsed' handles most hiding) --- */
@media (max-width: 768px) {
  /* On small screens, you might want to force the sidebar to be collapsed by default.
     This would typically be handled by setting the initial state in appStore
     based on window width, or by having a separate CSS class for small screens
     that mimics the 'is-collapsed' state if JavaScript control is not desired.
     For now, we assume 'is-collapsed' state is king.
  */
  /* Example: if you wanted small screens to ALWAYS have smaller padding for icons:
  .sidebar-header,
  .sidebar-nav .nav-link,
  .sidebar-footer {
      padding-left: calc((var(--sidebar-width-collapsed) - 24px) / 2);
      padding-right: calc((var(--sidebar-width-collapsed) - 24px) / 2);
  }
  .sidebar-nav .nav-link i {
      margin-right: 0;
  }
  */
}
</style>