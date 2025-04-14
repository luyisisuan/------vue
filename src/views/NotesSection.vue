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
  
      <!-- **MODIFIED:** 使用 Grid 布局 -->
      <div v-else class="notes-layout-grid">
  
        <!-- 左侧：添加笔记区域 -->
        <div class="card notes-card notes-creator-card"> 
          <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加新笔记</h2>
          <div class="notes-creator-section">
            <textarea
              id="notes-general-creator"
              class="notes-textarea editing"
              placeholder="在此处输入新的笔记内容..."
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
                      <div class="note-list-content" v-html="sanitizeNoteContent(note.content || '')"></div>
                  </div>
                   <!-- **MODIFIED:** 删除按钮样式和位置 -->
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
  import { ref, computed, watch, onMounted } from 'vue';
  import { storeToRefs } from 'pinia';
  import { useNoteStore } from '@/stores/noteStore.js';
  import sanitizeHtml from 'sanitize-html';
  import { formatTimestamp } from '@/utils/formatters.js';
  
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
    const noteData = { content: newNoteContent.value, noteKey: 'general' };
    const success = await noteStore.createNote(noteData);
    if (success) {
        newNoteContent.value = '';
        // alert("笔记添加成功！"); // 可以用更柔和的提示代替 alert
    } else {
        alert(`创建笔记失败: ${createError.value || '未知错误'}`);
    }
  }
  
  async function deleteNoteHandler(noteId) {
      if (confirm('确定要删除这条笔记吗？')) {
          const success = await noteStore.deleteNote(noteId);
          if (!success) {
               alert(`删除笔记失败: ${loadError.value || '未知错误'}`); // 使用 loadError，因为 delete action 可能更新它
          }
           // 成功后列表会自动刷新，无需 alert
      }
  }
  
  function sanitizeNoteContent(content) {
      if (!content) return '';
      const contentString = String(content);
      try {
          const cleanHtml = sanitizeHtml(contentString, { allowedTags: [], allowedAttributes: {}, allowComments: false });
          return cleanHtml.replace(/\n/g, '<br>');
      } catch (e) {
          console.error('Error during sanitizeHtml:', e);
          return '内容处理出错';
      }
  }
  
  function getNoteKeyLabel(noteKey) {
      switch (noteKey) {
          case 'general': return '通用笔记';
          case 'notes-phase1': return '基础阶段'; // 简化标签
          case 'notes-phase2': return '强化阶段';
          case 'notes-phase3': return '冲刺阶段';
          case 'notes-course': return '课程笔记';
          default: return noteKey || '笔记';
      }
  }
  
  // Lifecycle Hooks (可以移除，因为 Store 会自动加载)
  // onMounted(() => { console.log('NotesSection mounted.'); });
  
  </script>
  
  <style scoped>
  /* --- Page & Layout --- */
  .notes-page-container {
      padding: 0; /* Assuming main layout handles padding */
  }
  
  .notes-layout-grid {
      display: grid;
      /* 在大屏幕上两列，左侧窄，右侧宽 */
      grid-template-columns: 1fr; /* 默认单列 */
      gap: 1.5rem;
  }
  
  @media (min-width: 992px) { /* 桌面端应用两列布局 */
      .notes-layout-grid {
          grid-template-columns: 1fr 2fr; /* 左 1/3, 右 2/3 */
      }
       .notes-list-card {
           grid-column: 2 / 3; /* 列表在右侧 */
           grid-row: 1 / 2; /* 占据第一行 */
       }
       .notes-creator-card {
           grid-column: 1 / 2; /* 添加在左侧 */
           grid-row: 1 / 2;
           /* 让添加卡片在垂直方向上对齐列表卡片顶部 (如果需要) */
           align-self: start;
       }
  }
  
  /* --- General Card Styling (Assume global .card exists) --- */
  .notes-card {
       border-left: 4px solid var(--success-color); /* 主题色 */
       display: flex; /* Enable flex for internal alignment */
       flex-direction: column; /* Stack content vertically */
  }
  .notes-card h2 {
       margin-bottom: 1rem; /* Space below title */
       font-size: 1.2em; /* Slightly larger title */
       display: flex;
       align-items: center;
       gap: 0.5em;
       color: var(--primary-dark);
  }
  .notes-card h2 i { /* Style title icon */
      color: var(--secondary-color); /* Example color */
       background: none; /* Remove potential gradient */
       -webkit-background-clip: unset;
       background-clip: unset;
  }
  
  
  /* --- Note Creator Section --- */
  .notes-creator-section {
      display: flex;
      flex-direction: column; /* Stack label, textarea, actions */
      flex-grow: 1; /* Allow creator card to grow if needed */
  }
  .notes-label { /* Keep style from before */ }
  .notes-textarea.editing {
    width: 100%;
    min-height: 150px; /* Adjust height as needed */
    padding: 0.8rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-family: inherit;
    font-size: 0.95em;
    line-height: 1.6;
    resize: vertical;
    transition: border-color 0.3s ease, box-shadow 0.3s ease;
    background-color: #fdfdff;
    margin-bottom: 0.8rem; /* Space below textarea */
  }
  .notes-textarea.editing:focus { /* Keep style from before */ }
  .notes-textarea.editing:disabled { /* Keep style from before */ }
  
  .notes-actions.creator-actions {
      margin-top: auto; /* Push actions to bottom */
      display: flex;
      justify-content: flex-end; /* Align button right */
      align-items: center;
      gap: 1rem;
      min-height: 36px; /* Ensure space for status/button */
  }
  .notes-status-text { /* Status text style */
      font-size: 0.8em;
      font-style: italic;
      transition: color 0.3s ease, opacity 0.3s ease;
      color: var(--danger-color); /* Default to error color */
      margin-right: auto; /* Push button to the right */
  }
  .notes-status-text:empty { display: none; }
  
  
  /* --- Notes List Section --- */
  .notes-list-card {
      border-left-color: var(--secondary-color); /* Different accent color */
  }
  .all-notes-display-section { /* Renamed from notes-display-section */
      /* Removed margin-top as it's handled by grid gap */
      flex-grow: 1; /* Allow list to take space */
      display: flex; /* Use flex for internal layout */
      flex-direction: column;
  }
  .notes-label.display-label { /* Keep style from before */ }
  
  .study-log-container, /* Reuse styling for scrollable container */
  .all-notes-list {
      list-style: none;
      padding: 0;
      margin: 0; /* Reset margin */
      flex-grow: 1; /* Make list take available space */
      overflow-y: auto; /* Enable scrolling */
      max-height: 60vh; /* Limit height */
      border: 1px solid var(--border-color);
      border-radius: 8px;
      margin-top: 1rem; /* Space below title */
  }
  
  .note-list-item {
      padding: 0.8rem 1.2rem; /* Consistent padding */
      border-bottom: 1px solid #f0f4f8; /* Lighter separator */
      position: relative; /* For delete button positioning */
      display: flex; /* Use flex to align content and button */
      justify-content: space-between;
      align-items: flex-start; /* Align items top */
      gap: 1rem; /* Space between content and button */
  }
  .note-list-item:last-child { border-bottom: none; }
  .note-list-item:hover { background-color: #fafbff; } /* Hover effect */
  .note-list-item:hover .note-item-actions { opacity: 1; } /* Show delete on hover */
  
  .note-content-wrapper { /* Wrapper for text content */
      flex-grow: 1; /* Allow text to take space */
  }
  
  .note-list-header {
      display: flex;
      justify-content: space-between; /* Pushes time to the right */
      align-items: center;
      margin-bottom: 0.4rem; /* Space below header */
      flex-wrap: wrap; /* Allow wrapping on small screens */
      gap: 0.5em;
  }
  .note-key-label { /* Style for note type/key */
      font-weight: 600;
      font-size: 0.8em;
      color: var(--primary-dark);
      background-color: #e9eff8; /* Subtle background */
      padding: 0.1em 0.5em;
      border-radius: 4px;
      white-space: nowrap;
  }
  .note-list-time {
      font-size: 0.75em;
      color: var(--text-light);
      white-space: nowrap;
      flex-shrink: 0; /* Don't shrink time */
  }
  
  .note-list-content {
      color: var(--text-color);
      font-size: 0.95em; /* Slightly larger content font */
      line-height: 1.6;
      white-space: pre-wrap;
      word-wrap: break-word;
      padding-right: 20px; /* Ensure space from delete button */
  }
  .note-list-content :deep(br) { /* Style line breaks */
      content: ""; display: block; margin-bottom: 0.5em;
  }
  
  /* Delete Button */
  .note-item-actions {
      opacity: 0; /* Hidden by default */
      transition: opacity 0.2s ease-in-out;
      flex-shrink: 0; /* Prevent button shrinking */
      margin-left: 0.5rem; /* Space from content */
      padding-top: 0.1rem; /* Align button slightly */
  }
  .btn-delete-note {
      background: none;
      border: none;
      color: var(--danger-color);
      cursor: pointer;
      padding: 0.2em; /* Small clickable area */
      font-size: 0.9em; /* Adjust icon size */
      line-height: 1;
      opacity: 0.6; /* Slightly faded */
  }
  .btn-delete-note:hover {
      opacity: 1;
      color: darken(var(--danger-color), 10%); /* Darken on hover */
  }
  
  
  /* --- Common Styles --- */
  .notes-divider { border: none; border-top: 1px solid var(--border-color); margin: 2rem 0; }
  .placeholder-text-small { color: var(--text-light); font-style: italic; font-size: 0.9em; padding: 1rem 0; text-align: center; }
  .loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
  .error-message { color: var(--danger-color); }
  .error-message.small { font-size: 0.8em; margin-top: 0.5rem; text-align: right; width: 100%; }
  
  
  /* Header specific icon */
  .section-header i.icon-gradient { background: var(--gradient-secondary); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 1.5em; }
  
  /* Responsive adjustments */
  @media (max-width: 991px) { /* Stack below large desktop */
      .notes-layout-grid {
          grid-template-columns: 1fr; /* Stack columns */
      }
      .notes-list-card { /* Reset grid positioning if set */
           grid-column: auto;
           grid-row: auto;
       }
       .notes-creator-card {
           grid-column: auto;
           grid-row: auto;
       }
  }
  </style>