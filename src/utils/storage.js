// src/utils/storage.js

/**
 * 从 localStorage 加载数据
 * @param {string} key localStorage 键名
 * @param {*} defaultValue 默认值
 * @returns {*} 解析后的数据或默认值
 */
export function loadData(key, defaultValue = null) {
  const savedData = localStorage.getItem(key);
  if (savedData) {
    try {
      return JSON.parse(savedData);
    } catch (e) {
      console.error(`Error parsing data for key ${key}:`, e);
      localStorage.removeItem(key); // 移除损坏的数据
      // 返回默认值的深拷贝（如果是对象/数组）
      return deepCopyDefault(defaultValue);
    }
  }
  // 返回默认值的深拷贝（如果是对象/数组）
  return deepCopyDefault(defaultValue);
}

/**
 * 将数据保存到 localStorage
 * @param {string} key localStorage 键名
 * @param {*} data 要保存的数据
 */
export function saveData(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.error(`Error saving data for key ${key}:`, e);
    // 考虑添加用户反馈，例如空间已满
    // alert("无法保存数据，可能是本地存储空间已满。");
  }
}

/**
 * 生成一个简单的客户端唯一 ID
 * @returns {string} 格式如 'id_1678886400000_randomstring'
 */
export function generateId() {
  // 结合时间戳和随机字符串，在客户端通常足够唯一
  return `id_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// --- 内部辅助函数 ---

/**
 * 深拷贝默认值，防止对象或数组类型的默认值被意外修改
 * @param {*} value 默认值
 * @returns {*} 深拷贝后的值或原始值（如果不是对象/数组）
 */
function deepCopyDefault(value) {
  if (typeof value === 'object' && value !== null) {
    try {
      // 使用 JSON 方法进行简单深拷贝，适用于纯数据对象/数组
      return JSON.parse(JSON.stringify(value));
    } catch (copyError) {
      console.error("Error deep copying default value:", copyError);
      return value; // 拷贝失败则返回原始默认值
    }
  }
  // 对于非对象/数组类型，直接返回原值
  return value;
}

// 如果还有其他需要导出的工具函数，可以在这里添加并导出
// export function anotherUtility() { ... }