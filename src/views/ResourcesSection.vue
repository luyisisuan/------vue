<template>
    <div>
      <header class="section-header"> <!-- 全局样式 -->
        <h1><i class="fas fa-link icon-gradient"></i> 资源库</h1>
        <p>常用的学习网站和资料链接。</p>
      </header>
      <div class="card resources-card"> <!-- 全局 .card, 添加特定类 -->
        <div class="resource-grid">
          <!-- 这些链接是静态的，可以直接写 -->
          <a href="http://www.scs.gov.cn/" target="_blank" class="resource-item">
            <i class="fas fa-landmark"></i>
            <span>国家公务员局官网</span>
          </a>
          <a href="http://rsks.hunan.gov.cn/" target="_blank" class="resource-item">
            <i class="fas fa-building"></i>
            <span>湖南省人事考试网</span>
          </a>
          <a href="https://www.xuexi.cn/" target="_blank" class="resource-item">
            <i class="fas fa-book"></i>
            <span>学习强国 (时政)</span>
          </a>
          <a href="http://paper.people.com.cn/rmrb/index.html" target="_blank" class="resource-item">
            <i class="far fa-newspaper"></i>
            <span>人民日报 (评论)</span>
          </a>
          <!-- 如果需要动态添加/管理资源，则需要数组和 v-for (阶段四) -->
        </div>
      </div>
    </div>
  </template>
  
  <script setup>
  // 这个组件在阶段三可能不需要 script setup，因为内容是静态的
  // 如果以后需要动态管理资源，再添加逻辑
  </script>
  
  <style scoped>
  /* --- Resources Specific Styles --- */
  .resources-card {
      border-left: 4px solid var(--success-color); /* 特定边框 */
  }
  
  .resource-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); /* 自适应列 */
      gap: 1rem; /* 网格间距 */
  }
  
  .resource-item {
      background-color: #f8f9fa; /* 背景色 */
      border-radius: 8px; /* 圆角 */
      padding: 1rem 1.2rem;
      display: flex;
      align-items: center;
      gap: 0.8rem;
      color: var(--text-color); /* 默认文字颜色 */
      transition: var(--transition-default); /* 使用全局过渡 */
      border: 1px solid var(--border-color);
      text-decoration: none; /* 移除链接下划线 */
  }
  .resource-item:hover {
      transform: translateY(-3px); /* 悬浮效果 */
      box-shadow: var(--shadow-medium); /* 使用全局阴影 */
      border-color: var(--primary-light);
      color: var(--primary-color); /* 悬浮时文字颜色 */
      background-color: white; /* 悬浮时背景色 */
  }
  .resource-item i {
      font-size: 1.2rem;
      color: var(--secondary-color); /* 图标颜色 */
      width: 20px;
      text-align: center;
      flex-shrink: 0; /* 防止图标被压缩 */
  }
  .resource-item span {
      flex-grow: 1; /* 文字占据剩余空间 */
      font-weight: 500;
      font-size: 0.95rem;
  }
  
  /* --- Resources Specific Responsive --- */
  /* 这个布局通常在不同屏幕尺寸下表现良好，可能不需要特定调整 */
  /* 如果需要，在此处添加 @media 查询 */
  </style>