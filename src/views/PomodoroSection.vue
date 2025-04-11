<!-- src/views/PomodoroSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-stopwatch-20 icon-gradient"></i> 专注番茄钟</h1>
      <p>利用番茄工作法保持高效专注。</p>
    </header>
    <div class="card pomodoro-card" :class="`mode-${timerMode}`">
      <div class="pomodoro-timer">
        <div class="timer-display-wrapper">
           <div class="timer-circle">
             <svg class="timer-progress-ring" height="200" width="200">
               <circle class="timer-progress-ring__bg" stroke-width="8" fill="transparent" :r="timerRingRadius" :cx="timerRingCenter" :cy="timerRingCenter"/>
               <circle
                 class="timer-progress-ring__fg"
                 stroke-width="8"
                 fill="transparent"
                 :r="timerRingRadius"
                 :cx="timerRingCenter"
                 :cy="timerRingCenter"
                 :style="{ strokeDashoffset: timerRingOffset, stroke: timerRingColor }"
                 :stroke-dasharray="timerCircumference"
               />
             </svg>
             <div class="timer-time-content">
               <!-- 使用 store getters -->
               <span id="timer-mode-pomo">{{ timerModeText }}</span>
               <span id="timer-time-pomo">{{ formattedTimerTime }}</span>
             </div>
           </div>
        </div>
        <div class="timer-session-info">
          <label for="current-session-activity-pomo">当前活动:</label>
          <!-- v-model 绑定本地 ref，通过 @change 更新 store -->
          <input
             type="text"
             id="current-session-activity-pomo"
             placeholder="默认专注学习 (可选填具体内容)"
             v-model="localActivity"
             :disabled="isTimerRunning || timerMode !== 'work'"
             @change="updateActivityInStore"
          />
        </div>
        <div class="timer-controls">
          <!-- 调用 store actions -->
          <button @click="pomodoroStore.start" :disabled="isTimerRunning" class="btn btn-success" aria-label="开始计时器"><i class="fas fa-play"></i> 开始</button>
          <button @click="pomodoroStore.pause" :disabled="!isTimerRunning" class="btn btn-warning" aria-label="暂停计时器"><i class="fas fa-pause"></i> 暂停</button>
          <button @click="pomodoroStore.reset" class="btn btn-danger" aria-label="重置计时器"><i class="fas fa-redo-alt"></i> 重置</button>
        </div>
        <div class="timer-settings accordion">
          <div class="accordion-item settings-accordion">
            <button
              class="accordion-header settings-header"
              :aria-expanded="isSettingsOpen"
              @click="toggleSettings"
              aria-label="打开或关闭时长设置"
            >
              <i class="fas fa-cog"></i>
              <span>时长设置</span>
              <i class="fas fa-chevron-down arrow-icon" :class="{ rotated: isSettingsOpen }"></i>
            </button>
            <div class="accordion-content settings-content" v-show="isSettingsOpen">
              <div class="input-group">
                <label for="work-duration-pomo">工作:</label>
                <!-- v-model 绑定本地 ref，通过 @change 更新 store -->
                <input type="number" id="work-duration-pomo" min="1" v-model.number="localWorkDuration" @change="updateSettingsInStore"> 分钟
              </div>
              <div class="input-group">
                <label for="short-break-duration-pomo">短休:</label>
                <input type="number" id="short-break-duration-pomo" min="1" v-model.number="localShortBreakDuration" @change="updateSettingsInStore"> 分钟
              </div>
              <div class="input-group">
                <label for="long-break-duration-pomo">长休:</label>
                <input type="number" id="long-break-duration-pomo" min="1" v-model.number="localLongBreakDuration" @change="updateSettingsInStore"> 分钟
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { usePomodoroStore } from '@/stores/pomodoroStore.js'; // 导入 Pomodoro Store

const pomodoroStore = usePomodoroStore(); // 获取实例

// 使用 storeToRefs 获取响应式 state 和 getters
const {
  timerMode, timerSecondsRemaining, isTimerRunning, // state
  currentSessionActivity, // 直接从 store 获取和更新
  pomodorosToday,
  timerModeText, formattedTimerTime // getters
} = storeToRefs(pomodoroStore);

// 本地状态，用于 v-model (设置和活动描述)，并监听变化以更新 store
// 初始化时从 store 获取初始值
const localWorkDuration = ref(pomodoroStore.workDuration);
const localShortBreakDuration = ref(pomodoroStore.shortBreakDuration);
const localLongBreakDuration = ref(pomodoroStore.longBreakDuration);
const localActivity = ref(pomodoroStore.currentSessionActivity);

// 控制设置面板
const isSettingsOpen = ref(false);

// SVG 计算属性 (这些纯展示相关的计算可以保留在组件内)
const timerRingRadius = ref(90); // SVG 圆环半径
const timerRingCenter = ref(100); // SVG 圆心坐标 (假定 SVG 是 200x200)
const timerCircumference = computed(() => 2 * Math.PI * timerRingRadius.value); // 圆周长

// 计算当前模式的总秒数 (依赖本地的 ref，因为设置的更改是先更新本地 ref 再触发 store action)
const timerTotalSeconds = computed(() => {
    switch(timerMode.value) { // timerMode 是从 store 获取的响应式 ref
        case 'shortBreak': return localShortBreakDuration.value * 60;
        case 'longBreak': return localLongBreakDuration.value * 60;
        case 'work':
        default: return localWorkDuration.value * 60;
    }
});

// 计算 SVG 进度环的 stroke-dashoffset
const timerRingOffset = computed(() => {
    const total = timerTotalSeconds.value;
    // timerSecondsRemaining 是从 store 获取的响应式 ref
    const remaining = timerSecondsRemaining.value;
    // 计算进度比例 (0 到 1)
    const progress = total > 0 ? (total - remaining) / total : 0;
    // 确保进度在 0 和 1 之间
    const clampedProgress = Math.min(1, Math.max(0, progress));
    // 计算偏移量
    return timerCircumference.value * (1 - clampedProgress);
});

// 计算 SVG 进度环的颜色
const timerRingColor = computed(() => {
    switch(timerMode.value) { // timerMode 是从 store 获取的响应式 ref
        case 'shortBreak': return 'var(--success-color)'; // 使用 CSS 变量
        case 'longBreak': return 'var(--accent-color)';
        case 'work':
        default: return 'var(--primary-color)';
    }
});


// --- 方法 ---
// 切换设置面板的显示状态
function toggleSettings() {
  isSettingsOpen.value = !isSettingsOpen.value;
}

// 当本地设置输入框的值改变时 (通常在失去焦点或回车时触发 @change)
function updateSettingsInStore() {
    // 验证输入值 (可选，但建议)
    localWorkDuration.value = Math.max(1, localWorkDuration.value || 1);
    localShortBreakDuration.value = Math.max(1, localShortBreakDuration.value || 1);
    localLongBreakDuration.value = Math.max(1, localLongBreakDuration.value || 1);

    // 更新 store state (Pinia 允许直接修改，但最好通过 action)
    // pomodoroStore.workDuration = localWorkDuration.value; // 假设 store 允许直接修改
    // pomodoroStore.shortBreakDuration = localShortBreakDuration.value;
    // pomodoroStore.longBreakDuration = localLongBreakDuration.value;
    // **或者更好的方式：调用 action 来更新和保存**
    pomodoroStore.updateDurations({
        work: localWorkDuration.value,
        short: localShortBreakDuration.value,
        long: localLongBreakDuration.value,
    }); // 假设 store 有这样一个 action
}

// 当本地活动描述输入框的值改变时
function updateActivityInStore() {
    // 调用 store action 来更新活动描述
    pomodoroStore.updateActivity(localActivity.value);
}

// 监听 Store 状态变化，同步回本地状态
// 这确保了如果 store 的状态被其他方式改变（例如，通过 reset action），本地的 v-model 也能反映出来
watch(() => pomodoroStore.workDuration, (newVal) => {
    if (localWorkDuration.value !== newVal) localWorkDuration.value = newVal;
});
watch(() => pomodoroStore.shortBreakDuration, (newVal) => {
    if (localShortBreakDuration.value !== newVal) localShortBreakDuration.value = newVal;
});
watch(() => pomodoroStore.longBreakDuration, (newVal) => {
    if (localLongBreakDuration.value !== newVal) localLongBreakDuration.value = newVal;
});
// 监听 store 中的活动描述变化，同步到本地 v-model
watch(() => pomodoroStore.currentSessionActivity, (newVal) => {
    if (localActivity.value !== newVal) localActivity.value = newVal;
});

// 监听计时器运行状态或剩余时间变化来更新浏览器标题
watch([isTimerRunning, timerSecondsRemaining, timerModeText], () => {
    updateDocumentTitle();
}, { immediate: true }); // 立即执行一次以设置初始标题

// 辅助函数：更新浏览器标题 (这个应该在 store 中实现更合适，但放这里也行)
function updateDocumentTitle() {
   if (isTimerRunning.value || (timerSecondsRemaining.value > 0 && timerSecondsRemaining.value < timerTotalSeconds.value)) {
       // 使用从 store 获取的 getter
       document.title = `${timerModeText.value} | ${formattedTimerTime.value} - 备考舱`;
   } else {
       document.title = "备考智能驾驶舱 | 段绪程"; // 默认标题
   }
}


// onMounted 不再需要加载设置，Store 创建时已处理
onMounted(() => {
    // 可以同步一次本地状态，以防万一 store 初始化后有变化
    localWorkDuration.value = pomodoroStore.workDuration;
    localShortBreakDuration.value = pomodoroStore.shortBreakDuration;
    localLongBreakDuration.value = pomodoroStore.longBreakDuration;
    localActivity.value = pomodoroStore.currentSessionActivity;
    updateDocumentTitle(); // 设置初始标题
});

</script>

<style scoped>
/* --- Pomodoro Timer Specific Styles (补充完整) --- */
.pomodoro-card {
    border-left: 4px solid var(--accent-color);
    text-align: center;
}

.pomodoro-timer {
    /* 内部容器 */
}

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
    transform: rotate(-90deg); /* 从顶部开始 */
}

.timer-progress-ring__bg,
.timer-progress-ring__fg {
    stroke-linecap: round; /* 圆角端点 */
}

.timer-progress-ring__bg {
    stroke: #e9ecef; /* 背景环颜色 */
}

.timer-progress-ring__fg {
    /* 颜色由 :style 绑定动态设置 */
    transition: stroke-dashoffset 0.3s linear, stroke 0.3s ease; /* 平滑过渡 */
}

.timer-time-content {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
}

#timer-mode-pomo { /* 模式文本 */
    display: block;
    font-size: 0.9rem;
    color: var(--text-light);
    margin-bottom: 0.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
}

#timer-time-pomo { /* 时间文本 */
    font-size: 2.8rem;
    font-weight: 700;
    color: var(--text-color);
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; /* 等宽字体 */
}

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
     font-size: 0.9em;
     width: 250px;
     text-align: center;
     /* 继承全局 input 样式 */
}
.timer-session-info input:disabled {
    background-color: #f8f9fa; /* 禁用时的背景色 */
    cursor: not-allowed;
    opacity: 0.7; /* 降低透明度 */
}

.timer-controls {
    margin-bottom: 1.5rem;
    display: flex;
    justify-content: center;
    gap: 0.8rem;
    flex-wrap: wrap;
}
/* .btn 样式是全局的 */

.timer-settings {
    margin-top: 1rem;
    /* 继承全局 .accordion 样式 */
}
.settings-accordion .accordion-header {
    /* 继承或覆盖全局 .accordion-header */
    background-color: transparent;
    padding: 0.5rem 0;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-light);
    justify-content: center;
}
.settings-accordion .accordion-header:hover {
    color: var(--primary-color);
    background-color: transparent;
}
.settings-accordion .accordion-header i:first-child {
     margin-right: 0.5rem;
}
/* 箭头旋转样式 */
.accordion-header .arrow-icon.rotated {
    transform: rotate(180deg);
}

.settings-content {
    /* 继承或覆盖全局 .accordion-content */
    display: flex;
    justify-content: center;
    gap: 1rem;
    padding: 1rem 0 0 0 !important; /* 确保有上边距 */
    flex-wrap: wrap;
}
.settings-content .input-group label { font-size: 0.8em; }
.settings-content .input-group input[type="number"] {
    width: 60px;
    font-size: 0.9em;
    padding: 0.4em;
    /* 继承全局 input 样式 */
}

/* --- 响应式调整 --- */
@media (max-width: 768px) {
    .timer-circle {
        width: 160px;
        height: 160px;
    }
    /* 重要的：SVG 尺寸改变后，半径和圆心也需要调整 */
    /* 可以在 script setup 中根据屏幕宽度动态设置 timerRingRadius 和 timerRingCenter */
    /* 或者创建不同的 CSS 变量并在媒体查询中改变它们，然后在 script 中读取 CSS 变量 */
    /* 简单处理：假定手机上 r=72, cx=cy=80 */
    /* 你需要在 script setup 中添加逻辑来适配 */
    /* 例如：
       const isMobile = ref(window.innerWidth <= 768);
       const timerRingRadius = computed(() => isMobile.value ? 72 : 90);
       const timerRingCenter = computed(() => isMobile.value ? 80 : 100);
       // 并添加 resize 事件监听器更新 isMobile
    */


    #timer-time-pomo {
        font-size: 2.2rem; /* 调整时间字体大小 */
    }
}
</style>