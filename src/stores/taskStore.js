// src/stores/taskStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import apiClient from '@/utils/apiClient.js'; // 确保 apiClient 配置正确

export const useTaskStore = defineStore('timelineTasks', () => {
  // --- State ---
  const tasksByPhase = ref({
      phase1: [],
      phase2: [],
      phase3: [],
  });
  const isLoading = ref(false); // 用于加载整个任务列表
  const error = ref(null);
  // 可以为单个任务操作（如更新完成状态、编辑文本）添加更细粒度的加载状态
  // const isUpdatingTask = ref(false); // 示例：用于表示某个任务正在被更新

  // --- Getters ---
  const phase1Tasks = computed(() => tasksByPhase.value.phase1 || []);
  const phase2Tasks = computed(() => tasksByPhase.value.phase2 || []);
  const phase3Tasks = computed(() => tasksByPhase.value.phase3 || []);

  const progressPhase1 = computed(() => calculateProgress(phase1Tasks.value));
  const progressPhase2 = computed(() => calculateProgress(phase2Tasks.value));
  const progressPhase3 = computed(() => calculateProgress(phase3Tasks.value));

  const taskSummary = computed(() => {
      const all = [...phase1Tasks.value, ...phase2Tasks.value, ...phase3Tasks.value];
      const total = all.length;
      if (total === 0) return '0 / 0'; // 避免除以零
      const completed = all.filter(task => task.completed).length;
      return `${completed} / ${total}`;
  });

  // 辅助计算函数
  function calculateProgress(tasks) {
    if (!tasks || tasks.length === 0) return 0;
    const completed = tasks.filter(task => task.completed).length;
    return Math.round((completed / tasks.length) * 100);
  }

  // 辅助函数：根据 taskId 查找任务及其所属阶段
  function findTaskAndPhase(taskId) {
    for (const phaseKey of ['phase1', 'phase2', 'phase3']) {
      const tasksInPhase = tasksByPhase.value[phaseKey];
      if (tasksInPhase) {
        const taskIndex = tasksInPhase.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          return {
            phase: phaseKey,
            task: tasksInPhase[taskIndex],
            index: taskIndex,
          };
        }
      }
    }
    return null; // 未找到任务
  }


  // --- Actions ---
  async function loadTasks() {
    isLoading.value = true;
    error.value = null;
    try {
      const response = await apiClient.get('/timeline/tasks/grouped');
      tasksByPhase.value = {
           phase1: Array.isArray(response.data?.phase1) ? response.data.phase1 : [],
           phase2: Array.isArray(response.data?.phase2) ? response.data.phase2 : [],
           phase3: Array.isArray(response.data?.phase3) ? response.data.phase3 : [],
       };
      console.log('[TaskStore] Timeline tasks loaded and grouped from API.');
    } catch (err) {
      console.error('[TaskStore] Error loading timeline tasks:', err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `无法加载时间轴任务: ${backendError}`;
      tasksByPhase.value = { phase1: [], phase2: [], phase3: [] }; // 重置以避免显示旧数据
    } finally {
      isLoading.value = false;
    }
  }

  async function updateTaskCompletion(taskId, completed) {
    error.value = null; // 清除之前的错误信息
    // isUpdatingTask.value = true; // 如果有此状态，在此设置

    const taskLocation = findTaskAndPhase(taskId);
    let originalCompletedState = null;

    if (taskLocation) {
        originalCompletedState = taskLocation.task.completed;
        // 乐观更新
        tasksByPhase.value[taskLocation.phase][taskLocation.index].completed = completed;
    } else {
        console.warn(`[TaskStore] Task ${taskId} not found locally for optimistic update (completion).`);
        // isUpdatingTask.value = false;
        return false; // 任务未找到，操作失败
    }

    try {
      await apiClient.patch(`/timeline/tasks/${taskId}`, { completed });
      console.log(`[TaskStore] Task ${taskId} completion updated to ${completed} via API.`);
      // isUpdatingTask.value = false;
      return true; // API 调用成功
    } catch (err) {
      console.error(`[TaskStore] Error updating task ${taskId} completion:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `更新任务状态失败: ${backendError}`;
      // 回滚乐观更新
      if (taskLocation && originalCompletedState !== null) {
          tasksByPhase.value[taskLocation.phase][taskLocation.index].completed = originalCompletedState;
          console.log(`[TaskStore] Rolled back optimistic update for task ${taskId} completion.`);
      }
      // isUpdatingTask.value = false;
      return false; // API 调用失败
    }
  }

  // 新增：编辑任务文本的 action
  async function editTaskText(taskId, newLabel) {
    error.value = null; // 清除之前的错误信息
    // isUpdatingTask.value = true; // 如果有此状态

    const taskLocation = findTaskAndPhase(taskId);
    let originalLabel = null;

    if (taskLocation) {
        originalLabel = taskLocation.task.label;
        if (originalLabel === newLabel) { // 如果标签没有改变，则不执行任何操作
            // console.log(`[TaskStore] Task ${taskId} label unchanged. No update needed.`);
            // isUpdatingTask.value = false;
            return true; // 视为成功，因为没有需要做的
        }
        // 乐观更新
        tasksByPhase.value[taskLocation.phase][taskLocation.index].label = newLabel;
    } else {
        console.warn(`[TaskStore] Task ${taskId} not found locally for optimistic update (label).`);
        // isUpdatingTask.value = false;
        return false; // 任务未找到，操作失败
    }

    try {
      // 假设 API 端点接受 { label: newLabel }
      await apiClient.patch(`/timeline/tasks/${taskId}`, { label: newLabel });
      console.log(`[TaskStore] Task ${taskId} label updated to "${newLabel}" via API.`);
      // isUpdatingTask.value = false;
      return true; // API 调用成功
    } catch (err) {
      console.error(`[TaskStore] Error updating task ${taskId} label:`, err);
      const backendError = err.response?.data?.message || err.message || '未知网络错误';
      error.value = `编辑任务失败: ${backendError}`;
      // 回滚乐观更新
      if (taskLocation && originalLabel !== null) {
          tasksByPhase.value[taskLocation.phase][taskLocation.index].label = originalLabel;
          console.log(`[TaskStore] Rolled back optimistic update for task ${taskId} label.`);
      }
      // isUpdatingTask.value = false;
      return false; // API 调用失败
    }
  }


  // --- Initialization ---
  // 初始加载任务，这通常在 store 第一次被使用时自动执行，或者你可以在 App.vue 中调用
  loadTasks();

  // --- Expose ---
  return {
    // State & Getters (通过 storeToRefs 在组件中使用)
    isLoading,
    error,
    phase1Tasks,
    phase2Tasks,
    phase3Tasks,
    progressPhase1,
    progressPhase2,
    progressPhase3,
    taskSummary,

    // Actions (直接通过 store 实例在组件中调用)
    loadTasks,
    updateTaskCompletion,
    editTaskText, // <<< 暴露新添加的 action >>>

    // isUpdatingTask // 如果添加了细粒度加载状态，也需要暴露
  };
});