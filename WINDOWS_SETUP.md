# Windows系统 - Vite命令找不到的解决方案

## 问题描述

运行 `npm run dev` 时出现错误：
```
'vite' 不是内部或外部命令，也不是可运行的程序或批处理文件。
```

这说明项目依赖没有正确安装。

## 解决方案

### 方案1：使用npm（推荐，最简单）

**第1步：删除旧的依赖**

在项目目录中，打开命令提示符或PowerShell，运行：

```bash
rmdir /s /q node_modules
del package-lock.json
```

或者直接删除：
- 删除项目中的 `node_modules` 文件夹
- 删除 `package-lock.json` 文件

**第2步：重新安装依赖**

```bash
npm install
```

等待安装完成（可能需要几分钟）。

**第3步：运行项目**

```bash
npm run dev
```

### 方案2：使用pnpm

**第1步：安装pnpm**

```bash
npm install -g pnpm
```

**第2步：删除旧的依赖**

```bash
rmdir /s /q node_modules
del pnpm-lock.yaml
```

**第3步：重新安装依赖**

```bash
pnpm install
```

**第4步：运行项目**

```bash
npm run dev
```

## 详细步骤（图文版）

### 1. 打开命令提示符

- 按 `Win + R`
- 输入 `cmd` 并按 Enter
- 或者在项目文件夹中，按住 Shift 并右键，选择"在此处打开 PowerShell 窗口"

### 2. 进入项目目录

```bash
cd 你的项目路径\kpi_dashboard
```

例如：
```bash
cd C:\Users\YourName\Desktop\kpi_dashboard
```

### 3. 查看当前目录

```bash
dir
```

您应该看到 `package.json` 文件。

### 4. 删除依赖

**使用命令行删除：**

```bash
rmdir /s /q node_modules
del package-lock.json
```

系统会问 "是否确定？"，输入 `y` 并按 Enter。

**或者手动删除：**

- 打开文件资源管理器
- 找到项目文件夹
- 删除 `node_modules` 文件夹
- 删除 `package-lock.json` 文件

### 5. 重新安装依赖

```bash
npm install
```

这会下载并安装所有依赖。进度条会显示安装进度。

### 6. 运行项目

```bash
npm run dev
```

您应该看到类似的输出：

```
VITE v7.1.7  ready in 123 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### 7. 打开浏览器

在浏览器中访问 `http://localhost:5173`

## 常见错误及解决方案

### 错误1：npm: 无法将"npm"项识别为 cmdlet

**解决方案**：
- 重新启动命令提示符
- 或者重新安装Node.js

### 错误2：EACCES: permission denied

**解决方案**：
- 以管理员身份运行命令提示符
- 右键点击 cmd，选择"以管理员身份运行"

### 错误3：npm ERR! code ERESOLVE

**解决方案**：

```bash
npm install --legacy-peer-deps
```

### 错误4：node-gyp 编译错误

**解决方案**：

需要安装 Visual Studio Build Tools：
1. 下载：https://visualstudio.microsoft.com/downloads/
2. 选择 "Visual Studio Build Tools"
3. 安装时选择 "Desktop development with C++"

然后重新运行：
```bash
npm install
```

## 验证安装

安装完成后，验证是否成功：

```bash
npm list vite
```

您应该看到类似的输出：

```
kpi_dashboard@1.0.0 C:\...\kpi_dashboard
└── vite@7.1.9
```

## 如果还是不行

### 完全重新安装

```bash
# 1. 删除所有依赖
rmdir /s /q node_modules
del package-lock.json
del pnpm-lock.yaml

# 2. 清除npm缓存
npm cache clean --force

# 3. 重新安装
npm install

# 4. 运行
npm run dev
```

### 检查Node.js版本

```bash
node --version
npm --version
```

确保：
- Node.js 版本 >= 18.0
- npm 版本 >= 8.0

如果版本太低，请从 https://nodejs.org/ 下载最新版本。

### 检查项目文件

确保项目文件夹中有以下文件：
- `package.json`
- `vite.config.ts`
- `tsconfig.json`

如果缺少这些文件，说明项目没有正确下载。

## 使用生产模式代替

如果开发模式一直有问题，可以使用生产模式：

```bash
npm run build
npm start
```

然后访问 `http://localhost:3000`

## 获取更多帮助

如果以上方案都不行，请：

1. 检查 Node.js 是否正确安装
2. 重启电脑
3. 尝试在其他文件夹运行 npm 命令
4. 查看项目的 GitHub Issues：https://github.com/imzhengok-gif/kpi_dashboard/issues

## 快速参考

| 问题 | 解决方案 |
|------|---------|
| vite 找不到 | `npm install` |
| 权限错误 | 以管理员身份运行 |
| npm 找不到 | 重新安装 Node.js |
| 版本太低 | 升级 Node.js 到 18.0+ |
| 依赖冲突 | `npm install --legacy-peer-deps` |
| 完全卡住 | 删除 node_modules，清除缓存，重新安装 |
