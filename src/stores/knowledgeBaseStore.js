// src/stores/knowledgeStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
// 移除旧导入
// import config from '@/config.js';
// import { loadData, saveData, generateId } from '@/utils/storage.js';

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
  // Getter for filtered items (could be simplified if loadItems always fetches filtered)
  const filteredItems = computed(() => {
      // This getter might become simpler if loadItems always fetches the correct list
      // based on currentFilterCategory and currentSearchTerm stored here.
      // For now, it just returns the current items list.
      return items.value;
  });

  // Getter for available categories based on current items
  const availableCategories = computed(() => {
      // 从 items 提取不重复的 category
      const categories = new Set(items.value.map(item => item.category));
      // 假设 config.knowledgeBaseCategories 包含预定义的分类
      // import config from '@/config.js'; // 需要导入 config
      // const allPossibleCategories = [...new Set([...config.knowledgeBaseCategories, ...categories])];
      // return ['all', ...allPossibleCategories.sort()];

      // 如果只基于现有数据生成：
      return ['all', ...Array.from(categories).sort()];
  });

  const itemCount = computed(() => items.value.length);

  // --- Actions ---

  // 从后端加载知识条目，支持筛选
  async function loadItems(category = null, searchTerm = '') {
    // 更新 store 内的筛选状态（如果需要）
    currentFilterCategory.value = category;
    currentSearchTerm.value = searchTerm;

    isLoading.value = true;
    error.value = null;
    const params = {}; // 用于构建查询参数
    if (category && category !== 'all') {
        params.category = category;
    }
    if (searchTerm && searchTerm.trim()) {
        params.search = searchTerm.trim();
    }

    try {
      // 发送 GET 请求，附带查询参数
      const response = await axios.get(API_BASE_URL, { params });
      items.value = response.data; // 更新列表
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
    // 基本验证
    if (!itemData || !itemData.title || !itemData.category || !itemData.content) {
        error.value = '请填写标题、分类和内容！';
        console.warn('Incomplete knowledge item data for adding.');
        return false; // 返回 false 表示添加失败
    }
    isLoading.value = true;
    error.value = null;
    try {
       // 准备发送的数据 (确保 tags 是数组)
       const dataToSend = {
           ...itemData,
           tags: itemData.tags || [], // 确保 tags 是数组
       };
       delete dataToSend.id; // 后端生成 ID
       delete dataToSend.timestamp; // 后端生成时间戳

      const response = await axios.post(API_BASE_URL, dataToSend);
      // 添加成功后，将新条目加到列表开头 (或重新加载列表)
      items.value.unshift(response.data);
      console.log('Knowledge item added via API:', response.data);
       // 清除之前的错误信息
       error.value = null;
       return true; // 返回 true 表示添加成功
    } catch (err) {
      console.error('Error adding knowledge item via API:', err);
      error.value = '添加知识条目失败，请稍后重试。';
      return false; // 返回 false 表示添加失败
    } finally {
      isLoading.value = false;
    }
  }

  // 删除知识条目
  async function deleteItem(id) {
    isLoading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      items.value = items.value.filter(item => item.id !== id);
      console.log(`Knowledge item with id ${id} removed via API.`);
    } catch (err) {
      console.error('Error removing knowledge item via API:', err);
      error.value = '删除知识条目失败，请稍后重试。';
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
    currentFilterCategory, // 如果组件需要直接修改筛选条件
    currentSearchTerm,    // 同上
    filteredItems,      // 暴露过滤后的列表 (目前直接等于 items)
    availableCategories, // 暴露可用分类
    itemCount,
    loadItems,        // 暴露以便组件可以触发加载/筛选
    addItem,
    deleteItem,
  };
});