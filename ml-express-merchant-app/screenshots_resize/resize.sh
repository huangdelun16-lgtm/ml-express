#!/bin/bash

# 目标尺寸
TARGET_WIDTH=2064
TARGET_HEIGHT=2752

# 获取脚本所在目录的绝对路径
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SOURCE_DIR="$SCRIPT_DIR/source"
OUTPUT_DIR="$SCRIPT_DIR/resized"

# 检查 source 目录是否存在
if [ ! -d "$SOURCE_DIR" ]; then
    echo "错误: source 目录不存在: $SOURCE_DIR"
    exit 1
fi

# 检查并创建 resized 目录
if [ ! -d "$OUTPUT_DIR" ]; then
    mkdir -p "$OUTPUT_DIR"
fi

echo "开始处理图片..."
echo "目标尺寸: 2064x2752"

# 计数器
count=0

# 遍历图片文件 (支持 jpg, jpeg, png)
shopt -s nullglob
for img in "$SOURCE_DIR"/*.{jpg,jpeg,png,JPG,JPEG,PNG}; do
    if [ -f "$img" ]; then
        filename=$(basename "$img")
        echo "正在处理: $filename"
        
        # 使用 sips 调整大小 (注意: sips -z height width)
        # --resampleHeightWidth 指定高度和宽度
        sips --resampleHeightWidth $TARGET_HEIGHT $TARGET_WIDTH "$img" --out "$OUTPUT_DIR/$filename" > /dev/null
        
        if [ $? -eq 0 ]; then
            echo "✅ 成功: $filename"
            ((count++))
        else
            echo "❌ 失败: $filename"
        fi
    fi
done

if [ $count -eq 0 ]; then
    echo "⚠️  在 source 文件夹中没有找到图片。"
    echo "请将需要修改的图片放入 $SOURCE_DIR 文件夹中。"
else
    echo "🎉 处理完成！共处理了 $count 张图片。"
    echo "调整后的图片保存在: $OUTPUT_DIR"
fi
