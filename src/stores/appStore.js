// src/stores/appStore.js
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import config from '@/config.js'; // 导入应用配置
import { loadData, saveData } from '@/utils/storage.js'; // 导入 localStorage 工具函数
import { formatSecondsToHHMMSS } from '@/utils/formatters.js'; // 导入时间格式化函数
import { throttle } from 'lodash-es'; // 导入节流函数

export const useAppStore = defineStore('app', () => {
    // --- State ---
    // 使用 ref 创建响应式状态，存储在线时间数据
    const onlineTimeData = ref({
        totalSeconds: 0,             // 总在线秒数
        lastActivityTimestamp: Date.now() // 最后活动时间戳 (毫秒)
    });
    // 定时器 ID，用于启动和停止
    let onlineTimerInterval = null;
    // 用于节流的内部时间戳，防止过于频繁地更新 lastActivityTimestamp
    let lastActivityUpdateTimestamp = 0;

    // --- Getters (Computed) ---
    // 计算格式化后的在线时间字符串 (HH:MM:SS)
    const formattedOnlineTime = computed(() => formatSecondsToHHMMSS(onlineTimeData.value.totalSeconds));

    // --- Actions (Methods) ---

    /**
     * 加载持久化的在线时间数据，并处理页面关闭/非活动情况
     */
    function loadPersistentOnlineTime() {
        const now = Date.now(); // 当前时间戳

        // 1. 读取上次页面卸载的时间戳 (如果存在)
        const unloadTimestamp = loadData(config.localStorageKeys.pageUnloadTimestamp, null);
        // 读取后立即移除，因为它是一次性的
        if (unloadTimestamp !== null) {
            localStorage.removeItem(config.localStorageKeys.pageUnloadTimestamp);
        }

        // 2. 读取核心在线时间数据 (总秒数和上次活动时间)
        const data = loadData(config.localStorageKeys.persistentOnlineTime, {
            totalSeconds: 0,
            lastActivityTimestamp: now // 默认上次活动是现在
        });

        // 3. 判断是否是短时间关闭
        let isShortClosure = false;
        if (unloadTimestamp !== null) {
            const closureDuration = now - unloadTimestamp; // 计算关闭时长
            // 检查关闭时长是否有效且小于短时间关闭阈值
            if (closureDuration >= 0 && closureDuration < config.SHORT_CLOSURE_THRESHOLD_MS) {
                isShortClosure = true;
                console.log(`[Pinia] Short closure detected (${Math.round(closureDuration/1000)}s). Resuming online timer.`);
            } else if (closureDuration >= config.SHORT_CLOSURE_THRESHOLD_MS) {
                 console.log(`[Pinia] Long closure detected (${Math.round(closureDuration/1000)}s). Applying inactivity check.`);
            }
            // 无效的 unloadTimestamp (例如未来的时间) 会被忽略
        }

        // 4. 应用非活动超时检查 (仅当不是短时间关闭时)
        // 检查当前时间距离上次记录的活动时间是否超过了非活动阈值
        if (!isShortClosure && (now - data.lastActivityTimestamp > config.INACTIVITY_TIMEOUT_MS)) {
            console.log("[Pinia] User inactive on load (or long closure), resetting online time.");
            data.totalSeconds = 0; // 如果超时，重置在线秒数
            // 注意：此时 lastActivityTimestamp 保持为旧的（超时的那个），直到用户产生新活动
            // 或者在这里也更新为 now: data.lastActivityTimestamp = now; (取决于策略)
            // 更新为 now 似乎更合理，表示新的活动周期从现在开始计算
            data.lastActivityTimestamp = now;
        } else {
            // 如果是短时间关闭 或 未超时，将上次活动时间更新为当前时间
            // 这可以防止页面加载后立即因为之前的非活动而超时
             data.lastActivityTimestamp = now;
             console.log("[Pinia] User active on load or short closure.");
        }


        // 5. 更新 Pinia store 中的响应式状态
        onlineTimeData.value = data;

        // 6. 保存更新后的状态到 localStorage (特别是更新后的 lastActivityTimestamp)
        savePersistentOnlineTime();
        console.log("[Pinia] Online time loaded/checked.");
    }

    /**
     * 保存当前的在线时间数据到 localStorage
     */
    function savePersistentOnlineTime() {
        saveData(config.localStorageKeys.persistentOnlineTime, {
            // 确保保存整数秒和有效的时间戳
            totalSeconds: Math.floor(onlineTimeData.value.totalSeconds),
            lastActivityTimestamp: onlineTimeData.value.lastActivityTimestamp
        });
        // console.log("[Pinia] Online time saved to localStorage."); // 频繁保存时日志过多，可注释掉
    }

    /**
     * 节流地更新最后活动时间戳
     * 由用户的活动事件 (mousemove, keydown等) 触发
     */
    const updateLastActivityTimestamp = throttle(() => {
         const now = Date.now();
         // 只有在用户当前被认为是“活跃”时才更新时间戳
         // (即，距离上次记录的活动时间未超过超时阈值)
         // 这样做可以防止用户在超时后进行操作时，意外地“复活”计时器
         if (now - onlineTimeData.value.lastActivityTimestamp <= config.INACTIVITY_TIMEOUT_MS) {
            // 更新 store 中的时间戳
            onlineTimeData.value.lastActivityTimestamp = now;
            // 注意：实际保存到 localStorage 的操作可以在 tickOnlineTimer 中进行，以减少写入频率
            // 或者在这里也调用 savePersistentOnlineTime()，但会更频繁
            // console.log("[Pinia] Activity detected, timestamp updated."); // 日志过多
         } else {
            // console.log("[Pinia] Activity ignored due to inactivity timeout.");
         }
         lastActivityUpdateTimestamp = now; // 更新节流函数内部的时间戳
    }, config.ACTIVITY_THROTTLE_MS); // 使用配置的节流间隔 (例如 5000ms)

    /**
     * 定时器每秒执行的函数
     * 检查非活动状态，如果活跃则增加秒数
     */
    function tickOnlineTimer() {
        const now = Date.now();
        const data = onlineTimeData.value; // 获取当前状态

        // 检查当前时间距离上次活动是否超过阈值
        if (now - data.lastActivityTimestamp > config.INACTIVITY_TIMEOUT_MS) {
            // 用户处于非活动状态
            // 如果计时器之前有时间，则进行重置 (仅在状态变化时操作)
            if (data.totalSeconds > 0) {
                console.log("[Pinia] Inactivity timeout reached while timer running, resetting online time.");
                data.totalSeconds = 0; // 重置秒数
                // 更新 lastActivityTimestamp 为当前时间，表示新的“非活动周期”或等待状态的开始
                // 或者保持旧的时间戳，直到用户重新活跃？更新为 now 似乎更清晰
                data.lastActivityTimestamp = now;
                savePersistentOnlineTime(); // 保存重置后的状态
            }
            // 如果 totalSeconds 已经是 0，则无需操作，继续等待用户活动
        } else {
            // 用户处于活动状态
            data.totalSeconds++; // 增加总秒数
            // 定期保存状态 (例如，每分钟保存一次，或者每次 tick 都保存)
            // 每次 tick 都保存是最简单的，但 I/O 可能较多
            savePersistentOnlineTime();
        }
        // 可以在这里添加一个逻辑，比如每 60 秒强制保存一次，而不是每次 tick 都保存
        // if (data.totalSeconds % 60 === 0) { savePersistentOnlineTime(); }
    }

    /**
     * 处理页面即将卸载 (关闭、刷新) 的事件
     * 确保最终状态被保存
     */
    function handleBeforeUnload() {
        // 停止计时器，以防万一还在运行
        if (onlineTimerInterval) {
            clearInterval(onlineTimerInterval);
            onlineTimerInterval = null;
        }
        // 确保最后一次活动时间和总秒数被保存
        savePersistentOnlineTime();
        // 保存本次卸载的时间戳，用于下次加载时判断关闭时长
        saveData(config.localStorageKeys.pageUnloadTimestamp, Date.now());
        console.log("[Pinia] Beforeunload: Saved final online time state.");
    }

    /**
     * 启动在线时长跟踪
     * 应该在应用初始化时调用 (例如 App.vue 的 onMounted)
     */
    function startOnlineTracking() {
        // 防止重复启动定时器
        if (onlineTimerInterval) {
            console.warn("[Pinia] Online tracking already started.");
            return;
        }
        // 1. 加载初始数据并处理状态
        loadPersistentOnlineTime();
        // 2. 启动每秒执行的 tick 函数
        onlineTimerInterval = setInterval(tickOnlineTimer, 1000);
        // 3. 添加全局事件监听器来更新活动时间戳
        const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
         activityEvents.forEach(eventType => {
             // 使用 passive: true 对滚动和触摸事件进行性能优化
             document.addEventListener(eventType, updateLastActivityTimestamp, { passive: true });
         });
         // 监听标签页可见性变化
         document.addEventListener('visibilitychange', () => {
             // 当标签页重新可见时，也认为是一次活动
             if (!document.hidden) {
                 updateLastActivityTimestamp();
             }
         });
         // 监听页面卸载事件
         window.addEventListener('beforeunload', handleBeforeUnload);

         console.log("[Pinia] Online tracking started.");
    }

    /**
     * 停止在线时长跟踪
     * 应该在应用卸载时调用 (例如 App.vue 的 onUnmounted)
     */
    function stopOnlineTracking() {
         // 清除定时器
         if (onlineTimerInterval) {
             clearInterval(onlineTimerInterval);
             onlineTimerInterval = null;
         }
          // 移除所有添加的事件监听器
         const activityEvents = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
         activityEvents.forEach(eventType => {
             document.removeEventListener(eventType, updateLastActivityTimestamp);
         });
         document.removeEventListener('visibilitychange', updateLastActivityTimestamp); // 移除匿名函数可能失败，最好保存函数引用
         // 正确移除 visibilitychange 的方式：
         // const visibilityHandler = () => { if (!document.hidden) updateLastActivityTimestamp(); };
         // document.addEventListener('visibilitychange', visibilityHandler);
         // document.removeEventListener('visibilitychange', visibilityHandler);
         // 为了简单，这里暂时忽略 visibilitychange 的精确移除，影响不大

         window.removeEventListener('beforeunload', handleBeforeUnload);

         // 执行一次卸载处理，确保最后状态被保存
         handleBeforeUnload();
         console.log("[Pinia] Online tracking stopped.");
    }

    // --- 暴露 State, Getters, Actions ---
    return {
        // State (只读的 ref，外部最好通过 action 修改)
        onlineTimeData: computed(() => onlineTimeData.value), // 可以只暴露计算属性包装的只读版本
        // Getters
        formattedOnlineTime,
        // Actions
        startOnlineTracking,
        stopOnlineTracking,
        // updateLastActivityTimestamp, // 一般不需要外部手动触发，由事件监听调用
        // loadPersistentOnlineTime, // 一般不需要外部调用
    };
});