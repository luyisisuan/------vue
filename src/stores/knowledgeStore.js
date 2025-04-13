// src/stores/knowledgeStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import config from '@/config.js'; // 可能需要 config 获取预定义分类

const API_BASE_URL = 'http://localhost:8080/api/knowledge';
// **新增:** 文件上传 API URL (与 errorLogStore 共用)
const API_FILE_UPLOAD_URL = 'http://localhost:8080/api/files/upload';

export const useKnowledgeStore = defineStore('knowledgeBase', () => {
  // --- State ---
  const items = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const currentFilterCategory = ref(null);
  const currentSearchTerm = ref('');
  // **新增:** 文件上传状态
  const isUploading = ref(false);
  const uploadError = ref(null);
  // **新增:** 添加操作状态
  const isAdding = ref(false);
  const addErrorState = ref(null);


  // --- Getters ---
  const filteredItems = computed(() => items.value);

  const availableCategories = computed(() => {
      const categoriesFromItems = new Set(items.value.map(item => item.category));
      const allPossibleCategories = [...new Set([...(config?.knowledgeBaseCategories || []), ...categoriesFromItems])];
      return ['all', ...allPossibleCategories.sort()];
  });

  const itemCount = computed(() => items.value.length);

  // --- Actions ---
  async function loadItems(category = null, searchTerm = '') {
    // ... (保持之前的加载逻辑不变, 确保 finally 设置 isLoading = false) ...
     currentFilterCategory.value = category;
     currentSearchTerm.value = searchTerm;
     isLoading.value = true;
     error.value = null;
     addErrorState.value = null; // 清除之前的添加错误
     uploadError.value = null; // 清除之前的上传错误
     const params = {};
     if (category && category !== 'all') { params.category = category; }
     if (typeof searchTerm === 'string' && searchTerm.trim()) { params.search = searchTerm.trim(); }

     try {
       const response = await axios.get(API_BASE_URL, { params });
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

  /**
   * 添加新的知识库条目，并可选地上传关联文件。
   * @param {object} itemData 包含知识信息的对象 (不含 ID, timestamp, file object)
   * @param {File | null} fileToUpload 要上传的文件对象，或 null
   * @returns {Promise<boolean>} 操作是否完全成功
   */
  async function addItem(itemData, fileToUpload = null) {
    isAdding.value = true; // 标记整个添加过程开始
    isUploading.value = false;
    error.value = null;
    addErrorState.value = null;
    uploadError.value = null;

    let createdItem = null; // 保存创建后的实体
    let success = false;

    try {
        // 1. 验证基本数据
         if (!itemData || !itemData.title || !itemData.category || !itemData.content) {
             throw new Error('请填写标题、分类和内容！'); // 直接抛出错误
         }

        // 2. 先创建知识条目实体
        const dataToSend = {
           ...itemData,
           tags: itemData.tags || [], // 确保 tags 是数组
           // linkedFile 可以先不传或传原始文件名，后续上传成功再更新
        };
        delete dataToSend.id;
        delete dataToSend.timestamp;

        const response = await axios.post(API_BASE_URL, dataToSend);
        createdItem = response.data;
        console.log('Knowledge item entry created via API:', createdItem);

        // 3. 如果有文件需要上传，并且实体创建成功
        if (fileToUpload && createdItem?.id) {
            console.log(`Uploading file for knowledge item ID: ${createdItem.id}`);
            isUploading.value = true;
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('type', 'knowledge'); // <<< 类型改为 'knowledge'
            formData.append('entityId', createdItem.id.toString());

            const uploadResponse = await axios.post(API_FILE_UPLOAD_URL, formData, { /* headers */ });
            console.log('File uploaded successfully:', uploadResponse.data);

            // 更新内存中刚创建的对象的 linkedFile 字段
            if (uploadResponse.data.fileIdentifier) {
                createdItem.linkedFile = uploadResponse.data.fileIdentifier;
            } else {
                 console.warn("File upload API did not return a fileIdentifier.");
            }
             isUploading.value = false;
        }

        // 4. 将最终的条目添加到本地列表开头
        if (createdItem) {
            items.value.unshift(createdItem);
            console.log("Added new knowledge item to local state:", createdItem);
        }
        success = true;

    } catch (err) {
        console.error('Error adding knowledge item or uploading file:', err);
        const backendError = err.response?.data || err.message || '未知错误';
        if (isUploading.value) {
            uploadError.value = `文件上传失败: ${backendError}`;
            addErrorState.value = uploadError.value; // 同时设置添加错误
        } else {
            addErrorState.value = `添加知识条目失败: ${backendError}`;
        }
        error.value = addErrorState.value; // 同时设置主错误
        success = false;
    } finally {
        isAdding.value = false;
        isUploading.value = false;
    }
    return success;
  }


  // 删除知识条目 (需要考虑删除关联文件 - 最佳实践在后端)
  async function deleteItem(id) {
    isLoading.value = true; // 可以用 isLoading 或单独的 isDeleting 状态
    error.value = null;
    addErrorState.value = null;
    uploadError.value = null;
    let fileIdentifierToDelete = null;

    // 先找文件标识符
    const itemToDelete = items.value.find(item => item.id === id);
    if (itemToDelete && itemToDelete.linkedFile) {
        fileIdentifierToDelete = itemToDelete.linkedFile;
    }

    try {
        await axios.delete(`${API_BASE_URL}/${id}`);
        console.log(`Knowledge item with id ${id} removed via API.`);

        if (fileIdentifierToDelete) {
             console.warn(`Associated file ${fileIdentifierToDelete} should be deleted on the server.`);
             // 后端 Service 的 delete 方法应该处理文件删除
        }

        // 从本地列表移除
        items.value = items.value.filter(item => item.id !== id);
        return true;
    } catch (err) {
        console.error(`Error removing knowledge item with id ${id}:`, err);
        const backendError = err.response?.data?.message || err.message || '未知网络错误';
        error.value = `删除知识条目失败: ${backendError}`;
        return false;
    } finally {
        isLoading.value = false;
    }
  }

  // --- Initialization ---
  loadItems();

  // --- Expose ---
  return {
    items, isLoading, error, currentFilterCategory, currentSearchTerm,
    isAdding, isUploading, addErrorState, uploadError, // 暴露新状态
    filteredItems, availableCategories, itemCount,
    loadItems, addItem, deleteItem,
  };
});