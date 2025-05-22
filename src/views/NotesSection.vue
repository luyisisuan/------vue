<template>
  <div class="notes-page-container gov-style-wrapper notes-enhanced">
    <header class="section-header">
      <h1><i class="fas fa-pencil-ruler header-icon"></i> 智慧备考笔记</h1>
      <p>记录灵感瞬间，沉淀学习精华，构建专属知识体系。</p>
    </header>

    <div v-if="isLoading && allNotesSorted.length === 0" class="loading-overlay-fullpage card">
      <div class="loading-spinner-simple">
        <div>备</div><div>考</div><div>笔</div><div>记</div>
      </div>
      <p>正在同步云端笔记...</p>
    </div>
    <div v-else-if="loadErrorDisplay && allNotesSorted.length === 0" class="error-message card prominent-error">
      <i class="fas fa-cloud-showers-heavy error-icon-large"></i>
      笔记同步失败: {{ loadErrorDisplay }}
      <button @click="noteStore.loadAllNotes(true)" class="btn btn-secondary btn-sm retry-btn"> <i class="fas fa-redo"></i> 重试同步 </button>
    </div>

    <div v-else
         class="notes-layout-grid"
         :class="{ 'sidebar-is-collapsed': appStore.isSidebarCollapsed }"
    >
      <div class="card notes-card notes-creator-card">
        <div class="card-header">
          <h2><i class="fas fa-lightbulb card-title-icon"></i> 捕捉灵感火花</h2>
        </div>
        <div class="card-body">
          <div class="notes-creator-section">
            <div class="form-group">
              <label for="note-category-selector" class="form-label">笔记分类:</label>
              <select id="note-category-selector" class="form-control form-select" v-model="selectedNoteKeyForCreation">
                <option v-for="cat in noteCategories" :key="cat.key" :value="cat.key">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <div v-if="editor" class="tiptap-toolbar">
              <button @click="editor.chain().focus().toggleBold().run()" :disabled="!editor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editor.isActive('bold') }" title="加粗 (Ctrl+B)">
                <i class="fas fa-bold"></i>
              </button>
              <button @click="editor.chain().focus().toggleItalic().run()" :disabled="!editor.can().chain().focus().toggleItalic().run()" :class="{ 'is-active': editor.isActive('italic') }" title="斜体 (Ctrl+I)">
                <i class="fas fa-italic"></i>
              </button>
              <button @click="editor.chain().focus().toggleUnderline().run()" :disabled="!editor.can().chain().focus().toggleUnderline().run()" :class="{ 'is-active': editor.isActive('underline') }" title="下划线 (Ctrl+U)">
                <i class="fas fa-underline"></i>
              </button>
              <button @click="editor.chain().focus().toggleStrike().run()" :disabled="!editor.can().chain().focus().toggleStrike().run()" :class="{ 'is-active': editor.isActive('strike') }" title="删除线">
                <i class="fas fa-strikethrough"></i>
              </button>
              <span class="toolbar-divider"></span>
              <button @click="editor.chain().focus().setParagraph().run()" :class="{ 'is-active': editor.isActive('paragraph') }" title="段落">
                <i class="fas fa-paragraph"></i>
              </button>
              <button @click="editor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }" title="标题1">H1</button>
              <button @click="editor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }" title="标题2">H2</button>
              <button @click="editor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }" title="标题3">H3</button>
              <span class="toolbar-divider"></span>
              <button @click="editor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editor.isActive('bulletList') }" title="无序列表">
                <i class="fas fa-list-ul"></i>
              </button>
              <button @click="editor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editor.isActive('orderedList') }" title="有序列表">
                <i class="fas fa-list-ol"></i>
              </button>
              <button @click="editor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editor.isActive('blockquote') }" title="引用">
                <i class="fas fa-quote-right"></i>
              </button>
              <button @click="editor.chain().focus().setHorizontalRule().run()" title="水平分割线">—</button>
              <span class="toolbar-divider"></span>
              <input
                type="color"
                @input="editor.chain().focus().setColor($event.target.value).run()"
                :value="editor.getAttributes('textStyle').color || '#212529'"
                title="字体颜色"
                class="tiptap-toolbar-color-picker"
              />
              <button @click="editor.chain().focus().unsetColor().run()" title="清除颜色"><i class="fas fa-eraser"></i></button>
              <span class="toolbar-divider"></span>
              <button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()" title="撤销 (Ctrl+Z)">
                <i class="fas fa-undo"></i>
              </button>
              <button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()" title="重做 (Ctrl+Y)">
                <i class="fas fa-redo"></i>
              </button>
            </div>

            <editor-content :editor="editor" class="notes-tiptap-editor-wrapper"/>

            <div class="notes-actions creator-actions">
              <span v-if="createErrorDisplay" class="error-message small-text-error"><i class="fas fa-exclamation-circle"></i> {{ createErrorDisplay }}</span>
              <button @click="createNewNoteHandler" class="btn btn-primary btn-add-note" :disabled="isCreating || (editor && editor.isEmpty)">
                <i class="fas fa-paper-plane"></i> {{ isCreating ? '发射中...' : '保存笔记' }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="card notes-card notes-list-card">
        <div class="card-header">
          <h2><i class="fas fa-archive card-title-icon"></i> 知识档案库</h2>
        </div>
        <div class="card-body">
          <div class="notes-filter-section form-group">
            <label for="note-filter-selector" class="form-label">筛选分类:</label>
            <select id="note-filter-selector" class="form-control form-select" v-model="filterNoteKey">
              <option value="all">全部笔记</option>
              <option v-for="cat in noteCategories" :key="cat.key" :value="cat.key">
                {{ cat.label }}
              </option>
            </select>
          </div>
          <div class="notes-display-section">
            <div v-if="isLoading && allNotesSorted.length > 0" class="loading-indicator small-inline-loader">
              <div class="dot-spinner-simple"><div></div><div></div><div></div></div> 更新中...
            </div>
            <div v-else-if="loadErrorDisplay && allNotesSorted.length > 0" class="error-message small-inline-error">列表更新失败</div>

            <div v-if="filteredNotesDisplay.length === 0 && !isLoading" class="placeholder-text">
              <i class="fas fa-book-dead placeholder-icon-large"></i>
              <p>
                {{ filterNoteKey === 'all' ? '知识的荒原等待您的开垦' : '该分类下暂无笔记' }}
              </p>
              <span v-if="filterNoteKey === 'all'">点击左侧，记录下第一条宝贵笔记吧！</span>
              <span v-else>尝试切换分类或创建新的笔记。</span>
            </div>
            <transition-group name="note-list-anim" tag="ul" class="all-notes-list fancy-scrollbar" v-else>
              <li v-for="(note) in filteredNotesDisplay" :key="note.id" class="note-list-item">
                  <div class="note-content-wrapper">
                      <div class="note-list-header">
                        <span class="note-key-label"><i :class="getNoteKeyIcon(note.noteKey)"></i> {{ getNoteKeyLabel(note.noteKey) }}</span>
                        <span class="note-list-time"><i class="far fa-clock"></i> {{ formatTimestamp(note.timestamp, 'yy/MM/dd HH:mm') }}</span>
                      </div>
                      <div class="note-list-content rich-content" v-html="sanitizeNoteContent(note.content || '')"></div>
                  </div>
                  <div class="note-item-actions">
                      <button @click="openEditModal(note)" class="btn-icon btn-edit-note" title="编辑笔记">
                          <i class="fas fa-edit"></i>
                      </button>
                      <button @click="deleteNoteHandler(note.id)" class="btn-icon btn-delete-note" title="删除笔记">
                          <i class="fas fa-trash-alt"></i>
                      </button>
                  </div>
              </li>
            </transition-group>
          </div>
        </div>
      </div>
    </div>

    <div v-if="isEditModalVisible" class="notes-modal-overlay" @click.self="closeEditModal">
      <div class="notes-modal-content card">
        <div class="card-header">
          <h2><i class="fas fa-edit card-title-icon"></i> 编辑笔记</h2>
          <button @click="closeEditModal" class="notes-modal-close-btn" title="关闭">×</button>
        </div>
        <div class="card-body">
          <div v-if="editingNote" class="notes-editor-modal-form">
            <div class="form-group">
              <label for="edit-note-category-selector" class="form-label">笔记分类:</label>
              <select id="edit-note-category-selector" class="form-control form-select" v-model="selectedNoteKeyForEdit">
                <option v-for="cat in noteCategories" :key="`edit-${cat.key}`" :value="cat.key">
                  {{ cat.label }}
                </option>
              </select>
            </div>

            <div v-if="editEditor && editEditor.value" class="tiptap-toolbar"> <!-- MODIFIED: check editEditor.value for safety -->
              <button @click="editEditor.chain().focus().toggleBold().run()" :disabled="!editEditor.can().chain().focus().toggleBold().run()" :class="{ 'is-active': editEditor.isActive('bold') }" title="加粗 (Ctrl+B)">
                <i class="fas fa-bold"></i>
              </button>
              <button @click="editEditor.chain().focus().toggleItalic().run()" :disabled="!editEditor.can().chain().focus().toggleItalic().run()" :class="{ 'is-active': editEditor.isActive('italic') }" title="斜体 (Ctrl+I)">
                <i class="fas fa-italic"></i>
              </button>
              <button @click="editEditor.chain().focus().toggleUnderline().run()" :disabled="!editEditor.can().chain().focus().toggleUnderline().run()" :class="{ 'is-active': editEditor.isActive('underline') }" title="下划线 (Ctrl+U)">
                <i class="fas fa-underline"></i>
              </button>
              <button @click="editEditor.chain().focus().toggleStrike().run()" :disabled="!editEditor.can().chain().focus().toggleStrike().run()" :class="{ 'is-active': editEditor.isActive('strike') }" title="删除线">
                <i class="fas fa-strikethrough"></i>
              </button>
              <span class="toolbar-divider"></span>
              <button @click="editEditor.chain().focus().setParagraph().run()" :class="{ 'is-active': editEditor.isActive('paragraph') }" title="段落">
                <i class="fas fa-paragraph"></i>
              </button>
              <button @click="editEditor.chain().focus().toggleHeading({ level: 1 }).run()" :class="{ 'is-active': editEditor.isActive('heading', { level: 1 }) }" title="标题1">H1</button>
              <button @click="editEditor.chain().focus().toggleHeading({ level: 2 }).run()" :class="{ 'is-active': editEditor.isActive('heading', { level: 2 }) }" title="标题2">H2</button>
              <button @click="editEditor.chain().focus().toggleHeading({ level: 3 }).run()" :class="{ 'is-active': editEditor.isActive('heading', { level: 3 }) }" title="标题3">H3</button>
              <span class="toolbar-divider"></span>
              <button @click="editEditor.chain().focus().toggleBulletList().run()" :class="{ 'is-active': editEditor.isActive('bulletList') }" title="无序列表">
                <i class="fas fa-list-ul"></i>
              </button>
              <button @click="editEditor.chain().focus().toggleOrderedList().run()" :class="{ 'is-active': editEditor.isActive('orderedList') }" title="有序列表">
                <i class="fas fa-list-ol"></i>
              </button>
              <button @click="editEditor.chain().focus().toggleBlockquote().run()" :class="{ 'is-active': editEditor.isActive('blockquote') }" title="引用">
                <i class="fas fa-quote-right"></i>
              </button>
              <button @click="editEditor.chain().focus().setHorizontalRule().run()" title="水平分割线">—</button>
              <span class="toolbar-divider"></span>
              <input
                type="color"
                @input="editEditor.chain().focus().setColor($event.target.value).run()"
                :value="editEditor.getAttributes('textStyle').color || '#212529'"
                title="字体颜色"
                class="tiptap-toolbar-color-picker"
              />
              <button @click="editEditor.chain().focus().unsetColor().run()" title="清除颜色"><i class="fas fa-eraser"></i></button>
              <span class="toolbar-divider"></span>
              <button @click="editEditor.chain().focus().undo().run()" :disabled="!editEditor.can().undo()" title="撤销 (Ctrl+Z)">
                <i class="fas fa-undo"></i>
              </button>
              <button @click="editEditor.chain().focus().redo().run()" :disabled="!editEditor.can().redo()" title="重做 (Ctrl+Y)">
                <i class="fas fa-redo"></i>
              </button>
            </div>
            <editor-content :editor="editEditor" class="notes-tiptap-editor-wrapper"/>

            <div class="notes-actions modal-actions">
              <span v-if="updateErrorDisplay" class="error-message small-text-error"><i class="fas fa-exclamation-circle"></i> {{ updateErrorDisplay }}</span>
              <button @click="closeEditModal" type="button" class="btn btn-secondary">取消</button>
              <button @click="submitEditedNoteHandler" class="btn btn-primary" :disabled="isUpdating || (editEditor && editEditor.value && editEditor.isEmpty)"> <!-- MODIFIED: check editEditor.value -->
                <i class="fas fa-save"></i> {{ isUpdating ? '保存中...' : '保存更改' }}
              </button>
            </div>
          </div>
          <div v-else-if="!editingNote && editEditor && editEditor.value" class="loading-indicator small-inline-loader"> <!-- MODIFIED: check editEditor.value -->
             <div class="dot-spinner-simple"><div></div><div></div><div></div></div> 载入编辑器...
          </div>
        </div>
      </div>
    </div> <!-- End Edit Modal -->

  </div>
</template>
<script setup>
import { ref, computed, onBeforeUnmount, watch, nextTick } from 'vue'; // Added nextTick
import { storeToRefs } from 'pinia';
import { useNoteStore } from '@/stores/noteStore.js';
import { useAppStore } from '@/stores/appStore.js';
import { formatTimestamp } from '@/utils/formatters.js';
import DOMPurify from 'dompurify';

import { useEditor, EditorContent } from '@tiptap/vue-3';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Placeholder from '@tiptap/extension-placeholder';

const noteStore = useNoteStore();
const appStore = useAppStore();

const {
    isLoading,
    error: loadError,
    isCreating,
    createError,
    allNotesSorted,
    // Ensure these are defined as refs in your noteStore.js for storeToRefs to work correctly
    isUpdating, 
    updateError, 
} = storeToRefs(noteStore);

// Editor for creating notes
const editor = useEditor({
  content: '',
  extensions: [
    StarterKit.configure({}),
    Underline,
    TextStyle,
    Color,
    Placeholder.configure({
      placeholder: '灵光一闪，即刻记录...',
    }),
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-editor-content-area',
    },
  },
});

// Editor for editing notes in the modal
const editEditor = useEditor({
  content: '', 
  extensions: [ 
    StarterKit.configure({}),
    Underline,
    TextStyle,
    Color,
    Placeholder.configure({
      placeholder: '编辑笔记内容...',
    }),
  ],
  editorProps: {
    attributes: {
      class: 'tiptap-editor-content-area', 
    },
  },
});

onBeforeUnmount(() => {
  if (editor.value) {
    editor.value.destroy();
  }
  if (editEditor.value) { 
    editEditor.value.destroy();
  }
});

const noteCategoryKeys = ['general', 'notes-phase1', 'notes-phase2', 'notes-phase3', 'notes-course'];
const noteCategories = computed(() => noteCategoryKeys.map(key => ({
    key: key,
    label: getNoteKeyLabel(key),
    icon: getNoteKeyIcon(key)
})));

const selectedNoteKeyForCreation = ref('general');
const filterNoteKey = ref('all');

const isEditModalVisible = ref(false);
const editingNote = ref(null); 
const selectedNoteKeyForEdit = ref('general'); 

const filteredNotesDisplay = computed(() => {
  if (filterNoteKey.value === 'all') {
    return allNotesSorted.value;
  }
  return allNotesSorted.value.filter(note => note.noteKey === filterNoteKey.value);
});

const loadErrorDisplay = computed(() => typeof loadError.value === 'string' ? loadError.value : (loadError.value?.message || null));
const createErrorDisplay = computed(() => typeof createError.value === 'string' ? createError.value : (createError.value?.message || null));

const updateErrorDisplay = computed(() => {
  if (!updateError.value) return null;
  return typeof updateError.value === 'string' ? updateError.value : (updateError.value.message || '未知更新错误');
});


async function createNewNoteHandler() {
  if (!editor.value || editor.value.isEmpty) {
    noteStore.createError = '笔记内容不能为空！'; // Assuming direct mutation or use a store action
    return;
  }
  noteStore.createError = null; 

  const noteContentHTML = editor.value.getHTML();
  const noteData = {
    content: noteContentHTML,
    noteKey: selectedNoteKeyForCreation.value
  };
  const success = await noteStore.createNote(noteData);
  if (success && editor.value) {
      editor.value.commands.clearContent();
  }
}

async function deleteNoteHandler(noteId) {
    if (confirm('这条笔记将被永久删除，确定吗？')) {
        const success = await noteStore.deleteNote(noteId);
        if (!success) {
             alert(`删除笔记失败: ${noteStore.error?.message || noteStore.error || '未知错误'}`);
        }
    }
}

function openEditModal(note) {
  // console.log("openEditModal called with note:", JSON.parse(JSON.stringify(note)));
  // console.log("Current isEditModalVisible before change:", isEditModalVisible.value);
  // console.log("editEditor ref:", editEditor);
  // console.log("editEditor instance:", editEditor.value);

  if (!editEditor.value) {
    console.error("Edit editor instance is not available. Cannot open modal.");
    // Optionally, provide user feedback, e.g., using a toast notification
    // appStore.setGlobalToast("编辑器初始化失败，请稍后再试。", "error");
    return;
  }
  
  editingNote.value = JSON.parse(JSON.stringify(note)); // Deep copy
  selectedNoteKeyForEdit.value = note.noteKey || 'general';
  
  // Set content for the editor
  editEditor.value.commands.setContent(editingNote.value.content || '', false); // 'false' to not emit an update event immediately
  
  isEditModalVisible.value = true;
  if (noteStore.updateError) noteStore.updateError = null; // Clear previous update error

  // Focus the editor after the modal is visible and content is set
  nextTick(() => {
    if (editEditor.value && isEditModalVisible.value) { // Re-check in case modal was closed quickly or editor destroyed
      editEditor.value.chain().focus('end').run(); // Focus at the end of the content
    }
  });
}

function closeEditModal() {
  isEditModalVisible.value = false;
  if (editEditor.value) {
    editEditor.value.commands.clearContent(false); 
  }
  editingNote.value = null; 
  if (noteStore.updateError) noteStore.updateError = null; 
}

async function submitEditedNoteHandler() {
  if (!editingNote.value || !editEditor.value || editEditor.value.isEmpty) {
    // Assuming direct mutation or use a store action: noteStore.setUpdateError('笔记内容不能为空！');
    noteStore.updateError = '笔记内容不能为空！'; 
    return;
  }
  noteStore.updateError = null;

  const updatedContentHTML = editEditor.value.getHTML();
  const noteDataToUpdate = {
    content: updatedContentHTML,
    noteKey: selectedNoteKeyForEdit.value,
    // timestamp: editingNote.value.timestamp, // Keep original timestamp or update? Decide based on requirements.
                                             // If you want to update timestamp on edit, generate new one here or in store.
    // id: editingNote.value.id // ID is passed separately to updateNote
  };

  const success = await noteStore.updateNote(editingNote.value.id, noteDataToUpdate);
  if (success) {
    closeEditModal(); 
  }
}

function sanitizeNoteContent(content) {
    if (!content) return '<p class="empty-content-placeholder">[ 空笔记 ]</p>';
    const contentString = String(content);
    try {
        const cleanHtml = DOMPurify.sanitize(contentString, {
            USE_PROFILES: { html: true },
            ADD_TAGS: ['mark', 'span', 'div', 'u', 's', 'h1', 'h2', 'h3', 'blockquote', 'hr', 'pre', 'code', 'br'],
            ADD_ATTR: ['style', 'class', 'color', 'level', 'start'], 
        });
        if (!cleanHtml || cleanHtml === '<p></p>' || cleanHtml.replace(/<[^>]*>?/gm, '').trim() === '') {
            return '<p class="empty-content-placeholder">[ 空笔记内容 ]</p>';
        }
        return cleanHtml;
    } catch (e) {
        console.error('Error during DOMPurify sanitize:', e);
        const div = document.createElement('div');
        div.textContent = contentString.substring(0, 200) + (contentString.length > 200 ? '...' : '');
        return `<p class="error-content-placeholder">内容处理出错: ${div.innerHTML}</p>`;
    }
}

function getNoteKeyLabel(noteKey) {
    switch (noteKey) {
        case 'general': return '通用随笔';
        case 'notes-phase1': return '经济、政治、法律常识';
        case 'notes-phase2': return '言语理解';
        case 'notes-phase3': return '数量与资料分析';
        case 'notes-course': return '申论';
        default: return noteKey ? String(noteKey).replace('notes-', '') : '未分类';
    }
}

function getNoteKeyIcon(noteKey) {
    switch (noteKey) {
        case 'general': return 'fas fa-feather-alt';
        case 'notes-phase1': return 'fas fa-layer-group';
        case 'notes-phase2': return 'fas fa-cogs';
        case 'notes-phase3': return 'fas fa-flag-checkered';
        case 'notes-course': return 'fas fa-graduation-cap';
        default: return 'far fa-sticky-note';
    }
}

watch(allNotesSorted, (newNotesList) => {
  if (editingNote.value && isEditModalVisible.value) {
    const noteInStore = newNotesList.find(n => n.id === editingNote.value.id);
    if (noteInStore) {
      // Only update non-content fields in editingNote.value if they differ.
      // The editor content (editEditor.value) should remain untouched by this watch,
      // as the user might be actively editing it.
      let updated = false;
      if (noteInStore.noteKey !== editingNote.value.noteKey) {
        editingNote.value.noteKey = noteInStore.noteKey;
        selectedNoteKeyForEdit.value = noteInStore.noteKey; // Sync dropdown as well
        updated = true;
      }
      // Add similar checks for other meta-data if necessary
      // e.g., if (noteInStore.title !== editingNote.value.title) { editingNote.value.title = noteInStore.title; updated = true; }
      
      if (updated) {
        console.log(`Note (ID: ${editingNote.value.id}) being edited was updated in store (metadata changed). Form fields reflect this.`);
      }
    } else {
      console.warn(`Note (ID: ${editingNote.value.id}) being edited was not found in the store (likely deleted). Closing edit modal.`);
      closeEditModal();
    }
  }
}, { deep: true });

</script>

<style scoped>
/* [EXISTING STYLES from your original post - keep them as they are] */
/* ... (all your existing .notes-enhanced, .section-header, .card, .tiptap-toolbar, etc. styles) ... */

.notes-enhanced.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-primary-red-light: #FFCDCD;
  --gov-primary-red-super-light-bg: #FFF5F5;
  --gov-accent-gold: #E1B000;
  --gov-accent-blue: #0D6EFD; /* Used for edit button */
  --gov-secondary-gray: #495057;
  --gov-text-primary: #212529;
  --gov-text-secondary: #6C757D;
  --gov-background-light: #F0F2F5;
  --gov-background-white: #FFFFFF;
  --gov-border-color: #DDE2E6;
  --gov-border-color-strong: #BCCCDC;
  --gov-danger-red: #DC3545;
  --gov-success-green: #198754;
  --gov-shadow-soft: 0 2px 8px rgba(0,0,0,0.06);
  --gov-shadow-medium: 0 4px 12px rgba(0,0,0,0.08);
  --gov-transition-default: background-color 0.2s ease-in-out, border-color 0.2s ease-in-out, color 0.2s ease-in-out, opacity 0.2s ease-in-out;
  --gov-border-radius: 6px;
  --gov-border-radius-large: 8px;

  font-family: "Microsoft YaHei", "SimSun", "Helvetica Neue", Helvetica, Arial, sans-serif;
  background-color: var(--gov-background-light);
  min-height: 100%;
  display: flex;
  flex-direction: column;
}

.section-header {
  margin-bottom: 2rem;
  padding: 1.5rem var(--content-padding, 1.5rem);
  border-bottom: 2px solid var(--gov-primary-red);
  text-align: center;
  background-color: var(--gov-background-white);
  flex-shrink: 0;
}
.section-header h1 {
  font-size: 1.8rem; font-weight: 700; color: var(--gov-text-primary);
  display: inline-flex; align-items: center;
}
.header-icon { color: var(--gov-primary-red); margin-right: 0.7rem; font-size: 1.6rem; }
.section-header p { font-size: 1rem; color: var(--gov-text-secondary); margin-top: 0.5rem; }

.form-group { margin-bottom: 1rem; }
.form-label { display: block; margin-bottom: 0.5rem; font-weight: 500; font-size: 0.9rem; color: var(--gov-text-secondary); }
.form-select {
  display: block; width: 100%; padding: 0.5rem 0.8rem; font-size: 0.9rem;
  font-weight: 400; line-height: 1.5; color: var(--gov-text-primary);
  background-color: var(--gov-background-white); background-clip: padding-box;
  border: 1px solid var(--gov-border-color-strong); border-radius: var(--gov-border-radius);
  transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out;
}
.form-select:focus {
  border-color: var(--gov-primary-red); outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(201, 42, 42, 0.25);
}

.card {
  background: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: var(--gov-border-radius-large);
  box-shadow: var(--gov-shadow-soft);
  display: flex;
  flex-direction: column;
}
.card-header {
  padding: 0.8rem 1.2rem;
  background-color: var(--gov-background-light);
  border-bottom: 1px solid var(--gov-border-color);
  display: flex; align-items: center;
  flex-shrink: 0;
  justify-content: space-between; /* ADDED for close button alignment */
}
.card-header h2 { margin: 0; font-size: 1.15rem; font-weight: 600; display: flex; align-items: center; gap: 0.5em; color: var(--gov-text-primary); }
.card-title-icon { color: var(--gov-primary-red); }
.card-body {
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  min-height: 0; 
  overflow: hidden; 
}
.notes-creator-section,
.notes-display-section,
.notes-editor-modal-form { /* ADDED .notes-editor-modal-form here */
  flex-grow: 1;
  display: flex;
  flex-direction: column;
  min-height: 0; 
}
.notes-creator-card { border-top: 3px solid var(--gov-primary-red); }
.notes-list-card { border-top: 3px solid var(--gov-accent-blue); }

.notes-layout-grid {
  display: grid;
  gap: 1.5rem;
  flex-grow: 1;
  padding: 0 1.5rem 1.5rem 1.5rem; 
  grid-template-columns: 1fr;
}

@media (min-width: 1024px) {
  .notes-layout-grid {
    grid-template-columns: minmax(400px, 0.9fr) 1.1fr;
    gap: 2rem;
  }
  .notes-layout-grid.sidebar-is-collapsed {
    grid-template-columns: minmax(480px, 1fr) 1fr;
    gap: 2.2rem;
  }
}

@media (min-width: 768px) and (max-width: 1023.98px) {
  .notes-layout-grid {
    grid-template-columns: 1fr; 
    gap: 1.5rem;
  }
}

.tiptap-toolbar {
  display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; padding: 0.5rem;
  border: 1px solid var(--gov-border-color-strong); border-bottom: none;
  border-top-left-radius: var(--gov-border-radius); border-top-right-radius: var(--gov-border-radius);
  background-color: var(--gov-background-light); flex-shrink: 0;
}
.tiptap-toolbar button { background-color: var(--gov-background-white); border: 1px solid var(--gov-border-color); color: var(--gov-text-primary); padding: 0.35rem 0.6rem; border-radius: var(--gov-border-radius); cursor: pointer; font-size: 0.8rem; line-height: 1.2; min-width: 30px; text-align: center; transition: background-color 0.2s, border-color 0.2s; }
.tiptap-toolbar button:hover:not(:disabled) { background-color: #e9ecef; border-color: #adb5bd; }
.tiptap-toolbar button.is-active { background-color: var(--gov-primary-red-light); border-color: var(--gov-primary-red); color: var(--gov-primary-red-dark); font-weight: bold; }
.tiptap-toolbar button:disabled { opacity: 0.5; cursor: not-allowed; }
.tiptap-toolbar button i { pointer-events: none; }
.tiptap-toolbar-color-picker { width: 28px; height: 28px; padding: 2px; border: 1px solid var(--gov-border-color); border-radius: var(--gov-border-radius); cursor: pointer; background-color: var(--gov-background-white); vertical-align: middle; }
.toolbar-divider { width: 1px; background-color: var(--gov-border-color-strong); height: 20px; margin: 0 0.3rem; }

.notes-tiptap-editor-wrapper {
  border: 1px solid var(--gov-border-color-strong); border-top: none;
  border-bottom-left-radius: var(--gov-border-radius); border-bottom-right-radius: var(--gov-border-radius);
  flex-grow: 1; 
  min-height: 220px; 
  overflow-y: auto; 
  background-color: var(--gov-background-white); position: relative;
  display: flex; 
  flex-direction: column;
}
.notes-tiptap-editor-wrapper:focus-within {
  border-color: var(--gov-primary-red);
  box-shadow: inset 0 1px 1px rgba(0,0,0,0.05), 0 0 0 0.2rem rgba(201, 42, 42, 0.25);
}
:deep(.ProseMirror) {
  padding: 0.8rem 1rem; line-height: 1.7; font-size: 0.9rem; color: var(--gov-text-primary);
  outline: none;
  flex-grow: 1; 
  overflow-y: auto; 
  white-space: pre-wrap; 
}
:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder); float: left; color: var(--gov-text-secondary);
  opacity: 0.7; pointer-events: none; height: 0;
}
:deep(.ProseMirror h1), :deep(.ProseMirror h2), :deep(.ProseMirror h3) { margin-top: 0.8em; margin-bottom: 0.4em; line-height: 1.2; font-weight: 600;}
:deep(.ProseMirror h1) { font-size: 1.6em; } :deep(.ProseMirror h2) { font-size: 1.4em; } :deep(.ProseMirror h3) { font-size: 1.2em; }
:deep(.ProseMirror p) { margin-bottom: 0.5em; } :deep(.ProseMirror ul), :deep(.ProseMirror ol) { padding-left: 1.5em; margin-bottom: 0.5em; }
:deep(.ProseMirror blockquote) { border-left: 3px solid var(--gov-border-color-strong); margin-left: 0; padding-left: 1em; font-style: italic; color: var(--gov-text-secondary); }
:deep(.ProseMirror pre) { background: #2f2f2f; color: #f2f2f2; font-family: 'Courier New', Courier, monospace; padding: 0.75rem 1rem; border-radius: var(--gov-border-radius); margin: 0.8em 0; white-space: pre-wrap; word-break: break-all; }
:deep(.ProseMirror pre code) { color: inherit; padding: 0; background: none; font-size: 0.85em; }
:deep(.ProseMirror code:not(pre > code)) { background-color: var(--gov-background-light); color: var(--gov-accent-blue); padding: 0.1em 0.3em; border-radius: 3px; font-size: 0.85em; }
:deep(.ProseMirror u) { text-decoration: underline; } :deep(.ProseMirror s) { text-decoration: line-through; }
:deep(.ProseMirror hr) { border: none; border-top: 1px solid var(--gov-border-color-strong); margin: 1em 0; }
:deep(.ProseMirror *) {
  color: var(--gov-text-primary); 
}

.notes-actions { /* Common style for action areas */
  display: flex; justify-content: flex-end; /* Default to right alignment for modal */
  align-items: center;
  gap: 1rem; 
  padding-top: 1rem; /* Increased padding for better separation */
  flex-shrink: 0;
  border-top: 1px solid var(--gov-border-color); /* Add a separator line */
  margin-top: auto; /* Push to bottom */
}

.creator-actions { /* Specific override for creator if needed */
  justify-content: space-between; /* Creator actions specific alignment */
  border-top: none; /* Creator actions might not need a top border if layout is different */
  padding-top: 0.5rem; /* Existing padding */
}
.modal-actions .error-message { /* Ensure error in modal actions is on the left */
    margin-right: auto; 
}

.small-text-error { margin-right: auto; text-align: left; color: var(--gov-danger-red); font-size: 0.75rem; display: flex; align-items: center; gap: 0.3em; }
.btn-add-note { padding: 0.6rem 1.5rem; font-size: 0.9rem; background-color: var(--gov-primary-red); border-color: var(--gov-primary-red); color: var(--gov-background-white); }
.btn-add-note:hover:not(:disabled) { background-color: var(--gov-primary-red-dark); border-color: var(--gov-primary-red-dark); }
.btn-add-note i { margin-right: 0.4em; }

.notes-filter-section {
  margin-bottom: 1rem; padding-bottom: 1rem;
  border-bottom: 1px solid var(--gov-border-color);
  flex-shrink: 0;
}
.all-notes-list {
  list-style: none; padding: 0; margin: 0; flex-grow: 1; overflow-y: auto;
  border: 1px solid var(--gov-border-color); border-radius: var(--gov-border-radius);
  background-color: var(--gov-background-light); /* Changed for contrast with items */
  padding: 0.5rem;
  min-height: 200px; 
}
.fancy-scrollbar::-webkit-scrollbar { width: 8px; }
.fancy-scrollbar::-webkit-scrollbar-track { background: var(--gov-background-light); border-radius: 4px; }
.fancy-scrollbar::-webkit-scrollbar-thumb { background-color: var(--gov-secondary-gray); border-radius: 4px; }
.fancy-scrollbar::-webkit-scrollbar-thumb:hover { background-color: var(--gov-text-primary); }

.note-list-item { padding: 1rem 1.2rem; border-bottom: 1px solid var(--gov-border-color); display: flex; justify-content: space-between; align-items: flex-start; gap: 0.8rem; background-color: var(--gov-background-white); border-radius: var(--gov-border-radius); margin-bottom: 0.5rem; box-shadow: var(--gov-shadow-soft); }
.note-list-item:last-child { border-bottom: none; }
.note-list-item:hover { background-color: var(--gov-primary-red-super-light-bg); }
.note-content-wrapper { flex-grow: 1; min-width: 0; }
.note-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem; flex-wrap: wrap; gap: 0.4em; }
.note-key-label { font-weight: 600; font-size: 0.75rem; color: var(--gov-background-white); background-color: var(--gov-primary-red); padding: 0.25em 0.7em; border-radius: 12px; white-space: nowrap; display: inline-flex; align-items: center; gap: 0.3em; }
.note-list-time { font-size: 0.7rem; color: var(--gov-text-secondary); white-space: nowrap; display: inline-flex; align-items: center; gap: 0.25em; }
.note-list-time i { color: var(--gov-accent-gold); }

.note-list-content.rich-content {
  color: var(--gov-text-primary); 
  font-size: 0.85rem;
  line-height: 1.6;
  white-space: pre-wrap; 
  word-wrap: break-word; 
  max-height: 150px; 
  overflow-y: hidden; 
  padding: 0.5rem 0.1rem; 
  transition: max-height 0.3s ease-in-out;
  position: relative; 
}
.note-list-item:hover .note-list-content.rich-content,
.note-list-content.rich-content.is-expanded { 
    max-height: 1000px; 
    overflow-y: auto; 
}
.note-list-content.rich-content :deep(.ProseMirror) {
    padding: 0;
    line-height: 1.6;
    font-size: 0.85rem;
}
.note-list-content.rich-content :deep(p:first-child) { margin-top: 0; }
.note-list-content.rich-content :deep(p:last-child) { margin-bottom: 0; }

.note-list-content.rich-content :deep(h1), .note-list-content.rich-content :deep(h2), .note-list-content.rich-content :deep(h3) { margin-top: 0.5em; margin-bottom: 0.25em; line-height: 1.2; font-weight: 600; }
.note-list-content.rich-content :deep(h1) { font-size: 1.3em; } .note-list-content.rich-content :deep(h2) { font-size: 1.15em; } .note-list-content.rich-content :deep(h3) { font-size: 1.05em; }
.note-list-content.rich-content :deep(hr) { border: none; border-top: 1px solid var(--gov-border-color); margin: 0.5em 0; }
.note-list-content :deep(strong) { color: var(--gov-primary-red-dark); }
.note-list-content :deep(em) { color: var(--gov-accent-blue); }
.note-list-content :deep(u) { text-decoration-color: var(--gov-accent-gold); text-decoration-thickness: 1.5px; }
.note-list-content :deep(s) { text-decoration-color: var(--gov-text-secondary); }
.note-list-content :deep(mark) { background-color: var(--gov-accent-gold) !important; color: var(--gov-text-primary) !important; padding: 0.05em 0.15em !important; margin: 0 -0.15em; border-radius: 3px !important; }
.note-list-content :deep(blockquote) { border-left: 2px solid var(--gov-primary-red); margin: 0.5em 0 0.5em 0.5em; padding-left: 0.8em; font-style: italic; color: var(--gov-text-secondary); }
.note-list-content :deep(code:not(pre > code)) { background-color: var(--gov-background-light); color: var(--gov-accent-blue); padding: 0.1em 0.3em; border-radius: 3px; font-family: "SFMono-Regular", Consolas, Menlo, monospace; font-size: 0.8em !important; }
.note-list-content :deep(pre) { background-color: var(--gov-text-primary); color: #f8f8f2; padding: 0.8em; border-radius: var(--gov-border-radius); overflow-x: auto; margin: 0.5em 0; }
.note-list-content :deep(pre code) { background: none !important; color: inherit !important; padding: 0 !important; font-size: 0.85em !important; }


.note-item-actions { opacity: 0.6; transition: opacity 0.2s ease-in-out; flex-shrink: 0; margin-left: 0.5rem; padding-top: 0.1rem; display: flex; flex-direction: column; gap: 0.3rem;}
.note-list-item:hover .note-item-actions { opacity: 1; }
.btn-delete-note { color: var(--gov-danger-red); width: 26px; height: 26px; font-size: 0.75rem; }
.btn-delete-note:hover { background-color: var(--gov-primary-red-super-light-bg); }
.btn-edit-note { color: var(--gov-accent-blue); width: 26px; height: 26px; font-size: 0.75rem; }
.btn-edit-note:hover { background-color: rgba(13, 110, 253, 0.08); }


.loading-overlay-fullpage { display: flex; flex-direction: column; align-items: center; justify-content: center; position: fixed; top:0; left:0; right:0; bottom:0; background: rgba(255,255,255,0.9); z-index: 2000; }
.loading-overlay-fullpage .loading-spinner-simple { display: flex; gap: 4px; margin-bottom: 0.5rem; }
.loading-spinner-simple div { font-size: 1.3rem; font-weight: bold; color: var(--gov-primary-red); animation: bounceSimple 1.4s infinite ease-in-out both; }
.loading-spinner-simple div:nth-child(1) { animation-delay: -0.32s; }
.loading-spinner-simple div:nth-child(2) { animation-delay: -0.16s; }
@keyframes bounceSimple { 0%, 80%, 100% { transform: scale(0); } 40% { transform: scale(1.0); } }
.loading-overlay-fullpage p { font-size: 1rem; color: var(--gov-text-secondary); margin-top: 0.5rem; }


.prominent-error { padding: 2rem; text-align: center; background-color: var(--gov-primary-red-super-light-bg); }
.error-icon-large { font-size: 2.5rem; color: var(--gov-danger-red); margin-bottom: 1rem; }
.retry-btn { margin-top: 1rem; }
.loading-indicator.small-inline-loader { display:flex; align-items:center; justify-content:center; font-size: 0.8rem; padding: 0.5rem; gap: 0.4em; color: var(--gov-text-secondary); }
.dot-spinner-simple div { width: 7px; height: 7px; background-color: var(--gov-primary-red); border-radius: 50%; margin: 0 2px; animation: bounceSimple 1.4s infinite ease-in-out both;}
.dot-spinner-simple div:nth-child(1) { animation-delay: -0.32s; }
.dot-spinner-simple div:nth-child(2) { animation-delay: -0.16s; }
.error-message.small-inline-error { font-size: 0.8rem; color: var(--gov-danger-red); padding: 0.4rem; text-align: center; }
.placeholder-text { text-align: center; padding: 2rem 1rem; color: var(--gov-text-secondary); border: 1px dashed var(--gov-border-color-strong); border-radius: var(--gov-border-radius); background-color: var(--gov-background-white); margin: 1rem auto; } /* margin: auto; */
.placeholder-icon-large { font-size: 3rem; color: var(--gov-border-color-strong); margin-bottom: 0.8rem; }
.placeholder-text p { font-size: 1.05rem; font-weight: 500; margin-bottom: 0.4rem; color: var(--gov-text-primary); }
.placeholder-text span { font-size: 0.9rem; }

.btn { padding: 0.4rem 0.8rem; font-size: 0.85rem; border-radius: var(--gov-border-radius); border: 1px solid transparent; cursor: pointer; transition: var(--gov-transition-default); font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 0.3rem;}
.btn-primary { background-color: var(--gov-primary-red); border-color: var(--gov-primary-red); color: var(--gov-background-white); }
.btn-primary:hover:not(:disabled) { background-color: var(--gov-primary-red-dark); border-color: var(--gov-primary-red-dark); }
.btn-primary:disabled { background-color: var(--gov-primary-red-light); border-color: var(--gov-primary-red-light); opacity: 0.7; cursor: not-allowed; }
.btn-secondary { background-color: var(--gov-secondary-gray); border-color: var(--gov-secondary-gray); color: var(--gov-background-white); }
.btn-secondary:hover:not(:disabled) { background-color: #5a6268; border-color: #545b62; }
.btn-icon { background: transparent; border: none; cursor: pointer; padding: 0.3rem; line-height: 1; border-radius: 50%; width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center; transition: var(--gov-transition-default); color: var(--gov-text-secondary); }
.btn-icon:hover { background-color: rgba(0,0,0,0.05); color: var(--gov-text-primary); }

.note-list-anim-enter-active, .note-list-anim-leave-active { transition: opacity 0.3s ease-out, transform 0.3s ease-out; }
.note-list-anim-enter-from, .note-list-anim-leave-to { opacity: 0; transform: translateY(15px); }
.note-list-anim-move { transition: transform 0.3s ease-out; }


/* --- ADDED/MODIFIED: Modal Specific Styles --- */
.notes-modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.6); /* Semi-transparent black overlay */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1050; /* Ensure modal is on top of other content */
  padding: 1rem; /* Padding for smaller screens, content will be constrained by max-width */
}

.notes-modal-content {
  /* Uses .card styles already: background, border, border-radius, shadow, display:flex, flex-direction:column */
  width: 100%;
  max-width: 700px; /* Max width of the modal */
  max-height: 90vh; /* Max height relative to viewport */
  overflow: hidden; /* Let card-body handle internal scrolling */
  border-top: 3px solid var(--gov-accent-blue); /* Accent for edit modal */
}

.notes-modal-content .card-header {
  /* Existing styles for card-header are fine */
  /* Ensure close button is properly styled and positioned */
}

.notes-modal-close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--gov-text-secondary);
  cursor: pointer;
  padding: 0 0.5rem;
  line-height: 1;
}
.notes-modal-close-btn:hover {
  color: var(--gov-text-primary);
}

.notes-modal-content .card-body {
  /* Existing styles for card-body are fine:
     padding, display:flex, flex-direction:column, flex-grow:1, min-height:0, overflow:hidden
     This setup makes the .notes-editor-modal-form inside it expand correctly.
  */
  overflow-y: auto; /* If the form itself (excluding editor) gets too tall */
}

/* Ensure the editor inside the modal also uses a good min-height */
.notes-modal-content .notes-tiptap-editor-wrapper {
  min-height: 250px; /* Or adjust as needed for modal context */
}
/* --- END: Modal Specific Styles --- */


@media (max-width: 767.98px) {
  /* [EXISTING MEDIA QUERIES from your original post - keep them] */
  /* ... (all your existing responsive styles) ... */
  .notes-layout-grid {
    padding-left: 0.5rem; 
    padding-right: 0.5rem;
    padding-bottom: 1rem;
    gap: 1rem;
  }
  .card-body { padding: 0.8rem; } 
  .tiptap-toolbar { padding: 0.4rem; gap: 0.2rem;}
  .tiptap-toolbar button { padding: 0.3rem 0.5rem; font-size: 0.75rem; min-width: 26px;}
  .tiptap-toolbar-color-picker { width: 24px; height: 24px; }
  :deep(.ProseMirror) { padding: 0.6rem 0.8rem; font-size: 0.85rem; }
  .notes-tiptap-editor-wrapper, :deep(.ProseMirror) { min-height: 180px; } /* This applied to creator, keep */
  .all-notes-list { min-height: 150px; }
  .note-list-item { padding: 0.8rem; flex-direction: column; align-items: stretch;}
  .note-item-actions { align-self: flex-end; margin-left:0; margin-top: 0.4rem; opacity: 0.8;}
  .note-list-content.rich-content {
     max-height: 120px; 
     font-size: 0.8rem;
     /* padding: 0.5rem 0.6rem; -- Re-evaluating this as parent has padding */
  }
  .card-header h2 { font-size: 1.05rem; }
  .section-header { padding: 1rem var(--content-padding, 0.5rem); margin-bottom: 1.5rem; }
  .section-header h1 {font-size: 1.5rem;} .header-icon {font-size:1.3rem;}

  /* Adjust modal for smaller screens */
  .notes-modal-content {
    max-width: 95%;
    max-height: 90vh;
  }
  .notes-modal-content .notes-tiptap-editor-wrapper {
    min-height: 200px; /* Adjust editor height in modal for small screens */
  }
  .notes-modal-content .card-body {
    padding: 0.8rem; /* Consistent padding */
  }
   .notes-actions { /* Modal actions on small screens */
    padding-top: 0.8rem;
    gap: 0.5rem;
  }
  .notes-actions .btn {
    padding: 0.5rem 0.8rem; /* Slightly larger buttons for touch */
    font-size: 0.8rem;
  }
}
</style>