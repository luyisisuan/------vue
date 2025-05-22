<template>
  <div class="gov-style-wrapper">
    <header class="section-header">
      <h1><i class="fas fa-database header-icon"></i> 资源库</h1>
      <p>常用的学习网站和资料链接。</p>
      <div class="actions">
        <button @click="showAddModal = true" class="btn btn-primary">
          <i class="fas fa-plus"></i> 添加资源
        </button>
      </div>
    </header>

    <div class="category-tabs">
      <button
        v-for="cat in ['全部', ...store.categories]"
        :key="cat"
        @click="currentCategory = cat"
        :class="['category-tab', currentCategory === cat ? 'active' : '']">
        {{ cat }}
      </button>
    </div>

    <!-- 加载状态 -->
    <div v-if="store.isLoading" class="loading-container">
      <div class="spinner"></div>
      <p>加载资源中...</p>
    </div>
    <!-- 错误提示 -->
    <div v-else-if="store.error" class="error-message">
      <i class="fas fa-exclamation-circle"></i>
      <p>{{ store.error }}</p>
      <button @click="store.loadResources" class="btn btn-sm btn-secondary">重试</button>
    </div>
    <!-- 资源列表 -->
    <div v-else class="card resources-card">
      <div v-if="filteredResources.length === 0" class="empty-state">
        <i class="fas fa-folder-open"></i>
        <p>{{ currentCategory === '全部' ? '暂无资源' : `暂无${currentCategory}分类的资源` }}</p>
      </div>
      <div v-else class="resource-grid">
        <div
          v-for="resource in filteredResources"
          :key="resource.id"
          class="resource-item-container">
          <a :href="resource.url" target="_blank" class="resource-item">
            <i :class="resource.icon || 'fas fa-link'" class="item-icon"></i>
            <span>{{ resource.title }}</span>
            <small v-if="resource.description" class="resource-description">{{ resource.description }}</small>
          </a>
          <div class="resource-actions">
            <button @click="editResource(resource)" class="btn-icon" title="编辑">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="confirmDelete(resource)" class="btn-icon btn-icon-danger" title="删除">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑资源模态框 -->
    <div v-if="showAddModal || editingResource" class="modal-overlay">
      <div class="modal-container">
        <div class="modal-header">
          <h3>{{ editingResource ? '编辑资源' : '添加新资源' }}</h3>
          <button @click="closeModal" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="saveResource">
            <div class="form-group">
              <label for="title">标题 <span class="required">*</span></label>
              <input
                type="text"
                id="title"
                v-model="resourceForm.title"
                required
                placeholder="输入资源标题"
              />
            </div>
            <div class="form-group">
              <label for="url">链接 <span class="required">*</span></label>
              <input
                type="url"
                id="url"
                v-model="resourceForm.url"
                required
                placeholder="输入资源链接 (https://...)"
              />
            </div>
            <div class="form-group">
              <label for="icon">图标 (Font Awesome 类名)</label>
              <div class="icon-selector">
                <input
                  type="text"
                  id="icon"
                  v-model="resourceForm.icon"
                  placeholder="例如: fas fa-book"
                />
                <div class="icon-preview">
                  <i :class="resourceForm.icon || 'fas fa-link'"></i>
                </div>
              </div>
              <small>常用: fas fa-book, fas fa-link, fas fa-newspaper, fas fa-building, fas fa-landmark, fab fa-github</small>
            </div>
            <div class="form-group">
              <label for="category">分类</label>
              <select id="category" v-model="resourceForm.category">
                <option value="">-- 无分类 --</option>
                <option v-for="cat in store.categories" :key="cat" :value="cat">{{ cat }}</option>
              </select>
            </div>
            <div class="form-group">
              <label for="description">描述</label>
              <textarea
                id="description"
                v-model="resourceForm.description"
                placeholder="输入资源简短描述 (可选)"
                rows="2"
              ></textarea>
            </div>
            <div class="form-actions">
              <button type="button" @click="closeModal" class="btn btn-secondary">取消</button>
              <button type="submit" class="btn btn-primary" :disabled="isSubmitting">
                <span v-if="isSubmitting">
                  <i class="fas fa-spinner fa-spin"></i> 保存中...
                </span>
                <span v-else>保存</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 删除确认模态框 -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal-container modal-sm">
        <div class="modal-header">
          <h3>确认删除</h3>
          <button @click="showDeleteModal = false" class="btn-close">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>确定要删除资源 <strong>{{ resourceToDelete?.title }}</strong> 吗？此操作不可撤销。</p>
          <div class="form-actions">
            <button @click="showDeleteModal = false" class="btn btn-secondary">取消</button>
            <button @click="deleteSelectedResource" class="btn btn-danger" :disabled="isDeleting">
              <span v-if="isDeleting">
                <i class="fas fa-spinner fa-spin"></i> 删除中...
              </span>
              <span v-else>确认删除</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useResourceStore } from '@/stores/resourceStore'; // Ensure this path is correct

// 初始化 store
const store = useResourceStore();

// 状态管理
const currentCategory = ref('全部');
const showAddModal = ref(false);
const showDeleteModal = ref(false);
const editingResource = ref(null);
const resourceToDelete = ref(null);
const isSubmitting = ref(false);
const isDeleting = ref(false);

// 表单数据
const resourceForm = reactive({
  id: null, // Important for editing
  title: '',
  url: '',
  icon: '',
  category: '',
  description: ''
});

// 过滤资源
const filteredResources = computed(() => {
  if (currentCategory.value === '全部') {
    return store.resources;
  }
  return store.resources.filter(r => r.category === currentCategory.value);
});

// 编辑资源
function editResource(resource) {
  editingResource.value = resource; // Keep the original resource object for ID
  resourceForm.id = resource.id;
  resourceForm.title = resource.title;
  resourceForm.url = resource.url;
  resourceForm.icon = resource.icon || '';
  resourceForm.category = resource.category || '';
  resourceForm.description = resource.description || '';
  showAddModal.value = true; // Open the same modal for editing
}

// 确认删除
function confirmDelete(resource) {
  resourceToDelete.value = resource;
  showDeleteModal.value = true;
}

// 删除资源
async function deleteSelectedResource() {
  if (!resourceToDelete.value) return;
  
  isDeleting.value = true;
  try {
    // Assuming store.deleteResource expects an ID
    const success = await store.deleteResource(resourceToDelete.value.id);
    if (success) {
      showDeleteModal.value = false;
      resourceToDelete.value = null;
       if (currentCategory.value !== '全部' && !filteredResources.value.length) {
        currentCategory.value = '全部';
      }
    }
    // Optionally, add error handling toast/message here
  } catch (error) {
    console.error("Error deleting resource:", error);
    // Show error toast/message to user
  } finally {
    isDeleting.value = false;
  }
}

// 保存资源 (handles both add and update)
async function saveResource() {
  isSubmitting.value = true;
  
  try {
    const dataToSave = {
      title: resourceForm.title.trim(),
      url: resourceForm.url.trim(),
      icon: resourceForm.icon.trim() || 'fas fa-link',
      category: resourceForm.category || '未分类', // Default category if none selected
      description: resourceForm.description.trim()
    };
    
    let success;
    if (editingResource.value && resourceForm.id) { // Check if we are editing
      success = await store.updateResource(resourceForm.id, dataToSave);
    } else {
      success = await store.addResource(dataToSave);
    }
    
    if (success) {
      closeModal();
    }
    // Optionally, add error handling toast/message here if success is false
  } catch (error) {
    console.error("Error saving resource:", error);
    // Show error toast/message to user
  } finally {
    isSubmitting.value = false;
  }
}

// 关闭模态框
function closeModal() {
  showAddModal.value = false;
  editingResource.value = null; // Clear editing state
  resetForm();
}

// 重置表单
function resetForm() {
  resourceForm.id = null;
  resourceForm.title = '';
  resourceForm.url = '';
  resourceForm.icon = '';
  resourceForm.category = '';
  resourceForm.description = '';
}

// Load resources on component mount
store.loadResources();

</script>
<style scoped>
/* --- Red Government Style Theme Variables (Enhanced) --- */
.gov-style-wrapper {
  --gov-primary-red: #D90000;
  --gov-primary-red-dark: #A50000;
  --gov-primary-red-lighter: #FF3333; /* Brighter red for flashy accents */
  --gov-accent-gold: #DAA520;
  --gov-accent-gold-lighter: #FFC72C; /* Lighter gold for glows */
  --gov-text-primary: #212529;
  --gov-text-secondary: #495057;
  --gov-background-light: #f8f9fa;
  --gov-background-white: #ffffff;
  --gov-border-color: #ced4da;
  --gov-border-color-strong: #adb5bd;
  --gov-danger-red: #dc3545;
  --gov-danger-red-dark: #c82333;

  --gov-shadow-soft: 0 2px 4px rgba(0, 0, 0, 0.075);
  --gov-shadow-medium: 0 4px 10px rgba(0, 0, 0, 0.12);
  --gov-shadow-strong: 0 6px 18px rgba(0, 0, 0, 0.15);

  --gov-glow-primary: 0 0 8px var(--gov-primary-red-lighter), 0 0 12px var(--gov-primary-red);
  --gov-glow-accent: 0 0 8px var(--gov-accent-gold-lighter), 0 0 12px var(--gov-accent-gold);
  
  --gov-transition-default: all 0.2s ease-in-out;
  --gov-transition-smooth: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);

  --gov-flashy-gradient: linear-gradient(45deg, var(--gov-primary-red), var(--gov-primary-red-lighter));
  --gov-animated-border-gradient: linear-gradient(180deg, var(--gov-primary-red), var(--gov-accent-gold), var(--gov-primary-red-lighter), var(--gov-primary-red));

  font-family: "Microsoft YaHei", "SimSun", Arial, sans-serif;
}

/* --- Keyframe Animations --- */
@keyframes pulse-glow {
  0%, 100% { text-shadow: 0 0 4px var(--gov-primary-red-lighter), 0 0 8px var(--gov-primary-red); opacity: 0.8; transform: scale(1); }
  50% { text-shadow: 0 0 8px var(--gov-primary-red-lighter), 0 0 16px var(--gov-primary-red); opacity: 1; transform: scale(1.05); }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

@keyframes animatedBorderFlow {
  0% { background-position: 0 0; }
  100% { background-position: 0 -200%; } /* Adjust based on gradient length */
}

@keyframes modalEnter {
  from { opacity: 0; transform: translateY(-30px) scale(0.95); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes actionButtonPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 2px 5px rgba(0,0,0,0.1), var(--gov-glow-primary); }
  50% { transform: scale(1.05); box-shadow: 0 4px 10px rgba(0,0,0,0.15), var(--gov-glow-primary); }
}
@keyframes submittingSpinnerPulse {
  0%, 100% { transform: scale(1); opacity: 0.9; }
  50% { transform: scale(1.15); opacity: 1; }
}


/* --- General Component Styles --- */
.section-header {
  margin-bottom: 1.5rem;
  padding-bottom: 1rem;
  border-bottom: 3px solid;
  border-image-slice: 1;
  border-image-source: linear-gradient(to right, var(--gov-primary-red), var(--gov-accent-gold), var(--gov-primary-red-lighter));
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
  transition: var(--gov-transition-smooth);
  animation: pulse-glow 2.5s infinite ease-in-out;
}
.section-header h1:hover > .header-icon {
  transform: rotate(-10deg) scale(1.15);
  color: var(--gov-primary-red-lighter);
  animation-play-state: paused;
}

.section-header p {
  font-size: 0.95rem;
  color: var(--gov-text-secondary);
  margin-top: 0.25rem;
}

.actions {
  margin-top: 1rem;
}
.actions .btn-primary { /* Special styling for the main "Add Resource" button */
  animation: actionButtonPulse 2s infinite cubic-bezier(0.4, 0, 0.2, 1);
}
.actions .btn-primary:hover {
  animation-play-state: paused; /* Pause pulse on hover for better interaction */
}


/* --- Buttons --- */
.btn {
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: var(--gov-transition-smooth); /* Enhanced transition */
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  text-decoration: none;
  position: relative;
  overflow: hidden; /* For potential advanced hover effects */
  box-shadow: var(--gov-shadow-soft);
}
.btn:hover {
  transform: translateY(-2px);
  box-shadow: var(--gov-shadow-medium);
}
.btn:active {
  transform: translateY(0);
  box-shadow: var(--gov-shadow-soft);
}

.btn-primary {
  background-image: var(--gov-flashy-gradient); /* Gradient background */
  border-color: transparent; /* Let gradient show */
  color: var(--gov-background-white);
  text-shadow: 1px 1px 1px rgba(0,0,0,0.2);
}
.btn-primary:hover {
  background-image: linear-gradient(45deg, var(--gov-primary-red-dark), var(--gov-primary-red)); /* Darker gradient on hover */
  box-shadow: var(--gov-shadow-strong), var(--gov-glow-primary);
}
.btn-primary:disabled {
  background-image: none; /* Remove gradient for disabled */
  background-color: #e08585;
  border-color: #e08585;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.7;
}
.btn-primary:disabled i.fa-spinner { /* Target spinner in disabled primary button */
  animation: fa-spin 0.8s infinite linear, submittingSpinnerPulse 1.2s infinite ease-in-out;
  color: var(--gov-background-white); /* Ensure visibility */
}


.btn-secondary {
  background-color: #6c757d;
  border-color: #6c757d;
  color: var(--gov-background-white);
}
.btn-secondary:hover {
  background-color: #5a6268;
  border-color: #545b62;
  box-shadow: var(--gov-shadow-medium), 0 0 8px #888;
}

.btn-danger {
  background-color: var(--gov-danger-red);
  border-color: var(--gov-danger-red);
  color: var(--gov-background-white);
}
.btn-danger:hover {
  background-color: var(--gov-danger-red-dark);
  border-color: var(--gov-danger-red-dark);
  box-shadow: var(--gov-shadow-medium), 0 0 8px var(--gov-danger-red);
}
.btn-danger:disabled {
  background-color: #ea868f;
  border-color: #ea868f;
  cursor: not-allowed;
  box-shadow: none;
  opacity: 0.7;
}


.btn-sm {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

/* --- Category Tabs --- */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
}

.category-tab {
  padding: 0.5rem 1rem;
  border-radius: 4px;
  background: var(--gov-background-light);
  border: 1px solid var(--gov-border-color);
  color: var(--gov-text-primary);
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: var(--gov-transition-smooth); /* Enhanced transition */
  box-shadow: var(--gov-shadow-soft);
}

.category-tab.active {
  background: var(--gov-flashy-gradient);
  color: var(--gov-background-white);
  border-color: transparent;
  box-shadow: var(--gov-shadow-medium), var(--gov-glow-primary);
  transform: scale(1.05) translateY(-1px);
  font-weight: 600;
}

.category-tab:hover:not(.active) {
  background: #e2e6ea;
  border-color: var(--gov-border-color-strong);
  transform: translateY(-2px) scale(1.03);
  box-shadow: var(--gov-shadow-medium);
}

/* --- Loading & Error States --- */
.loading-container, .empty-state {
  text-align: center;
  padding: 2.5rem 1rem;
  color: var(--gov-text-secondary);
}
.loading-container p, .empty-state p {
  margin-top: 0.5rem;
  font-size: 1rem;
}
.empty-state i {
  font-size: 3rem; /* Slightly larger */
  margin-bottom: 0.5rem;
  color: var(--gov-border-color-strong);
  opacity: 0.7;
}
.spinner {
  border: 4px solid rgba(0,0,0,0.1); /* Lighter base */
  border-top-color: var(--gov-primary-red-lighter);
  border-right-color: var(--gov-accent-gold);
  border-bottom-color: var(--gov-primary-red);
  border-radius: 50%;
  width: 40px; /* Slightly larger */
  height: 40px;
  animation: spin 0.8s linear infinite; /* Faster spin */
  margin: 0 auto 1rem auto;
  box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

.error-message {
  background: #fff0f1; /* Lighter red */
  border: 1px solid #f5c6cb;
  border-left: 4px solid var(--gov-danger-red); /* Prominent left border */
  color: #721c24;
  border-radius: 4px;
  padding: 1rem 1.2rem;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: var(--gov-shadow-soft);
}
.error-message i {
  color: var(--gov-danger-red);
  font-size: 1.5rem; /* Larger icon */
  animation: pulse-glow 2s infinite ease-in-out;
  animation-delay: 0.3s;
}


/* --- Resources Card & Grid --- */
.card {
  background-color: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  box-shadow: var(--gov-shadow-soft);
  padding: 1.5rem;
}
.resources-card {
  position: relative;
  overflow: hidden; /* Important for pseudo-element animation */
  border-left: none; /* Remove static border */
}
.resources-card::before { /* Animated gradient border */
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 5px;
  background: var(--gov-animated-border-gradient);
  background-size: 100% 300%; /* For animation */
  animation: animatedBorderFlow 5s linear infinite;
}


.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 1.5rem; /* Slightly more gap */
}

.resource-item-container {
  position: relative;
}

.resource-item {
  background-color: var(--gov-background-light);
  border-radius: 4px;
  padding: 1.2rem 1.4rem; /* Slightly more padding */
  display: flex;
  flex-direction: column;
  color: var(--gov-text-primary);
  transition: var(--gov-transition-smooth);
  border: 1px solid var(--gov-border-color);
  text-decoration: none;
  height: 100%;
  box-shadow: var(--gov-shadow-soft);
  position: relative; /* For icon effects */
  overflow: hidden;
}

.resource-item:hover {
  transform: translateY(-6px) scale(1.03); /* More lift */
  box-shadow: var(--gov-shadow-strong), var(--gov-glow-primary);
  border-color: var(--gov-primary-red-lighter);
  background-color: var(--gov-background-white);
}
.resource-item::after { /* Subtle shimmer on hover */
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 50%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s ease-in-out;
}
.resource-item:hover::after {
    left: 150%;
}


.resource-item .item-icon {
  font-size: 1.5rem; /* Larger icon */
  color: var(--gov-accent-gold);
  width: 30px; /* Ensure space */
  text-align: center;
  margin-bottom: 0.75rem;
  transition: var(--gov-transition-smooth);
  text-shadow: 0 0 5px var(--gov-accent-gold-lighter);
}
.resource-item:hover .item-icon {
  transform: scale(1.25) rotate(-15deg);
  color: var(--gov-primary-red);
  text-shadow: var(--gov-glow-primary);
}

.resource-item span {
  font-weight: 600;
  font-size: 1rem;
  margin-bottom: 0.4rem;
  color: var(--gov-text-primary);
  transition: color 0.2s ease-out;
}
.resource-item:hover span {
  color: var(--gov-primary-red);
}

.resource-description {
  font-size: 0.85rem;
  color: var(--gov-text-secondary);
  margin-top: auto;
  line-height: 1.4;
}

.resource-actions {
  position: absolute;
  top: 0.5rem; /* Adjusted position */
  right: 0.5rem;
  display: none;
  gap: 0.5rem; /* Increased gap */
  background: rgba(255, 255, 255, 0.92);
  padding: 0.4rem;
  border-radius: 4px;
  box-shadow: var(--gov-shadow-medium);
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
  transition: opacity 0.2s ease-out, transform 0.2s ease-out;
}

.resource-item-container:hover .resource-actions {
  display: flex;
  opacity: 1;
  transform: translateY(0) scale(1);
}

.btn-icon {
  background: var(--gov-background-white);
  border: 1px solid var(--gov-border-color);
  border-radius: 50%; /* Round buttons */
  width: 32px; /* Slightly larger */
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--gov-text-secondary);
  transition: var(--gov-transition-smooth);
}

.btn-icon:hover {
  background: var(--gov-primary-red);
  border-color: var(--gov-primary-red);
  color: var(--gov-background-white);
  transform: scale(1.15) rotate(10deg);
  box-shadow: var(--gov-glow-primary);
}
.btn-icon.btn-icon-danger:hover {
  background: var(--gov-danger-red);
  border-color: var(--gov-danger-red);
  transform: scale(1.15) rotate(-10deg);
  box-shadow: 0 0 8px var(--gov-danger-red);
}


/* --- Modal Styles --- */
.modal-overlay {
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px) saturate(150%); /* Frosted glass effect */
  -webkit-backdrop-filter: blur(4px) saturate(150%);
}

.modal-container {
  background: var(--gov-background-white);
  border-radius: 6px; /* Slightly more rounded */
  width: 90%;
  max-width: 550px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(0,0,0,0.05); /* Stronger shadow */
  border-top: 5px solid;
  border-image-slice: 1;
  border-image-source: var(--gov-flashy-gradient);
  animation: modalEnter 0.35s var(--gov-transition-smooth) forwards;
}

.modal-sm {
  max-width: 420px;
}

.modal-header {
  padding: 1rem 1.2rem;
  border-bottom: 1px solid var(--gov-border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: var(--gov-background-light);
  position: sticky; /* Keep header visible on scroll */
  top: 0;
  z-index: 1;
}
.modal-header h3 {
  font-size: 1.25rem; /* Slightly larger */
  font-weight: 600;
  color: var(--gov-primary-red);
  text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
}

.modal-body {
  padding: 1.5rem 1.2rem; /* More vertical padding */
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem; /* Larger close icon */
  cursor: pointer;
  color: var(--gov-text-secondary);
  transition: var(--gov-transition-smooth);
  padding: 0.2rem; /* Easier to click */
}
.btn-close:hover {
  color: var(--gov-primary-red);
  transform: rotate(90deg) scale(1.2);
}

/* --- Form Styles --- */
.form-group {
  margin-bottom: 1.2rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 500;
  font-size: 0.9rem;
  color: var(--gov-text-primary);
}

.form-group input[type="text"],
.form-group input[type="url"],
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.7rem 0.9rem; /* More padding */
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  font-size: 0.9rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
  box-sizing: border-box;
  background-color: var(--gov-background-white); /* Ensure BG color */
}
.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  border-color: var(--gov-primary-red-lighter);
  outline: 0;
  box-shadow: 0 0 0 0.2rem rgba(217, 0, 0, 0.3), var(--gov-glow-primary); /* Enhanced focus glow */
}

.form-group textarea {
  min-height: 70px; /* Taller textarea */
  resize: vertical;
}
.form-group small {
    display: block;
    margin-top: 0.3rem;
    font-size: 0.8rem;
    color: var(--gov-text-secondary);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--gov-border-color);
}

.required {
  color: var(--gov-danger-red);
  margin-left: 0.2rem;
  font-weight: bold;
}

.icon-selector {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}
.icon-selector input {
  flex-grow: 1;
}
.icon-preview {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--gov-border-color);
  border-radius: 4px;
  font-size: 1.4rem; /* Larger preview icon */
  color: var(--gov-accent-gold);
  transition: var(--gov-transition-smooth);
  background-color: var(--gov-background-light);
}
.icon-selector input:not(:placeholder-shown) + .icon-preview,
.icon-selector input:focus + .icon-preview {
  border-color: var(--gov-accent-gold-lighter);
  box-shadow: var(--gov-glow-accent);
  transform: scale(1.05);
}


/* --- Responsive Adjustments --- */
@media (max-width: 768px) {
  .section-header h1 {
    font-size: 1.5rem; /* Adjusted for smaller screens */
  }
  .section-header h1 > .header-icon {
    font-size: 1.4rem;
  }
  .resource-grid {
    grid-template-columns: 1fr;
  }
  
  .category-tabs {
    overflow-x: auto;
    padding-bottom: 0.8rem; /* More space for scrollbar if visible */
    flex-wrap: nowrap;
    -ms-overflow-style: none;
    scrollbar-width: thin; /* Thinner scrollbar for Firefox */
    scrollbar-color: var(--gov-primary-red) var(--gov-background-light); /* Styled scrollbar for Firefox */
  }
  .category-tabs::-webkit-scrollbar {
    height: 6px; /* Make scrollbar visible and style it a bit */
  }
  .category-tabs::-webkit-scrollbar-track {
    background: var(--gov-background-light);
    border-radius: 3px;
  }
  .category-tabs::-webkit-scrollbar-thumb {
    background: var(--gov-primary-red);
    border-radius: 3px;
  }
  .category-tabs::-webkit-scrollbar-thumb:hover {
    background: var(--gov-primary-red-dark);
  }
  
  .category-tab {
    white-space: nowrap;
  }
  .modal-container {
    width: 95%;
    max-height: 85vh; /* Ensure more space around modal on small screens */
  }
  .modal-body {
    padding: 1.2rem 1rem; /* Adjust padding for smaller modals */
  }
}

</style>