<!-- src/views/CourseTrackerSection.vue -->
<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-book-reader icon-gradient"></i> 在线课程追踪</h1>
      <p>选择、添加或管理你的网课进度。</p>
    </header>

    <!-- 整体布局容器 -->
    <div class="course-tracker-layout">

      <!-- 左侧：课程列表与操作 -->
      <div class="card course-list-sidebar">
        <div class="sidebar-header">
          <h2><i class="fas fa-list-ul"></i> 我的课程</h2>
          <button @click="openAddCourseModal" class="btn btn-primary btn-sm btn-add-course" title="添加新课程">
            <i class="fas fa-plus"></i> 添加
          </button>
        </div>
        <!-- 列表加载状态 -->
        <div v-if="isLoading" class="loading-indicator small">加载列表中...</div>
        <!-- 列表加载错误 -->
        <div v-else-if="error && courses.length === 0" class="error-message small">{{ error }}</div>
        <!-- 列表为空 -->
        <div v-else-if="courses.length === 0" class="placeholder-text small">暂无课程，请添加。</div>
        <!-- 课程列表 -->
        <ul v-else class="course-select-list">
          <li
            v-for="course in courses"
            :key="course.id"
            :class="{ active: course.id === activeCourseId }"
            @click="selectCourse(course.id)"
            class="course-list-item"
          >
            <span class="course-item-name">{{ course.name }}</span>
            <div class="course-item-actions">
                 <button @click.stop="confirmDeleteCourse(course)" class="btn btn-icon btn-tiny btn-danger" title="删除"> <i class="fas fa-trash"></i> </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- 右侧：当前课程详情与进度 -->
      <div class="course-details-main">
          <!-- 未选择课程时的提示 -->
          <div v-if="!activeCourse && courses.length > 0 && !isLoading" class="placeholder-text card">
              请从左侧选择一个课程查看详情。
          </div>
          <!-- 激活课程的详情卡片 -->
          <div v-else-if="activeCourse" class="card course-tracker-card improved-layout">
              <!-- 卡片头部：课程信息与编辑 -->
              <div class="card-header">
                <!-- 显示模式 -->
                <div v-if="!isEditingInfo" class="course-display-info">
                  <h2 id="course-name">{{ activeCourse.name }}</h2>
                  <a v-if="activeCourse.link" :href="activeCourse.link" target="_blank" class="resource-link" title="访问课程"> <i class="fas fa-external-link-alt"></i> {{ activeCourse.link }} </a>
                   <p v-else class="text-muted small">未设置链接</p>
                   <!-- 显示分类和状态 -->
                   <span v-if="activeCourse.category" class="course-category-badge">{{ activeCourse.category }}</span>
                   <span class="course-status-badge" :class="getStatusClass(activeCourse.status)">{{ getStatusDisplayName(activeCourse.status) }}</span>
                   <!-- 显示最后更新时间 -->
                   <span v-if="activeCourse.lastUpdated" class="last-updated-info"> 上次更新: {{ formatTimestamp(activeCourse.lastUpdated) }} </span>
                </div>
                <!-- 编辑模式 -->
                <div v-else class="course-edit-info">
                  <input type="text" v-model="editableCourseName" placeholder="课程名称" class="form-control form-control-sm mb-1">
                  <input type="url" v-model="editableCourseLink" placeholder="课程链接 (https://...)" class="form-control form-control-sm mb-1">
                   <select v-model="editableCourseCategory" class="form-control form-control-sm mb-1">
                      <option value="">-- 无分类 --</option>
                      <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
                   </select>
                   <select v-model="editableCourseStatus" class="form-control form-control-sm">
                      <option v-for="status in courseStatuses" :key="status.value" :value="status.value">{{ status.text }}</option>
                   </select>
                </div>
                <!-- 编辑按钮组 -->
                <div class="header-actions">
                  <button v-if="!isEditingInfo" @click="toggleEditInfo(true)" class="btn btn-icon btn-secondary btn-sm" title="编辑课程信息" :disabled="isUpdating"> <i class="fas fa-pencil-alt"></i> </button>
                  <template v-else>
                    <button @click="saveCourseInfo" class="btn btn-icon btn-success btn-sm" title="保存" :disabled="isUpdating"> <i class="fas fa-check"></i> </button>
                    <button @click="toggleEditInfo(false)" class="btn btn-icon btn-light btn-sm" title="取消" :disabled="isUpdating"> <i class="fas fa-times"></i> </button>
                  </template>
                </div>
              </div>

              <!-- 卡片主体：进度 -->
              <div class="card-body">
                <div class="course-progress-section">
                  <h3><i class="fas fa-tasks"></i> 学习进度</h3>
                  <div class="progress-controls">
                    <div class="input-group">
                      <label for="course-total-lessons-el">总节数:</label>
                      <!-- 绑定本地 ref, @change 触发更新 -->
                      <input type="number" v-model.number="localTotalLessons" @change="updateTotalLessons" id="course-total-lessons-el" class="input-narrow" min="1" placeholder="总数" :disabled="isUpdating">
                    </div>
                    <div class="input-group completed-group">
                      <label for="course-completed-lessons-el">已完成:</label>
                      <div class="completed-input-actions">
                         <button @click="decrementCompleted" class="btn btn-icon btn-secondary btn-tiny" :disabled="localCompletedLessons <= 0 || isUpdating"> <i class="fas fa-minus"></i> </button>
                         <!-- 绑定本地 ref, @change 触发更新 -->
                         <input type="number" v-model.number="localCompletedLessons" @change="updateCompletedLessons" id="course-completed-lessons-el" class="input-narrow" min="0" :max="localTotalLessons" placeholder="完成数" :disabled="isUpdating">
                         <button @click="incrementCompleted" class="btn btn-icon btn-secondary btn-tiny" :disabled="localCompletedLessons >= localTotalLessons || isUpdating"> <i class="fas fa-plus"></i> </button>
                      </div>
                    </div>
                  </div>
                   <!-- 进度条与百分比 -->
                   <div class="progress-bar-container">
                      <div class="progress-bar"> <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div> </div>
                      <span class="progress-percentage">{{ progressPercentage }}%</span>
                   </div>
                </div>
                <!-- 笔记区已移除 -->
              </div>
          </div>
          <!-- 初始加载或列表为空时的占位符 -->
          <div v-if="isLoading && courses.length === 0" class="loading-indicator card">加载课程数据中...</div>
          <div v-else-if="!isLoading && courses.length === 0" class="placeholder-text card">暂无课程数据，请点击左上角“添加”按钮创建。</div>
      </div>

    </div> <!-- end .course-tracker-layout -->

    <!-- 添加课程模态框 -->
    <div v-if="showAddCourseModal" class="modal-overlay" @click.self="closeAddCourseModal">
      <div class="modal-content card">
        <h2>添加新课程</h2>
        <form @submit.prevent="submitNewCourse">
          <div class="form-group"> <label for="new-course-name">课程名称:</label> <input type="text" v-model="newCourseForm.name" id="new-course-name" required class="form-control"> </div>
          <div class="form-group"> <label for="new-course-link">课程链接 (可选):</label> <input type="url" v-model="newCourseForm.link" id="new-course-link" class="form-control"> </div>
          <div class="form-group"> <label for="new-course-total">总节数:</label> <input type="number" v-model.number="newCourseForm.totalLessons" id="new-course-total" required min="1" class="form-control"> </div>
          <div class="form-group"> <label for="new-course-category">分类 (可选):</label> <select v-model="newCourseForm.category" id="new-course-category" class="form-control"> <option value="">-- 无分类 --</option> <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option> </select> </div>
          <div class="modal-actions"> <span v-if="createError" class="error-message small">{{ createError }}</span> <button type="button" @click="closeAddCourseModal" class="btn btn-secondary">取消</button> <button type="submit" class="btn btn-primary" :disabled="isCreating"> {{ isCreating ? '添加中...' : '确认添加' }} </button> </div>
        </form>
      </div>
    </div>

  </div>
</template>

<script setup>
import { ref, watch, computed, reactive, onUnmounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useCourseStore } from '@/stores/courseStore.js';
import { formatTimestamp } from '@/utils/formatters.js';
import config from '@/config.js';

// Store
const courseStore = useCourseStore();
const {
  courses, activeCourseId, isLoading, isUpdating, isCreating, isDeleting,
  error, activeCourse, progressPercentage,
} = storeToRefs(courseStore);

// 本地状态 - 编辑课程信息
const isEditingInfo = ref(false);
const editableCourseName = ref('');
const editableCourseLink = ref('');
const editableCourseCategory = ref('');
const editableCourseStatus = ref('NOT_STARTED');

// 本地状态 - 添加课程模态框
const showAddCourseModal = ref(false);
const newCourseForm = reactive({ name: '', link: '', totalLessons: 10, category: '' });
const createError = ref(null);

// 本地状态 - 进度输入框 v-model
const localTotalLessons = ref(1); // 初始化默认值
const localCompletedLessons = ref(0); // 初始化默认值
const userModifiedLessons = ref(false); // 标记是否用户修改

// 获取配置/常量
const availableCategories = computed(() => config.courseCategories || ['默认分类', '常识判断', '言语理解', '数量关系', '判断推理', '资料分析', '申论','其他']);
const courseStatuses = ref([
    { value: 'NOT_STARTED', text: '未开始' }, { value: 'IN_PROGRESS', text: '进行中' },
    { value: 'COMPLETED', text: '已完成' }, { value: 'ON_HOLD', text: '已搁置' },
]);

// --- 监听器 ---
// 监听 activeCourse 的变化，更新本地进度 ref
watch(activeCourse, (newCourse) => {
  if (newCourse) {
      // 只有在非用户主动修改的情况下，才用 store 的值覆盖本地值
      if (!userModifiedLessons.value) {
          localTotalLessons.value = newCourse.totalLessons ?? 1;
          localCompletedLessons.value = newCourse.completedLessons ?? 0;
      }
       // 切换课程时退出编辑模式
      if (activeCourseId.value !== (newCourse.id ?? null)) { // 检查ID是否真的变了
            isEditingInfo.value = false;
      }
  } else {
      // 如果没有激活课程，重置本地进度 ref
      localTotalLessons.value = 1;
      localCompletedLessons.value = 0;
      isEditingInfo.value = false; // 也退出编辑模式
  }
   // 重置用户修改标记 (放在 watch 回调结束前)
   userModifiedLessons.value = false;

}, { deep: true, immediate: true }); // immediate: true 确保初始加载时也执行

// 监听 isCreating 状态
watch(isCreating, (newValue, oldValue) => {
    if (oldValue === true && newValue === false && !createError.value) closeAddCourseModal();
});

// --- 方法 ---
function selectCourse(id) { courseStore.setActiveCourse(id); }

function toggleEditInfo(editing) {
  if (!activeCourse.value && editing) return;
  isEditingInfo.value = editing;
  if (editing) {
    editableCourseName.value = activeCourse.value?.name || '';
    editableCourseLink.value = activeCourse.value?.link || '';
    editableCourseCategory.value = activeCourse.value?.category || '';
    editableCourseStatus.value = activeCourse.value?.status || 'NOT_STARTED';
  }
}

async function saveCourseInfo() {
  if (!activeCourse.value || !editableCourseName.value.trim()) { alert('课程名称不能为空！'); return; }
  const updates = {
    name: editableCourseName.value.trim(),
    link: editableCourseLink.value.trim() || null,
    category: editableCourseCategory.value || null,
    status: editableCourseStatus.value,
  };
  const success = await courseStore.updateCourseData(activeCourse.value.id, updates);
  if (success) isEditingInfo.value = false;
  else alert(`更新课程信息失败: ${error.value || '未知错误'}`);
}

// 由 @change 事件触发更新 TotalLessons
function updateTotalLessons() {
  if (!activeCourse.value) return;
  userModifiedLessons.value = true;
  let newTotal = Math.max(1, parseInt(localTotalLessons.value, 10) || 1);
  localTotalLessons.value = newTotal; // 更新本地显示
  const updates = { totalLessons: newTotal };
  if (localCompletedLessons.value > newTotal) {
       localCompletedLessons.value = newTotal;
       updates.completedLessons = newTotal;
  }
  courseStore.updateCourseData(activeCourse.value.id, updates)
      .finally(() => { setTimeout(() => userModifiedLessons.value = false, 100); });
}

// 由 @change 事件触发更新 CompletedLessons
function updateCompletedLessons() {
  if (!activeCourse.value) return;
  userModifiedLessons.value = true;
  let newCompleted = Math.max(0, parseInt(localCompletedLessons.value, 10) || 0);
  newCompleted = Math.min(newCompleted, localTotalLessons.value); // 使用本地 total 校验
  localCompletedLessons.value = newCompleted; // 更新本地显示
  courseStore.updateCourseData(activeCourse.value.id, { completedLessons: newCompleted })
      .finally(() => { setTimeout(() => userModifiedLessons.value = false, 100); });
}

// 按钮 +/-
function incrementCompleted() {
    if (!activeCourse.value || localCompletedLessons.value >= localTotalLessons.value) return;
    userModifiedLessons.value = true;
    localCompletedLessons.value++;
    courseStore.updateCourseData(activeCourse.value.id, { completedLessons: localCompletedLessons.value })
        .finally(() => { setTimeout(() => userModifiedLessons.value = false, 100); });
}
function decrementCompleted() {
    if (!activeCourse.value || localCompletedLessons.value <= 0) return;
    userModifiedLessons.value = true;
    localCompletedLessons.value--;
    courseStore.updateCourseData(activeCourse.value.id, { completedLessons: localCompletedLessons.value })
        .finally(() => { setTimeout(() => userModifiedLessons.value = false, 100); });
}

// 添加课程模态框控制
function openAddCourseModal() {
    newCourseForm.name = ''; newCourseForm.link = ''; newCourseForm.totalLessons = 10; newCourseForm.category = '';
    createError.value = null; showAddCourseModal.value = true;
}
function closeAddCourseModal() { showAddCourseModal.value = false; createError.value = null; }
async function submitNewCourse() {
    if (!newCourseForm.name.trim() || newCourseForm.totalLessons < 1) { createError.value = "请填写有效的课程名称和总节数 (>=1)。"; return; }
    createError.value = null;
    const courseData = { name: newCourseForm.name.trim(), link: newCourseForm.link.trim() || null, totalLessons: newCourseForm.totalLessons, category: newCourseForm.category || null, };
    const createdCourse = await courseStore.addCourse(courseData);
    if (!createdCourse) createError.value = error.value || '添加课程失败，请重试。';
    // 成功后 watcher isCreating 会自动关闭
}

// 删除课程
function confirmDeleteCourse(course) {
    if (confirm(`确定要删除课程 "${course.name}" 吗？此操作无法撤销。`)) { courseStore.deleteCourse(course.id); }
}

// 辅助函数：获取状态显示名称和样式类
function getStatusDisplayName(statusValue) { const status = courseStatuses.value.find(s => s.value === statusValue); return status ? status.text : statusValue; }
function getStatusClass(statusValue) { return `status-${statusValue?.toLowerCase().replace('_', '-') || 'unknown'}`; }

</script>

<style scoped>
/* --- 整体布局 --- */
.course-tracker-layout{display:grid;grid-template-columns:1fr;gap:1.5rem}
@media (min-width:992px){.course-tracker-layout{grid-template-columns:280px 1fr}}

/* --- 左侧课程列表 --- */
.course-list-sidebar{border-right:1px solid var(--border-color-light,#eee);padding:1rem;display:flex;flex-direction:column;height:calc(100vh - 150px);overflow-y:auto} /* 调整高度计算 */
.sidebar-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border-color-light,#eee)}
.sidebar-header h2{font-size:1.1em;margin:0;display:flex;align-items:center;gap:.5em;color:var(--primary-dark)}
.course-select-list{list-style:none;padding:0;margin:0;flex-grow:1}
.course-list-item{display:flex;justify-content:space-between;align-items:center;padding:.7rem .5rem;margin-bottom:.3rem;border-radius:6px;cursor:pointer;transition:background-color .2s ease, border-color .2s ease;border:1px solid transparent} /* 添加 border-color 过渡 */
.course-list-item:hover{background-color:#f8f9fa}
.course-list-item.active{background-color:var(--primary-light,#e4e9f5);font-weight:600;color:var(--primary-dark);border-color:var(--primary-color)}
.course-item-name{flex-grow:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:.5rem}
.course-item-actions{display:flex;align-items:center;gap:.3rem;flex-shrink:0;opacity:0;transition: opacity 0.2s ease;} /* 添加过渡 */
.course-list-item:hover .course-item-actions,.course-list-item.active .course-item-actions{opacity:1}
.btn-danger{color:var(--danger-color)}
.btn-danger:hover{background-color:rgba(var(--danger-rgb, 220, 53, 69),.1)} /* 提供默认 danger-rgb */

/* --- 右侧课程详情 --- */
.course-details-main{}
.course-tracker-card.improved-layout{border-left:4px solid var(--secondary-color);display:flex;flex-direction:column} /* 改回 secondary color */
.card-header{display:flex;justify-content:space-between;align-items:flex-start;gap:1rem;padding-bottom:1rem;margin-bottom:1rem;border-bottom:1px solid var(--border-color-light,#eee)}
.course-display-info,.course-edit-info{flex-grow:1}
.course-display-info h2{margin-bottom:.2rem;font-size:1.3em;color:var(--primary-dark)}
.course-display-info .resource-link{display:block;font-size:.9em;color:var(--primary-color);margin-bottom:.5rem;word-break:break-all}
.course-display-info .resource-link i{margin-right:.3em}
.text-muted.small{font-size:.85em;color:var(--text-light);font-style:italic}
.course-category-badge{display:inline-block;background-color:var(--info-light,#e0f7fa);color:var(--info-dark,#006064);padding:.1em .6em;border-radius:10px;font-size:.75em;margin-right:.5em;vertical-align:middle}
.course-status-badge{display:inline-block;padding:.1em .6em;border-radius:10px;font-size:.75em;margin-right:.5em;vertical-align:middle;border:1px solid;font-weight:500}
.status-not-started{color:#6c757d;border-color:#6c757d;background-color:#f8f9fa}
.status-in-progress{color:#0d6efd;border-color:#0d6efd;background-color:#e7f1ff}
.status-completed{color:#198754;border-color:#198754;background-color:#d1e7dd}
.status-on-hold{color:#ffc107;border-color:#ffc107;background-color:#fff3cd}
.status-unknown{color:#dc3545;border-color:#dc3545;background-color:#f8d7da}
.last-updated-info{font-size:.8em;color:var(--text-light);display:block;margin-top:.5rem}
.course-edit-info input,.course-edit-info select{margin-bottom:.5rem}
.header-actions{flex-shrink:0;display:flex;gap:.5rem}
.card-body{display:grid;grid-template-columns:1fr;gap:2rem}

.course-progress-section{background-color:#f8f9fa;padding:1rem;border-radius:8px;border:1px solid var(--border-color-light,#eee)}
.course-progress-section h3{font-size:1.1em;margin-bottom:1rem;color:var(--primary-dark);display:flex;align-items:center;gap:.5em;border-bottom:1px solid var(--border-color-light,#eee);padding-bottom:.5rem}
.progress-controls{display:flex;flex-direction:column;gap:1rem;margin-bottom:1rem}
.input-group{display:flex;align-items:center;gap:.5rem;justify-content:space-between}
.input-group label{font-size:.9em;color:var(--text-light);font-weight:500;white-space:nowrap;margin-right:.5em}
.input-narrow{width:60px;padding:.3em .5em;font-size:.95em;text-align:center}
.completed-group .completed-input-actions{display:flex;align-items:center;gap:.3rem}
.btn-tiny{padding:.2em .4em!important;font-size:.8em!important;line-height:1!important;min-width:auto!important}

.progress-bar-container{display:flex;align-items:center;gap:.8rem;margin-top:.5rem}
.progress-bar{flex-grow:1;height:10px;background-color:#e9ecef;border-radius:5px;overflow:hidden}
.progress-fill{height:100%;background:var(--gradient-primary);border-radius:5px;transition:width .5s ease;width:0%}
.progress-percentage{font-size:.9em;font-weight:600;color:var(--primary-dark);flex-shrink:0}

/* --- 模态框样式 --- */
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background-color:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:1000}
.modal-content{background-color:#fff;padding:2rem;border-radius:8px;min-width:300px;max-width:500px;box-shadow:0 5px 15px rgba(0,0,0,.2)}
.modal-content h2{margin-top:0;margin-bottom:1.5rem}
.modal-actions{margin-top:1.5rem;display:flex;justify-content:flex-end;align-items:center;gap:.5rem}
.modal-actions .error-message{margin-right:auto;color:var(--danger-color);font-size:.9em}
.modal-content .form-group{margin-bottom:1rem}
.modal-content .form-control{width:100%;padding:.5rem .8rem;font-size:1em;border:1px solid var(--border-color);border-radius:6px;box-sizing:border-box}

/* --- 通用/占位符/按钮 --- */
.loading-indicator,.error-message,.placeholder-text{text-align:center;padding:2rem;color:var(--text-light)}
.error-message{color:var(--danger-color)}
.placeholder-text{font-style:italic}
.loading-indicator.small,.error-message.small,.placeholder-text.small{font-size:.9em;padding:1rem}

.btn-icon{background:0 0;border:none;cursor:pointer;padding:.4em;line-height:1;border-radius:50%;width:28px;height:28px;display:inline-flex;align-items:center;justify-content:center;transition:background-color .2s ease}
.btn-icon.btn-sm{width:24px;height:24px;font-size:.8em}
.btn-icon.btn-tiny{width:20px;height:20px;font-size:.7em}
.btn-icon.btn-secondary{color:var(--text-light)}
.btn-icon.btn-secondary:hover{background-color:rgba(0,0,0,.05)}
.btn-icon.btn-success{color:var(--success-color)}
.btn-icon.btn-success:hover{background-color:rgba(var(--success-rgb, 25, 135, 84),.1)} /* 提供默认 success-rgb */
.btn-icon.btn-light{color:#6c757d}
.btn-icon.btn-light:hover{background-color:rgba(0,0,0,.05)}
.btn-icon:disabled{opacity:.5;cursor:not-allowed}

.form-control-sm{padding:.3rem .6rem;font-size:.9em;border-radius:4px;border:1px solid var(--border-color);width:100%;box-sizing:border-box}
.mb-1{margin-bottom:.5rem}

.section-header i.icon-gradient{background:var(--gradient-primary);-webkit-background-clip:text;background-clip:text;color:transparent;font-size:1.5em}

/* 响应式 */
@media (max-width:991px){.course-tracker-layout{grid-template-columns:1fr}.course-list-sidebar{height:auto;max-height:40vh}}

</style>