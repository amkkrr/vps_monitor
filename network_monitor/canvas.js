// network_monitor/canvas.js

export function initializeCanvas(componentId) {
    const canvas = document.getElementById(`${componentId}_networkCanvas`);
    if (!canvas) {
        console.error(`Canvas with id "${componentId}_networkCanvas" not found.`);
        return null;
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get 2D context from canvas.');
        return null;
    }

    resizeCanvas(canvas, ctx);
    return { canvas, ctx };
}

export function resizeCanvas(canvas, ctx) {
    const container = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight || 350;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    // Reset and set scale
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
}

export function draw(ctx, canvas, uploadData, downloadData, maxValue, plotArea, yAxisSteps, roundToNiceNumber) {
    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    // Clear canvas with proper scaling
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();

    const roundedMax = roundToNiceNumber(maxValue);
    const stepSize = roundedMax / (yAxisSteps - 1);

    // Draw grid and axes
    drawGridAndAxes(ctx, width, height, plotArea, yAxisSteps, stepSize);

    // Draw data lines
    drawDataLines(ctx, uploadData, downloadData, maxValue, plotArea);
}

function drawGridAndAxes(ctx, width, height, plotArea, yAxisSteps, stepSize) {
    // Grid lines and Y-axis labels
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 0.5;
    ctx.fillStyle = '#666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let i = 0; i < yAxisSteps; i++) {
        const y = plotArea.bottom - ((plotArea.bottom - plotArea.top) * i / (yAxisSteps - 1));
        const value = stepSize * i;

        // Grid line
        ctx.beginPath();
        ctx.moveTo(plotArea.left, y);
        ctx.lineTo(plotArea.right, y);
        ctx.stroke();

        // Y-axis label
        ctx.fillText(formatBytes(value), plotArea.left - 10, y);
    }

    // X-axis grid lines
    const xSteps = 10;
    for (let i = 0; i <= xSteps; i++) {
        const x = plotArea.left + ((plotArea.right - plotArea.left) * i / xSteps);
        ctx.beginPath();
        ctx.moveTo(x, plotArea.top);
        ctx.lineTo(x, plotArea.bottom);
        ctx.stroke();
    }
}

function drawDataLines(ctx, uploadData, downloadData, maxValue, plotArea) {
    // Upload line (blue)
    drawLine(ctx, uploadData, '#60A5FA', maxValue, plotArea);
    
    // Download line (green)
    drawLine(ctx, downloadData, '#34D399', maxValue, plotArea);
}

function drawLine(ctx, data, color, maxValue, plotArea) {
    if (!data || !data.length) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(plotArea.left, plotArea.top, 
             plotArea.right - plotArea.left, 
             plotArea.bottom - plotArea.top);
    ctx.clip();

    const stepX = (plotArea.right - plotArea.left) / (data.length - 1);
    
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((value, index) => {
        const x = plotArea.left + index * stepX;
        const y = plotArea.bottom - ((value / maxValue) * (plotArea.bottom - plotArea.top));
        
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.stroke();
    ctx.restore();
}

function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s', 'TB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}