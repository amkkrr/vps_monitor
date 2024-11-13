// network_monitor/trafficStatsUI.js

/**
 * 创建流量统计表格的HTML结构
 * @param {string} componentId - 组件ID
 * @returns {string} HTML字符串
 */
export function createTrafficStatsTable(componentId) {
    return `
        <div class="traffic-stats-container" style="margin-top: 20px; background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <h3 style="margin: 0 0 16px 0; font-size: 16px; color: #1f2937;">Traffic Statistics</h3>
            <div class="table-responsive" style="overflow-x: auto;">
                <table id="${componentId}_statsTable" style="width: 100%; border-collapse: collapse; font-size: 14px;">
                    <thead>
                        <tr>
                            <th style="text-align: left; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Time Period</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Avg Upload</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Avg Download</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Max Upload</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Max Download</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Total Upload</th>
                            <th style="text-align: right; padding: 8px; border-bottom: 2px solid #e5e7eb; color: #4b5563;">Total Download</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td colspan="7" style="text-align: center; padding: 16px; color: #6b7280;">Loading statistics...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

/**
 * 更新统计表格数据
 * @param {string} componentId - 组件ID
 * @param {Object} stats - 统计数据
 * @param {function} formatBytes - 格式化字节数的函数
 * @param {function} formatTotalBytes - 格式化总字节数的函数
 */
export function updateTrafficStatsTable(componentId, stats, formatBytes, formatTotalBytes) {
    const table = document.getElementById(`${componentId}_statsTable`);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const timeLabels = {
        '1min': 'Last 1 minute',
        '15min': 'Last 15 minutes',
        '30min': 'Last 30 minutes',
        '1hour': 'Last 1 hour',
        '2hours': 'Last 2 hours',
        '3hours': 'Last 3 hours',
        '6hours': 'Last 6 hours'
    };

    const rows = Object.entries(stats).map(([period, data]) => {
        const label = timeLabels[period];
        return `
            <tr>
                <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${label}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${formatBytes(data.avgUpload)}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${formatBytes(data.avgDownload)}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${formatBytes(data.maxUpload)}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${formatBytes(data.maxDownload)}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${formatTotalBytes(data.totalUpload)}</td>
                <td style="text-align: right; padding: 8px; border-bottom: 1px solid #e5e7eb; color: #374151;">${formatTotalBytes(data.totalDownload)}</td>
            </tr>
        `;
    }).join('');

    tbody.innerHTML = rows;
}