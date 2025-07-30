#!/bin/bash

# 期权组合配置系统启动脚本

echo "=========================================="
echo "期权组合配置系统启动脚本"
echo "=========================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "错误: Node.js 未安装，请先安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "错误: npm 未安装，请先安装 npm"
    exit 1
fi

# 进入项目目录
cd "$(dirname "$0")"

echo "当前目录: $(pwd)"

# 检查package.json是否存在
if [ ! -f "package.json" ]; then
    echo "错误: package.json 文件不存在"
    exit 1
fi

# 检查node_modules是否存在，如果不存在则安装依赖
if [ ! -d "node_modules" ]; then
    echo "正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "错误: 依赖安装失败"
        exit 1
    fi
    echo "依赖安装完成"
else
    echo "依赖已存在，跳过安装"
fi

# 检查后端服务是否运行
echo "检查后端服务状态..."
if curl -s http://localhost:8080/api/options/underlyings > /dev/null 2>&1; then
    echo "✓ 后端服务已运行 (http://localhost:8080)"
else
    echo "⚠ 后端服务未运行，请确保Flask服务已启动"
    echo "  启动命令: cd ../../ && python web/chanlun_chart/app.py"
fi

echo ""
echo "启动React开发服务器..."
echo "服务器将在 http://localhost:3000 启动"
echo ""
echo "可用页面:"
echo "  - 期权组合配置: http://localhost:3000/portfolio"
echo "  - 交易看板: http://localhost:3000/dashboard"
echo ""
echo "通过Flask访问:"
echo "  - http://localhost:8080/options/portfolio"
echo ""
echo "按 Ctrl+C 停止服务器"
echo "=========================================="

# 启动开发服务器
npm start
