// network_monitor/dataProcessor.js

/**
 * 处理从API接收到的数据
 * @param {Object} data - API返回的原始数据
 * @param {Object} networkMonitorInstance - NetworkMonitor实例
 */
export function handleData(data, networkMonitorInstance) {
    // 检查数据有效性
    if (!data || data.error) {
        console.error('Invalid data received:', data?.error || 'No data');
        networkMonitorInstance.simulateData();
        return;
    }

    try {
        // 确保数据包含必要的字段
        if (!data.timestamp || !data.network || 
            typeof data.network.bytes_sent === 'undefined' || 
            typeof data.network.bytes_recv === 'undefined') {
            throw new Error('Missing required fields in data');
        }

        // 提取需要的数据
        const processedData = {
            timestamp: data.timestamp,
            network: {
                bytes_sent: ensurePositiveNumber(data.network.bytes_sent),
                bytes_recv: ensurePositiveNumber(data.network.bytes_recv)
            }
        };

        // 传递处理后的数据
        networkMonitorInstance.processData(processedData);
    } catch (error) {
        console.error('Error processing network data:', error);
        networkMonitorInstance.simulateData();
    }
}

/**
 * 生成模拟数据用于测试或错误恢复
 * @param {Object} networkMonitorInstance - NetworkMonitor实例
 */
export function simulateData(networkMonitorInstance) {
    // 确保lastData存在且有效
    const lastBytes = {
        bytes_sent: networkMonitorInstance.lastData?.bytes_sent || 0,
        bytes_recv: networkMonitorInstance.lastData?.bytes_recv || 0
    };

    // 生成合理的增量数据
    const newData = {
        timestamp: Math.floor(Date.now() / 1000),
        network: {
            bytes_sent: lastBytes.bytes_sent + generateRandomIncrement(),
            bytes_recv: lastBytes.bytes_recv + generateRandomIncrement()
        }
    };

    // 处理模拟数据
    networkMonitorInstance.processData(newData);
}

/**
 * 生成随机的流量增量（100KB到2MB之间）
 * @returns {number} 随机生成的字节数
 */
function generateRandomIncrement() {
    return Math.floor(Math.random() * (2 * 1024 * 1024 - 100 * 1024) + 100 * 1024);
}

/**
 * 确保数值为正数
 * @param {number} value - 输入值
 * @returns {number} 确保为正数的值
 */
function ensurePositiveNumber(value) {
    return Math.max(0, Number(value) || 0);
}