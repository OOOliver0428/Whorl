#!/bin/bash
# Whorl 数据库备份脚本
# 用法: ./backup-db.sh

DB_DIR="$(dirname "$0")/data"
BACKUP_DIR="$HOME/whorl_bak"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

mkdir -p "$BACKUP_DIR"

if [ ! -f "$DB_DIR/whorl.db" ]; then
  echo "✗ 数据库文件不存在: $DB_DIR/whorl.db"
  exit 1
fi

cp "$DB_DIR/whorl.db" "$BACKUP_DIR/whorl_${TIMESTAMP}.db"
[ -f "$DB_DIR/whorl.db-wal" ] && cp "$DB_DIR/whorl.db-wal" "$BACKUP_DIR/whorl_${TIMESTAMP}.db-wal"
[ -f "$DB_DIR/whorl.db-shm" ] && cp "$DB_DIR/whorl.db-shm" "$BACKUP_DIR/whorl_${TIMESTAMP}.db-shm"

echo "✓ 已备份: $BACKUP_DIR/whorl_${TIMESTAMP}.db"
ls -lh "$BACKUP_DIR/whorl_${TIMESTAMP}.db"
