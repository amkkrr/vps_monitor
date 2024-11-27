// network_monitor/canvas/time.js

/**
 * 时间轴管理器类
 * 处理时间轴的显示、缩放和格式化
 */
export class TimeAxisManager {
    constructor() {
        // 默认配置
        this.config = {
            minTimeRange: 10,      // 最小时间范围（秒）
            maxTimeRange: 3600,    // 最大时间范围（秒）
            defaultRange: 100,     // 默认显示范围（秒）
            stepCount: 6,          // 时间刻度数量
            fontSize: 12,
            fontFamily: 'Arial',
            textColor: '#4B5563',
            labelFormat: 'auto',   // 可选: 'auto', 'seconds', 'time'
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone // 获取本地时区
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
     * @returns {Array} 时间刻度数组
     */
    calculateTimeSteps() {
        const steps = [];
        // 根据当前范围动态调整步长
        const stepSize = this.currentRange / (this.config.stepCount - 1);
        
        // 确保步长是整数秒
        const roundedStepSize = Math.round(stepSize);
        
        for (let i = 0; i < this.config.stepCount; i++) {
            steps.push(-this.currentRange + (i * roundedStepSize));
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
            return '当前';
        }

        const absSeconds = Math.abs(seconds);

        switch (this.config.labelFormat) {
            case 'seconds':
                return `${seconds}秒`;
                
            case 'time': {
                const date = new Date(Date.now() + seconds * 1000);
                return this.formatTimeWithTimeZone(date);
            }
                
            case 'auto':
            default:
                if (absSeconds < 60) {
                    return `${seconds}秒`;
                } else if (absSeconds < 3600) {
                    const minutes = Math.floor(absSeconds / 60);
                    const remainingSeconds = absSeconds % 60;
                    return remainingSeconds === 0 ? 
                        `${minutes}分钟前` : 
                        `${minutes}分${remainingSeconds}秒前`;
                } else {
                    const hours = Math.floor(absSeconds / 3600);
                    const minutes = Math.floor((absSeconds % 3600) / 60);
                    return minutes === 0 ? 
                        `${hours}小时前` : 
                        `${hours}小时${minutes}分前`;
                }
        }
    }

    /**
     * 使用本地时区格式化时间
     * @param {Date} date - 日期对象
     * @returns {string} 格式化的时间字符串
     */
    formatTimeWithTimeZone(date) {
        return new Intl.DateTimeFormat('zh-CN', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: this.config.timeZone
        }).format(date);
    }

    /**
     * 处理缩放事件
     * @param {WheelEvent} event - 滚轮事件对象
     * @returns {boolean} 是否进行了缩放
     */
    handleZoom(event) {
        const zoomSensitivity = 0.1;
        const zoomFactor = event.deltaY > 0 ? 
            (1 + zoomSensitivity) : 
            (1 - zoomSensitivity);

        const newRange = this.currentRange * zoomFactor;

        // 确保在有效范围内
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
        
        // 测量标签宽度以检测重叠
        const labels = timeSteps.map(t => this.formatTimeLabel(t));
        const labelWidths = labels.map(label => ctx.measureText(label).width);
        const timeStepPixels = (plotArea.right - plotArea.left) / (timeSteps.length - 1);
        
        // 检测是否需要旋转标签
        const needRotation = labelWidths.some(width => width > timeStepPixels);
        
        // 绘制标签
        timeSteps.forEach((seconds, index) => {
            const x = this.mapTimeToX(seconds, plotArea);
            const label = labels[index];
            
            if (needRotation) {
                // 旋转绘制标签
                ctx.save();
                ctx.translate(x, plotArea.bottom + 5);
                ctx.rotate(-Math.PI / 4);
                ctx.textAlign = 'right';
                ctx.textBaseline = 'middle';
                ctx.fillText(label, 0, 0);
                ctx.restore();
            } else {
                // 正常绘制标签
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(label, x, plotArea.bottom + 5);
            }
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
