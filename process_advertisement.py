#!/usr/bin/env python3
"""
处理 MARKET LINK EXPRESS 广告图片
1. 抠出 LOGO 并替换为公司 LOGO
2. 抠出二维码并替换为新二维码
3. 移除 #2E86AB 和 #FFA726 颜色块
4. 移除 "豆包AI生成" 文字
5. 生成最终图片用于替换应用中的服务卡片
"""

from PIL import Image, ImageDraw, ImageFont
import numpy as np
import cv2
import os

def process_advertisement():
    """处理广告图片"""
    
    # 检查文件是否存在
    if not os.path.exists('advertisement_original.png'):
        print("❌ 请将原始广告图片命名为 'advertisement_original.png' 并放在当前目录")
        return False
    
    if not os.path.exists('new_qr_code.png'):
        print("❌ 请将新二维码图片命名为 'new_qr_code.png' 并放在当前目录")
        return False
    
    if not os.path.exists('public/logo.png'):
        print("❌ 公司 LOGO 文件不存在: public/logo.png")
        return False
    
    try:
        # 1. 加载原始广告图片
        print("📸 加载原始广告图片...")
        original_img = Image.open('advertisement_original.png')
        img_array = np.array(original_img)
        
        # 2. 加载公司 LOGO
        print("🏢 加载公司 LOGO...")
        company_logo = Image.open('public/logo.png')
        
        # 3. 加载新二维码
        print("📱 加载新二维码...")
        new_qr = Image.open('new_qr_code.png')
        
        # 4. 处理图片
        print("🎨 开始处理图片...")
        
        # 转换为 RGBA 以便处理透明度
        if original_img.mode != 'RGBA':
            original_img = original_img.convert('RGBA')
        
        # 创建处理后的图片
        processed_img = original_img.copy()
        
        # 5. 替换 LOGO (假设 LOGO 在左上角区域)
        print("🔄 替换 LOGO...")
        # 调整公司 LOGO 大小
        logo_size = (80, 80)  # 根据原始 LOGO 大小调整
        company_logo_resized = company_logo.resize(logo_size, Image.Resampling.LANCZOS)
        
        # 将 LOGO 放在左上角 (根据原始图片调整位置)
        logo_position = (20, 20)  # 根据原始图片调整
        processed_img.paste(company_logo_resized, logo_position, company_logo_resized)
        
        # 6. 替换二维码 (假设二维码在右下角)
        print("🔄 替换二维码...")
        # 调整二维码大小
        qr_size = (120, 120)  # 根据原始二维码大小调整
        new_qr_resized = new_qr.resize(qr_size, Image.Resampling.LANCZOS)
        
        # 将二维码放在右下角 (根据原始图片调整位置)
        qr_position = (processed_img.width - qr_size[0] - 20, processed_img.height - qr_size[1] - 20)
        processed_img.paste(new_qr_resized, qr_position, new_qr_resized)
        
        # 7. 移除特定颜色块 (#2E86AB 和 #FFA726)
        print("🎨 移除特定颜色块...")
        processed_img = remove_color_blocks(processed_img)
        
        # 8. 移除 "豆包AI生成" 文字
        print("📝 移除文字...")
        processed_img = remove_text(processed_img)
        
        # 9. 保存处理后的图片
        print("💾 保存处理后的图片...")
        processed_img.save('advertisement_processed.png', 'PNG')
        
        # 10. 创建服务卡片版本 (用于替换应用中的服务卡片)
        print("🎯 创建服务卡片版本...")
        create_service_cards(processed_img)
        
        print("✅ 图片处理完成!")
        print("📁 生成的文件:")
        print("   - advertisement_processed.png (完整广告图片)")
        print("   - service_cards.png (服务卡片版本)")
        
        return True
        
    except Exception as e:
        print(f"❌ 处理图片时出错: {str(e)}")
        return False

def remove_color_blocks(img):
    """移除特定颜色的色块"""
    img_array = np.array(img)
    
    # 定义要移除的颜色 (BGR 格式)
    colors_to_remove = [
        [171, 134, 46],  # #2E86AB 的 BGR 值
        [38, 167, 255],  # #FFA726 的 BGR 值
    ]
    
    # 创建掩码
    mask = np.zeros(img_array.shape[:2], dtype=np.uint8)
    
    for color in colors_to_remove:
        # 计算颜色差异
        diff = np.sqrt(np.sum((img_array - color) ** 2, axis=2))
        # 如果颜色差异小于阈值，则标记为要移除的区域
        color_mask = diff < 30
        mask = np.logical_or(mask, color_mask)
    
    # 将标记的区域设为透明
    img_array[mask] = [0, 0, 0, 0]
    
    return Image.fromarray(img_array)

def remove_text(img):
    """移除特定文字"""
    img_array = np.array(img)
    
    # 这里需要根据实际图片调整
    # 假设 "豆包AI生成" 在图片的某个特定区域
    # 可以通过颜色检测或位置检测来移除
    
    # 示例：移除右下角区域的文字
    height, width = img_array.shape[:2]
    
    # 定义文字可能出现的区域 (右下角)
    text_region = img_array[height-50:height, width-200:width]
    
    # 检测白色或浅色文字
    white_threshold = 200
    text_mask = np.all(text_region > white_threshold, axis=2)
    
    # 将文字区域设为透明
    img_array[height-50:height, width-200:width][text_mask] = [0, 0, 0, 0]
    
    return Image.fromarray(img_array)

def create_service_cards(processed_img):
    """创建服务卡片版本"""
    # 从处理后的图片中提取服务卡片区域
    # 假设服务卡片在图片的某个特定区域
    
    # 创建服务卡片图片
    card_width = 300
    card_height = 200
    
    # 从原图中提取服务卡片区域
    # 这里需要根据实际图片调整坐标
    service_card = processed_img.crop((0, 0, card_width, card_height))
    
    # 保存服务卡片
    service_card.save('service_cards.png', 'PNG')

if __name__ == "__main__":
    print("🚀 开始处理 MARKET LINK EXPRESS 广告图片...")
    success = process_advertisement()
    
    if success:
        print("\n🎉 处理完成!")
        print("📋 下一步:")
        print("1. 检查生成的图片")
        print("2. 将 service_cards.png 复制到应用资源目录")
        print("3. 更新应用中的服务卡片图片")
    else:
        print("\n❌ 处理失败，请检查错误信息")
