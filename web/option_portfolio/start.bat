@echo off
chcp 65001 >nul

echo ==========================================
echo 期权组合配置系统启动脚本
echo ==========================================

REM 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: Node.js 未安装，请先安装 Node.js
    pause
    exit /b 1
)

REM 检查npm是否安装
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: npm 未安装，请先安装 npm
    pause
    exit /b 1
)

REM 进入脚本所在目录
cd /d "%~dp0"

echo 当前目录: %cd%

REM 检查package.json是否存在
if not exist "package.json" (
    echo 错误: package.json 文件不存在
    pause
    exit /b 1
)

REM 检查node_modules是否存在，如果不存在则安装依赖
if not exist "node_modules" (
    echo 正在安装依赖...
    npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
    echo 依赖安装完成
) else (
    echo 依赖已存在，跳过安装
)

REM 检查后端服务是否运行
echo 检查后端服务状态...
curl -s http://localhost:8080/api/options/underlyings >nul 2>&1
if %errorlevel% equ 0 (
    echo ✓ 后端服务已运行 ^(http://localhost:8080^)
) else (
    echo ⚠ 后端服务未运行，请确保Flask服务已启动
    echo   启动命令: cd ..\..\.. ^&^& python web\chanlun_chart\app.py
)

echo.
echo 启动React开发服务器...
echo 服务器将在 http://localhost:3000 启动
echo.
echo 可用页面:
echo   - 期权组合配置: http://localhost:3000/portfolio
echo   - 交易看板: http://localhost:3000/dashboard
echo.
echo 通过Flask访问:
echo   - http://localhost:8080/options/portfolio
echo.
echo 按 Ctrl+C 停止服务器
echo ==========================================

REM 启动开发服务器
npm start

pause
