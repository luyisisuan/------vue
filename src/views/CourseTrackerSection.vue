<!-- src/views/CourseTrackerSection.vue -->
<template>
  <div>
    <header class="section-header">
      <!-- 确保 Font Awesome 图标已加载 -->
      <h1><i class="fas fa-book-reader icon-gradient"></i> 在线课程追踪</h1>
      <p>记录并跟进你的网课进度。</p>
    </header>

    <!-- 加载与错误状态显示 -->
    <!-- 仅在初始加载课程名称未完成时显示加载指示器 -->
    <div v-if="isLoading && !courseName" class="loading-indicator card">加载中...</div>
    <div v-else-if="error" class="error-message card" style="color: red;">错误: {{ error }}</div>

    <!-- 正常显示课程追踪卡片 -->
    <div v-else class="card course-tracker-card">
      <div class="course-info">
        <p><strong>课程:</strong> <span id="course-name">{{ courseName }}</span></p>
        <p><a id="course-link" :href="courseLink" target="_blank" class="resource-link"><i class="fas fa-external-link-alt"></i> 访问课程</a></p>
        <p v-if="lastUpdated"><strong>上次更新:</strong> {{ formatTimestamp(lastUpdated) }}</p>
      </div>

      <div class="course-progress-inputs">
        <div class="input-group">
          <label for="course-total-lessons-el">总节数:</label>
          <input type="number" v-model.number="localTotalLessons" @change="updateTotalLessons" id="course-total-lessons-el" class="input-narrow" min="1" placeholder="总数">
        </div>
        <div class="input-group">
          <label for="course-completed-lessons-el">已完成:</label>
          <input type="number" v-model.number="localCompletedLessons" @change="updateCompletedLessons" id="course-completed-lessons-el" class="input-narrow" min="0" :max="localTotalLessons" placeholder="完成数">
        </div>
        <div class="input-group progress-display">
          <span>进度:</span>
          <span id="course-progress-percentage" class="progress-percentage">{{ progressPercentage }}%</span>
        </div>
      </div>

      <div class="progress-bar-container course-progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" id="course-progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>

      <div class="course-notes">
        <label for="notes-course-el" class="notes-label">课程笔记:</label>
        <!-- v-model 绑定本地 ref, @input 时调用节流保存函数 -->
        <textarea v-model="localNotes" @input="handleNotesInput" id="notes-course-el" class="notes-textarea" placeholder="记录本课程的学习要点、疑问..."></textarea>
        <span id="course-notes-status" class="notes-status-text small">{{ notesStatus }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'; // 移除了未使用的 onMounted
import { storeToRefs } from 'pinia';
import { useCourseStore } from '@/stores/courseStore.js';
import { formatTimestamp } from '@/utils/formatters.js'; // 确保此路径正确

// --- Store 状态管理 ---
const courseStore = useCourseStore();
const {
  courseName,
  courseLink,
  totalLessons,
  completedLessons,
  notes, // 从 store 获取笔记状态
  lastUpdated,
  isLoading,
  error,
  notesStatus,
  progressPercentage
} = storeToRefs(courseStore);

// --- 本地状态，用于 v-model 绑定 ---
const localTotalLessons = ref(totalLessons.value);
const localCompletedLessons = ref(completedLessons.value);
// **修改点:** 直接使用 store state 初始化 localNotes
const localNotes = ref(notes.value);

// --- 监听 Store 状态变化，更新本地状态 (除了笔记) ---
watch(totalLessons, (newVal) => {
  // console.log('Store totalLessons 变化:', newVal); // 调试日志
  localTotalLessons.value = newVal;
   // 当总课时变化时，也需在本地重新验证已完成课时
   if (localCompletedLessons.value > newVal) {
       localCompletedLessons.value = newVal;
   }
});
watch(completedLessons, (newVal) => {
  // console.log('Store completedLessons 变化:', newVal); // 调试日志
  localCompletedLessons.value = newVal;
});

// **已移除:** 移除对 notes 的 watch，以防止用户输入时输入框失去焦点而导致体验不佳。
//            笔记的保存通过 @input + 节流函数处理。

// **新增:** 监听笔记的初始加载或外部更改 (如 store 被 action 直接修改)
watch(notes, (newVal, oldVal) => {
    // 这个 watcher 主要用于处理非用户输入导致的 store notes 变化同步到本地 textarea 的情况。
    // 比如：页面首次加载数据完成时，或者未来可能有的“从服务器同步笔记”功能。
    // 简单的策略是：如果本地 textarea 的值自上次与 store 同步后没有被用户修改过，
    // 那么当 store 的值变化时，就更新本地 textarea。
    // 注意：这种简单比较 (localNotes.value === oldVal) 在并发或复杂场景下可能不够完美。
    // 但对于当前场景（主要是初始加载同步）通常是有效的。
     if (localNotes.value === oldVal) { // 如果自上次同步后本地值未变
        localNotes.value = newVal;
     }
}, { immediate: false }); // immediate: false 表示不在组件初始化时立即执行


// --- 方法 ---
function updateTotalLessons() {
  let newTotal = localTotalLessons.value;
  // 保证总节数至少为 1
  if (newTotal < 1) {
    newTotal = 1;
    localTotalLessons.value = newTotal; // 立即更新本地显示
  }
   // 准备要发送给 store action 的更新数据
   const updates = { totalLessons: newTotal };
   // 如果已完成数超过新的总数，则调整已完成数
   if (localCompletedLessons.value > newTotal) {
       localCompletedLessons.value = newTotal; // 更新本地显示
       updates.completedLessons = newTotal; // 将调整后的已完成数也加入更新数据
   }
   // 调用 store action 更新数据
   courseStore.updateCourseData(updates);
}

function updateCompletedLessons() {
  let newCompleted = localCompletedLessons.value;
  // 保证已完成数不小于 0
  if (newCompleted < 0) {
    newCompleted = 0;
    localCompletedLessons.value = newCompleted;
  }
  // 保证已完成数不超过当前的总节数 (使用本地的总节数值进行比较)
  if (newCompleted > localTotalLessons.value) {
    newCompleted = localTotalLessons.value;
    localCompletedLessons.value = newCompleted;
  }
  // 调用 store action 更新数据
  courseStore.updateCourseData({ completedLessons: newCompleted });
}

// **修改点:** 处理笔记输入 - 调用 store 的节流保存函数，传递当前本地值
function handleNotesInput() {
  // 将当前 textarea 的值 (localNotes.value) 传递给 store 中定义的节流保存函数
  courseStore.saveNotesThrottled(localNotes.value);
}

// formatTimestamp 已导入且自动对模板可用
// 无需从 <script setup> 导出
</script>

<style scoped>
/* --- 课程追踪器特定样式 --- */
.course-tracker-card {
     border-left: 4px solid var(--secondary-color); /* 左侧边框颜色 */
}
.course-info {
    margin-bottom: 1rem;
}
.course-info p { margin-bottom: 0.4rem; font-size: 0.95rem; }
.course-info strong { color: var(--primary-dark); }
.resource-link { color: var(--primary-color); font-weight: 500; }
.resource-link i { margin-right: 0.3em; font-size: 0.9em;}

.course-progress-inputs {
    display: flex;
    align-items: center;
    gap: 1rem; /* 输入组之间的间距 */
    margin-bottom: 1rem;
    flex-wrap: wrap; /* 允许换行 */
    background-color: #f8f9fa; /* 浅灰色背景 */
    padding: 0.8rem;
    border-radius: 8px; /* 圆角 */
}
.input-group { display: flex; align-items: center; gap: 0.5rem; }
.input-group label { font-size: 0.85em; color: var(--text-light); font-weight: 500; }
.input-narrow { /* 用于数字输入框 */
    width: 65px; /* 固定宽度 */
    padding: 0.4em 0.6em;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    text-align: center;
    font-size: 0.9em;
    background-color: white;
}
.input-narrow:focus { /* 输入框获取焦点时的样式 */
     outline: none;
     border-color: var(--primary-color);
     box-shadow: 0 0 0 2px rgba(74, 105, 189, 0.2); /* 焦点光晕效果 */
}
.input-group.progress-display span:first-child { font-weight: 500; }
#course-progress-percentage { /* 进度百分比显示样式 */
    color: var(--primary-dark);
    background-color: rgba(74, 105, 189, 0.1); /* 淡蓝色背景 */
    padding: 0.1em 0.4em;
    border-radius: 4px;
    font-weight: 600;
}

.course-progress-bar-container { margin-bottom: 1rem; }
.progress-bar { /* 进度条背景 */
    height: 8px;
    background-color: #e9ecef; /* 浅灰色背景 */
    border-radius: 4px;
    overflow: hidden; /* 隐藏内部溢出 */
}
.progress-fill { /* 进度条填充部分 */
    height: 100%;
    background: var(--gradient-primary); /* 使用渐变色 */
    border-radius: 4px;
    transition: width 0.5s ease; /* 宽度变化过渡效果 */
    width: 0%; /* 初始宽度 */
}
/* #course-progress-bar { } */ /* 特定 ID 的样式 (如果需要) */

.course-notes { margin-top: 1rem; }
/* 笔记标签样式 */
.notes-label {
     display: block;
     font-weight: 600;
     color: var(--primary-dark, #3b54a3);
     margin-bottom: 0.5rem;
     font-size: 0.85em;
 }

/* 笔记文本域的美化样式 */
.notes-textarea {
  width: 100%;
  min-height: 150px; /* 最小高度 */
  padding: 1rem 1.2rem;
  border: 1px solid var(--border-color);
  border-radius: var(--card-border-radius, 12px); /* 使用卡片圆角变量 */
  font-family: var(--font-family); /* 使用全局字体 */
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical; /* 允许垂直调整大小 */
  transition: border-color 0.3s ease, box-shadow 0.3s ease; /* 过渡效果 */
  background-color: #fff;
  box-shadow: var(--shadow-light); /* 应用阴影效果 */
}

.notes-textarea:focus { /* 文本域获取焦点时的样式 */
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(74, 105, 189, 0.15), var(--shadow-light); /* 焦点光晕和阴影 */
  background-color: white;
}


.notes-status-text.small { /* 笔记保存状态提示 */
     font-size: 0.75em;
     color: var(--success-color); /* 使用成功颜色 */
     font-style: italic;
     display: inline-block;
     margin-left: 0.5em;
     margin-top: 0.3em;
     height: 1em; /* 预留高度避免跳动 */
}
.notes-status-text:empty { opacity: 0; } /* 状态为空时隐藏 */

.loading-indicator, .error-message { /* 加载和错误消息通用样式 */
    text-align: center;
    padding: 1rem;
    color: var(--text-light);
}
.error-message {
    color: var(--danger-color); /* 错误消息使用危险颜色 */
}
/* 确保标题图标渐变效果生效 */
.section-header i.icon-gradient {
    background: var(--gradient-primary); /* 匹配主色调渐变 */
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-size: 1.5em; /* 图标大小 */
}
</style>