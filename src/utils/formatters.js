// src/utils/formatters.js
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 格式化 ISO 时间戳字符串或 Date 对象
 * @param {string | Date | null | undefined} timestamp 时间戳
 * @param {string} fmt 格式字符串 (可选, 默认为 'MM-dd HH:mm')
 * @returns {string} 格式化后的日期时间字符串或 'N/A'
 */
export function formatTimestamp(timestamp, fmt = 'MM-dd HH:mm') {
  if (!timestamp) return 'N/A';
  try {
    const date = (timestamp instanceof Date) ? timestamp : parseISO(timestamp);
    if (isNaN(date.getTime())) {
        console.warn("formatTimestamp received invalid date:", timestamp);
        return 'Invalid Date';
    }
    return format(date, fmt, { locale: zhCN });
  } catch (e) {
    console.warn("Error formatting timestamp:", timestamp, e);
    return 'Error';
  }
}

/**
 * 将总秒数格式化为 Xh Ym 或 Ym Zs 或 Zs 格式
 * @param {number | null | undefined} totalSeconds 总秒数
 * @returns {string} 格式化后的时长字符串
 */
export function formatDuration(totalSeconds) {
  const secondsNum = Number(totalSeconds || 0);
  if (isNaN(secondsNum) || secondsNum < 0) return '0s';

  const hours = Math.floor(secondsNum / 3600);
  const minutes = Math.floor((secondsNum % 3600) / 60);
  const seconds = Math.floor(secondsNum % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
     // return `${minutes}m ${seconds}s`; // 可选：显示秒
     return `${minutes}m`; // 当前：只显示分钟
  } else {
     return `${seconds}s`;
  }
}

/**
 * 将总秒数格式化为 HH:MM:SS
 * @param {number | null | undefined} totalSeconds 总秒数
 * @returns {string} HH:MM:SS 格式字符串
 */
export function formatSecondsToHHMMSS(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    if (isNaN(safeSeconds)) return '00:00:00';
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}