<!-- src/views/ErrorLogSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-exclamation-triangle icon-gradient"></i> 错题本</h1>
      <p>记录和分析你的错题，攻克薄弱环节。</p>
    </header>

    <div class="card error-log-add-card">
      <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加新错题</h2>
      <form @submit.prevent="submitNewError" class="form-grid">
        <div class="form-group full-width">
          <label for="error-question-el">题干/问题描述:</label>
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
          <span v-if="selectedFileObject" class="selected-file-info">已选择: {{ selectedFileObject.name }}</span>
          <span v-else class="form-hint">选择要上传的图片文件</span>
        </div>
        <div class="form-group form-actions">
          <!-- 使用 isAdding 状态判断整体过程，isUploading 用于更具体的上传提示 -->
          <button type="submit" class="btn btn-primary" :disabled="isAdding || isLoading">
            <i class="fas fa-save"></i> {{ isAdding ? (isUploading ? '上传中...' : '添加中...') : '添加错题' }}
          </button>
        </div>
      </form>
      <!-- 显示添加过程中的特定错误 -->
      <p v-if="addErrorState" class="error-message" style="color: red; margin-top: 0.5em;">
        {{ addErrorState }}
      </p>
      <!-- 显示通用的加载/删除/标记错误 -->
      <p v-else-if="error && !isAdding" class="error-message" style="color: red; margin-top: 0.5em;">
        操作失败: {{ error }}
      </p>
    </div>

    <div class="card error-log-list-card">
      <h2><i class="fas fa-list-ul icon-gradient-secondary"></i> 错题列表</h2>
      <div class="filter-controls">
        <div class="control-group">
          <label for="error-filter-subject-el">按模块筛选:</label>
          <select v-model="selectedFilterSubject" id="error-filter-subject-el">
            <option v-for="subjectOption in availableSubjects" :key="subjectOption" :value="subjectOption">
              {{ subjectOption === 'all' ? '所有模块' : subjectOption }}
            </option>
          </select>
        </div>
        <button @click="clearFilter" class="btn btn-secondary btn-small"><i class="fas fa-times"></i> 清除筛选</button>
      </div>
      <div id="error-log-list-el" class="error-log-container">
        <div v-if="isLoading && !isAdding" class="loading-indicator">加载错题列表中...</div>
        <div v-else-if="error && !isLoading && !isAdding && filteredErrors.length === 0" class="error-message">加载错题时出错: {{ error }}</div>
        <div v-else-if="!filteredErrors || filteredErrors.length === 0" class="placeholder-text">
             {{ selectedFilterSubject === 'all' ? '暂无错题记录，快去添加吧！' : `在 "${selectedFilterSubject}" 模块下暂无错题记录。` }}
        </div>
         <div v-else>
          <div class="error-item" v-for="item in filteredErrors" :key="item.id" :data-id="item.id">
            <div class="error-item-header">
              <h3><i class="fas fa-exclamation-circle icon-gradient-danger"></i>{{ item.subject }}</h3>
              <span class="timestamp">记录于: {{ formatTimestamp(item.timestamp) }}</span>
            </div>
            <div class="error-item-body">
                <p><strong>题干:</strong> <span class="question-text">{{ item.question }}</span></p>
                <p><strong>我的答案:</strong> {{ item.myAnswer || 'N/A' }}</p>
                <p><strong>正确答案:</strong> {{ item.correctAnswer }}</p>
                <p><strong>关联知识点:</strong> {{ item.knowledgePoint || 'N/A' }}</p>
                <p><strong>错误原因:</strong> <span class="reason-text">{{ item.reason }}</span></p>
                <p v-if="item.imageFile">
                    <strong>截图:</strong>
                    <a :href="getFileDownloadUrl(item.imageFile)" target="_blank" class="file-link">
                        <i class="fas fa-image"></i> {{ getFilenameFromIdentifier(item.imageFile) }}
                    </a>
                </p>
            </div>
            <div class="error-item-footer">
              <span class="review-info">复习次数: {{ item.reviewCount || 0 }} | 上次复习: {{ item.lastReviewDate ? formatTimestamp(item.lastReviewDate) : '从未' }}</span>
              <!-- ****** 这里是修改后的点击事件处理函数 ****** -->
              <button @click="markReviewedHandler(item.id)" class="btn btn-secondary btn-small mark-reviewed-btn"><i class="fas fa-check"></i> 标记已复习</button>
              <!-- ***************************************** -->
              <button @click="deleteErrorHandler(item.id)" class="btn btn-danger btn-small delete-error-btn"><i class="fas fa-trash"></i> 删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useErrorLogStore } from '@/stores/errorLogStore.js';
import config from '@/config.js';
import { formatTimestamp } from '@/utils/formatters.js';

// Store
const errorLogStore = useErrorLogStore();
const {
  filteredErrors,
  isLoading,
  error,        // 通用错误
  isAdding,     // 添加错题的整体过程状态
  isUploading,  // 文件上传状态
  addErrorState,// 添加操作特定的错误信息
  availableSubjects,
} = storeToRefs(errorLogStore);

// Local State
const selectedFilterSubject = ref('all');
const newErrorForm = reactive({
  question: '', subject: '', myAnswer: '', correctAnswer: '',
  knowledgePoint: '', reason: '', imageFile: null, // 这个字段现在主要用于内部逻辑或显示，上传时直接用 file object
});
const selectedFileObject = ref(null); // 存储实际的 File 对象

// Constants
const FILE_DOWNLOAD_BASE_URL = 'http://localhost:8080/api/files/download'; // 确保这个基础 URL 正确

// Methods
function handleFileChange(event) {
  const file = event.target.files?.[0];
  selectedFileObject.value = file || null;
}

async function submitNewError() {
  if (!newErrorForm.subject) { alert('请选择所属模块！'); return; }
  if (!newErrorForm.question || !newErrorForm.correctAnswer || !newErrorForm.reason) {
      alert('请填写题干、正确答案和错误原因分析！'); return;
  }

  const errorData = {
    question: newErrorForm.question.trim(), subject: newErrorForm.subject,
    myAnswer: newErrorForm.myAnswer?.trim() || 'N/A', // 处理空字符串
    correctAnswer: newErrorForm.correctAnswer.trim(),
    knowledgePoint: newErrorForm.knowledgePoint?.trim() || 'N/A', // 处理空字符串
    reason: newErrorForm.reason.trim(),
  };

  // 调用 store action, 传递错题数据和文件对象
  const success = await errorLogStore.addError(errorData, selectedFileObject.value);

  if (success) {
      // 清空表单
      newErrorForm.question = ''; newErrorForm.subject = ''; newErrorForm.myAnswer = '';
      newErrorForm.correctAnswer = ''; newErrorForm.knowledgePoint = ''; newErrorForm.reason = '';
      // newErrorForm.imageFile = null; // 这个字段可能不需要重置，因为它不直接绑定到表单
      selectedFileObject.value = null; // 清除已选文件对象
      // 重置文件输入框
      const fileInput = document.getElementById('error-image-el');
      if (fileInput) fileInput.value = '';
      alert('错题添加成功！');
  } else {
      // 错误信息现在由 Store 的 addErrorState 或 error 提供，已在模板中显示
      // alert(`添加错题失败: ${addErrorState.value || error.value || '未知错误'}`); // 可以移除此 alert
  }
}

function clearFilter() {
  selectedFilterSubject.value = 'all';
  // Watcher 会自动触发 loadErrors
}

// ****** 这里是修改后的函数调用 ******
async function markReviewedHandler(errorId) {
    // 使用 Store 中正确的函数名 markAsReviewed
    await errorLogStore.markAsReviewed(errorId);
    if (error.value) { // 检查 Store 中的通用错误状态
        alert(`标记复习失败: ${error.value}`);
    }
    // 成功时不需要 alert，因为列表会自动更新显示最新状态
}
// **********************************

async function deleteErrorHandler(errorId) {
  if (confirm('确定要删除这条错题记录吗？此操作无法撤销。')) {
    const success = await errorLogStore.deleteError(errorId);
    if (!success) {
        // 错误信息来自 store 的 error 状态
        alert(`删除失败: ${error.value || '未知错误'}`);
    } else {
        alert('删除成功！');
        // 列表会自动更新
    }
  }
}

function getFileDownloadUrl(fileIdentifier) {
    if (!fileIdentifier) return '#';
    // 简单的 URL 拼接，确保没有多余或缺失的斜杠
    const baseUrl = FILE_DOWNLOAD_BASE_URL.endsWith('/') ? FILE_DOWNLOAD_BASE_URL : FILE_DOWNLOAD_BASE_URL + '/';
    const identifier = fileIdentifier.startsWith('/') ? fileIdentifier.substring(1) : fileIdentifier;
    return `${baseUrl}${identifier}`;
}

function getFilenameFromIdentifier(fileIdentifier) {
    if (!fileIdentifier) return '';
    // 尝试从路径中提取文件名 (兼容 / 和 \)
    const lastSlashIndex = Math.max(fileIdentifier.lastIndexOf('/'), fileIdentifier.lastIndexOf('\\'));
    return lastSlashIndex >= 0 ? fileIdentifier.substring(lastSlashIndex + 1) : fileIdentifier;
}

// Watcher: 监听筛选条件变化，调用 store action 加载数据
watch(selectedFilterSubject, (newFilter) => {
  if (typeof errorLogStore.loadErrors === 'function') {
      errorLogStore.loadErrors(newFilter === 'all' ? null : newFilter);
  } else {
       console.error("错误：errorLogStore.loadErrors action 未定义!");
  }
}, { immediate: false }); // 不立即执行，等待用户选择

// 注意: Store 初始化时会调用 loadErrors()，所以这里 immediate: false 是合适的

// 可以在 onMounted 中再调用一次 loadErrors，确保初始加载
// import { onMounted } from 'vue';
// onMounted(() => {
//   if (!filteredErrors.value?.length && !isLoading.value) { // 避免重复加载
//       errorLogStore.loadErrors(selectedFilterSubject.value === 'all' ? null : selectedFilterSubject.value);
//   }
// });

</script>

<style scoped>
/* --- Error Log Specific Styles --- */
.error-log-add-card {
     border-left: 4px solid var(--danger-color);
}
.error-log-list-card {
     border-left: 4px solid var(--secondary-color);
}

/* Filter controls styling */
.filter-controls {
    margin-bottom: 1.5rem; padding: 1rem; background-color: #f8f9fa;
    border-radius: 8px; display: flex; align-items: center; gap: 1.5rem;
    flex-wrap: wrap; border: 1px solid var(--border-color);
}
.control-group { display: flex; align-items: center; gap: 0.5rem; }
.filter-controls label {
    font-weight: 500; font-size: 0.9em; color: var(--text-light); white-space: nowrap;
}
.filter-controls select {
    padding: 0.4em 0.8em; border-radius: 6px; border: 1px solid var(--border-color);
    min-width: 150px; font-size: 0.9em; background-color: white;
}
.filter-controls button { margin-left: auto; }

/* Form Grid/Group (Assume global or define needed parts) */
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-weight: 600; font-size: 0.9em; color: var(--primary-dark); }
.form-group input[type="text"],
.form-group select,
.form-group textarea,
.form-group input[type="file"] {
    width: 100%; padding: 0.7em 0.9em; border: 1px solid var(--border-color);
    border-radius: 6px; font-size: 0.95em; font-family: inherit; transition: var(--transition-default);
}
.form-group input[type="file"] { padding: 0.4em; background-color: #f8f9fa; }
.form-group textarea { resize: vertical; min-height: 60px; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(74, 105, 189, 0.2); }
.form-hint { font-size: 0.8em; color: var(--text-light); font-style: italic; }
.form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 1rem; }
.selected-file-info { display: inline-block; margin-left: 10px; font-size: 0.85em; color: var(--text-light); font-style: italic; }

/* Error Log List */
.error-log-container { margin-top: 1rem; display: grid; gap: 1rem; }
.error-item { background-color: #fff; border: 1px solid var(--border-color); border-left: 4px solid var(--danger-color); border-radius: 8px; padding: 1rem 1.5rem; box-shadow: var(--shadow-light); transition: var(--transition-default); }
.error-item:hover { box-shadow: var(--shadow-medium); transform: translateY(-2px); }
.error-item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.8rem; padding-bottom: 0.5rem; border-bottom: 1px dashed var(--border-color); }
.error-item-header h3 { font-size: 1.05rem; margin-bottom: 0; color: var(--danger-color); display: flex; align-items: center; gap: 0.5em; }
.error-item-header .timestamp { font-size: 0.8em; color: var(--text-light); white-space: nowrap; padding-left: 1em; flex-shrink: 0; }
.error-item-body { font-size: 0.95rem; line-height: 1.6; }
.error-item-body p { margin-bottom: 0.6rem; word-wrap: break-word; }
.error-item-body strong { font-weight: 600; color: var(--primary-dark); margin-right: 0.5em; }
.question-text, .reason-text { background-color: #f8f9fa; padding: 0.5rem 0.8rem; border-radius: 4px; display: block; margin-top: 0.2em; white-space: pre-wrap; word-wrap: break-word; font-size: 0.95em; max-height: 200px; overflow-y: auto; }
.file-link { font-size: 0.9em; color: var(--primary-color); display: inline-flex; align-items: center; gap: 0.3em; word-break: break-all; text-decoration: underline; cursor: pointer; }
.file-link:hover { color: var(--primary-dark); }
.file-link i { font-size: 1em; }
.error-item-footer { margin-top: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; }
.review-info { font-size: 0.8em; color: var(--text-light); margin-right: auto; }

/* Loading/Error/Placeholder */
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.placeholder-text { color: var(--text-light); text-align: center; padding: 2rem; font-style: italic; }

/* Header specific icon */
.section-header i.icon-gradient { background: var(--gradient-danger); -webkit-background-clip: text; background-clip: text; color: transparent; }

/* Responsive */
@media (max-width: 768px) {
    .filter-controls { flex-direction: column; align-items: stretch; gap: 0.8rem; }
    .filter-controls select { width: 100%; min-width: unset; }
    .filter-controls button { margin-left: 0; align-self: flex-end; }
    .error-item-header { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
    .error-item-header .timestamp { padding-left: 0; }
    .error-item-footer { flex-direction: column; align-items: flex-start; gap: 0.8rem; }
    .review-info { margin-right: 0; }
    .error-item-footer button { align-self: flex-end; }
}
</style>