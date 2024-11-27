/**
 * 计算基于屏幕宽度的理想数据点数量
 * @param {number} width - 绘图区域宽度（像素）
 * @returns {number} 理想的数据点数量
 */
export function calculateIdealDataPoints(width) {
    // 假设每个数据点之间至少需要 30px 的间距来确保可读性
    const minPointSpacing = 30;
    // 计算可以容纳的数据点数量
    const idealPoints = Math.floor(width / minPointSpacing);
    // 确保至少有 20 个点，最多 200 个点
    return Math.max(20, Math.min(200, idealPoints));
}

/**
 * 根据目标点数重新采样数据
 * @param {Array} data - 原始数据数组
 * @param {number} targetPoints - 目标数据点数量
 * @returns {Array} 重新采样后的数据
 */
export function resampleData(data, targetPoints) {
    if (!data || data.length === 0 || targetPoints >= data.length) {
        return data;
    }

    const result = [];
    const step = data.length / targetPoints;

    for (let i = 0; i < targetPoints; i++) {
        const position = Math.floor(i * step);
        result.push(data[position]);
    }

    // 确保最后一个点被包含，以展示最新数据
    if (result[result.length - 1] !== data[data.length - 1]) {
        result[result.length - 1] = data[data.length - 1];
    }

    return result;
}

/**
 * 使用线性插值对数据进行平滑处理
 * @param {Array} data - 原始数据数组
 * @param {number} targetPoints - 目标数据点数量
 * @returns {Array} 平滑处理后的数据
 */
export function smoothData(data, targetPoints) {
    if (!data || data.length < 2 || targetPoints >= data.length) {
        return data;
    }

    const result = [];
    const step = (data.length - 1) / (targetPoints - 1);

    for (let i = 0; i < targetPoints; i++) {
        const position = i * step;
        const index = Math.floor(position);
        const fraction = position - index;

        if (index >= data.length - 1) {
            result.push(data[data.length - 1]);
            continue;
        }

        const value = data[index] + (data[index + 1] - data[index]) * fraction;
        result.push(value);
    }

    return result;
}
