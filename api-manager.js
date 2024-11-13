class APIManager {
    constructor() {
        // 单例模式
        if (APIManager.instance) {
            return APIManager.instance;
        }
        APIManager.instance = this;

        // 从环境变量中读取 API 地址
        fetch('/.env')
            .then(response => response.text())
            .then(data => {
                const match = data.match(/API='([^']+)'/);
                if (match) {
                    this.baseURL = match[1];
                } else {
                    console.error('API URL not found in .env file');
                    this.baseURL = '';
                }
            })
            .catch(error => {
                console.error('Error loading .env file:', error);
                this.baseURL = '';
            });

        this.cache = new Map();
        this.subscribers = new Map();
        this.updateInterval = 1000; // 默认1秒更新一次
        this.isRunning = false;
        this.lastFetchTime = 0;
        this.retryTimeout = 5000; // 失败后5秒重试
        this.maxRetries = 3; // 最大重试次数
        this.currentRetries = 0;
    }

    // 订阅数据更新
    subscribe(componentId, callback) {
        this.subscribers.set(componentId, callback);
        
        // 如果这是第一个订阅者，开始数据轮询
        if (this.subscribers.size === 1 && !this.isRunning) {
            this.startPolling();
        }
        
        // 如果缓存中有数据，立即调用回调
        const cachedData = this.cache.get('stats');
        if (cachedData) {
            callback(cachedData);
        }
    }

    // 取消订阅
    unsubscribe(componentId) {
        this.subscribers.delete(componentId);
        
        // 如果没有订阅者了，停止数据轮询
        if (this.subscribers.size === 0) {
            this.stopPolling();
        }
    }

    // 开始轮询
    startPolling() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.pollData();
    }

    // 停止轮询
    stopPolling() {
        this.isRunning = false;
        if (this.pollingTimeout) {
            clearTimeout(this.pollingTimeout);
        }
    }

    // 数据轮询
    async pollData() {
        if (!this.isRunning) return;

        try {
            const currentTime = Date.now();
            // 确保两次请求间隔至少为updateInterval
            const timeSinceLastFetch = currentTime - this.lastFetchTime;
            if (timeSinceLastFetch < this.updateInterval) {
                const waitTime = this.updateInterval - timeSinceLastFetch;
                this.pollingTimeout = setTimeout(() => this.pollData(), waitTime);
                return;
            }

            const data = await this.fetchData();
            this.lastFetchTime = Date.now();
            this.currentRetries = 0; // 重置重试计数

            // 缓存数据
            this.cache.set('stats', data);

            // 通知所有订阅者
            for (const callback of this.subscribers.values()) {
                callback(data);
            }

            // 继续轮询
            this.pollingTimeout = setTimeout(() => this.pollData(), this.updateInterval);

        } catch (error) {
            console.error('Error polling data:', error);
            
            // 重试逻辑
            if (this.currentRetries < this.maxRetries) {
                this.currentRetries++;
                console.log(`Retry attempt ${this.currentRetries} of ${this.maxRetries}`);
                this.pollingTimeout = setTimeout(() => this.pollData(), this.retryTimeout);
            } else {
                // 通知所有订阅者发生错误
                for (const callback of this.subscribers.values()) {
                    callback({ error: 'Failed to fetch data after maximum retries' });
                }
                // 继续正常轮询
                this.currentRetries = 0;
                this.pollingTimeout = setTimeout(() => this.pollData(), this.updateInterval);
            }
        }
    }

    // 获取数据
    async fetchData() {
        if (!this.baseURL) {
            throw new Error('API URL not initialized');
        }
        const response = await fetch(this.baseURL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    }

    // 获取最新缓存的数据
    getLatestData() {
        return this.cache.get('stats');
    }

    // 设置更新间隔
    setUpdateInterval(interval) {
        this.updateInterval = interval;
    }

    // 设置API基础URL
    setBaseURL(url) {
        this.baseURL = url;
    }

    // 设置重试配置
    setRetryConfig(timeout, maxRetries) {
        this.retryTimeout = timeout;
        this.maxRetries = maxRetries;
    }
}

// 导出单例实例
export default new APIManager();