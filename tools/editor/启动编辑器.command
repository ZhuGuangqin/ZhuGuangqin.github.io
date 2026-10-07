#!/bin/bash
# 双击本文件即可启动「学术主页内容编辑器」
cd "$(dirname "$0")/../.." || exit 1
echo "正在启动编辑器…"
exec /usr/bin/python3 tools/editor/server.py
