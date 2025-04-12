<!-- src/views/CourseTrackerSection.vue -->
<template>
  <div>
    <header class="section-header">
       <!-- 确保 Font Awesome 加载 -->
      <h1><i class="fas fa-book-reader icon-gradient"></i> 在线课程追踪</h1>
      <p>记录并跟进你的网课进度。</p>
    </header>

    <!-- 加载和错误状态显示 -->
    <div v-if="isLoading && !courseName" class="loading-indicator card">加载中...</div> <!-- Display loading only on initial load -->
    <div v-else-if="error" class="error-message card" style="color: red;">错误: {{ error }}</div>

    <!-- 正常显示课程追踪卡片 -->
    <div v-else class="card course-tracker-card">
      <div class="course-info">
        <p><strong>课程:</strong> <span id="course-name">{{ courseName }}</span></p>
        <p><a id="course-link" :href="courseLink" target="_blank" class="resource-link"><i class="fas fa-external-link-alt"></i> 访问课程</a></p>
        <p v-if="lastUpdated"><strong>上次更新:</strong> {{ formatTimestamp(lastUpdated) }}</p>
      </div>

      <div class="course-progress-inputs">
        <div class="input-group">
          <label for="course-total-lessons-el">总节数:</label>
          <input type="number" v-model.number="localTotalLessons" @change="updateTotalLessons" id="course-total-lessons-el" class="input-narrow" min="1" placeholder="总数">
        </div>
        <div class="input-group">
          <label for="course-completed-lessons-el">已完成:</label>
          <input type="number" v-model.number="localCompletedLessons" @change="updateCompletedLessons" id="course-completed-lessons-el" class="input-narrow" min="0" :max="localTotalLessons" placeholder="完成数">
        </div>
        <div class="input-group progress-display">
          <span>进度:</span>
          <span id="course-progress-percentage" class="progress-percentage">{{ progressPercentage }}%</span>
        </div>
      </div>

      <div class="progress-bar-container course-progress-bar-container">
        <div class="progress-bar">
          <div class="progress-fill" id="course-progress-bar" :style="{ width: progressPercentage + '%' }"></div>
        </div>
      </div>

      <div class="course-notes">
        <label for="notes-course-el" class="notes-label">课程笔记:</label>
         <!-- v-model 绑定本地 ref, @input 时调用节流保存 -->
        <textarea v-model="localNotes" @input="handleNotesInput" id="notes-course-el" class="notes-textarea" placeholder="记录本课程的学习要点、疑问..."></textarea>
        <span id="course-notes-status" class="notes-status-text small">{{ notesStatus }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'; // Removed onMounted as it's not used now
import { storeToRefs } from 'pinia';
import { useCourseStore } from '@/stores/courseStore.js';
import { formatTimestamp } from '@/utils/formatters.js'; // Ensure this path is correct

// --- Store ---
const courseStore = useCourseStore();
const {
  courseName,
  courseLink,
  totalLessons,
  completedLessons,
  notes, // Get notes state from store
  lastUpdated,
  isLoading,
  error,
  notesStatus,
  progressPercentage
} = storeToRefs(courseStore);

// --- 本地状态，用于 v-model 绑定 ---
const localTotalLessons = ref(totalLessons.value);
const localCompletedLessons = ref(completedLessons.value);
// **MODIFIED:** Initialize localNotes directly from store state
const localNotes = ref(notes.value);

// --- 监听 Store 变化，更新本地状态 (除了 notes) ---
watch(totalLessons, (newVal) => {
  console.log('Store totalLessons changed:', newVal);
  localTotalLessons.value = newVal;
   // When total lessons change, re-validate completed lessons locally as well
   if (localCompletedLessons.value > newVal) {
       localCompletedLessons.value = newVal;
   }
});
watch(completedLessons, (newVal) => {
  console.log('Store completedLessons changed:', newVal);
  localCompletedLessons.value = newVal;
});
// **REMOVED:** Watch for notes removed to prevent input losing focus
// watch(notes, (newVal) => {
//   if (newVal !== localNotes.value) { // Conditional update (alternative)
//       console.log('Store notes changed, updating localNotes:', newVal);
//       localNotes.value = newVal;
//   }
// });
// **ADDED:** Watch for initial load or external changes to notes
watch(notes, (newVal, oldVal) => {
    // Only update localNotes if it hasn't been changed by the user yet
    // or if the change comes from an external source (like loadCourseData)
    // A simple check could be if the component just mounted or if the values differ significantly
    // For simplicity, let's just sync if the local value hasn't changed since the last sync
    // A better approach might involve flags or comparing timestamps if available
     if (localNotes.value === oldVal) { // If local hasn't been touched since last sync
        localNotes.value = newVal;
     }
}, { immediate: false }); // Run watcher immediately on component mount if needed


// --- 方法 ---
function updateTotalLessons() {
  let newTotal = localTotalLessons.value;
  if (newTotal < 1) {
    newTotal = 1;
    localTotalLessons.value = newTotal; // Update local ref immediately
  }
   // Prepare updates object
   const updates = { totalLessons: newTotal };
   // Adjust completed lessons if necessary
   if (localCompletedLessons.value > newTotal) {
       localCompletedLessons.value = newTotal; // Update local ref
       updates.completedLessons = newTotal; // Include in updates
   }
   courseStore.updateCourseData(updates);
}

function updateCompletedLessons() {
  let newCompleted = localCompletedLessons.value;
  if (newCompleted < 0) {
    newCompleted = 0;
    localCompletedLessons.value = newCompleted;
  }
  // Use the potentially updated localTotalLessons for comparison
  if (newCompleted > localTotalLessons.value) {
    newCompleted = localTotalLessons.value;
    localCompletedLessons.value = newCompleted;
  }
  courseStore.updateCourseData({ completedLessons: newCompleted });
}

// **MODIFIED:**处理笔记输入 - 调用 store action (节流), 传递当前本地值
function handleNotesInput() {
  // Pass the current value of the local ref to the throttled function
  courseStore.saveNotesThrottled(localNotes.value);
}

// --- 导出 ---
// formatTimestamp is imported and automatically available to the template
// No need to export it from <script setup>
</script>

<style scoped>
/* --- Course Tracker Specific Styles --- */
.course-tracker-card {
     border-left: 4px solid var(--secondary-color);
}
.course-info {
    margin-bottom: 1rem;
}
.course-info p { margin-bottom: 0.4rem; font-size: 0.95rem; }
.course-info strong { color: var(--primary-dark); }
.resource-link { color: var(--primary-color); font-weight: 500; }
.resource-link i { margin-right: 0.3em; font-size: 0.9em;}

.course-progress-inputs {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
    flex-wrap: wrap;
    background-color: #f8f9fa;
    padding: 0.8rem;
    border-radius: 8px;
}
.input-group { display: flex; align-items: center; gap: 0.5rem; }
.input-group label { font-size: 0.85em; color: var(--text-light); font-weight: 500; }
.input-narrow {
    width: 65px;
    padding: 0.4em 0.6em;
    border: 1px solid var(--border-color);
    border-radius: 6px;
    text-align: center;
    font-size: 0.9em;
    background-color: white;
}
.input-narrow:focus {
     outline: none;
     border-color: var(--primary-color);
     box-shadow: 0 0 0 2px rgba(74, 105, 189, 0.2);
}
.input-group.progress-display span:first-child { font-weight: 500; }
#course-progress-percentage {
    color: var(--primary-dark);
    background-color: rgba(74, 105, 189, 0.1);
    padding: 0.1em 0.4em;
    border-radius: 4px;
    font-weight: 600;
}

.course-progress-bar-container { margin-bottom: 1rem; }
.progress-bar {
    height: 8px;
    background-color: #e9ecef;
    border-radius: 4px;
    overflow: hidden;
}
.progress-fill {
    height: 100%;
    background: var(--gradient-primary);
    border-radius: 4px;
    transition: width 0.5s ease;
    width: 0%;
}
#course-progress-bar { /* Specific ID styling if needed */ }

.course-notes { margin-top: 1rem; }
/* Use global styles for label/textarea or define here if needed */
.notes-label {
     display: block;
     font-weight: 600;
     color: var(--primary-dark, #3b54a3);
     margin-bottom: 0.5rem;
     font-size: 0.85em;
 }

/* Applied美化样式 */
.notes-textarea {
  width: 100%;
  min-height: 150px;
  padding: 1rem 1.2rem;
  border: 1px solid var(--border-color);
  border-radius: var(--card-border-radius, 12px);
  font-family: var(--font-family);
  font-size: 1rem;
  line-height: 1.6;
  resize: vertical;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  background-color: #fff;
  box-shadow: var(--shadow-light);
}

.notes-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 4px rgba(74, 105, 189, 0.15), var(--shadow-light);
  background-color: white;
}


.notes-status-text.small {
     font-size: 0.75em;
     color: var(--success-color);
     font-style: italic;
     display: inline-block;
     margin-left: 0.5em;
     margin-top: 0.3em;
     height: 1em;
}
.notes-status-text:empty { opacity: 0; }

.loading-indicator, .error-message {
    text-align: center;
    padding: 1rem;
    color: var(--text-light);
}
.error-message {
    color: var(--danger-color);
}
/* Ensure header icon gradient works */
.section-header i.icon-gradient {
    background: var(--gradient-primary); /* Match original or specific gradient */
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    font-size: 1.5em; /* Or desired size */
}
</style>