// src/stores/knowledgeStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉

import config from '@/config.js'; // 保留用于获取分类

// <<< 不再需要 API_BASE_URL 和 API_FILE_UPLOAD_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/knowledge';
// const API_FILE_UPLOAD_URL = 'http://localhost:8080/api/files/upload';

export const useKnowledgeStore = defineStore('knowledgeBase', () => {
  // --- State ---
  const items = ref([]);
  const isLoading = ref(false); // 列表加载状态
  const error = ref(null);      // 通用错误状态
  const currentFilterCategory = ref(null);
  const currentSearchTerm = ref('');
  const isAdding = ref(false);      // 添加操作状态 (包括可能的文件上传)
  const isUploading = ref(false);   // 文件上传子状态
  const addErrorState = ref(null);  // 添加操作特定错误
  const uploadError = ref(null);    // 上传特定错误 (冗余，可以用 addErrorState 区分)

  // --- Getters ---
  const filteredItems = computed(() => items.value);

  const availableCategories = computed(() => {
      const categoriesFromItems = new Set(items.value.map(item => item.category).filter(Boolean));
      const predefinedCategories = config.knowledgeBaseCategories || [];
      const allCategories = [...new Set([...predefinedCategories, ...categoriesFromItems])];
      return ['all', ...allCategories.sort()];
  });

  const itemCount = computed(() => items.value.length);

  // --- Actions ---
  async function loadItems(category = null, searchTerm = '') {
     currentFilterCategory.value = category;
     currentSearchTerm.value = searchTerm;
     isLoading.value = true;
     error.value = null;
     addErrorState.value = null;
     uploadError.value = null;
     const params = {};
     if (category && category !== 'all') { params.category = category; }
     if (typeof searchTerm === 'string' && searchTerm.trim()) { params.search = searchTerm.trim(); }

     try {
       // <<< 使用 apiClient 和相对路径 /knowledge >>>
       const response = await apiClient.get('/knowledge', { params });
        if (Array.isArray(response.data)) {
            items.value = response.data;
            console.log(`Loaded ${items.value.length} knowledge items from API.`);
        } else {
             console.error("Invalid data format for knowledge items:", response.data);
             items.value = [];
             error.value = '加载知识库数据格式错误。';
        }
     } catch (err) {
       console.error('Error loading knowledge items from API:', err);
       const backendError = err.response?.data?.message || err.message || '未知网络错误';
       error.value = `无法加载知识库条目: ${backendError}`;
       items.value = [];
     } finally {
       isLoading.value = false;
     }
  }

  // **保持原有 addItem 逻辑，但使用 apiClient**
  async function addItem(itemData, fileToUpload = null) {
    isAdding.value = true;
    isUploading.value = false;
    error.value = null;
    addErrorState.value = null;
    uploadError.value = null;

    let createdItem = null;
    let success = false;

    try {
        if (!itemData || !itemData.title || !itemData.category || !itemData.content) {
            throw new Error('请填写标题、分类和内容！');
        }

        const dataToSend = { ...itemData, tags: itemData.tags || [] };
        delete dataToSend.id;
        delete dataToSend.timestamp;
        // 在创建时不发送 linkedFile，或者发送原始文件名（取决于后端处理方式）
        // dataToSend.linkedFile = null; // 或保留原始文件名： itemData.linkedFile

        // <<< 使用 apiClient 和相对路径 /knowledge >>>
        const response = await apiClient.post('/knowledge', dataToSend);
        createdItem = response.data;
        console.log('Knowledge item entry created via API:', createdItem);

        if (fileToUpload && createdItem?.id) {
            console.log(`Uploading file for knowledge item ID: ${createdItem.id}`);
            isUploading.value = true; // 标记开始上传
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('type', 'knowledge');
            formData.append('entityId', createdItem.id.toString());

            // <<< 使用 apiClient 和相对路径 /files/upload >>>
            const uploadResponse = await apiClient.post('/files/upload', formData);
            console.log('File uploaded successfully:', uploadResponse.data);

            if (uploadResponse.data.fileIdentifier) {
                // 更新刚创建的对象的 linkedFile (重要：这是内存中的对象)
                createdItem.linkedFile = uploadResponse.data.fileIdentifier;
                // **可选但推荐:** 可以考虑再次调用后端 API (PATCH /knowledge/{id})
                // 将 fileIdentifier 保存到数据库对应记录中，确保数据一致性。
                // 如果选择这样做，需要在这里添加一个 apiClient.patch 调用。
                // 例如: await apiClient.patch(`/knowledge/${createdItem.id}`, { linkedFile: createdItem.linkedFile });
            } else {
                 console.warn("File upload API did not return a fileIdentifier.");
            }
             isUploading.value = false; // 标记上传结束
        }

        if (createdItem) {
            items.value.unshift(createdItem); // 添加到列表
            console.log("Added new knowledge item to local state:", createdItem);
        }
        success = true;

    } catch (err) {
        console.error('Error adding knowledge item or uploading file:', err);
        let backendError = '未知错误';
        if (err.response) { backendError = err.response.data?.message || JSON.stringify(err.response.data) || err.response.statusText; }
        else if (err.request) { backendError = '无法连接到服务器。'; }
        else { backendError = err.message; }

        if (isUploading.value) { // 根据状态判断错误来源
            uploadError.value = `文件上传失败: ${backendError}`;
            addErrorState.value = uploadError.value;
        } else {
            addErrorState.value = `添加知识条目失败: ${backendError}`;
        }
        error.value = addErrorState.value;
        success = false;
    } finally {
        isAdding.value = false;
        isUploading.value = false; // 确保重置
    }
    return success;
  }

  async function deleteItem(id) {
    isLoading.value = true; // 或 isDeleting
    error.value = null;
    // ... (查找文件标识符逻辑不变)
    const itemToDelete = items.value.find(item => item.id === id);
    const fileIdentifierToDelete = itemToDelete?.linkedFile;

    try {
        // <<< 使用 apiClient 和相对路径 /knowledge/{id} >>>
        await apiClient.delete(`/knowledge/${id}`);
        console.log(`Knowledge item with id ${id} removed via API.`);

        if (fileIdentifierToDelete) {
             console.warn(`Associated file ${fileIdentifierToDelete} should be deleted on the server.`);
        }
        items.value = items.value.filter(item => item.id !== id);
        return true;
    } catch (err) {
        console.error(`Error removing knowledge item with id ${id}:`, err);
        const backendError = err.response?.data?.message || err.message || '未知网络错误';
        error.value = `删除知识条目失败: ${backendError}`;
        return false;
    } finally {
        isLoading.value = false; // 或 isDeleting = false
    }
  }

  // --- Initialization ---
  loadItems();

  // --- Expose ---
  return {
    items, isLoading, error, currentFilterCategory, currentSearchTerm,
    isAdding, isUploading, addErrorState, uploadError, // 暴露状态
    filteredItems, availableCategories, itemCount,
    loadItems, addItem, deleteItem,
  };
});