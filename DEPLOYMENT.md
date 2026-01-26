# Docker 部署说明

## 前置要求

- Docker (版本 20.10+)
- Docker Compose (版本 2.0+)

## 快速开始

### 1. 使用 Docker Compose 部署（推荐）

```bash
# 构建并启动容器
docker-compose up -d

# 查看日志
docker-compose logs -f

# 停止容器
docker-compose down
```

### 2. 使用 Docker 命令部署

```bash
# 构建镜像
docker build -t pump-data-analysis:latest .

# 运行容器
docker run -d \
  --name pump-data-analysis \
  -p 3000:3000 \
  --restart unless-stopped \
  pump-data-analysis:latest

# 查看日志
docker logs -f pump-data-analysis

# 停止容器
docker stop pump-data-analysis

# 删除容器
docker rm pump-data-analysis
```

## 访问应用

部署成功后，访问 http://localhost:3000

## 环境变量配置

如需配置环境变量，可以创建 `.env.production` 文件或在 `docker-compose.yml` 中添加：

```yaml
environment:
  - NODE_ENV=production
  - INFLUXDB_URL=your_influxdb_url
  - MYSQL_HOST=your_mysql_host
  # 添加其他环境变量
```

## 更新部署

```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build
```

## 故障排查

### 查看容器状态
```bash
docker ps -a
```

### 查看容器日志
```bash
docker-compose logs -f
# 或
docker logs -f pump-data-analysis
```

### 进入容器调试
```bash
docker exec -it pump-data-analysis sh
```

## 生产环境建议

1. 使用反向代理（如 Nginx）处理 HTTPS
2. 配置适当的资源限制
3. 设置日志轮转
4. 定期备份数据
5. 监控容器健康状态
