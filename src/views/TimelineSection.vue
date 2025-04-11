<!-- src/views/TimelineSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-stream icon-gradient"></i> 备考时间轴</h1>
      <p>按计划推进，稳步提升。</p>
    </header>
    <div class="accordion">
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
        <!-- Using v-show for simplicity; CSS height transitions won't work directly -->
        <div class="accordion-content" v-show="isPhase1Open">
          <ul class="task-list">
            <li
              class="task-item"
              v-for="task in phase1Tasks"
              :key="task.id"
              :class="{ completed: task.checked }"
            >
              <input
                type="checkbox"
                class="task-checkbox"
                :id="task.id"
                v-model="task.checked"
                @change="saveTaskProgressThrottled"
              >
              <label class="task-label" :for="task.id">{{ task.label }}</label>
            </li>
          </ul>
          <div class="phase-notes">
            <label :for="'notes-phase1-timeline'" class="notes-label">阶段笔记:</label>
            <textarea
              :id="'notes-phase1-timeline'"
              class="notes-textarea"
              placeholder="记录本阶段的想法、难点、计划..."
              v-model="notesPhase1"
              @input="saveNotesThrottled('notes-phase1')"
            ></textarea>
             <span class="notes-status-text small">{{ notesPhase1Status }}</span>
          </div>
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
                <li class="task-item" v-for="task in phase2Tasks" :key="task.id" :class="{ completed: task.checked }">
                   <input type="checkbox" class="task-checkbox" :id="task.id" v-model="task.checked" @change="saveTaskProgressThrottled">
                   <label class="task-label" :for="task.id">{{ task.label }}</label>
                </li>
             </ul>
              <div class="phase-notes">
                <label :for="'notes-phase2-timeline'" class="notes-label">阶段笔记:</label>
                <textarea :id="'notes-phase2-timeline'" class="notes-textarea" placeholder="记录本阶段的想法、难点、计划..." v-model="notesPhase2" @input="saveNotesThrottled('notes-phase2')"></textarea>
                 <span class="notes-status-text small">{{ notesPhase2Status }}</span>
             </div>
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
                 <li class="task-item" v-for="task in phase3Tasks" :key="task.id" :class="{ completed: task.checked }">
                   <input type="checkbox" class="task-checkbox" :id="task.id" v-model="task.checked" @change="saveTaskProgressThrottled">
                   <label class="task-label" :for="task.id">{{ task.label }}</label>
                 </li>
             </ul>
            <div class="phase-notes">
                <label :for="'notes-phase3-timeline'" class="notes-label">阶段笔记:</label>
                <textarea :id="'notes-phase3-timeline'" class="notes-textarea" placeholder="记录本阶段的想法、难点、计划..." v-model="notesPhase3" @input="saveNotesThrottled('notes-phase3')"></textarea>
                 <span class="notes-status-text small">{{ notesPhase3Status }}</span>
             </div>
         </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
// Assuming config.js and storage.js are correctly set up in @/
import config from '@/config.js';
import { loadData, saveData } from '@/utils/storage.js';
// Assuming lodash-es is installed: npm install lodash-es
import { throttle } from 'lodash-es';

// --- State ---
const isPhase1Open = ref(false);
const isPhase2Open = ref(false);
const isPhase3Open = ref(false);

const phase1Tasks = ref([
  { id: 'task-phase1-1-timeline', label: '系统学习行测五大模块基础知识与方法论', checked: false, group: 'phase1' },
  { id: 'task-phase1-2-timeline', label: '掌握申论基本题型作答思路', checked: false, group: 'phase1' },
  { id: 'task-phase1-3-timeline', label: '开始分模块专项练习（注重理解）', checked: false, group: 'phase1' },
  { id: 'task-phase1-4-timeline', label: '持续关注时事政治（学习强国/官媒）', checked: false, group: 'phase1' },
  { id: 'task-phase1-5-timeline', label: '加强中共党史、理论学习', checked: false, group: 'phase1' },
  { id: 'task-phase1-6-timeline', label: '初步研究往年职位表，思考方向', checked: false, group: 'phase1' },
]);
const phase2Tasks = ref([
  { id: 'task-phase2-1-timeline', label: '高强度、系统性刷题训练 (行测+申论)', checked: false, group: 'phase2' },
  { id: 'task-phase2-2-timeline', label: '进行套题模拟，严格控时', checked: false, group: 'phase2' },
  { id: 'task-phase2-3-timeline', label: '重点攻克弱项模块/题型，分析错题', checked: false, group: 'phase2' },
  { id: 'task-phase2-4-timeline', label: '加强申论写作练习 (大作文+应用文)', checked: false, group: 'phase2' },
  { id: 'task-phase2-5-timeline', label: '整理常识体系和申论素材库', checked: false, group: 'phase2' },
]);
const phase3Tasks = ref([
   { id: 'task-phase3-1-timeline', label: '以历年真题和高质量模拟题进行全真模考', checked: false, group: 'phase3' },
   { id: 'task-phase3-2-timeline', label: '查漏补缺，回归基础，巩固高频考点', checked: false, group: 'phase3' },
   { id: 'task-phase3-3-timeline', label: '强化记忆常识关键信息和申论热点', checked: false, group: 'phase3' },
   { id: 'task-phase3-4-timeline', label: '调整作息，模拟考试时间，保持心态', checked: false, group: 'phase3' },
   { id: 'task-phase3-5-timeline', label: '关注最终公告和职位表，确认报考岗位', checked: false, group: 'phase3' },
]);

const notesPhase1 = ref('');
const notesPhase2 = ref('');
const notesPhase3 = ref('');
const notesPhase1Status = ref('');
const notesPhase2Status = ref('');
const notesPhase3Status = ref('');

// --- Computed Properties ---
const progressPhase1 = computed(() => calculateProgress(phase1Tasks.value));
const progressPhase2 = computed(() => calculateProgress(phase2Tasks.value));
const progressPhase3 = computed(() => calculateProgress(phase3Tasks.value));

function calculateProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  const completed = tasks.filter(task => task.checked).length;
  return Math.round((completed / tasks.length) * 100);
}

// --- Methods ---
function toggleAccordion(phase) {
  if (phase === 'phase1') isPhase1Open.value = !isPhase1Open.value;
  else if (phase === 'phase2') isPhase2Open.value = !isPhase2Open.value;
  else if (phase === 'phase3') isPhase3Open.value = !isPhase3Open.value;
}

function loadTaskProgress() {
  const progressData = loadData(config.localStorageKeys.progress, { checkboxes: {} });
  const allTasks = [...phase1Tasks.value, ...phase2Tasks.value, ...phase3Tasks.value];
  allTasks.forEach(task => {
    // Make sure the key exists in progressData.checkboxes before assigning
    if (Object.prototype.hasOwnProperty.call(progressData.checkboxes, task.id)) {
       task.checked = progressData.checkboxes[task.id];
    } else {
       task.checked = false; // Default to false if not found
    }
  });
}

const saveTaskProgress = () => {
  const checkboxState = {};
  const allTasks = [...phase1Tasks.value, ...phase2Tasks.value, ...phase3Tasks.value];
  allTasks.forEach(task => {
    checkboxState[task.id] = task.checked;
  });
  saveData(config.localStorageKeys.progress, { checkboxes: checkboxState });
  console.log('Task progress saved.');
};
// Use throttle from lodash-es for saving task progress
const saveTaskProgressThrottled = throttle(saveTaskProgress, 1000);

function loadNotes() {
  const notesData = loadData(config.localStorageKeys.notes, {});
  notesPhase1.value = notesData['notes-phase1'] || '';
  notesPhase2.value = notesData['notes-phase2'] || '';
  notesPhase3.value = notesData['notes-phase3'] || '';
}

const saveNotes = (noteKey) => {
  const notesData = loadData(config.localStorageKeys.notes, {});
  let statusRef = null;
  if (noteKey === 'notes-phase1') {
      notesData[noteKey] = notesPhase1.value;
      statusRef = notesPhase1Status;
  } else if (noteKey === 'notes-phase2') {
      notesData[noteKey] = notesPhase2.value;
      statusRef = notesPhase2Status;
  } else if (noteKey === 'notes-phase3') {
      notesData[noteKey] = notesPhase3.value;
      statusRef = notesPhase3Status;
  }

  if (statusRef) {
      saveData(config.localStorageKeys.notes, notesData);
      statusRef.value = '自动保存...';
      setTimeout(() => { if (statusRef) statusRef.value = ''; }, 1500);
      console.log(`Notes saved for ${noteKey}.`);
  }
};
// Use throttle from lodash-es for saving notes
const saveNotesThrottled = throttle(saveNotes, config.SAVE_THROTTLE_MS || 1500); // Use config or default

// --- Lifecycle Hooks ---
onMounted(() => {
  loadTaskProgress();
  loadNotes();
});

</script>

<style scoped>
/* Styles extracted from gwy.css relevant to TimelineSection */

/* Section Header (assuming global styles apply, or add specific overrides here if needed) */
.section-header {
    margin-bottom: 2rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid var(--border-color);
}
.section-header h1 {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.25rem;
    font-size: 1.8rem; /* Match global or component specific */
}
.section-header i.icon-gradient { /* Make sure icon gradients work */
    background: var(--gradient-primary); /* Or appropriate gradient */
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-size: 1.5em; /* Adjust as needed */
}
.section-header p {
    color: var(--text-light);
    font-size: 1rem;
}


/* --- Accordion Component --- */
.accordion {
    border: 1px solid var(--border-color, #e1e8f0);
    border-radius: var(--card-border-radius, 12px);
    overflow: hidden;
    background-color: var(--card-bg, #ffffff);
    box-shadow: var(--shadow-light, rgba(50, 50, 93, 0.1) 0px 2px 5px -1px, rgba(0, 0, 0, 0.1) 0px 1px 3px -1px);
}
.accordion-item {
    border-bottom: 1px solid var(--border-color, #e1e8f0);
}
.accordion-item:last-child {
    border-bottom: none;
}
.accordion-header {
    width: 100%;
    padding: 1rem 1.5rem;
    background-color: #fdfdff; /* Match original */
    border: none;
    text-align: left;
    font-size: 1rem;
    font-weight: 600;
    color: var(--text-color, #34495e);
    cursor: pointer;
    display: flex; /* Core layout */
    align-items: center; /* Core layout */
    gap: 0.8rem; /* Core layout */
    transition: background-color var(--transition-speed, 0.3s) ease;
}
.accordion-header:hover {
    background-color: #f8faff; /* Match original */
}
.accordion-header .arrow-icon {
    margin-left: auto; /* Push arrow and progress to the right */
    transition: transform var(--transition-speed, 0.3s) ease;
    color: var(--text-light, #7f8c8d);
    flex-shrink: 0;
}
.accordion-header .arrow-icon.rotated { /* Style for rotated arrow */
    transform: rotate(180deg);
}
.phase-icon {
    font-size: 1.2em;
    width: 20px;
    text-align: center;
    flex-shrink: 0;
}
.phase-1 { color: var(--primary-color, #4a69bd); }
.phase-2 { color: var(--success-color, #2ecc71); }
.phase-3 { color: var(--danger-color, #e74c3c); }

.accordion-content {
    /* Max-height/transition commented out as v-show is used */
    /* max-height: 0; */
    /* overflow: hidden; */
    /* transition: max-height 0.4s ease-out, padding 0.4s ease-out; */
    padding: 1.5rem; /* Padding when content is shown */
    background-color: var(--card-bg, #ffffff);
}
/* If using transitions with v-if later: */
/* .accordion-content.open { padding: 1.5rem; } */

/* Inline Progress Bar for Accordion Header */
.inline-progress {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-left: 1rem; /* Space between arrow and progress */
    /* flex-grow: 1; */ /* Optional: allows progress bar to take more space */
    max-width: 200px; /* Limit width */
    flex-shrink: 0; /* Prevent shrinking */
}
.progress-bar-container {
     width: 100%; /* Fill the inline-progress container width */
}
.progress-bar {
    height: 8px;
    background-color: #e9ecef; /* Match original */
    border-radius: 4px;
    overflow: hidden;
    flex-grow: 1; /* Progress bar fills its container */
}
.progress-fill {
    height: 100%;
    background: var(--gradient-primary, linear-gradient(135deg, #7a9eeb, #4a69bd));
    border-radius: 4px;
    transition: width 0.5s ease;
    width: 0%; /* Will be set by :style binding */
}
.progress-percentage {
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--primary-color, #4a69bd);
    min-width: 35px; /* Ensure space */
    text-align: right;
}
.progress-bar.mini { height: 6px; }
.progress-fill.mini { border-radius: 3px; }
.progress-percentage.mini { font-size: 0.75rem; }

/* --- Task List Styling --- */
.task-list {
    list-style: none;
    margin-bottom: 1.5rem;
    padding: 0; /* Reset default list padding */
}
.task-item {
    display: flex;
    align-items: flex-start; /* Align checkbox and text top */
    padding: 0.7rem 0;
    border-bottom: 1px solid var(--border-color, #e1e8f0);
    transition: opacity var(--transition-speed, 0.3s) ease;
}
.task-item:last-child { border-bottom: none; }
.task-item.completed {
    opacity: 0.7;
}
.task-item.completed .task-label {
    color: var(--text-light, #7f8c8d);
    text-decoration: line-through;
}
.task-checkbox {
    appearance: none;
    -webkit-appearance: none;
    width: 18px;
    height: 18px;
    border: 2px solid #adb5bd; /* Match original */
    border-radius: 4px;
    margin-right: 0.8rem;
    margin-top: 0.15em; /* Align slightly better with text */
    position: relative;
    cursor: pointer;
    transition: background-color var(--transition-speed, 0.3s) ease, border-color var(--transition-speed, 0.3s) ease;
    flex-shrink: 0;
    background-color: #ffffff; /* Match original */
}
.task-checkbox:hover {
    border-color: var(--primary-light, #7a9eeb);
}
.task-checkbox:checked {
    background-color: var(--primary-color, #4a69bd);
    border-color: var(--primary-color, #4a69bd);
}
/* Checkmark using Font Awesome content */
.task-checkbox:checked::after {
    content: '\f00c'; /* Font Awesome checkmark */
    font-family: 'Font Awesome 6 Free'; /* Ensure Font Awesome is loaded */
    font-weight: 900;
    position: absolute;
    color: white;
    font-size: 10px;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
}
.task-label {
    flex-grow: 1;
    color: var(--text-color, #34495e);
    transition: color var(--transition-speed, 0.3s) ease;
    cursor: pointer;
    font-size: 0.95rem;
}

/* --- Notes Styling --- */
.phase-notes { margin-top: 1rem; }
.notes-label {
    display: block;
    font-weight: 600;
    color: var(--primary-dark, #3b54a3);
    margin-bottom: 0.5rem;
    font-size: 0.85em;
}
.notes-textarea {
    width: 100%;
    min-height: 100px;
    padding: 0.8rem 1rem;
    border: 1px solid var(--border-color, #e1e8f0);
    border-radius: 8px;
    font-family: inherit; /* Inherit font from body */
    font-size: 0.95em;
    line-height: 1.5;
    resize: vertical;
    transition: border-color var(--transition-speed, 0.3s) ease, box-shadow var(--transition-speed, 0.3s) ease;
    background-color: #fdfdff; /* Match original */
}
.notes-textarea:focus {
    outline: none;
    border-color: var(--primary-color, #4a69bd);
    box-shadow: 0 0 0 3px rgba(74, 105, 189, 0.2); /* Match original focus */
    background-color: white;
}

/* Status text styling */
.notes-status-text.small {
     font-size: 0.75em;
     color: var(--success-color, #2ecc71);
     font-style: italic;
     display: inline-block; /* Make it visible */
     margin-left: 0.5em;
     margin-top: 0.3em; /* Add some space */
     height: 1em; /* Prevent layout shift when text appears/disappears */
}
.notes-status-text:empty {
    /* Don't hide completely, just make invisible to prevent layout shift */
    opacity: 0;
}

</style>