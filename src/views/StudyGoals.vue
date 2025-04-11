<!-- src/views/StudyGoals.vue -->
<template>
    <div>
      <header class="section-header">
        <!-- 使用一个合适的新图标 -->
        <h1><i class="fas fa-bullseye icon-gradient"></i> 短期学习目标</h1>
        <p>设定并追踪你的近期小目标。</p>
      </header>
  
      <!-- 添加目标的表单 -->
      <div class="card add-goal-card">
        <h2><i class="fas fa-plus-circle icon-gradient-secondary"></i> 添加新目标</h2>
        <!-- 使用 @submit.prevent 阻止默认提交行为并调用 addGoalHandler -->
        <form @submit.prevent="addGoalHandler" class="add-goal-form">
          <input
            type="text"
            v-model="newGoalText"
            placeholder="例如：完成行测第一章练习"
            required
            aria-label="新目标内容"
          >
          <button type="submit" class="btn btn-primary">
            <i class="fas fa-plus"></i> 添加
          </button>
        </form>
      </div>
  
      <!-- 目标列表 -->
      <div class="card goals-list-card">
        <h2><i class="fas fa-list-check icon-gradient-secondary"></i> 目标列表</h2>
        <div v-if="goals.length === 0" class="placeholder-text">
          暂无学习目标，快添加一个吧！
        </div>
        <ul v-else class="goals-list">
          <!-- 使用 v-for 遍历 Pinia Store 中的 goals 数组 -->
          <li
            v-for="goal in goals"
            :key="goal.id"
            class="goal-item"
            :class="{ completed: goal.completed }"
          >
            <!-- 复选框用于标记完成状态，使用 @change 触发 toggleGoal -->
            <input
              type="checkbox"
              :checked="goal.completed"
              @change="toggleGoalHandler(goal.id)"
              class="goal-checkbox"
              :id="'goal-' + goal.id"
              aria-label="标记完成"
            >
            <!-- 目标文本 -->
            <label :for="'goal-' + goal.id" class="goal-text">{{ goal.text }}</label>
            <!-- 删除按钮 -->
            <button @click="removeGoalHandler(goal.id)" class="btn btn-danger btn-small remove-goal-btn">
              <i class="fas fa-trash"></i>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref } from 'vue';
  import { useGoalStore } from '@/stores/goalStore.js'; // 导入刚才创建的 Store
  import { storeToRefs } from 'pinia'; // 用于保持响应性
  
  // --- 获取 Store 实例 ---
  const goalStore = useGoalStore();
  
  // --- 从 Store 获取 State ---
  // 使用 storeToRefs 确保 goals 数组在模板中保持响应性
  const { goals } = storeToRefs(goalStore);
  
  // --- 组件内部状态 ---
  // 用于绑定添加目标输入框的文本
  const newGoalText = ref('');
  
  // --- 事件处理方法 ---
  // 处理添加目标表单的提交事件
  function addGoalHandler() {
    goalStore.addGoal(newGoalText.value); // 调用 Store 的 action
    newGoalText.value = ''; // 清空输入框
  }
  
  // 处理切换目标完成状态的事件
  function toggleGoalHandler(id) {
    goalStore.toggleGoal(id); // 调用 Store 的 action
  }
  
  // 处理删除目标的事件
  function removeGoalHandler(id) {
    // 可以加一个确认框
    if (confirm('确定要删除这个目标吗？')) {
      goalStore.removeGoal(id); // 调用 Store 的 action
    }
  }
  
  // 注意：加载数据的逻辑已在 Store 的初始化中完成，这里通常不需要再写加载逻辑
  // onMounted(() => {
  //   goalStore.loadGoals(); // 如果需要在组件挂载时强制刷新，可以调用
  // });
  
  </script>
  
  <style scoped>
  /* --- Section Header (Assuming global styles handle basic layout) --- */
  /* Add specific icon color if needed */
  .section-header i.fa-bullseye {
    background: var(--gradient-info); /* Example: Use info gradient */
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
  
  /* --- Add Goal Card --- */
  .add-goal-card {
    border-left: 4px solid var(--primary-color); /* Example accent border */
  }
  
  .add-goal-form {
    display: flex;
    gap: 0.8rem;
    margin-top: 1rem;
  }
  
  .add-goal-form input[type="text"] {
    flex-grow: 1; /* 让输入框占据大部分空间 */
    padding: 0.6em 0.9em;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    font-size: 0.95em;
  }
  .add-goal-form input[type="text"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 3px rgba(74, 105, 189, 0.2);
  }
  
  .add-goal-form button {
    flex-shrink: 0; /* 防止按钮被压缩 */
  }
  
  /* --- Goals List Card --- */
  .goals-list-card {
    border-left: 4px solid var(--secondary-color); /* Example accent border */
  }
  
  .placeholder-text {
      color: var(--text-light);
      text-align: center;
      padding: 2rem;
      font-style: italic;
  }
  
  .goals-list {
    list-style: none;
    padding: 0;
    margin-top: 1rem;
  }
  
  .goal-item {
    display: flex;
    align-items: center;
    padding: 0.8rem 0.5rem; /* Adjust padding */
    border-bottom: 1px solid var(--border-color);
    gap: 0.8rem;
    transition: opacity 0.3s ease;
  }
  .goal-item:last-child {
    border-bottom: none;
  }
  
  .goal-item.completed {
    opacity: 0.6;
  }
  
  .goal-item.completed .goal-text {
    text-decoration: line-through;
    color: var(--text-light);
  }
  
  .goal-checkbox {
    /* Style the checkbox similar to task-checkbox */
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid #adb5bd;
    border-radius: 4px;
    position: relative;
    cursor: pointer;
    transition: background-color 0.3s ease, border-color 0.3s ease;
    flex-shrink: 0;
    background-color: white;
  }
  .goal-checkbox:hover {
    border-color: var(--primary-light);
  }
  .goal-checkbox:checked {
    background-color: var(--success-color); /* Use success color for completed */
    border-color: var(--success-color);
  }
  .goal-checkbox:checked::after {
      content: '\f00c'; /* Checkmark */
      font-family: 'Font Awesome 6 Free';
      font-weight: 900;
      position: absolute;
      color: white;
      font-size: 10px;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
  }
  
  
  .goal-text {
    flex-grow: 1; /* Allow text to take available space */
    color: var(--text-color);
    cursor: pointer; /* Make label clickable */
    line-height: 1.4; /* Adjust line height for readability */
    word-break: break-word; /* Allow long text to wrap */
  }
  
  .remove-goal-btn {
    margin-left: auto; /* Push delete button to the right */
    flex-shrink: 0;
    padding: 0.3em 0.6em; /* Smaller padding for small button */
  }
  
  /* Reuse global .card, .btn, .icon-gradient-secondary styles if available */
  /* Otherwise, define them here or in global CSS */
  .card { /* Basic card styles if not global */
      background-color: var(--card-bg, #ffffff);
      border-radius: var(--card-border-radius, 12px);
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: var(--shadow-light, rgba(50, 50, 93, 0.1) 0px 2px 5px -1px, rgba(0, 0, 0, 0.1) 0px 1px 3px -1px);
      border: 1px solid var(--border-color, #e1e8f0);
  }
  .icon-gradient-secondary { /* If not global */
      background: var(--gradient-secondary);
      -webkit-background-clip: text;
      background-clip: text;
      color: transparent;
      font-size: 1.1em;
      margin-right: 0.3em;
  }
  .btn { /* Basic btn styles if not global */
      /* ... basic button styles ... */
  }
  .btn-primary { /* ... */ }
  .btn-danger { /* ... */ }
  .btn-small { /* ... */ }
  
  </style>