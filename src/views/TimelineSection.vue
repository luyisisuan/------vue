<!-- src/views/TimelineSection.vue -->
<template>
  <div class="gov-style-wrapper">
    <header class="section-header">
      <h1><i class="fas fa-stream header-icon"></i> 备考时间轴</h1>
      <p>按计划推进，稳步提升，决胜考场。</p>
    </header>

    <div v-if="isLoadingTasks" class="loading-indicator card">
      <div class="spinner"></div>
      <p>加载任务数据中...</p>
    </div>
    <div v-else-if="tasksError" class="error-message card">
        <i class="fas fa-exclamation-triangle"></i>
        加载任务失败: {{ tasksError }}
    </div>

    <div v-else class="timeline-accordion-container">
      <!-- Phase 1 -->
      <div class="accordion-item" :class="{ 'is-current': isPhaseCurrent('phase1') }">
        <button
          class="accordion-header phase-1-header"
          :aria-expanded="isPhase1Open"
          @click="toggleAccordion('phase1')"
        >
          <div class="header-main-content">
            <i class="fas fa-layer-group phase-icon"></i>
            <div class="header-text">
              <span>基础夯实阶段</span>
              <small>(当前 - 2025.上半年)</small>
            </div>
          </div>
          <div class="header-aside">
            <span class="task-summary">{{ completedTasksPhase1 }}/{{ phase1Tasks.length }}</span>
            <div class="radial-progress-container">
              <svg class="radial-progress" width="36" height="36" viewBox="0 0 36 36">
                <circle class="radial-progress-bg" cx="18" cy="18" r="15.9155" fill="transparent" stroke-width="3"></circle>
                <circle class="radial-progress-fg phase-1-progress" cx="18" cy="18" r="15.9155" fill="transparent" stroke-width="3"
                        :stroke-dasharray="`${progressPhase1}, 100`"></circle>
              </svg>
            </div>
            <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isPhase1Open }"></i>
          </div>
        </button>
        <transition name="accordion-content-transition">
          <div class="accordion-content" v-show="isPhase1Open">
            <p v-if="phase1Tasks.length === 0" class="no-tasks-message">此阶段暂无任务。</p>
            <ul v-else class="task-list">
              <li class="task-item" v-for="task in phase1Tasks" :key="task.id" :class="{ completed: task.completed }">
                <input type="checkbox" class="task-checkbox" :id="task.id + '-p1'" :checked="task.completed" @change="handleTaskToggle(task.id, $event.target.checked)">
                <div class="task-label-container" @dblclick="startEditing(task)">
                  <span v-if="editingTaskId !== task.id" class="task-label">{{ task.label }}</span>
                  <input
                    v-else
                    type="text"
                    v-model="editingTaskText"
                    @blur="finishEditing(task.id)"
                    @keyup.enter="finishEditing(task.id)"
                    @keyup.esc="cancelEditing"
                    class="form-control edit-input"
                    ref="editInputRef"
                  >
                </div>
                <button v-if="editingTaskId !== task.id" @click="startEditing(task)" class="btn-icon btn-edit-task" title="编辑任务">
                    <i class="fas fa-pencil-alt"></i>
                </button>
              </li>
            </ul>
          </div>
        </transition>
      </div>

      <!-- Phase 2 -->
      <div class="accordion-item" :class="{ 'is-current': isPhaseCurrent('phase2') }">
        <button
          class="accordion-header phase-2-header"
          :aria-expanded="isPhase2Open"
          @click="toggleAccordion('phase2')"
        >
          <div class="header-main-content">
            <i class="fas fa-cogs phase-icon"></i>
            <div class="header-text">
              <span>强化训练阶段</span>
              <small>(2025.暑假)</small>
            </div>
          </div>
           <div class="header-aside">
            <span class="task-summary">{{ completedTasksPhase2 }}/{{ phase2Tasks.length }}</span>
            <div class="radial-progress-container">
              <svg class="radial-progress" width="36" height="36" viewBox="0 0 36 36">
                <circle class="radial-progress-bg" cx="18" cy="18" r="15.9155" fill="transparent" stroke-width="3"></circle>
                <circle class="radial-progress-fg phase-2-progress" cx="18" cy="18" r="15.9155" fill="transparent" stroke-width="3"
                        :stroke-dasharray="`${progressPhase2}, 100`"></circle>
              </svg>
            </div>
            <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isPhase2Open }"></i>
          </div>
        </button>
        <transition name="accordion-content-transition">
            <div class="accordion-content" v-show="isPhase2Open">
                <p v-if="phase2Tasks.length === 0" class="no-tasks-message">此阶段暂无任务。</p>
                <ul v-else class="task-list">
                    <li class="task-item" v-for="task in phase2Tasks" :key="task.id" :class="{ completed: task.completed }">
                        <input type="checkbox" class="task-checkbox" :id="task.id + '-p2'" :checked="task.completed" @change="handleTaskToggle(task.id, $event.target.checked)">
                        <div class="task-label-container" @dblclick="startEditing(task)">
                            <span v-if="editingTaskId !== task.id" class="task-label">{{ task.label }}</span>
                            <input
                                v-else
                                type="text"
                                v-model="editingTaskText"
                                @blur="finishEditing(task.id)"
                                @keyup.enter="finishEditing(task.id)"
                                @keyup.esc="cancelEditing"
                                class="form-control edit-input"
                                ref="editInputRef"
                            >
                        </div>
                        <button v-if="editingTaskId !== task.id" @click="startEditing(task)" class="btn-icon btn-edit-task" title="编辑任务">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </li>
                </ul>
            </div>
        </transition>
      </div>

      <!-- Phase 3 -->
       <div class="accordion-item" :class="{ 'is-current': isPhaseCurrent('phase3') }">
         <button
            class="accordion-header phase-3-header"
            :aria-expanded="isPhase3Open"
            @click="toggleAccordion('phase3')"
         >
            <div class="header-main-content">
                <i class="fas fa-flag-checkered phase-icon"></i>
                <div class="header-text">
                    <span>冲刺模考阶段</span>
                    <small>(2025.考前1-2月)</small>
                </div>
            </div>
             <div class="header-aside">
                <span class="task-summary">{{ completedTasksPhase3 }}/{{ phase3Tasks.length }}</span>
                <div class="radial-progress-container">
                    <svg class="radial-progress" width="36" height="36" viewBox="0 0 36 36">
                        <circle class="radial-progress-bg" cx="18" cy="18" r="15.9155" fill="transparent" stroke-width="3"></circle>
                        <circle class="radial-progress-fg phase-3-progress" cx="18" cy="18" r="15.9155" fill="transparent" stroke-width="3"
                                :stroke-dasharray="`${progressPhase3}, 100`"></circle>
                    </svg>
                </div>
                <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isPhase3Open }"></i>
            </div>
         </button>
         <transition name="accordion-content-transition">
            <div class="accordion-content" v-show="isPhase3Open">
                <p v-if="phase3Tasks.length === 0" class="no-tasks-message">此阶段暂无任务。</p>
                <ul v-else class="task-list">
                    <li class="task-item" v-for="task in phase3Tasks" :key="task.id" :class="{ completed: task.completed }">
                        <input type="checkbox" class="task-checkbox" :id="task.id + '-p3'" :checked="task.completed" @change="handleTaskToggle(task.id, $event.target.checked)">
                        <div class="task-label-container" @dblclick="startEditing(task)">
                           <span v-if="editingTaskId !== task.id" class="task-label">{{ task.label }}</span>
                            <input
                                v-else
                                type="text"
                                v-model="editingTaskText"
                                @blur="finishEditing(task.id)"
                                @keyup.enter="finishEditing(task.id)"
                                @keyup.esc="cancelEditing"
                                class="form-control edit-input"
                                ref="editInputRef"
                            >
                        </div>
                        <button v-if="editingTaskId !== task.id" @click="startEditing(task)" class="btn-icon btn-edit-task" title="编辑任务">
                            <i class="fas fa-pencil-alt"></i>
                        </button>
                    </li>
                </ul>
            </div>
         </transition>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { useTaskStore } from '@/stores/taskStore.js';

const taskStore = useTaskStore();
const {
  phase1Tasks, phase2Tasks, phase3Tasks,
  progressPhase1, progressPhase2, progressPhase3,
  isLoading: isLoadingTasks, error: tasksError,
} = storeToRefs(taskStore);

const isPhase1Open = ref(true);
const isPhase2Open = ref(false);
const isPhase3Open = ref(false);

// Editing state
const editingTaskId = ref(null);
const editingTaskText = ref('');
const originalTaskLabelBeforeEdit = ref(''); // Store the original label when editing starts
const editInputRef = ref(null); // To focus the input field

const completedTasksPhase1 = computed(() => phase1Tasks.value.filter(t => t.completed).length);
const completedTasksPhase2 = computed(() => phase2Tasks.value.filter(t => t.completed).length);
const completedTasksPhase3 = computed(() => phase3Tasks.value.filter(t => t.completed).length);

function isPhaseCurrent(phaseKey) {
  const now = new Date();
  const phaseDates = {
    phase1: { start: new Date('2025-01-01'), end: new Date('2025-06-30') },
    phase2: { start: new Date('2025-07-01'), end: new Date('2025-08-31') },
    phase3: { start: new Date('2025-09-01'), end: new Date('2025-12-31') }
  };
  if (phaseDates[phaseKey]) {
    return now >= phaseDates[phaseKey].start && now <= phaseDates[phaseKey].end;
  }
  return false;
}

function toggleAccordion(phase) {
  if (phase === 'phase1') isPhase1Open.value = !isPhase1Open.value;
  else if (phase === 'phase2') isPhase2Open.value = !isPhase2Open.value;
  else if (phase === 'phase3') isPhase3Open.value = !isPhase3Open.value;
}

async function handleTaskToggle(taskId, isChecked) {
  const success = await taskStore.updateTaskCompletion(taskId, isChecked);
  if (!success) {
      alert(`更新任务状态失败: ${tasksError.value || '未知错误'}`);
  }
}

// --- Editing Functions ---
async function startEditing(task) {
  editingTaskId.value = task.id;
  originalTaskLabelBeforeEdit.value = task.label; // Store original label
  editingTaskText.value = task.label; // Set current text for input
  await nextTick(); // Wait for the input to be rendered
  if (editInputRef.value) {
    editInputRef.value.focus();
    editInputRef.value.select(); // Select text for easy replacement/editing
  }
}

async function finishEditing(taskIdToFinish) {
  if (editingTaskId.value !== taskIdToFinish) {
    return; // Not the task currently being edited (e.g., blur from another element)
  }

  const newText = editingTaskText.value.trim();

  // Check if the text has actually changed and is not empty
  if (newText && newText !== originalTaskLabelBeforeEdit.value) {
    const success = await taskStore.editTaskText(editingTaskId.value, newText);
    if (success) {
      cancelEditing(); // Close editing mode on successful save
    } else {
      alert(`编辑任务失败: ${tasksError.value || '未知错误'}. 请重试或按 ESC 取消.`);
      // Do not cancel editing here; allow user to retry or explicitly cancel.
      // Re-focus input if alert caused blur (though system alerts might prevent this)
      if (editInputRef.value) {
        editInputRef.value.focus();
        editInputRef.value.select();
      }
    }
  } else {
    // No changes made, or text is empty (treat empty as cancel), just cancel editing mode.
    cancelEditing();
  }
}

function cancelEditing() {
  editingTaskId.value = null;
  editingTaskText.value = '';
  originalTaskLabelBeforeEdit.value = ''; // Clear stored original label
}

// Optional: Load initial tasks if not handled by store's eager loading
// if (taskStore.tasks.length === 0 && !isLoadingTasks.value) {
//   taskStore.loadTasks();
// }
</script>

<style scoped>
/* --- Red Government Style Theme Variables --- */
.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-accent-gold: #B8860B;
  --gov-accent-blue: #0056b3;
  --gov-accent-gray: #495057;
  --gov-secondary-gray: #6c757d;
  --gov-text-primary: #212529;
  --gov-text-secondary: #495057;
  --gov-background-light: #f8f9fa;
  --gov-background-white: #ffffff;
  --gov-border-color: #ced4da;
  --gov-border-color-strong: #adb5bd;
  --gov-danger-red: #dc3545;
  --gov-shadow-soft: 0 2px 4px rgba(0, 0, 0, 0.075);
  --gov-shadow-medium: 0 3px 6px rgba(0, 0, 0, 0.1);
  --gov-transition-default: all 0.25s ease-in-out;

  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
}

/* --- General Component Styles --- */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  box-shadow: var(--gov-shadow-soft);
  padding: 1.5rem;
  text-align: center;
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

/* --- Accordion Styles --- */
.timeline-accordion-container {
    border: 1px solid var(--gov-border-color-strong);
    border-radius: 5px;
    overflow: hidden;
    background-color: var(--gov-background-white);
    box-shadow: var(--gov-shadow-medium);
}
.accordion-item {
    border-bottom: 1px solid var(--gov-border-color-strong);
}
.accordion-item:last-child {
    border-bottom: none;
}
.accordion-item.is-current .accordion-header {
  border-left: 5px solid var(--gov-primary-red);
  padding-left: calc(1.25rem - 5px);
}

.accordion-header {
    width: 100%;
    padding: 1rem 1.25rem;
    background-color: var(--gov-background-light);
    border: none;
    text-align: left;
    font-size: 1.05rem;
    font-weight: 600;
    color: var(--gov-text-primary);
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 0.8rem;
    transition: background-color var(--gov-transition-default);
    position: relative;
}
.accordion-header:hover {
    background-color: #e9ecef;
}

.header-main-content {
    display: flex;
    align-items: center;
    gap: 0.8rem;
    flex-grow: 1;
}
.header-text {
    display: flex;
    flex-direction: column;
}
.header-text small {
    font-size: 0.75rem;
    color: var(--gov-text-secondary);
    font-weight: 400;
}
.header-aside {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
}

.phase-icon {
    font-size: 1.3em;
    width: 24px;
    text-align: center;
    transition: transform 0.2s ease-out;
}
.accordion-header:hover .phase-icon {
    transform: scale(1.1);
}

.phase-1-header { background-color: rgba(0, 86, 179, 0.08); } /* Adjusted alpha */
.phase-1-header .phase-icon { color: var(--gov-accent-blue); }
.phase-1-header:hover { background-color: rgba(0, 86, 179, 0.12); }

.phase-2-header { background-color: rgba(184, 134, 11, 0.08); }
.phase-2-header .phase-icon { color: var(--gov-accent-gold); }
.phase-2-header:hover { background-color: rgba(184, 134, 11, 0.12); }

.phase-3-header { background-color: rgba(73, 80, 87, 0.08); }
.phase-3-header .phase-icon { color: var(--gov-accent-gray); }
.phase-3-header:hover { background-color: rgba(73, 80, 87, 0.12); }

.task-summary {
    font-size: 0.8rem;
    font-weight: 500;
    color: var(--gov-text-secondary);
    background-color: var(--gov-background-white);
    padding: 0.2rem 0.5rem;
    border-radius: 3px;
    border: 1px solid var(--gov-border-color);
}

.arrow-icon {
    transition: transform var(--gov-transition-default);
    color: var(--gov-text-secondary);
}
.arrow-icon.rotated {
    transform: rotate(180deg);
}

.accordion-content {
    padding: 1.25rem;
    background-color: var(--gov-background-white);
    border-top: 1px solid var(--gov-border-color);
}
.accordion-content-transition-enter-active,
.accordion-content-transition-leave-active {
  transition: max-height 0.3s ease-in-out, opacity 0.3s ease-in-out, padding 0.3s ease-in-out;
  overflow: hidden;
  max-height: 600px; /* Increased max-height */
  opacity: 1;
}
.accordion-content-transition-enter-from,
.accordion-content-transition-leave-to {
  max-height: 0;
  opacity: 0;
  padding-top: 0 !important;
  padding-bottom: 0 !important;
  border-top-width: 0 !important; /* Avoid border jump */
}

/* Radial Progress Bar */
.radial-progress-container {
    width: 36px;
    height: 36px;
}
.radial-progress-bg {
    stroke: var(--gov-border-color);
}
.radial-progress-fg {
    stroke-linecap: round;
    transform-origin: 50% 50%;
    transform: rotate(-90deg);
    transition: stroke-dasharray 0.5s ease-in-out;
}
.phase-1-progress { stroke: var(--gov-accent-blue); }
.phase-2-progress { stroke: var(--gov-accent-gold); }
.phase-3-progress { stroke: var(--gov-accent-gray); }

/* Task List Styles */
.task-list {
    list-style: none;
    margin: 0;
    padding: 0;
}
.no-tasks-message {
    font-style: italic;
    color: var(--gov-text-secondary);
    text-align: center;
    padding: 1rem 0;
}
.task-item {
    display: flex;
    align-items: center;
    padding: 0.6rem 0.2rem;
    border-bottom: 1px solid var(--gov-border-color);
    transition: background-color 0.15s ease;
    gap: 0.75rem;
}
.task-item:hover {
    background-color: rgba(0,0,0,0.02);
}
.task-item:last-child {
    border-bottom: none;
}
.task-item.completed .task-label {
    text-decoration: line-through solid var(--gov-danger-red) 1.5px;
    color: var(--gov-text-secondary);
    opacity: 0.8;
}
.task-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 17px;
    height: 17px;
    border: 2px solid var(--gov-border-color-strong);
    border-radius: 3px;
    position: relative;
    cursor: pointer;
    transition: var(--gov-transition-default);
    flex-shrink: 0;
    background-color: var(--gov-background-white);
}
.task-checkbox:hover {
    border-color: var(--gov-secondary-gray);
}
.task-checkbox:checked {
    background-color: var(--gov-primary-red);
    border-color: var(--gov-primary-red);
}
.task-checkbox:checked::after {
    content: '\f00c';
    font-family: 'Font Awesome 6 Free';
    font-weight: 900;
    position: absolute;
    color: var(--gov-background-white);
    font-size: 9px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}

.task-label-container {
    flex-grow: 1;
    min-width: 0; /* For flex children to not overflow */
}
.task-label {
    color: var(--gov-text-primary);
    cursor: pointer;
    font-size: 0.9rem;
    line-height: 1.5;
    word-break: break-word;
    padding: 0.1rem 0; /* Small padding for better dblclick area */
    display: inline-block; /* Ensure it takes up space for dblclick */
    width: 100%;
}
.edit-input.form-control { /* Re-use form-control for consistency */
    width: 100%;
    padding: 0.25rem 0.5rem; /* Slightly smaller padding */
    font-size: 0.9rem; /* Match label size */
    line-height: 1.4;
    height: auto; /* Let content define height */
    box-sizing: border-box;
    margin: -0.1rem 0; /* Offset to align with label's visual space */
}
.edit-input.form-control:focus { /* Specific focus for edit input */
  border-color: var(--gov-accent-blue); /* Use a less aggressive focus color */
  box-shadow: 0 0 0 0.15rem rgba(0, 86, 179, 0.2);
}

.btn-icon {
    background: transparent;
    border: none;
    color: var(--gov-text-secondary);
    cursor: pointer;
    padding: 0.25rem;
    font-size: 0.9em;
    border-radius: 3px;
    line-height: 1; /* Ensure icon aligns well */
    margin-left: 0.5rem; /* Space from text/input */
}
.btn-icon:hover {
    color: var(--gov-text-primary);
    background-color: var(--gov-border-color);
}
.btn-edit-task {
    /* Specific styling for edit button if needed */
}


/* Loading/Error indicators */
.loading-indicator.card {
    padding: 2rem;
}
.spinner {
  border: 4px solid var(--gov-background-light);
  border-top: 4px solid var(--gov-primary-red);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin: 0 auto 1rem auto;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.error-message.card {
  color: var(--gov-danger-red);
  border-left: 5px solid var(--gov-danger-red);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}
.error-message.card i {
  font-size: 1.2rem;
}

@media (max-width: 768px) {
  .accordion-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
  }
  .header-main-content {
    width: 100%;
  }
  .header-aside {
    width: 100%;
    justify-content: space-between;
    margin-top: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px dashed var(--gov-border-color);
  }
  .accordion-item.is-current .accordion-header {
    padding-left: calc(1rem - 5px);
  }
  .task-item {
    gap: 0.5rem; /* Reduce gap on smaller screens */
  }
  .task-label {
    font-size: 0.85rem; /* Slightly smaller text */
  }
  .btn-icon {
    font-size: 0.85em;
    padding: 0.2rem;
  }
}
</style>