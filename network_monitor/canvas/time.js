// network_monitor/canvas/time.js

/**
 * 时间轴管理器类
 */
export class TimeAxisManager {
    constructor() {
        // 默认配置
        this.config = {
            minTimeRange: 30,     // 最小时间范围（秒）
            maxTimeRange: 3600,   // 最大时间范围（秒）
            defaultRange: 100,    // 默认显示范围（秒）
            stepCount: 6,         // 时间刻度数量
            fontSize: 12,
            fontFamily: 'Arial',
            textColor: '#4B5563',
            labelFormat: 'auto'   // 可选: 'auto', 'seconds', 'time'
        };

        this.currentRange = this.config.defaultRange;
        this.zoomLevel = 1;
    }

    /**
     * 设置配置项
     * @param {Object} newConfig - 新的配置对象
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        this.currentRange = Math.min(
            Math.max(this.currentRange, this.config.minTimeRange),
            this.config.maxTimeRange
        );
    }

    /**
     * 计算时间刻度
     * @param {number} timeRange - 时间范围（秒）
     * @returns {Array} 时间刻度数组
     */
    calculateTimeSteps() {
        const steps = [];
        const stepSize = this.currentRange / this.config.stepCount;

        for (let i = 0; i <= this.config.stepCount; i++) {
            steps.push(-this.currentRange + (i * stepSize));
        }

        return steps;
    }

    /**
     * 格式化时间标签
     * @param {number} seconds - 相对当前时间的秒数
     * @returns {string} 格式化后的时间标签
     */
    formatTimeLabel(seconds) {
        if (seconds === 0) {
            return '现在';
        }

        switch (this.config.labelFormat) {
            case 'seconds':
                return `${seconds}秒`;
            case 'time':
                const date = new Date(Date.now() + seconds * 1000);
                return date.toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            case 'auto':
            default:
                if (Math.abs(seconds) < 60) {
                    return `${seconds}秒`;
                } else if (Math.abs(seconds) < 3600) {
                    const minutes = Math.floor(Math.abs(seconds) / 60);
                    const remainingSeconds = Math.abs(seconds) % 60;
                    return remainingSeconds === 0 ? 
                        `${minutes}分钟` : 
                        `${minutes}分${remainingSeconds}秒`;
                } else {
                    const hours = Math.floor(Math.abs(seconds) / 3600);
                    const minutes = Math.floor((Math.abs(seconds) % 3600) / 60);
                    return minutes === 0 ? 
                        `${hours}小时` : 
                        `${hours}小时${minutes}分`;
                }
        }
    }

    /**
     * 处理缩放事件
     * @param {WheelEvent} event - 滚轮事件对象
     */
    handleZoom(event) {
        const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;
        const newRange = this.currentRange * zoomFactor;

        if (newRange >= this.config.minTimeRange && 
            newRange <= this.config.maxTimeRange) {
            this.currentRange = newRange;
            return true;
        }
        return false;
    }

    /**
     * 绘制时间轴
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {Object} plotArea - 绘图区域
     */
    draw(ctx, plotArea) {
        const timeSteps = this.calculateTimeSteps();
        
        ctx.save();
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
        ctx.fillStyle = this.config.textColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // 计算标签位置和绘制标签
        timeSteps.forEach(seconds => {
            const x = this.mapTimeToX(seconds, plotArea);
            const label = this.formatTimeLabel(seconds);
            
            ctx.fillText(label, x, plotArea.bottom + 5);
        });

        ctx.restore();
    }

    /**
     * 将时间映射到X坐标
     * @param {number} seconds - 相对当前时间的秒数
     * @param {Object} plotArea - 绘图区域
     * @returns {number} X坐标
     */
    mapTimeToX(seconds, plotArea) {
        const ratio = (seconds + this.currentRange) / this.currentRange;
        return plotArea.left + (plotArea.right - plotArea.left) * ratio;
    }

    /**
     * 将X坐标映射到时间
     * @param {number} x - X坐标
     * @param {Object} plotArea - 绘图区域
     * @returns {number} 相对当前时间的秒数
     */
    mapXToTime(x, plotArea) {
        const ratio = (x - plotArea.left) / (plotArea.right - plotArea.left);
        return (ratio * this.currentRange) - this.currentRange;
    }

    /**
     * 获取当前时间范围
     * @returns {number} 当前时间范围（秒）
     */
    getCurrentRange() {
        return this.currentRange;
    }

    /**
     * 设置时间范围
     * @param {number} range - 新的时间范围（秒）
     */
    setTimeRange(range) {
        this.currentRange = Math.min(
            Math.max(range, this.config.minTimeRange),
            this.config.maxTimeRange
        );
    }
}
