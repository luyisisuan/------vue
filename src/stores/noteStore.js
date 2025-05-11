// src/stores/noteStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉

// <<< 不再需要 API_BASE_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/notes';

export const useNoteStore = defineStore('notes', () => {
  // --- State ---
  const notesList = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const isCreating = ref(false);
  const createError = ref(null);

  // --- Getters ---
  const allNotesSorted = computed(() => notesList.value);

  // --- Actions ---
  async function loadAllNotes() {
    isLoading.value = true;
    error.value = null;
    createError.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /notes >>>
      const response = await apiClient.get('/notes');
      if (Array.isArray(response.data)) {
          notesList.value = response.data;
          console.log(`Loaded ${notesList.value.length} notes from API.`);
      } else {
           notesList.value = [];
           error.value = '加载笔记数据格式错误。';
           console.error("Invalid data format received for notes list:", response.data);
      }
    } catch (err) {
      notesList.value = [];
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载笔记: ${backendError}`;
      console.error('Error loading notes:', err);
    } finally {
      isLoading.value = false;
    }
  }

  async function createNote(noteData) {
    if (!noteData || !noteData.content || !noteData.content.trim()) {
        createError.value = '笔记内容不能为空！';
        return false;
    }
    isCreating.value = true;
    createError.value = null;
    error.value = null;

    try {
       const dataToSend = {
           content: noteData.content,
           noteKey: noteData.noteKey || 'general',
       };
      // <<< 使用 apiClient 和相对路径 /notes >>>
      // 注意：原代码是发送请求后重新加载列表，这里保持不变。
      // 另一种方式是接收后端返回的新笔记对象并 unshift 到列表。
      await apiClient.post('/notes', dataToSend);
      await loadAllNotes(); // 重新加载列表
      console.log('New note created via API. List reloaded.');
      return true;
    } catch (err) {
      console.error('Error creating note via API:', err);
       const backendError = err.response?.data?.message || err.message || '未知网络错误'; // 获取更具体的错误
       createError.value = `创建笔记失败: ${backendError}`;
       error.value = createError.value; // 可以同时设置通用错误
      return false;
    } finally {
      isCreating.value = false;
    }
  }

  async function deleteNote(noteId) {
      // isLoading.value = true; // 可以考虑使用 isDeleting 状态
      error.value = null;
      createError.value = null;
      let success = false;
      try {
          // <<< 使用 apiClient 和相对路径 /notes/{id} >>>
          await apiClient.delete(`/notes/${noteId}`);
          console.log(`Note with id ${noteId} deleted via API.`);
          // 同样，删除后重新加载列表
          await loadAllNotes();
          success = true;
      } catch (err) {
          console.error(`Error deleting note with id ${noteId}:`, err);
          const backendError = err.response?.data?.message || err.message || '未知网络错误';
          error.value = `删除笔记失败: ${backendError}`;
          success = false;
      } finally {
          // isLoading.value = false; // isDeleting = false;
      }
      return success;
  }


  // --- Initialization ---
  loadAllNotes();

  // --- Expose ---
  return {
    notesList, isLoading, error, isCreating, createError,
    allNotesSorted,
    loadAllNotes, createNote, deleteNote
  };
});