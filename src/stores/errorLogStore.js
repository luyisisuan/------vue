// src/stores/errorLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉

// <<< 不再需要 API_BASE_URL 和 API_FILE_UPLOAD_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/errors';
// const API_FILE_UPLOAD_URL = 'http://localhost:8080/api/files/upload';

export const useErrorLogStore = defineStore('errorLog', () => {
  // --- State ---
  const errors = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const currentFilter = ref(null);
  const isAdding = ref(false);
  const isUploading = ref(false);
  const addErrorState = ref(null);

  // --- Getters ---
  const filteredErrors = computed(() => {
    const currentErrors = errors.value || [];
    if (!currentFilter.value || currentFilter.value === 'all') {
      return currentErrors;
    }
    return currentErrors.filter(e => e.subject && e.subject.toLowerCase() === currentFilter.value.toLowerCase());
  });

  const errorCount = computed(() => errors.value.length);

  const availableSubjects = computed(() => {
      const subjects = new Set(errors.value.map(e => e.subject).filter(Boolean));
      return ['all', ...Array.from(subjects).sort()];
  });


  // --- Actions ---
  async function loadErrors(filterSubject = null) {
    currentFilter.value = filterSubject;
    isLoading.value = true;
    error.value = null;
    addErrorState.value = null;

    // <<< 使用相对路径 /errors >>>
    const requestPath = '/errors';
    const params = {};
    if (filterSubject && filterSubject !== 'all') {
        params.subject = filterSubject;
    }

    try {
      // <<< 使用 apiClient >>>
      const response = await apiClient.get(requestPath, { params });
      if (Array.isArray(response.data)) {
          errors.value = response.data;
          console.log(`Loaded ${errors.value.length} error logs from API (filter: ${filterSubject || 'all'}).`);
      } else {
           console.error("Invalid data format received for error logs:", response.data);
           errors.value = [];
           error.value = '加载错题数据格式错误。';
      }
    } catch (err) {
      console.error('Error loading error logs from API:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载错题记录: ${backendError}`;
      errors.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function addError(errorData, fileToUpload = null) {
    isAdding.value = true;
    isUploading.value = false;
    error.value = null;
    addErrorState.value = null;

    let createdEntry = null;
    let success = false;

    try {
      const dataToSend = { ...errorData };
      // <<< 使用 apiClient 和相对路径 /errors >>>
      const response = await apiClient.post('/errors', dataToSend);
      createdEntry = response.data;
      console.log('Error log entry created via API:', createdEntry);

      if (fileToUpload && createdEntry?.id) {
        console.log(`Uploading file for error entry ID: ${createdEntry.id}`);
        isUploading.value = true;
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('type', 'error');
        formData.append('entityId', createdEntry.id.toString());

        // <<< 使用 apiClient 和相对路径 /files/upload >>>
        const uploadResponse = await apiClient.post('/files/upload', formData, {
           // 如果需要，可以为文件上传设置不同的 headers，但通常 apiClient 默认的 Content-Type 会被 FormData 覆盖
           // headers: { 'Content-Type': 'multipart/form-data' }
        });
        console.log('File uploaded successfully:', uploadResponse.data);

        if (uploadResponse.data.fileIdentifier) {
             createdEntry.imageFile = uploadResponse.data.fileIdentifier;
        } else {
             console.warn("File upload API did not return a fileIdentifier.");
        }
        isUploading.value = false;
      }

      if (createdEntry) {
          // 更新本地列表（unshift 或 push 取决于希望新条目在哪）
          // 如果列表是从 loadErrors 加载的，可能需要重新调用 loadErrors 或确保排序正确
          errors.value.unshift(createdEntry); // 假设希望新条目在最前面
          console.log("Added new error entry to local state:", createdEntry);
      }
      success = true;

    } catch (err) {
      console.error('Error adding error log or uploading file:', err);
      // 注意：需要解析 AxiosError 的结构来获取后端返回的详细错误信息
      let backendError = '未知错误';
      if (err.response) {
        // 请求已发出，服务器用状态码响应 (非 2xx)
        backendError = err.response.data?.message || JSON.stringify(err.response.data) || err.response.statusText;
      } else if (err.request) {
        // 请求已发出，但没有收到响应
        backendError = '无法连接到服务器，请检查网络。';
      } else {
        // 设置请求时触发了一个错误
        backendError = err.message;
      }

      if (isUploading.value) { // 标记错误来源
          addErrorState.value = `文件上传失败: ${backendError}`;
      } else {
          addErrorState.value = `添加错题记录失败: ${backendError}`;
      }
      error.value = addErrorState.value; // 同时设置通用错误
      success = false;
    } finally {
      isAdding.value = false;
      isUploading.value = false;
    }
    return success;
  }


  async function markAsReviewed(id) {
    error.value = null;
    const errorIndex = errors.value.findIndex(e => e.id === id);
    if (errorIndex === -1) {
        console.warn(`Error log with id ${id} not found locally for reviewing.`);
        return false;
    }

    try {
      // <<< 使用 apiClient 和相对路径 /errors/{id}/review >>>
      const response = await apiClient.patch(`/errors/${id}/review`);
      errors.value[errorIndex] = response.data;
      console.log('Error log marked as reviewed via API:', response.data);
      return true;
    } catch (err) {
      console.error('Error marking error log as reviewed via API:', err);
      const backendError = err.response?.data?.message || err.message || '未知错误';
      error.value = `标记复习失败: ${backendError}`;
      return false;
    }
  }


  async function deleteError(id) {
    // isLoading.value = true; // 可以考虑使用 isDeleting 状态
    error.value = null;
    // 查找文件标识符逻辑保持不变
    const errorToDelete = errors.value.find(e => e.id === id);
    const fileIdentifierToDelete = errorToDelete?.imageFile;

    try {
        // <<< 使用 apiClient 和相对路径 /errors/{id} >>>
        await apiClient.delete(`/errors/${id}`);
        console.log(`Error log with id ${id} removed via API.`);

        if (fileIdentifierToDelete) {
             console.info(`Deletion requested for error log ${id}. Associated file ${fileIdentifierToDelete} should be handled by the backend.`);
        }

        errors.value = errors.value.filter(e => e.id !== id);
        return true;

    } catch (err) {
      console.error(`Error removing error log with id ${id}:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `删除错题失败: ${backendError}`;
      return false;
    } finally {
      // isLoading.value = false;
    }
  }

  // --- Initialization ---
  loadErrors();

  // --- Expose ---
  return {
    errors, isLoading, error, currentFilter, isAdding, isUploading,
    addErrorState, filteredErrors, errorCount, availableSubjects,
    loadErrors, addError, markAsReviewed, deleteError,
  };
});