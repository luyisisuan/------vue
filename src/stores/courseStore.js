// src/stores/courseStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// <<< 导入 apiClient >>>
import apiClient from '@/utils/apiClient.js';
// import axios from 'axios'; // <<< 移除或注释掉

// <<< 不再需要 API_BASE_URL 常量 >>>
// const API_BASE_URL = 'http://localhost:8080/api/courses';

export const useCourseStore = defineStore('courseTracker', () => { // Store ID 保持不变

  // --- State ---
  const courses = ref([]);
  const activeCourseId = ref(null);
  const isLoading = ref(false);
  const isUpdating = ref(false);
  const isCreating = ref(false);
  const isDeleting = ref(false);
  const error = ref(null);

  // --- Getters/Computed ---
  const activeCourse = computed(() => {
    if (activeCourseId.value === null || courses.value.length === 0) return null;
    return courses.value.find(c => c.id === activeCourseId.value);
  });

  const progressPercentage = computed(() => {
    const course = activeCourse.value;
    if (!course || course.totalLessons <= 0) return 0;
    const total = Math.max(1, course.totalLessons);
    const completed = Math.max(0, Math.min(course.completedLessons, total));
    return Math.round((completed / total) * 100);
  });

  const courseListForSelection = computed(() => {
      return courses.value.map(c => ({ id: c.id, name: c.name }));
  });

  // --- Actions ---
  async function loadCourses() {
    isLoading.value = true;
    error.value = null;
    try {
      // <<< 使用 apiClient 和相对路径 >>>
      const response = await apiClient.get('/courses');
      courses.value = response.data;
      console.log(`加载了 ${courses.value.length} 个课程。`);

      if (courses.value.length > 0 && activeCourseId.value === null) {
          const lastActiveId = localStorage.getItem('activeCourseId');
          const found = courses.value.find(c => c.id === Number(lastActiveId));
          activeCourseId.value = found ? found.id : courses.value[0].id;
          if (!found && courses.value.length > 0) localStorage.setItem('activeCourseId', courses.value[0].id.toString()); // 保存默认选择
      } else if (courses.value.length === 0) {
          activeCourseId.value = null;
          localStorage.removeItem('activeCourseId'); // 清理 localStorage
      }
    } catch (err) {
      console.error('加载课程列表时出错:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载课程列表: ${backendError}`;
      courses.value = [];
      activeCourseId.value = null;
    } finally {
      isLoading.value = false;
    }
  }

  function setActiveCourse(id) {
      const courseExists = courses.value.some(c => c.id === id);
      if (id !== null && !courseExists) {
          console.warn(`尝试设置一个不存在的课程 ID (${id}) 为激活状态。`);
          // 可以考虑加载列表或清除 id
          // loadCourses(); // 或者
          // id = null;
          return; // 暂时不处理，避免无限循环
      }
      activeCourseId.value = id;
      if (id !== null) {
          localStorage.setItem('activeCourseId', id.toString());
      } else {
          localStorage.removeItem('activeCourseId');
      }
      console.log(`激活课程 ID 设置为: ${id}`);
  }

  async function addCourse(createCourseDto) {
      isCreating.value = true;
      error.value = null;
      try {
          // <<< 使用 apiClient 和相对路径 >>>
          const response = await apiClient.post('/courses', createCourseDto);
          const newCourse = response.data;
          courses.value.unshift(newCourse);
          setActiveCourse(newCourse.id); // 创建后自动激活
          console.log(`新课程 "${newCourse.name}" (ID: ${newCourse.id}) 添加成功。`);
          return newCourse;
      } catch (err) {
          console.error('添加新课程时出错:', err);
          const backendError = err.response?.data?.message || err.message || '创建课程失败';
          error.value = backendError;
          return null;
      } finally {
          isCreating.value = false;
      }
  }

  async function updateCourseData(courseId, updates) {
    if (courseId === null) {
        error.value = "无法更新：未指定课程 ID。";
        return false;
    }
    isUpdating.value = true;
    error.value = null;

    try {
      // <<< 使用 apiClient 和相对路径 (包含 ID) >>>
      const response = await apiClient.patch(`/courses/${courseId}`, updates);
      const updatedCourseData = response.data;
      const index = courses.value.findIndex(c => c.id === courseId);
      if (index !== -1) {
        courses.value[index] = updatedCourseData;
        console.log(`课程 ID ${courseId} 更新成功。`);
      } else {
         console.warn(`更新成功，但在本地列表中未找到课程 ID ${courseId} 进行更新。正在重新加载列表...`);
         await loadCourses(); // 如果本地没找到，重新加载列表可能是更稳妥的做法
      }
      return true;
    } catch (err) {
      console.error(`更新课程 ID ${courseId} 时出错:`, err);
      const backendError = err.response?.data?.message || err.message || '未知错误';
      error.value = `更新课程数据失败: ${backendError}`;
      return false;
    } finally {
      isUpdating.value = false;
    }
  }

  async function deleteCourse(courseId) {
      if (courseId === null) {
          error.value = "无法删除：未指定课程 ID。";
          return false;
      }
      isDeleting.value = true;
      error.value = null;
      try {
          // <<< 使用 apiClient 和相对路径 (包含 ID) >>>
          await apiClient.delete(`/courses/${courseId}`);
          const initialLength = courses.value.length;
          courses.value = courses.value.filter(c => c.id !== courseId);
          console.log(`课程 ID ${courseId} 已删除。`);

          if (activeCourseId.value === courseId) {
              setActiveCourse(courses.value.length > 0 ? courses.value[0].id : null);
          }
          return initialLength > courses.value.length;

      } catch (err) {
          console.error(`删除课程 ID ${courseId} 时出错:`, err);
          const backendError = err.response?.data?.message || err.message || '未知错误';
          error.value = `删除课程失败: ${backendError}`;
          return false;
      } finally {
          isDeleting.value = false;
      }
  }

  // --- Initialization ---
  loadCourses(); // 初始化时加载课程列表

  // --- Expose ---
  return {
    // State
    courses,
    activeCourseId,
    isLoading,
    isUpdating,
    isCreating,
    isDeleting,
    error,
    // Getters/Computed
    activeCourse,
    progressPercentage,
    courseListForSelection,
    // Actions
    loadCourses,
    setActiveCourse,
    addCourse,
    updateCourseData,
    deleteCourse,
  };
});