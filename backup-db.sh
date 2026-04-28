#!/bin/bash
# Whorl 数据库备份脚本
# 用法: ./backup-db.sh

DB_DIR="$(dirname "$0")/data"
BACKUP_DIR="$HOME/whorl_bak"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

BACKUP_SUBDIR="$BACKUP_DIR/$TIMESTAMP"
mkdir -p "$BACKUP_SUBDIR"

if [ ! -f "$DB_DIR/whorl.db" ]; then
  echo "✗ 数据库文件不存在: $DB_DIR/whorl.db"
  exit 1
fi

cp "$DB_DIR/whorl.db" "$BACKUP_SUBDIR/whorl.db"
[ -f "$DB_DIR/whorl.db-wal" ] && cp "$DB_DIR/whorl.db-wal" "$BACKUP_SUBDIR/whorl.db-wal"
[ -f "$DB_DIR/whorl.db-shm" ] && cp "$DB_DIR/whorl.db-shm" "$BACKUP_SUBDIR/whorl.db-shm"

echo "✓ 已备份: $BACKUP_SUBDIR/"
ls -lh "$BACKUP_SUBDIR/"
