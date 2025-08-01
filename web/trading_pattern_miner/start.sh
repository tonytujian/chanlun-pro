#!/bin/bash

# 股票交易规律挖掘系统启动脚本

echo "=========================================="
echo "股票交易规律挖掘系统启动脚本"
echo "=========================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js 未安装"
    echo "请访问 https://nodejs.org/ 下载并安装 Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm 未安装"
    echo "请确保 Node.js 正确安装，npm 应该随 Node.js 一起安装"
    exit 1
fi

# 显示版本信息
echo "✅ Node.js 版本: $(node --version)"
echo "✅ npm 版本: $(npm --version)"

# 进入项目目录
cd "$(dirname "$0")"
echo "📁 当前目录: $(pwd)"

# 检查package.json是否存在
if [ ! -f "package.json" ]; then
    echo "❌ 错误: package.json 文件不存在"
    echo "请确保在正确的项目目录中运行此脚本"
    exit 1
fi

# 检查node_modules是否存在，如果不存在则安装依赖
if [ ! -d "node_modules" ]; then
    echo "📦 正在安装依赖..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ 错误: 依赖安装失败"
        echo "请检查网络连接或尝试使用 yarn 安装"
        exit 1
    fi
    echo "✅ 依赖安装完成"
else
    echo "✅ 依赖已存在，跳过安装"
fi

# 检查是否需要更新依赖
echo "🔍 检查依赖更新..."
npm outdated --depth=0 2>/dev/null | grep -q "Package" && {
    echo "⚠️  发现可更新的依赖包"
    read -p "是否要更新依赖？(y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "📦 正在更新依赖..."
        npm update
        echo "✅ 依赖更新完成"
    fi
} || echo "✅ 所有依赖都是最新版本"

# 检查端口是否被占用
PORT=3000
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  端口 $PORT 已被占用"
    echo "正在查找可用端口..."
    
    # 寻找可用端口
    for port in {3001..3010}; do
        if ! lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
            PORT=$port
            echo "✅ 找到可用端口: $PORT"
            break
        fi
    done
    
    if [ $PORT -eq 3000 ]; then
        echo "❌ 错误: 无法找到可用端口"
        echo "请手动停止占用端口 3000 的进程，或稍后重试"
        exit 1
    fi
fi

# 设置环境变量
export PORT=$PORT
export BROWSER=none  # 防止自动打开浏览器

echo ""
echo "🚀 启动开发服务器..."
echo "📍 服务器地址: http://localhost:$PORT"
echo ""
echo "🎯 功能模块:"
echo "  📊 数据导入 - 上传和处理股票历史数据"
echo "  📈 图表分析 - 可视化价格走势和技术指标"
echo "  🤖 策略生成 - 使用遗传算法自动生成交易策略"
echo "  🔍 形态匹配 - DTW算法识别相似价格形态"
echo "  📋 策略回测 - 模拟真实交易环境测试策略"
echo "  ⚙️  参数优化 - 寻找策略最佳参数组合"
echo ""
echo "💡 使用提示:"
echo "  • 首次使用请先导入股票数据"
echo "  • 建议使用Chrome或Firefox浏览器"
echo "  • 大数据量处理时请耐心等待"
echo "  • 可以同时运行多个分析任务"
echo ""
echo "🛑 按 Ctrl+C 停止服务器"
echo "=========================================="

# 启动开发服务器
if [ $PORT -ne 3000 ]; then
    echo "🔧 使用自定义端口 $PORT 启动服务器"
fi

npm start

# 如果服务器意外停止
echo ""
echo "⚠️  服务器已停止"
echo "如果是意外停止，请检查错误信息并重新运行脚本"
