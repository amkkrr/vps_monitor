// network_monitor/canvas/renderer.js

import { calculateIdealDataPoints, resampleData, smoothData } from './scale.js';
import { drawGridAndAxes } from './axis.js';
import { TooltipManager } from './tooltip.js';
import { LegendManager } from './legend.js';
import { TimeAxisManager } from './time.js';

/**
 * 网络监控图表渲染器
 */
export class NetworkChartRenderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 初始化各个管理器
        this.tooltip = new TooltipManager(canvas);
        this.legend = new LegendManager();
        this.timeAxis = new TimeAxisManager();

        // 图表数据
        this.data = {
            uploadData: [],
            downloadData: [],
            timestamps: []
        };

        // 图表配置
        this.config = {
            padding: {
                top: 30,
                right: 20,
                bottom: 30,
                left: 60
            },
            colors: {
                upload: '#60A5FA',    // 蓝色
                download: '#34D399',   // 绿色
                grid: '#E5E7EB',      // 网格线颜色
                axis: '#9CA3AF',      // 坐标轴颜色
                text: '#4B5563'       // 文字颜色
            },
            lineWidth: 2,
            animationDuration: 300    // 动画持续时间（毫秒）
        };

        // 绑定事件
        this.bindEvents();
    }

    /**
     * 绑定事件处理器
     */
    bindEvents() {
        // 处理窗口大小变化
        window.addEventListener('resize', this.handleResize.bind(this));
        
        // 处理鼠标滚轮缩放
        this.canvas.addEventListener('wheel', (event) => {
            event.preventDefault();
            if (this.timeAxis.handleZoom(event)) {
                this.draw();
            }
        });
    }

    /**
     * 处理窗口大小变化
     */
    handleResize() {
        this.resizeCanvas();
        this.draw();
    }

    /**
     * 调整画布大小
     */
    resizeCanvas() {
        const container = this.canvas.parentElement;
        const dpr = window.devicePixelRatio || 1;
        
        // 设置画布大小
        this.canvas.width = container.clientWidth * dpr;
        this.canvas.height = container.clientHeight * dpr;
        this.canvas.style.width = `${container.clientWidth}px`;
        this.canvas.style.height = `${container.clientHeight}px`;
        
        // 应用设备像素比
        this.ctx.scale(dpr, dpr);
    }

    /**
     * 计算绘图区域
     * @returns {Object} 绘图区域的边界
     */
    calculatePlotArea() {
        const dpr = window.devicePixelRatio || 1;
        return {
            left: this.config.padding.left,
            top: this.config.padding.top,
            right: (this.canvas.width / dpr) - this.config.padding.right,
            bottom: (this.canvas.height / dpr) - this.config.padding.bottom
        };
    }

    /**
     * 更新数据
     * @param {Array} uploadData - 上传速度数据
     * @param {Array} downloadData - 下载速度数据
     * @param {Array} timestamps - 时间戳数据
     */
    updateData(uploadData, downloadData, timestamps) {
        this.data = {
            uploadData: [...uploadData],
            downloadData: [...downloadData],
            timestamps: [...timestamps]
        };
        
        // 计算理想的数据点数量
        const plotArea = this.calculatePlotArea();
        const idealPoints = calculateIdealDataPoints(plotArea.right - plotArea.left);
        
        // 如果需要，对数据进行重采样
        if (uploadData.length > idealPoints) {
            this.data.uploadData = smoothData(uploadData, idealPoints);
            this.data.downloadData = smoothData(downloadData, idealPoints);
            this.data.timestamps = resampleData(timestamps, idealPoints);
        }

        // 更新tooltip数据
        this.tooltip.updateData(this.data, plotArea);
        
        // 触发重绘
        this.draw();
    }

    /**
     * 绘制图表
     */
    draw() {
        // 清除画布
        const dpr = window.devicePixelRatio || 1;
        this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

        // 计算绘图区域
        const plotArea = this.calculatePlotArea();

        // 计算数据范围
        const maxValue = Math.max(
            Math.max(...this.data.uploadData),
            Math.max(...this.data.downloadData)
        );

        // 绘制网格和坐标轴
        drawGridAndAxes(
            this.ctx,
            plotArea,
            maxValue,
            this.timeAxis.getCurrentRange(),
            {
                gridColor: this.config.colors.grid,
                axisColor: this.config.colors.axis,
                textColor: this.config.colors.text
            }
        );

        // 绘制数据线
        this.drawDataLines(plotArea, maxValue);

        // 绘制图例
        this.legend.draw(
            this.ctx,
            this.canvas.width / dpr,
            this.canvas.height / dpr
        );

        // 绘制时间轴
        this.timeAxis.draw(this.ctx, plotArea);
    }

    /**
     * 绘制数据线
     * @param {Object} plotArea - 绘图区域
     * @param {number} maxValue - 最大值
     */
    drawDataLines(plotArea, maxValue) {
        const timeRange = this.timeAxis.getCurrentRange();
        const width = plotArea.right - plotArea.left;
        const height = plotArea.bottom - plotArea.top;

        // 绘制上传速度线
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.config.colors.upload;
        this.ctx.lineWidth = this.config.lineWidth;
        this.data.uploadData.forEach((value, index) => {
            const x = plotArea.left + (index * width / (this.data.uploadData.length - 1));
            const y = plotArea.bottom - (value / maxValue * height);
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        this.ctx.stroke();

        // 绘制下载速度线
        this.ctx.beginPath();
        this.ctx.strokeStyle = this.config.colors.download;
        this.data.downloadData.forEach((value, index) => {
            const x = plotArea.left + (index * width / (this.data.downloadData.length - 1));
            const y = plotArea.bottom - (value / maxValue * height);
            
            if (index === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        });
        this.ctx.stroke();
    }

    /**
     * 销毁渲染器
     */
    destroy() {
        // 移除事件监听器
        window.removeEventListener('resize', this.handleResize.bind(this));
        this.canvas.removeEventListener('wheel', this.handleWheel.bind(this));
        
        // 销毁管理器
        this.tooltip.destroy();
        
        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
}
