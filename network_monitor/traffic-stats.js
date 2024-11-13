// network_monitor/trafficStats.js

/**
 * 流量统计时间间隔定义（毫秒）
 */
export const INTERVALS = {
    MINUTE: 60 * 1000,
    MINUTES_15: 15 * 60 * 1000,
    MINUTES_30: 30 * 60 * 1000,
    HOUR: 60 * 60 * 1000,
    HOURS_2: 2 * 60 * 60 * 1000,
    HOURS_3: 3 * 60 * 60 * 1000,
    HOURS_6: 6 * 60 * 60 * 1000
};

class TrafficStats {
    constructor() {
        // 存储历史数据点
        this.dataPoints = [];
        // 最大保存时间（6小时）
        this.maxAge = INTERVALS.HOURS_6;
    }

    /**
     * 添加新的数据点
     * @param {number} timestamp - 时间戳
     * @param {number} uploadSpeed - 上传速度
     * @param {number} downloadSpeed - 下载速度
     */
    addDataPoint(timestamp, uploadSpeed, downloadSpeed) {
        // 添加新数据点
        this.dataPoints.push({
            timestamp,
            uploadSpeed,
            downloadSpeed
        });

        // 清理过期数据
        const cutoff = Date.now() - this.maxAge;
        this.dataPoints = this.dataPoints.filter(point => point.timestamp > cutoff);
    }

    /**
     * 计算指定时间段的统计数据
     * @param {number} interval - 时间间隔（毫秒）
     * @returns {Object} 统计结果
     */
    calculateStats(interval) {
        const now = Date.now();
        const cutoff = now - interval;
        
        // 获取时间段内的数据点
        const periodData = this.dataPoints.filter(point => point.timestamp > cutoff);
        
        if (periodData.length === 0) {
            return {
                avgUpload: 0,
                avgDownload: 0,
                maxUpload: 0,
                maxDownload: 0,
                minUpload: 0,
                minDownload: 0,
                totalUpload: 0,
                totalDownload: 0
            };
        }

        // 计算统计值
        const stats = periodData.reduce((acc, point) => {
            // 更新最大值
            acc.maxUpload = Math.max(acc.maxUpload, point.uploadSpeed);
            acc.maxDownload = Math.max(acc.maxDownload, point.downloadSpeed);
            
            // 更新最小值
            acc.minUpload = Math.min(acc.minUpload, point.uploadSpeed);
            acc.minDownload = Math.min(acc.minDownload, point.downloadSpeed);
            
            // 累加总量
            acc.totalUpload += point.uploadSpeed;
            acc.totalDownload += point.downloadSpeed;
            
            return acc;
        }, {
            maxUpload: -Infinity,
            maxDownload: -Infinity,
            minUpload: Infinity,
            minDownload: Infinity,
            totalUpload: 0,
            totalDownload: 0
        });

        // 计算平均值
        const count = periodData.length;
        stats.avgUpload = stats.totalUpload / count;
        stats.avgDownload = stats.totalDownload / count;

        // 计算总流量（字节）
        // 由于速度是字节/秒，需要根据采样间隔计算
        const samplingInterval = 1; // 假设是1秒一个采样点
        stats.totalUpload = stats.totalUpload * samplingInterval;
        stats.totalDownload = stats.totalDownload * samplingInterval;

        return stats;
    }

    /**
     * 获取所有时间段的统计数据
     * @returns {Object} 所有时间段的统计结果
     */
    getAllStats() {
        return {
            '1min': this.calculateStats(INTERVALS.MINUTE),
            '15min': this.calculateStats(INTERVALS.MINUTES_15),
            '30min': this.calculateStats(INTERVALS.MINUTES_30),
            '1hour': this.calculateStats(INTERVALS.HOUR),
            '2hours': this.calculateStats(INTERVALS.HOURS_2),
            '3hours': this.calculateStats(INTERVALS.HOURS_3),
            '6hours': this.calculateStats(INTERVALS.HOURS_6)
        };
    }
}

export default TrafficStats;
