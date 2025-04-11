// src/stores/knowledgeBaseStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import config from '@/config.js';
import { loadData, saveData } from '@/utils/storage.js';
import { generateId } from '@/utils/helpers.js';

export const useKnowledgeBaseStore = defineStore('knowledgeBase', () => {
  // --- State ---
  const items = ref([]); // 知识条目

  // --- Getters ---
  // 可用分类
  const availableCategories = computed(() => {
    const categoriesInData = [...new Set(items.value.map(item => item.category))];
    const allPossibleCategories = [...new Set([...config.knowledgeBaseCategories, ...categoriesInData])].sort();
    return allPossibleCategories.filter(Boolean);
  });

  // 条目总数
  const itemCount = computed(() => items.value.length);

  // --- Actions ---
  function loadItems() {
    items.value = loadData(config.localStorageKeys.knowledgeBase, []);
    console.log(`[Pinia] Loaded ${items.value.length} knowledge base items.`);
  }

  function saveItems() {
    saveData(config.localStorageKeys.knowledgeBase, items.value);
  }

  function addItem(newItemData) {
    // newItemData 包含 title, category, content, tags(字符串), externalLink, linkedFile(文件名)
    const tagsArray = newItemData.tags
      ? newItemData.tags.split(',').map(tag => tag.trim()).filter(tag => tag !== '')
      : [];

    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      title: newItemData.title,
      category: newItemData.category,
      content: newItemData.content,
      tags: tagsArray,
      externalLink: newItemData.externalLink || null,
      linkedFile: newItemData.linkedFile || null, // 文件名
    };
    items.value.unshift(entry);
    saveItems();
    console.log("[Pinia] New knowledge item added:", entry.id);
  }

  function deleteItem(itemId) {
    const initialLength = items.value.length;
    items.value = items.value.filter(item => item.id !== itemId);
    if (items.value.length < initialLength) {
        saveItems();
        console.log(`[Pinia] Knowledge item deleted: ${itemId}`);
        return true;
    }
    return false;
  }

  // --- 初始化 ---
  loadItems();

  // --- 暴露 ---
  return {
    items,
    availableCategories,
    itemCount,
    loadItems,
    addItem,
    deleteItem,
  };
});