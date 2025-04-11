// src/stores/goalStore.js
import { defineStore } from 'pinia';
import { ref } from 'vue';
import config from '@/config.js'; // 假设你的配置文件路径
import { loadData, saveData, generateId } from '@/utils/storage.js'; // 假设你的工具函数路径

export const useGoalStore = defineStore('studyGoals', () => {
  // --- State ---
  // 目标列表，每个目标是一个对象 { id: string, text: string, completed: boolean }
  const goals = ref([]);

  // --- Actions ---
  // 从 localStorage 加载目标
  function loadGoals() {
    // 使用 config 文件中定义的 key，如果还没有，需要去 config.js 添加
    // 例如： config.localStorageKeys.studyGoals = 'dxcGwyStudyGoals_v1';
    goals.value = loadData(config.localStorageKeys.studyGoals, []);
    console.log(`Loaded ${goals.value.length} study goals.`);
  }

  // 保存目标到 localStorage
  function saveGoals() {
    saveData(config.localStorageKeys.studyGoals, goals.value);
    console.log('Study goals saved.');
  }

  // 添加新目标
  function addGoal(text) {
    if (!text || !text.trim()) {
      console.warn('Goal text cannot be empty.');
      return; // 不添加空目标
    }
    const newGoal = {
      id: generateId(), // 使用你的 ID 生成函数
      text: text.trim(),
      completed: false,
    };
    goals.value.unshift(newGoal); // 添加到列表开头
    saveGoals(); // 添加后立即保存
  }

  // 切换目标完成状态
  function toggleGoal(id) {
    const goal = goals.value.find(g => g.id === id);
    if (goal) {
      goal.completed = !goal.completed;
      saveGoals(); // 切换状态后保存
    } else {
      console.warn(`Goal with id ${id} not found for toggling.`);
    }
  }

  // 删除目标
  function removeGoal(id) {
    goals.value = goals.value.filter(g => g.id !== id);
    saveGoals(); // 删除后保存
  }

  // --- Initialization ---
  // Store 初始化时自动加载一次数据
  loadGoals();

  // --- Expose ---
  // 暴露 state 和 actions 供组件使用
  return {
    goals,
    loadGoals, // 虽然内部调用了，也可以暴露出来手动刷新
    addGoal,
    toggleGoal,
    removeGoal,
  };
});