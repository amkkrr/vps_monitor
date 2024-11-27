// network_monitor/canvas/axis.js

import { formatBytes } from '../utils.js';

/**
 * 计算合适的刻度间隔
 * @param {number} maxValue - 数据最大值
 * @param {number} minSteps - 最小刻度数量
 * @param {number} maxSteps - 最大刻度数量
 * @returns {Object} 包含最终刻度数量和刻度间隔
 */
function calculateAxisSteps(maxValue, minSteps = 4, maxSteps = 8) {
    if (maxValue <= 0) return { stepSize: 1, steps: minSteps };

    // 处理小数据值的情况
    if (maxValue < 1) {
        const magnitude = Math.floor(Math.log10(maxValue));
        const normalizedValue = maxValue / Math.pow(10, magnitude);
        const stepSize = Math.pow(10, magnitude) * Math.ceil(normalizedValue / maxSteps);
        return { stepSize, steps: Math.ceil(maxValue / stepSize) };
    }

    // 获取数量级
    const magnitude = Math.floor(Math.log10(maxValue));
    const normalized = maxValue / Math.pow(10, magnitude);

    // 优化的刻度间隔选项
    const intervals = [1, 2, 2.5, 5, 10];
    let bestInterval = intervals[0];
    let bestSteps = Infinity;

    // 寻找最合适的刻度间隔
    for (const interval of intervals) {
        const steps = Math.ceil(normalized / interval);
        if (steps >= minSteps && steps <= maxSteps) {
            bestInterval = interval;
            bestSteps = steps;
            break;
        }
    }

    const stepSize = bestInterval * Math.pow(10, magnitude);
    const steps = Math.ceil(maxValue / stepSize);

    return { stepSize, steps };
}

/**
 * 计算标签旋转角度和位置
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Array} labels - 标签文本数组
 * @param {number} availableWidth - 可用宽度
 * @returns {Object} 旋转角度和位置调整信息
 */
function calculateLabelRotation(ctx, labels, availableWidth) {
    const maxLabelWidth = Math.max(...labels.map(label => ctx.measureText(label).width));
    const labelSpacing = availableWidth / (labels.length - 1);
    
    if (maxLabelWidth > labelSpacing) {
        return { rotation: -45, yOffset: 20 };
    }
    return { rotation: 0, yOffset: 5 };
}

/**
 * 绘制网格线和坐标轴
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Object} plotArea - 绘图区域定义
 * @param {number} maxValue - Y轴最大值
 * @param {Object} timeRange - 时间范围信息
 * @param {Object} style - 样式配置
 */
export function drawGridAndAxes(ctx, plotArea, maxValue, timeRange, style = {}) {
    const {
        gridColor = 'rgba(229, 231, 235, 0.6)',  // 提高网格线透明度
        axisColor = 'rgba(156, 163, 175, 0.9)',  // 提高坐标轴对比度
        textColor = 'rgba(75, 85, 99, 0.9)',     // 提高文字对比度
        fontSize = 12,
        fontFamily = 'Arial'
    } = style;

    // 计算Y轴刻度
    const { stepSize, steps } = calculateAxisSteps(maxValue);
    
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;

    // 计算Y轴标签最大宽度
    const maxYLabelWidth = Math.max(...Array.from({length: steps + 1}, (_, i) => 
        ctx.measureText(formatBytes(i * stepSize)).width));
    
    // 调整绘图区域以适应标签
    plotArea.left += maxYLabelWidth + 15;

    // 优化网格线密度
    const gridDensity = Math.min(steps, Math.floor((plotArea.bottom - plotArea.top) / 40));

    // 绘制Y轴刻度和网格线
    for (let i = 0; i <= gridDensity; i++) {
        const value = (i * maxValue) / gridDensity;
        const y = plotArea.bottom - ((value / maxValue) * (plotArea.bottom - plotArea.top));

        // 网格线
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.lineWidth = 0.5;
        ctx.moveTo(plotArea.left, y);
        ctx.lineTo(plotArea.right, y);
        ctx.stroke();

        // Y轴刻度标签
        ctx.fillStyle = textColor;
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText(formatBytes(value), plotArea.left - 8, y);
    }

    // 生成时间标签
    const timeLabels = Array.from({length: 6}, (_, i) => {
        const time = -Math.round((5 - i) * (timeRange / 5));
        return `${time}s`;
    });

    // 计算标签旋转
    const { rotation, yOffset } = calculateLabelRotation(
        ctx, 
        timeLabels,
        plotArea.right - plotArea.left
    );

    // 绘制X轴网格线和时间刻度
    timeLabels.forEach((label, i) => {
        const x = plotArea.left + ((plotArea.right - plotArea.left) * i / (timeLabels.length - 1));
        
        // 网格线
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.moveTo(x, plotArea.top);
        ctx.lineTo(x, plotArea.bottom);
        ctx.stroke();

        // 时间刻度标签
        ctx.save();
        ctx.translate(x, plotArea.bottom + yOffset);
        ctx.rotate(rotation * Math.PI / 180);
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(label, 0, 0);
        ctx.restore();
    });

    // 绘制坐标轴
    ctx.beginPath();
    ctx.strokeStyle = axisColor;
    ctx.lineWidth = 1;
    
    // Y轴
    ctx.moveTo(plotArea.left, plotArea.top);
    ctx.lineTo(plotArea.left, plotArea.bottom);
    
    // X轴
    ctx.moveTo(plotArea.left, plotArea.bottom);
    ctx.lineTo(plotArea.right, plotArea.bottom);
    
    ctx.stroke();

    // 添加坐标轴标题
    ctx.fillStyle = textColor;
    ctx.textAlign = 'center';
    
    // X轴标题
    ctx.fillText('时间 (秒)', 
        plotArea.left + (plotArea.right - plotArea.left) / 2, 
        plotArea.bottom + 40);
    
    // Y轴标题
    ctx.save();
    ctx.translate(plotArea.left - maxYLabelWidth - 30, 
        plotArea.top + (plotArea.bottom - plotArea.top) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('传输速率', 0, 0);
    ctx.restore();

    ctx.restore();
    
    // 返回更新后的绘图区域
    return plotArea;
}
