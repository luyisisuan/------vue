<template>
    <div>
      <header class="section-header"> <!-- Use global styles -->
        <h1><i class="fas fa-book-reader icon-gradient"></i> 在线课程追踪</h1>
        <p>记录并跟进你的网课进度。</p>
      </header>
      <div class="card course-tracker-card"> <!-- Use global .card, add specific class -->
        <div class="course-info">
          <!-- Course Name and Link - Can be made dynamic later -->
          <p><strong>课程:</strong> <span id="course-name">100元红鲶定金班 (华图)</span></p>
          <p><a id="course-link" href="https://www.huatu.com/htzx/user/index.shtml#/courseDetail/KCZF464FO6/100%E5%85%83%E7%BA%A2%E9%B2%A4%E5%AE%9A%E9%87%91%E7%8F%AD?orderCode=" target="_blank" class="resource-link"><i class="fas fa-external-link-alt"></i> 访问课程</a></p>
        </div>
        <div class="course-progress-inputs">
          <!-- Use global .input-group if defined globally, or scope it here -->
          <div class="input-group">
            <label for="course-total-lessons-ct">总节数:</label>
            <!-- Bind value with v-model in Phase 4 -->
            <input type="number" id="course-total-lessons-ct" class="input-narrow" min="1" :value="totalLessons" placeholder="总数">
          </div>
          <div class="input-group">
            <label for="course-completed-lessons-ct">已完成:</label>
            <!-- Bind value with v-model in Phase 4 -->
            <input type="number" id="course-completed-lessons-ct" class="input-narrow" min="0" :value="completedLessons" placeholder="完成数">
          </div>
          <div class="input-group progress-display">
            <span>进度:</span>
            <!-- Display calculated percentage in Phase 4 -->
            <span id="course-progress-percentage-ct" class="progress-percentage-display">{{ coursePercentage }}%</span>
          </div>
        </div>
        <div class="progress-bar-container course-progress-bar-container"> <!-- Use global .progress-bar-container if defined -->
          <div class="progress-bar"> <!-- Use global .progress-bar if defined -->
            <!-- Bind width style in Phase 4 -->
            <div class="progress-fill" id="course-progress-bar-ct" :style="{ width: coursePercentage + '%' }"></div> <!-- Use global .progress-fill -->
          </div>
        </div>
        <div class="course-notes">
          <label for="notes-course-ct" class="notes-label">课程笔记:</label>
          <!-- Bind value with v-model in Phase 4 -->
          <textarea id="notes-course-ct" class="notes-textarea" placeholder="记录本课程的学习要点、疑问..."></textarea> <!-- Use global .notes-textarea -->
          <span id="course-notes-status-ct" class="notes-status-text small"></span> <!-- Use global .notes-status-text -->
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  import { ref, computed } from 'vue';
  
  // Placeholder data for Phase 3
  const totalLessons = ref(1); // Example value
  const completedLessons = ref(0); // Example value
  const courseNotes = ref(''); // Example value
  
  // Example computed property for percentage (Phase 4 will refine this)
  const coursePercentage = computed(() => {
    const total = Number(totalLessons.value) || 1;
    const completed = Math.max(0, Math.min(Number(completedLessons.value), total));
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  });
  </script>
  
  <style scoped>
  /* --- Course Tracker Specific --- */
  /* Add border only if .card is global and needs modification here */
  .course-tracker-card {
       border-left: 4px solid var(--secondary-color);
  }
  
  .course-info {
      margin-bottom: 1rem;
  }
  .course-info p { margin-bottom: 0.4rem; font-size: 0.95rem; }
  .course-info strong { color: var(--primary-dark); }
  /* Style for resource-link if specific to this component */
  .resource-link {
      color: var(--primary-color);
      font-weight: 500;
      text-decoration: none; /* Ensure no underline if 'a' tag style is overridden */
  }
  .resource-link:hover {
      color: var(--primary-dark);
  }
  .resource-link i { margin-right: 0.3em; font-size: 0.9em;}
  
  .course-progress-inputs {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 1rem;
      flex-wrap: wrap;
      background-color: #f8f9fa; /* Light background for the input area */
      padding: 0.8rem;
      border-radius: 8px;
  }
  
  /* Scope .input-group if not global, or refine global styles */
  .input-group {
      display: flex;
      align-items: center;
      gap: 0.5rem;
  }
  .input-group label {
      font-size: 0.85em;
      color: var(--text-light);
      font-weight: 500;
      white-space: nowrap; /* Prevent label wrapping */
  }
  /* Style for the narrow number input */
  .input-narrow {
      /* Assuming base input styles are global */
      width: 65px;
      padding: 0.4em 0.6em; /* Smaller padding */
      text-align: center;
      font-size: 0.9em;
      /* background-color: white; */ /* Use global input style */
  }
  /* Focus style likely global */
  
  .input-group.progress-display span:first-child {
      font-weight: 500; /* Make "进度:" bold */
  }
  /* Style for the percentage display span */
  .progress-percentage-display { /* Renamed ID to class for consistency */
      color: var(--primary-dark);
      background-color: rgba(74, 105, 189, 0.1);
      padding: 0.1em 0.4em;
      border-radius: 4px;
      font-weight: 600;
      font-size: 0.9em; /* Match input font size */
  }
  
  /* Specific margin for the progress bar container in this context */
  .course-progress-bar-container {
      margin-bottom: 1rem;
  }
  /* Specific style for the fill color, if different from global */
  #course-progress-bar-ct { /* Use ID or specific class */
       /* background: var(--gradient-primary); */ /* Assume global .progress-fill handles this */
  }
  
  /* Specific styles for course notes area */
  .course-notes { margin-top: 1rem; }
  /* .notes-label, .notes-textarea, .notes-status-text likely global */
  /* If .small class for status text is specific, define it here */
  .notes-status-text.small {
       font-size: 0.75em; /* Smaller status text */
  }
  </style>