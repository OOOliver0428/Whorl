---
name: whorl-cli
description: CLI interface for the Whorl personal task manager. Use when the user wants to read, create, update, or delete tasks/projects/tags/documents in their Whorl system. Triggers on: whorl, task management, 任务管理, 番茄钟, 统计, documents pool, backup database.
---

# Whorl CLI

Whorl (个人效率引擎) 的命令行接口，提供给 AI agent 使用。服务端通过 `cli.sh` 调用 Whorl REST API。

## 前提

- Whorl 服务必须正在运行 (`npm start` 或 `npm run dev`)
- 服务地址默认 `http://localhost:3001`，可通过 `WHORL_URL` 环境变量修改
- CLI 入口: `./cli.sh` (项目根目录下)

## 前缀隔离

CLI 命令分为三个前缀，物理隔离读写：

| 前缀 | 说明 | 安全等级 |
|------|------|---------|
| `cli.sh read` | 只读查询 | 安全，可随意使用 |
| `cli.sh write` | 写操作 (创建/更新/删除) | 谨慎，delete 需 `--confirm` |
| `cli.sh backup` | 数据库备份 | 安全，推荐在写操作前执行 |

## 数据安全纪律

**这是最重要的部分。违反这些纪律可能导致数据丢失。**

### 铁律

1. **写前先读**: 执行任何 `cli.sh write` 操作前，必须先用 `cli.sh read` 获取当前数据状态，确认要操作的目标存在且是你意图的对象。
2. **删前备份**: 执行任何 `delete` 操作前，必须先运行 `cli.sh backup`。
3. **逐条确认**: `delete` 每次只操作一条，确认 ID 正确后再加 `--confirm`。绝对不要批量删除。
4. **验证结果**: 每次 `write` 操作后，立即用 `cli.sh read` 验证操作结果是否符合预期。
5. **不猜测 ID**: 永远通过 `read` 获取真实 ID，不要猜测或假设 ID 值。
6. **不盲目执行**: 用户说"清空所有 tasks"时，先 list 展示要删除的条目，让用户确认，严禁直接批量删除。

### 写保护流程

对于 `delete` 子命令，Cli 实现了双重保护:
1. 必须传 `--confirm` 标志，否则 Cli 会打印将被删除的资源详情并拒绝执行
2. 需要验证资源是否存在

### 推荐操作流程

```
1. cli.sh backup                        # 备份数据库
2. cli.sh read task list --status todo  # 查看当前状态
3. cli.sh read task get 42              # 确认要操作的目标
4. cli.sh write task update 42 --status done  # 执行操作
5. cli.sh read task get 42              # 验证结果
```

---

## 完整命令参考

### 任务 (task)

```bash
# === 读 ===

# 任务列表 (支持全部 API 过滤参数)
cli.sh read task list [--status todo|done] [--project-id <n>] [--search <keyword>] \
  [--priority 0-3] [--due-from <date>] [--due-to <date>] [--tag-id <n>] \
  [--tag-ids 1,2,3] [--parent-id <n>|null]

# 单任务详情 (含 subtasks, tags)
cli.sh read task get <id>

# 任务关联文档
cli.sh read task documents <taskId>

# === 写 ===

# 创建任务
cli.sh write task create \
  --title "任务标题" \
  [--description "描述"] \
  [--priority 0|1|2|3] \
  [--due-date "2026-05-01"] \
  [--project-id <n>] \
  [--parent-id <n>] \
  [--estimated-minutes 30] \
  [--recurrence daily|weekly|monthly] \
  [--tag-ids 1,2,3]

# 更新任务 (只传要更新的字段)
cli.sh write task update <id> \
  [--title "..."] [--description "..."] [--status todo|done] \
  [--priority 0-3] [--due-date "..."] [--project-id <n>|null] \
  [--parent-id <n>|null] [--estimated-minutes <n>] \
  [--recurrence daily|weekly|monthly] [--tag-ids 1,2,3]

# 删除任务 (必须 --confirm)
cli.sh write task delete <id> --confirm

# 任务排序
cli.sh write task reorder --items '[{"id":1,"sort_order":0},{"id":2,"sort_order":1}]'

# 关联/取消关联文档
cli.sh write task link <taskId> <docId> [--type reference|output]
cli.sh write task unlink <taskId> <docId> --confirm
```

### 项目 (project)

```bash
# === 读 ===
cli.sh read project list
cli.sh read project get <id>

# === 写 ===
cli.sh write project create --name "项目名" [--color "#6366f1"] [--icon "📁"]
cli.sh write project update <id> [--name "..."] [--color "..."] [--icon "..."] [--archived]
cli.sh write project delete <id> --confirm
```

### 标签 (tag)

```bash
# === 读 ===
cli.sh read tag list

# === 写 ===
cli.sh write tag create --name "标签名" [--color "#94a3b8"]
cli.sh write tag update <id> [--name "..."] [--color "..."]
cli.sh write tag delete <id> --confirm
```

### 番茄钟 (pomodoro)

```bash
# === 读 ===
cli.sh read pomodoro list [--date "2026-04-27"] [--task-id <n>] [--limit 50]
cli.sh read pomodoro today

# === 写 ===
cli.sh write pomodoro start [--task-id <n>] [--duration 25] [--type work|break]
```

### 统计 (stats)

```bash
# === 只读 ===
cli.sh read stats overview
cli.sh read stats trend [--range 30]
cli.sh read stats projects
cli.sh read stats priority
cli.sh read stats heatmap [--year 2026]
cli.sh read stats weekly [--project-id <n>] [--weeks 12]
cli.sh read stats tags [--range week|month|quarter|year]
```

### 导出 (export)

```bash
# === 只读 ===
cli.sh read export json                # stdout 输出 JSON
cli.sh read export json --file /tmp/whorl.json  # 写入文件
cli.sh read export csv                 # stdout 输出 CSV
cli.sh read export csv --file /tmp/whorl.csv
```

### 文档池 (document)

```bash
# === 读 ===
cli.sh read document list --project-id <n> [--status active|missing|changed] [--file-type pdf] [--search "..."] [--sort name|size|modified]
cli.sh read document get <id>

# === 写 ===
cli.sh write document create \
  --name "文件名" --project-id <n> \
  [--path "/path/to/file"] [--file-type "pdf"] [--size 12345] \
  [--last-modified "2026-01-01T00:00:00.000Z"] [--hash "sha256..."]

cli.sh write document update <id> [--name "..."] [--description "..."] [--status active|missing|changed]
cli.sh write document delete <id> --confirm

# 扫描目录
cli.sh write document scan --directory "/path/to/dir" [--project-id <n>] [--extensions pdf,md,docx]

# 批量导入
cli.sh write document import --project-id <n> --files '[{"name":"a.pdf","file_path":"/path/a.pdf","file_type":"pdf","file_size":1000,"last_modified":"..."}]'

# 检查变化
cli.sh write document check --document-ids '[1,2,3]'

# 刷新单个文档哈希
cli.sh write document refresh <id>
```

### 备份 (backup)

```bash
cli.sh backup
# 将 data/whorl.db (含 WAL/SHM) 备份到 ~/whorl_bak/<YYYYMMDD_HHMMSS>/
```

---

## 输出格式

所有 `read` 和 `write` 命令输出 **纯 JSON 到 stdout**，错误输出到 stderr。

- 成功: stdout 为 API 返回的 JSON，exit code 0
- 失败: stderr 为错误信息，exit code 非 0

唯一例外: `export csv` 输出原始 CSV 文本 (含 UTF-8 BOM)。

---

## 常见场景示例

### 查看今日任务并完成一项

```bash
cli.sh read task list --due-from "$(date +%Y-%m-%d)" --due-to "$(date +%Y-%m-%d)" --status todo
# 找到 ID=42
cli.sh write task update 42 --status done
cli.sh read task get 42
```

### 创建带标签的紧急任务

```bash
cli.sh read tag list  # 找到标签 ID
cli.sh write task create --title "紧急修复" --priority 3 --tag-ids 1,3
```

### 批量更改项目下的任务状态

```bash
cli.sh read project list  # 找到项目 ID
cli.sh read task list --project-id 3 --status todo  # 查看待办
# 逐个处理，不要批量执行
for each task found, confirm with user then:
  cli.sh write task update <id> --status done
```

### 每日巡检 (建议 cron)

```bash
cli.sh backup
cli.sh read stats overview
cli.sh read stats trend --range 7
```

---

## 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `WHORL_URL` | `http://localhost:3001` | Whorl 服务地址 |

---

## 已知修复

- `toQueryString` 连字符转下划线: CLI 用 `--project-id`，API 期望 `project_id`。已在 `cli/args.ts` 的 `toQueryString` 中加了 `.replace(/-/g, '_')` 转换。

## 错误处理指南

1. **404 Not Found**: 检查 ID 是否正确，用 `list` 确认资源存在
2. **409 Conflict**: 资源重复 (如 document import 时文件已存在)
3. **需要 --confirm**: 补上 `--confirm` 参数
4. **连接失败**: 确认 Whorl 服务正在运行
5. **JSON 解析错误**: 检查 `--files`、`--items` 等 JSON 参数的格式
6. **project_id is required**: 确认 args.ts 的 `toQueryString` 已做连字符→下划线转换
