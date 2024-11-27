// network_monitor/canvas/legend.js

/**
 * 图例配置类
 */
export class LegendManager {
    constructor() {
        // 默认配置
        this.config = {
            position: 'top-right', // 可选: 'top-left', 'top-right', 'bottom-left', 'bottom-right'
            layout: 'horizontal',  // 可选: 'horizontal', 'vertical'
            margin: 10,           // 与画布边缘的距离
            padding: 8,           // 内边距
            itemSpacing: 20,      // 图例项之间的间距
            symbolSize: 12,       // 图例标记的大小
            fontSize: 12,
            fontFamily: 'Arial',
            textColor: '#374151',
            background: 'rgba(255, 255, 255, 0.9)',
            borderRadius: 4
        };

        // 默认图例项
        this.items = [
            { label: '上传速度', color: '#60A5FA' },
            { label: '下载速度', color: '#34D399' }
        ];
    }

    /**
     * 设置图例配置
     * @param {Object} newConfig - 新的配置对象
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
    }

    /**
     * 设置图例项
     * @param {Array} items - 图例项数组
     */
    setItems(items) {
        this.items = items;
    }

    /**
     * 计算图例尺寸
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @returns {Object} 图例的宽度和高度
     */
    calculateSize(ctx) {
        ctx.save();
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;

        let totalWidth = 0;
        let totalHeight = 0;
        const symbolSize = this.config.symbolSize;
        const padding = this.config.padding;
        const itemSpacing = this.config.itemSpacing;

        if (this.config.layout === 'horizontal') {
            // 水平布局
            this.items.forEach(item => {
                const textWidth = ctx.measureText(item.label).width;
                totalWidth += symbolSize + 5 + textWidth + itemSpacing;
            });
            totalWidth -= itemSpacing; // 移除最后一个间距
            totalHeight = symbolSize + (padding * 2);
        } else {
            // 垂直布局
            this.items.forEach(item => {
                const textWidth = ctx.measureText(item.label).width;
                totalWidth = Math.max(totalWidth, symbolSize + 5 + textWidth);
                totalHeight += symbolSize + itemSpacing;
            });
            totalHeight -= itemSpacing; // 移除最后一个间距
        }

        totalWidth += padding * 2;
        totalHeight += padding * 2;

        ctx.restore();
        return { width: totalWidth, height: totalHeight };
    }

    /**
     * 计算图例位置
     * @param {Object} canvasSize - 画布尺寸
     * @param {Object} legendSize - 图例尺寸
     * @returns {Object} 图例的x和y坐标
     */
    calculatePosition(canvasSize, legendSize) {
        const margin = this.config.margin;
        let x, y;

        switch (this.config.position) {
            case 'top-left':
                x = margin;
                y = margin;
                break;
            case 'top-right':
                x = canvasSize.width - legendSize.width - margin;
                y = margin;
                break;
            case 'bottom-left':
                x = margin;
                y = canvasSize.height - legendSize.height - margin;
                break;
            case 'bottom-right':
                x = canvasSize.width - legendSize.width - margin;
                y = canvasSize.height - legendSize.height - margin;
                break;
            default:
                x = margin;
                y = margin;
        }

        return { x, y };
    }

    /**
     * 绘制图例
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {number} canvasWidth - 画布宽度
     * @param {number} canvasHeight - 画布高度
     */
    draw(ctx, canvasWidth, canvasHeight) {
        const legendSize = this.calculateSize(ctx);
        const position = this.calculatePosition(
            { width: canvasWidth, height: canvasHeight },
            legendSize
        );

        ctx.save();

        // 绘制背景
        ctx.fillStyle = this.config.background;
        this.roundRect(
            ctx,
            position.x,
            position.y,
            legendSize.width,
            legendSize.height,
            this.config.borderRadius
        );

        // 设置文本样式
        ctx.font = `${this.config.fontSize}px ${this.config.fontFamily}`;
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this.config.textColor;

        // 绘制图例项
        let currentX = position.x + this.config.padding;
        let currentY = position.y + this.config.padding;
        const symbolSize = this.config.symbolSize;

        this.items.forEach((item, index) => {
            // 绘制图例标记
            ctx.fillStyle = item.color;
            ctx.beginPath();
            ctx.rect(
                currentX,
                currentY + (symbolSize / 4),
                symbolSize,
                symbolSize / 2
            );
            ctx.fill();

            // 绘制文本
            ctx.fillStyle = this.config.textColor;
            ctx.fillText(
                item.label,
                currentX + symbolSize + 5,
                currentY + (symbolSize / 2)
            );

            // 更新位置
            if (this.config.layout === 'horizontal') {
                const textWidth = ctx.measureText(item.label).width;
                currentX += symbolSize + 5 + textWidth + this.config.itemSpacing;
            } else {
                currentY += symbolSize + this.config.itemSpacing;
            }
        });

        ctx.restore();
    }

    /**
     * 绘制圆角矩形
     * @param {CanvasRenderingContext2D} ctx - Canvas上下文
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} width - 宽度
     * @param {number} height - 高度
     * @param {number} radius - 圆角半径
     */
    roundRect(ctx, x, y, width, height, radius) {
        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.arcTo(x + width, y, x + width, y + height, radius);
        ctx.arcTo(x + width, y + height, x, y + height, radius);
        ctx.arcTo(x, y + height, x, y, radius);
        ctx.arcTo(x, y, x + width, y, radius);
        ctx.closePath();
        ctx.fill();
    }
}
