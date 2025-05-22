// src/stores/noteStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient.js';

export const useNoteStore = defineStore('notes', () => {
  // --- State ---
  const notesList = ref([]);
  const isLoading = ref(false); // For loading all notes
  const error = ref(null); // General error for loading/deleting

  const isCreating = ref(false);
  const createError = ref(null);

  // --- >>> ADDED FOR EDITING <<< ---
  const isUpdating = ref(false); // For updating a note
  const updateError = ref(null); // Specific error for update process
  // --- >>> END ADDED FOR EDITING <<< ---

  // --- Getters ---
  const allNotesSorted = computed(() => {
    return [...notesList.value].sort((a, b) => {
        // Handle cases where timestamp might be null or undefined, or not a comparable type
        const tsA = typeof a.timestamp === 'string' || typeof a.timestamp === 'number' ? new Date(a.timestamp).getTime() : 0;
        const tsB = typeof b.timestamp === 'string' || typeof b.timestamp === 'number' ? new Date(b.timestamp).getTime() : 0;
        return tsB - tsA; // Newest first
    });
  });

  // --- Actions ---

  function setCreateErrorManual(errorMessage) {
    createError.value = errorMessage;
  }

  // --- >>> ADDED FOR EDITING <<< ---
  /**
   * Sets or clears the manual update error message.
   * @param {string | null} errorMessage - The error message string, or null to clear.
   */
  function setUpdateErrorManual(errorMessage) {
    updateError.value = errorMessage;
  }
  // --- >>> END ADDED FOR EDITING <<< ---

  async function loadAllNotes(forceReload = false) {
    if (isLoading.value && !forceReload) return;
    isLoading.value = true;
    error.value = null;
    // createError.value = null; // Resetting here might clear a pending creation error message
    // updateError.value = null; // Resetting here might clear a pending update error message

    try {
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

    try {
       const dataToSend = {
           content: noteData.content,
           noteKey: noteData.noteKey || 'general',
           // Timestamp is usually set by backend via @PrePersist or similar
       };
      const response = await apiClient.post('/notes', dataToSend);

      // Efficient update: add the new note (returned by API) to the local list
      if (response.data && response.data.id) {
        notesList.value.unshift(response.data); // Add to beginning for newest first assumption
        console.log('New note created and added to local list:', response.data);
      } else {
        // Fallback if API doesn't return the created item
        await loadAllNotes(true);
        console.log('New note created via API. List reloaded (fallback).');
      }
      return true;
    } catch (err) {
      console.error('Error creating note via API:', err);
       const backendError = err.response?.data?.message || err.message || '未知网络错误';
       createError.value = `创建笔记失败: ${backendError}`;
      return false;
    } finally {
      isCreating.value = false;
    }
  }

  // --- >>> ADDED FOR EDITING <<< ---
  async function updateNote(noteId, noteDetails) {
    if (!noteId || !noteDetails || !noteDetails.content || !noteDetails.content.trim()) {
        updateError.value = '笔记内容不能为空！';
        return false;
    }
    isUpdating.value = true;
    updateError.value = null;

    try {
      // Ensure we don't send 'id' or 'timestamp' in the body if backend auto-manages them on update
      const dataToSend = {
        content: noteDetails.content,
        noteKey: noteDetails.noteKey || 'general',
        // Other editable fields like 'title' if your NoteEntity has it
      };

      const response = await apiClient.put(`/notes/${noteId}`, dataToSend);
      console.log(`Note with id ${noteId} updated via API. Response:`, response.data);

      // Efficient update: find and replace the note in the local list
      const index = notesList.value.findIndex(note => note.id === noteId);
      if (index !== -1 && response.data && response.data.id) {
        // Replace with the item returned from the server, as it might have updated timestamp or other fields
        notesList.value.splice(index, 1, response.data);
      } else {
        // Fallback if local item not found or API response is not as expected
        console.warn(`Could not find note ${noteId} in local list for update, or API response was unexpected. Reloading all notes.`);
        await loadAllNotes(true);
      }
      return true;
    } catch (err) {
      console.error(`Error updating note with id ${noteId}:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      updateError.value = `更新笔记失败: ${backendError}`;
      return false;
    } finally {
      isUpdating.value = false;
    }
  }
  // --- >>> END ADDED FOR EDITING <<< ---

  async function deleteNote(noteId) {
      error.value = null;
      let success = false;
      // Consider adding isDeleting state: isDeleting.value = true;

      try {
          await apiClient.delete(`/notes/${noteId}`);
          console.log(`Note with id ${noteId} deleted via API.`);
          const index = notesList.value.findIndex(note => note.id === noteId);
          if (index !== -1) {
            notesList.value.splice(index, 1);
          } else {
            await loadAllNotes(true); // Fallback
          }
          success = true;
      } catch (err) {
          console.error(`Error deleting note with id ${noteId}:`, err);
          const backendError = err.response?.data?.message || err.message || '未知网络错误';
          error.value = `删除笔记失败: ${backendError}`;
          success = false;
      } finally {
          // if using isDeleting: isDeleting.value = false;
      }
      return success;
  }

  loadAllNotes();

  return {
    // State
    notesList,
    isLoading,
    error,
    isCreating,
    createError,
    isUpdating, // <<< Expose new state
    updateError, // <<< Expose new state

    // Getters
    allNotesSorted,

    // Actions
    loadAllNotes,
    createNote,
    updateNote, // <<< Expose new action
    deleteNote,
    setCreateErrorManual,
    setUpdateErrorManual, // <<< Expose new action
  };
});