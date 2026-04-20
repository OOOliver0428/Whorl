# Whorl — 版本路线图

## v1.0.0

### 核心功能
- ✅ 任务 CRUD（增删改查）
- ✅ 子任务支持（无限层级嵌套创建 + 显示）
- ✅ 项目分类管理（颜色/图标/归档）
- ✅ 标签系统（创建/删除 + 多标签筛选，最多 5 项）
- ✅ 优先级 4 级（低/中/高/紧急）
- ✅ 截止日期 + 日历选择
- ✅ 重复任务（每日/每周/每月，完成时自动生成下一条）
- ✅ 全局搜索 + 多维筛选（状态/优先级/标签）
- ✅ 番茄钟（25/5分钟，关联任务）
- ✅ 数据仪表盘（统计卡片/趋势折线图/项目环形图/热力日历/优先级柱状图）
- ✅ 亮/暗双主题（系统检测 + 手动切换）
- ✅ 数据导出（JSON 全量 / CSV 任务列表）

### 工程化
- ✅ Zod 输入验证（所有 API 端点）
- ✅ TypeScript 类型安全（消除 any）
- ✅ Error Boundary
- ✅ Lazy-load 代码分割
- ✅ ESLint 代码规范
- ✅ .env 环境变量配置

### 技术架构
- 前端：React 19 + TypeScript + Vite + Tailwind CSS v4
- 后端：Express 5 + better-sqlite3
- 状态管理：Zustand
- 动画：Framer Motion
- 图表：Recharts
- 验证：Zod v4

---

## v1.1.0 — 项目文档池 ✅ 已完成

### 功能概述
为方案人员提供的项目文档管理功能。按项目建立独立文档池，任务可关联文档，
区分参考文档和产出文档，让每个任务拥有明确的完成"终点"。

### 新增功能

#### 1. 项目文档池 ✅
- ✅ 每个项目拥有独立的文档列表
- ✅ 仅存储文件元数据（不存储实际文件内容）
- ✅ 元数据字段：文件名、本地路径、文件类型、文件大小、最后修改时间、SHA256 哈希
- ✅ 支持扫描指定目录批量导入文档
- ✅ 哈希值变更检测（文件被修改后自动标识）
- ✅ 文件丢失检测（文件被移动/删除后标记 missing）

#### 2. 任务-文档关联 ✅
- ✅ 任务编辑菜单中新增"高级选项"区域（默认收起）
- ✅ 可从项目文档池中选择关联文档
- ✅ 文档类型区分：
  - 📖 **参考文档**：任务所需的背景资料、设计规范等
  - 📤 **产出文档**：任务完成时应交付的文件

#### 3. 文档变更追踪 ✅
- ✅ 打开文档池时自动检测哈希变更
- ✅ 文档被修改后在文档列表中标记 🔄 已变更
- ✅ 支持刷新单条文档记录

### 数据库变更 (Migration v2)

```sql
CREATE TABLE documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id  INTEGER NOT NULL,
  name        TEXT NOT NULL,
  file_path   TEXT NOT NULL,
  file_type   TEXT,
  file_size   INTEGER,
  last_modified TEXT,
  file_hash   TEXT,
  description TEXT,
  created_at  TEXT DEFAULT (datetime('now')),
  updated_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE TABLE task_documents (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id     INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  relation    TEXT DEFAULT 'reference' CHECK(relation IN ('reference','output')),
  created_at  TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
  FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE,
  UNIQUE(task_id, document_id)
);

CREATE INDEX idx_documents_project ON documents(project_id);
CREATE INDEX idx_task_documents_task ON task_documents(task_id);
CREATE INDEX idx_task_documents_doc ON task_documents(document_id);
```

### API 新增端点 ✅

```
GET    /api/documents?project_id=:id     → 获取项目文档列表 ✅
POST   /api/documents                     → 添加文档元数据 ✅
PUT    /api/documents/:id                 → 更新文档信息 ✅
DELETE /api/documents/:id                 → 删除文档记录 ✅
POST   /api/documents/scan                → 扫描目录批量导入 ✅
POST   /api/documents/import              → 批量导入文档 ✅
POST   /api/documents/check-changes       → 批量检测变更 ✅
POST   /api/documents/:id/refresh         → 刷新单条文档哈希 ✅
GET    /api/tasks/:id/documents           → 获取任务关联文档 ✅
POST   /api/tasks/:id/documents           → 关联文档到任务 ✅
DELETE /api/tasks/:id/documents/:docId    → 取消关联 ✅
```

### 前端变更 ✅
- ✅ 项目详情页 Tab 切换：任务列表 / 文档池
- ✅ TaskForm 高级区域新增文档关联面板
- ✅ 文档列表组件（搜索/排序/类型筛选/状态筛选）
- ✅ 扫描目录弹窗（输入路径 → 扫描 → 勾选 → 导入）
- ✅ 文件状态标记（正常/已变更/丢失）

---

## v1.1.1 — 体验优化 & 标签词云

### 功能改进
- ✅ 标签词云（替换项目分布饼图，周/月/季度/年 四个时间维度）
- ✅ 时间线新增「隐藏已完成」过滤
- ✅ TaskForm 弹窗滚动条修复（展开高级选项不再溢出）
- ✅ WSL 环境 Windows 路径自动转换（`D:\xxx` → `/mnt/d/xxx`）
- ✅ 默认项目「收件箱」改为「公共」
- ✅ 扫描目录支持 .vsdx / .drawio 格式
- ✅ 过滤 Office 临时文件（`~$` 开头）
- ✅ 备份脚本 `backup-db.sh`
- ✅ README 更新

---

## v1.2.0 — Markdown 导出 & 紧急提醒

### 功能概述
两个独立功能：为 AI agent 设计的 Markdown 全量导出，以及当天有效的紧急提醒。

### 1. Markdown 导出

#### 功能说明
新增 Markdown 格式导出，面向 AI agent 场景。全量导出所有项目任务，
按项目分组，使用标准 Markdown 表格 + emoji 状态标记，方便 AI 直接解析。

#### API
```
GET /api/export/md  → 返回 Markdown 格式的全量任务导出
```

#### 输出格式
```markdown
# Whorl 任务导出
> 导出时间: 2026-04-13 15:30

## 概览
- 待办: 12 | 已完成: 8 | 逾期: 2 | 今日完成: 3

## 📁 工作 #3b82f6
| 状态 | 优先级 | 任务 | 截止日期 | 标签 | 备注 |
|------|--------|------|----------|------|------|
| ⬜ | 🔴 | 完成需求文档 | 2026-04-07 | #周报 | 编写 v1.1 需求规格 |
| ✅ | 🟡 | 配置 CI/CD | 2026-04-05 | | |

## 📋 无项目 #94a3b8
...
```

- 状态：⬜ 未完成 / ✅ 已完成
- 优先级：⚪ 低 / 🔵 中 / 🟡 高 / 🔴 紧急
- 项目标题行带颜色 hex，方便 AI 按项目分组

#### 改动文件
| 文件 | 变更 |
|------|------|
| `server/routes/export.ts` | 新增 `/md` handler |
| `src/api/index.ts` | 新增 `exportMarkdown()` 方法 |

### 2. 紧急提醒

#### 功能说明
添加当天有效的临时提醒（如「15:30 紧急会议」）。纯内存存储，
服务重启或过期后自然消失，不在数据库中持久化。

#### 数据结构（内存）
```typescript
interface Reminder {
  id: number
  time: string       // "15:30"
  message: string    // "紧急会议"
  date: string       // "2026-04-13"
}
```

#### API
```
GET    /api/reminders       → 获取今日提醒（自动清理昨天的）
POST   /api/reminders       → 创建提醒 { time, message }
DELETE /api/reminders/:id   → 删除提醒
```

#### 前端组件
- Header 右侧显示 🔔 图标 + 当前提醒数
- 点击展开下拉面板，列出今日提醒
- 底部输入：时间选择 + 消息输入 + 添加按钮
- 到达提醒时间时：
  - 页面内：提醒条变红 + 脉冲动画
  - 浏览器通知：`Notification.requestPermission()` + `new Notification()`
- 提醒过时后变灰，可手动删除

#### 改动文件
| 文件 | 变更 |
|------|------|
| `server/routes/reminders.ts` | 新建，纯内存提醒 API |
| `server/index.ts` | 注册 reminders 路由 |
| `src/api/index.ts` | 新增 reminders API 方法 |
| `src/components/reminders/ReminderBell.tsx` | 新建，提醒铃铛组件 |
| `src/components/layout/Header.tsx` | 嵌入 ReminderBell |

---

## v1.3.0 (规划中)

- [ ] 数据导入（从 JSON 备份恢复）
- [ ] 任务模板
- [ ] 快捷键支持
- [ ] 系统托盘常驻
