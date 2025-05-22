// src/stores/knowledgeStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient.js'; // 你的 API 客户端
import config from '@/config.js'; // 用于获取分类

export const useKnowledgeStore = defineStore('knowledgeBase', () => {
  // --- State ---
  const items = ref([]);
  const isLoading = ref(false); // 列表加载状态
  const error = ref(null);      // 通用错误状态 (主要用于加载)
  const currentFilterCategory = ref(null);
  const currentSearchTerm = ref('');

  // 添加/上传相关状态
  const isAdding = ref(false);      // 添加条目操作状态
  const isUploading = ref(false);   // 文件上传子状态 (可用于添加和编辑)
  const addErrorState = ref(null);  // 添加条目特定错误 (可包含上传错误信息)
  // uploadError 可以移除，因为 addErrorState 和 updateErrorState 可以覆盖其场景

  // 编辑相关状态
  const isUpdating = ref(false);     // 更新条目操作状态 (元数据和/或文件)
  const updateErrorState = ref(null); // 更新条目特定错误 (可包含上传错误信息)

  // 删除相关状态 (可以添加 isDeleting 和 deleteErrorState，如果需要更细致的控制)
  // const isDeleting = ref(false);
  // const deleteErrorState = ref(null);


  // --- Getters ---
  const filteredItems = computed(() => {
    // 如果你的 filteredItems getter 只是返回 items.value，
    // 那么实际的过滤逻辑可能在组件中。
    // 如果过滤逻辑应该在 store 中，你需要在这里实现它，
    // 否则，组件中的 storeToRefs(knowledgeStore).filteredItems 将不会动态过滤。
    // 示例:
    if (!currentFilterCategory.value && !currentSearchTerm.value) {
        return items.value;
    }
    return items.value.filter(item => {
        const categoryMatch = !currentFilterCategory.value || currentFilterCategory.value === 'all' || item.category === currentFilterCategory.value;
        const term = (currentSearchTerm.value || '').toLowerCase().trim();
        const searchMatch = !term ||
            (item.title && item.title.toLowerCase().includes(term)) ||
            (item.content && item.content.toLowerCase().includes(term)) ||
            (item.tags && item.tags.some(tag => tag.toLowerCase().includes(term)));
        return categoryMatch && searchMatch;
    });
  });

  const availableCategories = computed(() => {
      const categoriesFromItems = new Set(items.value.map(item => item.category).filter(Boolean));
      const predefinedCategories = config.knowledgeBaseCategories || [];
      const allCategories = [...new Set([...predefinedCategories, ...categoriesFromItems])];
      return ['all', ...allCategories.sort()];
  });

  const itemCount = computed(() => items.value.length);

  const getItemById = (id) => {
      return items.value.find(item => item.id === id);
  };

  // --- Actions ---
  async function loadItems(category = null, searchTerm = '') {
     currentFilterCategory.value = category; // 更新 store 内的筛选条件
     currentSearchTerm.value = searchTerm;   // 更新 store 内的搜索条件
     isLoading.value = true;
     error.value = null; // 重置通用加载错误
     addErrorState.value = null; // 重置添加错误
     updateErrorState.value = null; // 重置更新错误

     const params = {};
     if (category && category !== 'all') { params.category = category; }
     if (typeof searchTerm === 'string' && searchTerm.trim()) { params.search = searchTerm.trim(); }

     try {
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

  async function addItem(itemData, fileToUpload = null) {
    isAdding.value = true;
    isUploading.value = false;
    addErrorState.value = null; // 重置特定于添加操作的错误

    let createdItemServerResponse = null;
    let success = false;

    try {
        if (!itemData || !itemData.title || !itemData.category || !itemData.content) {
            addErrorState.value = '请填写标题、分类和内容！';
            throw new Error(addErrorState.value);
        }

        const dataToSend = { ...itemData, tags: itemData.tags || [] };
        delete dataToSend.id; // 确保不发送 id
        delete dataToSend.timestamp; // 确保不发送 timestamp
        // linkedFile 字段在初始创建时可以不发送，或者发送 null，由后端决定
        // dataToSend.linkedFile = null; 

        const response = await apiClient.post('/knowledge', dataToSend);
        createdItemServerResponse = response.data; // 这是后端返回的已创建条目，应包含 id 和 timestamp
        console.log('Knowledge item entry created via API:', createdItemServerResponse);

        if (fileToUpload && createdItemServerResponse?.id) {
            console.log(`Uploading file for new knowledge item ID: ${createdItemServerResponse.id}`);
            isUploading.value = true;
            const formData = new FormData();
            formData.append('file', fileToUpload);
            formData.append('type', 'knowledge'); // 假设你的后端需要这个
            formData.append('entityId', createdItemServerResponse.id.toString()); // 假设你的后端需要这个

            const uploadResponse = await apiClient.post('/files/upload', formData);
            console.log('File uploaded successfully for new item:', uploadResponse.data);

            if (uploadResponse.data.fileIdentifier) {
                // 重要: 更新刚创建条目的 linkedFile 字段，以便后续保存到数据库
                // 这一步依赖于你的后端是否在创建条目后允许立即更新其 linkedFile，
                // 或者文件上传API是否直接将文件关联到 entityId。
                // 如果文件上传API直接关联，则这一步客户端更新可能不是必须的，
                // 而是通过重新 loadItems() 获取最新的数据。
                // 为确保数据一致性，理想情况下，后端应在文件上传成功后更新条目的 linkedFile 记录。
                // 如果需要客户端显式 PATCH 更新，可以这样做：
                // await apiClient.patch(`/knowledge/${createdItemServerResponse.id}`, { linkedFile: uploadResponse.data.fileIdentifier });
                // createdItemServerResponse.linkedFile = uploadResponse.data.fileIdentifier; // 更新本地副本
            } else {
                 console.warn("File upload API did not return a fileIdentifier for new item.");
            }
            isUploading.value = false;
        }
        
        // 添加成功后，重新加载列表以获取最新数据 (包括文件链接和时间戳)
        await loadItems(currentFilterCategory.value, currentSearchTerm.value);
        success = true;

    } catch (err) {
        console.error('Error adding knowledge item or uploading file:', err);
        let backendError = '未知错误';
        if (err.response) { backendError = err.response.data?.message || JSON.stringify(err.response.data) || err.response.statusText; }
        else if (err.request) { backendError = '无法连接到服务器。'; }
        else { backendError = err.message; }

        addErrorState.value = `添加知识条目失败: ${backendError}`;
        success = false;
    } finally {
        isAdding.value = false;
        isUploading.value = false;
    }
    return success;
  }

  // --- 新增 updateItem Action ---
  async function updateItem(itemId, updatedDataPayload, newFileToUpload = null, removeCurrentFileFlag = false) {
    isUpdating.value = true;
    isUploading.value = false; // 重置上传子状态
    updateErrorState.value = null; // 重置特定于更新操作的错误
    let success = false;

    try {
        const originalItem = getItemById(itemId);
        if (!originalItem) {
            updateErrorState.value = "未找到要更新的条目。";
            throw new Error(updateErrorState.value);
        }

        let dataForMetaUpdate = { ...updatedDataPayload }; // 用于更新标题、内容、分类等
        let newFileIdentifier = originalItem.linkedFile; // 默认为原始文件

        // 1. 处理文件变更
        if (newFileToUpload) { // 如果有新文件上传
            console.log(`Uploading new file for knowledge item ID: ${itemId}`);
            isUploading.value = true;
            const formData = new FormData();
            formData.append('file', newFileToUpload);
            formData.append('type', 'knowledge');
            formData.append('entityId', itemId.toString());

            const uploadResponse = await apiClient.post('/files/upload', formData);
            console.log('New file uploaded successfully for update:', uploadResponse.data);
            isUploading.value = false;

            if (uploadResponse.data.fileIdentifier) {
                newFileIdentifier = uploadResponse.data.fileIdentifier;
                // 如果原条目有文件且与新文件不同，后端应处理旧文件的删除（或前端在此处记录以供后续API调用）
                if (originalItem.linkedFile && originalItem.linkedFile !== newFileIdentifier) {
                    console.log(`Old file ${originalItem.linkedFile} might need to be deleted by backend due to replacement.`);
                    // 如果后端不自动删除，你可能需要在这里调用一个删除旧文件的 API：
                    // await apiClient.post('/files/delete', { fileIdentifier: originalItem.linkedFile, entityId: itemId, type: 'knowledge' });
                }
            } else {
                console.warn("New file upload API did not return a fileIdentifier during update.");
                // 根据业务逻辑决定是否要因此中断更新
            }
        } else if (removeCurrentFileFlag && originalItem.linkedFile) { // 如果没有新文件，但标记了删除当前文件
            newFileIdentifier = null;
            console.log(`Marked to remove existing file ${originalItem.linkedFile} for item ID: ${itemId}`);
            // 后端应处理旧文件的删除
            // 如果后端不自动删除，你可能需要在这里调用一个删除旧文件的 API：
            // await apiClient.post('/files/delete', { fileIdentifier: originalItem.linkedFile, entityId: itemId, type: 'knowledge' });
        }
        // 如果既没有新文件上传，也没有标记删除，newFileIdentifier 保持为 originalItem.linkedFile

        dataForMetaUpdate.linkedFile = newFileIdentifier; // 将最终的文件标识符设置到待更新数据中

        // 2. 更新条目元数据 (标题、内容、分类、标签、最终的 linkedFile 等)
        // 确保不发送 id 或 timestamp (如果后端不允许在 PUT/PATCH 中包含它们)
        delete dataForMetaUpdate.id;
        delete dataForMetaUpdate.timestamp;

        console.log(`Updating metadata for knowledge item ID: ${itemId} with data:`, dataForMetaUpdate);
        await apiClient.put(`/knowledge/${itemId}`, dataForMetaUpdate); // 或者 apiClient.patch

        // 更新成功后，重新加载列表以获取最新数据
        await loadItems(currentFilterCategory.value, currentSearchTerm.value);
        success = true;

    } catch (err) {
        console.error(`Error updating knowledge item ID ${itemId}:`, err);
        let backendError = '未知错误';
        if (err.response) { backendError = err.response.data?.message || JSON.stringify(err.response.data) || err.response.statusText; }
        else if (err.request) { backendError = '无法连接到服务器。'; }
        else { backendError = err.message; }
        
        updateErrorState.value = `更新知识条目失败: ${backendError}`;
        success = false;
    } finally {
        isUpdating.value = false;
        isUploading.value = false; // 确保重置
    }
    return success;
  }


  async function deleteItem(id) {
    //isLoading.value = true; // 或者使用 isDeleting 状态
    error.value = null; // 重置通用错误，或使用 deleteErrorState
    let success = false;

    const itemToDelete = getItemById(id); // 在删除前获取，以便知道是否有文件需要处理
    // const fileIdentifierToDelete = itemToDelete?.linkedFile; // 这行在你提供的代码中被注释了，但可能有用

    try {
        await apiClient.delete(`/knowledge/${id}`);
        console.log(`Knowledge item with id ${id} removed via API.`);

        // 如果后端不自动删除关联文件，这里可能需要提示或进一步操作
        if (itemToDelete?.linkedFile) {
             console.warn(`Associated file ${itemToDelete.linkedFile} for item ${id} should be deleted by the server or via a separate API call if not handled automatically.`);
        }
        
        // 删除成功后，重新加载列表
        await loadItems(currentFilterCategory.value, currentSearchTerm.value);
        success = true;
    } catch (err) {
        console.error(`Error removing knowledge item with id ${id}:`, err);
        const backendError = err.response?.data?.message || err.message || '未知网络错误';
        // error.value = `删除知识条目失败: ${backendError}`; // 或使用 deleteErrorState
        // 为了与组件中期望的错误状态一致，如果组件检查 error.value，就设置它
        // 但更推荐为删除操作设置特定的错误状态，例如：
        // deleteErrorState.value = `删除知识条目失败: ${backendError}`;
        // 这里暂时还是用通用的 error，因为你的组件中 deleteItemHandler 检查的是 error.value
        error.value = `删除知识条目失败: ${backendError}`; 
        success = false;
    } finally {
        // isLoading.value = false; // 或 isDeleting = false
    }
    return success;
  }

  // --- Initialization ---
  // 初始加载数据
  loadItems(currentFilterCategory.value, currentSearchTerm.value);


  // --- Expose ---
  return {
    items, // 原始数据列表
    isLoading,
    error, // 通用加载错误
    currentFilterCategory, // 当前筛选分类
    currentSearchTerm,     // 当前搜索词

    isAdding,           // 是否正在添加
    isUploading,        // 是否正在上传文件 (通用)
    addErrorState,      // 添加操作的错误信息

    isUpdating,         // 是否正在更新
    updateErrorState,   // 更新操作的错误信息

    // Getters (已是 computed)
    filteredItems,      // 经过筛选和搜索的条目列表
    availableCategories,
    itemCount,

    // Actions
    loadItems,
    addItem,
    updateItem, // 暴露 updateItem
    deleteItem,
    // getItemById, // 如果组件需要直接通过 ID 获取，可以暴露
  };
});