<!-- src/components/Sidebar.vue -->
<template>
  <aside class="sidebar">
    <div class="sidebar-header">
      <i class="fas fa-rocket logo-icon"></i>
      <span class="logo-text">备考站</span>
    </div>
    <nav class="sidebar-nav">
      <ul>
        <!-- 使用 router-link 替换 a 标签 -->
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
         <!-- 新增: 学习目标链接 -->
         <li>
          <router-link to="/goals" class="nav-link">
            <i class="fas fa-bullseye fa-fw"></i><span>学习目标</span>
          </router-link>
        </li>
        <!-- /新增 -->
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
         <!-- 如果有 Settings -->
         <!--
         <li>
           <router-link to="/settings" class="nav-link" aria-label="设置">
             <i class="fas fa-cog fa-fw"></i><span>设置</span>
           </router-link>
         </li>
         -->
      </ul>
    </nav>
    <div class="sidebar-footer">
      <span id="current-time">{{ currentTime }}</span>
      <!-- 直接显示注入的在线时长 -->
      <span id="online-time-display" class="footer-stat">在线: {{ injectedOnlineTime }}</span>
      <p>©2253864680@qq.com|段绪程</p>
    </div>
  </aside>
</template>

<script setup>
import { ref, onMounted, onUnmounted, inject } from 'vue';
import { RouterLink } from 'vue-router'; // 导入 RouterLink

const currentTime = ref('--:--:--');
let timeInterval = null;

// 使用 inject 接收来自 App.vue 的在线时长
// 'N/A' 是默认值，以防 provide 未提供
const injectedOnlineTime = inject('onlineTimeDisplay', '00:00:00');

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
/* --- Sidebar --- */
.sidebar {
    width: var(--sidebar-width); /* 依赖全局 CSS 变量 */
    background-color: var(--sidebar-bg); /* 依赖全局 CSS 变量 */
    border-right: 1px solid var(--border-color); /* 依赖全局 CSS 变量 */
    display: flex;
    flex-direction: column;
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 1000;
    transition: transform var(--transition-speed) ease, width var(--transition-speed) ease; /* 添加 width 过渡 */
    height: 100vh; /* 确保占满高度 */
}

.sidebar-header {
    padding: 1.5rem var(--content-padding); /* 依赖全局 CSS 变量 */
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border-bottom: 1px solid var(--border-color); /* 依赖全局 CSS 变量 */
    flex-shrink: 0; /* 防止头部被压缩 */
    overflow: hidden; /* 防止内容溢出 */
}
.logo-icon {
    font-size: 1.8rem;
    background: var(--gradient-primary); /* 依赖全局 CSS 变量 */
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    flex-shrink: 0; /* 防止图标压缩 */
}
.logo-text {
    font-size: 1.2rem;
    font-weight: 700;
    color: var(--text-color); /* 依赖全局 CSS 变量 */
    white-space: nowrap; /* 防止换行 */
    transition: opacity 0.1s ease; /* 添加过渡效果 */
}

.sidebar-nav {
    flex-grow: 1;
    padding-top: 1rem;
    overflow-y: auto; /* 如果内容超长则滚动 */
    overflow-x: hidden; /* 防止水平滚动 */
}
.sidebar-nav ul {
    list-style: none;
    padding: 0; /* 移除默认 padding */
    margin: 0; /* 移除默认 margin */
}
.sidebar-nav .nav-link {
    display: flex;
    align-items: center;
    padding: 0.9rem var(--content-padding); /* 依赖全局 CSS 变量 */
    margin: 0.3rem 0;
    color: var(--text-light); /* 依赖全局 CSS 变量 */
    font-weight: 500;
    border-radius: 0 var(--card-border-radius) var(--card-border-radius) 0; /* 依赖全局 CSS 变量 */
    position: relative;
    overflow: hidden;
    transition: background-color var(--transition-speed) ease, color var(--transition-speed) ease; /* 依赖全局 CSS 变量 */
    white-space: nowrap;
    text-decoration: none; /* 清除 a 标签默认下划线 */
}
.sidebar-nav .nav-link i {
    width: 24px; /* 固定宽度 */
    margin-right: 1rem; /* 与文字间距 */
    font-size: 1.1rem;
    transition: transform var(--transition-speed) ease, margin var(--transition-speed) ease; /* 添加 margin 过渡 */
    flex-shrink: 0;
    text-align: center;
}
.sidebar-nav .nav-link span {
    transition: opacity var(--transition-speed) ease; /* 依赖全局 CSS 变量 */
    overflow: hidden;
    text-overflow: ellipsis;
}
/* 激活状态左侧竖线 */
.sidebar-nav .nav-link::before {
    content: '';
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background-color: var(--primary-color); /* 依赖全局 CSS 变量 */
    transform: scaleY(0);
    transition: transform var(--transition-speed) ease; /* 依赖全局 CSS 变量 */
    border-radius: 0 4px 4px 0;
}

.sidebar-nav .nav-link:hover {
    background-color: #f0f4f8;
    color: var(--primary-color);
}
/* 激活状态样式 - router-link 会自动添加 linkActiveClass ('active') */
.sidebar-nav .nav-link.active {
    color: var(--primary-color);
    background-color: #e9eff8;
    font-weight: 600;
}
.sidebar-nav .nav-link.active::before {
    transform: scaleY(1);
}
.sidebar-nav .nav-link.active i {
    transform: scale(1.1);
}

.sidebar-footer {
    padding: 1.5rem var(--content-padding); /* 依赖全局 CSS 变量 */
    border-top: 1px solid var(--border-color); /* 依赖全局 CSS 变量 */
    font-size: 0.8rem;
    color: var(--text-light); /* 依赖全局 CSS 变量 */
    text-align: center;
    flex-shrink: 0; /* 防止页脚被内容压缩 */
    transition: padding var(--transition-speed) ease; /* 添加 padding 过渡 */
    overflow: hidden; /* 防止内容溢出 */
}
.sidebar-footer #current-time {
    display: block;
    font-weight: 500;
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
}
.sidebar-footer #online-time-display {
    display: block;
    font-size: 0.85rem;
    color: var(--text-light);
    margin-top: 0.3rem;
    font-weight: 500;
    white-space: nowrap; /* 防止在线时长换行 */
}
.sidebar-footer p {
    margin-top: 0.5rem;
    margin-bottom: 0;
    white-space: nowrap; /* 防止版权信息换行 */
    transition: opacity 0.1s ease; /* 添加过渡 */
}

/* --- Sidebar Responsive Adjustments (Scoped) --- */
@media (max-width: 768px) {
    /* 在小屏幕下，隐藏文字，调整间距 */
    .logo-text,
    .sidebar-nav .nav-link span,
    .sidebar-footer p {
        opacity: 0;
        pointer-events: none; /* 隐藏元素不可交互 */
        position: absolute; /* 脱离文档流，避免影响布局 */
        left: -9999px; /* 移出视口 */
    }

    .sidebar-header,
    .sidebar-nav .nav-link,
    .sidebar-footer {
        /* 动态计算内边距，使图标居中 */
        padding-left: calc((var(--sidebar-width) - 24px) / 2); /* (总宽度 - 图标宽度) / 2 */
        padding-right: calc((var(--sidebar-width) - 24px) / 2);
    }

    .sidebar-nav .nav-link i {
         margin-right: 0; /* 移除图标右边距 */
    }

    .sidebar-footer {
         padding-top: 1rem; /* 调整页脚上边距 */
         padding-bottom: 1rem;
    }
     .sidebar-footer #online-time-display {
         /* 如果需要，调整在线时长的样式 */
         font-size: 0.75rem;
     }
}
</style>