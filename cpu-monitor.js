// cpu-monitor.js

import APIManager from './api-manager.js';

class CPUMonitor {
    // 静态属性用于生成唯一的 componentId
    static componentCounter = 0;

    constructor(containerId) {
        // 基础配置
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Container with ID "${containerId}" not found.`);
            return;
        }

        // 唯一的组件标识
        this.componentId = `cpuMonitor_${CPUMonitor.componentCounter++}`;
        this.isSubscribed = false; // 追踪订阅状态

        // 数据存储
        this.cpuData = {
            percent: 0,        // 总体CPU使用率
            perCore: [],       // 每个核心的使用率
            frequencies: [],   // CPU频率
            loadAvg: [],       // 负载平均值历史
            stats: {},
            count: {},
            times: {}
        };
        this.loadHistory = [];
        this.maxDataPoints = 100; // 保存100个历史数据点

        // 图表配置
        this.chartConfig = {
            padding: {
                top: 30,
                right: 20,
                bottom: 30,
                left: 60
            },
            colors: {
                primary: '#3B82F6',    // 蓝色
                secondary: '#34D399',  // 绿色
                warning: '#F59E0B',    // 黄色
                danger: '#EF4444',     // 红色
                grid: '#E5E7EB',       // 网格线颜色
                text: '#666666'        // 文字颜色
            }
        };

        // 初始化组件
        this.initializeUI();
        this.initializeCanvases();
        this.handleData = this.handleData.bind(this); // 绑定回调
        this.subscribeToAPI(); // 启动监控
    }

    initializeUI() {
        this.container.innerHTML = `
            <style>
                /* Responsive Layout */
                @media (max-width: 768px) {
                    .charts-row {
                        flex-direction: column;
                    }
                    .chart-card {
                        height: 200px !important;
                    }
                }
            </style>
            <div class="cpu-monitor" style="font-family: Arial, sans-serif;">
                <div class="header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div class="title" style="font-size: 18px; font-weight: bold;">
                        CPU Monitor
                        <span style="font-size: 14px; color: #666;">(Updates every 1s)</span>
                    </div>
                    <button id="cpuToggleBtn" style="padding: 6px 12px; font-size: 14px; cursor: pointer;">Pause</button>
                </div>
                
                <div class="cpu-overview" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-bottom: 20px;">
                    <div class="stat-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Total CPU Usage</h3>
                        <div id="totalCpuUsage" style="font-size: 24px; font-weight: bold;">0%</div>
                    </div>
                    <div class="stat-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">CPU Cores</h3>
                        <div id="cpuCores" style="font-size: 16px;">
                            Physical: 0 | Logical: 0
                        </div>
                    </div>
                    <div class="stat-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                        <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Load Average</h3>
                        <div id="loadAverage" style="font-size: 16px;">
                            1m: 0.00 | 5m: 0.00 | 15m: 0.00
                        </div>
                    </div>
                </div>

                <div class="charts-container" style="display: grid; grid-template-columns: 2fr 1fr; gap: 20px;">
                    <div class="main-charts" style="display: flex; flex-direction: column; gap: 20px;">
                        <!-- 已移除 CPU Usage History 相关内容 -->

                        <!-- CPU 核心使用率柱状图 -->
                        <div class="chart-card" style="height: 250px; background: #ffffff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Per Core Usage</h3>
                            <canvas id="cpuCoresCanvas" style="width: 100%; height: 100%;"></canvas>
                        </div>

                        <!-- Load Trend Chart -->
                        <div class="chart-card" style="height: 200px; background: #ffffff; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">Load Trend</h3>
                            <canvas id="loadTrendCanvas" style="width: 100%; height: 100%;"></canvas>
                        </div>
                    </div>
                    
                    <div class="side-stats" style="display: flex; flex-direction: column; gap: 20px;">
                        <div class="chart-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">CPU Stats</h3>
                            <div id="cpuStats" style="font-size: 14px; line-height: 1.6;"></div>
                        </div>
                        <div class="chart-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">CPU Frequencies</h3>
                            <div id="cpuFreq" style="font-size: 14px; line-height: 1.6;"></div>
                        </div>
                        <!-- 添加其他统计信息元素 -->
                        <div class="chart-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">CPU Physical Cores</h3>
                            <div id="cpuPhysicalCores" style="font-size: 14px; line-height: 1.6;">Physical Cores: 0</div>
                        </div>
                        <div class="chart-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">CPU Logical Cores</h3>
                            <div id="cpuLogicalCores" style="font-size: 14px; line-height: 1.6;">Logical Cores: 0</div>
                        </div>
                        <div class="chart-card" style="background: #f9fafb; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
                            <h3 style="margin: 0 0 10px 0; font-size: 14px; color: #666;">CPU Times</h3>
                            <div id="cpuTimes" style="font-size: 14px; line-height: 1.6;">User: 0h 0m 0s<br>System: 0h 0m 0s<br>Idle: 0h 0m 0s<br>IO Wait: N/A<br>IRQ: N/A<br>Soft IRQ: N/A</div>
                        </div>
                    </div>
                </div>
            `;

            // 添加事件监听器
            document.getElementById('cpuToggleBtn').addEventListener('click', () => this.toggleMonitoring());
        }

        initializeCanvases() {
            // 初始化每个核心使用率 Canvas
            this.coresCanvas = document.getElementById('cpuCoresCanvas');
            this.coresCtx = this.coresCanvas ? this.coresCanvas.getContext('2d') : null;

            // 初始化负载趋势 Canvas
            this.loadCanvas = document.getElementById('loadTrendCanvas');
            this.loadCtx = this.loadCanvas ? this.loadCanvas.getContext('2d') : null; // 修正此处

            // 设置 Canvas 尺寸
            this.resizeCanvases();
            window.addEventListener('resize', () => this.resizeCanvases());
        }

        resizeCanvases() {
            const dpr = window.devicePixelRatio || 1;

            // 设置每个核心使用率 Canvas 尺寸
            if (this.coresCanvas && this.coresCtx) {
                const coresContainer = this.coresCanvas.parentElement;
                this.coresCtx.setTransform(1, 0, 0, 1, 0, 0); // 重置缩放
                this.coresCanvas.width = coresContainer.clientWidth * dpr;
                this.coresCanvas.height = coresContainer.clientHeight * dpr;
                this.coresCanvas.style.width = coresContainer.clientWidth + 'px';
                this.coresCanvas.style.height = coresContainer.clientHeight + 'px';
                this.coresCtx.scale(dpr, dpr);
            }

            // 设置负载趋势 Canvas 尺寸
            if (this.loadCanvas && this.loadCtx) {
                const loadContainer = this.loadCanvas.parentElement;
                this.loadCtx.setTransform(1, 0, 0, 1, 0, 0); // 重置缩放
                this.loadCanvas.width = loadContainer.clientWidth * dpr;
                this.loadCanvas.height = loadContainer.clientHeight * dpr;
                this.loadCanvas.style.width = loadContainer.clientWidth + 'px';
                this.loadCanvas.style.height = loadContainer.clientHeight + 'px';
                this.loadCtx.scale(dpr, dpr);
            }
        }

        // 处理来自 APIManager 的数据
        handleData(data) {
            if (!data || !data.cpu) {
                console.error('Invalid data format received:', data);
                // 在 UI 中显示错误信息
                document.getElementById('cpuStats').textContent = '接收到的数据格式不正确';
                return;
            }

            try {
                this.processData(data);
                this.updateUI();
            } catch (error) {
                console.error('Error processing data:', error);
                document.getElementById('cpuStats').textContent = '处理 CPU 数据时出错';
            }
        }

        processData(data) {
            const { cpu } = data;
            console.log('Processing CPU Data:', cpu);

            // 更新总体CPU使用率
            this.cpuData.percent = cpu.percent;

            // 更新每个核心的使用率
            this.cpuData.perCore = cpu.per_cpu_percent;

            // 更新频率信息
            this.cpuData.frequencies = cpu.frequencies;

            // 更新负载历史
            this.cpuData.loadAvg.push(cpu.load_avg);
            if (this.cpuData.loadAvg.length > this.maxDataPoints) {
                this.cpuData.loadAvg.shift();
            }
            this.loadHistory = this.cpuData.loadAvg;

            // 保存其他CPU信息
            this.cpuData.stats = cpu.stats;
            this.cpuData.count = cpu.count;
            this.cpuData.times = cpu.times; // 确保 times 被正确保存
        }

        formatNumber(number, decimals = 2) {
            return number.toLocaleString(undefined, {
                minimumFractionDigits: decimals,
                maximumFractionDigits: decimals
            });
        }

        formatFrequency(mhz) {
            return `${(mhz / 1000).toFixed(2)} GHz`;
        }

        formatTime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = Math.floor(seconds % 60);
            return `${hours}h ${minutes}m ${remainingSeconds}s`;
        }

        // 获取CPU使用率对应的颜色
        getUsageColor(percent) {
            if (percent >= 90) return '#EF4444';      // 红色
            if (percent >= 70) return '#F59E0B';      // 橙色
            if (percent >= 50) return '#10B981';      // 绿色
            return '#60A5FA';                         // 蓝色
        }

        // UI更新方法
        updateUI() {
            console.log('Updating UI...');
            const data = this.cpuData;

            // 更新总体CPU使用率
            document.getElementById('totalCpuUsage').textContent = 
                `${this.formatNumber(data.percent)}%`;

            // 更新CPU核心信息
            document.getElementById('cpuCores').textContent = 
                `Physical: ${data.count.physical} | Logical: ${data.count.logical}`;

            // 更新负载平均值
            const lastLoadAvg = data.loadAvg[data.loadAvg.length - 1];
            document.getElementById('loadAverage').textContent = 
                `1m: ${this.formatNumber(lastLoadAvg[0])} | 5m: ${this.formatNumber(lastLoadAvg[1])} | 15m: ${this.formatNumber(lastLoadAvg[2])}`;

            // 更新CPU统计信息
            document.getElementById('cpuStats').innerHTML = `
                Context Switches: ${this.formatNumber(data.stats.ctx_switches)}<br>
                Interrupts: ${this.formatNumber(data.stats.interrupts)}<br>
                Soft Interrupts: ${this.formatNumber(data.stats.soft_interrupts)}<br>
                Syscalls: ${this.formatNumber(data.stats.syscalls)}
            `;

            // 更新CPU频率信息
            const freqHtml = data.frequencies.map((freq, index) => `
                Core ${index}: ${this.formatFrequency(freq.current)} 
                (Min: ${freq.min > 0 ? this.formatFrequency(freq.min) : 'N/A'} | Max: ${freq.max > 0 ? this.formatFrequency(freq.max) : 'N/A'})
            `).join('<br>');
            document.getElementById('cpuFreq').innerHTML = freqHtml;

            // 更新CPU物理和逻辑核心数
            document.getElementById('cpuPhysicalCores').textContent = 
                `Physical Cores: ${data.count.physical}`;
            document.getElementById('cpuLogicalCores').textContent = 
                `Logical Cores: ${data.count.logical}`;

            // 更新CPU时间信息
            if (data.times) { // 修正为 data.times 而非 data.stats.times
                const times = data.times;
                document.getElementById('cpuTimes').innerHTML = `
                    User: ${this.formatTime(times.user)}<br>
                    System: ${this.formatTime(times.system)}<br>
                    Idle: ${this.formatTime(times.idle)}<br>
                    IO Wait: ${times.iowait > 0 ? this.formatTime(times.iowait) : 'N/A'}<br>
                    IRQ: ${times.irq > 0 ? this.formatTime(times.irq) : 'N/A'}<br>
                    Soft IRQ: ${times.softirq > 0 ? this.formatTime(times.softirq) : 'N/A'}
                `;
            }

            // 更新图表
            this.drawCoreUsage();
            this.drawLoadTrend();
        }

        // 绘制CPU核心使用率柱状图
        drawCoreUsage() {
            console.log('Drawing Core Usage...');
            if (!this.coresCtx || !this.coresCanvas) {
                console.error('CPU Cores Canvas or Context not initialized.');
                return;
            }

            const ctx = this.coresCtx;
            const canvas = this.coresCanvas;
            const padding = { top: 20, right: 20, bottom: 40, left: 50 };
            const width = (canvas.width / (window.devicePixelRatio || 1)) - padding.left - padding.right;
            const height = (canvas.height / (window.devicePixelRatio || 1)) - padding.top - padding.bottom;
            const coreCount = this.cpuData.perCore.length;
            if (coreCount === 0) {
                console.warn('No per-core usage data available.');
                return;
            }
            const barWidth = (width / coreCount) * 0.6;
            const gap = (width / coreCount) * 0.4;

            // 清除画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 绘制Y轴
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top);
            ctx.lineTo(padding.left, padding.top + height);
            ctx.stroke();

            // 绘制Y轴刻度和网格线
            ctx.fillStyle = '#6B7280';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (height * (5 - i) / 5);
                const value = i * 20;
                ctx.fillText(`${value}%`, padding.left - 10, y);
                
                // 绘制网格线
                ctx.strokeStyle = '#E5E7EB';
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + width, y);
                ctx.stroke();
            }

            // 绘制X轴
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(padding.left, padding.top + height);
            ctx.lineTo(padding.left + width, padding.top + height);
            ctx.stroke();

            // 绘制每个核心的使用率柱状
            this.cpuData.perCore.forEach((usage, index) => {
                const x = padding.left + index * (barWidth + gap) + gap / 2;
                const barHeight = (height * usage) / 100;
                const y = padding.top + height - barHeight;

                // 创建渐变
                const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight);
                gradient.addColorStop(0, '#34D399'); // 绿色
                gradient.addColorStop(1, '#10B981'); // 深绿色

                // 绘制柱状
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, barWidth, barHeight);

                // 绘制核心标签
                ctx.fillStyle = '#6B7280';
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'top';
                ctx.fillText(`Core ${index}`, x + barWidth / 2, padding.top + height + 5);
                
                // 绘制使用率数值
                ctx.fillStyle = '#1F2937';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`${Math.round(usage)}%`, x + barWidth / 2, y - 5);
            });

            // 添加X轴标题
            ctx.fillStyle = '#6B7280';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'bottom';
            ctx.fillText('CPU Cores', padding.left + width / 2, padding.top + height + 30);
        }

        // 绘制负载趋势图
        drawLoadTrend() {
            console.log('Drawing Load Trend...');
            if (!this.loadCtx || !this.loadCanvas) {
                console.error('Load Trend Canvas or Context not initialized.');
                return;
            }

            const ctx = this.loadCtx;
            const canvas = this.loadCanvas;
            const padding = { top: 20, right: 20, bottom: 40, left: 60 };
            const width = (canvas.width / (window.devicePixelRatio || 1)) - padding.left - padding.right;
            const height = (canvas.height / (window.devicePixelRatio || 1)) - padding.top - padding.bottom;

            // 清除画布
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (this.loadHistory.length === 0) {
                console.warn('No load average data available.');
                return;
            }

            // 找到最大负载值用于缩放
            const maxLoad = Math.max(
                ...this.loadHistory.map(data => Math.max(...(data || [0, 0, 0])))
            );
            const yScale = height / (maxLoad || 1);

            // 绘制网格和轴
            this.drawGridAndAxes(ctx, canvas, padding, maxLoad);

            // 绘制负载曲线
            const timePoints = this.loadHistory.length;
            const xStep = timePoints > 1 ? width / (timePoints - 1) : 0;

            const drawLoadLine = (index, color) => {
                ctx.beginPath();
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';

                this.loadHistory.forEach((data, i) => {
                    const x = padding.left + i * xStep;
                    const y = padding.top + height - (data[index] || 0) * yScale;
                    
                    if (i === 0) ctx.moveTo(x, y);
                    else ctx.lineTo(x, y);
                });

                ctx.stroke();

                // 绘制数据点
                this.loadHistory.forEach((data, i) => {
                    const x = padding.left + i * xStep;
                    const y = padding.top + height - (data[index] || 0) * yScale;
                    ctx.beginPath();
                    ctx.arc(x, y, 3, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                });
            };

            // 绘制1分钟、5分钟和15分钟负载曲线
            drawLoadLine(0, '#60A5FA'); // 1min
            drawLoadLine(1, '#34D399'); // 5min
            drawLoadLine(2, '#F472B6'); // 15min

            // 绘制图例
            this.drawLoadLegend(ctx, padding);
        }

        // 绘制负载图例
        drawLoadLegend(ctx, padding) {
            const legendItems = [
                { color: '#60A5FA', label: '1 min' },
                { color: '#34D399', label: '5 min' },
                { color: '#F472B6', label: '15 min' }
            ];

            let x = padding.left;
            const y = padding.top - 15;

            legendItems.forEach(item => {
                // 绘制色块
                ctx.fillStyle = item.color;
                ctx.fillRect(x, y - 8, 12, 12);

                // 绘制文字
                ctx.fillStyle = '#6B7280';
                ctx.font = '12px Arial';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.label, x + 16, y);

                x += 80;
            });
        }

        // 绘制网格和坐标轴
        drawGridAndAxes(ctx, canvas, padding, maxValue) {
            const width = (canvas.width / (window.devicePixelRatio || 1)) - padding.left - padding.right;
            const height = (canvas.height / (window.devicePixelRatio || 1)) - padding.top - padding.bottom;

            // 绘制Y轴网格和标签
            ctx.strokeStyle = '#E5E7EB';
            ctx.fillStyle = '#6B7280';
            ctx.font = '12px Arial';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';

            for (let i = 0; i <= 5; i++) {
                const y = padding.top + (height * i / 5);
                const value = (maxValue * (5 - i) / 5).toFixed(2);

                // 绘制网格线
                ctx.beginPath();
                ctx.moveTo(padding.left, y);
                ctx.lineTo(padding.left + width, y);
                ctx.stroke();

                // 绘制标签
                ctx.fillText(value, padding.left - 10, y);
            }

            // 绘制X轴网格和标签
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            const timePoints = this.loadHistory.length;
            const xStep = timePoints > 1 ? width / (timePoints - 1) : 0;

            for (let i = 0; i < timePoints; i += Math.ceil(timePoints / 5)) {
                const x = padding.left + i * xStep;
                
                // 绘制网格线
                ctx.beginPath();
                ctx.moveTo(x, padding.top);
                ctx.lineTo(x, padding.top + height);
                ctx.stroke();

                // 计算时间标签
                const secondsAgo = Math.round((timePoints - i - 1) * this.updateInterval / 1000);
                ctx.fillText(`-${secondsAgo}s`, x, padding.top + height + 5);
            }

            // 添加轴标题
            ctx.fillStyle = '#6B7280';
            ctx.font = '14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText('Time Ago', padding.left + width / 2, padding.top + height + 25);
            ctx.save();
            ctx.rotate(-Math.PI / 2);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Load Average', -padding.top - height / 2, padding.left - 40);
            ctx.restore();
        }

        // 使用 APIManager 的订阅机制替代原有的轮询
        subscribeToAPI() {
            if (typeof APIManager === 'undefined' || !APIManager.subscribe) {
                console.error('APIManager is not available or does not support subscribe method.');
                return;
            }

            APIManager.subscribe(this.componentId, this.handleData);
            this.isSubscribed = true;
            console.log(`Subscribed to APIManager with componentId: ${this.componentId}`);
        }

        unsubscribeFromAPI() {
            if (typeof APIManager === 'undefined' || !APIManager.unsubscribe) {
                console.error('APIManager is not available or does not support unsubscribe method.');
                return;
            }

            APIManager.unsubscribe(this.componentId);
            this.isSubscribed = false;
            console.log(`Unsubscribed from APIManager with componentId: ${this.componentId}`);
        }

        // 切换监控状态
        toggleMonitoring() {
            this.isSubscribed = !this.isSubscribed;
            const btn = document.getElementById('cpuToggleBtn');
            btn.textContent = this.isSubscribed ? 'Pause' : 'Resume';

            if (this.isSubscribed) {
                this.subscribeToAPI();
            } else {
                this.unsubscribeFromAPI();
            }
        }

        // 销毁组件，清理订阅和事件监听
        destroy() {
            this.unsubscribeFromAPI();
            window.removeEventListener('resize', this.resizeCanvases);
            const btn = document.getElementById('cpuToggleBtn');
            if (btn) {
                btn.removeEventListener('click', this.toggleMonitoring);
            }
            this.container.innerHTML = ''; // 清空容器内容
            console.log(`Destroyed CPUMonitor with componentId: ${this.componentId}`);
        }
    }

    // 导出 CPUMonitor 作为默认导出
    export default CPUMonitor;
