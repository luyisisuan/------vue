// src/utils/formatters.js

/**
 * 将秒数格式化为 MM:SS
 * @param {number} seconds 秒数
 * @returns {string} MM:SS 格式字符串
 */
export function formatTimeMMSS(seconds) {
    const safeSeconds = Math.max(0, Math.floor(seconds)); // 确保是正整数
    const mins = Math.floor(safeSeconds / 60);
    const secs = safeSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  
  /**
   * 将 ISO 格式时间戳格式化为本地化日期时间字符串
   * @param {string | null | undefined} isoString ISO 格式时间戳
   * @param {object} options Intl.DateTimeFormat 选项
   * @returns {string} 本地化日期时间字符串或 'N/A'
   */
  export function formatTimestamp(isoString, options = {}) {
    if (!isoString) return 'N/A';
    try {
      const date = new Date(isoString);
      const defaultOptions = {
        //year: 'numeric', // 可选添加年份
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      const mergedOptions = { ...defaultOptions, ...options };
      return date.toLocaleString('zh-CN', mergedOptions);
    } catch (e) {
      console.warn("Error formatting timestamp:", isoString, e);
      return 'Invalid Date';
    }
  }
  
  /**
   * 将总秒数格式化为 Xh Ym 格式
   * @param {number} totalSeconds 总秒数
   * @returns {string} Xh Ym 格式字符串
   */
  export function formatDuration(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(totalSeconds)); // 确保是正整数
    if (isNaN(safeSeconds)) return '0h 0m';
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  
  /**
   * 将总秒数格式化为 HH:MM:SS
   * @param {number} totalSeconds 总秒数
   * @returns {string} HH:MM:SS 格式字符串
   */
  export function formatSecondsToHHMMSS(totalSeconds) {
      const safeSeconds = Math.max(0, Math.floor(totalSeconds)); // 确保是正整数
      if (isNaN(safeSeconds)) return '00:00:00';
      const hours = Math.floor(safeSeconds / 3600);
      const minutes = Math.floor((safeSeconds % 3600) / 60);
      const seconds = safeSeconds % 60;
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }