# KPI仪表板 - 本地运行指南

## 系统要求

在运行项目之前，请确保您的电脑上已安装以下软件：

| 软件 | 版本 | 下载链接 |
|------|------|---------|
| Node.js | 18.0+ | https://nodejs.org/ |
| npm 或 pnpm | 8.0+ | 随Node.js安装 |
| Git | 2.0+ | https://git-scm.com/ |

## 第一步：克隆项目

### 方式1：使用Git克隆（推荐）

打开命令行/终端，运行以下命令：

```bash
git clone https://github.com/imzhengok-gif/kpi_dashboard.git
cd kpi_dashboard
```

### 方式2：直接下载

1. 访问 https://github.com/imzhengok-gif/kpi_dashboard
2. 点击 "Code" 按钮
3. 选择 "Download ZIP"
4. 解压下载的文件
5. 打开命令行，进入项目目录：

```bash
cd kpi_dashboard
```

## 第二步：安装依赖

项目使用 `pnpm` 作为包管理器。如果您还没有安装 `pnpm`，请先安装：

```bash
npm install -g pnpm
```

然后安装项目依赖：

```bash
pnpm install
```

**如果出现权限错误**，可以尝试：

```bash
sudo pnpm install
```

或者使用 `npm` 代替 `pnpm`：

```bash
npm install
```

## 第三步：运行开发服务器

### 开发模式（推荐用于测试）

```bash
npm run dev
```

您会看到类似的输出：

```
VITE v7.1.7  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

打开浏览器，访问 `http://localhost:5173/` 即可使用应用。

**优点**：
- 支持热重载（修改代码自动刷新）
- 快速启动
- 便于开发调试

## 第四步：生产模式运行

### 构建项目

```bash
npm run build
```

构建完成后，您会看到 `dist/` 文件夹被创建。

### 启动生产服务器

```bash
npm start
```

您会看到类似的输出：

```
Server running on http://localhost:3000/
```

打开浏览器，访问 `http://localhost:3000/` 即可使用应用。

**优点**：
- 性能更好
- 文件更小
- 更接近真实部署环境

## 常见问题

### Q: 提示 "pnpm: command not found"

**A**: 安装pnpm：
```bash
npm install -g pnpm
```

### Q: 提示 "port 5173 already in use"

**A**: 端口被占用，可以指定其他端口：
```bash
npm run dev -- --port 3001
```

### Q: 提示 "node_modules not found"

**A**: 重新安装依赖：
```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

或使用npm：
```bash
rm -rf node_modules package-lock.json
npm install
```

### Q: 导入数据后看不到数据

**A**: 检查以下几点：
1. 确保Excel文件格式正确（第一列是"员工名称"）
2. 检查浏览器控制台是否有错误（F12打开开发者工具）
3. 确保已点击"保存数据"按钮

### Q: 刷新页面后数据消失

**A**: 这是因为数据没有保存到本地文件。请：
1. 点击"保存数据"按钮
2. 再次刷新页面，数据应该会被加载

### Q: 如何停止服务器

**A**: 在命令行中按 `Ctrl + C` 停止服务器。

## 项目结构

```
kpi_dashboard/
├── client/                    # 前端代码
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx      # 主页面（包含导入导出功能）
│   │   ├── components/        # React组件
│   │   └── App.tsx           # 应用入口
│   └── public/               # 静态资源
├── server/                   # 后端代码
│   └── index.ts             # Express服务器
├── data/                     # 数据存储目录（自动创建）
│   └── employees.json       # 员工数据文件
├── package.json             # 项目配置
├── vite.config.ts          # Vite配置
└── tsconfig.json           # TypeScript配置
```

## 功能测试

### 测试导出功能

1. 启动应用
2. 在"数据输入"标签页中填充一些员工数据
3. 点击"导出Excel"按钮
4. 检查下载的Excel文件是否包含正确的数据

### 测试导入功能

1. 导出现有数据（参考上面的步骤）
2. 用Excel打开导出的文件
3. 修改一些数据
4. 保存文件
5. 在应用中点击"导入数据"
6. 选择修改后的Excel文件
7. 验证数据是否被正确导入

### 测试数据保存

1. 修改员工数据
2. 点击"保存数据"按钮
3. 刷新页面（F5或Cmd+R）
4. 验证数据是否被加载

## 开发调试

### 查看浏览器控制台

1. 按 `F12` 打开开发者工具
2. 切换到 "Console" 标签页
3. 查看是否有错误信息

### 查看网络请求

1. 按 `F12` 打开开发者工具
2. 切换到 "Network" 标签页
3. 执行操作（如保存数据）
4. 查看API请求和响应

### 查看本地数据文件

数据保存在项目根目录的 `data/employees.json` 文件中。您可以用任何文本编辑器打开查看。

## 修改代码后的操作

### 开发模式

代码修改后会自动刷新，无需手动重启。

### 生产模式

如果修改了代码，需要重新构建：

```bash
npm run build
npm start
```

## 性能优化

### 开发模式下加快启动速度

```bash
npm run dev -- --host
```

### 查看构建大小

```bash
npm run build
```

构建完成后查看 `dist/` 文件夹的大小。

## 部署到服务器

### 使用PM2（推荐）

1. 安装PM2：
```bash
npm install -g pm2
```

2. 启动应用：
```bash
pm2 start npm --name "kpi-dashboard" -- start
```

3. 查看状态：
```bash
pm2 status
```

4. 查看日志：
```bash
pm2 logs kpi-dashboard
```

### 使用Docker

创建 `Dockerfile`：

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

构建和运行：

```bash
docker build -t kpi-dashboard .
docker run -p 3000:3000 kpi-dashboard
```

## 获取帮助

如遇到问题，请：

1. 查看浏览器控制台错误信息（F12）
2. 查看命令行输出
3. 检查 `data/employees.json` 文件是否存在
4. 尝试清除node_modules并重新安装依赖

## 下一步

- 查看 `USAGE_GUIDE.md` 了解功能使用
- 查看 `CHANGES.md` 了解修改详情
- 查看 `CODE_CHANGES_SUMMARY.md` 了解代码修改

祝您使用愉快！
