#!/bin/bash

echo "======================================"
echo "泵房数据分析系统 - 启动脚本"
echo "======================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未安装 Node.js"
    echo "请访问 https://nodejs.org/ 下载安装"
    exit 1
fi

echo "Node.js 版本: $(node -v)"
echo "npm 版本: $(npm -v)"

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo ""
    echo "正在安装依赖..."
    npm install
fi

# 初始化数据库
echo ""
echo "是否需要初始化数据库? (y/n)"
read -r init_db

if [ "$init_db" = "y" ]; then
    echo "启动服务器以初始化数据库..."
    npm run dev &
    SERVER_PID=$!
    
    echo "等待服务器启动..."
    sleep 5
    
    echo "初始化数据库..."
    curl -X POST http://localhost:3000/api/init
    
    echo ""
    echo "停止服务器..."
    kill $SERVER_PID
    sleep 2
fi

# 启动开发服务器
echo ""
echo "======================================"
echo "启动开发服务器..."
echo "======================================"
echo ""
echo "访问地址: http://localhost:3000"
echo ""

npm run dev
