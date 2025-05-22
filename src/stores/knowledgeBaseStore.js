// // src/stores/knowledgeStore.js
// import { defineStore } from 'pinia';
// import { ref, computed } from 'vue';
// // <<< 导入 apiClient >>>
// import apiClient from '@/utils/apiClient.js';
// // import axios from 'axios'; // <<< 移除或注释掉

// // <<< 不再需要 API_BASE_URL 常量 >>>
// // const API_BASE_URL = 'http://localhost:8080/api/knowledge';

// // 导入 config 用于获取预定义分类 (如果需要)
// import config from '@/config.js';

// export const useKnowledgeStore = defineStore('knowledgeBase', () => {
//   // --- State ---
//   const items = ref([]);
//   const isLoading = ref(false);
//   const error = ref(null);
//   const currentFilterCategory = ref(null);
//   const currentSearchTerm = ref('');

//   // --- Getters ---
//   // filteredItems getter 现在直接返回 items，因为加载逻辑已包含筛选
//   const filteredItems = computed(() => items.value);

//   // availableCategories getter: 合并现有分类和预定义分类
//   const availableCategories = computed(() => {
//       const existingCategories = new Set(items.value.map(item => item.category).filter(Boolean));
//       const predefinedCategories = config.knowledgeBaseCategories || []; // 从 config 获取
//       // 合并两者并去重，然后排序
//       const allCategories = [...new Set([...predefinedCategories, ...existingCategories])];
//       return ['all', ...allCategories.sort()];
//   });

//   const itemCount = computed(() => items.value.length);

//   // --- Actions ---

//   async function loadItems(category = null, searchTerm = '') {
//     currentFilterCategory.value = category;
//     currentSearchTerm.value = searchTerm;
//     isLoading.value = true;
//     error.value = null;

//     const params = {};
//     if (category && category !== 'all') {
//         params.category = category;
//     }
//     if (searchTerm && searchTerm.trim()) {
//         params.search = searchTerm.trim();
//     }

//     try {
//       // <<< 使用 apiClient 和相对路径 /knowledge >>>
//       const response = await apiClient.get('/knowledge', { params });
//       items.value = response.data;
//       console.log(`Loaded ${items.value.length} knowledge items from API.`);
//     } catch (err) {
//       console.error('Error loading knowledge items from API:', err);
//       const backendError = err.response?.data?.message || err.message || '未知网络错误';
//       error.value = `无法加载知识库条目: ${backendError}`;
//       items.value = [];
//     } finally {
//       isLoading.value = false;
//     }
//   }

//   // **修改:** 添加条目的 Action 现在不处理文件上传，文件上传应单独处理或在组件层调用
//   //    这个 Action 只负责创建文本数据
//   async function addItem(itemData) {
//     if (!itemData || !itemData.title || !itemData.category || !itemData.content) {
//         error.value = '请填写标题、分类和内容！';
//         console.warn('Incomplete knowledge item data for adding.');
//         return null; // 返回 null 表示失败
//     }
//     isLoading.value = true; // 可以考虑使用 isAdding 状态
//     error.value = null;
//     try {
//        const dataToSend = {
//            ...itemData,
//            tags: itemData.tags || [],
//            // 确保不发送 file 对象，文件上传是单独的步骤
//            linkedFile: null // 或根据后端是否需要文件名决定是否发送 itemData.linkedFile
//        };
//        delete dataToSend.id;
//        delete dataToSend.timestamp;

//       // <<< 使用 apiClient 和相对路径 /knowledge >>>
//       const response = await apiClient.post('/knowledge', dataToSend);
//       const newItem = response.data; // 后端返回创建的完整条目 (不含文件信息)
//       items.value.unshift(newItem);
//       console.log('Knowledge item added via API (without file):', newItem);
//       error.value = null;
//       return newItem; // 返回创建的条目数据，用于后续文件关联

//     } catch (err) {
//       console.error('Error adding knowledge item via API:', err);
//       const backendError = err.response?.data?.message || err.message || '添加知识条目失败，请稍后重试。';
//       error.value = backendError;
//       return null; // 返回 null 表示失败
//     } finally {
//       isLoading.value = false; // isAdding = false;
//     }
//   }

//   // **新增:** 单独的文件上传 Action (如果需要 store 管理)
//   //   或者这个逻辑可以完全放在组件的 submit 方法中
//   async function uploadKnowledgeFile(itemId, file) {
//       if (!itemId || !file) {
//           console.error("Upload function requires itemId and file.");
//           return null; // 返回 null 或抛出错误
//       }
//       // 可以设置 isUploading 状态
//       error.value = null; // 清除旧错误
//       const formData = new FormData();
//       formData.append('file', file);
//       formData.append('type', 'knowledge'); // 指定文件类型
//       formData.append('entityId', itemId.toString()); // 关联的实体 ID

//       try {
//           // <<< 使用 apiClient 和相对路径 /files/upload >>>
//           const response = await apiClient.post('/files/upload', formData);
//           const fileIdentifier = response.data.fileIdentifier;
//           console.log(`File uploaded for knowledge item ${itemId}, identifier: ${fileIdentifier}`);

//           // 更新本地对应 item 的 linkedFile 字段
//           const index = items.value.findIndex(item => item.id === itemId);
//           if (index !== -1) {
//               items.value[index].linkedFile = fileIdentifier;
//           } else {
//                console.warn(`Uploaded file for item ${itemId}, but item not found locally.`);
//                // 可以考虑重新加载单个 item 或整个列表
//           }
//           return fileIdentifier; // 返回文件标识符

//       } catch (err) {
//            console.error(`Error uploading file for knowledge item ${itemId}:`, err);
//            const backendError = err.response?.data?.message || err.message || '文件上传失败';
//            error.value = backendError; // 设置错误状态
//            return null; // 返回 null 表示上传失败
//       } finally {
//            // isUploading = false;
//       }
//   }


//   async function deleteItem(id) {
//     // isLoading.value = true; // 可以考虑使用 isDeleting 状态
//     error.value = null;
//     try {
//       // <<< 使用 apiClient 和相对路径 /knowledge/{id} >>>
//       await apiClient.delete(`/knowledge/${id}`);
//       items.value = items.value.filter(item => item.id !== id);
//       console.log(`Knowledge item with id ${id} removed via API.`);
//       return true; // 返回 true 表示成功
//     } catch (err) {
//       console.error('Error removing knowledge item via API:', err);
//       const backendError = err.response?.data?.message || err.message || '删除知识条目失败，请稍后重试。';
//       error.value = backendError;
//       return false; // 返回 false 表示失败
//     } finally {
//       // isLoading.value = false; // isDeleting = false;
//     }
//   }

//   // --- Initialization ---
//   loadItems();

//   // --- Expose ---
//   return {
//     items, isLoading, error, currentFilterCategory, currentSearchTerm,
//     filteredItems, availableCategories, itemCount,
//     loadItems,
//     addItem, // 暴露修改后的 addItem
//     uploadKnowledgeFile, // 暴露文件上传 action
//     deleteItem,
//     // 暴露 isAdding, isUploading, isDeleting 等状态如果添加了
//   };
// });