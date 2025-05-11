<!-- src/views/NotesSection.vue -->
<template>
    <div class="notes-page-container">
      <header class="section-header">
        <h1><i class="fas fa-pencil-alt icon-gradient"></i> 备考笔记</h1>
        <p>在此添加新的笔记记录，回顾过往点滴。</p>
      </header>

      <div v-if="isLoading" class="loading-indicator card">加载笔记中...</div>
      <div v-else-if="loadErrorDisplay" class="error-message card">
        加载错误: {{ loadErrorDisplay }}
      </div>

      <!-- 使用 Grid 布局 -->
      <div v-else class="notes-layout-grid">

        <!-- 左侧：添加笔记区域 -->
        <div class="card notes-card notes-creator-card">
          <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加新笔记</h2>
          <div class="notes-creator-section">
            <textarea
              id="notes-general-creator"
              class="notes-textarea editing"
              placeholder="在此处输入新的笔记内容... )"
              v-model="newNoteContent"
              rows="8"
              :disabled="isCreating"
            ></textarea>
            <div class="notes-actions creator-actions">
              <span v-if="createErrorDisplay" class="notes-status-text error-text">{{ createErrorDisplay }}</span>
              <button @click="createNewNoteHandler" class="btn btn-primary" :disabled="isCreating || !newNoteContent.trim()">
                <i class="fas fa-plus"></i> {{ isCreating ? '添加中...' : '添加笔记' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 右侧：笔记显示区域 -->
        <div class="card notes-card notes-list-card">
          <h2><i class="fas fa-list-alt icon-gradient-secondary"></i> 笔记记录</h2>
          <div class="notes-display-section">
            <div v-if="isLoading" class="loading-indicator small-indicator">加载中...</div>
            <div v-else-if="loadErrorDisplay && !isLoading" class="error-message small-error">加载列表出错</div>
            <div v-else-if="allNotesSorted.length === 0" class="placeholder-text-small">暂无笔记记录。</div>
            <ul v-else class="all-notes-list">
              <li v-for="note in allNotesSorted" :key="note.id" class="note-list-item">
                  <div class="note-content-wrapper">
                      <div class="note-list-header">
                        <span class="note-key-label">{{ getNoteKeyLabel(note.noteKey) }}</span>
                        <span class="note-list-time">{{ formatTimestamp(note.timestamp, 'yy/MM/dd HH:mm') }}</span>
                      </div>
                      <!-- 使用 v-html 渲染经过 DOMPurify 清理后的安全 HTML -->
                      <div class="note-list-content" v-html="sanitizeNoteContent(note.content || '')"></div>
                  </div>
                  <div class="note-item-actions">
                      <button @click="deleteNoteHandler(note.id)" class="btn-delete-note" title="删除笔记">
                          <i class="fas fa-times"></i>
                      </button>
                  </div>
              </li>
            </ul>
          </div>
        </div>

      </div>
    </div>
  </template>

  <script setup>
  import { ref, computed } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useNoteStore } from '@/stores/noteStore.js';
  // import sanitizeHtml from 'sanitize-html'; // <<< 保持注释或删除
  import { formatTimestamp } from '@/utils/formatters.js';
  import DOMPurify from 'dompurify'; // <<< 导入 DOMPurify

  // Store
  const noteStore = useNoteStore();
  const {
      isLoading,
      error: loadError,
      isCreating,
      createError,
      allNotesSorted,
  } = storeToRefs(noteStore);

  // Local State
  const newNoteContent = ref('');

  // Computed Properties
  const loadErrorDisplay = computed(() => typeof loadError.value === 'string' ? loadError.value : null);
  const createErrorDisplay = computed(() => typeof createError.value === 'string' ? createError.value : null);

  // Methods
  async function createNewNoteHandler() {
    if (!newNoteContent.value.trim()) { alert('笔记内容不能为空！'); return; }
    // **注意:** 这里发送给后端的是原始输入，后端也应该进行清理或验证
    const noteData = { content: newNoteContent.value, noteKey: 'general' };
    const success = await noteStore.createNote(noteData);
    if (success) {
        newNoteContent.value = '';
    } else {
        alert(`创建笔记失败: ${createError.value || '未知错误'}`);
    }
  }

  async function deleteNoteHandler(noteId) {
      if (confirm('确定要删除这条笔记吗？')) {
          const success = await noteStore.deleteNote(noteId);
          if (!success) {
               alert(`删除笔记失败: ${loadError.value || '未知错误'}`);
          }
      }
  }

  // --- 使用 DOMPurify 实现的安全 sanitizeNoteContent 函数 ---
  function sanitizeNoteContent(content) {
      if (!content) return '';
      const contentString = String(content);
      try {
          // 使用 DOMPurify 清理 HTML
          // USE_PROFILES: { html: true } 是一个预设配置，允许常见的安全 HTML 标签 (如 <b>, <i>, <p>, <br>, <ul>, <li> 等)
          // 并且会自动移除危险的属性 (如 onclick) 和标签 (如 <script>)
          // 你可以根据需要自定义配置，查阅 DOMPurify 文档了解更多选项
          const cleanHtml = DOMPurify.sanitize(contentString, { USE_PROFILES: { html: true } });

          // DOMPurify 默认会保留 <br> 标签（如果输入中有或配置允许）
          // 通常不需要再手动替换 \n 为 <br>，因为浏览器配合 CSS white-space: pre-wrap;
          // 就能很好地处理原始文本中的换行符。
          // 如果你明确只想支持 <br> 而不是字面上的换行符，可以在清理后添加替换：
          // return cleanHtml.replace(/\n/g, '<br>');
          return cleanHtml; // 直接返回清理后的安全 HTML

      } catch (e) {
          console.error('Error during DOMPurify sanitize:', e);
          // 在出错时返回经过基本转义的文本，避免潜在问题
          const div = document.createElement('div');
          div.textContent = contentString;
          return div.innerHTML + ' (内容处理出错)'; // 追加错误提示
      }
  }


  function getNoteKeyLabel(noteKey) {
      switch (noteKey) {
          case 'general': return '通用笔记';
          case 'notes-phase1': return '基础阶段';
          case 'notes-phase2': return '强化阶段';
          case 'notes-phase3': return '冲刺阶段';
          case 'notes-course': return '课程笔记';
          default: return noteKey || '笔记';
      }
  }

  </script>

  <style scoped>
  /* --- 页面和布局 --- */
  .notes-page-container {
      padding: 0;
  }

  .notes-layout-grid {
      display: grid;
      grid-template-columns: 1fr; /* 默认单列 */
      gap: 1.5rem;
  }

  @media (min-width: 992px) { /* 桌面端两列 */
      .notes-layout-grid {
          grid-template-columns: 1fr 2fr; /* 左 1/3, 右 2/3 */
      }
       .notes-list-card { grid-column: 2 / 3; grid-row: 1 / 2; }
       .notes-creator-card { grid-column: 1 / 2; grid-row: 1 / 2; align-self: start; }
  }

  /* --- 通用卡片样式 --- */
  .notes-card {
       border-left: 4px solid var(--success-color);
       display: flex;
       flex-direction: column;
  }
  .notes-card h2 {
       margin-bottom: 1rem;
       font-size: 1.2em;
       display: flex;
       align-items: center;
       gap: 0.5em;
       color: var(--primary-dark);
  }
  .notes-card h2 i {
      color: var(--secondary-color);
       background: none;
       -webkit-background-clip: unset;
       background-clip: unset;
  }


  /* --- 笔记创建区域 --- */
  .notes-creator-section {
      display: flex;
      flex-direction: column;
      flex-grow: 1;
  }
  .notes-textarea.editing {
    width: 100%;
    min-height: 150px;
    padding: 0.8rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.95em;
    line-height: 1.6;
    resize: vertical;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    background-color: #fdfdff;
    margin-bottom: 0.8rem;
  }
  .notes-textarea.editing:focus { /* 保持焦点样式 */ }
  .notes-textarea.editing:disabled { /* 保持禁用样式 */ }

  .notes-actions.creator-actions {
      margin-top: auto; /* 推到底部 */
      display: flex;
      justify-content: flex-end; /* 按钮右对齐 */
      align-items: center;
      gap: 1rem;
      min-height: 36px;
  }
  .notes-status-text { /* 状态文本 */
      font-size: 0.8em;
      font-style: italic;
      transition: color 0.3s ease, opacity 0.3s ease;
      color: var(--danger-color); /* 默认为错误颜色 */
      margin-right: auto;
  }
  .notes-status-text:empty { display: none; }


  /* --- 笔记列表区域 --- */
  .notes-list-card {
      border-left-color: var(--secondary-color); /* 不同强调色 */
  }
  .all-notes-display-section { /* 已重命名 */
      flex-grow: 1;
      display: flex;
      flex-direction: column;
  }

  /* 列表容器 */
  .all-notes-list {
      list-style: none;
      padding: 0;
      margin: 0;
      flex-grow: 1;
      overflow-y: auto;
      max-height: 60vh; /* 限制高度 */
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-top: 1rem;
  }

  .note-list-item {
      padding: 0.8rem 1.2rem;
      border-bottom: 1px solid #f0f4f8;
      position: relative;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 1rem;
  }
  .note-list-item:last-child { border-bottom: none; }
  .note-list-item:hover { background-color: #fafbff; }
  .note-list-item:hover .note-item-actions { opacity: 1; } /* 悬停显示删除 */

  .note-content-wrapper { flex-grow: 1; }

  .note-list-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.4rem;
      flex-wrap: wrap;
      gap: 0.5em;
  }
  .note-key-label {
      font-weight: 600;
      font-size: 0.8em;
      color: var(--primary-dark);
      background-color: #e9eff8;
      padding: 0.1em 0.5em;
      border-radius: 4px;
      white-space: nowrap;
  }
  .note-list-time {
      font-size: 0.75em;
      color: var(--text-light);
      white-space: nowrap;
      flex-shrink: 0;
  }

  .note-list-content {
      color: var(--text-color);
      font-size: 0.95em;
      line-height: 1.6;
      white-space: pre-wrap; /* 保留换行和空格 */
      word-wrap: break-word; /* 自动换行 */
      padding-right: 20px; /* 避免与删除按钮重叠 */
  }
  /* 不再需要样式化 <br>，由内容本身决定 */
  /* .note-list-content :deep(br) { ... } */

  /* 删除按钮 */
  .note-item-actions {
      opacity: 0; /* 默认隐藏 */
      transition: opacity 0.2s ease-in-out;
      flex-shrink: 0;
      margin-left: 0.5rem;
      padding-top: 0.1rem;
  }
  .btn-delete-note {
      background: none;
      border: none;
      color: var(--danger-color);
      cursor: pointer;
      padding: 0.2em;
      font-size: 0.9em;
      line-height: 1;
      opacity: 0.6;
  }
  .btn-delete-note:hover {
      opacity: 1;
      /* color: darken(var(--danger-color), 10%); // SASS 函数，原生 CSS 无法直接使用 */
      filter: brightness(0.8); /* 简单变暗效果 */
  }


  /* --- 通用样式 --- */
  .notes-divider { border: none; border-top: 1px solid var(--border-color); margin: 2rem 0; }
  .placeholder-text-small { color: var(--text-light); font-style: italic; font-size: 0.9em; padding: 1rem 0; text-align: center; }
  .loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
  .error-message { color: var(--danger-color); }
  .error-message.small { font-size: 0.8em; margin-top: 0.5rem; text-align: right; width: 100%; }


  /* 头部图标 */
  .section-header i.icon-gradient { background: var(--gradient-secondary); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 1.5em; }

  /* 响应式调整 */
  @media (max-width: 991px) { /* 中等屏幕及以下 */
      .notes-layout-grid {
          grid-template-columns: 1fr; /* 堆叠 */
      }
      .notes-list-card, .notes-creator-card { /* 重置网格定位 */
           grid-column: auto;
           grid-row: auto;
       }
  }
  </style>