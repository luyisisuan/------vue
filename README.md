# gwyweb-vue

公务员考试辅助系统前端界面。

## 项目介绍

本项目是基于 Vue 3 和 Vite 构建的前端应用程序，为 `gwy-backend` 后端服务提供用户交互界面。它旨在帮助用户进行公务员考试的学习和准备。

## 技术栈

*   **前端框架:** Vue 3 (Composition API)
*   **构建工具:** Vite
*   **路由:** Vue Router 4 (History 模式)
*   **状态管理:** Pinia
*   **HTTP 客户端:** Axios
*   **UI 库:** Font Awesome (用于图标), 无大型 UI 组件库 (如 Element Plus, Vuetify)
*   **辅助库:** date-fns (日期处理), lodash-es (工具函数), DOMPurify & sanitize-html (HTML 清理)
*   **样式:** 全局 CSS (`src/assets/gwy-global.css`)

## 主要功能 (基于路由)

*   **仪表盘 (`/dashboard`):** 显示关键进度摘要、用户信息和考试倒计时。
*   **备考轴 (`/timeline`):** (功能待确认，可能用于展示学习计划或历史记录)
*   **学习目标 (`/goals`):** 管理和跟踪学习目标。
*   **课程追踪 (`/course-tracker`):** 记录和管理学习课程进度。
*   **番茄钟 (`/pomodoro`):** 提供专注时钟功能。
*   **错题本 (`/error-log`):** 记录和复习错题。
*   **知识库 (`/knowledge-base`):** 存储和查阅学习资料。
*   **学习统计 (`/study-log`):** 展示学习时长和活动统计。
*   **备考笔记 (`/notes`):** 创建和管理学习笔记。
*   **资源 (`/resources`):** (功能待确认，可能用于管理学习资源链接或文件)
*   **用户认证:** (登录/注册) 功能未在前端路由中明确体现，可能由后端处理或全局状态管理。
*   **在线状态跟踪:** 应用会跟踪用户在线时长并定期向后端发送心跳。

## 目录结构

```
gwyweb-vue
├── .vscode/                  # VS Code 配置
│   └── extensions.json
├── public/                   # 公共静态资源 (会被直接复制到 dist 目录)
│   └── vite.svg
├── src/                      # 源码目录
│   ├── App.vue               # 根组件
│   ├── assets/               # 静态资源（如全局样式、图片）
│   │   ├── gwy-global.css
│   │   └── vue.svg
│   ├── components/           # 可复用 UI 组件
│   │   ├── HelloWorld.vue
│   │   └── Sidebar.vue
│   ├── config.js             # 配置文件（如 API 地址）
│   ├── main.js               # 应用入口文件
│   ├── router/               # Vue Router 配置
│   │   └── index.js
│   ├── stores/               # Pinia 状态管理
│   │   ├── appStore.js
│   │   ├── courseStore.js
│   │   ├── errorLogStore.js
│   │   ├── goalStore.js
│   │   ├── knowledgeBaseStore.js
│   │   ├── knowledgeStore.js
│   │   ├── noteStore.js
│   │   ├── pomodoroStore.js
│   │   ├── resourceStore.js
│   │   ├── studyLogStore.js
│   │   └── taskStore.js
│   ├── style.css             # 全局样式
│   ├── utils/                # 工具函数
│   │   ├── config.js
│   │   ├── formatters.js
│   │   ├── helpers.js
│   │   └── storage.js
│   └── views/                # 页面级组件（路由对应的视图）
│       ├── CourseTrackerSection.vue
│       ├── DashboardSection.vue
│       ├── ErrorLogSection.vue
│       ├── KnowledgeBaseSection.vue
│       ├── NotesSection.vue
│       ├── PomodoroSection.vue
│       ├── ResourcesSection.vue
│       ├── StudyGoals.vue
│       ├── StudyLogSection.vue
│       └── TimelineSection.vue
├── .gitignore                # Git 忽略配置
├── index.html                # HTML 入口文件
├── package-lock.json         # 依赖版本锁定
├── package.json              # 项目依赖和脚本配置
├── vite.config.js            # Vite 配置文件
├── 备考驾驶舱-vue.iml        # IDEA 项目文件
└── README.md                 # 项目说明文档
```

## 环境准备

1.  **Node.js:** 确保安装了 Node.js (推荐 LTS 版本) 和 npm (通常随 Node.js 一起安装)。
2.  **后端服务:** 确保 `gwy-backend` 服务已成功启动并运行在正确的地址和端口上。

## 运行项目

1.  **克隆或下载项目:** 将项目代码获取到本地。
2.  **安装依赖:**
    *   在项目根目录 (`gwyweb-vue`) 打开终端或命令提示符。
    *   运行命令 `npm install`。
3.  **配置后端 API 地址:**
    *   **重要:** 当前版本似乎在代码中（例如 `src/stores/appStore.js` 中的 `API_PING_URL`）硬编码了部分后端 API 地址 (`http://localhost:8080/api/...`)。
    *   **建议:** 为了方便配置，应将 API 基础 URL 提取到统一的配置文件（如 `src/config.js` 或环境变量 `.env`）中。
    *   **当前操作:** 检查并修改代码中所有硬编码的后端服务地址，确保它们指向你正在运行的 `gwy-backend` 服务 (例如 `http://localhost:8080`)。
4.  **启动开发服务器:**
    *   应用在 `src/main.js` 中初始化，注册了 Pinia 和 Vue Router。
    *   运行命令 `npm run dev`。
    *   终端会显示本地开发服务器的访问地址 (通常是 `http://localhost:5173` 或类似地址)。
5.  **访问应用:** 在浏览器中打开上述地址即可访问。

## 构建项目

*   要构建用于生产环境的优化版本，运行命令 `npm run build`。
*   构建产物将生成在 `dist` 目录下。

## 预览构建产物

*   构建完成后，可以运行 `npm run preview` 来在本地预览生产构建的效果。

## 注意事项

*   **重要:** 仔细检查并确认所有与后端交互的 API 地址（可能分散在不同文件中，特别是 `stores` 目录下）已正确配置，指向正在运行的后端服务。
*   路由在 `src/router/index.js` 中定义，使用 `createWebHistory` 模式。
*   开发过程中，Vite 提供了热模块替换 (HMR) 功能，修改代码后浏览器会自动更新，无需手动刷新。