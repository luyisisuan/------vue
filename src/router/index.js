// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

// 导入你的所有视图 (Section) 组件
// 确保这些组件文件都存在于 src/views/ 目录下
import DashboardSection from '@/views/DashboardSection.vue'; // '@' 是 src 目录的别名，Vite 默认配置好了
import TimelineSection from '@/views/TimelineSection.vue';
import CourseTrackerSection from '@/views/CourseTrackerSection.vue';
import PomodoroSection from '@/views/PomodoroSection.vue';
import ErrorLogSection from '@/views/ErrorLogSection.vue';
import KnowledgeBaseSection from '@/views/KnowledgeBaseSection.vue';
import StudyLogSection from '@/views/StudyLogSection.vue';
import NotesSection from '@/views/NotesSection.vue';
import ResourcesSection from '@/views/ResourcesSection.vue';
// 如果有 Settings Section，也在这里导入
// import SettingsSection from '@/views/SettingsSection.vue';

// 定义路由规则数组
const routes = [
  {
    path: '/', // 根路径
    redirect: '/dashboard' // 重定向到仪表盘页面
  },
  {
    path: '/dashboard', // 仪表盘路径
    name: 'Dashboard', // 路由名称 (可选，但有用)
    component: DashboardSection // 对应的组件
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: TimelineSection
  },
  // 新增路由:
  {
    path: '/goals', // 新路径
    name: 'StudyGoals', // 路由名称
    component: () => import('@/views/StudyGoals.vue') // 懒加载新组件
  },
  {
    path: '/course-tracker',
    name: 'CourseTracker',
    component: CourseTrackerSection
  },
  {
    path: '/pomodoro',
    name: 'Pomodoro',
    component: PomodoroSection
  },
  {
    path: '/error-log',
    name: 'ErrorLog',
    component: ErrorLogSection
  },
  {
    path: '/knowledge-base',
    name: 'KnowledgeBase',
    component: KnowledgeBaseSection
  },
  {
    path: '/study-log',
    name: 'StudyLog',
    component: StudyLogSection
  },
  {
    path: '/notes',
    name: 'Notes',
    component: NotesSection
  },
  {
    path: '/resources',
    name: 'Resources',
    component: ResourcesSection
  },
  // 如果有 Settings Section
  // {
  //   path: '/settings',
  //   name: 'Settings',
  //   component: SettingsSection
  // }
  // 可以添加一个 404 页面 (可选)
  // { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundComponent }
];

// 创建路由实例
const router = createRouter({
  // 使用 HTML5 History 模式 (推荐，URL 更美观，没有 #)
  // Vite 会在 import.meta.env.BASE_URL 中提供基础路径 (通常是 '/')
  history: createWebHistory(import.meta.env.BASE_URL),
  routes, // 路由规则数组
  // 当链接激活时，自动添加 'active' 类名到 <router-link>
  // 这会匹配我们之前在 Sidebar.vue 中为 .nav-link.active 写的样式
  linkActiveClass: 'active',
  linkExactActiveClass: 'active' // 对于精确匹配也使用 'active' 类 (可选)
});

// 导出路由实例，供 main.js 使用
export default router;