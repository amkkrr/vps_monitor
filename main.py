from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import psutil
import time
import logging
import sys

app = FastAPI()

# 添加 CORS 中间件
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 在生产环境中应该设置为具体的域名
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StatsResponse(BaseModel):
    timestamp: int
    network: dict
    cpu: dict
    disk: dict
    memory: dict

# 获取网络使用情况
def get_network_usage():
    net_io = psutil.net_io_counters()
    return {
        'bytes_sent': net_io.bytes_sent,
        'bytes_recv': net_io.bytes_recv
    }

# 获取增强的 CPU 使用情况
def get_cpu_usage():
    # 获取每个 CPU 核心的使用率
    per_cpu_percent = psutil.cpu_percent(interval=1, percpu=True)
    
    # 获取 CPU 频率信息
    cpu_freq = psutil.cpu_freq(percpu=True) if hasattr(psutil, 'cpu_freq') else None
    freq_info = []
    if cpu_freq:
        freq_info = [{
            'current': freq.current,
            'min': freq.min,
            'max': freq.max
        } for freq in cpu_freq]

    # 获取 CPU 统计信息
    cpu_stats = psutil.cpu_stats()
    
    # 获取 CPU 时间明细
    cpu_times = psutil.cpu_times()
    
    # 获取 CPU 负载
    try:
        load_avg = psutil.getloadavg()
    except (AttributeError, NotImplementedError):
        load_avg = None

    return {
        'percent': psutil.cpu_percent(interval=None),  # 总体 CPU 使用率
        'count': {
            'physical': psutil.cpu_count(logical=False),  # 物理核心数
            'logical': psutil.cpu_count(logical=True)     # 逻辑核心数
        },
        'per_cpu_percent': per_cpu_percent,              # 每个核心的使用率
        'frequencies': freq_info,                        # CPU 频率信息
        'stats': {
            'ctx_switches': cpu_stats.ctx_switches,      # 上下文切换次数
            'interrupts': cpu_stats.interrupts,          # 中断次数
            'soft_interrupts': cpu_stats.soft_interrupts,# 软中断次数
            'syscalls': cpu_stats.syscalls               # 系统调用次数
        },
        'times': {
            'user': cpu_times.user,                      # 用户态时间
            'system': cpu_times.system,                  # 系统态时间
            'idle': cpu_times.idle,                      # 空闲时间
            'iowait': cpu_times.iowait if hasattr(cpu_times, 'iowait') else None,  # IO等待时间
            'irq': cpu_times.irq if hasattr(cpu_times, 'irq') else None,          # 硬中断时间
            'softirq': cpu_times.softirq if hasattr(cpu_times, 'softirq') else None  # 软中断时间
        },
        'load_avg': load_avg                            # 系统负载（1分钟、5分钟、15分钟）
    }

# 获取磁盘 I/O 使用情况
def get_disk_io():
    disk_io = psutil.disk_io_counters()
    return {
        'read_bytes': disk_io.read_bytes,
        'write_bytes': disk_io.write_bytes
    }

# 获取内存使用情况
def get_memory_usage():
    mem = psutil.virtual_memory()
    return {
        'total': mem.total,
        'available': mem.available,
        'percent': mem.percent
    }

# API 路由
@app.get("/api/stats", response_model=StatsResponse)
def get_stats():
    return StatsResponse(
        timestamp=int(time.time()),
        network=get_network_usage(),
        cpu=get_cpu_usage(),
        disk=get_disk_io(),
        memory=get_memory_usage()
    )

# 自定义日志配置
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "default": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            "datefmt": "%Y-%m-%d %H:%M:%S",
        },
    },
    "handlers": {
        "default": {
            "formatter": "default",
            "class": "logging.StreamHandler",
            "stream": sys.stdout,
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": ["default"],
            "level": "INFO",
        },
        "uvicorn.access": {
            "handlers": ["default"],
            "level": "INFO",
            "propagate": False,
        },
        "fastapi": {
            "handlers": ["default"],
            "level": "INFO",
            "propagate": False,
        },
        "": {  # root logger
            "handlers": ["default"],
            "level": "INFO",
        },
    },
}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        app,
        host="127.0.0.1",
        port=8888,
        log_config=LOGGING_CONFIG,
        log_level="info"
    )
