// network_monitor/canvas/tooltip.js

import { formatBytes } from '../utils.js';

/**
 * 提示框管理器类
 */
export class TooltipManager {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.visible = false;
        this.x = 0;
        this.y = 0;
        this.data = null;
        this.plotArea = null;

        // 提示框样式配置
        this.style = {
            background: 'rgba(0, 0, 0, 0.8)',
            textColor: '#FFFFFF',
            borderRadius: 4,
            padding: 8,
            fontSize: 12,
            fontFamily: 'Arial',
            maxWidth: 200
        };

        // 绑定鼠标事件
        this.bindEvents();
    }

    /**
     * 绑定鼠标事件
     */
    bindEvents() {
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseout', this.handleMouseOut.bind(this));
    }

    /**
     * 处理鼠标移动事件
     * @param {MouseEvent} event - 鼠标事件对象
     */
    handleMouseMove(event) {
        const rect = this.canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        if (this.isInPlotArea(x, y)) {
            const dataPoint = this.findNearestDataPoint(x);
            if (dataPoint) {
                this.show(x, y, dataPoint);
            } else {
                this.hide();
            }
        } else {
            this.hide();
        }
    }

    /**
     * 处理鼠标离开事件
     */
    handleMouseOut() {
        this.hide();
    }

    /**
     * 检查坐标是否在绘图区域内
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @returns {boolean} 是否在绘图区域内
     */
    isInPlotArea(x, y) {
        if (!this.plotArea) return false;
        return x >= this.plotArea.left &&
               x <= this.plotArea.right &&
               y >= this.plotArea.top &&
               y <= this.plotArea.bottom;
    }

    /**
     * 查找最近的数据点
     * @param {number} x - X坐标
     * @returns {Object|null} 找到的数据点
     */
    findNearestDataPoint(x) {
        if (!this.data || !this.plotArea) return null;

        const { uploadData, downloadData, timestamps } = this.data;
        const { left, right } = this.plotArea;
        
        // 计算x位置对应的数据索引
        const dataWidth = right - left;
        const index = Math.round((x - left) / dataWidth * (uploadData.length - 1));
        
        if (index >= 0 && index < uploadData.length) {
            return {
                upload: uploadData[index],
                download: downloadData[index],
                timestamp: timestamps[index],
                index
            };
        }

        return null;
    }

    /**
     * 显示提示框
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {Object} dataPoint - 数据点信息
     */
    show(x, y, dataPoint) {
        this.visible = true;
        this.x = x;
        this.y = y;
        
        // 格式化要显示的数据
        const time = new Date(dataPoint.timestamp);
        const timeStr = time.toLocaleTimeString();
        
        const lines = [
            `时间: ${timeStr}`,
            `上传: ${formatBytes(dataPoint.upload)}`,
            `下载: ${formatBytes(dataPoint.download)}`
        ];

        // 绘制提示框
        this.ctx.save();
        
        // 设置字体
        this.ctx.font = `${this.style.fontSize}px ${this.style.fontFamily}`;
        
        // 计算提示框大小
        const lineHeight = this.style.fontSize * 1.4;
        const maxLineWidth = Math.max(...lines.map(line => this.ctx.measureText(line).width));
        const boxWidth = maxLineWidth + (this.style.padding * 2);
        const boxHeight = (lines.length * lineHeight) + (this.style.padding * 2);

        // 调整提示框位置，确保不超出画布
        let tooltipX = x + 10;
        let tooltipY = y - boxHeight - 10;

        if (tooltipX + boxWidth > this.canvas.width) {
            tooltipX = x - boxWidth - 10;
        }
        if (tooltipY < 0) {
            tooltipY = y + 10;
        }

        // 绘制背景
        this.ctx.fillStyle = this.style.background;
        this.roundRect(
            tooltipX,
            tooltipY,
            boxWidth,
            boxHeight,
            this.style.borderRadius
        );

        // 绘制文本
        this.ctx.fillStyle = this.style.textColor;
        this.ctx.textBaseline = 'top';
        lines.forEach((line, index) => {
            this.ctx.fillText(
                line,
                tooltipX + this.style.padding,
                tooltipY + this.style.padding + (index * lineHeight)
            );
        });

        this.ctx.restore();
    }

    /**
     * 隐藏提示框
     */
    hide() {
        this.visible = false;
    }

    /**
     * 绘制圆角矩形
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {number} radius - 圆角半径
     */
    roundRect(x, y, width, height, radius) {
        this.ctx.beginPath();
        this.ctx.moveTo(x + radius, y);
        this.ctx.arcTo(x + width, y, x + width, y + height, radius);
        this.ctx.arcTo(x + width, y + height, x, y + height, radius);
        this.ctx.arcTo(x, y + height, x, y, radius);
        this.ctx.arcTo(x, y, x + width, y, radius);
        this.ctx.closePath();
        this.ctx.fill();
    }

    /**
     * 更新提示框数据和绘图区域信息
     * @param {Object} data - 图表数据
     * @param {Object} plotArea - 绘图区域信息
     */
    updateData(data, plotArea) {
        this.data = data;
        this.plotArea = plotArea;
    }

    /**
     * 销毁提示框管理器
     */
    destroy() {
        this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.removeEventListener('mouseout', this.handleMouseOut.bind(this));
    }
}
