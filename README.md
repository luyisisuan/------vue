# 备考智能驾驶舱 (前端 - Vue 3 SPA)

本项目是“备考智能驾驶舱”的前端部分，一个使用 Vue 3 构建的单页应用程序 (SPA)，旨在为用户提供一个集中管理公务员考试备考信息的交互式界面。

## 项目目的

为备考公务员的用户（特别是项目开发者本人）提供一个集计划制定、进度跟踪、学习辅助、信息记录于一体的个人仪表盘，提升备考效率和条理性。

## 技术栈

*   **框架:** Vue 3 (使用 Composition API)
*   **构建工具:** Vite
*   **路由:** Vue Router 4 (实现客户端页面导航)
*   **状态管理:** Pinia 2 (集中管理应用状态和与后端交互的逻辑)
*   **HTTP 客户端:** Axios (用于向后端 API 发送请求)
*   **UI:** HTML5, CSS3 (使用了 CSS 变量), Font Awesome (图标)
*   **辅助库:** date-fns (日期处理), lodash-es (工具函数如 throttle/debounce), sanitize-html (内容安全清理)
*   **语言:** JavaScript

## 项目结构

*   `public/`: 静态资源，直接复制到构建输出。
*   `src/`: 主要源代码目录。
    *   `assets/`: CSS、图片等静态资源 (会被 Vite 处理)。
    *   `components/`: 可复用的 UI 组件 (如 `Sidebar.vue`)。
    *   `views/`: 页面级组件，由 Vue Router 映射 (如 `DashboardSection.vue`, `NotesSection.vue`)。
    *   `stores/`: Pinia Store 文件，每个文件管理特定功能模块的状态和 API 交互逻辑 (如 `noteStore.js`, `taskStore.js`)。
    *   `router/`: Vue Router 配置文件 (`index.js`)。
    *   `utils/`: 通用工具函数 (如 `formatters.js`)。
    *   `App.vue`: 应用的根组件，包含整体布局。
    *   `main.js`: 应用入口，初始化 Vue、Pinia、Router。
*   `index.html`: SPA 的 HTML 入口文件。
*   `package.json`: 项目依赖和脚本。
*   `vite.config.js`: Vite 配置文件。

## 核心功能与实现

本项目通过组件化的方式构建界面，实现了多个功能模块：

*   **导航栏概览 (Dashboard):**
    *   显示静态信息和倒计时。
    *   通过 **Pinia Store** 获取各个功能模块的摘要数据（如任务进度、笔记数量等）并展示。数据源自对应 Store 从后端加载的状态。
*   **备考时间轴 (Timeline):**
    *   界面使用手风琴 (Accordion) 效果展示不同阶段。
    *   任务列表和完成状态由 `taskStore` 管理，用户勾选任务时，通过 action 调用**后端 API** 更新状态。
    *   进度条根据 `taskStore` 中的完成情况动态计算。
*   **课程追踪 (Course Tracker):**
    *   课程信息（总节数、已完成数、笔记）由 `courseStore` 管理。
    *   用户修改课时或笔记时，通过 action 调用**后端 API** 进行更新。
    *   进度条和百分比是基于 Store 中数据的计算属性。
*   **番茄钟 (Pomodoro Timer):**
    *   设置项（工作/休息时长）由 `pomodoroStore` 管理，从**后端 API** 加载并可更新。
    *   **计时器逻辑**在组件本地 (`PomodoroSection.vue`) 使用 `setInterval` 实现。
    *   模式切换、时间显示等由组件本地状态 (`ref`, `computed`) 控制。
    *   当一个工作番茄钟完成时，会调用 `pomodoroStore` 的 action 将**学习日志发送到后端 API** 保存。
    *   今日专注次数在 `pomodoroStore` 中管理（基于日期和 `localStorage`）。
*   **错题本 (Error Log):**
    *   错题数据由 `errorLogStore` 管理，负责调用**后端 API** 进行增、删、改（标记复习）、查（加载、筛选）。
    *   组件负责展示列表、处理表单输入和触发 Store actions。
*   **知识库 (Knowledge Base):**
    *   知识条目由 `knowledgeStore` 管理，负责调用**后端 API** 进行增、删、查（加载、筛选、搜索）。
    *   组件负责展示列表、处理表单输入和触发 Store actions。使用了 `sanitize-html` 处理可能的用户输入内容，并有简单的文本高亮。
*   **学习统计 (Study Log):**
    *   学习日志列表由 `studyLogStore` 从**后端 API** 加载。
    *   今日/本周/本月/总计学习时长由 `studyLogStore` 中的 **getter (计算属性)** 基于加载的日志数据动态计算得出。
    *   组件负责展示统计数据和日志列表，并提供调用 Store action 清空日志的功能。
*   **备考笔记 (Notes):**
    *   笔记内容（包括通用笔记和之前时间轴的阶段笔记）由 `noteStore` 管理。
    *   采用**日志式**记录，每次“保存”都会调用 `noteStore` 的 action 通过 **POST API** 创建一条新的笔记记录。
    *   组件负责展示所有笔记列表（按时间排序）和提供输入新笔记的区域。使用 `sanitize-html` 清理显示内容。
*   **资源库 (Resources):**
    *   目前为**静态**链接列表，硬编码在 `ResourcesSection.vue` 组件中。

## 运行方式

1.  安装依赖: `npm install`
2.  启动开发服务器: `npm run dev` (通常运行在 `http://localhost:5173`)
3.  构建生产版本: `npm run build` (输出到 `dist` 目录)

**注意:** 本前端应用需要连接到**后端 API**才能正常工作（加载和保存数据）。请确保后端服务已启动并在前端正确配置了 API 地址。