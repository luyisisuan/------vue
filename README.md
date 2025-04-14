# 备考智能驾驶舱 (前端 - Vue 3 SPA)

本项目是"备考智能驾驶舱"的前端部分，一个使用 Vue 3 构建的单页应用程序 (SPA)，旨在为用户提供一个集中管理公务员考试备考信息的交互式界面。

## 项目目的

为备考公务员的用户（特别是项目开发者本人）提供一个集计划制定、进度跟踪、学习辅助、信息记录于一体的个人仪表盘，提升备考效率和条理性。

## 技术栈

* **框架:** Vue 3 (使用 Composition API)
* **构建工具:** Vite
* **路由:** Vue Router 4 (实现客户端页面导航)
* **状态管理:** Pinia 3 (集中管理应用状态和与后端交互的逻辑)
* **HTTP 客户端:** Axios (用于向后端 API 发送请求)
* **UI:** HTML5, CSS3 (使用了 CSS 变量), Font Awesome (图标)
* **辅助库:** 
  * date-fns (日期处理)
  * lodash-es (工具函数如 throttle/debounce)
  * sanitize-html (内容安全清理)
* **语言:** JavaScript

## 项目结构

* `public/`: 静态资源，直接复制到构建输出。
* `src/`: 主要源代码目录。
  * `assets/`: CSS、图片等静态资源 (会被 Vite 处理)。
    * `gwy-global.css`: 全局样式定义，包含CSS变量、基础样式和响应式设计规则
  * `components/`: 可复用的 UI 组件。
    * `Sidebar.vue`: 侧边栏导航组件
    * 其他可复用组件
  * `views/`: 页面级组件，由 Vue Router 映射。
    * `DashboardSection.vue`: 仪表盘主页
    * `StudyLogSection.vue`: 学习统计页面
    * `NotesSection.vue`: 备考笔记页面
    * `ResourcesSection.vue`: 资源库页面
    * `StudyGoals.vue`: 学习目标页面
    * 其他页面组件
  * `stores/`: Pinia Store 文件，每个文件管理特定功能模块的状态和 API 交互逻辑。
    * `appStore.js`: 应用全局状态管理
    * `studyLogStore.js`: 学习日志状态管理
    * `noteStore.js`: 笔记状态管理
    * `errorLogStore.js`: 错题记录状态管理
    * `knowledgeStore.js`: 知识库状态管理
    * 其他状态管理模块
  * `router/`: Vue Router 配置文件 (`index.js`)。
  * `utils/`: 通用工具函数 (如 `formatters.js`)。
  * `App.vue`: 应用的根组件，包含整体布局。
  * `main.js`: 应用入口，初始化 Vue、Pinia、Router。
* `index.html`: SPA 的 HTML 入口文件。
* `package.json`: 项目依赖和脚本。
* `vite.config.js`: Vite 配置文件。

## 核心功能与实现

### 整体布局

* 采用侧边栏 + 主内容区的经典布局
* 响应式设计，适配不同屏幕尺寸
* 使用 CSS 变量统一管理主题色彩和尺寸

### 在线时长跟踪

* 通过 `appStore` 实现用户在线时长的自动跟踪
* 在应用挂载时启动跟踪，卸载时停止并保存
* 使用 `provide/inject` 将格式化的在线时长提供给子组件

### 错题管理

* 错题数据由 `errorLogStore` 管理，负责调用**后端 API** 进行增、删、改（标记复习）、查（加载、筛选）
* 组件负责展示列表、处理表单输入和触发 Store actions

### 知识库 (Knowledge Base)

* 知识条目由 `knowledgeStore` 管理，负责调用**后端 API** 进行增、删、查（加载、筛选、搜索）
* 组件负责展示列表、处理表单输入和触发 Store actions
* 使用 `sanitize-html` 处理可能的用户输入内容，并有简单的文本高亮

### 学习统计 (Study Log)

* 学习日志列表由 `studyLogStore` 从**后端 API** 加载
* 今日/本周/本月/总计学习时长由 `studyLogStore` 中的 **getter (计算属性)** 基于加载的日志数据动态计算得出
* 组件负责展示统计数据和日志列表，并提供调用 Store action 清空日志的功能

### 备考笔记 (Notes)

* 笔记内容（包括通用笔记和之前时间轴的阶段笔记）由 `noteStore` 管理
* 采用**日志式**记录，每次"保存"都会调用 `noteStore` 的 action 通过 **POST API** 创建一条新的笔记记录
* 组件负责展示所有笔记列表（按时间排序）和提供输入新笔记的区域
* 使用 `sanitize-html` 清理显示内容

### 资源库 (Resources)

* 资源链接列表管理，支持添加、编辑和删除资源链接
* 按类别组织和展示资源
* 提供搜索和筛选功能

### 学习目标 (Study Goals)

* 通过 `StudyGoals.vue` 组件实现学习目标的管理
* 支持添加、标记完成和删除学习目标
* 与后端 API 交互保存和加载目标数据

## UI 设计特点

* 使用 CSS 变量定义主题色彩和尺寸，便于统一管理和主题切换
* 响应式设计，适配桌面、平板和移动设备
* 使用 Font Awesome 图标增强视觉效果
* 卡片式布局和渐变色图标提升用户体验
* 过渡动画增强交互体验

## 运行方式

1. 安装依赖: `npm install`
2. 启动开发服务器: `npm run dev` (通常运行在 `http://localhost:5173`)
3. 构建生产版本: `npm run build` (输出到 `dist` 目录)

**注意:** 本前端应用需要连接到**后端 API**才能正常工作（加载和保存数据）。请确保后端服务已启动并在前端正确配置了 API 地址。

## 浏览器兼容性

本项目使用现代 JavaScript 特性和 CSS 变量，建议使用最新版本的 Chrome、Firefox、Safari 或 Edge 浏览器。

## 未来计划

* 添加用户认证功能
* 实现数据导出/导入功能
* 添加更多数据可视化图表
* 实现深色模式主题切换
* 优化移动端体验