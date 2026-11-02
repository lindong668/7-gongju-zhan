#!/bin/bash
# Yarrow Tools — 域名一键替换
# 用法:  bash setdomain.sh yourdomain.com
# 作用:  把全站 __DOMAIN__ 换成真实域名，wrangler 的 zone 一并写入
set -e
D="$1"
if [ -z "$D" ]; then echo "用法: bash setdomain.sh yourdomain.com"; exit 1; fi
# 取主域名（去掉可能的 www. 与子域）作为 zone
ZONE=$(echo "$D" | sed -E 's/^www\.//' | awk -F. '{if (NF>2) {print $(NF-1)"."$NF} else print $0}')
echo "域名: $D"
echo "zone: $ZONE"
n=$(grep -rl '__DOMAIN__' public src wrangler.toml 2>/dev/null | wc -l)
echo "待替换文件: $n"
grep -rl '__DOMAIN__' public src wrangler.toml 2>/dev/null | while read -r f; do
  sed -i "s|__DOMAIN__|$D|g" "$f"
done
sed -i "s|__ZONE__|$ZONE|g" wrangler.toml
left=$(grep -rn '__DOMAIN__\|__ZONE__' public src wrangler.toml 2>/dev/null | wc -l)
echo "剩余占位符: $left"
if [ "$left" -eq 0 ]; then echo "✓ 替换完成，可以部署"; else echo "✗ 仍有残留"; exit 1; fi
