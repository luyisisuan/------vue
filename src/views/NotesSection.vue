<!-- src/views/NotesSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-pencil-alt icon-gradient"></i> 备考笔记</h1>
      <p>在此添加新的笔记记录。</p>
    </header>

    <div v-if="isLoading" class="loading-indicator card">加载笔记中...</div>
    <div v-else-if="loadErrorDisplay" class="error-message card" style="color: red;">
        加载错误: {{ loadErrorDisplay }}
    </div>

    <div v-else class="card notes-card">
      <!-- 笔记创建区域 -->
      <div class="notes-creator-section">
        <label for="notes-general-creator" class="notes-label">添加新笔记:</label>
        <textarea
          id="notes-general-creator"
          class="notes-textarea editing"
          placeholder="在此处输入新的笔记内容..."
          v-model="newNoteContent"
          rows="5"
          :disabled="isCreating"
        ></textarea>
        <div class="notes-actions">
          <button @click="createNewNote" class="btn btn-primary" :disabled="isCreating || !newNoteContent.trim()">
            <i class="fas fa-plus"></i> {{ isCreating ? '添加中...' : '添加笔记' }}
          </button>
          <span v-if="createErrorDisplay" class="notes-status-text error-text">{{ createErrorDisplay }}</span>
        </div>
      </div>

      <hr class="notes-divider">

      <!-- 笔记显示区域 -->
      <div class="all-notes-display-section">
          <h2 class="notes-label display-label">笔记记录 (按时间排序):</h2>
          <div v-if="allNotesSorted.length === 0 && !isLoading" class="placeholder-text-small">暂无笔记记录。</div>
          <div v-else-if="isLoading" class="loading-indicator">加载中...</div>
          <div v-else-if="loadErrorDisplay" class="error-message">加载列表时出错: {{ loadErrorDisplay }}</div>
          <ul v-else class="all-notes-list">
              <li v-for="note in allNotesSorted" :key="note.id" class="note-list-item">
                  <div class="note-list-header">
                      <strong>{{ getNoteKeyLabel(note.noteKey) }}:</strong>
                      <span class="note-list-time">{{ note.timestamp ? formatTimestamp(note.timestamp, 'yyyy-MM-dd HH:mm') : 'N/A' }}</span>
                  </div>
                  <div class="note-list-content" v-html="sanitizeNoteContent(note.content || '')"></div>
              </li>
          </ul>
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

console.log('NotesSection.vue script setup running');

// --- Store ---
const noteStore = useNoteStore(); // 获取 Store 实例
const {
    isLoading,
    error: loadError, // 加载列表时的错误 (重命名)
    isCreating,       // 是否正在创建/保存
    createError,      // 创建/保存时的错误 (重命名)
    allNotesSorted,   // 获取所有排序后的笔记列表 (getter)
    // 注意：不再从 storeToRefs 解构 action
} = storeToRefs(noteStore);

// --- 本地状态 ---
const newNoteContent = ref(''); // 用于新笔记输入框的 v-model

// --- 计算属性 ---
const loadErrorDisplay = computed(() => typeof loadError.value === 'string' ? loadError.value : null);
const createErrorDisplay = computed(() => typeof createError.value === 'string' ? createError.value : null);

// --- 方法 ---
async function createNewNote() {
  console.log('createNewNote called');
  if (!newNoteContent.value.trim()) {
      alert('笔记内容不能为空！');
      return;
  }
  const noteData = {
      content: newNoteContent.value,
      noteKey: 'general' // 默认 key，可根据需要修改或移除
  };
  console.log('Calling createNote action with:', noteData);
  // **MODIFIED:** 直接调用 noteStore 实例上的 action
  const success = await noteStore.createNote(noteData);

  if (success) {
      newNoteContent.value = ''; // 清空输入框
      console.log("New note created successfully.");
      alert("笔记添加成功！");
      // 列表 allNotesSorted 会在 store action 内部调用 loadAllNotes 后自动更新
  } else {
      console.error("Failed to create new note. Error from store:", createError.value); // 使用解构后的 createError
      alert(`创建笔记失败: ${createError.value || '未知错误'}`);
  }
}

function sanitizeNoteContent(content) {
    console.log('Sanitizing content:', content);
    if (content === null || typeof content === 'undefined') {
        console.warn('sanitizeNoteContent received null or undefined content');
        return '';
    }
    const contentString = String(content);
    try {
        const cleanHtml = sanitizeHtml(contentString, {
          allowedTags: [], allowedAttributes: {}, allowComments: false
        });
        console.log('Sanitized content:', cleanHtml);
        const htmlWithBreaks = cleanHtml.replace(/\n/g, '<br>');
        console.log('HTML with breaks:', htmlWithBreaks);
        if (htmlWithBreaks.includes('<!--')) {
            console.error('CRITICAL: Sanitized content still contains "<!--"!', htmlWithBreaks);
            return '笔记内容格式错误，无法显示。';
        }
        return htmlWithBreaks;
    } catch (e) {
        console.error('Error during sanitizeHtml:', e, 'Original content:', contentString);
        return '笔记内容处理出错。';
    }
}


function getNoteKeyLabel(noteKey) {
    switch (noteKey) {
        case 'general': return '通用笔记';
        case 'notes-phase1': return '基础阶段笔记';
        case 'notes-phase2': return '强化阶段笔记';
        case 'notes-phase3': return '冲刺阶段笔记';
        case 'notes-course': return '课程笔记';
        default: return noteKey || '笔记';
    }
}

// --- Watchers ---
watch(allNotesSorted, (newList) => {
    console.log('Note list updated in store:', newList);
}, { deep: true });

// --- Lifecycle Hooks ---
onMounted(() => {
    console.log('NotesSection mounted. Initial notes list length:', allNotesSorted.value.length);
    // 初始加载由 store 负责
});

</script>

<style scoped>
/* --- Notes Section Specific Styles --- */
.notes-card { border-left: 4px solid var(--success-color); }
.notes-creator-section { margin-bottom: 1.5rem; }
.notes-label { display: block; font-weight: 600; color: var(--primary-dark); margin-bottom: 0.5rem; font-size: 0.85em; }
.notes-label.display-label { font-size: 1.1em; color: var(--text-color); margin-bottom: 0.8rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
.notes-textarea.editing { width: 100%; min-height: 120px; padding: 0.8rem 1rem; border: 1px solid var(--border-color); border-radius: 8px; font-family: inherit; font-size: 0.95em; line-height: 1.6; resize: vertical; transition: border-color 0.3s ease, box-shadow 0.3s ease; background-color: #fdfdff; box-shadow: none; }
.notes-textarea.editing:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 3px rgba(74, 105, 189, 0.15); background-color: white; }
.notes-textarea.editing:disabled { background-color: #eee; cursor: not-allowed; opacity: 0.7; }
.all-notes-display-section { margin-top: 1.5rem; }
.all-notes-list { list-style: none; padding: 0; margin-top: 0.8rem; }
.note-list-item { padding: 0.8rem 0.5rem; border-bottom: 1px dashed var(--border-color); }
.note-list-item:last-child { border-bottom: none; }
.note-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
.note-list-header strong { font-weight: 600; font-size: 0.9em; color: var(--primary-dark); }
.note-list-time { font-size: 0.75em; color: var(--text-light); white-space: nowrap; flex-shrink: 0; }
.note-list-content { color: var(--text-color); opacity: 0.9; font-size: 0.9em; line-height: 1.5; white-space: pre-wrap; word-wrap: break-word; }
.note-list-content :deep(br) { content: ""; display: block; margin-bottom: 0.6em; }
.notes-actions { margin-top: 0.8rem; display: flex; align-items: center; justify-content: flex-end; gap: 1rem; min-height: 1.5em; }
.notes-status-text { font-size: 0.8em; font-style: italic; transition: color 0.3s ease, opacity 0.3s ease; color: var(--danger-color); }
.notes-status-text:empty { display: none; }
.notes-divider { border: none; border-top: 1px solid var(--border-color); margin: 2rem 0; }
.placeholder-text-small { color: var(--text-light); font-style: italic; font-size: 0.9em; padding: 1rem 0; }
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.section-header i.icon-gradient { background: var(--gradient-secondary); -webkit-background-clip: text; background-clip: text; color: transparent; font-size: 1.5em; }
</style>