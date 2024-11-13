#!/bin/bash

# 检查命令行参数数量
if [ $# -ne 1 ]; then
  echo "用法: $0 <目录>"
  exit 1
fi

# 获取命令行输入的目录
TARGET_DIR="$1"

# 检查目录是否存在
if [ ! -d "$TARGET_DIR" ]; then
  echo "错误: 目录 '$TARGET_DIR' 不存在"
  exit 1
fi

# 进入目标目录
cd "$TARGET_DIR" || exit 1

# 提取当前目录名
DIR_NAME=$(basename "$(pwd)")

# 定义文件名变量
BUNDLE_FILE="${DIR_NAME}_$(date +%Y%m%d_%H%M%S).bundle"

# 创建 bundle 文件
git bundle create "$BUNDLE_FILE" master

# 输出文件名或进行其他操作
echo "Bundle created: $BUNDLE_FILE"
