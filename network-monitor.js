// network-monitor.js
import APIManager from './api-manager.js';
import { initializeUI, updateUI } from './network_monitor/ui.js';
import { initializeCanvas, draw, resizeCanvas } from './network_monitor/canvas.js';
import { handleData, simulateData } from './network_monitor/dataProcessor.js';
import { formatBytes, formatTotalBytes, roundToNiceNumber } from './network_monitor/utils.js';
import TrafficStats from './network_monitor/traffic-stats.js';
import { createTrafficStatsTable, updateTrafficStatsTable } from './network_monitor/traffic-stats-ui.js';

class NetworkMonitor {
    static componentCounter = 0;

    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            throw new Error(`Container with id "${containerId}" not found.`);
        }

        // 生成唯一的 componentId
        this.componentId = `networkMonitor_${NetworkMonitor.componentCounter++}`;

        // 初始化状态
        this.lastData = { bytes_sent: 0, bytes_recv: 0, timestamp: 0 };
        this.uploadData = new Array(100).fill(0);
        this.downloadData = new Array(100).fill(0);
        this.maxDataPoints = 100;
        this.isRunning = true;
        this.currentSpeed = { upload: 0, download: 0 };
        this.totalSent = 0;
        this.totalReceived = 0;
        this.bytesSentSinceReboot = 0;
        this.bytesReceivedSinceReboot = 0;
        this.yAxisWidth = 75;
        this.padding = {
            top: 30,
            right: 20,
            bottom: 30,
            left: 10
        };
        this.animationFrameId = null;

        this.isSubscribed = false;

        // 初始化流量统计
        this.trafficStats = new TrafficStats();

        // 初始化UI
        console.log('Initializing UI...');
        initializeUI(this.container, this.componentId, () => this.toggleMonitoring());

        // 添加统计表格到UI
        this.container.insertAdjacentHTML('beforeend', createTrafficStatsTable(this.componentId));
        console.log('UI initialized.');

        // 初始化画布
        console.log('Initializing Canvas...');
        const canvasObj = initializeCanvas(this.componentId);
        if (canvasObj) {
            this.canvas = canvasObj.canvas;
            this.ctx = canvasObj.ctx;
            this.resizeHandler = () => {
                resizeCanvas(this.canvas, this.ctx);
                this.scheduleRedraw();
            };
            window.addEventListener('resize', this.resizeHandler);
            console.log('Canvas initialized.');
        } else {
            console.error('Canvas initialization failed.');
            return;
        }

        // 开始监控
        this.startMonitoring();
    }

    // 使用导入的工具函数
    formatBytes = formatBytes;
    formatTotalBytes = formatTotalBytes;
    roundToNiceNumber = roundToNiceNumber;

    scheduleRedraw() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        this.animationFrameId = requestAnimationFrame(() => this.draw());
    }

    processData(newData) {
        const { timestamp, network } = newData;
        const bytes_sent = network.bytes_sent;
        const bytes_recv = network.bytes_recv;

        if (this.lastData.timestamp !== 0) {
            const timeDiff = timestamp - this.lastData.timestamp;
            if (timeDiff > 0) {
                const uploadDiff = Math.max(0, bytes_sent - this.lastData.bytes_sent);
                const downloadDiff = Math.max(0, bytes_recv - this.lastData.bytes_recv);

                this.currentSpeed.upload = uploadDiff / timeDiff;
                this.currentSpeed.download = downloadDiff / timeDiff;

                // 累计上传和下载（自监控开始）
                this.totalSent += uploadDiff;
                this.totalReceived += downloadDiff;

                // 更新数据数组
                this.uploadData.push(this.currentSpeed.upload);
                this.downloadData.push(this.currentSpeed.download);
                
                if (this.uploadData.length > this.maxDataPoints) this.uploadData.shift();
                if (this.downloadData.length > this.maxDataPoints) this.downloadData.shift();

                // 更新流量统计
                this.trafficStats.addDataPoint(Date.now(), this.currentSpeed.upload, this.currentSpeed.download);
            }
        }

        this.lastData = {
            bytes_sent,
            bytes_recv,
            timestamp
        };

        // 更新系统累计流量
        this.bytesSentSinceReboot = bytes_sent;
        this.bytesReceivedSinceReboot = bytes_recv;

        // 更新 UI 和图表
        this.updateUI();
        this.scheduleRedraw();

        // 更新流量统计表格
        const stats = this.trafficStats.getAllStats();
        updateTrafficStatsTable(this.componentId, stats, this.formatBytes, this.formatTotalBytes);
    }

    updateUI() {
        const peakUpload = Math.max(...this.uploadData, 0);
        const peakDownload = Math.max(...this.downloadData, 0);

        const uiData = {
            uploadSpeed: this.formatBytes(this.currentSpeed.upload),
            downloadSpeed: this.formatBytes(this.currentSpeed.download),
            peakUpload: this.formatBytes(peakUpload),
            peakDownload: this.formatBytes(peakDownload),
            totalSent: this.formatTotalBytes(this.totalSent),
            totalReceived: this.formatTotalBytes(this.totalReceived),
            bytesSentSinceReboot: this.formatTotalBytes(this.bytesSentSinceReboot),
            bytesReceivedSinceReboot: this.formatTotalBytes(this.bytesReceivedSinceReboot)
        };

        updateUI(this.componentId, uiData);
    }

    draw() {
        const maxUpload = Math.max(...this.uploadData, 0);
        const maxDownload = Math.max(...this.downloadData, 0);
        const maxValue = Math.max(maxUpload, maxDownload) || 1000000;
        const dpr = window.devicePixelRatio || 1;
        
        const plotArea = {
            left: (this.yAxisWidth + this.padding.left) * dpr,
            top: this.padding.top * dpr,
            right: (this.canvas.width / dpr - this.padding.right) * dpr,
            bottom: (this.canvas.height / dpr - this.padding.bottom) * dpr
        };
        const yAxisSteps = 5;

        draw(
            this.ctx,
            this.canvas,
            this.uploadData,
            this.downloadData,
            maxValue,
            plotArea,
            yAxisSteps,
            this.roundToNiceNumber,
            this.drawLine.bind(this)
        );
    }

    drawLine(ctx, data, color, maxValue, plotArea) {
        if (!data.length) return;
        
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();

        const stepX = (plotArea.right - plotArea.left) / (this.maxDataPoints - 1);
        const dpr = window.devicePixelRatio || 1;

        data.forEach((value, index) => {
            const x = plotArea.left + index * stepX;
            const y = plotArea.bottom - ((value / maxValue) * (plotArea.bottom - plotArea.top));

            if (index === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
        });

        ctx.stroke();
    }

    toggleMonitoring() {
        this.isRunning = !this.isRunning;
        const btn = document.getElementById(`${this.componentId}_toggleBtn`);
        if (btn) {
            btn.textContent = this.isRunning ? 'Pause' : 'Resume';
        }

        if (this.isRunning) {
            this.startMonitoring();
        } else {
            this.stopMonitoring();
        }
    }

    startMonitoring() {
        if (!this.isSubscribed) {
            APIManager.subscribe(this.componentId, (data) => handleData(data, this));
            this.isSubscribed = true;
        }
    }

    stopMonitoring() {
        if (this.isSubscribed) {
            APIManager.unsubscribe(this.componentId);
            this.isSubscribed = false;
        }
    }

    simulateData() {
        simulateData(this);
    }

    destroy() {
        this.stopMonitoring();
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        window.removeEventListener('resize', this.resizeHandler);
        this.container.innerHTML = '';
    }
}

export default NetworkMonitor;
