<!-- src/views/TimelineSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-stream icon-gradient"></i> 备考时间轴</h1>
      <p>按计划推进，稳步提升。</p>
    </header>

    <div v-if="isLoadingTasks" class="loading-indicator card">加载任务中...</div>
    <div v-else-if="tasksError" class="error-message card" style="color: red;">
        加载任务失败: {{ tasksError }}
    </div>

    <div v-else class="accordion">
      <!-- Phase 1 -->
      <div class="accordion-item">
        <button
          class="accordion-header"
          :aria-expanded="isPhase1Open"
          @click="toggleAccordion('phase1')"
        >
          <i class="fas fa-layer-group phase-icon phase-1"></i>
          <span>基础夯实阶段 (当前 - 2025.上半年)</span>
          <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isPhase1Open }"></i>
          <div class="progress-bar-container inline-progress">
            <div class="progress-bar mini">
              <div class="progress-fill mini" :style="{ width: progressPhase1 + '%' }"></div>
            </div>
            <span class="progress-percentage mini">{{ progressPhase1 }}%</span>
          </div>
        </button>
        <div class="accordion-content" v-show="isPhase1Open">
          <ul class="task-list">
            <li
              class="task-item"
              v-for="task in phase1Tasks"
              :key="task.id"
              :class="{ completed: task.completed }"
            >
              <input
                type="checkbox"
                class="task-checkbox"
                :id="task.id"
                :checked="task.completed"
                @change="handleTaskToggle(task.id, $event.target.checked)"
              >
              <label class="task-label" :for="task.id">{{ task.label }}</label>
            </li>
          </ul>
          <!-- Removed Notes Section -->
        </div>
      </div>

      <!-- Phase 2 -->
      <div class="accordion-item">
        <button
          class="accordion-header"
          :aria-expanded="isPhase2Open"
          @click="toggleAccordion('phase2')"
        >
          <i class="fas fa-cogs phase-icon phase-2"></i>
          <span>强化训练阶段 (2025.暑假)</span>
          <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isPhase2Open }"></i>
           <div class="progress-bar-container inline-progress">
               <div class="progress-bar mini">
                   <div class="progress-fill mini" :style="{ width: progressPhase2 + '%' }"></div>
               </div>
               <span class="progress-percentage mini">{{ progressPhase2 }}%</span>
            </div>
        </button>
        <div class="accordion-content" v-show="isPhase2Open">
             <ul class="task-list">
                <li class="task-item" v-for="task in phase2Tasks" :key="task.id" :class="{ completed: task.completed }">
                   <input type="checkbox" class="task-checkbox" :id="task.id" :checked="task.completed" @change="handleTaskToggle(task.id, $event.target.checked)">
                   <label class="task-label" :for="task.id">{{ task.label }}</label>
                </li>
             </ul>
              <!-- Removed Notes Section -->
         </div>
      </div>

      <!-- Phase 3 -->
       <div class="accordion-item">
         <button
            class="accordion-header"
            :aria-expanded="isPhase3Open"
            @click="toggleAccordion('phase3')"
         >
            <i class="fas fa-flag-checkered phase-icon phase-3"></i>
            <span>冲刺模考阶段 (2025.考前1-2月)</span>
             <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isPhase3Open }"></i>
             <div class="progress-bar-container inline-progress">
               <div class="progress-bar mini">
                   <div class="progress-fill mini" :style="{ width: progressPhase3 + '%' }"></div>
               </div>
               <span class="progress-percentage mini">{{ progressPhase3 }}%</span>
            </div>
         </button>
         <div class="accordion-content" v-show="isPhase3Open">
             <ul class="task-list">
                 <li class="task-item" v-for="task in phase3Tasks" :key="task.id" :class="{ completed: task.completed }">
                   <input type="checkbox" class="task-checkbox" :id="task.id" :checked="task.completed" @change="handleTaskToggle(task.id, $event.target.checked)">
                   <label class="task-label" :for="task.id">{{ task.label }}</label>
                 </li>
             </ul>
              <!-- Removed Notes Section -->
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { storeToRefs } from 'pinia';
import { useTaskStore } from '@/stores/taskStore.js'; // Only Task Store needed

// --- Store ---
const taskStore = useTaskStore();
const {
  phase1Tasks,
  phase2Tasks,
  phase3Tasks,
  progressPhase1,
  progressPhase2,
  progressPhase3,
  isLoading: isLoadingTasks, // Renamed for clarity
  error: tasksError,         // Renamed for clarity
} = storeToRefs(taskStore);

// --- Local Component State ---
const isPhase1Open = ref(false);
const isPhase2Open = ref(false);
const isPhase3Open = ref(false);

// --- Methods ---
function toggleAccordion(phase) {
  if (phase === 'phase1') isPhase1Open.value = !isPhase1Open.value;
  else if (phase === 'phase2') isPhase2Open.value = !isPhase2Open.value;
  else if (phase === 'phase3') isPhase3Open.value = !isPhase3Open.value;
}

async function handleTaskToggle(taskId, isChecked) {
  const success = await taskStore.updateTaskCompletion(taskId, isChecked);
  if (!success) {
      // Simple error feedback
      alert(`更新任务状态失败: ${tasksError.value || '未知错误'}`);
      // Consider more robust error handling/UI feedback
  }
}

// --- Lifecycle Hooks (Optional) ---
// onMounted(() => {
//   console.log('TimelineSection mounted');
//   // Initial data load is handled by the store
// });

</script>

<style scoped>
/* --- Timeline Section Specific Styles --- */

/* Section Header */
.section-header h1 i.icon-gradient {
    background: var(--gradient-primary);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
}

/* Accordion Styles */
.accordion {
    border: 1px solid var(--border-color, #e1e8f0);
    border-radius: var(--card-border-radius, 12px);
    overflow: hidden;
    background-color: var(--card-bg, #ffffff);
    box-shadow: var(--shadow-light);
}
.accordion-item {
    border-bottom: 1px solid var(--border-color, #e1e8f0);
}
.accordion-item:last-child { border-bottom: none; }

.accordion-header {
    width: 100%; padding: 1rem 1.5rem; background-color: #fdfdff;
    border: none; text-align: left; font-size: 1rem; font-weight: 600;
    color: var(--text-color, #34495e); cursor: pointer; display: flex;
    align-items: center; gap: 0.8rem; transition: background-color var(--transition-speed, 0.3s) ease;
}
.accordion-header:hover { background-color: #f8faff; }

.phase-icon { font-size: 1.2em; width: 20px; text-align: center; flex-shrink: 0; }
.phase-1 { color: var(--primary-color, #4a69bd); }
.phase-2 { color: var(--success-color, #2ecc71); }
.phase-3 { color: var(--danger-color, #e74c3c); }

.arrow-icon {
    margin-left: auto; transition: transform var(--transition-speed, 0.3s) ease;
    color: var(--text-light, #7f8c8d); flex-shrink: 0;
}
.arrow-icon.rotated { transform: rotate(180deg); }

.accordion-content { padding: 1.5rem; background-color: var(--card-bg, #ffffff); }
/* v-show handles visibility */

/* Inline Progress Bar Styles */
.inline-progress {
    display: flex; align-items: center; gap: 0.5rem; margin-left: 1rem;
    max-width: 200px; flex-shrink: 0;
}
.progress-bar-container { width: 100%; }
.progress-bar { height: 8px; background-color: #e9ecef; border-radius: 4px; overflow: hidden; flex-grow: 1; }
.progress-fill { height: 100%; background: var(--gradient-primary); border-radius: 4px; transition: width 0.5s ease; }
.progress-percentage { font-size: 0.8rem; font-weight: 600; color: var(--primary-color); min-width: 35px; text-align: right; }
.progress-bar.mini { height: 6px; }
.progress-fill.mini { border-radius: 3px; }
.progress-percentage.mini { font-size: 0.75rem; }

/* Task List Styles */
.task-list { list-style: none; margin: 0; padding: 0; } /* Remove margin-bottom */
.task-item { display: flex; align-items: flex-start; padding: 0.7rem 0; border-bottom: 1px solid var(--border-color); transition: opacity 0.3s ease; }
.task-item:last-child { border-bottom: none; }
.task-item.completed { opacity: 0.7; }
.task-item.completed .task-label { color: var(--text-light); text-decoration: line-through; }
.task-checkbox { appearance: none; -webkit-appearance: none; width: 18px; height: 18px; border: 2px solid #adb5bd; border-radius: 4px; margin-right: 0.8rem; margin-top: 0.15em; position: relative; cursor: pointer; transition: all 0.3s ease; flex-shrink: 0; background-color: white; }
.task-checkbox:hover { border-color: var(--primary-light); }
.task-checkbox:checked { background-color: var(--primary-color); border-color: var(--primary-color); }
.task-checkbox:checked::after { content: '\f00c'; font-family: 'Font Awesome 6 Free'; font-weight: 900; position: absolute; color: white; font-size: 10px; top: 50%; left: 50%; transform: translate(-50%, -50%); }
.task-label { flex-grow: 1; color: var(--text-color); transition: color 0.3s ease; cursor: pointer; font-size: 0.95rem; }

/* Loading/Error indicators */
.loading-indicator, .error-message {
    text-align: center; padding: 1rem; color: var(--text-light);
}
.error-message { color: var(--danger-color); }

</style>