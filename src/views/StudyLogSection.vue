<!-- src/views/StudyLogSection.vue -->
<template>
  <div>
    <header class="section-header"> <!-- 全局样式 -->
      <h1><i class="fas fa-chart-pie icon-gradient"></i> 学习统计</h1>
      <p>回顾你的学习投入和效率。</p>
    </header>
    <div class="card study-log-stats-card"> <!-- 全局 .card, 添加特定类 -->
      <h2><i class="fas fa-calendar-alt icon-gradient-secondary"></i> 学习时长概览</h2>
      <div class="study-stats-grid">
        <div class="stat-item">
          <span class="stat-label">今日总时长</span>
          <!-- 绑定 store getter -->
          <span class="stat-value">{{ formattedDurationStats.today }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本周总时长</span>
          <!-- 绑定 store getter -->
          <span class="stat-value">{{ formattedDurationStats.week }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">本月总时长</span>
          <!-- 绑定 store getter -->
          <span class="stat-value">{{ formattedDurationStats.month }}</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">总计学习时长</span>
          <!-- 绑定 store getter -->
          <span class="stat-value">{{ formattedDurationStats.total }}</span>
        </div>
      </div>
      <!-- Optional Chart Placeholder -->
      <!-- <div id="study-chart-container" style="height: 300px; margin-top: 2rem; background: #f0f0f0; display:flex; align-items:center; justify-content:center; color: #aaa;">图表区域 (待开发)</div> -->
    </div>
    <div class="card study-log-list-card"> <!-- 全局 .card, 添加特定类 -->
      <h2><i class="fas fa-history icon-gradient-secondary"></i> 最近学习记录</h2>
      <div id="study-log-list-sl" class="study-log-container">
        <!-- v-if/v-else 基于 store getter -->
        <p class="placeholder-text" v-if="recentLogs.length === 0">暂无学习记录。完成番茄钟工作周期会自动记录。</p>
        <div v-else>
          <!-- v-for 遍历 store getter -->
          <div class="study-log-item" v-for="item in recentLogs" :key="item.id">
            <span class="activity">{{ item.activity }}</span>
            <!-- 调用本地格式化函数 -->
            <span class="duration">{{ formatDuration(item.durationSeconds) }}</span>
            <span class="timestamp">{{ formatTimestamp(item.startTime) }}</span>
          </div>
        </div>
      </div>
      <div class="study-log-actions">
        <!-- @click 调用本地 handler，handler 再调用 store action -->
        <button @click="clearLogsHandler" class="btn btn-danger btn-small" aria-label="清空所有学习记录">
            <i class="fas fa-trash-alt"></i> 清空所有学习记录
        </button>
      </div>
    </div>
     <!-- Optional Manual Add Form -->
     <!--
     <div class="card">
         <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 手动添加学习记录</h2>
         <form id="add-manual-study-log-form" class="form-grid"> ... </form>
     </div>
     -->
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia'; // 导入 storeToRefs
import { useStudyLogStore } from '@/stores/studyLogStore.js'; // 1. 导入 Store
// 导入格式化函数，因为 v-for 中需要用到
import { formatDuration, formatTimestamp } from '@/utils/formatters.js';
// onMounted 可能不再需要，因为 store 初始化时会加载数据
// import { onMounted } from 'vue';

const studyLogStore = useStudyLogStore(); // 2. 获取实例

// 3. 使用 storeToRefs 获取响应式的 getters
// formattedDurationStats 是包含 today, week, month, total (格式化后) 的对象
// recentLogs 是包含最近日志对象的数组
// 它们会自动随着 store 状态变化而更新
const { formattedDurationStats, recentLogs } = storeToRefs(studyLogStore);

// --- 方法 ---
// 处理清空按钮点击事件，调用 store action
function clearLogsHandler() {
  studyLogStore.clearLogs(); // store action 内部会处理 confirm 对话框
}

// 不再需要在 onMounted 中手动加载数据或计算统计
// onMounted(() => {
//   // studyLogStore.loadLogs(); // 如果需要在每次组件挂载时强制刷新
// });

</script>

<style scoped>
/* --- Study Log Specific Styles (补充完整) --- */
.study-log-stats-card,
.study-log-list-card {
     border-left: 4px solid var(--study-color); /* 特定边框颜色 */
}

/* 统计网格布局 */
.study-stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); /* 自适应列 */
    gap: 1.5rem; /* 间距 */
    text-align: center; /* 文本居中 */
    margin-top: 1rem; /* 与标题间距 */
}
/* 单个统计项 */
.stat-item {
    background-color: #f8faff; /* 背景色 */
    padding: 1rem; /* 内边距 */
    border-radius: 8px; /* 圆角 */
    border: 1px solid var(--border-color); /* 边框 */
}
.stat-label {
    display: block; /* 独占一行 */
    font-size: 0.9em; /* 字体大小 */
    color: var(--text-light); /* 颜色 */
    margin-bottom: 0.5rem; /* 与数值间距 */
    font-weight: 500; /* 字重 */
}
.stat-value {
    display: block; /* 独占一行 */
    font-size: 1.6rem; /* 字体大小 */
    font-weight: 700; /* 字重 */
    color: var(--study-color); /* 主题色 */
    min-height: 1.3em; /* 防止跳动 */
}

/* 日志列表容器 */
.study-log-container {
    margin-top: 1.5rem; /* 与标题间距 */
    max-height: 400px; /* 最大高度 */
    overflow-y: auto; /* 超出则滚动 */
    border: 1px solid var(--border-color); /* 边框 */
    border-radius: 8px; /* 圆角 */
    padding: 0.5rem; /* 内边距 */
    background-color: #fff; /* 背景色 */
}

/* 单条日志记录项 */
.study-log-item {
    display: flex; /* 使用 flex 布局 */
    justify-content: space-between; /* 两端对齐 */
    align-items: center; /* 垂直居中 */
    padding: 0.8rem 1rem; /* 内边距 */
    border-bottom: 1px solid #f0f4f8; /* 分隔线 */
    font-size: 0.95rem; /* 字体大小 */
    gap: 1rem; /* 元素间距 */
}
.study-log-item:last-child {
    border-bottom: none; /* 最后一项无分隔线 */
}
.study-log-item:nth-child(even) {
     background-color: #fdfdff; /* 斑马条纹 */
}
/* 活动名称 */
.study-log-item .activity {
    flex-grow: 1; /* 占据主要空间 */
    font-weight: 500; /* 字重 */
    color: var(--text-color); /* 颜色 */
    word-break: break-word; /* 换行 */
}
/* 持续时长 */
.study-log-item .duration {
    font-weight: 600; /* 字重 */
    color: var(--study-color); /* 主题色 */
    white-space: nowrap; /* 不换行 */
    min-width: 70px; /* 最小宽度对齐 */
    text-align: right; /* 右对齐 */
    flex-shrink: 0; /* 防止被压缩 */
}
/* 时间戳 */
.study-log-item .timestamp {
    font-size: 0.85em; /* 字体大小 */
    color: var(--text-light); /* 颜色 */
    white-space: nowrap; /* 不换行 */
    min-width: 130px; /* 最小宽度对齐 */
    text-align: right; /* 右对齐 */
    flex-shrink: 0; /* 防止被压缩 */
}

/* 清空按钮容器 */
.study-log-actions {
     margin-top: 1rem; /* 与列表间距 */
     text-align: right; /* 按钮靠右 */
}
/* .btn, .btn-danger, .btn-small 样式是全局的 */

/* --- Study Log Specific Responsive --- */
@media (max-width: 768px) {
    .study-stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); /* 调整最小宽度 */
        gap: 1rem; /* 减小间距 */
    }
    .stat-value { font-size: 1.4rem; } /* 调整字体大小 */

    /* 日志项在手机上堆叠 */
    .study-log-item {
        flex-direction: column; /* 垂直排列 */
        align-items: flex-start; /* 左对齐 */
        gap: 0.3rem; /* 减小间距 */
        padding: 0.8rem; /* 调整内边距 */
    }
    .study-log-item .timestamp {
        order: 3; /* 时间最后 */
        font-size: 0.8em;
        min-width: unset; /* 取消最小宽度 */
        text-align: left; /* 左对齐 */
    }
    .study-log-item .duration {
        order: 2; /* 时长中间 */
        min-width: unset; /* 取消最小宽度 */
        text-align: left; /* 左对齐 */
    }
    .study-log-item .activity { order: 1; } /* 活动最前 */
}
</style>