// src/utils/helpers.js

/**
 * 生成唯一 ID
 * @returns {string} 唯一 ID 字符串
 */
export function generateId() {
    return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * 简单的 HTML 清理，防止 XSS (基础版)
   * @param {string} str 输入字符串
   * @returns {string} 清理后的字符串
   */
  export function sanitizeHTML(str) {
     if (!str) return '';
     // 更安全的做法是使用库如 DOMPurify
     // 基础替换：
     return String(str).replace(/</g, "<").replace(/>/g, ">");
  }
  
  // 如果需要高亮函数，也可以放这里
  export function highlightText(text, term) {
      const safeText = sanitizeHTML(text || '');
      const safeTerm = sanitizeHTML(term || '');
      if (!safeTerm) return safeText;
      try {
          const escapedTerm = safeTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(${escapedTerm})`, 'gi');
           // 注意：这里返回的是包含 <mark> 的 HTML 字符串，需要在模板中使用 v-html 渲染
           // 使用 v-html 需要确保 text 和 term 来源可靠，或者已经过严格清理
           return safeText.replace(regex, '<mark>$1</mark>');
      } catch (e) {
          console.error("Error creating regex for highlight:", e);
          return safeText;
      }
  }