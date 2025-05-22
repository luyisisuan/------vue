<!-- src/views/CourseTrackerSection.vue -->
<template>
  <div class="gov-style-wrapper">
    <header class="section-header">
      <h1><i class="fas fa-book-reader header-icon"></i> 在线课程追踪</h1>
      <p>选择、添加或管理你的网课进度。</p>
    </header>

    <!-- 整体布局容器 -->
    <div class="course-tracker-layout">

      <!-- 左侧：课程列表与操作 -->
      <div class="card course-list-sidebar">
        <div class="sidebar-header">
          <h2><i class="fas fa-list-ul card-title-icon"></i> 我的课程</h2>
          <button @click="openAddCourseModal" class="btn btn-primary btn-sm btn-add-course" title="添加新课程">
            <i class="fas fa-plus"></i> 添加
          </button>
        </div>
        <div v-if="isLoading && courses.length === 0" class="loading-indicator small">
            <div class="spinner-small"></div> 加载课程...
        </div>
        <div v-else-if="error && courses.length === 0" class="error-message small">{{ error }}</div>
        <div v-else-if="courses.length === 0" class="placeholder-text small">暂无课程，请添加。</div>
        <ul v-else class="course-select-list">
          <li
            v-for="course in courses"
            :key="course.id"
            :class="{ active: course.id === activeCourseId }"
            @click="selectCourse(course.id)"
            class="course-list-item"
            tabindex="0"
            @keydown.enter.space="selectCourse(course.id)"
          >
            <span class="course-item-name">{{ course.name }}</span>
            <div class="course-item-actions">
                 <button @click.stop="confirmDeleteCourse(course)" class="btn btn-icon btn-tiny btn-delete" title="删除课程"> <i class="fas fa-trash"></i> </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- 右侧：当前课程详情与进度 -->
      <div class="course-details-main">
          <div v-if="isLoading && activeCourseId && !activeCourse" class="loading-indicator card">
            <div class="spinner"></div> 加载课程详情...
          </div>
          <div v-else-if="!activeCourse && courses.length > 0 && !isLoading" class="placeholder-text card">
              <i class="fas fa-hand-pointer placeholder-icon"></i>
              <p>请从左侧选择一个课程查看详情。</p>
          </div>
          <div v-else-if="activeCourse" class="card course-tracker-card">
              <div class="card-header course-detail-header">
                <div v-if="!isEditingInfo" class="course-display-info">
                  <h2 id="course-name-display">{{ activeCourse.name }}</h2>
                  <a v-if="activeCourse.link" :href="activeCourse.link" target="_blank" class="course-external-link" title="访问课程"> <i class="fas fa-external-link-alt"></i> {{ activeCourse.link }} </a>
                   <p v-else class="text-muted-display small">未设置链接</p>
                   <div class="course-meta-info">
                     <span v-if="activeCourse.category" class="course-category-badge">{{ activeCourse.category }}</span>
                     <span class="course-status-badge" :class="getStatusClass(activeCourse.status)">{{ getStatusDisplayName(activeCourse.status) }}</span>
                     <span v-if="activeCourse.lastUpdated" class="last-updated-info"> <i class="fas fa-history"></i> 上次更新: {{ formatTimestamp(activeCourse.lastUpdated, 'yyyy-MM-dd HH:mm') }} </span>
                   </div>
                </div>
                <div v-else class="course-edit-info">
                  <input type="text" v-model="editableCourseName" placeholder="课程名称" class="form-control form-control-sm mb-half">
                  <input type="url" v-model="editableCourseLink" placeholder="课程链接 (https://...)" class="form-control form-control-sm mb-half">
                   <select v-model="editableCourseCategory" class="form-control form-control-sm mb-half">
                      <option value="">-- 无分类 --</option>
                      <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option>
                   </select>
                   <select v-model="editableCourseStatus" class="form-control form-control-sm">
                      <option v-for="status in courseStatuses" :key="status.value" :value="status.value">{{ status.text }}</option>
                   </select>
                </div>
                <div class="header-actions">
                  <button v-if="!isEditingInfo" @click="toggleEditInfo(true)" class="btn btn-icon btn-edit" title="编辑课程信息" :disabled="isUpdating"> <i class="fas fa-pencil-alt"></i> </button>
                  <template v-else>
                    <button @click="saveCourseInfo" class="btn btn-icon btn-save" title="保存" :disabled="isUpdating"> <i class="fas fa-check"></i> </button>
                    <button @click="toggleEditInfo(false)" class="btn btn-icon btn-cancel" title="取消" :disabled="isUpdating"> <i class="fas fa-times"></i> </button>
                  </template>
                </div>
              </div>

              <div class="card-body">
                <div class="course-progress-section">
                  <h3><i class="fas fa-tasks card-subtitle-icon"></i> 学习进度</h3>
                  <div class="progress-controls">
                    <div class="input-group">
                      <label for="course-total-lessons-el">总节数:</label>
                      <input type="number" v-model.number="localTotalLessons" @change="updateTotalLessons" id="course-total-lessons-el" class="form-control input-narrow" min="1" placeholder="总数" :disabled="isUpdating || isEditingInfo">
                    </div>
                    <div class="input-group completed-group">
                      <label for="course-completed-lessons-el">已完成:</label>
                      <div class="completed-input-actions">
                         <button @click="decrementCompleted" class="btn btn-icon btn-control" :disabled="localCompletedLessons <= 0 || isUpdating || isEditingInfo"> <i class="fas fa-minus"></i> </button>
                         <input type="number" v-model.number="localCompletedLessons" @change="updateCompletedLessons" id="course-completed-lessons-el" class="form-control input-narrow" min="0" :max="localTotalLessons" placeholder="完成数" :disabled="isUpdating || isEditingInfo">
                         <button @click="incrementCompleted" class="btn btn-icon btn-control" :disabled="localCompletedLessons >= localTotalLessons || isUpdating || isEditingInfo"> <i class="fas fa-plus"></i> </button>
                      </div>
                    </div>
                  </div>
                   <div class="progress-bar-wrapper">
                      <div class="progress-bar-container">
                          <div class="progress-fill" :style="{ width: progressPercentage + '%' }"></div>
                      </div>
                      <span class="progress-percentage-text">{{ progressPercentage.toFixed(0) }}%</span>
                   </div>
                </div>
              </div>
          </div>
          <div v-if="isLoading && courses.length === 0" class="loading-indicator card">
            <div class="spinner"></div> 加载课程数据中...
          </div>
          <div v-else-if="!isLoading && courses.length === 0" class="placeholder-text card">
            <i class="fas fa-chalkboard-teacher placeholder-icon"></i>
            <p>暂无课程数据。</p>
            <span>请点击左侧“添加”按钮创建您的第一个课程追踪。</span>
          </div>
      </div>
    </div>

    <div v-if="showAddCourseModal" class="modal-overlay" @click.self="closeAddCourseModal">
      <div class="modal-content card">
        <div class="modal-header">
            <h2><i class="fas fa-folder-plus card-title-icon"></i> 添加新课程</h2>
            <button @click="closeAddCourseModal" class="btn-close-modal" title="关闭">×</button>
        </div>
        <form @submit.prevent="submitNewCourse" class="modal-form">
          <div class="form-group"> <label for="new-course-name">课程名称 <span class="required-asterisk">*</span></label> <input type="text" v-model="newCourseForm.name" id="new-course-name" required class="form-control"> </div>
          <div class="form-group"> <label for="new-course-link">课程链接 (可选)</label> <input type="url" v-model="newCourseForm.link" id="new-course-link" class="form-control" placeholder="https://..."> </div>
          <div class="form-group"> <label for="new-course-total">总节数 <span class="required-asterisk">*</span></label> <input type="number" v-model.number="newCourseForm.totalLessons" id="new-course-total" required min="1" class="form-control"> </div>
          <div class="form-group"> <label for="new-course-category">分类 (可选)</label> <select v-model="newCourseForm.category" id="new-course-category" class="form-control"> <option value="">-- 无分类 --</option> <option v-for="cat in availableCategories" :key="cat" :value="cat">{{ cat }}</option> </select> </div>
          <div class="modal-actions">
            <span v-if="createError" class="error-message-inline">{{ createError }}</span>
            <button type="button" @click="closeAddCourseModal" class="btn btn-secondary">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="isCreating">
              <span v-if="isCreating"><i class="fas fa-spinner fa-spin"></i> 添加中...</span>
              <span v-else><i class="fas fa-check"></i> 确认添加</span>
            </button>
          </div>
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

const courseStore = useCourseStore();
const {
  courses, activeCourseId, isLoading, isUpdating, isCreating, isDeleting,
  error, activeCourse, progressPercentage,
} = storeToRefs(courseStore);

const isEditingInfo = ref(false);
const editableCourseName = ref('');
const editableCourseLink = ref('');
const editableCourseCategory = ref('');
const editableCourseStatus = ref('NOT_STARTED');

const showAddCourseModal = ref(false);
const newCourseForm = reactive({ name: '', link: '', totalLessons: 10, category: '' });
const createError = ref(null);

const localTotalLessons = ref(1);
const localCompletedLessons = ref(0);
let lessonUpdateTimeout = null; // For debouncing lesson updates

const availableCategories = computed(() => config.courseCategories || ['公考理论', '模块刷题', '面试指导', '时政学习', '其他']);
const courseStatuses = ref([
    { value: 'NOT_STARTED', text: '未开始' }, { value: 'IN_PROGRESS', text: '进行中' },
    { value: 'COMPLETED', text: '已完成' }, { value: 'ON_HOLD', text: '已搁置' },
]);

watch(activeCourse, (newCourse) => {
  if (newCourse) {
      localTotalLessons.value = newCourse.totalLessons ?? 1;
      localCompletedLessons.value = newCourse.completedLessons ?? 0;
      if (isEditingInfo.value && activeCourseId.value !== (newCourse.id ?? null)) {
            isEditingInfo.value = false; // Cancel edit if course changes
      }
  } else {
      localTotalLessons.value = 1;
      localCompletedLessons.value = 0;
      isEditingInfo.value = false;
  }
}, { deep: true, immediate: true });

watch(isCreating, (newValue, oldValue) => {
    if (oldValue === true && newValue === false && !createError.value) closeAddCourseModal();
});

function selectCourse(id) {
  if (isEditingInfo.value) { // Prevent changing course while editing info
    if (!confirm("正在编辑课程信息，切换将丢失未保存的更改。确定要切换吗？")) return;
  }
  isEditingInfo.value = false; // Always exit edit mode when selecting a new course
  courseStore.setActiveCourse(id);
}

function toggleEditInfo(editing) {
  if (!activeCourse.value && editing) return;
  isEditingInfo.value = editing;
  if (editing && activeCourse.value) {
    editableCourseName.value = activeCourse.value.name || '';
    editableCourseLink.value = activeCourse.value.link || '';
    editableCourseCategory.value = activeCourse.value.category || '';
    editableCourseStatus.value = activeCourse.value.status || 'NOT_STARTED';
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

function debouncedUpdateStore(courseId, updates) {
    clearTimeout(lessonUpdateTimeout);
    lessonUpdateTimeout = setTimeout(async () => {
        await courseStore.updateCourseData(courseId, updates);
    }, 700); // 700ms debounce time
}

function updateTotalLessons() {
  if (!activeCourse.value || isEditingInfo.value) return;
  let newTotal = Math.max(1, parseInt(localTotalLessons.value, 10) || 1);
  localTotalLessons.value = newTotal;
  const updates = { totalLessons: newTotal };
  if (localCompletedLessons.value > newTotal) {
       localCompletedLessons.value = newTotal;
       updates.completedLessons = newTotal;
  }
  debouncedUpdateStore(activeCourse.value.id, updates);
}

function updateCompletedLessons() {
  if (!activeCourse.value || isEditingInfo.value) return;
  let newCompleted = Math.max(0, parseInt(localCompletedLessons.value, 10) || 0);
  newCompleted = Math.min(newCompleted, localTotalLessons.value);
  localCompletedLessons.value = newCompleted;
  debouncedUpdateStore(activeCourse.value.id, { completedLessons: newCompleted });
}

function incrementCompleted() {
    if (!activeCourse.value || localCompletedLessons.value >= localTotalLessons.value || isEditingInfo.value) return;
    localCompletedLessons.value++;
    debouncedUpdateStore(activeCourse.value.id, { completedLessons: localCompletedLessons.value });
}
function decrementCompleted() {
    if (!activeCourse.value || localCompletedLessons.value <= 0 || isEditingInfo.value) return;
    localCompletedLessons.value--;
    debouncedUpdateStore(activeCourse.value.id, { completedLessons: localCompletedLessons.value });
}

function openAddCourseModal() {
    newCourseForm.name = ''; newCourseForm.link = ''; newCourseForm.totalLessons = 10; newCourseForm.category = '';
    createError.value = null; showAddCourseModal.value = true;
}
function closeAddCourseModal() { showAddCourseModal.value = false; createError.value = null; }
async function submitNewCourse() {
    if (!newCourseForm.name.trim() || newCourseForm.totalLessons < 1) { createError.value = "请填写有效的课程名称和总节数 (>=1)。"; return; }
    createError.value = null;
    const courseData = { name: newCourseForm.name.trim(), link: newCourseForm.link.trim() || null, totalLessons: newCourseForm.totalLessons, category: newCourseForm.category || null, status: 'NOT_STARTED' };
    const createdCourse = await courseStore.addCourse(courseData);
    if (!createdCourse) createError.value = error.value || '添加课程失败，请重试。';
}

function confirmDeleteCourse(course) {
    if (confirm(`确定要删除课程 "${course.name}" 吗？此操作无法撤销。`)) { courseStore.deleteCourse(course.id); }
}

function getStatusDisplayName(statusValue) { const status = courseStatuses.value.find(s => s.value === statusValue); return status ? status.text : statusValue; }
function getStatusClass(statusValue) { return `status-${statusValue?.toLowerCase().replace(/_/g, '-') || 'unknown'}`; }

onUnmounted(() => {
    clearTimeout(lessonUpdateTimeout);
});

</script>

<style scoped>
/* --- Red Government Style Theme Variables --- */
.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-accent-gold: #B8860B;
  --gov-accent-blue: #0056b3;
  --gov-secondary-gray: #6c757d;
  --gov-text-primary: #212529;
  --gov-text-secondary: #495057;
  --gov-background-light: #f8f9fa;
  --gov-background-white: #ffffff;
  --gov-border-color: #ced4da;
  --gov-border-color-strong: #adb5bd;
  --gov-danger-red: #dc3545;
  --gov-success-green: #28a745;
  --gov-info-blue: #17a2b8;
  --gov-warning-orange: #fd7e14;
  --gov-shadow-soft: 0 2px 4px rgba(0, 0, 0, 0.075);
  --gov-shadow-medium: 0 3px 6px rgba(0, 0, 0, 0.1);
  --gov-transition-default: all 0.2s ease-in-out;

  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
}

/* --- General Component Styles (Card, Headers) --- */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  box-shadow: var(--gov-shadow-soft);
}
.course-tracker-layout .card { /* Ensure layout cards don't double margin */
    margin-bottom: 0;
}

.card-header {
  padding: 0.75rem 1.25rem;
  background-color: var(--gov-background-light);
  border-bottom: 1px solid var(--gov-border-color);
  border-radius: 4px 4px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start; /* Align items to top if they wrap */
  gap: 1rem;
}
.card-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--gov-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5em;
}
.card-body {
  padding: 1.25rem;
}
.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid var(--gov-primary-red);
}
.section-header h1 {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--gov-text-primary);
  display: flex;
  align-items: center;
}
.section-header h1 > .header-icon {
  color: var(--gov-primary-red);
  margin-right: 0.75rem;
  font-size: 1.6rem;
}
.section-header p {
  font-size: 0.95rem;
  color: var(--gov-text-secondary);
  margin-top: 0.25rem;
}
.card-title-icon { /* For icons inside h2 in card headers */
    color: var(--gov-primary-red);
}

/* --- Layout --- */
.course-tracker-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}
@media (min-width: 992px) {
  .course-tracker-layout {
    grid-template-columns: 300px 1fr; /* Fixed sidebar width */
  }
}

/* --- Left Sidebar: Course List --- */
.course-list-sidebar {
  display: flex;
  flex-direction: column;
  max-height: 75vh; /* Limit height */
  overflow-y: auto;
  padding: 0; /* Card itself has padding */
  border-left: 5px solid var(--gov-secondary-gray);
}
.course-list-sidebar .card-header { /* Sidebar uses own header style */
    padding: 0.75rem 1rem;
    border-radius: 0; /* No top radius if sidebar is full height */
}
.sidebar-header { /* Replaces card-header for sidebar specific content */
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--gov-border-color);
}
.sidebar-header h2 {
  font-size: 1.05rem; /* Smaller for sidebar */
  color: var(--gov-text-primary);
}
.course-select-list {
  list-style: none;
  padding: 0.5rem;
  margin: 0;
  flex-grow: 1;
  overflow-y: auto;
}
.course-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 0.8rem;
  margin-bottom: 0.25rem;
  border-radius: 3px;
  cursor: pointer;
  transition: var(--gov-transition-default);
  border: 1px solid transparent;
  color: var(--gov-text-primary);
  font-size: 0.9rem;
}
.course-list-item:hover {
  background-color: var(--gov-background-light);
  border-color: var(--gov-border-color);
}
.course-list-item.active {
  background-color: var(--gov-primary-red);
  font-weight: 600;
  color: var(--gov-background-white);
  border-color: var(--gov-primary-red-dark);
}
.course-item-name {
  flex-grow: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-right: 0.5rem;
}
.course-item-actions {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity var(--gov-transition-default);
}
.course-list-item:hover .course-item-actions,
.course-list-item.active .course-item-actions {
  opacity: 1;
}
.course-list-item.active .btn-delete {
    color: var(--gov-background-light); /* Lighter delete icon on red background */
}
.course-list-item.active .btn-delete:hover {
    color: var(--gov-background-white);
    background-color: rgba(255,255,255,0.15);
}

/* --- Right Main Area: Course Details --- */
.course-details-main .placeholder-text.card { padding: 3rem 1.5rem; }
.course-tracker-card {
  border-left: 5px solid var(--gov-primary-red);
}
.course-detail-header { /* Specific for course detail card header */
    /* Uses .card-header base */
}
.course-display-info h2#course-name-display {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--gov-primary-red);
  margin-bottom: 0.25rem;
}
.course-external-link {
  display: block;
  font-size: 0.85rem;
  color: var(--gov-accent-blue);
  margin-bottom: 0.5rem;
  word-break: break-all;
  text-decoration: underline;
}
.course-external-link:hover { color: var(--gov-primary-red-dark); }
.course-external-link i { margin-right: 0.3em; }

.text-muted-display.small {
  font-size: 0.85rem;
  color: var(--gov-text-secondary);
  margin-bottom: 0.5rem;
}
.course-meta-info {
    margin-top: 0.75rem;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem 0.75rem; /* row-gap column-gap */
}
.course-category-badge {
  background-color: var(--gov-secondary-gray);
  color: var(--gov-background-white);
  padding: 0.25em 0.6em;
  border-radius: 3px;
  font-size: 0.75rem;
  font-weight: 500;
}
.course-status-badge {
  padding: 0.25em 0.6em;
  border-radius: 3px;
  font-size: 0.75rem;
  border: 1px solid;
  font-weight: 500;
}
.status-not-started { color: var(--gov-text-secondary); border-color: var(--gov-text-secondary); background-color: var(--gov-background-light); }
.status-in-progress { color: var(--gov-accent-blue); border-color: var(--gov-accent-blue); background-color: rgba(0, 86, 179, 0.08); }
.status-completed { color: var(--gov-success-green); border-color: var(--gov-success-green); background-color: rgba(40, 167, 69, 0.08); }
.status-on-hold { color: var(--gov-warning-orange); border-color: var(--gov-warning-orange); background-color: rgba(253, 126, 20, 0.08); }
.last-updated-info {
  font-size: 0.75rem;
  color: var(--gov-text-secondary);
  display: inline-flex; align-items: center; gap: 0.3em;
}
.course-edit-info .form-control-sm { margin-bottom: 0.5rem; }
.mb-half { margin-bottom: 0.5rem !important; }
.header-actions { flex-shrink: 0; display: flex; gap: 0.5rem; }

.course-progress-section {
  background-color: var(--gov-background-light);
  padding: 1rem 1.25rem;
  border-radius: 4px;
  border: 1px solid var(--gov-border-color);
}
.course-progress-section h3 {
  font-size: 1.05rem;
  font-weight: 600;
  margin-bottom: 1rem;
  color: var(--gov-text-primary);
  display: flex;
  align-items: center;
  gap: 0.5em;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--gov-border-color);
}
.card-subtitle-icon { color: var(--gov-secondary-gray); }

.progress-controls {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}
.input-group { display: flex; align-items: center; gap: 0.6rem; justify-content: space-between; }
.input-group label { font-size: 0.9rem; color: var(--gov-text-primary); font-weight: 500; }
.input-narrow.form-control { width: 75px; padding: 0.4rem 0.5rem; text-align: center; }
.completed-input-actions { display: flex; align-items: center; gap: 0.3rem; }

.progress-bar-wrapper { display: flex; align-items: center; gap: 0.75rem; margin-top: 0.5rem; }
.progress-bar-container { flex-grow: 1; height: 12px; background-color: var(--gov-border-color); border-radius: 6px; overflow: hidden; }
.progress-fill { height: 100%; background-color: var(--gov-primary-red); border-radius: 6px; transition: width 0.5s ease-in-out; }
.progress-percentage-text { font-size: 0.9rem; font-weight: 600; color: var(--gov-primary-red); flex-shrink: 0; min-width: 40px; text-align: right; }

/* --- Modal --- */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.65); display: flex; justify-content: center; align-items: center; z-index: 1050; }
.modal-content.card { width: 90%; max-width: 500px; padding: 0; border-top: 5px solid var(--gov-primary-red); }
.modal-header { padding: 1rem 1.25rem; border-bottom: 1px solid var(--gov-border-color); background-color: var(--gov-background-light); display: flex; justify-content: space-between; align-items: center; }
.modal-header h2 { font-size: 1.2rem; margin: 0; color: var(--gov-primary-red); }
.btn-close-modal { font-size: 1.5rem; color: var(--gov-text-secondary); background: none; border: none; cursor: pointer; line-height: 1; padding: 0.25rem 0.5rem; }
.btn-close-modal:hover { color: var(--gov-text-primary); }
.modal-form { padding: 1.25rem; }
.modal-form .form-group { margin-bottom: 1rem; }
.required-asterisk { color: var(--gov-danger-red); margin-left: 0.15em; }
.modal-actions { margin-top: 1.5rem; display: flex; justify-content: flex-end; align-items: center; gap: 0.75rem; padding-top: 1rem; border-top: 1px solid var(--gov-border-color); }
.error-message-inline { margin-right: auto; color: var(--gov-danger-red); font-size: 0.85rem; }


/* --- Form Controls & Buttons (Shared) --- */
.form-control, .form-control-sm {
  width: 100%; padding: 0.5rem 0.75rem; font-size: 0.9rem; line-height: 1.5;
  color: var(--gov-text-primary); background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color); border-radius: 3px;
  transition: border-color .15s ease-in-out,box-shadow .15s ease-in-out; box-sizing: border-box;
}
.form-control:focus {
  border-color: var(--gov-primary-red); outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(217, 0, 0, 0.25);
}
.form-control-sm { padding: 0.35rem 0.6rem; font-size: 0.85rem; }
.btn {
  padding: 0.5rem 1rem; font-size: 0.9rem; border-radius: 3px; border: 1px solid transparent;
  cursor: pointer; transition: var(--gov-transition-default); font-weight: 500;
  display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;
}
.btn-sm { padding: 0.35rem 0.75rem; font-size: 0.8rem; }
.btn-primary { background-color: var(--gov-primary-red); border-color: var(--gov-primary-red); color: var(--gov-background-white); }
.btn-primary:hover:not(:disabled) { background-color: var(--gov-primary-red-dark); border-color: var(--gov-primary-red-dark); }
.btn-primary:disabled { background-color: #e08585; border-color: #e08585; color: #fff5f5; cursor: not-allowed; }
.btn-secondary { background-color: var(--gov-secondary-gray); border-color: var(--gov-secondary-gray); color: var(--gov-background-white); }
.btn-secondary:hover:not(:disabled) { background-color: var(--gov-secondary-gray); opacity: 0.85; } /* Using opacity for secondary hover */

.btn-icon {
  background: transparent; border: 1px solid transparent; cursor: pointer; padding: 0.35rem;
  line-height: 1; border-radius: 50%; width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  transition: var(--gov-transition-default); color: var(--gov-text-secondary);
}
.btn-icon:hover { background-color: rgba(0,0,0,0.07); color: var(--gov-text-primary); }
.btn-icon:disabled { opacity: 0.5; cursor: not-allowed; background-color: transparent !important; }
.btn-icon.btn-tiny { width: 24px; height: 24px; font-size: 0.75em; }
.btn-icon.btn-delete { color: var(--gov-danger-red); }
.btn-icon.btn-delete:hover { background-color: rgba(220,53,69,0.1); color: var(--gov-danger-red-dark); }
.btn-icon.btn-edit { color: var(--gov-accent-blue); }
.btn-icon.btn-edit:hover { background-color: rgba(0,86,179,0.1); color: var(--gov-accent-blue); }
.btn-icon.btn-save { color: var(--gov-success-green); }
.btn-icon.btn-save:hover { background-color: rgba(40,167,69,0.1); color: var(--gov-success-green); }
.btn-icon.btn-cancel { color: var(--gov-text-secondary); }
.btn-icon.btn-cancel:hover { background-color: rgba(0,0,0,0.1); color: var(--gov-text-primary); }
.btn-icon.btn-control { color: var(--gov-secondary-gray); } /* For +/- buttons */
.btn-icon.btn-control:hover { background-color: var(--gov-border-color); color: var(--gov-text-primary); }


/* --- Placeholders & Loaders --- */
.placeholder-text.card, .loading-indicator.card { padding: 2rem 1.5rem; }
.placeholder-icon { font-size: 2.5rem; color: var(--gov-border-color-strong); margin-bottom: 0.75rem; display: block; }
.placeholder-text p { font-size: 1.05rem; color: var(--gov-text-primary); font-weight: 500; margin-bottom: 0.3rem; }
.placeholder-text span { font-size: 0.9rem; }
.loading-indicator.small { font-size: 0.9em; padding: 1rem; text-align: left; display: flex; align-items: center; gap: 0.5em; }
.spinner, .spinner-small { border-radius: 50%; animation: spin 1s linear infinite; }
.spinner { border: 4px solid var(--gov-background-light); border-top: 4px solid var(--gov-primary-red); width: 32px; height: 32px; margin: 0 auto 0.75rem auto;}
.spinner-small { border: 3px solid var(--gov-background-light); border-top: 3px solid var(--gov-primary-red); width: 18px; height: 18px; }
@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

/* --- Responsive --- */
@media (max-width: 991px) {
  .course-tracker-layout { grid-template-columns: 1fr; }
  .course-list-sidebar { max-height: 40vh; margin-bottom: 1.5rem; }
}
@media (max-width: 767px) {
  .course-list-sidebar { padding: 0; } /* Remove card padding for full width elements */
  .sidebar-header { padding: 0.75rem; }
  .course-select-list { padding: 0.5rem; }
  .course-detail-header { flex-direction: column; align-items: stretch; }
  .header-actions { margin-top: 0.75rem; justify-content: flex-start; }
  .modal-content.card { margin: 0 1rem; }
  .progress-controls { flex-direction: column; align-items: stretch; }
  .input-group { flex-direction: column; align-items: flex-start; gap: 0.3rem; }
  .input-group label { margin-bottom: 0.2rem; }
  .input-narrow.form-control, .completed-input-actions { width: 100%; }
}

</style>