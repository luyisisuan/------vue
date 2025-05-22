<!-- src/views/KnowledgeBaseSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-brain icon-gradient"></i> 知识库</h1>
      <p>整理和查阅你的常识、素材和理论。</p>
    </header>

    <!-- Add New Item Card -->
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
          <span v-if="selectedItemFileObject" class="selected-file-info">已选择: {{ selectedItemFileObject.name }}</span>
          <span v-else class="form-hint">选择要上传的文件</span>
        </div>
        <div class="form-group form-actions">
          <button type="submit" class="btn btn-primary" :disabled="isAdding || isUploading">
             <i class="fas fa-save"></i> {{ isAdding ? '处理中...' : (isUploading ? '上传中...' : '添加条目') }}
          </button>
        </div>
      </form>
       <p v-if="addErrorState || uploadError" class="error-message" style="color: red; margin-top: 0.5em;">
          {{ addErrorState || uploadError }}
       </p>
    </div>

    <!-- Knowledge List Card -->
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
              <div class="actions">
                <button @click="openEditModal(item)" class="btn btn-secondary btn-small edit-knowledge-btn"><i class="fas fa-edit"></i> 编辑</button>
                <button @click="deleteItemHandler(item.id)" class="btn btn-danger btn-small delete-knowledge-btn"><i class="fas fa-trash"></i> 删除</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Item Modal -->
    <div v-if="isEditModalVisible" class="modal-overlay" @click.self="closeEditModal">
      <div class="modal-content">
        <button @click="closeEditModal" class="modal-close-btn">×</button>
        <h2><i class="fas fa-edit icon-gradient-secondary"></i> 编辑知识条目</h2>
        <form v-if="editingItem" @submit.prevent="submitEditedItem" class="form-grid">
          <div class="form-group">
            <label for="edit-knowledge-title-el">标题:</label>
            <input v-model.trim="editForm.title" type="text" id="edit-knowledge-title-el" required>
          </div>
          <div class="form-group">
            <label for="edit-knowledge-category-el">分类:</label>
            <select v-model="editForm.category" id="edit-knowledge-category-el" required>
              <option value="" disabled>--选择分类--</option>
              <option v-for="cat in config.knowledgeBaseCategories" :key="cat" :value="cat">{{ cat }}</option>
            </select>
          </div>
          <div class="form-group full-width">
            <label for="edit-knowledge-content-el">内容:</label>
            <textarea v-model="editForm.content" id="edit-knowledge-content-el" rows="5" required></textarea>
          </div>
          <div class="form-group">
            <label for="edit-knowledge-tags-el">标签 (逗号分隔):</label>
            <input v-model.trim="editTagsInput" type="text" id="edit-knowledge-tags-el">
          </div>
          <div class="form-group">
            <label for="edit-knowledge-external-link-el">外部链接 (可选):</label>
            <input v-model.trim="editForm.externalLink" type="url" id="edit-knowledge-external-link-el">
          </div>
          <div class="form-group">
            <label for="edit-knowledge-linked-file-el">关联文件 (可选):</label>
            <div v-if="editingItem.linkedFile && !selectedEditFileObject && !removeCurrentFileInEdit">
              <p class="current-file-info">
                当前文件: {{ getFilenameFromIdentifier(editingItem.linkedFile) }}
                <label style="margin-left: 10px; font-size: 0.9em; cursor:pointer;">
                  <input type="checkbox" v-model="removeCurrentFileInEdit" style="margin-right: 5px;"> 删除此文件
                </label>
              </p>
            </div>
             <p v-if="removeCurrentFileInEdit && editingItem.linkedFile" class="current-file-info" style="color: var(--danger-color);">
                将删除文件: {{ getFilenameFromIdentifier(editingItem.linkedFile) }}
             </p>
            <input type="file" id="edit-knowledge-linked-file-el" @change="handleEditItemFileChange" :disabled="removeCurrentFileInEdit">
            <span v-if="selectedEditFileObject" class="selected-file-info">新选择: {{ selectedEditFileObject.name }} (将替换旧文件)</span>
            <span v-else-if="!editingItem.linkedFile || removeCurrentFileInEdit" class="form-hint">选择要上传的文件</span>
             <span v-else class="form-hint">选择新文件以替换当前文件</span>
          </div>
          <div class="form-group form-actions">
            <button type="button" @click="closeEditModal" class="btn btn-secondary">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="isUpdating || isUploading">
              <i class="fas fa-save"></i> {{ isUpdating ? '更新中...' : (isUploading ? '上传中...' : '保存更改') }}
            </button>
          </div>
        </form>
        <p v-if="updateErrorState || (editingItem && uploadError)" class="error-message" style="color: red; margin-top: 0.5em;">
          {{ updateErrorState || uploadError }}
        </p>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, reactive, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useKnowledgeStore } from '@/stores/knowledgeStore.js';
import config from '@/config.js';
import { formatTimestamp } from '@/utils/formatters.js';
import { debounce } from 'lodash-es';

// --- Store ---
const knowledgeStore = useKnowledgeStore();
const {
  filteredItems,
  isLoading,
  error,
  isAdding,
  isUploading, // Used for both add and edit file uploads
  addErrorState,
  uploadError, // Used for both add and edit file uploads
  availableCategories,
  // itemCount, // Not used in current template, can be removed if not needed
  // --- Assume these exist in your store for edit functionality ---
  isUpdating,      // e.g., ref(false) in store state
  updateErrorState // e.g., ref(null) in store state
} = storeToRefs(knowledgeStore);

// --- Local State for Adding ---
const newItemForm = reactive({
  title: '', category: '', content: '',
  tags: [], externalLink: '', linkedFile: null // This will store filename string
});
const newTagsInput = ref('');
const selectedItemFileObject = ref(null); // Actual File object for new item

// --- Local State for Editing ---
const isEditModalVisible = ref(false);
const editingItem = ref(null); // Stores the full item object being edited
const editForm = reactive({
  title: '', category: '', content: '',
  externalLink: '',
  // linkedFile is handled by editingItem.value.linkedFile and selectedEditFileObject
});
const editTagsInput = ref('');
const selectedEditFileObject = ref(null); // Actual File object for edited item
const removeCurrentFileInEdit = ref(false); // Checkbox state for removing existing file

// --- Constants ---
const FILE_DOWNLOAD_BASE_URL = 'http://localhost:8080/api/files/download'; // Ensure this is correct

// --- Methods for Adding Item ---
function handleItemFileChange(event) {
  const file = event.target.files?.[0];
  selectedItemFileObject.value = file || null;
}

async function submitNewItem() {
  if (!newItemForm.category) { alert('请选择分类！'); return; }
  if (!newItemForm.title || !newItemForm.content) { alert('请填写标题和内容！'); return; }

  const tagsArray = newTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

  const itemData = {
    title: newItemForm.title,
    category: newItemForm.category,
    content: newItemForm.content,
    tags: tagsArray,
    externalLink: newItemForm.externalLink || null,
    linkedFile: selectedItemFileObject.value?.name || null // Store filename
  };

  // Pass the actual File object for upload
  const success = await knowledgeStore.addItem(itemData, selectedItemFileObject.value);

  if (success) {
    newItemForm.title = ''; newItemForm.category = ''; newItemForm.content = '';
    newItemForm.externalLink = '';
    newTagsInput.value = '';
    selectedItemFileObject.value = null;
    const fileInput = document.getElementById('knowledge-linked-file-el');
    if (fileInput) fileInput.value = ''; // Reset file input
    alert('知识条目添加成功！');
  } else {
    alert(`添加知识条目失败: ${addErrorState.value || uploadError.value || error.value || '未知错误'}`);
  }
}

// --- Methods for Filtering/Listing ---
const filterCategory = ref('all');
const searchTerm = ref('');

function clearKnowledgeFilter() {
  filterCategory.value = 'all';
  searchTerm.value = '';
}

// --- Methods for Editing Item ---
function openEditModal(item) {
  editingItem.value = JSON.parse(JSON.stringify(item)); // Deep copy to avoid mutating original item directly

  editForm.title = editingItem.value.title;
  editForm.category = editingItem.value.category;
  editForm.content = editingItem.value.content;
  editForm.externalLink = editingItem.value.externalLink || '';
  editTagsInput.value = editingItem.value.tags ? editingItem.value.tags.join(', ') : '';

  selectedEditFileObject.value = null; // Reset file input for modal
  removeCurrentFileInEdit.value = false; // Reset checkbox
  const editFileInput = document.getElementById('edit-knowledge-linked-file-el');
  if (editFileInput) editFileInput.value = '';


  isEditModalVisible.value = true;
}

function closeEditModal() {
  isEditModalVisible.value = false;
  editingItem.value = null;
  // Optionally reset editForm fields if not implicitly handled by new openEditModal
  editForm.title = '';
  editForm.category = '';
  editForm.content = '';
  editForm.externalLink = '';
  editTagsInput.value = '';
  selectedEditFileObject.value = null;
  removeCurrentFileInEdit.value = false;
}

function handleEditItemFileChange(event) {
  const file = event.target.files?.[0];
  selectedEditFileObject.value = file || null;
  if (file) {
    removeCurrentFileInEdit.value = false; // If a new file is selected, uncheck "remove current"
  }
}

async function submitEditedItem() {
  if (!editingItem.value) return;
  if (!editForm.category) { alert('请选择分类！'); return; }
  if (!editForm.title || !editForm.content) { alert('请填写标题和内容！'); return; }

  const editedTagsArray = editTagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag);

  const updatedItemData = {
    // id: editingItem.value.id, // ID is passed as first arg to store.updateItem
    title: editForm.title,
    category: editForm.category,
    content: editForm.content,
    tags: editedTagsArray,
    externalLink: editForm.externalLink || null,
    // linkedFile name will be determined by store based on actions
  };

  // Determine the final state of linkedFile based on user actions
  let finalLinkedFileName = editingItem.value.linkedFile;
  if (selectedEditFileObject.value) { // New file uploaded
    finalLinkedFileName = selectedEditFileObject.value.name;
  } else if (removeCurrentFileInEdit.value) { // Current file marked for removal, and no new file
    finalLinkedFileName = null;
  }
  updatedItemData.linkedFile = finalLinkedFileName;

  // Pass ID, original file name (for store to manage deletion if needed), updated data, and new file object
  // The store's updateItem action should be designed to handle this:
  // async updateItem(itemId, originalLinkedFileName, dataWithTargetLinkedFileName, newFileObjectIfAny)
  // For simplicity, if your store's `updateItem` is simpler like:
  // async updateItem(itemId, dataWithTargetLinkedFileName, newFileObjectIfAny)
  // then it needs to fetch the original item itself if it needs originalLinkedFileName.
  // Let's assume a signature: updateItem(itemId, data, newFile (optional), removeOldFile (boolean, optional))
  
  // Simplified call: updateItem(itemId, dataToUpdate, newFileObject)
  // The store's updateItem would need to:
  // 1. If newFileObject exists, upload it. Its name becomes the new linkedFile.
  //    If there was an old file, the backend should handle deleting it.
  // 2. If newFileObject is null AND dataToUpdate.linkedFile is null (meaning removeCurrentFileInEdit was true),
  //    then the old file associated with itemId should be deleted by backend.
  // 3. If newFileObject is null AND dataToUpdate.linkedFile matches original, no file change.
  const success = await knowledgeStore.updateItem(
    editingItem.value.id,
    updatedItemData,
    selectedEditFileObject.value, // The new file object, if any
    removeCurrentFileInEdit.value && !selectedEditFileObject.value // Explicit instruction to remove if checked and no new file
  );

  if (success) {
    alert('知识条目更新成功！');
    closeEditModal();
    // Data will be re-fetched or updated in store, triggering reactivity
  } else {
    alert(`更新知识条目失败: ${updateErrorState.value || uploadError.value || error.value || '未知错误'}`);
    // Keep modal open for corrections
  }
}


// --- Methods for Deleting Item ---
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

// --- Utility Functions ---
// **重要警告:** 此函数不再进行 HTML 清理。如果 text 或 term 来自不可信来源，
//             直接使用 v-html 渲染结果可能导致 XSS 攻击。
//             确保您的内容来源是可信的，或者在存储前已清理。
function highlightText(text, term) {
    const textString = String(text || ''); // Ensure text is a string
    if (!term || term.trim() === '') {
        return textString; // If no search term, return original text (trusted HTML or plain text)
    }

    // Escape special characters in term for RegExp
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (!escapedTerm) return textString; 

    try {
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        // Replace matches with <mark> tag
        // Assumes textString is either plain text or safe HTML
        return textString.replace(regex, '<mark class="highlight">$1</mark>');
    } catch (e) {
        console.error("Error in highlightText:", e);
        return textString; // Return original text in case of error
    }
}

function getFileDownloadUrl(fileIdentifier) {
    if (!fileIdentifier) return '#';
    // Ensure no double slashes if fileIdentifier already starts with one
    const identifier = fileIdentifier.startsWith('/') ? fileIdentifier.substring(1) : fileIdentifier;
    return `${FILE_DOWNLOAD_BASE_URL}/${identifier}`;
}

function getFilenameFromIdentifier(fileIdentifier) {
    if (!fileIdentifier) return '';
    // Handles both / and \ path separators if they were to appear
    const lastSlashIndex = Math.max(fileIdentifier.lastIndexOf('/'), fileIdentifier.lastIndexOf('\\'));
    return lastSlashIndex >= 0 ? fileIdentifier.substring(lastSlashIndex + 1) : fileIdentifier;
}

// --- Watchers & Debounced Loading ---
const debouncedLoadItems = debounce(() => {
    knowledgeStore.loadItems(filterCategory.value, searchTerm.value);
}, 500);

watch([filterCategory, searchTerm], () => {
    debouncedLoadItems();
}, { immediate: true }); // Load items on initial component mount

// Initial load if not handled by immediate watcher or if store doesn't load by default
// if (itemCount.value === 0 && !isLoading.value) { // Be careful with itemCount here if it's not always accurate
//   knowledgeStore.loadItems(filterCategory.value, searchTerm.value);
// }

</script>

<style scoped>
/* ... (your existing styles) ... */

:root {
  /* --primary-color: #2c3e50; */
  /* --primary-dark: #1a2531; */
  /* --secondary-color: #7f8c8d; */
  --danger-color: #c0392b; 
  --info-color: #3498db;  
  /*
  --text-dark: #343A40;
  --text-light: #6C757D;
  --border-color: #DEE2E6;
  --background-light: #f8f9fa;
  --background-white: #FFFFFF;
  --shadow-light: 0 1px 3px rgba(0,0,0,0.08);
  --shadow-medium: 0 3px 8px rgba(0,0,0,0.1);
  --transition-default: all 0.25s ease-in-out;
  --border-radius-base: 6px;
  */
}


.knowledge-add-card {
  border-left: 4px solid var(--danger-color); 
}
.knowledge-list-card {
  border-left: 4px solid var(--secondary-color); 
}

.knowledge-controls { margin-bottom: 1.5rem; padding: 1rem; background-color: #f8f9fa; border-radius: 8px; display: flex; align-items: center; gap: 1.5rem; flex-wrap: wrap; border: 1px solid var(--border-color); }
.control-group { display: flex; align-items: center; gap: 0.5rem; }
.knowledge-controls label { font-weight: 500; font-size: 0.9em; color: var(--text-light); white-space: nowrap; }
.knowledge-controls select, .knowledge-controls input[type="search"] { padding: 0.4em 0.8em; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.9em; }
.knowledge-controls select { min-width: 150px; background-color: white; }
.knowledge-controls input[type="search"] { min-width: 200px; }
.knowledge-controls button { margin-left: auto; }

.form-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem 1.5rem; }
.form-group { display: flex; flex-direction: column; gap: 0.4rem; }
.form-group.full-width { grid-column: 1 / -1; }
.form-group label { font-weight: 600; font-size: 0.9em; color: var(--primary-dark); }
.form-group input[type="text"], .form-group input[type="url"], .form-group select, .form-group textarea, .form-group input[type="file"], .form-group input[type="search"] { width: 100%; padding: 0.7em 0.9em; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.95em; font-family: inherit; transition: var(--transition-default); }
.form-group input[type="file"] { padding: 0.4em; background-color: #f8f9fa; }
.form-group textarea { resize: vertical; min-height: 60px; }
.form-group input:focus, .form-group select:focus, .form-group textarea:focus, .form-group input[type="search"]:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.2); /* Assuming --primary-color is rgb(44,62,80) */
}
.form-hint { font-size: 0.8em; color: var(--text-light); font-style: italic; }
.form-actions { grid-column: 1 / -1; display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem; }
.selected-file-info { display: inline-block; margin-left: 10px; font-size: 0.85em; color: var(--text-light); font-style: italic; }


.knowledge-base-container { margin-top: 1rem; display: grid; gap: 1rem; }
.knowledge-item {
  background-color: #fff;
  border: 1px solid var(--border-color);
  border-left: 4px solid var(--danger-color); 
  border-radius: 8px;
  padding: 1rem 1.5rem;
  box-shadow: var(--shadow-light);
  transition: var(--transition-default);
  display: flex;
  flex-direction: column;
}
.knowledge-item:hover { box-shadow: var(--shadow-medium); transform: translateY(-2px); }
.knowledge-item-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; margin-bottom: 0.5rem; }
.knowledge-item-header > div:first-child { flex-grow: 1; }
.knowledge-item-header h3 {
  font-size: 1.1rem;
  margin-bottom: 0.2rem;
  color: var(--danger-color); 
  word-break: break-word;
  display: inline-block;
  margin-right: 0.5em;
}

.knowledge-item :deep(mark.highlight) {
    background-color: yellow;
    color: black;
    padding: 0.1em 0.2em;
    margin: 0 -0.2em; /* Prevents layout shift slightly */
    border-radius: 3px;
    font-weight: inherit; /* Inherit from parent, h3 or span */
}
.knowledge-item-header .category { font-size: 0.8em; font-weight: 500; color: var(--text-light); background-color: #f0f4f8; padding: 0.1em 0.5em; border-radius: 4px; white-space: nowrap; display: inline-block; vertical-align: middle; }
.knowledge-item-header .timestamp { font-size: 0.8em; color: var(--text-light); white-space: nowrap; flex-shrink: 0; }
.knowledge-item-body { font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem; flex-grow: 1; }
.knowledge-item-body .content-text { white-space: pre-wrap; word-wrap: break-word; margin-bottom: 0.8rem; }
.knowledge-item-body p { margin-bottom: 0.4rem; word-wrap: break-word; }
.knowledge-item-body strong { font-weight: 600; color: var(--primary-dark); margin-right: 0.5em; }
.external-link { color: var(--primary-color); font-size: 0.9em; word-break: break-all; text-decoration: underline; }
.external-link i { margin-right: 0.3em; background: none !important; padding: 0 !important; color: var(--primary-color); }
.file-link { font-size: 0.9em; color: var(--primary-color); display: inline-flex; align-items: center; gap: 0.3em; word-break: break-all; text-decoration: underline; cursor: pointer; }
.file-link:hover { color: var(--primary-dark); }
.file-link i { font-size: 1em; background: none !important; padding: 0 !important; color: var(--primary-color); }
.knowledge-item-tags { margin-bottom: 1rem; display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
.knowledge-item-tags strong { margin-bottom: 0; margin-right: 0.5em; }
.tag { background-color: var(--secondary-color); color: white; padding: 0.2em 0.6em; border-radius: 10px; font-size: 0.75em; font-weight: 500; cursor: default; transition: background-color var(--transition-default) ease; }

.knowledge-item-footer { margin-top: auto; padding-top: 0.5rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; align-items: center; gap: 0.5rem; }
.knowledge-item-footer .actions { display: flex; gap: 0.5rem; }


.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.placeholder-text-small, .placeholder-text { color: var(--text-light); text-align: center; padding: 2rem; font-style: italic; }
.placeholder-text-small { padding: 1rem 0; font-size: 0.9em; }


.section-header i.icon-gradient,
.section-header i
{
  background: none !important;
  -webkit-background-clip: initial !important;
  background-clip: initial !important;
  color: var(--danger-color) !important; 
  padding: 0 !important;
}

.card h2 i,
.btn i
{
  background: none !important;
  padding: 0 !important;
}


/* --- Modal Styles --- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background-color: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0,0,0,0.3);
  width: 100%;
  max-width: 700px; /* Adjust as needed */
  max-height: 90vh;
  overflow-y: auto;
  position: relative;
}

.modal-content h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: var(--primary-dark);
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.modal-content h2 i { color: var(--primary-color); } /* Or another color */


.modal-close-btn {
  position: absolute;
  top: 10px;
  right: 15px;
  font-size: 1.8rem;
  font-weight: bold;
  color: #aaa;
  background: none;
  border: none;
  cursor: pointer;
  line-height: 1;
}
.modal-close-btn:hover {
  color: #333;
}

.current-file-info {
  font-size: 0.9em;
  color: var(--text-light);
  margin-bottom: 0.5em;
  display: flex;
  align-items: center;
}
.current-file-info label {
  font-weight: normal;
  color: var(--primary-color);
}


@media (max-width: 768px) {
    .knowledge-controls { flex-direction: column; align-items: stretch; gap: 0.8rem; }
    .knowledge-controls select, .knowledge-controls input[type="search"] { width: 100%; min-width: unset; }
    .knowledge-controls button { margin-left: 0; align-self: flex-end; }
    .knowledge-item-header { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
    .knowledge-item-footer { flex-direction: column; align-items: flex-start; gap: 0.5rem; }
    .knowledge-item-footer .actions { align-self: flex-end; }

    .modal-content {
      padding: 1.5rem;
    }
    .modal-content h2 {
      font-size: 1.3rem;
    }
}
</style>