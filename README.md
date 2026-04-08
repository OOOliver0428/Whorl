# Whorl

本地优先的任务管理工具，面向需要专注执行的方案人员。

## 功能

**任务管理**
- 任务 CRUD，支持无限层级子任务
- 4 级优先级（低/中/高/紧急）
- 截止日期 + 日历选择
- 重复任务（每日/每周/每月，完成时自动生成下一条）

**组织方式**
- 项目分类（自定义颜色/图标，支持归档）
- 标签系统（创建/删除，最多 5 标签同时筛选）
- 全局搜索 + 多维筛选（状态/优先级/标签）

**效率工具**
- 番茄钟（25/5 分钟，关联任务）
- 数据面板（完成趋势/项目分布/优先级分布/热力日历）
- 数据导出（JSON 全量 / CSV）

**体验**
- 亮/暗双主题
- 列表 / 时间线两种视图
- 全键盘友好

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + TypeScript + Vite + Tailwind CSS v4 |
| 后端 | Express 5 + better-sqlite3 |
| 状态 | Zustand |
| 动画 | Framer Motion |
| 图表 | Recharts |
| 验证 | Zod v4 |

## 快速开始

```bash
# 安装依赖
npm install

# 开发模式（前端 + 后端同时启动）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务
npm start
```

开发模式下：
- 前端：http://localhost:5173
- 后端：http://localhost:3001

生产模式下，前后端统一由 `http://localhost:3001` 提供服务。

## 配置

复制 `.env.example` 为 `.env`，可配置以下参数：

```env
PORT=3001           # 服务端口
DB_PATH=./data/whorl.db  # 数据库路径
NODE_ENV=development    # 环境
```

## 其他命令

```bash
npm run lint        # 代码检查
npm run lint:fix    # 自动修复
npm run reset-db    # 重置数据库（清空所有数据）
```

## 数据存储

所有数据存储在本地 SQLite 数据库中（默认 `data/whorl.db`）。支持通过界面导出 JSON / CSV 备份。

## 许可

Private
