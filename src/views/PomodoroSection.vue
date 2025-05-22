<template>
  <div class="gov-style-wrapper pomodoro-page-wrapper" @keyup.space="handleSpacebar" @keyup.r="handleResetKey" tabindex="0">
    <header class="section-header">
      <h1><i class="fas fa-stopwatch-20 header-icon"></i> 数字化番茄工作法</h1>
      <p>科学规划时间，铸就高效专注力。</p>
    </header>

    <div v-if="settingsLoading" class="loading-indicator card">
        <div class="spinner"></div> 加载配置参数...
    </div>
    <div v-else-if="settingsError && !settingsLoading" class="error-message card">
      <i class="fas fa-exclamation-triangle"></i> 参数加载失败: {{ settingsError }}
    </div>

    <div v-else class="pomodoro-layout-grid">
      <!-- Left Column: Daily Goal & Cycle Info -->
      <div class="pomodoro-aux-info">
        <div class="card daily-goal-card">
          <div class="card-header aux-card-header">
            <h2><i class="fas fa-flag-checkered"></i> 今日任务指标</h2>
          </div>
          <div class="card-body">
            <div v-if="!dailyGoalSet" class="goal-input-section">
                <label for="daily-pomodoro-goal">计划专注轮次:</label>
                <div class="input-with-button">
                    <input type="number" id="daily-pomodoro-goal" v-model.number="dailyGoalInput" min="1" class="form-control form-control-sm">
                    <button @click="setDailyGoal" class="btn btn-secondary btn-sm">设定</button>
                </div>
            </div>
            <div v-else class="goal-progress-display">
                <p>今日目标: <strong>{{ dailyGoal }}</strong> 轮 <button @click="resetDailyGoal" class="btn-text-link">(调整)</button></p>
                <div class="progress-bar-container labeled-progress">
                    <div class="progress-fill" :style="{ width: dailyGoalProgressPercentage + '%' }"></div>
                    <span class="progress-label">{{ pomodorosToday }} / {{ dailyGoal }}</span>
                </div>
            </div>
          </div>
        </div>

        <div class="card cycle-info-card">
          <div class="card-header aux-card-header">
            <h2><i class="fas fa-sync-alt"></i> 当前工作周期</h2>
          </div>
          <div class="card-body">
            <p>第 <strong>{{ currentCycle }}/{{ pomodorosPerCycle }}</strong> 轮专注</p>
            <p class="next-session-preview">下一时段: <strong>{{ nextSessionTypeDisplay }}</strong> <span v-if="nextSessionDurationDisplay">({{ nextSessionDurationDisplay }})</span></p>
          </div>
        </div>
      </div>

      <!-- Right Column: Main Timer -->
      <div class="card pomodoro-main-card" :data-mode="currentMode" :class="[cardModeClass, {'timer-active-aura': isTimerRunning && currentMode === 'work'}]">
        <div class="pomodoro-timer">
          <div class="timer-display-wrapper">
            <div class="timer-circle" :class="{'pulsing-aura': isTimerRunning && currentMode === 'work'}">
              <svg class="timer-progress-ring" :height="ringSize" :width="ringSize" viewBox="0 0 100 100">
                <circle class="timer-progress-ring__bg" :stroke-width="ringStrokeWidth" fill="transparent" :r="ringRadius" cx="50" cy="50"/>
                <circle class="timer-progress-ring__fg" :stroke-width="ringStrokeWidth" stroke-linecap="round" fill="transparent" :r="ringRadius" cx="50" cy="50" :style="ringStyle"/>
              </svg>
              <div class="timer-time-content">
                <span id="timer-mode" :key="currentMode" class="mode-text-display">{{ modeTextDisplay }}</span>
                <span id="timer-time" class="digital-font">{{ formattedTime }}</span>
                <span id="timer-cycle-indicator" v-if="currentMode === 'work'">专注轮次 {{ currentCycleInSession }}/{{ pomodorosPerCycle }}</span>
              </div>
            </div>
            <div v-if="showSealAnimation" class="seal-animation-container">
                <div class="seal-stamp" :class="sealTypeClass">
                    <i :class="sealIconClass"></i> {{ sealText }}
                </div>
            </div>
          </div>

          <div class="timer-session-activity-wrapper">
            <label for="current-session-activity-el" class="form-label sr-only">当前活动:</label>
            <input
              type="text"
              :value="currentSessionActivity"
              @input="updateActivityInStore($event)"
              id="current-session-activity-el"
              class="form-control activity-input"
              placeholder="当前专注任务 (选填)"
              :disabled="isTimerRunning && currentMode !== 'work'"
            />
          </div>

          <div class="timer-controls">
            <button @click="pomodoroStore.startTimer" class="btn btn-start" :disabled="isTimerRunning" title="开始 (Space)">
              <i class="fas fa-play"></i> 开始专注
            </button>
            <button @click="pomodoroStore.pauseTimer" class="btn btn-pause" :disabled="!isTimerRunning" title="暂停 (Space)">
              <i class="fas fa-pause"></i> 暂停计时
            </button>
            <button @click="resetTimerConfirm" class="btn btn-reset"
                    :disabled="!isTimerRunning && timerSecondsRemaining === timerTotalSeconds" title="重置 (R)">
              <i class="fas fa-redo-alt"></i> 重置会话
            </button>
          </div>

          <div class="timer-settings-toggle">
            <button class="btn btn-settings-toggle" @click="settingsOpen = !settingsOpen" :aria-expanded="settingsOpen" title="参数设置">
              <i class="fas fa-cog"></i> 参数设置 <i class="fas fa-chevron-down arrow-icon-inline" :class="{ rotated: settingsOpen }"></i>
            </button>
          </div>
          <transition name="settings-slide-fade">
            <div class="settings-panel-content card" v-show="settingsOpen">
              <div class="input-group">
                <label for="work-duration-el">专注时长:</label>
                <input type="number" v-model.number="localWorkDuration" @input="saveSettingsHandlerDebounced" id="work-duration-el" min="1" class="form-control form-control-sm"> 分钟
              </div>
              <div class="input-group">
                <label for="short-break-duration-el">短休时长:</label>
                <input type="number" v-model.number="localShortBreakDuration" @input="saveSettingsHandlerDebounced" id="short-break-duration-el" min="1" class="form-control form-control-sm"> 分钟
              </div>
              <div class="input-group">
                <label for="long-break-duration-el">长休时长:</label>
                <input type="number" v-model.number="localLongBreakDuration" @input="saveSettingsHandlerDebounced" id="long-break-duration-el" min="1" class="form-control form-control-sm"> 分钟
              </div>
               <div class="input-group">
                <label for="pomodoros-per-cycle-el">长休间隔:</label>
                <input type="number" v-model.number="localPomodorosPerCycle" @input="saveSettingsHandlerDebounced" id="pomodoros-per-cycle-el" min="1" class="form-control form-control-sm"> 轮专注
              </div>
              <p v-if="updateSettingsErrorDisplay" class="error-message small-text">
                参数更新失败: {{ updateSettingsErrorDisplay }}
              </p>
            </div>
          </transition>
        </div>
         <p class="pomodoros-today-statement">今日已完成专注 <strong>{{ pomodorosToday }}</strong> 次。再接再厉！</p>
      </div>
    </div>
    <audio ref="sessionEndSoundRef" :src="sessionEndSoundSrc" preload="auto"></audio>
    <audio ref="sealSoundRef" :src="sealSoundSrc" preload="auto"></audio>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { storeToRefs } from 'pinia';
import { usePomodoroStore } from '@/stores/pomodoroStore.js';
import { debounce } from 'lodash-es';

// Sound files in public/sounds/
const sessionEndSoundSrc = ref('/sounds/notification_simple.mp3');
const sealSoundSrc = ref('/sounds/stamp_effect.mp3');
const sessionEndSoundRef = ref(null);
const sealSoundRef = ref(null);

const pomodoroStore = usePomodoroStore();
const {
  workDuration, shortBreakDuration, longBreakDuration, pomodorosPerCycle,
  settingsLoading, settingsError, // Renamed error for clarity
  pomodorosToday,
  currentMode, isTimerRunning, timerSecondsRemaining, timerTotalSeconds,
  formattedTime, modeText, // modeText from store is still useful for logic
  currentSessionActivity,
  isSessionCompleted, // Flag from store indicating a session (work/break) just ended
  currentCycle, // Current pomodoro cycle (e.g., 1st pomodoro in a set of 4)
  // error, // General store error, renamed settingsError for clarity in this component
} = storeToRefs(pomodoroStore);

// Local state for UI
const settingsOpen = ref(false);
const localWorkDuration = ref(pomodoroStore.workDuration);
const localShortBreakDuration = ref(pomodoroStore.shortBreakDuration);
const localLongBreakDuration = ref(pomodoroStore.longBreakDuration);
const localPomodorosPerCycle = ref(pomodoroStore.pomodorosPerCycle);
const updateSettingsErrorDisplay = ref(null); // For settings update specific errors

// Daily Goal
const dailyGoalInput = ref(4);
const dailyGoal = ref(0); // Will be loaded from localStorage
const dailyGoalSet = ref(false);

// Seal Animation
const showSealAnimation = ref(false);
const sealText = ref('');
const sealIconClass = ref('');
const sealTypeClass = ref(''); // 'seal-success', 'seal-relax'

// Timer visual parameters
const ringSize = ref(240); // SVG viewbox size
const ringStrokeWidth = ref(8);
const ringRadius = computed(() => (ringSize.value / 2) - (ringStrokeWidth.value / 2) - 2); // Adjusted for stroke

// Computed properties
const cardModeClass = computed(() => `mode-${currentMode.value}`);

const ringStyle = computed(() => {
  const circumference = 2 * Math.PI * ringRadius.value;
  const total = timerTotalSeconds.value > 0 ? timerTotalSeconds.value : 1;
  const remaining = timerSecondsRemaining.value >= 0 ? timerSecondsRemaining.value : 0;
  let progress = (total - remaining) / total;
  progress = Math.min(1, Math.max(0, progress));
  const offset = circumference * (1 - progress);
  return {
    strokeDashoffset: `${offset}px`,
    strokeDasharray: `${circumference}px`,
    transition: remaining === total || timerSecondsRemaining.value === 0 ? 'none' : 'stroke-dashoffset 0.15s linear'
  };
});

const modeTextDisplay = computed(() => {
  switch(currentMode.value) {
    case 'work': return '聚精会神';
    case 'shortBreak': return '片刻小憩';
    case 'longBreak': return '深度休整';
    default: return '保持专注';
  }
});

const currentCycleInSession = computed(() => {
    // If currentMode is work, currentCycle reflects the pomodoro number in the set
    // If currentMode is break, it's after currentCycle has completed.
    return currentMode.value === 'work' ? currentCycle.value : pomodorosPerCycle.value;
});


const dailyGoalProgressPercentage = computed(() => {
    if (!dailyGoalSet.value || dailyGoal.value === 0) return 0;
    return Math.min(100, (pomodorosToday.value / dailyGoal.value) * 100);
});

const nextSessionTypeDisplay = computed(() => {
    if (currentMode.value === 'work') {
        return (currentCycle.value % pomodorosPerCycle.value === 0) ? '长时休整' : '短暂小憩';
    } else if (currentMode.value === 'shortBreak' || currentMode.value === 'longBreak') {
        return '聚精会神';
    }
    return '...';
});
const nextSessionDurationDisplay = computed(() => {
     if (currentMode.value === 'work') {
        return formatTime((currentCycle.value % pomodorosPerCycle.value === 0) ? longBreakDuration.value * 60 : shortBreakDuration.value * 60);
    } else if (currentMode.value === 'shortBreak' || currentMode.value === 'longBreak') {
        return formatTime(workDuration.value * 60);
    }
    return '';
});
function formatTime(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}


// Methods
function setDailyGoal() {
    if (dailyGoalInput.value >= 1) {
        dailyGoal.value = dailyGoalInput.value;
        localStorage.setItem('pomodoroDailyGoal', dailyGoal.value.toString());
        dailyGoalSet.value = true;
    } else {
        alert("目标轮次至少为1。");
    }
}
function resetDailyGoal() {
    dailyGoalSet.value = false;
    nextTick(() => {
        document.getElementById('daily-pomodoro-goal')?.focus();
    });
}

const saveSettingsHandler = async () => {
  updateSettingsErrorDisplay.value = null;
  const newSettings = {
    workDuration: Math.max(1, parseInt(localWorkDuration.value, 10) || 25),
    shortBreakDuration: Math.max(1, parseInt(localShortBreakDuration.value, 10) || 5),
    longBreakDuration: Math.max(1, parseInt(localLongBreakDuration.value, 10) || 15),
    pomodorosPerCycle: Math.max(1, parseInt(localPomodorosPerCycle.value, 10) || 4),
  };
  // Update local refs to reflect sanitized values immediately
  localWorkDuration.value = newSettings.workDuration;
  localShortBreakDuration.value = newSettings.shortBreakDuration;
  localLongBreakDuration.value = newSettings.longBreakDuration;
  localPomodorosPerCycle.value = newSettings.pomodorosPerCycle;

  const success = await pomodoroStore.updateSettings(newSettings);
  if (!success) {
    updateSettingsErrorDisplay.value = pomodoroStore.error || "未能保存设置。";
  } else {
    // settingsOpen.value = false; // Optionally close settings on successful save
  }
};
const saveSettingsHandlerDebounced = debounce(saveSettingsHandler, 1000);

function resetTimerConfirm() {
  // Confirmation logic from before
  let confirmReset = true;
  if (isTimerRunning.value) {
    confirmReset = confirm('计时正在进行中，确定要重置吗？当前专注时段不会被记录。');
  } else if (timerSecondsRemaining.value !== timerTotalSeconds.value) {
    confirmReset = confirm('确定要重置番茄钟吗？');
  } else {
    return; // Already in a reset state
  }

  if (confirmReset) {
    pomodoroStore.resetTimer();
    // settingsOpen.value = false; // Keep settings open if user was interacting with them
  }
}

function updateActivityInStore(event) {
  pomodoroStore.updateCurrentActivity(event.target.value);
}

function handleSpacebar(event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return; // Don't interfere with text inputs
  event.preventDefault();
  if (isTimerRunning.value) pomodoroStore.pauseTimer();
  else pomodoroStore.startTimer();
}
function handleResetKey(event) {
  if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') return;
  event.preventDefault();
  resetTimerConfirm();
}

// Watch for session completion
watch(isSessionCompleted, (completedNewValue, completedOldValue) => {
    if (completedNewValue && !completedOldValue) { // Trigger only when it becomes true
        const lastMode = pomodoroStore.lastCompletedMode; // Need this from store

        if (lastMode === 'work') {
            sealText.value = '专注达成';
            sealIconClass.value = 'fas fa-award';
            sealTypeClass.value = 'seal-success';
            playSound(sealSoundRef.value);
        } else { // Break completed
            sealText.value = '休整完毕';
            sealIconClass.value = 'fas fa-mug-hot'; // Or coffee, tea, etc.
            sealTypeClass.value = 'seal-relax';
            playSound(sessionEndSoundRef.value); // Regular notification for break end
        }
        showSealAnimation.value = true;

        setTimeout(() => {
            showSealAnimation.value = false;
            pomodoroStore.acknowledgeSessionCompletion();
        }, 3500); // Animation duration + a bit
    }
});

function playSound(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0; // Rewind to start
        audioElement.play().catch(e => console.warn("Audio play failed:", e));
    }
}


onMounted(async () => {
  await pomodoroStore.loadSettings(); // Load existing settings first
  // Sync local refs with potentially loaded store values
  localWorkDuration.value = pomodoroStore.workDuration;
  localShortBreakDuration.value = pomodoroStore.shortBreakDuration;
  localLongBreakDuration.value = pomodoroStore.longBreakDuration;
  localPomodorosPerCycle.value = pomodoroStore.pomodorosPerCycle;

  const storedGoal = localStorage.getItem('pomodoroDailyGoal');
  if (storedGoal) {
    dailyGoal.value = parseInt(storedGoal);
    dailyGoalInput.value = dailyGoal.value;
    dailyGoalSet.value = true;
  }
});

</script>

<style scoped>
/* --- Red Government Style Theme Variables (Assumed from context) --- */
.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-primary-red-light-bg: #fff5f5; /* Very light red for backgrounds */
  --gov-accent-gold: #B8860B;
  --gov-accent-blue: #0056b3;
  --gov-secondary-gray: #6c757d;
  --gov-text-primary: #212529;
  --gov-text-secondary: #495057;
  --gov-text-on-red: #ffffff;
  --gov-background-light: #f8f9fa;
  --gov-background-white: #ffffff;
  --gov-border-color: #ced4da;
  --gov-border-color-strong: #adb5bd;
  --gov-danger-red: #dc3545;
  --gov-success-green: #28a745;
  --gov-shadow-soft: 0 2px 5px rgba(0,0,0,0.08);
  --gov-shadow-medium: 0 5px 15px rgba(0,0,0,0.1);
  --gov-shadow-strong: 0 8px 25px rgba(0,0,0,0.12);
  --gov-transition-default: all 0.25s ease-in-out;

  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
  outline: none;
}
.pomodoro-page-wrapper {
    padding-bottom: 2rem; /* Add some padding at the bottom of the page */
}

/* Base Card & Header Styles */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 6px; /* Slightly more pronounced radius */
  box-shadow: var(--gov-shadow-medium);
  margin-bottom: 1.5rem;
}
.section-header {
  margin-bottom: 2rem; padding-bottom: 1.25rem; border-bottom: 3px solid var(--gov-primary-red);
  text-align: center; /* Centered header */
}
.section-header h1 { font-size: 2rem; font-weight: 700; }
.section-header h1 > .header-icon { font-size: 1.8rem; animation: gentleRotate 5s linear infinite; }
@keyframes gentleRotate { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
.section-header p { font-size: 1.05rem; color: var(--gov-text-secondary); margin-top: 0.5rem; }

.form-control {
  padding: 0.5rem 0.75rem; font-size: 0.9rem; color: var(--gov-text-primary);
  background-color: var(--gov-background-white); border: 1px solid var(--gov-border-color-strong);
  border-radius: 4px; transition: var(--gov-transition-default); box-sizing: border-box;
}
.form-control:focus {
  border-color: var(--gov-primary-red); outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(217, 0, 0, 0.2);
}
.form-control-sm { padding: 0.35rem 0.6rem; font-size: 0.85rem; }

.btn {
  padding: 0.6rem 1.2rem; font-size: 0.95rem; border-radius: 4px; border: 1px solid transparent;
  cursor: pointer; transition: var(--gov-transition-default); font-weight: 500;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
  text-decoration: none; box-shadow: var(--gov-shadow-soft);
}
.btn:hover { transform: translateY(-1px); box-shadow: var(--gov-shadow-medium); }
.btn:active { transform: translateY(0px); box-shadow: inset 0 1px 2px rgba(0,0,0,0.1); }
.btn-sm { padding: 0.4rem 0.8rem; font-size: 0.85rem; }
.btn-primary { background-color: var(--gov-primary-red); border-color: var(--gov-primary-red); color: var(--gov-text-on-red); }
.btn-primary:hover { background-color: var(--gov-primary-red-dark); border-color: var(--gov-primary-red-dark); }
.btn-primary:disabled { background-color: #e08585; border-color: #e08585; color: #fff5f5; cursor: not-allowed; box-shadow: none; transform: none;}
.btn-secondary { background-color: var(--gov-secondary-gray); border-color: var(--gov-secondary-gray); color: var(--gov-text-on-red); }
.btn-secondary:hover { background-color: var(--gov-secondary-gray-dark); border-color: var(--gov-secondary-gray-dark); }
.btn-text-link {
    padding: 0; font-size: 0.8rem; color: var(--gov-accent-blue); text-decoration: underline;
    background: none; border: none; box-shadow: none; font-weight: normal; margin-left: 0.3rem;
}
.btn-text-link:hover { color: var(--gov-primary-red); }


/* Layout Grid */
.pomodoro-layout-grid {
    display: grid;
    grid-template-columns: 1fr; /* Default single column */
    gap: 1.5rem;
}
@media (min-width: 1024px) { /* Switch to two columns on larger screens */
    .pomodoro-layout-grid { grid-template-columns: 320px 1fr; }
}

/* Aux Info Cards (Left Column) */
.pomodoro-aux-info .card { margin-bottom: 1.5rem; }
.pomodoro-aux-info .card:last-child { margin-bottom: 0; }
.aux-card-header { padding: 0.6rem 1rem !important; background-color: var(--gov-background-light) !important; }
.aux-card-header h2 { font-size: 1rem !important; font-weight: 600; color: var(--gov-text-primary) !important;}
.aux-card-header h2 i { color: var(--gov-secondary-gray); margin-right: 0.4em; }

.daily-goal-card .card-body { padding: 1rem; }
.goal-input-section label { display:block; font-size: 0.85rem; margin-bottom: 0.3rem; font-weight: 500; }
.input-with-button { display: flex; gap: 0.5rem; }
.input-with-button .form-control { flex-grow: 1; }
.goal-progress-display p { margin: 0 0 0.5rem 0; font-size: 0.9rem; }
.progress-bar-container.labeled-progress {
    height: 20px; background-color: var(--gov-border-color); border-radius: 4px;
    position: relative; overflow: hidden;
}
.progress-bar-container.labeled-progress .progress-fill {
    background-color: var(--gov-accent-blue); height: 100%;
    transition: width 0.5s ease-out;
}
.progress-bar-container.labeled-progress .progress-label {
    position: absolute; left: 0; right: 0; top: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    font-size: 0.75rem; color: var(--gov-text-on-red); font-weight: 600;
}

.cycle-info-card .card-body { padding: 1rem; font-size: 0.9rem; }
.cycle-info-card p { margin: 0.3rem 0; }
.next-session-preview { color: var(--gov-text-secondary); font-style: italic;}
.next-session-preview strong { color: var(--gov-text-primary); font-style: normal;}

/* Main Pomodoro Card */
.pomodoro-main-card {
  box-shadow: var(--gov-shadow-strong);
  position: relative;
  overflow: hidden;
  transition: background-image 0.8s ease-in-out; /* For background gradient transition */
  background-size: 200% 200%; /* For gradient animation */
}
.pomodoro-main-card.mode-work { background-image: linear-gradient(135deg, var(--gov-primary-red-dark) 0%, var(--gov-primary-red) 50%, #e64c4c 100%); animation: gradientShift 15s ease infinite; }
.pomodoro-main-card.mode-shortBreak { background-image: linear-gradient(135deg, var(--gov-accent-gold) 0%, #d4af37 50%, #f0e68c 100%); animation: gradientShift 15s ease infinite; }
.pomodoro-main-card.mode-longBreak { background-image: linear-gradient(135deg, var(--gov-accent-blue) 0%, #007bff 50%, #add8e6 100%); animation: gradientShift 15s ease infinite; }

@keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

.pomodoro-main-card .pomodoro-timer { padding: 1.5rem; } /* Inner padding */
.timer-active-aura::after { /* Focus Aura */
    content: ''; position: absolute; top: -20px; left: -20px; right: -20px; bottom: -20px;
    border-radius: 30px; /* Larger than card radius */
    box-shadow: 0 0 30px 10px rgba(217, 0, 0, 0.3); /* Red glow */
    animation: auraPulse 2.5s infinite ease-in-out;
    pointer-events: none; /* Allow clicks through */
    z-index: -1;
}
@keyframes auraPulse { 0%, 100% { box-shadow: 0 0 30px 10px rgba(217,0,0,0.2); } 50% { box-shadow: 0 0 45px 15px rgba(217,0,0,0.35); } }


.timer-display-wrapper { margin-bottom: 1.5rem; display: inline-block; position: relative; }
.timer-circle {
  position: relative; width: var(--ring-size, 240px); height: var(--ring-size, 240px);
  margin: 0 auto;
  /* Pulsing Aura for Timer Circle when active work */
  transition: transform 0.3s ease;
}
.timer-circle.pulsing-aura { animation: circlePulse 1.8s infinite ease-in-out; }
@keyframes circlePulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.03); } }

.timer-progress-ring__bg { stroke: rgba(255,255,255,0.2); } /* Light background on dark card */
.timer-progress-ring__fg { stroke: var(--gov-text-on-red); } /* Default bright stroke on dark card */
.mode-work .timer-progress-ring__fg { stroke: #FFD700; /* Gold on Red */ }
.mode-shortBreak .timer-progress-ring__fg { stroke: var(--gov-primary-red); /* Red on Gold */ }
.mode-longBreak .timer-progress-ring__fg { stroke: var(--gov-text-on-red); /* White on Blue */ }

.timer-time-content {
    position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%);
    text-align: center; color: var(--gov-text-on-red);
}
.mode-text-display {
  display: block; font-size: 1.1rem; margin-bottom: 0.2rem;
  text-transform: uppercase; letter-spacing: 2px; font-weight: 700;
  opacity: 0.9;
  animation: modeTextEnter 0.6s ease-out forwards;
}
@keyframes modeTextEnter {
    from { opacity: 0; transform: translateY(-15px) scale(0.9); }
    to { opacity: 0.9; transform: translateY(0) scale(1); }
}
#timer-time.digital-font {
  font-size: 3.8rem; font-weight: bold;
  font-family: 'DS-Digital', 'Segment7', 'Orbitron', Consolas, monospace; /* Digital fonts */
  letter-spacing: 2px;
  text-shadow: 0 0 5px rgba(255,255,255,0.3);
}
#timer-cycle-indicator {
    display: block; font-size: 0.8rem; margin-top: 0.3rem; opacity: 0.8; font-weight: 500;
}

/* Seal Animation */
.seal-animation-container {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    display: flex; align-items: center; justify-content: center;
    pointer-events: none; z-index: 20;
}
.seal-stamp {
    padding: 1.2rem 2rem; border-radius: 8px;
    color: var(--gov-text-on-red); font-size: 1.5rem; font-weight: bold;
    display: flex; align-items: center; gap: 0.8rem;
    box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    border: 3px solid rgba(255,255,255,0.7);
    text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
    animation: stampAndFade 3.5s cubic-bezier(0.18, 0.89, 0.32, 1.28) forwards;
}
.seal-stamp.seal-success { background-color: var(--gov-success-green); }
.seal-stamp.seal-relax { background-color: var(--gov-accent-blue); }
.seal-stamp i { font-size: 1.2em; }

@keyframes stampAndFade {
    0% { transform: scale(0.5) rotate(-15deg); opacity: 0; }
    20% { transform: scale(1.1) rotate(5deg); opacity: 1; }
    30% { transform: scale(1) rotate(-2deg); opacity: 1; }
    80% { opacity: 1; transform: scale(1) rotate(0deg); }
    100% { opacity: 0; transform: scale(0.9) rotate(5deg); }
}

.timer-session-activity-wrapper { margin-bottom: 1.5rem; max-width: 400px; margin-left:auto; margin-right:auto; }
.activity-input.form-control {
    text-align: center; font-size: 0.95rem;
    background-color: rgba(255,255,255,0.1); /* Semi-transparent on themed background */
    color: var(--gov-text-on-red); border-color: rgba(255,255,255,0.3);
}
.activity-input.form-control::placeholder { color: rgba(255,255,255,0.6); }
.activity-input.form-control:focus {
    background-color: rgba(255,255,255,0.2);
    border-color: var(--gov-text-on-red);
    box-shadow: 0 0 0 0.2rem rgba(255,255,255,0.25);
}
.activity-input:disabled { background-color: rgba(0,0,0,0.1); border-color: rgba(255,255,255,0.2); cursor: not-allowed;}


.timer-controls { margin-bottom: 1.5rem; display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap;}
.timer-controls .btn {
    padding: 0.8rem 1.8rem; font-size: 1.05rem; text-transform: uppercase; letter-spacing: 0.5px;
    border-width: 2px;
}
.btn-start { background-color: var(--gov-success-green); border-color: var(--gov-success-green); color:white; }
.btn-start:hover { background-color: #218838; border-color: #1e7e34; }
.btn-pause { background-color: var(--gov-accent-gold); border-color: var(--gov-accent-gold); color:white; }
.btn-pause:hover { background-color: #a0740a; border-color: #8c6609;}
.btn-reset { background-color: var(--gov-secondary-gray); border-color: var(--gov-secondary-gray); color:white; }
.btn-reset:hover { background-color: var(--gov-secondary-gray-dark); border-color: var(--gov-secondary-gray-dark); }

/* Settings Toggle & Panel */
.timer-settings-toggle { margin-top: 1.5rem; margin-bottom: 0.5rem; }
.btn-settings-toggle {
    background: none; border: none; color: rgba(255,255,255,0.7); font-size: 0.9rem; font-weight: 500;
    padding: 0.5rem 1rem; border-radius: 4px; cursor: pointer; display: inline-flex; align-items: center; gap: 0.5em;
}
.pomodoro-main-card .btn-settings-toggle:hover { background-color: rgba(0,0,0,0.1); color: var(--gov-text-on-red); }
.arrow-icon-inline { transition: transform var(--gov-transition-default); }
.arrow-icon-inline.rotated { transform: rotate(180deg); }

.settings-panel-content {
    background-color: rgba(0,0,0,0.15); /* Darker panel on themed background */
    border: 1px solid rgba(255,255,255,0.2);
    margin-top: 0.5rem; padding: 1rem;
    border-radius: 6px;
}
.settings-panel-content .input-group { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.8rem; }
.settings-panel-content .input-group label { font-size: 0.9rem; color: rgba(255,255,255,0.85); font-weight: 500; }
.settings-panel-content .input-group .form-control-sm {
    width: 75px; text-align: center;
    background-color: rgba(255,255,255,0.1); color: var(--gov-text-on-red); border-color: rgba(255,255,255,0.3);
}
.settings-panel-content .input-group .form-control-sm:focus {
    background-color: rgba(255,255,255,0.2); border-color: var(--gov-text-on-red);
}
.settings-panel-content .error-message.small-text { color: #ffdddd; font-size:0.8rem; margin-top:0.5rem; text-align:center;}

/* Settings Transition */
.settings-slide-fade-enter-active, .settings-slide-fade-leave-active { transition: all .3s ease-out; overflow: hidden;}
.settings-slide-fade-enter-from, .settings-slide-fade-leave-to { transform: translateY(-10px); opacity: 0; max-height: 0px; padding-top:0; padding-bottom:0; margin-top:0;}
.settings-slide-fade-enter-to, .settings-slide-fade-leave-from { max-height: 300px; /* Adjust as needed */ }


.pomodoros-today-statement {
    margin-top: 2rem; font-size: 1rem; color: rgba(255,255,255,0.85); text-align: center;
    padding: 0.75rem; background-color: rgba(0,0,0,0.1); border-radius: 4px;
}
.pomodoros-today-statement strong { color: var(--gov-text-on-red); font-weight: bold; font-size: 1.1em; }

.sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }
.loading-indicator, .error-message { padding: 1rem; text-align: center; }
.loading-indicator .spinner { margin:0 auto 0.5rem auto; }

@media (max-width: 768px) {
    .pomodoro-layout-grid { grid-template-columns: 1fr; } /* Stack on mobile */
    .pomodoro-aux-info { order: 2; } /* Aux info below timer on mobile */
    .pomodoro-main-card { order: 1; }

    .section-header h1 { font-size: 1.6rem; }
    .section-header p { font-size: 0.9rem; }

    .timer-circle { width: calc(var(--ring-size, 240px) * 0.8); height: calc(var(--ring-size, 240px) * 0.8); }
    #timer-time.digital-font { font-size: 3rem; }
    .mode-text-display { font-size: 0.9rem; }
    .activity-input.form-control { width: 90%; max-width: 280px; }
    .timer-controls .btn { padding: 0.7rem 1.2rem; font-size: 0.9rem; }
    .settings-panel-content .input-group { flex-direction: column; align-items: flex-start; gap: 0.3rem;}
    .settings-panel-content .input-group label { margin-bottom: 0.2rem; }
    .settings-panel-content .input-group .form-control-sm { width: 100%; }
}

</style>