// src/stores/errorLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import config from '@/config.js';
import { loadData, saveData } from '@/utils/storage.js';
import { generateId } from '@/utils/helpers.js';

export const useErrorLogStore = defineStore('errorLog', () => {
  // --- State ---
  const errors = ref([]); // 存储所有错题

  // --- Getters ---
  // 计算可用的筛选模块列表
  const availableSubjects = computed(() => {
    const subjectsInData = [...new Set(errors.value.map(item => item.subject))];
    // 合并配置中的科目和数据中实际存在的科目，去重并排序
    const allPossibleSubjects = [...new Set([...config.errorLogSubjects, ...subjectsInData])].sort();
    return allPossibleSubjects.filter(Boolean); // 过滤掉空值
  });

  // 错题总数
  const errorCount = computed(() => errors.value.length);

  // --- Actions ---
  function loadErrors() {
    errors.value = loadData(config.localStorageKeys.errorLog, []);
    console.log(`[Pinia] Loaded ${errors.value.length} error log entries.`);
  }

  function saveErrors() {
    saveData(config.localStorageKeys.errorLog, errors.value);
    // 注意：摘要更新现在应该由 Dashboard 组件监听 errorCount getter 来完成
  }

  function addError(newErrorData) {
    // newErrorData 应该是一个包含 question, subject, myAnswer 等的对象
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      ...newErrorData, // 展开传入的数据
      reviewCount: 0,
      lastReviewDate: null,
    };
    errors.value.unshift(entry);
    saveErrors();
    console.log("[Pinia] New error added:", entry.id);
  }

  function deleteError(errorId) {
    const initialLength = errors.value.length;
    errors.value = errors.value.filter(item => item.id !== errorId);
    if (errors.value.length < initialLength) {
        saveErrors();
        console.log(`[Pinia] Error deleted: ${errorId}`);
        return true; // 表示删除成功
    }
    return false; // 表示未找到或删除失败
  }

  function markReviewed(errorId) {
    const index = errors.value.findIndex(item => item.id === errorId);
    if (index > -1) {
      errors.value[index].reviewCount = (errors.value[index].reviewCount || 0) + 1;
      errors.value[index].lastReviewDate = new Date().toISOString();
      saveErrors();
      console.log(`[Pinia] Error ${errorId} marked as reviewed.`);
      return true; // 表示更新成功
    }
    return false; // 表示未找到
  }

  // --- 初始化 ---
  // Store 创建时自动加载一次数据
  loadErrors();

  // --- 暴露 ---
  return {
    // State
    errors,
    // Getters
    availableSubjects,
    errorCount,
    // Actions
    loadErrors, // 可选暴露，用于强制刷新
    addError,
    deleteError,
    markReviewed,
  };
});