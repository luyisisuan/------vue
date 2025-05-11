// src/stores/resourceStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉

// <<< 不再需要 API_BASE_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/resources';

export const useResourceStore = defineStore('resources', () => {
  // --- State ---
  const resources = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  // 分类可以保持本地定义，或从 config/API 获取
  const categories = ref(['官方网站', '学习资料', '时政新闻', '考试资源', '其他']);

  // --- Actions ---
  async function loadResources() {
    isLoading.value = true;
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /resources >>>
      const response = await apiClient.get('/resources');
      if (Array.isArray(response.data)) {
        resources.value = response.data;
        console.log(`Loaded ${resources.value.length} resources from API.`);
      } else {
        console.error("Invalid data format received for resources:", response.data);
        resources.value = [];
        error.value = '加载资源数据格式错误。';
      }
    } catch (err) {
      console.error('Error loading resources:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载资源: ${backendError}`;
      resources.value = [];
    } finally {
      isLoading.value = false;
    }
  }

  async function addResource(resourceData) {
    // isLoading.value = true; // 可以考虑使用 isAdding 状态
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /resources >>>
      const response = await apiClient.post('/resources', resourceData);
      // 推荐将新资源添加到列表开头
      resources.value.unshift(response.data);
      // resources.value.push(response.data); // 或者添加到末尾
      console.log('Resource added:', response.data);
      return true; // 返回 true 表示成功
    } catch (err) {
      console.error('Error adding resource:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `添加资源失败: ${backendError}`;
      return false; // 返回 false 表示失败
    } finally {
      // isLoading.value = false; // isAdding = false;
    }
  }

  async function updateResource(id, resourceData) {
    // isLoading.value = true; // 可以考虑使用 isUpdating 状态
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /resources/{id} >>>
      // 注意：这里原代码用了 PUT，通常 PUT 要求提供完整的资源表示。
      // 如果后端支持 PATCH (部分更新)，用 PATCH 更合适。
      // 如果后端确实是 PUT，确保 resourceData 包含所有字段。
      // 这里我们假设后端是 PUT 或能接受部分更新的 PUT/PATCH
      const response = await apiClient.put(`/resources/${id}`, resourceData);
      const index = resources.value.findIndex(r => r.id === id);
      if (index !== -1) {
        resources.value[index] = response.data; // 使用后端返回的最新数据更新
      } else {
         console.warn(`Updated resource ${id} but not found in local list.`);
         await loadResources(); // 如果本地找不到，重新加载列表
      }
      console.log('Resource updated:', response.data);
      return true;
    } catch (err) {
      console.error('Error updating resource:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `更新资源失败: ${backendError}`;
      return false;
    } finally {
      // isLoading.value = false; // isUpdating = false;
    }
  }

  async function deleteResource(id) {
    // isLoading.value = true; // 可以考虑使用 isDeleting 状态
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 /resources/{id} >>>
      await apiClient.delete(`/resources/${id}`);
      resources.value = resources.value.filter(r => r.id !== id);
      console.log(`Resource with id ${id} deleted.`);
      return true;
    } catch (err) {
      console.error('Error deleting resource:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `删除资源失败: ${backendError}`;
      return false;
    } finally {
      // isLoading.value = false; // isDeleting = false;
    }
  }

  // 初始加载
  loadResources();

  return {
    resources,
    isLoading,
    error,
    categories, // 暴露分类列表
    loadResources,
    addResource,
    updateResource,
    deleteResource
  };
});