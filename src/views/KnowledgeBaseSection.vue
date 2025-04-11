<!-- src/views/KnowledgeBaseSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-brain icon-gradient"></i> 知识库</h1>
      <p>整理和查阅你的常识、素材和理论。</p>
    </header>
    <div class="card knowledge-add-card">
       <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加知识条目</h2>
       <form @submit.prevent="submitNewKnowledge" class="form-grid">
            <div class="form-group">
              <label for="knowledge-title-kb">标题:</label>
              <input v-model.trim="newKnowledgeForm.title" type="text" id="knowledge-title-kb" required placeholder="知识点或素材的标题">
            </div>
            <div class="form-group">
              <label for="knowledge-category-kb">分类:</label>
              <select v-model="newKnowledgeForm.category" id="knowledge-category-kb" required>
                <option value="" disabled>--选择分类--</option>
                <option v-for="cat in config.knowledgeBaseCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group full-width">
              <label for="knowledge-content-kb">内容:</label>
              <textarea v-model="newKnowledgeForm.content" id="knowledge-content-kb" rows="5" required placeholder="详细内容、要点、笔记..."></textarea>
            </div>
            <div class="form-group">
              <label for="knowledge-tags-kb">标签 (逗号分隔):</label>
              <input v-model.trim="newKnowledgeForm.tags" type="text" id="knowledge-tags-kb" placeholder="如: 十四五规划, 乡村振兴, 面试可用">
            </div>
            <div class="form-group">
              <label for="knowledge-external-link-kb">外部链接 (可选):</label>
              <input v-model.trim="newKnowledgeForm.externalLink" type="url" id="knowledge-external-link-kb" placeholder="https://example.com">
            </div>
            <div class="form-group">
              <label for="knowledge-linked-file-kb">关联文件 (可选):</label>
              <input type="file" id="knowledge-linked-file-kb" @change="handleFileChange">
              <span class="form-hint">仅保存文件名</span>
            </div>
            <div class="form-group form-actions">
              <button type="submit" class="btn btn-primary"><i class="fas fa-save"></i> 添加条目</button>
            </div>
       </form>
    </div>
    <div class="card knowledge-list-card">
       <h2><i class="fas fa-book-open icon-gradient-secondary"></i> 知识列表</h2>
       <div class="knowledge-controls filter-controls">
            <div class="control-group">
              <label for="knowledge-filter-category-kb">按分类筛选:</label>
              <select v-model="filterCategory" id="knowledge-filter-category-kb">
                <option value="all">所有分类</option>
                <!-- 使用 store 的 getter -->
                <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="control-group">
              <label for="knowledge-search-term-kb">搜索:</label>
              <input v-model.lazy="searchTerm" type="search" id="knowledge-search-term-kb" placeholder="搜索标题、内容、标签...">
            </div>
            <button @click="clearFilters" class="btn btn-secondary btn-small"><i class="fas fa-times"></i> 清除</button>
       </div>
       <div id="knowledge-base-list-kb" class="knowledge-base-container">
            <p class="placeholder-text" v-if="filteredItems.length === 0">
               {{ filterCategory === 'all' && !searchTerm ? '知识库为空，开始添加你的积累吧！' : '没有找到匹配的知识条目。' }}
            </p>
            <div v-else>
               <!-- 遍历计算属性 filteredItems -->
               <div class="knowledge-item" v-for="item in filteredItems" :key="item.id" :data-id="item.id">
                   <div class="knowledge-item-header">
                     <div>
                       <h3><i class="fas fa-lightbulb icon-gradient-info"></i> <span v-html="highlight(item.title, searchTerm)"></span></h3>
                       <span class="category">{{ item.category }}</span>
                     </div>
                   </div>
                   <div class="knowledge-item-body">
                        <!-- ... 省略 body 内容，和之前一样绑定 item 属性 ... -->
                        <div class="content-text" v-html="highlight(item.content, searchTerm)"></div>
                       <p v-if="item.externalLink">
                         <strong>链接:</strong> <a :href="item.externalLink" target="_blank" class="external-link"><i class="fas fa-external-link-alt"></i> {{ item.externalLink }}</a>
                       </p>
                       <p v-if="item.linkedFile">
                         <strong>文件:</strong> <span class="file-link"><i class="fas fa-paperclip"></i> {{ item.linkedFile }}</span>
                       </p>
                   </div>
                   <div class="knowledge-item-tags" v-if="item.tags && item.tags.length > 0">
                     <strong>标签:</strong>
                     <span class="tag" v-for="(tag, index) in item.tags" :key="index" v-html="highlight(tag, searchTerm)"></span>
                   </div>
                   <div class="knowledge-item-footer">
                     <span class="timestamp">添加于: {{ formatTimestamp(item.timestamp) }}</span>
                     <div class="actions">
                        <!-- 调用 store action -->
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
import { ref, reactive, computed, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useKnowledgeBaseStore } from '@/stores/knowledgeBaseStore.js'; // 1. 导入 Store
import config from '@/config.js';
import { formatTimestamp } from '@/utils/formatters.js';
import { highlightText as highlight } from '@/utils/helpers.js'; // 导入工具函数

const knowledgeBaseStore = useKnowledgeBaseStore(); // 2. 获取实例

// 3. 获取响应式 state 和 getters
const { items, availableCategories, itemCount } = storeToRefs(knowledgeBaseStore);

// 本地状态
const filterCategory = ref('all');
const searchTerm = ref('');
const newKnowledgeForm = reactive({ // 添加表单
  title: '',
  category: '',
  content: '',
  tags: '', // 逗号分隔字符串
  externalLink: '',
  linkedFile: null, // 文件名
});
let selectedFileObject = null;

// 计算属性：过滤后的列表
const filteredItems = computed(() => {
  const term = searchTerm.value.trim().toLowerCase();
  return items.value.filter(item => {
    const categoryMatch = filterCategory.value === 'all' || item.category === filterCategory.value;
    if (!categoryMatch) return false;
    if (!term) return true;
    const titleMatch = item.title.toLowerCase().includes(term);
    const contentMatch = item.content.toLowerCase().includes(term);
    const tagsMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(term));
    return titleMatch || contentMatch || tagsMatch;
  });
});

// --- 方法 ---
function handleFileChange(event) {
    const file = event.target.files?.[0];
    newKnowledgeForm.linkedFile = file ? file.name : null;
    selectedFileObject = file;
}

function submitNewKnowledge() {
    if (!newKnowledgeForm.title || !newKnowledgeForm.content || !newKnowledgeForm.category) {
        alert('请选择分类并填写标题和内容！');
        return;
    }
    // 调用 store action
    knowledgeBaseStore.addItem({ ...newKnowledgeForm }); // 传递表单数据副本

    // 清空表单
    newKnowledgeForm.title = '';
    newKnowledgeForm.category = '';
    newKnowledgeForm.content = '';
    newKnowledgeForm.tags = '';
    newKnowledgeForm.externalLink = '';
    newKnowledgeForm.linkedFile = null;
    selectedFileObject = null;
    const fileInput = document.getElementById('knowledge-linked-file-kb');
    if (fileInput) fileInput.value = '';

    alert('知识条目添加成功！');
}

function clearFilters() {
  filterCategory.value = 'all';
  searchTerm.value = '';
}

function deleteItemHandler(itemId) {
  if (confirm('确定要删除这条知识库条目吗？此操作无法撤销。')) {
    knowledgeBaseStore.deleteItem(itemId);
  }
}

// onMounted 不再需要手动加载，Store 已处理
</script>
  
  <style scoped>
  /* --- Knowledge Base Specific Styles --- */
  .knowledge-add-card { /* 第一个卡片 */
       border-left: 4px solid var(--info-color);
  }
  .knowledge-list-card { /* 第二个卡片 */
       border-left: 4px solid var(--secondary-color);
  }
  
  /* 搜索/过滤控件样式 (如果未全局定义 .filter-controls) */
  .knowledge-controls { /* 继承或定义 .filter-controls 样式 */
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
  .knowledge-controls .control-group { /* 继承或定义 .control-group 样式 */
      display: flex;
      align-items: center;
      gap: 0.5rem;
  }
  .knowledge-controls label {
       font-weight: 500;
       font-size: 0.9em;
       color: var(--text-light);
       white-space: nowrap;
  }
  .knowledge-controls select,
  .knowledge-controls input[type="search"] {
      /* 继承或定义表单控件样式 */
      padding: 0.4em 0.8em;
      border-radius: 6px;
      border: 1px solid var(--border-color);
      font-size: 0.9em;
      /* background-color: white; */ /* 假设全局 */
  }
  .knowledge-controls select { min-width: 150px; }
  .knowledge-controls input[type="search"] { min-width: 200px; }
  .knowledge-controls button { margin-left: auto; }
  
  
  .knowledge-base-container {
      margin-top: 1rem;
      display: grid;
      gap: 1rem;
  }
  
  .knowledge-item {
      background-color: #fff;
      border: 1px solid var(--border-color);
      border-left: 4px solid var(--info-color); /* 特定边框 */
      border-radius: 8px;
      padding: 1rem 1.5rem;
      box-shadow: var(--shadow-light);
      transition: var(--transition-default);
      display: flex;
      flex-direction: column; /* 让 footer 能固定在底部 */
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
      margin-bottom: 0.5rem; /* 减少底部间距 */
  }
  .knowledge-item-header > div:first-child { /* 标题和分类的容器 */
       flex-grow: 1; /* 允许它占据空间 */
  }
  .knowledge-item-header h3 {
      font-size: 1.1rem;
      margin-bottom: 0.2rem;
      color: var(--info-color);
      word-break: break-word; /* 长标题换行 */
      display: inline-block; /* 防止占满整行 */
      margin-right: 0.5em; /* 与分类的间距 */
  }
  .knowledge-item-header .category {
      font-size: 0.8em;
      font-weight: 500;
      color: var(--text-light);
      background-color: #f0f4f8; /* 背景色 */
      padding: 0.1em 0.5em;
      border-radius: 4px;
      white-space: nowrap;
      display: inline-block;
      vertical-align: middle; /* 与标题垂直对齐 */
  }
  
  .knowledge-item-body {
      font-size: 0.95rem;
      line-height: 1.6;
      margin-bottom: 1rem;
      flex-grow: 1; /* 占据剩余空间，将 footer 推到底部 */
      word-wrap: break-word; /* 内容自动换行 */
  }
  .knowledge-item-body .content-text {
      white-space: pre-wrap; /* 保留空白符并换行 */
      margin-bottom: 0.8rem;
  }
  .knowledge-item-body p {
       margin-bottom: 0.4rem;
  }
  .knowledge-item-body strong {
      font-weight: 600;
      color: var(--primary-dark);
      margin-right: 0.5em;
  }
  .knowledge-item-body .external-link {
      color: var(--primary-color);
      font-size: 0.9em;
      word-break: break-all; /* 长链接换行 */
  }
  .knowledge-item-body .external-link i { margin-right: 0.3em; }
  .knowledge-item-body .file-link { /* 样式与 Error Log 中的 .image-link 类似 */
       font-size: 0.85em;
       color: var(--secondary-color);
       margin-left: 0.5em;
       display: inline-block;
       word-break: break-all;
  }
  .knowledge-item-body .file-link i { margin-right: 0.3em; }
  
  .knowledge-item-tags {
      margin-bottom: 1rem;
      display: flex;
      flex-wrap: wrap; /* 标签换行 */
      gap: 0.5rem;
      align-items: center;
  }
  .knowledge-item-tags strong { margin-bottom: 0; margin-right: 0.5em; } /* 移除标签标题的底部边距 */
  
  .tag {
      background-color: var(--secondary-color);
      color: white;
      padding: 0.2em 0.6em;
      border-radius: 10px;
      font-size: 0.75em;
      font-weight: 500;
      cursor: default;
      transition: background-color var(--transition-speed) ease;
  }
  /* .tag:hover { background-color: var(--primary-dark); } */ /* 如果需要 hover 效果 */
  /* 高亮样式，阶段四用 v-html 或其他方式实现 */
  .tag mark { background-color: yellow; color: black; }
  
  .knowledge-item-footer {
      margin-top: auto; /* 将 footer 推到 flex 容器底部 */
      padding-top: 0.5rem;
      border-top: 1px solid var(--border-color);
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem;
  }
  .knowledge-item-footer .timestamp {
       font-size: 0.8em;
       color: var(--text-light);
  }
  .knowledge-item-footer .actions {
      display: flex;
      gap: 0.5rem;
  }
  /* 按钮样式是全局的 */
  
  /* --- Knowledge Base Specific Responsive --- */
  @media (max-width: 768px) {
      .knowledge-controls { /* 堆叠控件 */
          flex-direction: column;
          align-items: stretch;
          gap: 0.8rem;
      }
      .knowledge-controls select,
      .knowledge-controls input[type="search"] {
          width: 100%;
          min-width: unset;
      }
       .knowledge-controls button {
          margin-left: 0;
          align-self: flex-end;
      }
       .knowledge-item-header { /* 堆叠标题和分类 */
          flex-direction: column;
          align-items: flex-start;
          gap: 0.3rem;
      }
      .knowledge-item-header .category { margin-left: 0; } /* 移除左边距 */
  
       .knowledge-item-footer { /* 堆叠底部元素 */
          flex-direction: column;
          align-items: flex-start;
          gap: 0.8rem;
      }
      .knowledge-item-footer .actions { align-self: flex-end; } /* 按钮靠右 */
  }
  </style>