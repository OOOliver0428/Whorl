# Whorl — 版本路线图

## v1.0.0 (当前版本)

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

## v1.1.0 — 项目文档池

### 功能概述
为方案人员提供的项目文档管理功能。按项目建立独立文档池，任务可关联文档，
区分参考文档和产出文档，让每个任务拥有明确的完成"终点"。

### 新增功能

#### 1. 项目文档池
- 每个项目拥有独立的文档列表
- 仅存储文件元数据（不存储实际文件内容）
- 元数据字段：文件名、本地路径、文件类型、文件大小、最后修改时间、SHA256 哈希
- 支持扫描指定目录批量导入文档
- 哈希值变更检测（文件被修改后自动标识）

#### 2. 任务-文档关联
- 任务创建/编辑菜单中新增"高级任务管理"区域（默认收起）
- 可从项目文档池中选择关联文档
- 文档类型区分：
  - 📖 **参考文档**：任务所需的背景资料、设计规范等
  - 📤 **产出文档**：任务完成时应交付的文件
- 产出文档存在即标记任务有明确完成"终点"

#### 3. 文档变更追踪
- 定期扫描关联文档的哈希值
- 文档被修改后在任务详情中提示

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

### API 新增端点

```
GET    /api/documents?project_id=:id     → 获取项目文档列表
POST   /api/documents                     → 添加文档元数据
PUT    /api/documents/:id                 → 更新文档信息
DELETE /api/documents/:id                 → 删除文档记录
POST   /api/documents/scan                → 扫描目录批量导入
GET    /api/tasks/:id/documents           → 获取任务关联文档
POST   /api/tasks/:id/documents           → 关联文档到任务
DELETE /api/tasks/:id/documents/:docId    → 取消关联
```

### 前端变更
- 项目详情页 Tab 切换：任务列表 / 文档池
- TaskForm 高级区域新增文档关联面板
- 文档列表组件（搜索/排序/类型筛选）

---

## v1.2.0 (规划中)

- [ ] 数据导入（从 JSON 备份恢复）
- [ ] 任务模板
- [ ] 快捷键支持
- [ ] 系统托盘常驻
