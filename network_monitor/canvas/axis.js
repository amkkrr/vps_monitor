import { formatBytes } from '../utils.js';

/**
 * 计算合适的刻度间隔
 * @param {number} maxValue - 数据最大值
 * @param {number} minSteps - 最小刻度数量
 * @param {number} maxSteps - 最大刻度数量
 * @returns {Object} 包含最终刻度数量和刻度间隔
 */
function calculateAxisSteps(maxValue, minSteps = 4, maxSteps = 10) {
    if (maxValue <= 0) return { stepSize: 1, steps: minSteps };

    // 获取数量级
    const magnitude = Math.floor(Math.log10(maxValue));
    const normalized = maxValue / Math.pow(10, magnitude);

    // 可能的刻度间隔
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
 * 绘制网格线和坐标轴
 * @param {CanvasRenderingContext2D} ctx - Canvas 上下文
 * @param {Object} plotArea - 绘图区域定义
 * @param {number} maxValue - Y轴最大值
 * @param {Object} timeRange - 时间范围信息
 * @param {Object} style - 样式配置
 */
export function drawGridAndAxes(ctx, plotArea, maxValue, timeRange, style = {}) {
    const {
        gridColor = '#E5E7EB',
        axisColor = '#9CA3AF',
        textColor = '#4B5563',
        fontSize = 12,
        fontFamily = 'Arial'
    } = style;

    // 计算Y轴刻度
    const { stepSize, steps } = calculateAxisSteps(maxValue);
    
    ctx.save();
    ctx.font = `${fontSize}px ${fontFamily}`;

    // 绘制Y轴刻度和网格线
    for (let i = 0; i <= steps; i++) {
        const value = i * stepSize;
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
        ctx.fillText(formatBytes(value), plotArea.left - 10, y);
    }

    // 绘制X轴网格线和时间刻度
    const timeSteps = 6; // 时间轴刻度数量
    for (let i = 0; i <= timeSteps; i++) {
        const x = plotArea.left + ((plotArea.right - plotArea.left) * i / timeSteps);
        
        // 网格线
        ctx.beginPath();
        ctx.strokeStyle = gridColor;
        ctx.moveTo(x, plotArea.top);
        ctx.lineTo(x, plotArea.bottom);
        ctx.stroke();

        // 时间刻度标签
        const timeValue = -Math.round((timeSteps - i) * (timeRange / timeSteps));
        ctx.fillStyle = textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${timeValue}s`, x, plotArea.bottom + 5);
    }

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
        plotArea.bottom + 30);
    
    // Y轴标题
    ctx.save();
    ctx.translate(plotArea.left - 45, 
        plotArea.top + (plotArea.bottom - plotArea.top) / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('传输速率', 0, 0);
    ctx.restore();

    ctx.restore();
}
