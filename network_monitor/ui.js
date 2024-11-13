// network_monitor/ui.js

export function initializeUI(container, componentId, toggleCallback) {
    container.innerHTML = `
        <div class="network-monitor" style="font-family: Arial, sans-serif;">
            <div class="header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <div class="title" style="font-size: 18px; font-weight: bold;">
                    Network Traffic Monitor
                    <span style="font-size: 14px; color: #666;">(Updates every 1s)</span>
                </div>
                <button id="${componentId}_toggleBtn" style="padding: 8px 16px; background: #3B82F6; color: white; border: none; border-radius: 4px; cursor: pointer;">
                    Pause
                </button>
            </div>
            <div class="stats" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div class="current-stats" style="display: flex; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background: #60A5FA; border-radius: 50%;"></div>
                        <span id="${componentId}_uploadSpeed" style="font-size: 14px;">Upload: 0 B/s</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 12px; height: 12px; background: #34D399; border-radius: 50%;"></div>
                        <span id="${componentId}_downloadSpeed" style="font-size: 14px;">Download: 0 B/s</span>
                    </div>
                </div>
                <div class="peak-stats" style="font-size: 14px; color: #666;">
                    <span id="${componentId}_peakUpload">Peak Upload: 0 B/s</span>
                    <span style="margin: 0 8px;">|</span>
                    <span id="${componentId}_peakDownload">Peak Download: 0 B/s</span>
                </div>
            </div>
            <div class="cumulative-stats" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span id="${componentId}_totalSent" style="font-size: 14px;">Total Sent: 0 B</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span id="${componentId}_totalReceived" style="font-size: 14px;">Total Received: 0 B</span>
                    </div>
                </div>
            </div>
            <div class="system-cumulative-stats" style="display: flex; justify-content: space-between; margin-bottom: 15px;">
                <div style="display: flex; gap: 20px;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span id="${componentId}_bytesSentSinceReboot" style="font-size: 14px;">Total Sent Since Reboot: 0 B</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span id="${componentId}_bytesReceivedSinceReboot" style="font-size: 14px;">Total Received Since Reboot: 0 B</span>
                    </div>
                </div>
            </div>
            <div class="canvas-container" style="background: white; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); position: relative; height: 350px;">
                <canvas id="${componentId}_networkCanvas"></canvas>
            </div>
            <div class="timeline" style="display: flex; justify-content: space-between; margin-top: 10px; color: #666; font-size: 14px; margin-left: 60px;">
                <span>Now</span>
                <span>-50s</span>
                <span>-100s</span>
            </div>
        </div>
    `;

    const toggleBtn = document.getElementById(`${componentId}_toggleBtn`);
    if (toggleBtn) {
        toggleBtn.addEventListener('click', toggleCallback);
    } else {
        console.error(`Toggle button with id "${componentId}_toggleBtn" not found.`);
    }
}

export function updateUI(componentId, uiData) {
    const {
        uploadSpeed,
        downloadSpeed,
        peakUpload,
        peakDownload,
        totalSent,
        totalReceived,
        bytesSentSinceReboot,
        bytesReceivedSinceReboot
    } = uiData;

    document.getElementById(`${componentId}_uploadSpeed`).textContent = `Upload: ${uploadSpeed}`;
    document.getElementById(`${componentId}_downloadSpeed`).textContent = `Download: ${downloadSpeed}`;
    
    document.getElementById(`${componentId}_peakUpload`).textContent = `Peak Upload: ${peakUpload}`;
    document.getElementById(`${componentId}_peakDownload`).textContent = `Peak Download: ${peakDownload}`;

    document.getElementById(`${componentId}_totalSent`).textContent = `Total Sent: ${totalSent}`;
    document.getElementById(`${componentId}_totalReceived`).textContent = `Total Received: ${totalReceived}`;

    document.getElementById(`${componentId}_bytesSentSinceReboot`).textContent = `Total Sent Since Reboot: ${bytesSentSinceReboot}`;
    document.getElementById(`${componentId}_bytesReceivedSinceReboot`).textContent = `Total Received Since Reboot: ${bytesReceivedSinceReboot}`;
}
