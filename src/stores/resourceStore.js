import { defineStore } from 'pinia';
import { ref } from 'vue';
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/resources';

export const useResourceStore = defineStore('resources', () => {
  // --- State ---
  const resources = ref([]);
  const isLoading = ref(false);
  const error = ref(null);
  const categories = ref(['官方网站', '学习资料', '时政新闻', '考试资源', '其他']);

  // --- Actions ---
  async function loadResources() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.get(API_BASE_URL);
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
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.post(API_BASE_URL, resourceData);
      resources.value.push(response.data);
      console.log('Resource added:', response.data);
      return true;
    } catch (err) {
      console.error('Error adding resource:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `添加资源失败: ${backendError}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function updateResource(id, resourceData) {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.put(`${API_BASE_URL}/${id}`, resourceData);
      const index = resources.value.findIndex(r => r.id === id);
      if (index !== -1) {
        resources.value[index] = response.data;
      }
      console.log('Resource updated:', response.data);
      return true;
    } catch (err) {
      console.error('Error updating resource:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `更新资源失败: ${backendError}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  async function deleteResource(id) {
    isLoading.value = true;
    error.value = null;
    try {
      await axios.delete(`${API_BASE_URL}/${id}`);
      resources.value = resources.value.filter(r => r.id !== id);
      console.log(`Resource with id ${id} deleted.`);
      return true;
    } catch (err) {
      console.error('Error deleting resource:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `删除资源失败: ${backendError}`;
      return false;
    } finally {
      isLoading.value = false;
    }
  }

  // 初始加载
  loadResources();

  return {
    resources,
    isLoading,
    error,
    categories,
    loadResources,
    addResource,
    updateResource,
    deleteResource
  };
});