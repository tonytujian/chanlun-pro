@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

echo ==========================================
echo 股票交易规律挖掘系统启动脚本
echo ==========================================

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: Node.js 未安装
    echo 请访问 https://nodejs.org/ 下载并安装 Node.js
    pause
    exit /b 1
)

REM 检查npm是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: npm 未安装
    echo 请确保 Node.js 正确安装，npm 应该随 Node.js 一起安装
    pause
    exit /b 1
)

REM 显示版本信息
for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo ✅ Node.js 版本: %NODE_VERSION%
echo ✅ npm 版本: %NPM_VERSION%

REM 进入脚本所在目录
cd /d "%~dp0"
echo 📁 当前目录: %cd%

REM 检查package.json是否存在
if not exist "package.json" (
    echo ❌ 错误: package.json 文件不存在
    echo 请确保在正确的项目目录中运行此脚本
    pause
    exit /b 1
)

REM 检查node_modules是否存在，如果不存在则安装依赖
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ 错误: 依赖安装失败
        echo 请检查网络连接或尝试使用 yarn 安装
        pause
        exit /b 1
    )
    echo ✅ 依赖安装完成
) else (
    echo ✅ 依赖已存在，跳过安装
)

REM 检查依赖更新
echo 🔍 检查依赖更新...
npm outdated --depth=0 >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  发现可更新的依赖包
    set /p UPDATE_DEPS="是否要更新依赖？(y/N): "
    if /i "!UPDATE_DEPS!"=="y" (
        echo 📦 正在更新依赖...
        npm update
        echo ✅ 依赖更新完成
    )
) else (
    echo ✅ 所有依赖都是最新版本
)

REM 检查端口是否被占用
set PORT=3000
netstat -an | find "LISTENING" | find ":3000" >nul 2>&1
if %errorlevel% equ 0 (
    echo ⚠️  端口 3000 已被占用
    echo 正在查找可用端口...
    
    REM 寻找可用端口
    for /l %%p in (3001,1,3010) do (
        netstat -an | find "LISTENING" | find ":%%p" >nul 2>&1
        if !errorlevel! neq 0 (
            set PORT=%%p
            echo ✅ 找到可用端口: %%p
            goto :found_port
        )
    )
    
    echo ❌ 错误: 无法找到可用端口
    echo 请手动停止占用端口 3000 的进程，或稍后重试
    pause
    exit /b 1
)

:found_port

REM 设置环境变量
set BROWSER=none

echo.
echo 🚀 启动开发服务器...
echo 📍 服务器地址: http://localhost:%PORT%
echo.
echo 🎯 功能模块:
echo   📊 数据导入 - 上传和处理股票历史数据
echo   📈 图表分析 - 可视化价格走势和技术指标
echo   🤖 策略生成 - 使用遗传算法自动生成交易策略
echo   🔍 形态匹配 - DTW算法识别相似价格形态
echo   📋 策略回测 - 模拟真实交易环境测试策略
echo   ⚙️  参数优化 - 寻找策略最佳参数组合
echo.
echo 💡 使用提示:
echo   • 首次使用请先导入股票数据
echo   • 建议使用Chrome或Firefox浏览器
echo   • 大数据量处理时请耐心等待
echo   • 可以同时运行多个分析任务
echo.
echo 🛑 按 Ctrl+C 停止服务器
echo ==========================================

REM 启动开发服务器
if %PORT% neq 3000 (
    echo 🔧 使用自定义端口 %PORT% 启动服务器
    set PORT=%PORT%
)

REM 自动打开浏览器（可选）
timeout /t 3 /nobreak >nul
start http://localhost:%PORT%

npm start

REM 如果服务器意外停止
echo.
echo ⚠️  服务器已停止
echo 如果是意外停止，请检查错误信息并重新运行脚本
pause
