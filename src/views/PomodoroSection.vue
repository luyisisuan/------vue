<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-stopwatch-20 icon-gradient"></i> 专注番茄钟</h1>
      <p>利用番茄工作法保持高效专注。</p>
    </header>

    <div v-if="settingsLoading" class="loading-indicator card">加载设置中...</div>
    <div v-else-if="settingsError && !settingsLoading" class="error-message card" style="color: red;">
      加载设置错误: {{ settingsError }}
    </div>

    <div v-else class="card pomodoro-card" :data-mode="currentMode" :class="cardModeClass">
      <div class="pomodoro-timer">
        <div class="timer-display-wrapper">
          <div class="timer-circle">
            <svg class="timer-progress-ring" height="200" width="200" viewBox="0 0 200 200">
              <circle class="timer-progress-ring__bg" stroke-width="8" fill="transparent" r="90" cx="100" cy="100"/>
              <circle class="timer-progress-ring__fg" stroke-width="8" fill="transparent" r="90" cx="100" cy="100" :style="ringStyle"/>
            </svg>
            <div class="timer-time-content">
              <span id="timer-mode">{{ modeText }}</span>
              <span id="timer-time">{{ formattedTime }}</span>
            </div>
          </div>
        </div>

        <div class="timer-session-info">
          <label for="current-session-activity-el">当前活动:</label>
          <input
            type="text"
            :value="currentSessionActivity"
            @input="updateActivityInStore($event)"
            id="current-session-activity-el"
            placeholder="默认专注学习 (可选填具体内容)"
            :disabled="isTimerRunning || currentMode !== 'work'"
          />
        </div>

        <div class="timer-controls">
          <button @click="pomodoroStore.startTimer" class="btn btn-success" :disabled="isTimerRunning">
            <i class="fas fa-play"></i> 开始
          </button>
          <button @click="pomodoroStore.pauseTimer" class="btn btn-warning" :disabled="!isTimerRunning">
            <i class="fas fa-pause"></i> 暂停
          </button>
          <button @click="resetTimerConfirm" class="btn btn-danger"
                  :disabled="!isTimerRunning && timerSecondsRemaining === timerTotalSeconds">
            <i class="fas fa-redo-alt"></i> 重置
          </button>
        </div>

        <div class="timer-settings accordion">
          <div class="accordion-item settings-accordion">
            <button class="accordion-header settings-header" :aria-expanded="settingsOpen"
                    @click="settingsOpen = !settingsOpen">
              <i class="fas fa-cog"></i>
              <span>时长设置</span>
              <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: settingsOpen }"></i>
            </button>
            <div class="accordion-content settings-content" v-show="settingsOpen">
              <div class="input-group">
                <label for="work-duration-el">工作:</label>
                <input type="number" v-model.number="localWorkDuration"
                       @input="saveSettingsHandler" id="work-duration-el" min="1"> 分钟
              </div>
              <div class="input-group">
                <label for="short-break-duration-el">短休:</label>
                <input type="number" v-model.number="localShortBreakDuration"
                       @input="saveSettingsHandler" id="short-break-duration-el" min="1"> 分钟
              </div>
              <div class="input-group">
                <label for="long-break-duration-el">长休:</label>
                <input type="number" v-model.number="localLongBreakDuration"
                       @input="saveSettingsHandler" id="long-break-duration-el" min="1"> 分钟
              </div>
              <p v-if="settingsError && settingsOpen" class="error-message small">
                更新失败: {{ settingsError }}
              </p>
            </div>
          </div>
        </div>
        <p class="pomodoros-today-count">你已经完成的专注次数: {{ pomodorosToday }}次</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePomodoroStore } from '@/stores/pomodoroStore.js';

// 获取 store
const pomodoroStore = usePomodoroStore();
const {
  workDuration, shortBreakDuration, longBreakDuration,
  settingsLoading, settingsError,
  pomodorosToday,
  currentMode, isTimerRunning, timerSecondsRemaining, timerTotalSeconds,
  formattedTime, modeText,
  currentSessionActivity
} = storeToRefs(pomodoroStore);

// 本地状态，设置面板是否展开
const settingsOpen = ref(false);
// 本地设置输入，采用双向绑定，实现实时刷新
const localWorkDuration = ref(workDuration.value);
const localShortBreakDuration = ref(shortBreakDuration.value);
const localLongBreakDuration = ref(longBreakDuration.value);

// 计算属性：卡片样式
const cardModeClass = computed(() => `mode-${currentMode.value}`);
const ringStyle = computed(() => {
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const total = timerTotalSeconds.value > 0 ? timerTotalSeconds.value : 1;
  const remaining = timerSecondsRemaining.value >= 0 ? timerSecondsRemaining.value : 0;
  const progress = (total - remaining) / total;
  const offset = circumference * (1 - Math.min(1, Math.max(0, progress)));
  return { strokeDashoffset: `${offset}px`, strokeDasharray: `${circumference}px` };
});

// 同步 store 内部设置到本地输入框
watch([workDuration, shortBreakDuration, longBreakDuration],
  ([newWork, newShort, newLong]) => {
    localWorkDuration.value = newWork || 25;
    localShortBreakDuration.value = newShort || 5;
    localLongBreakDuration.value = newLong || 15;
  },
  { immediate: true }
);

// 实时保存设置，并触发 store 内部刷新
function saveSettingsHandler() {
  const newSettings = {
    workDuration: Math.max(1, localWorkDuration.value || 25),
    shortBreakDuration: Math.max(1, localShortBreakDuration.value || 5),
    longBreakDuration: Math.max(1, localLongBreakDuration.value || 15)
  };
  // 同步本地输入值
  localWorkDuration.value = newSettings.workDuration;
  localShortBreakDuration.value = newSettings.shortBreakDuration;
  localLongBreakDuration.value = newSettings.longBreakDuration;
  pomodoroStore.updateSettings(newSettings);
}

// 点击重置按钮前的确认
function resetTimerConfirm() {
  if (confirm('确定要重置当前的番茄钟吗？进行中的专注时段将不会被记录。')) {
    pomodoroStore.resetTimer();
  }
}

// 当活动内容输入时更新 store
function updateActivityInStore(event) {
  pomodoroStore.updateCurrentActivity(event.target.value);
}

onMounted(() => { console.log('PomodoroSection mounted.'); });
onUnmounted(() => {
  console.log('PomodoroSection unmounted.');
  // 根据需求，可以在这里调用 pomodoroStore.cleanupTimer();
});
</script>

<style scoped>
/* Styles remain the same */
/* --- Pomodoro Timer Specific Styles --- */
.pomodoro-card { border-left: 4px solid var(--accent-color); text-align: center; transition: border-left-color var(--transition-speed, 0.3s) ease; }
.pomodoro-card.mode-work { border-left-color: var(--primary-color); }
.pomodoro-card.mode-shortBreak { border-left-color: var(--success-color); }
.pomodoro-card.mode-longBreak { border-left-color: var(--accent-color); }
.timer-display-wrapper { margin-bottom: 1.5rem; display: inline-block; position: relative; }
.timer-circle { position: relative; width: 200px; height: 200px; }
.timer-progress-ring { transform: rotate(-90deg); }
.timer-progress-ring__bg, .timer-progress-ring__fg { stroke-linecap: round; }
.timer-progress-ring__bg { stroke: #e9ecef; }
.timer-progress-ring__fg { transition: stroke-dashoffset 0.3s linear, stroke 0.3s ease; }
.mode-work .timer-progress-ring__fg { stroke: var(--primary-color); }
.mode-shortBreak .timer-progress-ring__fg { stroke: var(--success-color); }
.mode-longBreak .timer-progress-ring__fg { stroke: var(--accent-color); }
.timer-time-content { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
#timer-mode { display: block; font-size: 0.9rem; color: var(--text-light); margin-bottom: 0.2rem; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }
#timer-time { font-size: 2.8rem; font-weight: 700; color: var(--text-color); font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; }
.timer-session-info { margin-bottom: 1.5rem; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
.timer-session-info label { font-size: 0.9em; color: var(--text-light); }
.timer-session-info input[type="text"] { padding: 0.4em 0.8em; border: 1px solid var(--border-color); border-radius: 6px; font-size: 0.9em; width: 250px; text-align: center; }
.timer-session-info input[type="text"]:disabled { background-color: #f8f9fa; cursor: not-allowed; }
.timer-controls { margin-bottom: 1.5rem; display: flex; justify-content: center; gap: 0.8rem; flex-wrap: wrap; }
.timer-settings { margin-top: 1rem; }
.settings-accordion .accordion-header { background-color: transparent; padding: 0.5rem 0; font-size: 0.9rem; font-weight: 500; color: var(--text-light); justify-content: center; border-bottom: 1px dashed var(--border-color); border-radius: 0; }
.settings-accordion .accordion-header:hover { color: var(--primary-color); background-color: #fafbff; }
.settings-accordion .accordion-header i:first-child { margin-right: 0.5rem; }
.settings-accordion .arrow-icon { margin-left: 0.5rem !important; }
.settings-accordion .arrow-icon.rotated { transform: rotate(180deg); }
.settings-content { display: flex; justify-content: center; gap: 1rem; padding: 1rem 0 0 0 !important; flex-wrap: wrap; border-top: none; }
.settings-content .input-group label { font-size: 0.8em; }
.settings-content .input-group input[type="number"] { width: 60px; font-size: 0.9em; padding: 0.4em 0.6em; border: 1px solid var(--border-color); border-radius: 6px; text-align: center; }
.settings-content .input-group input[type="number"]:focus { outline: none; border-color: var(--primary-color); box-shadow: 0 0 0 2px rgba(74, 105, 189, 0.2); }
.pomodoros-today-count { margin-top: 1.5rem; font-size: 0.9em; color: var(--text-light); font-weight: 500; }
.loading-indicator, .error-message { text-align: center; padding: 1rem; color: var(--text-light); }
.error-message { color: var(--danger-color); }
.error-message.small { font-size: 0.8em; padding: 0.5rem; }
.section-header h1 i.icon-gradient { background: var(--gradient-accent); -webkit-background-clip: text; background-clip: text; color: transparent;}
@media (max-width: 768px) {
    .timer-circle { width: 160px; height: 160px; }
    #timer-time { font-size: 2.2rem; }
    .timer-session-info input[type="text"] { width: 200px; }
}
</style>