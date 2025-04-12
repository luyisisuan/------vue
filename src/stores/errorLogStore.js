// src/stores/errorLogStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios'; // 导入 axios
// 移除旧的导入
// import config from '@/config.js';
// import { loadData, saveData, generateId } from '@/utils/storage.js';

const API_BASE_URL = 'http://localhost:8080/api/errors'; // 后端 API 基础 URL

export const useErrorLogStore = defineStore('errorLog', () => {
  // --- State ---
  const errors = ref([]); // 错题列表
  const isLoading = ref(false); // 加载状态
  const error = ref(null);     // 错误信息
  const currentFilter = ref(null); // 当前筛选的科目 (null 表示 'all')

  // --- Getters ---
  // 计算属性：根据当前筛选条件过滤错题列表
  // 注意：这个过滤现在在前端完成，也可以让后端 API 直接支持过滤后的排序
  const filteredErrors = computed(() => {
    if (!currentFilter.value || currentFilter.value === 'all') {
      return errors.value; // 返回所有（已按时间倒序）
    }
    // 在前端进行二次过滤（如果需要）
    // return errors.value.filter(e => e.subject.toLowerCase() === currentFilter.value.toLowerCase());
    // 如果后端 API 已经返回了按 subject 筛选的结果，这里可以直接返回 errors.value
    return errors.value; // 假设 loadErrors 已经根据 filter 获取了正确数据
  });

  // 计算属性：错题总数
  const errorCount = computed(() => errors.value.length); // 可以直接用原始列表长度

  // 计算属性：获取所有不重复的科目用于筛选下拉框
  const availableSubjects = computed(() => {
      const subjects = new Set(errors.value.map(e => e.subject));
      return ['all', ...Array.from(subjects).sort()]; // 添加 'all' 选项并排序
  });


  // --- Actions ---

  // 从后端 API 加载错题记录
  // filterSubject: 可选的科目筛选参数
  async function loadErrors(filterSubject = null) {
    currentFilter.value = filterSubject; // 更新当前筛选状态
    isLoading.value = true;
    error.value = null;
    let requestUrl = API_BASE_URL;
    // 如果有筛选条件，添加到 URL 查询参数
    if (filterSubject && filterSubject !== 'all') {
        requestUrl += `?subject=${encodeURIComponent(filterSubject)}`;
    }

    try {
      // 发送 GET 请求
      const response = await axios.get(requestUrl);
      // 更新错题列表 (后端应该已经按时间倒序)
      errors.value = response.data;
      console.log(`Loaded ${errors.value.length} error logs from API (filter: ${filterSubject || 'all'}).`);
    } catch (err) {
      console.error('Error loading error logs from API:', err);
      error.value = '无法加载错题记录，请稍后重试。';
      errors.value = []; // 清空列表
    } finally {
      isLoading.value = false;
    }
  }

  // 向后端 API 添加新错题
  async function addError(errorData) {
    // 简单验证 (可以在组件层或这里做得更完善)
    if (!errorData || !errorData.question || !errorData.subject || !errorData.correctAnswer || !errorData.reason) {
        error.value = '请填写必填项：题干、模块、正确答案和原因分析。';
        console.warn('Incomplete error data for adding.');
        return; // 阻止提交不完整的数据
    }

    isLoading.value = true;
    error.value = null;
    try {
      // 准备要发送的数据 (不需要 ID 和 timestamp，后端处理)
      const dataToSend = { ...errorData };
      delete dataToSend.id;
      delete dataToSend.timestamp;
      delete dataToSend.reviewCount;
      delete dataToSend.lastReviewDate;

      // 发送 POST 请求
      const response = await axios.post(API_BASE_URL, dataToSend);
      // 将新添加的错题（包含后端生成的 ID 和 timestamp）添加到列表开头
      errors.value.unshift(response.data);
      console.log('Error log added via API:', response.data);
      // 如果当前应用了筛选，可能需要重新加载或智能地处理列表
      // 最简单的方式是提示用户清除筛选或手动刷新
      // 或者: if (currentFilter.value && currentFilter.value !== 'all' && response.data.subject !== currentFilter.value) { /* 提示或处理 */ }
    } catch (err) {
      console.error('Error adding error log via API:', err);
      error.value = '添加错题失败，请稍后重试。';
    } finally {
      isLoading.value = false;
    }
  }

  // 调用后端 API 标记为已复习
  async function markAsReviewed(id) {
    error.value = null;
    const errorIndex = errors.value.findIndex(e => e.id === id);
    if (errorIndex === -1) {
        console.warn(`Error log with id ${id} not found locally for reviewing.`);
        return;
    }

    try {
      // 发送 PATCH 请求到 /api/errors/{id}/review
      const response = await axios.patch(`${API_BASE_URL}/${id}/review`);
      // 使用后端返回的最新数据更新本地对应的错题对象
      errors.value[errorIndex] = response.data;
      console.log('Error log marked as reviewed via API:', response.data);
    } catch (err) {
      console.error('Error marking error log as reviewed via API:', err);
      error.value = '标记复习失败，请稍后重试。';
      // 可以考虑乐观更新的回滚
    }
    // 无需 isLoading 状态
  }

  // 调用后端 API 删除错题
  async function deleteError(id) {
    isLoading.value = true;
    error.value = null;
    try {
      // 发送 DELETE 请求
      await axios.delete(`${API_BASE_URL}/${id}`);
      // 从本地列表中移除
      errors.value = errors.value.filter(e => e.id !== id);
      console.log(`Error log with id ${id} removed via API.`);
    } catch (err) {
      console.error('Error removing error log via API:', err);
      error.value = '删除错题失败，请稍后重试。';
    } finally {
      isLoading.value = false;
    }
  }

  // --- Initialization ---
  // Store 初始化时自动加载一次所有错题（无筛选）
  loadErrors();

  // --- Expose ---
  return {
    errors,
    isLoading,
    error,
    currentFilter, // 暴露筛选状态
    filteredErrors, // 暴露过滤后的列表
    errorCount,     // 暴露错题总数
    availableSubjects, // 暴露可用科目列表
    loadErrors,     // 暴露以便组件可以根据筛选条件重新加载
    addError,
    markAsReviewed,
    deleteError,
  };
});