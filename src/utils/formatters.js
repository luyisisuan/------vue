// src/utils/formatters.js
import { format, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale'; // 引入中文语言包

/**
 * 格式化时间戳。
 * 会尝试将输入的 ISO 字符串、Date 对象或 Unix 毫秒时间戳，
 * 转换为用户本地时区的可读日期时间字符串。
 *
 * 核心逻辑：如果输入是字符串且不包含时区信息 (如 'Z' 或 '+08:00')，
 * 则假定该时间是 UTC 时间，并添加 'Z' 后再解析，
 * 确保 date-fns 能正确将其转换为本地时间显示。
 *
 * @param {string | Date | number | null | undefined} timestamp - 输入的时间戳。
 *   可以是 ISO 8601 格式的字符串 (如 '2023-10-27T06:30:00Z', '2023-10-27T14:30:00+08:00', 或 '2023-10-27T06:30:00')，
 *   也可以是 JavaScript 的 Date 对象，或 Unix 时间戳 (毫秒)。
 * @param {string} fmt - 期望的输出格式字符串，遵循 date-fns 的格式规范 (可选, 默认为 'MM-dd HH:mm')。
 * @returns {string} 格式化后的日期时间字符串，如果输入无效则返回 'N/A', 'Invalid Input', 'Invalid Date' 或 'Error'。
 */
export function formatTimestamp(timestamp, fmt = 'MM-dd HH:mm') {
  // 处理空值或空字符串
  if (timestamp === null || timestamp === undefined || timestamp === '') {
    return 'N/A';
  }

  try {
    let date; // 用于存储解析后的 Date 对象

    // 1. 判断输入类型并解析为 Date 对象
    if (timestamp instanceof Date) {
      // 输入已经是 Date 对象
      date = timestamp;
    } else if (typeof timestamp === 'number') {
      // 输入是数字，假定为 Unix 毫秒时间戳
      date = new Date(timestamp);
    } else if (typeof timestamp === 'string') {
      // 输入是字符串，尝试按 ISO 8601 解析
      // *** 关键改动：处理无时区信息的字符串 ***
      // 使用正则表达式检查字符串是否已包含时区指示符 ('Z' 或 +/-HH:mm)
      const hasTimezone = /Z|([+-]\d{2}:?\d{2})$/.test(timestamp); // 修正正则以匹配可选的冒号
      // 如果没有时区信息，则在末尾添加 'Z'，告诉 parseISO 将其视为 UTC 时间
      const isoString = hasTimezone ? timestamp : timestamp + 'Z';
      date = parseISO(isoString); // 使用修正后的字符串进行解析
    } else {
       // 处理其他不支持的输入类型
       console.warn("formatTimestamp 函数接收到不支持的类型:", typeof timestamp, timestamp);
       return 'Invalid Input'; // 返回明确的错误信息
    }

    // 2. 检查解析后的 Date 对象是否有效
    if (isNaN(date.getTime())) {
        console.warn("formatTimestamp 函数从输入值解析得到无效日期:", timestamp);
        return 'Invalid Date'; // 表明日期解析失败
    }

    // 3. 使用 date-fns 进行格式化
    // format 函数会自动将 Date 对象的时间（内部是 UTC 基准）转换为用户本地时区进行显示
    return format(date, fmt, { locale: zhCN }); // 使用中文语言包

  } catch (e) {
    // 捕获 parseISO 或其他步骤可能抛出的异常
    console.error("格式化时间戳时出错:", timestamp, e); // 使用 console.error 更合适
    return 'Error'; // 返回通用错误信息
  }
}

/**
 * 将总秒数格式化为易读的时长字符串。
 * 例如：1h 5m 30s, 15m 10s, 45s, 或 0s。
 * @param {number | null | undefined} totalSeconds - 总秒数。
 * @returns {string} 格式化后的时长字符串。
 */
export function formatDuration(totalSeconds) {
  // 确保输入是数字，并处理 null/undefined/负数/NaN
  const secondsNum = Number(totalSeconds || 0);
  if (isNaN(secondsNum) || secondsNum < 0) {
    return '0s'; // 对无效输入或负数返回 '0s'
  }

  // 使用整数秒进行计算
  const safeTotalSeconds = Math.floor(secondsNum);

  // 处理 0 秒的特殊情况
  if (safeTotalSeconds === 0) {
    return '0s';
  }

  // 计算小时、分钟、秒
  const hours = Math.floor(safeTotalSeconds / 3600);
  const minutes = Math.floor((safeTotalSeconds % 3600) / 60);
  const seconds = safeTotalSeconds % 60;

  // 使用数组存储要显示的部分
  const parts = [];

  // 如果有小时，添加到数组
  if (hours > 0) {
    parts.push(`${hours}h`);
  }
  // 如果有分钟，添加到数组
  if (minutes > 0) {
    parts.push(`${minutes}m`);
  }
  // 如果秒数大于0，或者前面没有任何部分（即总时长小于1分钟），则添加秒数
  // 这样可以确保即使只有几秒也会显示，例如 "5s"
  if (seconds > 0 || parts.length === 0) {
    parts.push(`${seconds}s`);
  }

  // 将所有部分用空格连接起来
  return parts.join(' ');
}

/**
 * 将总秒数格式化为 HH:MM:SS 格式的字符串。
 * 例如：01:05:30, 00:15:10, 00:00:45。
 * @param {number | null | undefined} totalSeconds - 总秒数。
 * @returns {string} HH:MM:SS 格式的字符串。
 */
export function formatSecondsToHHMMSS(totalSeconds) {
    // 确保秒数有效且为非负整数
    const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds || 0)));
    // 检查是否为 NaN，如果是则返回 '00:00:00'
    if (isNaN(safeSeconds)) {
        return '00:00:00';
    }

    // 计算时、分、秒
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const seconds = safeSeconds % 60;

    // 使用 padStart 补零，确保每个部分都是两位数格式
    const hoursStr = String(hours).padStart(2, '0');
    const minutesStr = String(minutes).padStart(2, '0');
    const secondsStr = String(seconds).padStart(2, '0');

    return `${hoursStr}:${minutesStr}:${secondsStr}`;
}