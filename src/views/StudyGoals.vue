<!-- src/views/StudyGoals.vue -->
<template>
  <div class="gov-style-wrapper">
    <header class="section-header">
      <h1><i class="fas fa-bullseye header-icon"></i> 短期学习目标</h1>
      <p>设定、追踪并完成你的近期小目标。</p>
    </header>

    <!-- 添加目标的表单 -->
    <div class="card add-goal-card">
      <div class="card-header">
        <h2><i class="fas fa-plus-circle card-title-icon"></i> 添加新目标</h2>
      </div>
      <div class="card-body">
        <form @submit.prevent="addGoalHandler" class="add-goal-form">
          <input
            type="text"
            v-model="newGoalText"
            placeholder="例如：完成行测第一章练习"
            required
            aria-label="新目标内容"
            class="form-control"
          >
          <button type="submit" class="btn btn-primary" :disabled="!newGoalText.trim()">
            <i class="fas fa-plus"></i> 添加
          </button>
        </form>
      </div>
    </div>

    <!-- 目标列表与统计 -->
    <div class="card goals-list-card">
      <div class="card-header">
        <h2><i class="fas fa-list-check card-title-icon"></i> 目标列表</h2>
      </div>
      <div class="card-body">
        <div class="goals-summary">
          <div class="summary-item">
            总数: <strong>{{ totalGoalsCount }}</strong>
          </div>
          <div class="summary-item">
            进行中: <strong>{{ activeGoalsCount }}</strong>
          </div>
          <div class="summary-item">
            已完成: <strong>{{ completedGoalsCount }}</strong>
          </div>
        </div>

        <div class="goals-progress" v-if="totalGoalsCount > 0">
          <div class="progress-bar-container">
            <div class="progress-bar" :style="{ width: completionPercentage + '%' }">
              {{ completionPercentage.toFixed(0) }}%
            </div>
          </div>
        </div>

        <div class="goals-filter-controls">
          <button
            @click="currentFilter = 'all'"
            :class="['btn btn-filter', { active: currentFilter === 'all' }]"
          >全部</button>
          <button
            @click="currentFilter = 'active'"
            :class="['btn btn-filter', { active: currentFilter === 'active' }]"
          >进行中</button>
          <button
            @click="currentFilter = 'completed'"
            :class="['btn btn-filter', { active: currentFilter === 'completed' }]"
          >已完成</button>
        </div>

        <div v-if="filteredGoals.length === 0 && totalGoalsCount > 0" class="placeholder-text">
          当前筛选条件下无目标。
        </div>
        <div v-else-if="totalGoalsCount === 0" class="placeholder-text">
          <i class="fas fa-clipboard-list placeholder-icon"></i>
          <p>暂无学习目标，快添加一个吧！</p>
          <span>设定目标是成功的第一步。</span>
        </div>
        <ul v-else class="goals-list">
          <li
            v-for="goal in filteredGoals"
            :key="goal.id"
            class="goal-item"
            :class="{ completed: goal.completed }"
          >
            <input
              type="checkbox"
              :checked="goal.completed"
              @change="toggleGoalHandler(goal.id)"
              class="goal-checkbox"
              :id="'goal-' + goal.id"
              aria-label="标记完成"
            >
            <div class="goal-content" @dblclick="startEditing(goal)">
              <span v-if="editingGoalId !== goal.id" class="goal-text">{{ goal.text }}</span>
              <input
                v-else
                type="text"
                v-model="editingGoalText"
                @blur="finishEditing(goal.id)"
                @keyup.enter="finishEditing(goal.id)"
                @keyup.esc="cancelEditing"
                class="form-control edit-input"
                ref="editInputRef"
              >
            </div>
            <button @click="removeGoalHandler(goal.id)" class="btn btn-danger btn-icon remove-goal-btn" title="删除目标">
              <i class="fas fa-trash"></i>
            </button>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { useGoalStore } from '@/stores/goalStore.js';
import { storeToRefs } from 'pinia';

const goalStore = useGoalStore();
const { goals } = storeToRefs(goalStore);

const newGoalText = ref('');
const currentFilter = ref('all'); // 'all', 'active', 'completed'

// Editing state
const editingGoalId = ref(null);
const editingGoalText = ref('');
const editInputRef = ref(null);


const totalGoalsCount = computed(() => goals.value.length);
const completedGoalsCount = computed(() => goals.value.filter(g => g.completed).length);
const activeGoalsCount = computed(() => totalGoalsCount.value - completedGoalsCount.value);
const completionPercentage = computed(() => {
  return totalGoalsCount.value > 0 ? (completedGoalsCount.value / totalGoalsCount.value) * 100 : 0;
});

const filteredGoals = computed(() => {
  if (currentFilter.value === 'active') {
    return goals.value.filter(goal => !goal.completed);
  }
  if (currentFilter.value === 'completed') {
    return goals.value.filter(goal => goal.completed);
  }
  return goals.value; // 'all'
});

function addGoalHandler() {
  const text = newGoalText.value.trim();
  if (text) {
    goalStore.addGoal(text);
    newGoalText.value = '';
  }
}

function toggleGoalHandler(id) {
  goalStore.toggleGoal(id);
}

function removeGoalHandler(id) {
  if (confirm('确定要删除这个目标吗？')) {
    goalStore.removeGoal(id);
  }
}

async function startEditing(goal) {
  editingGoalId.value = goal.id;
  editingGoalText.value = goal.text;
  await nextTick(); // Wait for the input to be rendered
  if (editInputRef.value && editInputRef.value[0]) {
      editInputRef.value[0].focus();
  } else if (editInputRef.value){ // If it's not an array (only one edit input on page)
      editInputRef.value.focus();
  }
}

function finishEditing(goalId) {
  if (editingGoalId.value === goalId) {
    const newText = editingGoalText.value.trim();
    if (newText) {
      goalStore.editGoal(editingGoalId.value, newText);
    } else {
      // If text is empty, maybe remove the goal or revert? For now, just reverts.
      // Or, you could auto-delete: removeGoalHandler(editingGoalId.value);
    }
    cancelEditing();
  }
}

function cancelEditing() {
  editingGoalId.value = null;
  editingGoalText.value = '';
}

// Load goals on mount if not already loaded by store's setup
// goalStore.loadGoals(); // Typically store handles its initial load
</script>

<style scoped>
/* --- Red Government Style Theme Variables --- */
.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-accent-gold: #B8860B;
  --gov-secondary-gray: #6c757d;
  --gov-secondary-gray-dark: #5a6268;
  --gov-text-primary: #212529;
  --gov-text-secondary: #495057;
  --gov-text-completed: #888888; /* For completed goal text */
  --gov-background-light: #f8f9fa;
  --gov-background-white: #ffffff;
  --gov-border-color: #ced4da;
  --gov-border-color-strong: #adb5bd;
  --gov-danger-red: #dc3545;
  --gov-danger-red-dark: #c82333;
  --gov-success-green: #28a745; /* For progress bar and completion */
  --gov-shadow-soft: 0 2px 4px rgba(0, 0, 0, 0.075);
  --gov-shadow-medium: 0 4px 8px rgba(0, 0, 0, 0.1);
  --gov-transition-default: all 0.2s ease-in-out;

  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
}

/* --- General Component Styles --- */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  box-shadow: var(--gov-shadow-soft);
  margin-bottom: 1.5rem;
}
.card-header {
  padding: 0.75rem 1.25rem;
  background-color: var(--gov-background-light);
  border-bottom: 1px solid var(--gov-border-color);
  border-radius: 4px 4px 0 0;
}
.card-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--gov-text-primary);
  display: flex;
  align-items: center;
}
.card-body {
  padding: 1.25rem;
}
.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--gov-primary-red);
}
.section-header h1 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--gov-text-primary);
  display: flex;
  align-items: center;
}
.section-header h1 > .header-icon {
  color: var(--gov-primary-red);
  margin-right: 0.75rem;
  font-size: 1.6rem;
}
.section-header p {
  font-size: 0.95rem;
  color: var(--gov-text-secondary);
  margin-top: 0.25rem;
}
.card .card-header h2 .card-title-icon {
    color: var(--gov-primary-red);
    font-size: 1em;
    margin-right: 0.5em;
}

/* --- Add Goal Card --- */
.add-goal-card {
  border-left: 5px solid var(--gov-primary-red);
}
.add-goal-form {
  display: flex;
  gap: 0.8rem;
  margin-top: 0.5rem; /* Reduced margin */
}
.form-control { /* Base form control style */
  width: 100%;
  padding: 0.5rem 0.75rem;
  font-size: 0.9rem;
  line-height: 1.5;
  color: var(--gov-text-primary);
  background-color: var(--gov-background-white);
  background-clip: padding-box;
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out;
  box-sizing: border-box;
}
.form-control:focus {
  color: var(--gov-text-primary);
  background-color: var(--gov-background-white);
  border-color: var(--gov-primary-red);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(217, 0, 0, 0.25);
}
.add-goal-form input[type="text"].form-control {
  flex-grow: 1;
}
.add-goal-form button {
  flex-shrink: 0; /* Prevent button from shrinking */
}

/* --- Goals List Card --- */
.goals-list-card {
  border-left: 5px solid var(--gov-secondary-gray);
}

.goals-summary {
  display: flex;
  justify-content: space-around;
  gap: 1rem;
  padding: 0.5rem 0;
  margin-bottom: 1rem;
  background-color: var(--gov-background-light);
  border-radius: 4px;
  border: 1px solid var(--gov-border-color);
  font-size: 0.9rem;
}
.summary-item {
  color: var(--gov-text-secondary);
  text-align: center;
}
.summary-item strong {
  color: var(--gov-text-primary);
  font-weight: 600;
}

.goals-progress {
  margin-bottom: 1.5rem;
}
.progress-bar-container {
  width: 100%;
  background-color: var(--gov-border-color);
  border-radius: 4px;
  height: 20px;
  overflow: hidden;
}
.progress-bar {
  background-color: var(--gov-success-green);
  height: 100%;
  color: white;
  font-size: 0.8rem;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: width 0.5s ease-in-out;
  white-space: nowrap;
}

.goals-filter-controls {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--gov-border-color);
}
.btn-filter {
  background-color: var(--gov-background-light);
  border: 1px solid var(--gov-border-color-strong);
  color: var(--gov-text-secondary);
  padding: 0.4rem 0.8rem;
  font-size: 0.85rem;
}
.btn-filter:hover {
  background-color: var(--gov-border-color);
  color: var(--gov-text-primary);
}
.btn-filter.active {
  background-color: var(--gov-secondary-gray);
  border-color: var(--gov-secondary-gray-dark);
  color: var(--gov-background-white);
  font-weight: 600;
}

.placeholder-text {
    color: var(--gov-text-secondary);
    text-align: center;
    padding: 2rem 1rem;
    border: 1px dashed var(--gov-border-color);
    border-radius: 4px;
    background-color: var(--gov-background-light);
}
.placeholder-text .placeholder-icon {
  font-size: 2.5rem;
  color: var(--gov-border-color-strong);
  margin-bottom: 0.75rem;
}
.placeholder-text p {
  font-size: 1.1rem;
  color: var(--gov-text-primary);
  font-weight: 500;
  margin-bottom: 0.3rem;
}
.placeholder-text span {
  font-size: 0.9rem;
}

.goals-list {
  list-style: none;
  padding: 0;
  margin-top: 0;
}
.goal-item {
  display: flex;
  align-items: center;
  padding: 0.75rem 0.5rem;
  border-bottom: 1px solid var(--gov-border-color);
  gap: 0.8rem;
  transition: background-color 0.15s ease;
}
.goal-item:hover {
  background-color: var(--gov-background-light);
}
.goal-item:last-child {
  border-bottom: none;
}

.goal-item.completed {
  /* opacity: 0.7; */ /* Reduced for better text readability */
}
.goal-item.completed .goal-text {
  text-decoration: line-through solid var(--gov-danger-red) 2px;
  color: var(--gov-text-completed);
}

.goal-checkbox {
  appearance: none;
  -webkit-appearance: none;
  width: 18px;
  height: 18px;
  border: 2px solid var(--gov-border-color-strong);
  border-radius: 3px;
  position: relative;
  cursor: pointer;
  transition: var(--gov-transition-default);
  flex-shrink: 0;
  background-color: var(--gov-background-white);
}
.goal-checkbox:hover {
  border-color: var(--gov-secondary-gray);
}
.goal-checkbox:checked {
  background-color: var(--gov-success-green);
  border-color: var(--gov-success-green);
}
.goal-checkbox:checked::after {
    content: '\f00c'; /* Checkmark (Font Awesome) */
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    position: absolute;
    color: var(--gov-background-white);
    font-size: 10px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.goal-content {
  flex-grow: 1;
  min-width: 0; /* Prevent overflow issues with flex children */
}
.goal-text {
  color: var(--gov-text-primary);
  cursor: pointer;
  line-height: 1.4;
  word-break: break-word;
  padding: 0.2rem 0; /* Provide clickable area */
}
.edit-input.form-control {
  padding: 0.3rem 0.5rem; /* Smaller padding for edit input */
  font-size: 0.9rem; /* Match goal text size */
  height: auto; /* Adjust height to content */
}

.remove-goal-btn.btn-icon {
  width: 30px;
  height: 30px;
  padding: 0; /* Remove padding if using fixed width/height */
  font-size: 0.8rem; /* Adjust icon size */
}

/* --- Buttons --- */
.btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--gov-transition-default);
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  text-decoration: none;
}
.btn-primary {
  background-color: var(--gov-primary-red);
  border-color: var(--gov-primary-red);
  color: var(--gov-background-white);
}
.btn-primary:hover:not(:disabled) {
  background-color: var(--gov-primary-red-dark);
  border-color: var(--gov-primary-red-dark);
}
.btn-primary:disabled {
  background-color: #e08585; border-color: #e08585; color: #fff5f5; cursor: not-allowed;
}

.btn-danger {
  background-color: var(--gov-danger-red);
  border-color: var(--gov-danger-red);
  color: var(--gov-background-white);
}
.btn-danger:hover:not(:disabled) {
  background-color: var(--gov-danger-red-dark);
  border-color: var(--gov-danger-red-dark);
}
.btn-danger.btn-icon:hover:not(:disabled) { /* Specific for icon button */
  /* Keep standard hover */
}

.btn-small { /* If still used */
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}
.btn-icon { /* General icon button */
  background-color: transparent;
  border: 1px solid transparent;
  color: var(--gov-text-secondary);
  padding: 0.3rem;
}
.btn-icon:hover {
  color: var(--gov-text-primary);
  background-color: var(--gov-border-color);
}
.btn-danger.btn-icon {
  color: var(--gov-danger-red);
}
.btn-danger.btn-icon:hover {
  color: var(--gov-background-white);
  background-color: var(--gov-danger-red);
}

@media (max-width: 768px) {
  .add-goal-form {
    flex-direction: column;
  }
  .add-goal-form button {
    align-self: flex-end;
  }
  .goals-summary {
    flex-direction: column;
    gap: 0.5rem;
    align-items: stretch; /* Make items take full width */
    padding: 0.75rem;
  }
  .summary-item {
    padding: 0.3rem 0;
    border-bottom: 1px solid var(--gov-border-color);
  }
  .summary-item:last-child {
    border-bottom: none;
  }
  .goals-filter-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  .btn-filter {
    flex-basis: calc(33.333% - 0.5rem); /* Approx 3 buttons per row */
    text-align: center;
    justify-content: center;
  }
}
</style>