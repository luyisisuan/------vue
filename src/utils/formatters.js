// src/utils/formatters.js
import { parseISO } from 'date-fns'; // parseISO 仍然可以用于处理带时区信息的字符串
import { formatInTimeZone, toDate } from 'date-fns-tz'; // <<< 使用 toDate
import { zhCN } from 'date-fns/locale';

/**
 * 格式化时间戳，并始终以北京时间 (Asia/Shanghai, UTC+8) 显示。
 * - 对于带时区信息的字符串 (如 ...Z, ...+08:00)，按其字面解析。
 * - 对于不带时区信息的字符串 (如 "2023-10-27T14:30:00" 或 "2023-10-27 14:30:00")，
 *   此版本假定它们代表的是北京时间，并使用 toDate 进行解析。
 * - 对于 Date 对象或数字时间戳，直接处理。
 *
 * @param {string | Date | number | null | undefined} timestamp - 输入的时间戳。
 * @param {string} fmt - 期望的输出格式字符串 (可选, 默认为 'yyyy-MM-dd HH:mm:ss')。
 * @returns {string} 格式化后的北京时间日期字符串，或错误提示。
 */
export function formatTimestamp(timestamp, fmt = 'yyyy-MM-dd HH:mm:ss') {
  // console.log('原始输入到 formatTimestamp:', timestamp, '| 类型:', typeof timestamp);

  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'N/A';
  }

  const beijingTimeZone = 'Asia/Shanghai';
  let dateObjectUtc; // 这将是代表UTC时间点的Date对象

  try {
    if (timestamp instanceof Date) {
      // 如果已经是 Date 对象，我们假设它代表一个绝对时间点 (UTC)
      // 或者需要根据创建方式判断。为了简单，先直接用。
      // 如果这个 Date 对象本身就是本地时间，且你想将其视为北京时间，
      // 你可能需要先用 toDate(timestamp.toISOString(), { timeZone: beijingTimeZone })
      // 但通常 Date 对象直接传递给 formatInTimeZone 是没问题的，因为它会被视为UTC或系统本地时间。
      dateObjectUtc = timestamp;
    } else if (typeof timestamp === 'number') {
      // Unix 毫秒时间戳总是UTC的
      dateObjectUtc = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      const trimmedTimestamp = timestamp.trim();
      const hasTimezoneInfo = /Z|([+-]\d{2}:?\d{2})$/.test(trimmedTimestamp);
      const stringToParseWithT = trimmedTimestamp.replace(' ', 'T');

      if (hasTimezoneInfo) {
        // Case 1: 字符串包含明确的时区信息
        // parseISO 会正确处理这些，返回一个代表该绝对时间点的 Date 对象 (内部以UTC存储)
        dateObjectUtc = parseISO(stringToParseWithT);
      } else {
        // Case 2: 字符串不包含明确的时区信息 (e.g., "2025-05-22T18:43:40.191393")
        // 我们假定这个字符串代表的是北京时间。
        // 使用 date-fns-tz 的 toDate 函数，并提供 timeZone 选项。
        // toDate 会将这个“北京时间字符串”解析为一个正确的 UTC Date 对象。
        dateObjectUtc = toDate(stringToParseWithT, { timeZone: beijingTimeZone });
      }
    } else {
      console.warn("formatTimestamp: 不支持的输入类型:", typeof timestamp, timestamp);
      return 'Invalid Input';
    }

    // 检查最终解析的 Date 对象是否有效
    if (isNaN(dateObjectUtc.getTime())) {
      console.warn("formatTimestamp: 从输入值解析得到无效日期。原始输入:", timestamp, "解析后的dateObjectUtc:", dateObjectUtc);
      return 'Invalid Date';
    }

    // 将 Date 对象 (它现在代表一个正确的UTC时间点) 格式化为北京时间的字符串表示
    return formatInTimeZone(dateObjectUtc, beijingTimeZone, fmt, { locale: zhCN });

  } catch (e) {
    console.error("formatTimestamp 格式化时间戳时出错。原始输入:", timestamp, "错误信息:", e.message, e);
    return 'Error';
  }
}

// formatDuration 和 formatSecondsToHHMMSS 函数保持不变
// ... (复制你现有的 formatDuration 和 formatSecondsToHHMMSS 函数到这里) ...
export function formatDuration(totalSeconds) {
  const secondsNum = Number(totalSeconds || 0);
  if (isNaN(secondsNum) || secondsNum < 0) {
    return '0s';
  }
  const safeTotalSeconds = Math.floor(secondsNum);
  if (safeTotalSeconds === 0) {
    return '0s';
  }
  const hours = Math.floor(safeTotalSeconds / 3600);
  const minutes = Math.floor((safeTotalSeconds % 3600) / 60);
  const seconds = safeTotalSeconds % 60;
  const parts = [];
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }
  return parts.join(' ');
}

export function formatSecondsToHHMMSS(totalSeconds) {
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    if (isNaN(safeSeconds)) {
        return '00:00:00';
    }
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');
    return `${hoursStr}:${minutesStr}:${secondsStr}`;
}