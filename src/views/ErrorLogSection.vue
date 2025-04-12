
<template>
    <div>
      <header class="section-header">
        <h1><i class="fas fa-exclamation-triangle icon-gradient"></i> 错题本</h1>
        <p>记录和分析你的错题，攻克薄弱环节。</p>
      </header>
  
      <!-- 添加错题卡片 -->
      <div class="card error-log-add-card">
        <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加新错题</h2>
        <!-- 表单提交调用本地方法 submitNewError -->
        <form @submit.prevent="submitNewError" class="form-grid">
          <div class="form-group full-width">
            <label for="error-question-el">题干/问题描述:</label>
            <!-- v-model 绑定本地 reactive 对象 -->
            <textarea v-model="newErrorForm.question" id="error-question-el" rows="3" required placeholder="简要描述题目或粘贴题干..."></textarea>
          </div>
          <div class="form-group">
            <label for="error-subject-el">所属模块:</label>
            <!-- 下拉框绑定表单状态 -->
            <select v-model="newErrorForm.subject" id="error-subject-el" required>
              <option value="" disabled>--选择模块--</option>
              <!-- 选项可以来自 config 或动态生成 -->
              <option v-for="subject in config.errorLogSubjects" :key="subject" :value="subject">{{ subject }}</option>
            </select>
          </div>
          <div class="form-group">
            <label for="error-my-answer-el">我的答案:</label>
            <input v-model.trim="newErrorForm.myAnswer" type="text" id="error-my-answer-el" placeholder="你的选择或简答">
          </div>
          <div class="form-group">
            <label for="error-correct-answer-el">正确答案:</label>
            <input v-model.trim="newErrorForm.correctAnswer" type="text" id="error-correct-answer-el" required placeholder="标准答案">
          </div>
          <div class="form-group">
            <label for="error-knowledge-point-el">关联知识点:</label>
            <input v-model.trim="newErrorForm.knowledgePoint" type="text" id="error-knowledge-point-el" placeholder="涉及的具体考点">
          </div>
          <div class="form-group full-width">
            <label for="error-reason-el">错误原因分析:</label>
            <textarea v-model="newErrorForm.reason" id="error-reason-el" rows="3" required placeholder="为什么错了？知识点不熟？审题不清？计算失误？"></textarea>
          </div>
          <div class="form-group">
            <label for="error-image-el">题目截图 (可选):</label>
            <!-- 监听文件变化 -->
            <input type="file" id="error-image-el" accept="image/*" @change="handleFileChange">
            <span class="form-hint">仅保存文件名，请确保文件在本地</span>
          </div>
          <div class="form-group form-actions">
            <button type="submit" class="btn btn-primary" :disabled="isLoading"> <!-- 可以在加载时禁用按钮 -->
              <i class="fas fa-save"></i> {{ isLoading ? '添加中...' : '添加错题' }}
            </button>
          </div>
        </form>
        <!-- 显示添加时的错误信息 -->
        <p v-if="error" class="error-message" style="color: red; margin-top: 0.5em;">{{ error }}</p>
      </div>
  
      <!-- 错题列表卡片 -->
      <div class="card error-log-list-card">
        <h2><i class="fas fa-list-ul icon-gradient-secondary"></i> 错题列表</h2>
        <div class="filter-controls">
          <div class="control-group">
            <label for="error-filter-subject-el">按模块筛选:</label>
            <!-- v-model 绑定本地筛选状态 -->
            <select v-model="selectedFilterSubject" id="error-filter-subject-el">
               <!-- 遍历 store getter 获取的科目 -->
              <option v-for="subjectOption in availableSubjects" :key="subjectOption" :value="subjectOption">
                {{ subjectOption === 'all' ? '所有模块' : subjectOption }}
              </option>
            </select>
          </div>
          <!-- 清除筛选按钮 -->
          <button @click="clearFilter" class="btn btn-secondary btn-small"><i class="fas fa-times"></i> 清除筛选</button>
        </div>
  
        <!-- 错题列表容器 -->
        <div id="error-log-list-el" class="error-log-container">
          <!-- 加载状态 -->
          <div v-if="isLoading" class="loading-indicator" style="text-align: center; padding: 1rem; color: var(--text-light);">加载中...</div>
          <!-- 错误状态 (加载列表时) -->
          <div v-else-if="error && !isLoading" class="error-message" style="color: red; text-align: center; padding: 1rem;">错误: {{ error }}</div>
          <!-- 无数据状态 -->
          <div v-else-if="filteredErrors.length === 0" class="placeholder-text">
               {{ selectedFilterSubject === 'all' ? '暂无错题记录，快去添加吧！' : `在 "${selectedFilterSubject}" 模块下暂无错题记录。` }}
          </div>
           <!-- 正常列表 -->
          <div v-else>
             <!-- v-for 遍历 store getter -->
            <div class="error-item" v-for="item in filteredErrors" :key="item.id" :data-id="item.id">
              <div class="error-item-header">
                <h3><i class="fas fa-exclamation-circle icon-gradient-danger"></i>{{ item.subject }}</h3>
                <!-- 使用导入的 formatTimestamp 函数 -->
                <span class="timestamp">记录于: {{ formatTimestamp(item.timestamp) }}</span>
              </div>
              <div class="error-item-body">
                  <p><strong>题干:</strong> <span class="question-text">{{ item.question }}</span></p>
                  <p><strong>我的答案:</strong> {{ item.myAnswer || 'N/A' }}</p>
                  <p><strong>正确答案:</strong> {{ item.correctAnswer }}</p>
                  <p><strong>关联知识点:</strong> {{ item.knowledgePoint || 'N/A' }}</p>
                  <p><strong>错误原因:</strong> <span class="reason-text">{{ item.reason }}</span></p>
                  <p v-if="item.imageFile"><strong>截图:</strong> <span class="image-link"><i class="fas fa-image"></i>{{ item.imageFile }}</span></p>
              </div>
              <div class="error-item-footer">
                <span class="review-info">复习次数: {{ item.reviewCount || 0 }} | 上次复习: {{ item.lastReviewDate ? formatTimestamp(item.lastReviewDate) : '从未' }}</span>
                <!-- 点击调用本地处理方法 -->
                <button @click="markReviewedHandler(item.id)" class="btn btn-secondary btn-small mark-reviewed-btn"><i class="fas fa-check"></i> 标记已复习</button>
                <button @click="deleteErrorHandler(item.id)" class="btn btn-danger btn-small delete-error-btn"><i class="fas fa-trash"></i> 删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </template>
<script setup>
import { ref, reactive, computed, watch } from 'vue'; // 导入 watch
import { storeToRefs } from 'pinia';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import config from '@/config.js'; // 导入 config 以获取科目列表
// 假设你有一个 formatTimestamp 工具函数
import { formatTimestamp } from '@/utils/formatters.js'; // 需要创建这个文件或调整路径

// --- Store ---
const errorLogStore = useErrorLogStore();
// 使用 storeToRefs 获取响应式状态和 getters
// filteredErrors 现在由 Store 直接提供（包含了筛选逻辑）
// availableSubjects getter 也会自动更新
const {
  filteredErrors, // 直接使用 Store 中已过滤/排序的列表
  isLoading,      // 加载状态
  error,          // 错误状态
  availableSubjects, // 可用科目列表 (getter)
  errorCount,     // 错题总数 (getter)
} = storeToRefs(errorLogStore);

// --- 本地状态 ---
// 用于筛选下拉框的 v-model
const selectedFilterSubject = ref('all');

// 用于添加表单的 v-model
const newErrorForm = reactive({
  question: '',
  subject: '', // 默认应该是 '', 让用户选择
  myAnswer: '',
  correctAnswer: '',
  knowledgePoint: '',
  reason: '',
  imageFile: null, // 只存储文件名
});
let selectedFileObject = null; // 存储实际的 File 对象 (如果需要上传)

// --- 方法 ---
// 处理文件选择
function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (file) {
    newErrorForm.imageFile = file.name; // 更新表单中的文件名
    selectedFileObject = file;
    console.log('Selected file:', file.name);
  } else {
    newErrorForm.imageFile = null;
    selectedFileObject = null;
  }
}

// 提交新错题表单
async function submitNewError() { // 改为 async 以便处理 action 可能的异步反馈
  // 基础验证
  if (!newErrorForm.subject) {
     alert('请选择所属模块！');
     return;
  }
   if (!newErrorForm.question || !newErrorForm.correctAnswer || !newErrorForm.reason) {
     alert('请填写题干、正确答案和错误原因分析！');
     return;
   }

  // 准备要传递给 store action 的数据 (不包含文件对象)
  const errorData = {
    question: newErrorForm.question.trim(),
    subject: newErrorForm.subject,
    myAnswer: newErrorForm.myAnswer?.trim() || 'N/A', // 处理空字符串
    correctAnswer: newErrorForm.correctAnswer.trim(),
    knowledgePoint: newErrorForm.knowledgePoint?.trim() || 'N/A', // 处理空字符串
    reason: newErrorForm.reason.trim(),
    imageFile: newErrorForm.imageFile, // 只传递文件名
  };

  // 调用 store action 添加数据
  await errorLogStore.addError(errorData); // 等待 action 完成（如果需要后续操作）

  // 检查 store 中是否有错误信息
  if (errorLogStore.error) {
      alert(`添加失败: ${errorLogStore.error}`); // 显示错误信息
  } else {
      // 清空表单 (只在添加成功后清空)
      newErrorForm.question = '';
      newErrorForm.subject = '';
      newErrorForm.myAnswer = '';
      newErrorForm.correctAnswer = '';
      newErrorForm.knowledgePoint = '';
      newErrorForm.reason = '';
      newErrorForm.imageFile = null;
      selectedFileObject = null;
      const fileInput = document.getElementById('error-image-el'); // 使用你模板中的 ID
      if (fileInput) fileInput.value = ''; // 重置文件输入框

      alert('错题添加成功！');
       // 可以在这里考虑是否需要自动切换筛选或重新加载
       // 例如，如果添加后想看到所有最新的，可以:
       // selectedFilterSubject.value = 'all';
  }
}

// 清除筛选条件
function clearFilter() {
  selectedFilterSubject.value = 'all';
  // Store 的 loadErrors action 会被下面的 watch 触发
}

// 处理标记复习按钮点击
async function markReviewedHandler(errorId) { // 改为 async
  await errorLogStore.markAsReviewed(errorId);
  if (errorLogStore.error) {
      alert(`标记复习失败: ${errorLogStore.error}`);
  }
  // 可选：添加成功提示或 UI 反馈
}

// 处理删除按钮点击
async function deleteErrorHandler(errorId) { // 改为 async
  if (confirm('确定要删除这条错题记录吗？此操作无法撤销。')) {
    await errorLogStore.deleteError(errorId);
    if (errorLogStore.error) {
        alert(`删除失败: ${errorLogStore.error}`);
    }
     // 可选：添加成功提示
  }
}

// --- 侦听器 ---
// 侦听筛选条件的变化，当变化时调用 store action 重新加载数据
watch(selectedFilterSubject, (newFilter) => {
  // 调用 store action，传递新的筛选值 (null 代表 'all')
  errorLogStore.loadErrors(newFilter === 'all' ? null : newFilter);
});

// --- 生命周期钩子 ---
// onMounted 不再需要手动加载初始数据，Store 创建时已自动加载
// onMounted(() => {
//   console.log('ErrorLogSection mounted');
// });

// 导出 config 供模板中的下拉列表使用 (如果科目列表是固定的)
// 如果科目列表是从 availableSubjects 动态生成的，就不需要导出 config
// export { config }; // 如果模板中使用了 config.errorLogSubjects

// 导出 formatTimestamp 供模板使用
//export { formatTimestamp };

</script>
  
  <style scoped>
  /* --- Error Log Specific Styles --- */
  /* Specific borders for cards in this section */
  .error-log-add-card { /* First card */
       border-left: 4px solid var(--danger-color);
  }
  .error-log-list-card { /* Second card */
       border-left: 4px solid var(--secondary-color);
  }
  
  /* Filter controls styling (if not global) */
  .filter-controls {
      margin-bottom: 1.5rem;
      padding: 1rem;
      background-color: #f8f9fa;
      border-radius: 8px;
      display: flex;
      align-items: center;
      gap: 1.5rem;
      flex-wrap: wrap;
      border: 1px solid var(--border-color);
  }
  .control-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
  }
  .filter-controls label { /* Style label within filters */
       font-weight: 500;
       font-size: 0.9em;
       color: var(--text-light);
       white-space: nowrap;
  }
  .filter-controls select { /* Style select within filters */
      /* Assume global form styles apply, add specifics */
      padding: 0.4em 0.8em;
      /* border-radius: 6px; */ /* global */
      /* border: 1px solid var(--border-color); */ /* global */
      min-width: 150px;
      font-size: 0.9em;
      /* background-color: white; */ /* global */
  }
  .filter-controls button { /* Position clear button */
      margin-left: auto; /* Push to the right */
  }
  
  /* Container for the list */
  .error-log-container {
      margin-top: 1rem;
      display: grid; /* Or flex column */
      gap: 1rem; /* Space between items */
  }
  
  /* Individual error item card */
  .error-item {
      background-color: #fff;
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--danger-color); /* Specific border */
      border-radius: 8px;
      padding: 1rem 1.5rem;
      box-shadow: var(--shadow-light);
      transition: var(--transition-default);
  }
  .error-item:hover {
       box-shadow: var(--shadow-medium);
       transform: translateY(-2px);
  }
  
  .error-item-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 0.8rem;
      padding-bottom: 0.5rem;
      border-bottom: 1px dashed var(--border-color);
  }
  .error-item-header h3 {
      font-size: 1.05rem;
      margin-bottom: 0; /* Override global h3 margin */
      color: var(--danger-color);
      display: flex;
      align-items: center;
      gap: 0.5em;
  }
  .error-item-header .timestamp {
      font-size: 0.8em;
      color: var(--text-light);
      white-space: nowrap;
      padding-left: 1em; /* Space from title */
      flex-shrink: 0; /* Prevent shrinking */
  }
  
  .error-item-body {
      font-size: 0.95rem;
      line-height: 1.6;
  }
  .error-item-body p {
      margin-bottom: 0.6rem;
      word-wrap: break-word; /* Allow long text to wrap */
  }
  .error-item-body strong {
      font-weight: 600;
      color: var(--primary-dark);
      margin-right: 0.5em;
  }
  /* Specific styling for question/reason blocks */
  .question-text,
  .reason-text {
      background-color: #f8f9fa;
      padding: 0.5rem 0.8rem;
      border-radius: 4px;
      display: block; /* Ensure block display */
      margin-top: 0.2em;
      white-space: pre-wrap; /* Preserve whitespace and wrap */
      word-wrap: break-word;
      font-size: 0.95em;
      max-height: 200px; /* Limit height */
      overflow-y: auto; /* Add scroll if needed */
  }
  /* Style for image/file links */
  .image-link { /* Removed .knowledge-item-body */
       font-size: 0.85em;
       color: var(--secondary-color);
       margin-left: 0.5em;
       display: inline-block; /* Keep inline */
       word-break: break-all; /* Break long filenames */
  }
  .image-link i { /* Removed .knowledge-item-body */
      margin-right: 0.3em;
  }
  
  .error-item-footer {
      margin-top: 1rem;
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: flex-end; /* Align buttons right */
      align-items: center;
      gap: 0.5rem; /* Space between elements */
  }
  .review-info {
      font-size: 0.8em;
      color: var(--text-light);
      margin-right: auto; /* Push buttons to the right */
  }
  /* Button styles are global, .btn-small likely global */
  
  /* --- Error Log Specific Responsive --- */
  @media (max-width: 768px) {
      .filter-controls { /* Stack controls vertically */
          flex-direction: column;
          align-items: stretch; /* Stretch items to full width */
          gap: 0.8rem;
      }
      .filter-controls select {
          width: 100%; /* Full width */
          min-width: unset;
      }
      .filter-controls button { /* Align button */
          margin-left: 0;
          align-self: flex-end; /* Align clear button right */
      }
      .error-item-header { /* Stack header items */
          flex-direction: column;
          align-items: flex-start;
          gap: 0.3rem;
      }
      .error-item-header .timestamp { padding-left: 0; } /* Remove padding */
  
      .error-item-footer { /* Stack footer items */
          flex-direction: column;
          align-items: flex-start; /* Align left */
          gap: 0.8rem;
      }
      .review-info { margin-right: 0; } /* Remove auto margin */
      /* Align buttons to the right in the column */
      .error-item-footer button {
          align-self: flex-end;
      }
  }
  </style>