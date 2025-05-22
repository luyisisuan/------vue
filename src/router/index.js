// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';

// 导入你的所有视图 (Section) 组件
// 确保这些组件文件都存在于 src/views/ 目录下
import DashboardSection from '@/views/DashboardSection.vue';
import TimelineSection from '@/views/TimelineSection.vue';
import CourseTrackerSection from '@/views/CourseTrackerSection.vue';
import PomodoroSection from '@/views/PomodoroSection.vue';
import ErrorLogSection from '@/views/ErrorLogSection.vue';
import KnowledgeBaseSection from '@/views/KnowledgeBaseSection.vue';
import StudyLogSection from '@/views/StudyLogSection.vue';
import NotesSection from '@/views/NotesSection.vue';
import ResourcesSection from '@/views/ResourcesSection.vue';
// import SettingsSection from '@/views/SettingsSection.vue';

// 定义路由规则数组
const routes = [
  {
    path: '/',
    redirect: '/dashboard'
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: DashboardSection,
    meta: { sidebarBehavior: 'expanded' } // 明确设置为展开
  },
  {
    path: '/timeline',
    name: 'Timeline',
    component: TimelineSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/goals',
    name: 'StudyGoals',
    component: () => import('@/views/StudyGoals.vue'),
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/course-tracker',
    name: 'CourseTracker',
    component: CourseTrackerSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/pomodoro',
    name: 'Pomodoro',
    component: PomodoroSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/error-log',
    name: 'ErrorLog',
    component: ErrorLogSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/knowledge-base',
    name: 'KnowledgeBase',
    component: KnowledgeBaseSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/study-log',
    name: 'StudyLog',
    component: StudyLogSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  {
    path: '/notes',
    name: 'Notes',
    component: NotesSection,
    meta: { sidebarBehavior: 'collapsed' } //  <<<---  笔记页面，侧边栏收起
  },
  {
    path: '/resources',
    name: 'Resources',
    component: ResourcesSection,
    meta: { sidebarBehavior: 'expanded' }
  },
  // 示例：一个可能需要全屏的路由
  // {
  //   path: '/focus-mode',
  //   name: 'FocusMode',
  //   component: () => import('@/views/FocusModePage.vue'), // 假设有这个组件
  //   meta: { sidebarBehavior: 'hidden' } //  <<<---  完全隐藏侧边栏
  // },
  // {
  //   path: '/settings',
  //   name: 'Settings',
  //   component: SettingsSection,
  //   meta: { sidebarBehavior: 'expanded' }
  // }
  // { path: '/:pathMatch(.*)*', name: 'NotFound', component: NotFoundComponent }
];

// 创建路由实例
const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
  linkActiveClass: 'active', // 和 Sidebar.vue 中的类名保持一致
  linkExactActiveClass: 'exact-active' // 也可配置，确保和 Sidebar.vue 中的类名保持一致
});

export default router;