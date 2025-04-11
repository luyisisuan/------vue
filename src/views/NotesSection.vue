<!-- src/views/NotesSection.vue -->
<template>
  <div>
    <header class="section-header"> <!-- 全局样式 -->
      <h1><i class="fas fa-pencil-alt icon-gradient"></i> 备考笔记</h1>
      <p>随时记录你的想法和待办事项。</p>
    </header>
    <div class="card notes-card"> <!-- 全局 .card, 添加特定类 -->
      <!-- 使用 v-model 绑定笔记内容 -->
      <textarea
        id="notes-general-notes"
        class="notes-textarea large"
        placeholder="记录总体学习心得、待办事项、重要提醒..."
        v-model="generalNotes"
      ></textarea> <!-- 全局样式 -->
      <div class="notes-actions">
        <!-- 添加 @click 监听，绑定按钮文本 -->
        <button @click="saveNotesNow" class="btn btn-primary" aria-label="手动保存笔记">
            <i class="fas fa-save"></i> {{ saveButtonText }}
        </button>
        <!-- 显示保存状态 -->
        <span id="notes-status-notes" class="notes-status-text">{{ notesStatus }}</span> <!-- 全局样式 -->
      </div>
    </div>
     <!-- 如果还有其他笔记区域，可以继续添加 card -->
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue';
import config from '@/config.js'; // 导入配置
import { loadData, saveData } from '@/utils/storage.js'; // 导入存储工具
import { throttle } from 'lodash-es'; // 导入节流函数 (确保已 npm install lodash-es)

// --- 响应式状态 ---
const generalNotes = ref(''); // 绑定到 textarea
const notesStatus = ref(''); // 显示保存状态
const saveButtonText = ref('手动保存'); // 控制按钮文本

// --- 方法 ---
// 加载笔记内容
function loadGeneralNotes() {
  // 从 localStorage 加载数据，键名来自 config
  const notesData = loadData(config.localStorageKeys.notes, {});
  // 获取 'notes-general' 键对应的值，若不存在则为空字符串
  generalNotes.value = notesData['notes-general'] || '';
  console.log('General notes loaded.');
}

// 节流保存函数 (用于自动保存)
// 使用 throttle 创建一个节流版本的保存函数
// 它会确保 saveNotesInternal 在指定的时间间隔内最多只执行一次
const saveNotesThrottled = throttle(() => {
  saveNotesInternal('自动保存...'); // 调用内部保存逻辑
}, config.SAVE_THROTTLE_MS); // 使用配置的节流间隔 (例如 1500ms)

// 内部保存逻辑 (供节流和手动保存调用)
function saveNotesInternal(statusMessage = '笔记已保存!') {
    try {
        // 加载当前的笔记对象
        const notesData = loadData(config.localStorageKeys.notes, {});
        // 更新 'notes-general' 键的值
        notesData['notes-general'] = generalNotes.value;
        // 保存回 localStorage
        saveData(config.localStorageKeys.notes, notesData);

        // 更新状态提示
        notesStatus.value = statusMessage;
        console.log(`General notes saved (${statusMessage === '自动保存...' ? 'auto' : 'manual'}).`);

        // 设置延时清除状态提示
        setTimeout(() => {
            // 检查状态是否仍然是预期的消息，避免清除其他消息
            if (notesStatus.value === statusMessage) {
                notesStatus.value = '';
            }
        }, statusMessage === '自动保存...' ? 1500 : 2000); // 自动保存提示短一点，手动保存长一点

        return true; // 表示保存成功
    } catch (error) {
        console.error("Error saving notes:", error);
        notesStatus.value = '保存失败!';
        // 可以选择性地在这里添加更详细的错误处理或用户反馈
        return false; // 表示保存失败
    }
}


// 手动保存函数
function saveNotesNow() {
  // 1. 取消任何可能在等待执行的节流保存调用
  saveNotesThrottled.cancel();
  // 2. 立即执行一次保存逻辑
  if (saveNotesInternal('笔记已保存!')) {
      // 3. 更新按钮文本，并在稍后恢复
      saveButtonText.value = '保存成功!';
      setTimeout(() => {
          saveButtonText.value = '手动保存';
      }, 1500); // 1.5秒后恢复按钮文本
  } else {
      // 保存失败时的处理（可选）
      saveButtonText.value = '保存失败';
       setTimeout(() => {
          saveButtonText.value = '手动保存';
      }, 2000);
  }
}

// --- 监听器 ---
// 监听 generalNotes ref 的变化
watch(generalNotes, (newValue, oldValue) => {
    // 确保是实际内容改变才触发，并且不是初始加载时的赋值
    if (newValue !== oldValue && oldValue !== undefined) {
        notesStatus.value = '正在输入...'; // 可选：提供即时反馈
        saveNotesThrottled(); // 触发节流保存
    }
});

// --- 生命周期钩子 ---
// 组件挂载后加载笔记内容
onMounted(() => {
  loadGeneralNotes();
});

</script>

<style scoped>
/* --- Notes Specific Styles (补充完整) --- */
.notes-card {
     border-left: 4px solid var(--warning-color); /* 左侧边框颜色 */
}

/* .notes-textarea 及其 .large 变体的样式 */
/* 假设基础 .notes-textarea 样式已在全局 CSS 定义 */
.notes-textarea.large {
    min-height: 180px; /* 定义 large 的最小高度 */
    /* 可以覆盖其他全局样式，如果需要 */
    /* 例如： font-size: 1em; */
}

/* .notes-actions 容器样式 */
.notes-actions {
    margin-top: 1rem; /* 与 textarea 的间距 */
    display: flex; /* 水平排列 */
    align-items: center; /* 垂直居中对齐 */
    gap: 1rem; /* 元素间距 */
}

/* .notes-status-text 状态文本样式 */
/* 假设基础 .notes-status-text 样式已在全局 CSS 定义 */
/* 例如： */
/*
.notes-status-text {
    font-size: 0.8em;
    color: var(--success-color);
    font-style: italic;
    transition: opacity var(--transition-speed) ease;
    opacity: 1;
}
.notes-status-text:empty {
     opacity: 0;
     transition-delay: 0.5s; // 延迟消失
}
*/
/* 可以在这里覆盖或添加特定样式 */
.notes-status-text {
    min-height: 1em; /* 保证占位，防止布局跳动 */
    display: inline-block; /* 确保 display 不是 none */
    vertical-align: middle; /* 与按钮垂直对齐 */
    /* 可以根据状态改变颜色 */
    /* 例如: &.error { color: var(--danger-color); } */
}


/* .btn 和 .btn-primary 样式已在全局 CSS 定义 */
/* 可以添加特定于此按钮的微调，但不建议 */
</style>