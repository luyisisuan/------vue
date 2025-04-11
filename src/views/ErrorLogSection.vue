<!-- src/views/ErrorLogSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-exclamation-triangle icon-gradient"></i> 错题本</h1>
      <p>记录和分析你的错题，攻克薄弱环节。</p>
    </header>
    <div class="card error-log-add-card">
      <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加新错题</h2>
      <!-- 表单提交调用 store action -->
      <form @submit.prevent="submitNewError" class="form-grid">
        <div class="form-group full-width">
          <label for="error-question-el">题干/问题描述:</label>
          <!-- v-model 绑定本地 reactive 对象 -->
          <textarea v-model="newErrorForm.question" id="error-question-el" rows="3" required placeholder="简要描述题目或粘贴题干..."></textarea>
        </div>
        <div class="form-group">
          <label for="error-subject-el">所属模块:</label>
          <select v-model="newErrorForm.subject" id="error-subject-el" required>
            <option value="" disabled>--选择模块--</option>
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
          <input type="file" id="error-image-el" accept="image/*" @change="handleFileChange">
          <span class="form-hint">仅保存文件名，请确保文件在本地</span>
        </div>
        <div class="form-group form-actions">
          <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 添加错题</button>
        </div>
      </form>
    </div>
    <div class="card error-log-list-card">
      <h2><i class="fas fa-list-ul icon-gradient-secondary"></i> 错题列表</h2>
      <div class="filter-controls">
        <div class="control-group">
          <label for="error-filter-subject-el">按模块筛选:</label>
          <!-- v-model 绑定本地 filter ref -->
          <select v-model="filterSubject" id="error-filter-subject-el">
            <option value="all">所有模块</option>
            <!-- 使用 store 的 getter -->
            <option v-for="subject in availableSubjects" :key="subject" :value="subject">{{ subject }}</option>
          </select>
        </div>
        <button @click="clearFilter" class="btn btn-secondary btn-small"><i class="fas fa-times"></i> 清除筛选</button>
      </div>
      <div id="error-log-list-el" class="error-log-container">
        <!-- 使用计算属性 filteredErrors -->
        <p class="placeholder-text" v-if="filteredErrors.length === 0">
          {{ filterSubject === 'all' ? '暂无错题记录，快去添加吧！' : `在 "${filterSubject}" 模块下暂无错题记录。` }}
        </p>
        <div v-else>
          <!-- 遍历计算属性 filteredErrors -->
          <div class="error-item" v-for="item in filteredErrors" :key="item.id" :data-id="item.id">
            <div class="error-item-header">
              <h3><i class="fas fa-exclamation-circle icon-gradient-danger"></i>{{ item.subject }}</h3>
              <span class="timestamp">记录于: {{ formatTimestamp(item.timestamp) }}</span>
            </div>
            <div class="error-item-body">
               <!-- ... 省略 body 内容，和之前一样绑定 item 属性 ... -->
                <p><strong>题干:</strong> <span class="question-text">{{ item.question }}</span></p>
                <p><strong>我的答案:</strong> {{ item.myAnswer || 'N/A' }}</p>
                <p><strong>正确答案:</strong> {{ item.correctAnswer }}</p>
                <p><strong>关联知识点:</strong> {{ item.knowledgePoint || 'N/A' }}</p>
                <p><strong>错误原因:</strong> <span class="reason-text">{{ item.reason }}</span></p>
                <p v-if="item.imageFile"><strong>截图:</strong> <span class="image-link"><i class="fas fa-image"></i>{{ item.imageFile }}</span></p>
            </div>
            <div class="error-item-footer">
              <span class="review-info">复习次数: {{ item.reviewCount || 0 }} | 上次复习: {{ item.lastReviewDate ? formatTimestamp(item.lastReviewDate) : '从未' }}</span>
              <!-- 点击调用 store action -->
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
import { ref, reactive, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia'; // 导入 storeToRefs
import { useErrorLogStore } from '@/stores/errorLogStore.js'; // 1. 导入 Store
import config from '@/config.js';
import { formatTimestamp } from '@/utils/formatters.js'; // 导入需要的工具函数

const errorLogStore = useErrorLogStore(); // 2. 获取 Store 实例

// 3. 使用 storeToRefs 获取响应式的 state 和 getters
// errors state 会自动从 store 更新
// availableSubjects getter 也会自动更新
const { errors, availableSubjects, errorCount } = storeToRefs(errorLogStore);

// 本地状态，用于筛选和添加表单
const filterSubject = ref('all');
const newErrorForm = reactive({ // 使用 reactive 处理表单对象
  question: '',
  subject: '',
  myAnswer: '',
  correctAnswer: '',
  knowledgePoint: '',
  reason: '',
  imageFile: null, // 文件名
});
let selectedFileObject = null; // 存储 File 对象，如果需要上传的话

// 计算属性，根据本地筛选条件过滤 store 中的 errors
const filteredErrors = computed(() => {
  if (filterSubject.value === 'all') {
    return errors.value; // 直接使用 store 的响应式 state
  }
  return errors.value.filter(item => item.subject === filterSubject.value);
});

// --- 方法 ---
function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (file) {
    newErrorForm.imageFile = file.name; // 保存文件名到表单对象
    selectedFileObject = file; // 保存文件对象（如果需要上传）
  } else {
    newErrorForm.imageFile = null;
    selectedFileObject = null;
  }
}

// 提交新错题，调用 store action
function submitNewError() {
  // 基础验证
   if (!newErrorForm.question || !newErrorForm.correctAnswer || !newErrorForm.reason || !newErrorForm.subject) {
     alert('请选择模块并填写题干、正确答案和错误原因分析！');
     return;
   }
  // 调用 store action 添加数据
  errorLogStore.addError({
    question: newErrorForm.question.trim(),
    subject: newErrorForm.subject,
    myAnswer: newErrorForm.myAnswer?.trim() || 'N/A',
    correctAnswer: newErrorForm.correctAnswer.trim(),
    knowledgePoint: newErrorForm.knowledgePoint?.trim() || 'N/A',
    reason: newErrorForm.reason.trim(),
    imageFile: newErrorForm.imageFile, // 传递文件名
  });

  // 清空表单
  newErrorForm.question = '';
  newErrorForm.subject = '';
  newErrorForm.myAnswer = '';
  newErrorForm.correctAnswer = '';
  newErrorForm.knowledgePoint = '';
  newErrorForm.reason = '';
  newErrorForm.imageFile = null;
  selectedFileObject = null;
  const fileInput = document.getElementById('error-image-el');
  if (fileInput) fileInput.value = '';

  alert('错题添加成功！');
}

function clearFilter() {
  filterSubject.value = 'all';
}

// 调用 store action 标记复习
function markReviewedHandler(errorId) {
  errorLogStore.markReviewed(errorId);
  // 可以选择性地给用户一个反馈，比如按钮状态变化或提示
}

// 调用 store action 删除
function deleteErrorHandler(errorId) {
  if (confirm('确定要删除这条错题记录吗？此操作无法撤销。')) {
    errorLogStore.deleteError(errorId);
  }
}

// onMounted 不再需要手动加载数据，Store 创建时已加载
// onMounted(() => {
//   // errorLogStore.loadErrors(); // 如果需要在组件挂载时强制刷新
// });

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