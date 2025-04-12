// src/stores/knowledgeStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
// 假设 config.js 在 @/ 目录下，并且包含 knowledgeBaseCategories
import config from '@/config.js';

const API_BASE_URL = 'http://localhost:8080/api/knowledge'; // 后端 API 基础 URL

export const useKnowledgeStore = defineStore('knowledgeBase', () => {
  // --- State ---
  const items = ref([]); // 知识条目列表
  const isLoading = ref(false);
  const error = ref(null);
  // 可以保留筛选条件在 store 中，或者让组件自己管理然后调用 loadItems
  const currentFilterCategory = ref(null); // null or 'all' means no category filter
  const currentSearchTerm = ref('');

  // --- Getters ---
  // Getter for filtered items (目前直接返回 items，因为 loadItems 会获取过滤/搜索后的数据)
  const filteredItems = computed(() => items.value);

  // Getter for available categories based on current items and config
  const availableCategories = computed(() => {
      const categoriesFromItems = new Set(items.value.map(item => item.category));
      // 合并 config 中的预定义分类和实际数据中的分类
      const allPossibleCategories = [...new Set([...(config?.knowledgeBaseCategories || []), ...categoriesFromItems])];
      // 返回包含 'all' 并且排序后的列表
      return ['all', ...allPossibleCategories.sort()];
  });

  const itemCount = computed(() => items.value.length);

  // --- Actions ---

  // 从后端加载知识条目，支持筛选
  async function loadItems(category = null, searchTerm = '') {
    // 更新 store 内的筛选状态
    currentFilterCategory.value = category;
    currentSearchTerm.value = searchTerm;

    isLoading.value = true;
    error.value = null;
    const params = {};
    if (category && category !== 'all') {
        params.category = category;
    }
    // 确保 searchTerm 是字符串且非空
    if (typeof searchTerm === 'string' && searchTerm.trim()) {
        params.search = searchTerm.trim();
    }

    try {
      const response = await axios.get(API_BASE_URL, { params });
      items.value = response.data;
      console.log(`Loaded ${items.value.length} knowledge items from API.`);
    } catch (err) {
      console.error('Error loading knowledge items from API:', err);
      error.value = '无法加载知识库条目，请稍后重试。';
      items.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  // 添加新知识条目
  async function addItem(itemData) {
    if (!itemData || !itemData.title || !itemData.category || !itemData.content) {
        error.value = '请填写标题、分类和内容！';
        console.warn('Incomplete knowledge item data for adding.');
        return false;
    }
    isLoading.value = true;
    error.value = null;
    try {
       const dataToSend = {
           ...itemData,
           tags: itemData.tags || [],
       };
       delete dataToSend.id;
       delete dataToSend.timestamp;

      const response = await axios.post(API_BASE_URL, dataToSend);
      items.value.unshift(response.data); // 加到开头，保持最新在上面
      console.log('Knowledge item added via API:', response.data);
       error.value = null;
       return true;
    } catch (err) {
      console.error('Error adding knowledge item via API:', err);
      // 尝试解析后端可能返回的错误信息
       const backendError = err.response?.data?.message || err.message || '未知错误';
       error.value = `添加知识条目失败: ${backendError}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 删除知识条目
  async function deleteItem(id) {
    // 可以在删除前记录当前筛选条件，以便删除后恢复
    const previousCategory = currentFilterCategory.value;
    const previousSearch = currentSearchTerm.value;

    isLoading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      // 从本地列表中移除 (或者在成功后调用 loadItems 重新加载)
      // items.value = items.value.filter(item => item.id !== id);
      console.log(`Knowledge item with id ${id} removed via API.`);
      // 删除成功后，重新加载当前筛选条件下的列表，确保分页等（如果未来有）正确
      await loadItems(previousCategory, previousSearch);
    } catch (err) {
      console.error('Error removing knowledge item via API:', err);
       const backendError = err.response?.data?.message || err.message || '未知错误';
      error.value = `删除知识条目失败: ${backendError}`;
    } finally {
      isLoading.value = false;
    }
  }

  // --- Initialization ---
  // 初始化时加载所有条目
  loadItems();

  // --- Expose ---
  return {
    items,
    isLoading,
    error,
    currentFilterCategory,
    currentSearchTerm,
    filteredItems, // 注意：目前 filteredItems === items，因为筛选逻辑在 loadItems 中
    availableCategories,
    itemCount,
    loadItems,
    addItem,
    deleteItem,
  };
});