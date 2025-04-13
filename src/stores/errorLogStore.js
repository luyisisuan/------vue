// src/stores/errorLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/errors';
const API_FILE_UPLOAD_URL = 'http://localhost:8080/api/files/upload';

export const useErrorLogStore = defineStore('errorLog', () => {
  // --- State ---
  const errors = ref([]); // 错题列表
  const isLoading = ref(false); // 加载列表状态
  const error = ref(null);     // 加载/删除/标记复习错误
  const currentFilter = ref(null); // 当前筛选科目 (null 或 'all' 表示全部)
  const isAdding = ref(false);     // 标记整个添加过程 (实体创建+上传)
  const isUploading = ref(false); // 标记文件上传过程
  const addErrorState = ref(null); // 添加操作 specific 错误

  // --- Getters ---
  // 计算属性：根据当前筛选条件过滤错题列表
  const filteredErrors = computed(() => {
    const currentErrors = errors.value || []; // 确保是数组
    if (!currentFilter.value || currentFilter.value === 'all') {
      return currentErrors; // 返回所有（后端已按时间倒序）
    }
    // 在前端进行二次筛选 (如果 loadErrors 没有按 filter 加载)
    // 如果 loadErrors 总是加载正确的列表，可以直接返回 currentErrors
    return currentErrors.filter(e => e.subject && e.subject.toLowerCase() === currentFilter.value.toLowerCase());
  });

  // 计算属性：错题总数
  const errorCount = computed(() => errors.value.length);

  // 计算属性：获取所有不重复的科目用于筛选下拉框
  const availableSubjects = computed(() => {
      const subjects = new Set(errors.value.map(e => e.subject).filter(Boolean)); // 过滤掉 null 或 undefined 的科目
      return ['all', ...Array.from(subjects).sort()]; // 添加 'all' 选项并排序
  });


  // --- Actions ---

  /**
   * 从后端 API 加载错题记录
   * @param {string | null} filterSubject 要筛选的科目，null 或 'all' 表示加载全部
   */
  async function loadErrors(filterSubject = null) {
    currentFilter.value = filterSubject; // 更新当前筛选状态
    isLoading.value = true;
    error.value = null; // 清除旧的加载错误
    addErrorState.value = null; // 清除旧的添加错误

    let requestUrl = API_BASE_URL;
    const params = {};
    if (filterSubject && filterSubject !== 'all') {
        params.subject = filterSubject; // 添加查询参数
    }

    try {
      const response = await axios.get(requestUrl, { params });
      if (Array.isArray(response.data)) {
          errors.value = response.data; // 更新错题列表 (后端应返回按时间倒序)
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
      errors.value = []; // 清空列表
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * 添加新的错题记录，并可选地上传关联文件。
   * @param {object} errorData 包含错题信息的对象 (不含 ID, timestamp, file object)
   * @param {File | null} fileToUpload 要上传的文件对象，或 null
   * @returns {Promise<boolean>} 操作是否完全成功
   */
  async function addError(errorData, fileToUpload = null) {
    isAdding.value = true; // 标记整个添加过程开始
    isUploading.value = false;
    error.value = null; // 清除旧的加载错误
    addErrorState.value = null; // 清除旧的添加错误

    let createdEntry = null; // 保存创建后的完整对象
    let success = false;

    try {
      // 1. 先创建错题实体
      const dataToSend = { ...errorData }; // 复制数据

      const response = await axios.post(API_BASE_URL, dataToSend);
      createdEntry = response.data; // 保存返回的实体
      console.log('Error log entry created via API:', createdEntry);

      // 2. 如果有文件需要上传，并且实体创建成功
      if (fileToUpload && createdEntry?.id) {
        console.log(`Uploading file for error entry ID: ${createdEntry.id}`);
        isUploading.value = true; // 标记文件上传开始
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('type', 'error');
        formData.append('entityId', createdEntry.id.toString());

        // 发送文件上传请求
        const uploadResponse = await axios.post(API_FILE_UPLOAD_URL, formData, {
          // headers: { 'Content-Type': 'multipart/form-data' } // Axios 通常会自动设置
        });
        console.log('File uploaded successfully:', uploadResponse.data);

        // 更新内存中刚创建的对象的 imageFile 字段
        if (uploadResponse.data.fileIdentifier) {
             createdEntry.imageFile = uploadResponse.data.fileIdentifier;
        } else {
             console.warn("File upload API did not return a fileIdentifier.");
             // 可以选择是否将此视为错误
        }
        isUploading.value = false; // 文件上传结束
      }

      // 3. **MODIFIED:** 将最终的错题对象添加到本地列表开头
      if (createdEntry) {
          errors.value.unshift(createdEntry); // 添加到数组
          console.log("Added new error entry to local state:", createdEntry);
      }

      success = true; // 整个流程成功

    } catch (err) {
      console.error('Error adding error log or uploading file:', err);
      const backendError = err.response?.data || err.message || '未知错误';
      // 区分错误来源
      if (isUploading.value) { // 如果错误发生在上传阶段
          addErrorState.value = `文件上传失败: ${backendError}`;
      } else { // 如果错误发生在创建实体阶段
          addErrorState.value = `添加错题记录失败: ${backendError}`;
      }
      error.value = addErrorState.value; // 同时设置通用错误状态
      success = false;
    } finally {
      isAdding.value = false; // 整个添加过程结束
      isUploading.value = false; // 确保上传状态重置
    }
    return success;
  }

  /**
   * 标记错题为已复习
   * @param {number} id 错题 ID
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function markAsReviewed(id) {
    error.value = null; // 清除旧错误
    const errorIndex = errors.value.findIndex(e => e.id === id);
    if (errorIndex === -1) {
        console.warn(`Error log with id ${id} not found locally for reviewing.`);
        return false;
    }

    try {
      // 发送 PATCH 请求到 /api/errors/{id}/review
      const response = await axios.patch(`${API_BASE_URL}/${id}/review`);
      // 使用后端返回的最新数据更新本地对应的错题对象
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

  /**
   * 删除错题记录 (包括尝试删除关联文件 - 需要后端支持)
   * @param {number} id 错题 ID
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function deleteError(id) {
    isLoading.value = true; // 标记删除操作进行中
    error.value = null;
    let fileIdentifierToDelete = null;

    // 先在本地查找文件标识符
    const errorToDelete = errors.value.find(e => e.id === id);
    if (errorToDelete && errorToDelete.imageFile) {
        fileIdentifierToDelete = errorToDelete.imageFile;
    }

    try {
        // 调用后端 API 删除错题记录
        await axios.delete(`${API_BASE_URL}/${id}`);
        console.log(`Error log with id ${id} removed via API.`);

        // **重要:** 后端应该在删除记录的同时删除关联的文件。
        // 前端这里不需要（也不应该）直接调用文件删除 API。
        if (fileIdentifierToDelete) {
             console.info(`Deletion requested for error log ${id}. Associated file ${fileIdentifierToDelete} should be handled by the backend.`);
        }

        // 从本地列表中移除
        errors.value = errors.value.filter(e => e.id !== id);
        return true; // 表示删除数据库记录成功

    } catch (err) {
      console.error(`Error removing error log with id ${id}:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `删除错题失败: ${backendError}`;
      return false;
    } finally {
      isLoading.value = false; // 删除操作结束
    }
  }

  // --- Initialization ---
  loadErrors(); // 初始化时加载所有错题（无筛选）

  // --- Expose ---
  return {
    // State
    errors,
    isLoading,
    error,
    currentFilter,
    isAdding, // 可以用来禁用添加按钮或显示整体添加状态
    isUploading,
    addErrorState, // 添加操作的特定错误
    // Getters
    filteredErrors,
    errorCount,
    availableSubjects,
    // Actions
    loadErrors,
    addError,
    markAsReviewed,
    deleteError,
  };
});