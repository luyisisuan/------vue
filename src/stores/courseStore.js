// src/stores/courseStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import axios from 'axios';
import { throttle } from 'lodash-es'; // 引入节流

const API_BASE_URL = 'http://localhost:8080/api/course-tracker'; // 后端 API 基础 URL

export const useCourseStore = defineStore('courseTracker', () => {
  // --- State ---
  const courseName = ref('');
  const courseLink = ref('');
  const totalLessons = ref(1);
  const completedLessons = ref(0);
  const notes = ref(''); // Store state for notes
  const lastUpdated = ref(null);

  const isLoading = ref(false);
  const error = ref(null);
  const notesStatus = ref(''); // 用于显示笔记保存状态

  // --- Getters ---
  const progressPercentage = computed(() => {
    const total = totalLessons.value || 1;
    const completed = Math.max(0, Math.min(completedLessons.value || 0, total));
    return Math.round((completed / total) * 100);
  });

  // --- Actions ---
  async function loadCourseData() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.get(API_BASE_URL);
      const data = response.data;
      courseName.value = data.courseName;
      courseLink.value = data.courseLink;
      totalLessons.value = data.totalLessons || 1;
      completedLessons.value = data.completedLessons || 0;
      notes.value = data.notes || ''; // Update store state
      lastUpdated.value = data.lastUpdated;
      console.log('Course tracker data loaded from API.');
    } catch (err) {
      console.error('Error loading course tracker data:', err);
      error.value = '无法加载课程数据，请稍后重试。';
    } finally {
      isLoading.value = false;
    }
  }

  async function updateCourseData(updates) {
     // Validation logic for lessons
     if ('completedLessons' in updates && 'totalLessons' in updates) {
         updates.completedLessons = Math.min(updates.completedLessons, updates.totalLessons);
     } else if ('completedLessons' in updates) {
          updates.completedLessons = Math.min(updates.completedLessons, totalLessons.value);
     }
     if ('totalLessons' in updates) {
         updates.totalLessons = Math.max(1, updates.totalLessons);
         // Check if completion needs adjustment based on new total
         let currentCompleted = updates.completedLessons ?? completedLessons.value;
         if (currentCompleted > updates.totalLessons) {
             updates.completedLessons = updates.totalLessons;
         }
     }
      // Ensure completed lessons is not negative
     if ('completedLessons' in updates) {
       updates.completedLessons = Math.max(0, updates.completedLessons);
     } else {
        // If completedLessons is not in updates, still ensure it's not negative after potential totalLessons update
        updates.completedLessons = Math.max(0, completedLessons.value);
     }


    // Don't set isLoading to true for every minor notes update if using throttle heavily
    // isLoading.value = true;
    error.value = null;
    try {
      const response = await axios.patch(API_BASE_URL, updates);
      const data = response.data;
      // Update local state from response to ensure consistency
      courseName.value = data.courseName;
      courseLink.value = data.courseLink;
      totalLessons.value = data.totalLessons || 1;
      completedLessons.value = data.completedLessons || 0;
      notes.value = data.notes || ''; // Update store state
      lastUpdated.value = data.lastUpdated;
      console.log('Course tracker data updated via API.');
       if ('notes' in updates) {
           // If notes were updated successfully, clear status immediately
           // The timeout will handle the "自动保存..." display
           notesStatus.value = '';
       }
       return true;
    } catch (err) {
      console.error('Error updating course tracker data:', err);
      const backendError = err.response?.data?.message || err.message || '未知错误';
      error.value = `更新课程数据失败: ${backendError}`;
       if ('notes' in updates) {
           notesStatus.value = '保存失败!'; // Show specific status for notes
       }
       return false;
    } finally {
      // isLoading.value = false; // Only set false if set true at start
    }
  }

  // **MODIFIED:**节流保存笔记的函数，接收笔记内容作为参数
  const saveNotesThrottled = throttle(async (contentToSave) => { // <<< 接收参数
    notesStatus.value = '自动保存...';
    // 使用传入的 contentToSave 更新
    const success = await updateCourseData({ notes: contentToSave }); // <<< 使用参数
    // No need to handle status here, updateCourseData handles it on success/fail
    // The timeout handles clearing the "自动保存..." message
    if (success) {
        // Set a timeout to clear the "自动保存..." message if no other status overwrites it
        setTimeout(() => { if (notesStatus.value === '自动保存...') notesStatus.value = ''; }, 2000); // Increased timeout slightly
    } else {
         // If update failed, error ref should be set by updateCourseData
         // We might want a specific notesStatus for save failure
         notesStatus.value = '保存失败!';
    }
  }, 3000); // <<< Increased throttle time to 3 seconds

  // --- Initialization ---
  loadCourseData();

  // --- Expose ---
  return {
    courseName,
    courseLink,
    totalLessons,
    completedLessons,
    notes, // Expose notes state
    lastUpdated,
    isLoading,
    error,
    notesStatus,
    progressPercentage,
    loadCourseData,
    updateCourseData,
    saveNotesThrottled // Expose the throttled function
  };
});