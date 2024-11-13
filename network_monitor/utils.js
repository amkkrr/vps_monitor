// network_monitor/utils.js

const BYTES_PER_UNIT = 1024;
const SIZE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];
const RATE_UNITS = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];

/**
 * 格式化速率数据
 * @param {number} bytesPerSecond - 每秒字节数
 * @param {number} [decimals=2] - 小数位数
 * @returns {string} 格式化后的速率字符串
 */
export function formatBytes(bytesPerSecond, decimals = 2) {
    // 处理边界情况
    if (!isFinite(bytesPerSecond) || bytesPerSecond === 0) return '0 B/s';
    bytesPerSecond = Math.abs(bytesPerSecond);

    // 计算单位级别
    const unitIndex = Math.floor(Math.log(bytesPerSecond) / Math.log(BYTES_PER_UNIT));
    
    // 确保不超出可用单位
    const clampedIndex = Math.min(unitIndex, RATE_UNITS.length - 1);
    
    // 计算显示值
    const value = bytesPerSecond / Math.pow(BYTES_PER_UNIT, clampedIndex);
    
    return `${value.toFixed(decimals)} ${RATE_UNITS[clampedIndex]}`;
}

/**
 * 格式化总量数据
 * @param {number} bytes - 字节数
 * @param {number} [decimals=2] - 小数位数
 * @returns {string} 格式化后的容量字符串
 */
export function formatTotalBytes(bytes, decimals = 2) {
    // 处理边界情况
    if (!isFinite(bytes) || bytes === 0) return '0 B';
    bytes = Math.abs(bytes);

    // 计算单位级别
    const unitIndex = Math.floor(Math.log(bytes) / Math.log(BYTES_PER_UNIT));
    
    // 确保不超出可用单位
    const clampedIndex = Math.min(unitIndex, SIZE_UNITS.length - 1);
    
    // 计算显示值
    const value = bytes / Math.pow(BYTES_PER_UNIT, clampedIndex);
    
    return `${value.toFixed(decimals)} ${SIZE_UNITS[clampedIndex]}`;
}

/**
 * 将数值四舍五入到最接近的整数刻度
 * @param {number} value - 输入值
 * @returns {number} 四舍五入后的刻度值
 */
export function roundToNiceNumber(value) {
    // 处理特殊情况
    if (!isFinite(value) || value === 0) return 1;
    if (value < 0) value = Math.abs(value);
    
    // 获取数量级
    const exponent = Math.floor(Math.log10(value));
    const fraction = value / Math.pow(10, exponent);
    
    // 选择合适的刻度
    let niceFraction;
    if (fraction <= 1.2) niceFraction = 1;
    else if (fraction <= 2.5) niceFraction = 2;
    else if (fraction <= 5) niceFraction = 5;
    else niceFraction = 10;
    
    // 计算最终结果
    const niceNumber = niceFraction * Math.pow(10, exponent);
    
    // 确保返回值至少为1
    return Math.max(1, niceNumber);
}