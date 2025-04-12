<!-- src/views/KnowledgeBaseSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-brain icon-gradient"></i> 知识库</h1>
      <p>整理和查阅你的常识、素材和理论。</p>
    </header>

    <!-- 添加知识条目卡片 -->
    <div class="card knowledge-add-card"> <!-- Changed class name slightly -->
      <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加知识条目</h2>
      <!-- 绑定提交事件 -->
      <form @submit.prevent="submitNewItem" class="form-grid">
        <div class="form-group">
          <label for="knowledge-title-el">标题:</label>
          <input v-model.trim="newItemForm.title" type="text" id="knowledge-title-el" required placeholder="知识点或素材的标题">
        </div>
        <div class="form-group">
          <label for="knowledge-category-el">分类:</label>
           <!-- 使用 config 中的固定分类 -->
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
           <!-- 标签输入 -->
          <input v-model.trim="newTagsInput" type="text" id="knowledge-tags-el" placeholder="如: 十四五规划, 乡村振兴, 面试可用">
        </div>
        <div class="form-group">
          <label for="knowledge-external-link-el">外部链接 (可选):</label>
          <input v-model.trim="newItemForm.externalLink" type="url" id="knowledge-external-link-el" placeholder="https://example.com">
        </div>
        <div class="form-group">
          <label for="knowledge-linked-file-el">关联文件 (可选):</label>
           <!-- 文件选择 -->
          <input type="file" id="knowledge-linked-file-el" @change="handleItemFileChange">
          <span class="form-hint">仅保存文件名</span>
        </div>
        <div class="form-group form-actions">
          <button type="submit" class="btn btn-primary" :disabled="isLoading">
             <i class="fas fa-save"></i> {{ isLoading ? '添加中...' : '添加条目' }}
          </button>
        </div>
      </form>
       <!-- 显示添加时的错误信息 -->
       <p v-if="addError" class="error-message" style="color: red; margin-top: 0.5em;">{{ addError }}</p>
    </div>

    <!-- 知识列表卡片 -->
    <div class="card knowledge-list-card"> <!-- Changed class name slightly -->
      <h2><i class="fas fa-book-open icon-gradient-secondary"></i> 知识列表</h2>
       <!-- 筛选和搜索控件 -->
      <div class="knowledge-controls filter-controls">
        <div class="control-group">
          <label for="knowledge-filter-category-el">按分类筛选:</label>
           <!-- 绑定筛选分类 -->
          <select v-model="filterCategory" id="knowledge-filter-category-el">
             <!-- 动态生成选项 -->
            <option v-for="catOption in availableCategories" :key="catOption" :value="catOption">
              {{ catOption === 'all' ? '所有分类' : catOption }}
            </option>
          </select>
        </div>
        <div class="control-group">
          <label for="knowledge-search-term-el">搜索:</label>
           <!-- 绑定搜索词，使用 .lazy 或 debounce 优化 -->
          <input v-model.lazy="searchTerm" type="search" id="knowledge-search-term-el" placeholder="搜索标题、内容、标签...">
        </div>
         <!-- 清除按钮 -->
        <button @click="clearKnowledgeFilter" class="btn btn-secondary btn-small"><i class="fas fa-times"></i> 清除</button>
      </div>

       <!-- 列表容器 -->
      <div id="knowledge-base-list-el" class="knowledge-base-container">
        <div v-if="isLoading" class="loading-indicator">加载中...</div>
        <div v-else-if="error" class="error-message">错误: {{ error }}</div>
        <div v-else-if="filteredItems.length === 0" class="placeholder-text">
             {{ filterCategory === 'all' && !searchTerm ? '知识库为空，开始添加你的积累吧！' : '没有找到匹配的知识条目。' }}
        </div>
        <div v-else>
           <!-- 遍历 store getter -->
          <div class="knowledge-item" v-for="item in filteredItems" :key="item.id" :data-id="item.id">
            <div class="knowledge-item-header">
               <!-- 标题和分类 -->
               <div>
                 <!-- 使用 v-html 可能有风险，如果需要高亮，最好用组件或更安全的方式 -->
                 <!-- <h3><i class="fas fa-lightbulb icon-gradient-info"></i>{{ item.title }}</h3> -->
                  <h3 v-html="highlightText(item.title, searchTerm)"></h3>
                 <span class="category">{{ item.category }}</span>
               </div>
               <!-- 时间戳 -->
               <span class="timestamp">添加于: {{ formatTimestamp(item.timestamp) }}</span>
            </div>
            <div class="knowledge-item-body">
               <!-- 内容 -->
               <!-- <div class="content-text">{{ item.content }}</div> -->
                <div class="content-text" v-html="highlightText(item.content, searchTerm)"></div>
               <!-- 链接和文件 -->
              <p v-if="item.externalLink"><strong>链接:</strong> <a :href="item.externalLink" target="_blank" class="external-link"><i class="fas fa-external-link-alt"></i> {{ item.externalLink }}</a></p>
              <p v-if="item.linkedFile"><strong>文件:</strong> <span class="file-link"><i class="fas fa-paperclip"></i> {{ item.linkedFile }}</span></p>
            </div>
             <!-- 标签 -->
            <div v-if="item.tags && item.tags.length > 0" class="knowledge-item-tags">
              <strong>标签:</strong>
              <!-- <span v-for="tag in item.tags" :key="tag" class="tag">{{ tag }}</span> -->
               <span v-for="tag in item.tags" :key="tag" class="tag" v-html="highlightText(tag, searchTerm)"></span>
            </div>
            <div class="knowledge-item-footer">
               <!-- 删除按钮 -->
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
import config from '@/config.js'; // 需要导入 config 获取固定分类列表
import { formatTimestamp } from '@/utils/formatters.js'; // 导入时间格式化函数
import sanitizeHtml from 'sanitize-html'; // 需要 npm install sanitize-html
import { debounce } from 'lodash-es'; // 需要 npm install lodash-es

// --- Store ---
const knowledgeStore = useKnowledgeStore();
// 使用 storeToRefs 获取响应式状态和 getters
const {
  filteredItems, // 直接使用 store 的列表 (目前等于 items)
  isLoading,
  error,
  availableCategories, // 动态分类选项
  itemCount
} = storeToRefs(knowledgeStore);

// --- 本地状态 ---
const filterCategory = ref('all'); // 筛选分类
const searchTerm = ref('');      // 搜索关键词
const addError = ref(null);      // 用于显示添加表单的错误信息

const newItemForm = reactive({ // 添加表单
  title: '',
  category: '', // 默认空，让用户选择
  content: '',
  tags: [], // 存储为数组
  externalLink: '',
  linkedFile: null, // 存储文件名
});
const newTagsInput = ref(''); // 用于 v-model 绑定标签输入框
let selectedItemFileObject = null; // 存储文件对象

// --- 方法 ---

// 处理文件选择
function handleItemFileChange(event) {
  const file = event.target.files?.[0];
  if (file) {
    newItemForm.linkedFile = file.name;
    selectedItemFileObject = file;
  } else {
    newItemForm.linkedFile = null;
    selectedItemFileObject = null;
  }
}

// 提交新条目
async function submitNewItem() {
  addError.value = null; // 清除旧的添加错误
  // 将逗号分隔的标签字符串转换为数组
  const tagsArray = newTagsInput.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag !== ''); // 过滤掉空标签

  const itemData = {
    ...newItemForm,
    tags: tagsArray, // 使用处理后的数组
  };

  const success = await knowledgeStore.addItem(itemData);

  if (success) {
    // 清空表单
    newItemForm.title = '';
    newItemForm.category = '';
    newItemForm.content = '';
    newItemForm.tags = [];
    newItemForm.externalLink = '';
    newItemForm.linkedFile = null;
    newTagsInput.value = ''; // 清空标签输入框
    selectedItemFileObject = null;
    const fileInput = document.getElementById('knowledge-linked-file-el');
    if (fileInput) fileInput.value = '';

    alert('知识条目添加成功！');
     // 可以在添加成功后清除筛选，回到全部列表
     // clearKnowledgeFilter();
  } else {
      // 如果 store action 返回 false 或设置了 error ref
      addError.value = knowledgeStore.error || '添加失败，请检查输入。';
      // 不清空表单，让用户修改
  }
}

// 清除筛选和搜索
function clearKnowledgeFilter() {
  filterCategory.value = 'all';
  searchTerm.value = '';
  // loadItems 会被 watch 触发
}

// 删除条目
async function deleteItemHandler(itemId) {
  if (confirm('确定要删除这条知识库条目吗？此操作无法撤销。')) {
    await knowledgeStore.deleteItem(itemId);
     if (knowledgeStore.error) {
         alert(`删除失败: ${knowledgeStore.error}`);
     }
     // 可选：成功提示
  }
}

// 简单的文本高亮函数 (注意潜在的 XSS 风险，如果内容不可信)
// 使用 sanitize-html 库来增加安全性
function highlightText(text, term) {
    if (!term || !text) {
        // 先对原始文本进行清理，防止 v-html 渲染恶意内容
        return sanitizeHtml(text || '', { allowedTags: [], allowedAttributes: {} });
    }
    const safeText = sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} });
    const safeTerm = sanitizeHtml(term, { allowedTags: [], allowedAttributes: {} });
    if (!safeTerm) return safeText;
    try {
        // 使用正则表达式进行不区分大小写替换，并添加 <mark> 标签
        const escapedTerm = safeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // 转义正则特殊字符
        const regex = new RegExp(`(${escapedTerm})`, 'gi');
        return safeText.replace(regex, '<mark>$1</mark>');
    } catch (e) {
        console.error("Error highlighting text:", e);
        return safeText; // 出错时返回清理后的原始文本
    }
}


// --- 侦听器 ---
// 使用 debounce 优化搜索，避免输入时频繁请求 API
const debouncedLoadItems = debounce(() => {
    knowledgeStore.loadItems(filterCategory.value, searchTerm.value);
}, 500); // 延迟 500ms 执行

// 侦听筛选条件和搜索词的变化
watch([filterCategory, searchTerm], () => {
    debouncedLoadItems(); // 调用防抖函数
});

// --- 生命周期钩子 ---
// onMounted(() => {
//   console.log('KnowledgeBaseSection mounted');
//   // 初始加载已在 store 中完成
// });

// 导出 config (模板中用到) 和 formatTimestamp
//export { config, formatTimestamp };

</script>

<style scoped>
/* --- Knowledge Base Specific Styles --- */
/* Card accent borders */
.knowledge-add-card {
     border-left: 4px solid var(--info-color);
}
.knowledge-list-card {
     border-left: 4px solid var(--secondary-color);
}

/* Container for the list */
.knowledge-base-container {
    margin-top: 1rem;
    display: grid; /* Grid layout for items */
    gap: 1rem;
}

/* Individual knowledge item */
.knowledge-item {
    background-color: #fff;
    border: 1px solid var(--border-color);
    border-left: 4px solid var(--info-color); /* Item accent */
    border-radius: 8px;
    padding: 1rem 1.5rem;
    box-shadow: var(--shadow-light);
    transition: var(--transition-default);
    display: flex;
    flex-direction: column; /* Arrange content vertically */
}
.knowledge-item:hover {
     box-shadow: var(--shadow-medium);
     transform: translateY(-2px);
}

.knowledge-item-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 0.5rem;
    /* Optional: add border bottom */
    /* border-bottom: 1px dashed var(--border-color); */
    /* padding-bottom: 0.5rem; */
}
/* Wrapper for title and category */
.knowledge-item-header > div:first-child {
     flex-grow: 1;
}
.knowledge-item-header h3 {
    font-size: 1.1rem;
    margin-bottom: 0.2rem;
    color: var(--info-color);
    word-break: break-word;
    display: inline-block; /* Keep title and category together */
    margin-right: 0.5em;
}
/* Style for highlighted text within h3 */
.knowledge-item-header h3 :deep(mark) {
    background-color: yellow; /* Or your preferred highlight color */
    padding: 0; /* Reset padding */
    color: inherit; /* Inherit color */
}
.knowledge-item-header .category {
    font-size: 0.8em;
    font-weight: 500;
    color: var(--text-light);
    background-color: #f0f4f8;
    padding: 0.1em 0.5em;
    border-radius: 4px;
    white-space: nowrap;
    display: inline-block;
    vertical-align: middle; /* Align with title */
}
.knowledge-item-header .timestamp {
     font-size: 0.8em;
     color: var(--text-light);
     white-space: nowrap;
     flex-shrink: 0; /* Prevent timestamp shrinking */
}


.knowledge-item-body {
    font-size: 0.95rem;
    line-height: 1.6;
    margin-bottom: 1rem;
    flex-grow: 1; /* Allow body to take space */
}
.knowledge-item-body .content-text {
    white-space: pre-wrap; /* Preserve whitespace */
    word-wrap: break-word;
    margin-bottom: 0.8rem;
}
/* Style for highlighted text in content */
.knowledge-item-body .content-text :deep(mark) {
     background-color: yellow;
     padding: 0;
     color: inherit;
}

.knowledge-item-body p {
     margin-bottom: 0.4rem;
     word-wrap: break-word;
}
.knowledge-item-body strong {
    font-weight: 600;
    color: var(--primary-dark);
    margin-right: 0.5em;
}
.knowledge-item-body .external-link {
    color: var(--primary-color);
    font-size: 0.9em;
    word-break: break-all; /* Break long URLs */
}
.knowledge-item-body .external-link i { margin-right: 0.3em; }
.file-link { /* Style for file link span */
     font-size: 0.85em;
     color: var(--secondary-color);
     margin-left: 0.5em;
     display: inline-block;
     word-break: break-all;
}
.file-link i { margin-right: 0.3em; }


.knowledge-item-tags {
    margin-bottom: 1rem; /* Space below tags */
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}
.knowledge-item-tags strong { margin-bottom: 0; } /* Remove default margin */

.knowledge-item-tags .tag {
    background-color: var(--secondary-color);
    color: white;
    padding: 0.2em 0.6em;
    border-radius: 10px;
    font-size: 0.75em;
    font-weight: 500;
    cursor: default;
    transition: background-color var(--transition-speed) ease;
}
/* Style for highlighted text in tags */
.knowledge-item-tags .tag :deep(mark) {
     background-color: navy; /* Different highlight for contrast */
     color: yellow;
     padding: 0;
     border-radius: 2px; /* Optional rounded corners for mark */
}

.knowledge-item-footer {
    margin-top: auto; /* Push footer to bottom */
    padding-top: 0.5rem;
    border-top: 1px solid var(--border-color);
    display: flex;
    justify-content: flex-end; /* Align actions to the right */
    align-items: center;
    gap: 0.5rem;
}
.knowledge-item-footer .actions {
    display: flex;
    gap: 0.5rem;
}
/* Use global button styles */


/* Placeholder and Loading/Error styles */
.loading-indicator, .error-message {
    text-align: center;
    padding: 1rem;
    color: var(--text-light);
}
.error-message {
    color: var(--danger-color);
}
.placeholder-text {
    /* Styles should be global or defined here */
    color: var(--text-light);
    text-align: center;
    padding: 2rem;
    font-style: italic;
}


/* Reuse form-grid, form-group etc. from global or define here */

/* Responsive adjustments if needed */
@media (max-width: 768px) {
    .knowledge-item-header {
        flex-direction: column; /* Stack header items */
        align-items: flex-start;
        gap: 0.3rem;
    }
    .knowledge-item-header .timestamp { /* Adjust timestamp position */
         /* align-self: flex-end; Optional: move time right */
    }
     .knowledge-item-footer {
        flex-direction: column;
        align-items: flex-start;
        gap: 0.5rem;
    }
    .knowledge-item-footer .actions {
        align-self: flex-end; /* Move actions right in column */
    }
     /* Stack filter controls */
     .filter-controls {
        flex-direction: column;
        align-items: stretch;
        gap: 0.8rem;
    }
    .filter-controls select,
    .filter-controls input[type="search"] {
        width: 100%;
        min-width: unset;
    }
    .filter-controls button {
        margin-left: 0;
        align-self: flex-end;
    }
}
</style>