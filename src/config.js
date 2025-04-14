// src/config.js - 正确写法
export default { // <--- 使用 export default
    estimatedRegDate: '2025-10-15',
    estimatedExamDate: '2025-11-25',
    localStorageKeys: {
      progress: 'dxcGwyPlanProgress_v2',
      notes: 'dxcGwyPlanNotes_v2',
      course: 'dxcGwyCourseTracker_v2',
      pomodoro: 'dxcGwyPomodoroSettings_v2',
      summary: 'dxcGwySummaryData_v1',
      errorLog: 'dxcGwyErrorLog_v1',
      knowledgeBase: 'dxcGwyKnowledgeBase_v1',
      studyLog: 'dxcGwyStudyLog_v1',
      persistentOnlineTime: 'dxcPersistentOnlineTime_v1',
      pageUnloadTimestamp: 'dxcPageUnloadTimestamp_v1',
      studyGoals: 'dxcGwyStudyGoals_v1', // <<< 添加这一行
    },
    pomodoroDefaults: { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 },
    errorLogSubjects: [
      "言语理解与表达", "判断推理", "数量关系", "资料分析", "常识判断",
      "申论-归纳概括", "申论-提出对策", "申论-综合分析", "申论-贯彻执行",
      "申论-文章写作", "其他"
    ],
    knowledgeBaseCategories: [
      "时事政治", "法律常识", "人文历史", "科学技术", "地理国情",
      "申论素材-名言警句", "申论素材-理论政策", "申论素材-案例事例",
      "行测技巧", "其他"
    ],
    INACTIVITY_TIMEOUT_MS: 15 * 60 * 1000,
    ACTIVITY_THROTTLE_MS: 5 * 1000,
    SHORT_CLOSURE_THRESHOLD_MS: 2 * 60 * 1000,
    SAVE_THROTTLE_MS: 1500, // 笔记节流保存间隔
    ACTIVITY_PING_INTERVAL_SECONDS: 30 // 活动心跳间隔（秒）
  };