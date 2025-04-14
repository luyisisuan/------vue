// src/stores/noteStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/notes'; // 确认 API 基础路径

export const useNoteStore = defineStore('notes', () => {
  // --- State ---
  const notesList = ref([]); // 存储 NoteEntry 对象列表
  const isLoading = ref(false); // 加载列表状态
  const error = ref(null);     // 加载/删除错误
  const isCreating = ref(false); // 创建/保存状态
  const createError = ref(null); // 创建/保存错误

  // --- Getters ---
  // Getter 获取所有笔记列表 (后端已排序)
  const allNotesSorted = computed(() => notesList.value);

  // --- Actions ---

  /**
   * 从后端加载所有笔记 (后端已按时间戳降序排列)
   */
  async function loadAllNotes() {
    isLoading.value = true;
    error.value = null;
    createError.value = null; // Clear previous create errors on load
    try {
      const response = await axios.get(API_BASE_URL);
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

  /**
   * 创建一条新的笔记记录
   * @param {object} noteData 包含 content 和可选 noteKey
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function createNote(noteData) {
    if (!noteData || !noteData.content || !noteData.content.trim()) {
        createError.value = '笔记内容不能为空！';
        return false;
    }
    isCreating.value = true;
    createError.value = null;
    error.value = null; // Clear general load error

    try {
       const dataToSend = {
           content: noteData.content,
           noteKey: noteData.noteKey || 'general', // Default key if needed
       };
      // 发送 POST 请求
      const response = await axios.post(API_BASE_URL, dataToSend);
      // **重要:** 创建成功后，不再手动 unshift，而是重新加载整个列表
      // 这样可以确保获取到最新的、包含所有笔记（包括刚添加的）且由后端排序的列表
      await loadAllNotes(); // <<< 重新加载列表
      console.log('New note created via API. List reloaded.');
      return true;
    } catch (err) {
      console.error('Error creating note via API:', err);
       const backendError = err.response?.data || err.message || '未知网络错误';
       createError.value = `创建笔记失败: ${backendError}`;
       error.value = createError.value;
      return false;
    } finally {
      isCreating.value = false;
    }
  }

  /**
   * **ADDED:** 删除指定 ID 的笔记记录
   * @param {number} noteId 要删除的笔记 ID
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function deleteNote(noteId) {
      isLoading.value = true; // Use general loading indicator for deletion
      error.value = null;
      createError.value = null; // Clear create error as well
      let success = false;
      try {
          // 发送 DELETE 请求
          await axios.delete(`${API_BASE_URL}/${noteId}`);
          console.log(`Note with id ${noteId} deleted via API.`);
          // **重要:** 删除成功后，也重新加载列表以反映变化
          await loadAllNotes(); // <<< 重新加载列表
          success = true;
      } catch (err) {
          console.error(`Error deleting note with id ${noteId}:`, err);
          const backendError = err.response?.data?.message || err.message || '未知网络错误';
          // 可以设置一个特定的删除错误状态，或者就用通用的 error
          error.value = `删除笔记失败: ${backendError}`;
          success = false;
      } finally {
          isLoading.value = false;
      }
      return success;
  }


  // --- Initialization ---
  loadAllNotes(); // 初始化时加载所有笔记

  // --- Expose ---
  return {
    // State & Getters for UI
    notesList,      // 原始列表 (如果需要)
    isLoading,
    error,          // 通用错误状态
    isCreating,     // 创建状态
    createError,    // 创建错误状态
    allNotesSorted, // 排序后的列表 getter
    // Actions
    loadAllNotes,
    createNote,
    deleteNote     // <<< 暴露删除 action
  };
});