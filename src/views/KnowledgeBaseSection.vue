<!-- src/views/KnowledgeBaseSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-brain icon-gradient"></i> 知识库</h1>
      <p>整理和查阅你的常识、素材和理论。</p>
    </header>

    <div class="card knowledge-add-card">
      <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加知识条目</h2>
      <form @submit.prevent="submitNewItem" class="form-grid">
        <div class="form-group">
          <label for="knowledge-title-el">标题:</label>
          <input v-model.trim="newItemForm.title" type="text" id="knowledge-title-el" required placeholder="知识点或素材的标题">
        </div>
        <div class="form-group">
          <label for="knowledge-category-el">分类:</label>
          <select v-model="newItemForm.category" id="knowledge-category-el" required>
            <option value="" disabled>--选择分类--</option>
            <option v-for="cat in config.knowledgeBaseCategories" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="form-group full-width">
          <label for="knowledge-content-el">内容:</label>
          <textarea v-model="newItemForm.content" id="knowledge-content-el" rows="5" required placeholder="详细内容、要点、笔记..."></textarea>
        </div>
        <div class="form-group">
          <label for="knowledge-tags-el">标签 (逗号分隔):</label>
          <input v-model.trim="newTagsInput" type="text" id="knowledge-tags-el" placeholder="如: 十四五规划, 乡村振兴, 面试可用">
        </div>
        <div class="form-group">
          <label for="knowledge-external-link-el">外部链接 (可选):</label>
          <input v-model.trim="newItemForm.externalLink" type="url" id="knowledge-external-link-el" placeholder="https://example.com">
        </div>
        <div class="form-group">
          <label for="knowledge-linked-file-el">关联文件 (可选):</label>
          <input type="file" id="knowledge-linked-file-el" @change="handleItemFileChange">
           <!-- 显示已选择的文件 -->
          <span v-if="selectedItemFileObject" class="selected-file-info">已选择: {{ selectedItemFileObject.name }}</span>
          <span v-else class="form-hint">选择要上传的文件</span>
        </div>
        <div class="form-group form-actions">
           <!-- 绑定禁用状态 -->
          <button type="submit" class="btn btn-primary" :disabled="isAdding || isUploading">
             <i class="fas fa-save"></i> {{ isAdding ? '处理中...' : (isUploading ? '上传中...' : '添加条目') }}
          </button>
        </div>
      </form>
      <!-- 显示添加或上传错误 -->
       <p v-if="addErrorState || uploadError" class="error-message" style="color: red; margin-top: 0.5em;">
          {{ addErrorState || uploadError }}
       </p>
    </div>

    <div class="card knowledge-list-card">
      <h2><i class="fas fa-book-open icon-gradient-secondary"></i> 知识列表</h2>
      <div class="knowledge-controls filter-controls">
        <div class="control-group">
          <label for="knowledge-filter-category-el">按分类筛选:</label>
          <select v-model="filterCategory" id="knowledge-filter-category-el">
            <option v-for="catOption in availableCategories" :key="catOption" :value="catOption">
              {{ catOption === 'all' ? '所有分类' : catOption }}
            </option>
          </select>
        </div>
        <div class="control-group">
          <label for="knowledge-search-term-el">搜索:</label>
          <input v-model.lazy="searchTerm" type="search" id="knowledge-search-term-el" placeholder="搜索标题、内容、标签...">
        </div>
        <button @click="clearKnowledgeFilter" class="btn btn-secondary btn-small"><i class="fas fa-times"></i> 清除</button>
      </div>

      <div id="knowledge-base-list-el" class="knowledge-base-container">
        <div v-if="isLoading" class="loading-indicator">加载中...</div>
        <div v-else-if="error" class="error-message">错误: {{ error }}</div>
        <div v-else-if="filteredItems.length === 0" class="placeholder-text">
             {{ filterCategory === 'all' && !searchTerm ? '知识库为空，开始添加你的积累吧！' : '没有找到匹配的知识条目。' }}
        </div>
        <div v-else>
          <div class="knowledge-item" v-for="item in filteredItems" :key="item.id" :data-id="item.id">
            <div class="knowledge-item-header">
               <div>
                  <h3 v-html="highlightText(item.title, searchTerm)"></h3>
                 <span class="category">{{ item.category }}</span>
               </div>
               <span class="timestamp">添加于: {{ formatTimestamp(item.timestamp) }}</span>
            </div>
            <div class="knowledge-item-body">
                <div class="content-text" v-html="highlightText(item.content, searchTerm)"></div>
              <p v-if="item.externalLink"><strong>链接:</strong> <a :href="item.externalLink" target="_blank" class="external-link"><i class="fas fa-external-link-alt"></i> {{ item.externalLink }}</a></p>
              <!-- **MODIFIED:** 显示文件链接 -->
              <p v-if="item.linkedFile">
                  <strong>文件:</strong>
                  <a :href="getFileDownloadUrl(item.linkedFile)" target="_blank" class="file-link">
                      <i class="fas fa-paperclip"></i> {{ getFilenameFromIdentifier(item.linkedFile) }}
                  </a>
              </p>
            </div>
            <div v-if="item.tags && item.tags.length > 0" class="knowledge-item-tags">
              <strong>标签:</strong>
               <span v-for="tag in item.tags" :key="tag" class="tag" v-html="highlightText(tag, searchTerm)"></span>
            </div>
            <div class="knowledge-item-footer">
               <!-- 时间戳移到 header 了 -->
              <div class="actions">
                <button @click="deleteItemHandler(item.id)" class="btn btn-danger btn-small delete-knowledge-btn"><i class="fas fa-trash"></i> 删除</button>
              </div>
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
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';
import config from '@/config.js';
import { formatTimestamp } from '@/utils/formatters.js';
import sanitizeHtml from 'sanitize-html';
import { debounce } from 'lodash-es';

// --- Store ---
const knowledgeStore = useKnowledgeStore();
const {
  filteredItems,
  isLoading,
  error,
  isAdding,       // 添加过程状态
  isUploading,    // 上传状态
  addErrorState,  // 添加特定错误
  uploadError,    // 上传特定错误
  availableCategories,
  itemCount
} = storeToRefs(knowledgeStore);

// --- Local State ---
const filterCategory = ref('all');
const searchTerm = ref('');
const newItemForm = reactive({
  title: '', category: '', content: '',
  tags: [], externalLink: '', linkedFile: null // Store filename here if needed by backend on create
});
const newTagsInput = ref(''); // For comma-separated input
const selectedItemFileObject = ref(null); // Store the File object for upload

// --- Constants ---
const FILE_DOWNLOAD_BASE_URL = 'http://localhost:8080/api/files/download';

// --- Methods ---
function handleItemFileChange(event) {
  const file = event.target.files?.[0];
  selectedItemFileObject.value = file || null;
  // newItemForm.linkedFile = file ? file.name : null; // Update if needed
}

async function submitNewItem() {
  // Basic validation
  if (!newItemForm.category) { alert('请选择分类！'); return; }
  if (!newItemForm.title || !newItemForm.content) { alert('请填写标题和内容！'); return; }

  const tagsArray = newTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

  const itemData = {
    title: newItemForm.title,
    category: newItemForm.category,
    content: newItemForm.content,
    tags: tagsArray,
    externalLink: newItemForm.externalLink || null, // Ensure null if empty
    linkedFile: selectedItemFileObject.value?.name // Send original filename if backend needs it? Check backend logic.
  };

  const success = await knowledgeStore.addItem(itemData, selectedItemFileObject.value);

  if (success) {
    // Reset form
    newItemForm.title = ''; newItemForm.category = ''; newItemForm.content = '';
    newItemForm.tags = []; newItemForm.externalLink = ''; newItemForm.linkedFile = null;
    newTagsInput.value = '';
    selectedItemFileObject.value = null;
    const fileInput = document.getElementById('knowledge-linked-file-el');
    if (fileInput) fileInput.value = '';
    alert('知识条目添加成功！');
  } else {
    alert(`添加知识条目失败: ${addErrorState.value || uploadError.value || error.value || '未知错误'}`);
  }
}

function clearKnowledgeFilter() {
  filterCategory.value = 'all';
  searchTerm.value = '';
  // Watcher will trigger loadItems
}

async function deleteItemHandler(itemId) {
  if (confirm('确定要删除这条知识库条目吗？此操作无法撤销。')) {
    const success = await knowledgeStore.deleteItem(itemId);
    if (!success) {
        alert(`删除失败: ${error.value || '未知错误'}`);
    } else {
         alert('删除成功！');
    }
  }
}

// Text highlighting function (keep as before, using sanitize-html)
function highlightText(text, term) {
    if (!term || !text) {
        return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} });
    }
    const safeText = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    const safeTerm = sanitizeHtml(term, { allowedTags: [], allowedAttributes: {} });
    if (!safeTerm) return safeText;
    try {
        const escapedTerm = safeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        // **MODIFIED:** Apply mark class for easier styling via :deep
        return safeText.replace(regex, '<mark class="highlight">$1</mark>');
    } catch (e) {
        console.error("Error highlighting text:", e);
        return safeText;
    }
}

// Get file download URL (same as ErrorLogSection)
function getFileDownloadUrl(fileIdentifier) {
    if (!fileIdentifier) return '#';
    const identifier = fileIdentifier.startsWith('/') ? fileIdentifier.substring(1) : fileIdentifier;
    return `${FILE_DOWNLOAD_BASE_URL}/${identifier}`;
}

// Get filename from identifier (same as ErrorLogSection)
function getFilenameFromIdentifier(fileIdentifier) {
    if (!fileIdentifier) return '';
    const lastSlashIndex = Math.max(fileIdentifier.lastIndexOf('/'), fileIdentifier.lastIndexOf('\\'));
    return lastSlashIndex >= 0 ? fileIdentifier.substring(lastSlashIndex + 1) : fileIdentifier;
}

// Debounced function for loading items on filter/search change
const debouncedLoadItems = debounce(() => {
    knowledgeStore.loadItems(filterCategory.value, searchTerm.value);
}, 500);

// --- Watchers ---
watch([filterCategory, searchTerm], () => {
    debouncedLoadItems();
});

</script>

<style scoped>
/* --- Knowledge Base Specific Styles --- */
.knowledge-add-card { border-left: 4px solid var(--info-color); }
.knowledge-list-card { border-left: 4px solid var(--secondary-color); }

/* Filter/Search Controls */
.knowledge-controls { margin-bottom: 1.5rem; padding: 1rem; background-color: #f8f9fa; border-radius: 8px; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; border: 1px solid var(--border-color); }
.control-group { display: flex; align-items: center; gap: 0.5rem; }
.knowledge-controls label { font-weight: 500; font-size: 0.9em; color: var(--text-light); white-space: nowrap; }
.knowledge-controls select, .knowledge-controls input[type="search"] { padding: 0.4em 0.8em; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.9em; }
.knowledge-controls select { min-width: 150px; background-color: white; }
.knowledge-controls input[type="search"] { min-width: 200px; }
.knowledge-controls button { margin-left: auto; }

/* Form Grid/Group (Assume global or define needed) */
.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-weight: 600; font-size: 0.9em; color: var(--primary-dark); }
.form-group input[type="text"], .form-group input[type="url"], .form-group select, .form-group textarea, .form-group input[type="file"], .form-group input[type="search"] { width: 100%; padding: 0.7em 0.9em; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.95em; font-family: inherit; transition: var(--transition-default); }
.form-group input[type="file"] { padding: 0.4em; background-color: #f8f9fa; }
.form-group textarea { resize: vertical; min-height: 60px; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus, .form-group input[type="search"]:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(74, 105, 189, 0.2); }
.form-hint { font-size: 0.8em; color: var(--text-light); font-style: italic; }
.form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; margin-top: 1rem; }
.selected-file-info { display: inline-block; margin-left: 10px; font-size: 0.85em; color: var(--text-light); font-style: italic; }


/* Knowledge List */
.knowledge-base-container { margin-top: 1rem; display: grid; gap: 1rem; }
.knowledge-item { background-color: #fff; border: 1px solid var(--border-color); border-left: 4px solid var(--info-color); border-radius: 8px; padding: 1rem 1.5rem; box-shadow: var(--shadow-light); transition: var(--transition-default); display: flex; flex-direction: column; }
.knowledge-item:hover { box-shadow: var(--shadow-medium); transform: translateY(-2px); }
.knowledge-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
.knowledge-item-header > div:first-child { flex-grow: 1; }
.knowledge-item-header h3 { font-size: 1.1rem; margin-bottom: 0.2rem; color: var(--info-color); word-break: break-word; display: inline-block; margin-right: 0.5em; }
.knowledge-item-header h3 :deep(mark.highlight) { background-color: yellow; padding: 0; color: inherit; border-radius: 2px;} /* Style highlight */
.knowledge-item-header .category { font-size: 0.8em; font-weight: 500; color: var(--text-light); background-color: #f0f4f8; padding: 0.1em 0.5em; border-radius: 4px; white-space: nowrap; display: inline-block; vertical-align: middle; }
.knowledge-item-header .timestamp { font-size: 0.8em; color: var(--text-light); white-space: nowrap; flex-shrink: 0; }
.knowledge-item-body { font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem; flex-grow: 1; }
.knowledge-item-body .content-text { white-space: pre-wrap; word-wrap: break-word; margin-bottom: 0.8rem; }
.knowledge-item-body .content-text :deep(mark.highlight) { background-color: yellow; padding: 0; color: inherit; border-radius: 2px;} /* Style highlight */
.knowledge-item-body p { margin-bottom: 0.4rem; word-wrap: break-word; }
.knowledge-item-body strong { font-weight: 600; color: var(--primary-dark); margin-right: 0.5em; }
.external-link { color: var(--primary-color); font-size: 0.9em; word-break: break-all; text-decoration: underline; }
.external-link i { margin-right: 0.3em; }
.file-link { font-size: 0.9em; color: var(--primary-color); display: inline-flex; align-items: center; gap: 0.3em; word-break: break-all; text-decoration: underline; cursor: pointer; }
.file-link:hover { color: var(--primary-dark); }
.file-link i { font-size: 1em; margin-right: 0; /* Use gap */ }
.knowledge-item-tags { margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.knowledge-item-tags strong { margin-bottom: 0; }
.tag { background-color: var(--secondary-color); color: white; padding: 0.2em 0.6em; border-radius: 10px; font-size: 0.75em; font-weight: 500; cursor: default; transition: background-color var(--transition-speed) ease; }
.tag :deep(mark.highlight) { background-color: navy; color: yellow; padding: 0; border-radius: 2px;} /* Style highlight */
.knowledge-item-footer { margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; }
.knowledge-item-footer .actions { display: flex; gap: 0.5rem; }

/* Loading/Error/Placeholder */
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.placeholder-text-small, .placeholder-text { color: var(--text-light); text-align: center; padding: 2rem; font-style: italic; }
.placeholder-text-small { padding: 1rem 0; font-size: 0.9em; }

/* Header icon */
.section-header i.icon-gradient { background: var(--gradient-info); -webkit-background-clip: text; background-clip: text; color: transparent; }

/* Responsive */
@media (max-width: 768px) {
    .filter-controls { flex-direction: column; align-items: stretch; gap: 0.8rem; }
    .filter-controls select, .filter-controls input[type="search"] { width: 100%; min-width: unset; }
    .filter-controls button { margin-left: 0; align-self: flex-end; }
    .knowledge-item-header { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
    .knowledge-item-footer { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .knowledge-item-footer .actions { align-self: flex-end; }
}
</style>