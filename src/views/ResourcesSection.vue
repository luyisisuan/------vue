<template>
  <div>
    <header class="section-header">
      <h1><i class="fas fa-link icon-gradient"></i> 资源库</h1>
      <p>常用的学习网站和资料链接。</p>
      <div class="actions">
        <button @click="showAddModal = true" class="btn btn-primary">
          <i class="fas fa-plus"></i> 添加资源
        </button>
      </div>
    </header>

    <!-- 资源分类标签 -->
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
      <button @click="store.loadResources" class="btn btn-sm">重试</button>
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
            <i :class="resource.icon || 'fas fa-link'"></i>
            <span>{{ resource.title }}</span>
            <small v-if="resource.description" class="resource-description">{{ resource.description }}</small>
          </a>
          <div class="resource-actions">
            <button @click="editResource(resource)" class="btn-icon" title="编辑">
              <i class="fas fa-edit"></i>
            </button>
            <button @click="confirmDelete(resource)" class="btn-icon" title="删除">
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
              <label for="icon">图标</label>
              <div class="icon-selector">
                <input 
                  type="text" 
                  id="icon" 
                  v-model="resourceForm.icon" 
                  placeholder="FontAwesome 图标类名 (如: fas fa-book)"
                />
                <div class="icon-preview">
                  <i :class="resourceForm.icon || 'fas fa-link'"></i>
                </div>
              </div>
              <small>常用图标: fas fa-book, fas fa-link, fas fa-newspaper, fas fa-building, fas fa-landmark</small>
            </div>
            <div class="form-group">
              <label for="category">分类</label>
              <select id="category" v-model="resourceForm.category">
                <option value="">-- 选择分类 --</option>
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
import { useResourceStore } from '@/stores/resourceStore';

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
  editingResource.value = resource;
  resourceForm.title = resource.title;
  resourceForm.url = resource.url;
  resourceForm.icon = resource.icon || '';
  resourceForm.category = resource.category || '';
  resourceForm.description = resource.description || '';
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
    const success = await store.deleteResource(resourceToDelete.value.id);
    if (success) {
      showDeleteModal.value = false;
      resourceToDelete.value = null;
    }
  } finally {
    isDeleting.value = false;
  }
}

// 保存资源
async function saveResource() {
  isSubmitting.value = true;
  
  try {
    const data = {
      title: resourceForm.title.trim(),
      url: resourceForm.url.trim(),
      icon: resourceForm.icon.trim() || 'fas fa-link',
      category: resourceForm.category || '其他',
      description: resourceForm.description.trim()
    };
    
    let success;
    if (editingResource.value) {
      success = await store.updateResource(editingResource.value.id, data);
    } else {
      success = await store.addResource(data);
    }
    
    if (success) {
      closeModal();
    }
  } finally {
    isSubmitting.value = false;
  }
}

// 关闭模态框
function closeModal() {
  showAddModal.value = false;
  editingResource.value = null;
  resetForm();
}

// 重置表单
function resetForm() {
  resourceForm.title = '';
  resourceForm.url = '';
  resourceForm.icon = '';
  resourceForm.category = '';
  resourceForm.description = '';
}
</script>

<style scoped>
/* --- Resources Specific Styles --- */
.resources-card {
  border-left: 4px solid var(--success-color);
}

.resource-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1rem;
}

.resource-item-container {
  position: relative;
}

.resource-item {
  background-color: #f8f9fa;
  border-radius: 8px;
  padding: 1rem 1.2rem;
  display: flex;
  flex-direction: column;
  color: var(--text-color);
  transition: var(--transition-default);
  border: 1px solid var(--border-color);
  text-decoration: none;
  height: 100%;
}

.resource-item:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-medium);
  border-color: var(--primary-light);
  color: var(--primary-color);
  background-color: white;
}

.resource-item i {
  font-size: 1.2rem;
  color: var(--secondary-color);
  width: 20px;
  text-align: center;
  margin-bottom: 0.5rem;
}

.resource-item span {
  font-weight: 500;
  font-size: 0.95rem;
  margin-bottom: 0.3rem;
}

.resource-description {
  font-size: 0.8rem;
  color: var(--text-light);
  margin-top: 0.3rem;
}

.resource-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: none;
  gap: 0.3rem;
}

.resource-item-container:hover .resource-actions {
  display: flex;
}

.btn-icon {
  background: rgba(255, 255, 255, 0.9);
  border: 1px solid var(--border-color);
  border-radius: 4px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: white;
  border-color: var(--primary-color);
  color: var(--primary-color);
}

/* 分类标签 */
.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.category-tab {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  background: #f0f0f0;
  border: 1px solid var(--border-color);
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.category-tab.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.category-tab:hover:not(.active) {
  background: #e0e0e0;
}

/* 模态框样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.modal-sm {
  max-width: 400px;
}

.modal-header {
  padding: 1rem;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-body {
  padding: 1rem;
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: var(--text-light);
}

.btn-close:hover {
  color: var(--text-color);
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.3rem;
  font-weight: 500;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 0.9rem;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
}

.required {
  color: red;
}

.icon-selector {
  display: flex;
  gap: 0.5rem;
}

.icon-preview {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: var(--text-light);
}

.empty-state i {
  font-size: 2rem;
  margin-bottom: 1rem;
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
}

.spinner {
  border: 3px solid #f3f3f3;
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  width: 30px;
  height: 30px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-message {
  background: #fff0f0;
  border: 1px solid #ffcaca;
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.error-message i {
  color: #e74c3c;
  font-size: 1.2rem;
}

/* 响应式调整 */
@media (max-width: 768px) {
  .resource-grid {
    grid-template-columns: 1fr;
  }
  
  .category-tabs {
    overflow-x: auto;
    padding-bottom: 0.5rem;
    flex-wrap: nowrap;
  }
  
  .category-tab {
    white-space: nowrap;
  }
}
</style>