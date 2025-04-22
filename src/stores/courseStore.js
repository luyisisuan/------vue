// src/stores/courseStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
// 不再需要 throttle，因为笔记功能已移除
// import { throttle } from 'lodash-es';

// <<< 更新 API 基础 URL >>>
const API_BASE_URL = 'http://localhost:8080/api/courses';

// <<< Store 名称可以保持不变或改为 'courses'，这里保持 'courseTracker' 以减少引用修改 >>>
export const useCourseStore = defineStore('courseTracker', () => {

  // --- 新的状态结构 ---
  const courses = ref([]); // <<< 存储课程对象列表
  const activeCourseId = ref(null); // <<< 当前激活/选中的课程 ID
  const isLoading = ref(false);     // 列表加载状态
  const isUpdating = ref(false);    // 单个课程更新状态 (替代旧的 isLoading 用途)
  const isCreating = ref(false);    // 创建课程状态
  const isDeleting = ref(false);    // 删除课程状态
  const error = ref(null);          // 通用错误信息
  // const notesStatus = ref('');   // <<< 移除笔记状态

  // --- 新的 Getters/Computed ---

  // 获取当前激活的课程对象
  const activeCourse = computed(() => {
    if (activeCourseId.value === null || courses.value.length === 0) {
      return null; // 没有激活的课程或列表为空
    }
    return courses.value.find(c => c.id === activeCourseId.value);
  });

  // 计算当前激活课程的进度百分比
  const progressPercentage = computed(() => {
    const course = activeCourse.value;
    if (!course || course.totalLessons <= 0) {
      return 0; // 没有激活课程或总课时无效
    }
    // 使用 Service 层类似的校验逻辑确保安全
    const total = Math.max(1, course.totalLessons);
    const completed = Math.max(0, Math.min(course.completedLessons, total));
    return Math.round((completed / total) * 100);
  });

  // 获取所有课程的简要列表 (例如用于下拉选择)
  const courseListForSelection = computed(() => {
      return courses.value.map(c => ({ id: c.id, name: c.name }));
  });

  // --- 新的 Actions ---

  /**
   * 从后端加载所有课程列表
   */
  async function loadCourses() {
    isLoading.value = true; // 标记列表加载开始
    error.value = null;
    try {
      const response = await axios.get(API_BASE_URL);
      courses.value = response.data; // 更新整个列表 (假设后端返回 CourseDto 列表)
      console.log(`加载了 ${courses.value.length} 个课程。`);

      // 设置默认激活课程 (例如第一个，或者从 localStorage 读取上次选择)
      if (courses.value.length > 0 && activeCourseId.value === null) {
          // 尝试从 localStorage 读取
          const lastActiveId = localStorage.getItem('activeCourseId');
          const found = courses.value.find(c => c.id === Number(lastActiveId));
          if (found) {
              activeCourseId.value = found.id;
          } else {
              // 否则默认选中第一个
              activeCourseId.value = courses.value[0].id;
          }
      } else if (courses.value.length === 0) {
          activeCourseId.value = null; // 如果列表为空，清空 activeId
      }
    } catch (err) {
      console.error('加载课程列表时出错:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载课程列表: ${backendError}`;
      courses.value = []; // 清空列表
      activeCourseId.value = null;
    } finally {
      isLoading.value = false; // 标记列表加载结束
    }
  }

  /**
   * 设置当前激活的课程 ID
   * @param {number | null} id 课程 ID, 或 null 取消激活
   */
  function setActiveCourse(id) {
      const courseExists = courses.value.some(c => c.id === id);
      if (id !== null && !courseExists) {
          console.warn(`尝试设置一个不存在的课程 ID (${id}) 为激活状态。`);
          return;
      }
      activeCourseId.value = id;
      // 将选择保存到 localStorage
      if (id !== null) {
          localStorage.setItem('activeCourseId', id.toString());
      } else {
          localStorage.removeItem('activeCourseId');
      }
      console.log(`激活课程 ID 设置为: ${id}`);
  }

  /**
   * 创建一个新课程
   * @param {object} createCourseDto 包含新课程数据的 DTO (符合 CreateCourseDto 结构)
   * @returns {Promise<CourseDto | null>} 创建成功则返回新课程 DTO，否则返回 null
   */
  async function addCourse(createCourseDto) {
      isCreating.value = true;
      error.value = null;
      try {
          const response = await axios.post(API_BASE_URL, createCourseDto);
          const newCourse = response.data; // 后端返回创建好的 CourseDto
          courses.value.unshift(newCourse); // 添加到列表开头
          // 可选：创建后自动设为激活
          setActiveCourse(newCourse.id);
          console.log(`新课程 "${newCourse.name}" (ID: ${newCourse.id}) 添加成功。`);
          return newCourse;
      } catch (err) {
          console.error('添加新课程时出错:', err);
          const backendError = err.response?.data?.message || err.message || '创建课程失败';
          error.value = backendError; // 显示具体的后端校验或错误信息
          return null;
      } finally {
          isCreating.value = false;
      }
  }

  /**
   * 更新指定 ID 的课程数据
   * @param {number} courseId 要更新的课程 ID
   * @param {object} updates 包含要更新字段的对象 (符合 UpdateCourseDto 结构)
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function updateCourseData(courseId, updates) {
    if (courseId === null) {
        error.value = "无法更新：未指定课程 ID。";
        return false;
    }
    // 不再需要前端的复杂校验，依赖后端和实体的 @PreUpdate
    // 可以保留一些基础的前端校验，如 completed <= total

    isUpdating.value = true;
    error.value = null;
    // notesStatus.value = ''; // 移除笔记状态

    try {
      // <<< 调用新的 PATCH API，包含课程 ID >>>
      const response = await axios.patch(`${API_BASE_URL}/${courseId}`, updates);
      const updatedCourseData = response.data; // 后端返回更新后的 CourseDto

      // 更新本地列表中的对应课程
      const index = courses.value.findIndex(c => c.id === courseId);
      if (index !== -1) {
        // 直接替换整个对象，确保所有字段（包括 lastUpdated）都更新
        courses.value[index] = updatedCourseData;
        console.log(`课程 ID ${courseId} 更新成功。`);
      } else {
         console.warn(`更新成功，但在本地列表中未找到课程 ID ${courseId} 进行更新。`);
         // 可以选择重新加载列表: await loadCourses();
      }
      return true;
    } catch (err) {
      console.error(`更新课程 ID ${courseId} 时出错:`, err);
      const backendError = err.response?.data?.message || err.message || '未知错误';
      error.value = `更新课程数据失败: ${backendError}`;
      // notesStatus.value = '保存失败!'; // 移除笔记状态
      return false;
    } finally {
      isUpdating.value = false;
    }
  }

  /**
   * 删除指定 ID 的课程
   * @param {number} courseId 要删除的课程 ID
   * @returns {Promise<boolean>} 操作是否成功
   */
  async function deleteCourse(courseId) {
      if (courseId === null) {
          error.value = "无法删除：未指定课程 ID。";
          return false;
      }
      isDeleting.value = true;
      error.value = null;
      try {
          // <<< 调用新的 DELETE API >>>
          await axios.delete(`${API_BASE_URL}/${courseId}`);
          // 从本地列表移除
          const initialLength = courses.value.length;
          courses.value = courses.value.filter(c => c.id !== courseId);
          console.log(`课程 ID ${courseId} 已删除。`);

          // 如果删除的是当前激活的课程，需要重新设置激活课程
          if (activeCourseId.value === courseId) {
              setActiveCourse(courses.value.length > 0 ? courses.value[0].id : null);
          }
          return initialLength > courses.value.length; // 确认确实移除了

      } catch (err) {
          console.error(`删除课程 ID ${courseId} 时出错:`, err);
          const backendError = err.response?.data?.message || err.message || '未知错误';
          error.value = `删除课程失败: ${backendError}`;
          return false;
      } finally {
          isDeleting.value = false;
      }
  }


  // <<< 移除 saveNotesThrottled 函数 >>>
  // const saveNotesThrottled = throttle(...)


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
    // notesStatus, // 移除

    // Getters/Computed
    activeCourse, // <<< 暴露激活课程对象
    progressPercentage,
    courseListForSelection, // 暴露用于选择的列表

    // Actions
    loadCourses,
    setActiveCourse,
    addCourse,
    updateCourseData,
    deleteCourse,
    // saveNotesThrottled // 移除
  };
});