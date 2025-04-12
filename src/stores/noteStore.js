// src/stores/noteStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
// 移除不再需要的导入
// import { throttle } from 'lodash-es';

// 修改 API 基础 URL（如果 Controller 的 @RequestMapping 变了，但这里没变）
const API_BASE_URL = 'http://localhost:8080/api/notes';

export const useNoteStore = defineStore('notes', () => {
  // --- State ---
  // **MODIFIED:** 存储 NoteEntry 对象列表
  const notesList = ref([]);
  const isLoading = ref(false);
  const error = ref(null); // 用于加载错误
  // **MODIFIED:** 移除 isSaving 和 saveError，改为 create 状态
  const isCreating = ref(false);
  const createError = ref(null);

  // --- Getters ---
  // **MODIFIED:** Getter 获取所有笔记列表 (后端已排序)
  const allNotesSorted = computed(() => notesList.value);

  // **REMOVED:** 移除 getNoteContent 和 getNoteEntry，因为不再按 key 获取单个笔记用于编辑
  // const getNoteContent = computed(() => { ... });
  // const getNoteEntry = computed(() => { ... });

  // --- Actions ---

  // **MODIFIED:** 从后端加载所有笔记 (后端已排序)
  async function loadAllNotes() {
    isLoading.value = true;
    error.value = null;
    try {
      // GET /api/notes
      const response = await axios.get(API_BASE_URL);
      if (Array.isArray(response.data)) {
          notesList.value = response.data; // 直接使用后端返回的列表
          console.log(`Loaded ${notesList.value.length} notes from API.`);
      } else {
           console.error("Invalid data format received for notes list:", response.data);
           notesList.value = [];
           error.value = '加载笔记数据格式错误。';
      }
    } catch (err) {
      console.error('Error loading notes:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载笔记: ${backendError}`;
      notesList.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // **MODIFIED:** 创建新的笔记记录
  async function createNote(noteData) { // 接收包含 content 和可选 noteKey 的对象
    // 基础验证
    if (!noteData || !noteData.content || !noteData.content.trim()) {
        createError.value = '笔记内容不能为空！';
        console.warn('Attempted to create note with empty content.');
        return false; // 失败
    }

    isCreating.value = true; // 标记正在创建
    createError.value = null; // 清除旧错误
    error.value = null; // 清除加载错误

    try {
      // 准备发送的数据 (后端会处理 ID 和 timestamp)
       const dataToSend = {
           content: noteData.content,
           noteKey: noteData.noteKey || 'general', // 如果没有提供key，默认为 general
       };

      // 发送 POST 请求到 /api/notes
      const response = await axios.post(API_BASE_URL, dataToSend);

      // 创建成功后，将新笔记添加到列表开头 (因为后端返回的是倒序)
      notesList.value.unshift(response.data);
      console.log('New note created via API:', response.data);
      return true; // 成功
    } catch (err) {
      console.error('Error creating note via API:', err);
       const backendError = err.response?.data || err.message || '未知网络错误';
       createError.value = `创建笔记失败: ${backendError}`;
       error.value = createError.value; // 同时设置全局错误
      return false; // 失败
    } finally {
      isCreating.value = false; // 创建结束
    }
  }

  // **REMOVED:** 移除 saveNoteThrottled 和 saveNote

  // --- Initialization ---
  loadAllNotes(); // 初始化时加载所有笔记

  // --- Expose ---
  return {
    // State
    notesList, // 暴露列表给显示区
    isLoading,
    error,
    isCreating, // 暴露创建状态
    createError, // 暴露创建错误
    // Getters
    allNotesSorted, // 暴露排序后的列表
    // Actions
    loadAllNotes,
    createNote, // 暴露创建笔记的 action
  };
});