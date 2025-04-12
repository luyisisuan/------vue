<!-- src/views/PomodoroSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-stopwatch-20 icon-gradient"></i> 专注番茄钟</h1>
      <p>利用番茄工作法保持高效专注。</p>
    </header>

    <!-- 显示加载或错误状态 (加载设置时) -->
     <div v-if="settingsLoading" class="loading-indicator card">加载设置中...</div>
     <div v-else-if="settingsError" class="error-message card" style="color: red;">错误: {{ settingsError }}</div>

    <!-- 番茄钟主卡片 (设置加载完成后显示) -->
    <div v-else class="card pomodoro-card" :data-mode="currentMode" :class="cardModeClass"> <!-- 动态绑定类 -->
      <div class="pomodoro-timer">
        <div class="timer-display-wrapper">
          <div class="timer-circle">
            <svg class="timer-progress-ring" height="200" width="200">
              <circle class="timer-progress-ring__bg" stroke-width="8" fill="transparent" r="90" cx="100" cy="100"/>
              <!-- 绑定进度环样式 -->
              <circle class="timer-progress-ring__fg" stroke-width="8" fill="transparent" r="90" cx="100" cy="100" :style="ringStyle"/>
            </svg>
            <div class="timer-time-content">
               <!-- 显示模式和时间 -->
              <span id="timer-mode">{{ modeText }}</span>
              <span id="timer-time">{{ formattedTime }}</span>
            </div>
          </div>
        </div>

        <!-- 当前活动输入框 -->
        <div class="timer-session-info">
          <label for="current-session-activity-el">当前活动:</label>
          <!-- v-model 绑定本地 ref, 仅在工作模式且未运行时启用 -->
          <input
            type="text"
            v-model="currentSessionActivity"
            id="current-session-activity-el"
            placeholder="默认专注学习 (可选填具体内容)"
            :disabled="isTimerRunning || currentMode !== 'work'"
          />
        </div>

        <!-- 控制按钮 -->
        <div class="timer-controls">
          <!-- 绑定点击事件，根据状态禁用 -->
          <button @click="startTimer" class="btn btn-success" :disabled="isTimerRunning"><i class="fas fa-play"></i> 开始</button>
          <button @click="pauseTimer" class="btn btn-warning" :disabled="!isTimerRunning"><i class="fas fa-pause"></i> 暂停</button>
          <button @click="resetTimerConfirm" class="btn btn-danger" :disabled="!isTimerRunning && timerSecondsRemaining === timerTotalSeconds"><i class="fas fa-redo-alt"></i> 重置</button>
        </div>

        <!-- 设置区域 (Accordion) -->
        <div class="timer-settings accordion">
          <div class="accordion-item settings-accordion">
            <button class="accordion-header settings-header" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">
              <i class="fas fa-cog"></i>
              <span>时长设置</span>
              <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: settingsOpen }"></i>
            </button>
            <!-- 使用 v-show 控制设置内容显示 -->
            <div class="accordion-content settings-content" v-show="settingsOpen">
              <div class="input-group">
                <label for="work-duration-el">工作:</label>
                <!-- v-model 绑定本地 ref, @change 触发保存 -->
                <input type="number" v-model.number="localWorkDuration" @change="saveSettingsHandler" id="work-duration-el" min="1"> 分钟
              </div>
              <div class="input-group">
                <label for="short-break-duration-el">短休:</label>
                <input type="number" v-model.number="localShortBreakDuration" @change="saveSettingsHandler" id="short-break-duration-el" min="1"> 分钟
              </div>
              <div class="input-group">
                <label for="long-break-duration-el">长休:</label>
                <input type="number" v-model.number="localLongBreakDuration" @change="saveSettingsHandler" id="long-break-duration-el" min="1"> 分钟
              </div>
               <!-- 显示设置保存时的错误 -->
               <p v-if="settingsError && settingsOpen" class="error-message small" style="color: red; width: 100%; text-align: center; margin-top: 0.5em;">{{ settingsError }}</p>
            </div>
          </div>
        </div>
         <!-- 显示今日专注次数 -->
         <p class="pomodoros-today-count">今日已完成专注次数: {{ pomodorosToday }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePomodoroStore } from '@/stores/pomodoroStore.js'; // 导入 Pomodoro Store
// 假设 config.js 还有用处，例如长休间隔
import config from '@/config.js'; // 需要确认是否还需要

// --- Store ---
const pomodoroStore = usePomodoroStore();
const {
    workDuration,       // Store state (from API)
    shortBreakDuration, // Store state (from API)
    longBreakDuration,  // Store state (from API)
    settingsLoading,    // Loading state for settings
    settingsError,      // Error state for settings
    pomodorosToday      // Today's count state
    // logLoading, logError // If needed for log feedback
} = storeToRefs(pomodoroStore);

// --- 本地计时器状态 (Component Local State) ---
const timerInterval = ref(null);
const currentMode = ref('work'); // 'work', 'shortBreak', 'longBreak'
const isTimerRunning = ref(false);
const workCyclesCompleted = ref(0); // 用于计算长休间隔
const currentSessionStartTime = ref(null); // ISO string
const currentSessionActivity = ref(''); // 当前活动描述

// --- 本地设置状态 (用于 v-model, 同步自 Store) ---
const localWorkDuration = ref(workDuration.value);
const localShortBreakDuration = ref(shortBreakDuration.value);
const localLongBreakDuration = ref(longBreakDuration.value);
const settingsOpen = ref(false); // 控制设置面板展开

// --- 本地计时器时间状态 ---
// timerTotalSeconds 需要根据 currentMode 和 Store 中的设置计算
const timerTotalSeconds = computed(() => {
    let durationMinutes;
    switch (currentMode.value) {
        case 'shortBreak': durationMinutes = shortBreakDuration.value; break;
        case 'longBreak': durationMinutes = longBreakDuration.value; break;
        default: /* work */ durationMinutes = workDuration.value; break;
    }
    return (durationMinutes || 25) * 60; // 加上默认值防止 NaN
});
// timerSecondsRemaining 初始化时等于 timerTotalSeconds
const timerSecondsRemaining = ref(timerTotalSeconds.value);


// --- 计算属性 (Computed Properties for Template) ---
const formattedTime = computed(() => {
  const seconds = Math.max(0, timerSecondsRemaining.value);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
});

const modeText = computed(() => {
  const modeMap = { work: '工作', shortBreak: '短休', longBreak: '长休' };
  return modeMap[currentMode.value] || '工作';
});

// 动态卡片类名，用于改变样式
const cardModeClass = computed(() => `mode-${currentMode.value}`);

// 动态进度环样式
const ringStyle = computed(() => {
    const timerRingRadius = 90; // 与 CSS 对应
    const timerCircumference = 2 * Math.PI * timerRingRadius;
    const progress = timerTotalSeconds.value > 0 ? (timerTotalSeconds.value - timerSecondsRemaining.value) / timerTotalSeconds.value : 0;
    const clampedProgress = Math.min(1, Math.max(0, progress));
    const offset = timerCircumference * (1 - clampedProgress);
    return {
        strokeDashoffset: `${offset}px`,
        strokeDasharray: `${timerCircumference}px`, // 确保 dasharray 也设置了
        // stroke: 'var(--your-color-variable)' // 颜色可以通过 CSS :data-mode 或 :class 控制
    };
});

// --- 监听 Store 设置变化，更新本地设置 ref 和计时器 ---
watch([workDuration, shortBreakDuration, longBreakDuration], () => {
  console.log("Settings changed in store, updating local refs.");
  localWorkDuration.value = workDuration.value;
  localShortBreakDuration.value = shortBreakDuration.value;
  localLongBreakDuration.value = longBreakDuration.value;
  // 如果计时器没有运行，重置计时器以应用新时间
  if (!isTimerRunning.value) {
    resetTimer(true); // silent reset
  }
}, { immediate: false }); // 不需要立即执行，因为初始化时会同步

// --- 方法 (Methods) ---

// 保存设置处理函数
function saveSettingsHandler() {
    // 验证本地输入值
    if (localWorkDuration.value < 1) localWorkDuration.value = 1;
    if (localShortBreakDuration.value < 1) localShortBreakDuration.value = 1;
    if (localLongBreakDuration.value < 1) localLongBreakDuration.value = 1;

    // 调用 store action 更新后端
    pomodoroStore.updateSettings({
        workDuration: localWorkDuration.value,
        shortBreakDuration: localShortBreakDuration.value,
        longBreakDuration: localLongBreakDuration.value
    });
    // Store action 成功后，watch 会自动同步本地值，或者手动同步：
    // workDuration.value = localWorkDuration.value; // 如果 Store action 不更新本地状态
}

// 切换模式
function switchMode(newMode, isEndOfCycle = false) {
  // 如果是从工作模式结束
  if (currentMode.value === 'work' && isEndOfCycle && currentSessionStartTime.value) {
    const endTime = new Date();
    const startTime = new Date(currentSessionStartTime.value);
    const duration = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // 只记录有效时长（例如大于 60 秒）
    if (duration >= 60) {
      pomodoroStore.incrementPomodorosToday(); // 增加今日计数
      // 调用 store action 发送日志到后端
      pomodoroStore.addStudyLog({
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        durationSeconds: duration,
        activity: currentSessionActivity.value.trim() || '专注学习', // 使用输入框内容或默认值
        source: 'pomodoro'
      });
      console.log('Work cycle completed and logged.');
    } else {
       console.log('Work cycle too short, not logged.');
    }
    workCyclesCompleted.value++; // 增加工作周期计数
  }

  // 重置计时器相关状态
  clearInterval(timerInterval.value);
  timerInterval.value = null;
  isTimerRunning.value = false;
  currentMode.value = newMode;
  timerSecondsRemaining.value = timerTotalSeconds.value; // 更新为新模式的总秒数
  currentSessionStartTime.value = null; // 重置会话开始时间

  // 如果切换到工作模式，记录开始时间
  if (newMode === 'work') {
    currentSessionStartTime.value = new Date().toISOString();
    // 清空上次活动？或者保留？当前不清空
    // currentSessionActivity.value = '';
  } else {
      workCyclesCompleted.value = (newMode === 'longBreak') ? 0 : workCyclesCompleted.value; // 长休后重置周期计数
  }

  // 更新浏览器标题
   document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;

   // 播放提示音或显示通知 (可选)
   playNotificationSound(); // 需要实现这个函数
   showBrowserNotification(`时间到！开始 ${modeText.value}。`); // 需要实现这个函数
}

// 开始计时器
function startTimer() {
  if (isTimerRunning.value) return;

   // 如果是从暂停或结束后重新开始工作模式，确保有开始时间
   if (currentMode.value === 'work' && !currentSessionStartTime.value) {
        currentSessionStartTime.value = new Date().toISOString();
   }

  // 如果时间已经结束，先切换到下一模式 (或重置当前模式)
  if (timerSecondsRemaining.value <= 0) {
       // 如果是工作结束，判断进入短休还是长休
       if (currentMode.value === 'work') {
            const nextBreak = (workCyclesCompleted.value + 1) % (config?.pomodoroDefaults?.longBreakInterval || 4) === 0 ? 'longBreak' : 'shortBreak';
            switchMode(nextBreak, true); // 切换并标记为周期结束
       } else { // 如果是休息结束，切换回工作模式
            switchMode('work');
       }
       // switchMode 内部会重置 timerSecondsRemaining, 所以这里可以直接开始
  }


  isTimerRunning.value = true;
  timerInterval.value = setInterval(() => {
    timerSecondsRemaining.value--;

    // 更新浏览器标题
    document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;

    // 时间到
    if (timerSecondsRemaining.value < 0) {
        clearInterval(timerInterval.value);
        timerInterval.value = null;
        isTimerRunning.value = false;

        // 判断下一个模式
        if (currentMode.value === 'work') {
            const nextBreak = (workCyclesCompleted.value + 1) % (config?.pomodoroDefaults?.longBreakInterval || 4) === 0 ? 'longBreak' : 'shortBreak';
            switchMode(nextBreak, true); // 切换并标记周期结束 (会记录日志)
            // 结束后自动开始下一个计时器？或者让用户手动点开始？这里不自动开始
        } else { // 休息结束
            switchMode('work');
            // 结束后自动开始下一个计时器？这里不自动开始
        }
    }
  }, 1000);
}

// 暂停计时器
function pauseTimer() {
  if (!isTimerRunning.value) return;
  clearInterval(timerInterval.value);
  timerInterval.value = null;
  isTimerRunning.value = false;
   document.title = `暂停 | ${modeText.value} | ${formattedTime.value} - 备考舱`;
  console.log("Timer paused.");
}

// 重置计时器 (带确认)
function resetTimerConfirm() {
    if (confirm('确定要重置当前的番茄钟吗？进行中的专注时段将不会被记录。')) {
        resetTimer(false); // 用户确认后执行真正的重置
    }
}


// 重置计时器 (实际逻辑)
function resetTimer(silent = false) { // silent 用于设置更新时不触发通知
  clearInterval(timerInterval.value);
  timerInterval.value = null;
  isTimerRunning.value = false;
  currentMode.value = 'work'; // 重置回工作模式
  workCyclesCompleted.value = 0; // 重置工作周期计数
  // 使用 Store 中的 workDuration 计算总秒数
  timerSecondsRemaining.value = (workDuration.value || 25) * 60;
  currentSessionStartTime.value = null; // 清除进行中的会话
  // currentSessionActivity.value = ''; // 可选：清空活动输入

  if (!silent) {
      console.log("Timer reset.");
      document.title = "备考智能驾驶舱 | 段绪程"; // 恢复默认标题
  } else {
       // 如果是静默重置（通常因为设置更改），则根据新设置更新时间显示
       timerSecondsRemaining.value = timerTotalSeconds.value;
       document.title = `${modeText.value} | ${formattedTime.value} - 备考舱`;
  }
}

// --- 辅助函数 (需要实现) ---
function playNotificationSound() {
  // 实现播放提示音的逻辑 (例如使用 Audio API)
  console.log("Playing notification sound...");
  // const audio = new Audio('/path/to/sound.mp3');
  // audio.play();
}

function showBrowserNotification(message) {
  if (!('Notification' in window)) {
    console.warn("This browser does not support desktop notification");
  } else if (Notification.permission === "granted") {
    new Notification("番茄钟提醒", { body: message });
  } else if (Notification.permission !== "denied") {
    Notification.requestPermission().then((permission) => {
      if (permission === "granted") {
        new Notification("番茄钟提醒", { body: message });
      }
    });
  }
}

// --- 生命周期钩子 ---
onMounted(() => {
  // 确保获取了最新的设置来初始化计时器
  resetTimer(true); // 使用加载的设置进行静默初始化

   // 请求通知权限 (如果需要的话)
   if ('Notification' in window && Notification.permission === 'default') {
      console.log("Requesting notification permission on mount if needed.");
      // 可以考虑在用户第一次点击“开始”时再请求，以获得更好用户体验
      // Notification.requestPermission();
   }
});

onUnmounted(() => {
  // 组件卸载时清除计时器，防止内存泄漏
  clearInterval(timerInterval.value);
   document.title = "备考智能驾驶舱 | 段绪程"; // 恢复默认标题
});

</script>

<style scoped>
/* --- Pomodoro Timer Specific Styles --- */
.pomodoro-card {
    border-left: 4px solid var(--accent-color);
    text-align: center;
    /* Add transition for border color based on mode */
    transition: border-left-color var(--transition-speed, 0.3s) ease;
}
/* Dynamic border color based on mode */
.pomodoro-card.mode-work { border-left-color: var(--primary-color); }
.pomodoro-card.mode-shortBreak { border-left-color: var(--success-color); }
.pomodoro-card.mode-longBreak { border-left-color: var(--accent-color); }


.timer-display-wrapper {
    margin-bottom: 1.5rem;
    display: inline-block;
    position: relative;
}
.timer-circle {
    position: relative;
    width: 200px;
    height: 200px;
}
.timer-progress-ring {
    transform: rotate(-90deg); /* Start from top */
}
.timer-progress-ring__bg,
.timer-progress-ring__fg {
    stroke-linecap: round;
}
.timer-progress-ring__bg {
    stroke: #e9ecef; /* Background ring color */
}
.timer-progress-ring__fg {
    /* stroke: var(--primary-color); */ /* Color set dynamically via class */
    transition: stroke-dashoffset 0.3s linear, stroke 0.3s ease;
    /* stroke-dasharray is set by :style binding */
    /* stroke-dashoffset is set by :style binding */
}
/* Dynamic stroke color based on mode class */
.mode-work .timer-progress-ring__fg { stroke: var(--primary-color); }
.mode-shortBreak .timer-progress-ring__fg { stroke: var(--success-color); }
.mode-longBreak .timer-progress-ring__fg { stroke: var(--accent-color); }


.timer-time-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
}
#timer-mode {
    display: block;
    font-size: 0.9rem;
    color: var(--text-light);
    margin-bottom: 0.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-weight: 500;
}
#timer-time {
    font-size: 2.8rem;
    font-weight: 700;
    color: var(--text-color);
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; /* Monospaced font for timer */
}

/* Session activity input */
.timer-session-info {
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
}
.timer-session-info label {
     font-size: 0.9em;
     color: var(--text-light);
}
.timer-session-info input[type="text"] {
     padding: 0.4em 0.8em;
     border: 1px solid var(--border-color);
     border-radius: 6px;
     font-size: 0.9em;
     width: 250px;
     text-align: center;
}
.timer-session-info input[type="text"]:disabled {
    background-color: #f8f9fa; /* Indicate disabled state */
    cursor: not-allowed;
}

/* Timer controls */
.timer-controls {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 0.8rem;
    flex-wrap: wrap;
}

/* Timer settings accordion */
.timer-settings { margin-top: 1rem; }
/* Assuming global .accordion styles apply, add specifics */
.settings-accordion .accordion-header { /* Specific style for settings header */
    background-color: transparent;
    padding: 0.5rem 0; /* Less padding */
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-light);
    justify-content: center; /* Center settings text */
    border-bottom: 1px dashed var(--border-color); /* Separator */
    border-radius: 0; /* Remove radius if needed */
}
.settings-accordion .accordion-header:hover {
    color: var(--primary-color);
    background-color: #fafbff; /* Subtle hover */
}
.settings-accordion .accordion-header i:first-child { margin-right: 0.5rem; }
.settings-accordion .arrow-icon { margin-left: 0.5rem !important; /* Override global margin-left: auto */ }
.settings-accordion .arrow-icon.rotated { transform: rotate(180deg); }


.settings-content {
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 1rem 0 0 0 !important; /* Override global accordion padding */
    flex-wrap: wrap;
    border-top: none; /* Remove potential double border */
}
/* Assuming global .input-group styles apply */
.settings-content .input-group label { font-size: 0.8em; }
.settings-content .input-group input[type="number"] {
    width: 60px;
    font-size: 0.9em;
    /* Add other input styles if not global */
     padding: 0.4em 0.6em;
     border: 1px solid var(--border-color);
     border-radius: 6px;
     text-align: center;
}
.settings-content .input-group input[type="number"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 2px rgba(74, 105, 189, 0.2);
}

/* Today's count display */
.pomodoros-today-count {
    margin-top: 1.5rem;
    font-size: 0.9em;
    color: var(--text-light);
    font-weight: 500;
}

/* Loading/Error indicators */
.loading-indicator, .error-message {
    text-align: center;
    padding: 1rem;
    color: var(--text-light);
}
.error-message {
    color: var(--danger-color);
}
.error-message.small { /* For settings error */
    font-size: 0.8em;
    padding: 0.5rem;
}

/* Responsive */
@media (max-width: 768px) {
    .timer-circle { width: 160px; height: 160px; }
    /* Adjust SVG attributes for smaller size if needed via JS or CSS vars,
       or ensure viewBox scales it automatically */
    #timer-time { font-size: 2.2rem; }
    .timer-session-info input[type="text"] { width: 200px; } /* Adjust width */
}

</style>