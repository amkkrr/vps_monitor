// network_monitor/canvas/renderer.js

import { calculateIdealDataPoints, resampleData, smoothData } from './scale.js';
import { drawGridAndAxes } from './axis.js';
import { TooltipManager } from './tooltip.js';
import { LegendManager } from './legend.js';
import { TimeAxisManager } from './time.js';

/**
 * 网络监控图表渲染器类
 */
export class NetworkChartRenderer {
    /**
     * 初始化渲染器
     * @param {HTMLCanvasElement} canvas - Canvas 元素
     */
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        
        // 基本配置
        this.config = {
            padding: {
                top: 30,
                right: 20,
                bottom: 30,
                left: 60
            },
            colors: {
                upload: '#60A5FA',    // 上传速度颜色
                download: '#34D399',   // 下载速度颜色
                grid: '#E5E7EB',      // 网格线颜色
                axis: '#9CA3AF',      // 坐标轴颜色
                text: '#4B5563'       // 文本颜色
            },
            targetFPS: 60,            // 目标刷新率
            maxDataPoints: 1000,      // 最大数据点数
            lineWidth: 2,             // 线条宽度
            smoothingFactor: 0.3,     // 平滑系数
            minRedrawInterval: 16,    // 最小重绘间隔(ms)
            redrawThrottle: 100       // 重绘节流时间(ms)
        };

        // 管理器初始化
        this.tooltip = new TooltipManager(canvas);
        this.legend = new LegendManager();
        this.timeAxis = new TimeAxisManager();

        // 状态变量
        this.data = {
            raw: {
                upload: [],
                download: [],
                timestamps: []
            },
            processed: {
                upload: [],
                download: [],
                timestamps: []
            }
        };
        
        this.viewState = {
            start: 0,          // 视图起始位置
            scale: 1,          // 缩放比例
            isDragging: false, // 拖动状态
            lastX: 0,         // 上次鼠标X位置
            translate: 0       // 平移距离
        };

        this.renderState = {
            needsUpdate: false,   // 是否需要更新
            lastDrawTime: 0,      // 上次绘制时间
            animationFrame: null  // 动画帧ID
        };

        // 初始化事件和尺寸
        this._initializeEvents();
        this._resizeCanvas();
        this._startRenderLoop();
    }

    /**
     * 初始化事件监听
     * @private
     */
    _initializeEvents() {
        // 防抖的resize处理
        let resizeTimeout;
        window.addEventListener('resize', () => {
            if (resizeTimeout) {
                clearTimeout(resizeTimeout);
            }
            resizeTimeout = setTimeout(() => {
                this._resizeCanvas();
                this._processData();
                this._requestRender();
            }, 250);
        });

        // 鼠标事件
        this.canvas.addEventListener('wheel', this._handleWheel.bind(this));
        this.canvas.addEventListener('mousedown', this._handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this._handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this._handleMouseUp.bind(this));
        this.canvas.addEventListener('mouseleave', this._handleMouseLeave.bind(this));
    }

    /**
     * 调整Canvas大小
     * @private
     */
    _resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = `${rect.width}px`;
        this.canvas.style.height = `${rect.height}px`;
        
        this.ctx.scale(dpr, dpr);
    }

    /**
     * 开始渲染循环
     * @private
     */
    _startRenderLoop() {
        const loop = (timestamp) => {
            if (this.renderState.needsUpdate &&
                timestamp - this.renderState.lastDrawTime > this.config.minRedrawInterval) {
                this._render();
                this.renderState.lastDrawTime = timestamp;
                this.renderState.needsUpdate = false;
            }
            this.renderState.animationFrame = requestAnimationFrame(loop);
        };
        this.renderState.animationFrame = requestAnimationFrame(loop);
    }

    /**
     * 处理滚轮事件
     * @private
     * @param {WheelEvent} event - 滚轮事件
     */
    _handleWheel(event) {
        event.preventDefault();
        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        
        // 计算缩放
        const scaleFactor = event.deltaY > 0 ? 0.9 : 1.1;
        const newScale = Math.max(0.1, Math.min(10, this.viewState.scale * scaleFactor));
        
        // 根据鼠标位置调整视图
        if (newScale !== this.viewState.scale) {
            const viewportPoint = (mouseX - this.viewState.translate) / this.viewState.scale;
            const scaleDiff = newScale - this.viewState.scale;
            this.viewState.translate -= viewportPoint * scaleDiff;
            this.viewState.scale = newScale;
            
            this._requestRender();
        }
    }

    /**
     * 处理鼠标按下事件
     * @private
     * @param {MouseEvent} event - 鼠标事件
     */
    _handleMouseDown(event) {
        this.viewState.isDragging = true;
        this.viewState.lastX = event.clientX;
    }

    /**
     * 处理鼠标移动事件
     * @private
     * @param {MouseEvent} event - 鼠标事件
     */
    _handleMouseMove(event) {
        if (this.viewState.isDragging) {
            const dx = event.clientX - this.viewState.lastX;
            this.viewState.translate += dx;
            this.viewState.lastX = event.clientX;
            this._requestRender();
        }
    }

    /**
     * 处理鼠标抬起事件
     * @private
     */
    _handleMouseUp() {
        this.viewState.isDragging = false;
    }

    /**
     * 处理鼠标离开事件
     * @private
     */
    _handleMouseLeave() {
        this.viewState.isDragging = false;
    }

    /**
     * 请求重新渲染
     * @private
     */
    _requestRender() {
        this.renderState.needsUpdate = true;
    }

    /**
     * 处理数据
     * @private
     */
    _processData() {
        const plotArea = this._calculatePlotArea();
        const idealPoints = calculateIdealDataPoints(plotArea.right - plotArea.left);
        
        // 如果数据量超过限制，进行重采样
        if (this.data.raw.upload.length > this.config.maxDataPoints) {
            this.data.processed = {
                upload: smoothData(this.data.raw.upload, idealPoints),
                download: smoothData(this.data.raw.download, idealPoints),
                timestamps: resampleData(this.data.raw.timestamps, idealPoints)
            };
        } else {
            // 否则直接使用原始数据
            this.data.processed = {
                upload: [...this.data.raw.upload],
                download: [...this.data.raw.download],
                timestamps: [...this.data.raw.timestamps]
            };
        }
    }

    /**
     * 计算绘图区域
     * @private
     * @returns {Object} 绘图区域的边界
     */
    _calculatePlotArea() {
        const dpr = window.devicePixelRatio || 1;
        return {
            left: this.config.padding.left,
            top: this.config.padding.top,
            right: (this.canvas.width / dpr) - this.config.padding.right,
            bottom: (this.canvas.height / dpr) - this.config.padding.bottom
        };
    }

    /**
     * 绘制数据线
     * @private
     * @param {Object} plotArea - 绘图区域
     * @param {number} maxValue - 最大值
     */
    _drawDataLines(plotArea) {
        const width = plotArea.right - plotArea.left;
        const height = plotArea.bottom - plotArea.top;
        
        // 找出当前视图中的最大值
        const maxValue = Math.max(
            Math.max(...this.data.processed.upload),
            Math.max(...this.data.processed.download)
        ) || 1;

        // 创建路径对象
        const uploadPath = new Path2D();
        const downloadPath = new Path2D();

        // 计算并绘制数据线
        const drawLine = (data, path) => {
            let firstPoint = true;
            data.forEach((value, index) => {
                const x = plotArea.left + (index * width / (data.length - 1)) * this.viewState.scale + this.viewState.translate;
                const y = plotArea.bottom - (value / maxValue * height);
                
                if (firstPoint) {
                    path.moveTo(x, y);
                    firstPoint = false;
                } else {
                    path.lineTo(x, y);
                }
            });
        };

        // 绘制上传和下载速度线
        drawLine(this.data.processed.upload, uploadPath);
        drawLine(this.data.processed.download, downloadPath);

        // 设置样式并绘制
        this.ctx.lineWidth = this.config.lineWidth;
        this.ctx.strokeStyle = this.config.colors.upload;
        this.ctx.stroke(uploadPath);
        this.ctx.strokeStyle = this.config.colors.download;
        this.ctx.stroke(downloadPath);
    }

    /**
     * 渲染图表
     * @private
     */
    _render() {
        // 清除画布
        const dpr = window.devicePixelRatio || 1;
        this.ctx.clearRect(0, 0, this.canvas.width / dpr, this.canvas.height / dpr);

        // 获取绘图区域
        const plotArea = this._calculatePlotArea();

        // 计算最大值
        const maxValue = Math.max(
            Math.max(...this.data.processed.upload),
            Math.max(...this.data.processed.download)
        ) || 1;

        // 绘制网格和坐标轴
        drawGridAndAxes(this.ctx, plotArea, maxValue, {
            gridColor: this.config.colors.grid,
            axisColor: this.config.colors.axis,
            textColor: this.config.colors.text
        });

        // 绘制数据线
        this._drawDataLines(plotArea);

        // 绘制图例和时间轴
        this.legend.draw(this.ctx, this.canvas.width / dpr, this.canvas.height / dpr);
        this.timeAxis.draw(this.ctx, plotArea);

        // 更新工具提示数据
        this.tooltip.updateData(this.data.processed, plotArea);
    }

    /**
     * 更新数据
     * @param {Array} uploadData - 上传速度数据
     * @param {Array} downloadData - 下载速度数据
     * @param {Array} timestamps - 时间戳数据
     */
    updateData(uploadData, downloadData, timestamps) {
        this.data.raw = {
            upload: [...uploadData],
            download: [...downloadData],
            timestamps: [...timestamps]
        };

        this._processData();
        this._requestRender();
    }

    /**
     * 销毁渲染器，清理资源
     */
    destroy() {
        // 停止渲染循环
        if (this.renderState.animationFrame) {
            cancelAnimationFrame(this.renderState.animationFrame);
        }

        // 清理工具提示
        if (this.tooltip) {
            this.tooltip.destroy();
        }

        // 清除画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // 移除所有引用
        this.canvas = null;
        this.ctx = null;
        this.data = null;
        this.tooltip = null;
        this.legend = null;
        this.timeAxis = null;
    }
}
