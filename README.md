# 备考智能驾驶舱 (Vue 版本) 🚀

这是一个为 **段绪程** 同学定制的个人公务员考试备考管理仪表盘应用。该项目是基于 Vue 3、Vite、Vue Router 和 Pinia 构建的现代单页应用程序 (SPA)，旨在提供一个集中化、结构化、可持久化的备考辅助工具。

此版本是从原生的 HTML、CSS 和 JavaScript 版本迁移而来，利用了 Vue 的组件化、响应式和工具链优势，以提高开发效率和代码可维护性。

✨ **在线访问 (如果部署的话):** [在此处放置你的部署链接]

## 主要功能 ✨

*   **📊 仪表盘 (Dashboard):**
    *   显示考生基本信息和目标。
    *   考试报名/笔试日期倒计时。
    *   关键进度摘要（任务完成度、课程进度、今日专注次数、错题数、知识库条目、今日学习时长）。
*   **📅 备考轴 (Timeline):**
    *   按阶段划分备考任务。
    *   可视化各阶段任务完成进度条。
    *   记录各阶段学习笔记。
    *   任务项可勾选标记完成。
*   **🎓 课程追踪 (Course Tracker):**
    *   记录并跟踪在线课程（如华图网课）的总节数和已完成节数。
    *   显示课程学习进度百分比。
    *   记录课程相关的笔记。
*   **⏱️ 番茄钟 (Pomodoro Timer):**
    *   标准番茄工作法计时器（工作、短休、长休）。
    *   可自定义各阶段时长。
    *   可视化时间进度环。
    *   记录当前专注时段的活动内容。
    *   自动将完成的工作时段计入学习统计。
*   **⚠️ 错题本 (Error Log):**
    *   添加错题记录（题干、模块、我的答案、正确答案、知识点、原因分析、可选截图）。
    *   按模块筛选错题。
    *   标记错题为已复习，记录复习次数和时间。
    *   删除错题记录。
*   **🧠 知识库 (Knowledge Base):**
    *   添加知识条目（标题、分类、内容、标签、可选外部链接/文件）。
    *   按分类筛选知识条目。
    *   根据关键词搜索标题、内容、标签。
*   **📈 学习统计 (Study Log):**
    *   自动记录来自番茄钟的有效学习时长。
    *   展示今日、本周、本月及总计学习时长。
    *   显示最近的学习记录列表。
    *   可清空学习记录。
*   **📝 备考笔记 (Notes):**
    *   提供一个通用的笔记区域，用于记录杂项、待办事项等。
    *   笔记内容自动保存。
*   **🔗 资源库 (Resources):**
    *   提供常用备考网站的快捷链接。
*   **🕒 在线时长追踪:**
    *   自动记录用户在应用内的活跃时长。
    *   支持页面短暂关闭后重新打开时续记时长（基于 `localStorage` 和时间戳判断）。
    *   闲置超时（默认 15 分钟）后停止计时。
*   **📱 响应式设计:**
    *   界面在不同设备尺寸（桌面、平板、手机）上具有良好的适应性。

## 技术栈 🛠️

*   **框架:** [Vue 3](https://cn.vuejs.org/) (使用 Composition API)
*   **构建工具:** [Vite](https://cn.vitejs.dev/)
*   **路由:** [Vue Router 4](https://router.vuejs.org/zh/)
*   **状态管理:** [Pinia 2](https://pinia.vuejs.org/zh/)
*   **语言:** JavaScript
*   **样式:** CSS3 (使用了 CSS 变量), Font Awesome (CDN), Scoped CSS
*   **核心概念:** 单页应用 (SPA), 组件化开发, 响应式系统

## 项目设置与运行 ⚙️

**先决条件:**

*   [Node.js](https://nodejs.org/) (推荐 **v18.x** 或 **v20.x** 及以上版本)
*   [npm](https://www.npmjs.com/) (随 Node.js 安装) 或 [yarn](https://yarnpkg.com/) / [pnpm](https://pnpm.io/)

**安装步骤:**

1.  **克隆仓库 (如果需要):**
    ```bash
    git clone [你的仓库地址]
    cd 备考驾驶舱-vue
    ```
    或者直接在你现有的 `备考驾驶舱-vue` 目录下操作。

2.  **安装依赖:**
    ```bash
    npm install
    # 或者
    # yarn install
    # 或者
    # pnpm install
    ```

**运行开发服务器:**

```bash
npm run dev
# 或者
# yarn dev
# 或者
# pnpm dev
Use code with caution.
Markdown
在浏览器中打开输出的本地地址 (通常是 http://localhost:5173/)。应用支持热模块替换 (HMR)，修改代码后通常无需刷新页面即可看到更新。
构建生产版本:
npm run build
# 或者
# yarn build
# 或者
# pnpm build
Use code with caution.
Bash
构建后的文件会输出到 dist 目录。
本地预览生产版本:
npm run preview
# 或者
# yarn preview
# 或者
# pnpm preview
Use code with caution.
Bash
项目结构 📂
备考驾驶舱-vue/
├── public/             # 静态资源 (直接复制)
├── src/                # 源代码
│   ├── assets/         # 静态资源 (会被处理)
│   ├── components/     # 可复用 UI 组件 (如 Sidebar)
│   ├── views/          # 页面级路由组件 (如 DashboardSection)
│   ├── stores/         # Pinia 状态管理 (如 appStore, errorLogStore)
│   ├── router/         # Vue Router 配置
│   ├── utils/          # 工具函数 (可选)
│   ├── App.vue         # 根组件
│   └── main.js         # 应用入口
├── index.html          # HTML 入口
├── package.json        # 依赖和脚本配置
├── README.md           # 就是这个文件
└── vite.config.js      # Vite 配置
Use code with caution.
数据持久化 💾
本应用的所有用户数据（任务进度、笔记、课程进度、番茄钟设置、错题、知识、学习记录、在线时长状态等）都存储在浏览器的 localStorage 中。
重要提示:
数据仅保存在当前使用的浏览器中。清除浏览器数据（缓存、LocalStorage）会导致所有记录丢失！
在不同的浏览器或无痕模式下使用，数据不会互通。
目前没有云同步功能。
联系方式 📧
段绪程 2253864680@qq.com

index.html 是房子的地基和入口门。
main.js 是负责通电、通水、安装智能家居中控（Vue、Router、Pinia）的工程师。
App.vue 是房子的整体框架、外墙、以及固定安装的门窗（比如侧边栏）。中间客厅 (<router-view>) 的家具会根据你的选择（URL）而改变。
router/index.js 是导航地图，告诉你去卧室（/dashboard）该走哪条路，去书房（/timeline）该走哪条路。
stores/ 是中央储藏室和控制中心，存放共享物品（数据）和操作说明（方法）。
components/Sidebar.vue 是一个预制好的精美书架（可复用 UI 组件）。
views/TimelineSection.vue 是书房（具体页面组件）里的所有家具和装饰（内容和交互）。
assets/gwy-global.css 是整个房子的装修风格指南（全局样式）

好的，我们来模拟一次完整的添加新功能的流程。假设我们要添加一个**“短期学习目标” (Study Goals)** 的功能：允许用户添加一些近期的、具体的小目标（比如“完成资料分析专项练习第一章”、“整理申论名言警句 10 条”），可以标记完成，并持久化存储。
基本流程：
数据建模与状态管理 (Pinia): 定义目标的数据结构，并在 Pinia Store 中管理目标列表（增、删、改、查、持久化）。
路由配置 (Vue Router): 为新功能添加一个新的页面路径。
创建视图组件 (View Component): 创建一个新的 .vue 文件来展示和操作学习目标。
实现组件逻辑: 在组件的 <script setup> 中，连接到 Pinia Store，处理用户输入和交互。
添加样式: 在组件的 <style scoped> 中添加样式。
添加入口/导航: 在侧边栏 (Sidebar.vue) 中添加指向新页面的链接。
更新配置 (如果需要): 比如添加新的 localStorage key。