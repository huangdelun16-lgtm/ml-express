#!/usr/bin/env python3
"""
创建 MARKET LINK EXPRESS 服务卡片
基于用户提供的图片创建服务卡片版本
"""

from PIL import Image, ImageDraw, ImageFont
import os

def create_service_cards():
    """创建服务卡片"""
    
    try:
        # 1. 创建服务卡片背景
        card_width = 400
        card_height = 300
        
        # 使用渐变背景
        background = Image.new('RGBA', (card_width, card_height), (176, 211, 232, 255))
        
        # 2. 加载公司 LOGO
        if os.path.exists('public/logo.png'):
            company_logo = Image.open('public/logo.png')
            logo_size = (60, 60)
            company_logo_resized = company_logo.resize(logo_size, Image.Resampling.LANCZOS)
            
            # 将 LOGO 放在左上角
            background.paste(company_logo_resized, (20, 20), company_logo_resized)
        
        # 3. 添加标题
        draw = ImageDraw.Draw(background)
        
        # 尝试加载字体
        try:
            title_font = ImageFont.truetype("arial.ttf", 24)
            subtitle_font = ImageFont.truetype("arial.ttf", 16)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
        
        # 标题
        title_text = "MARKET LINK EXPRESS"
        title_bbox = draw.textbbox((0, 0), title_text, font=title_font)
        title_width = title_bbox[2] - title_bbox[0]
        title_x = (card_width - title_width) // 2
        draw.text((title_x, 100), title_text, fill=(255, 255, 255, 255), font=title_font)
        
        # 副标题
        subtitle_text = "曼德勒最萌快递服务"
        subtitle_bbox = draw.textbbox((0, 0), subtitle_text, font=subtitle_font)
        subtitle_width = subtitle_bbox[2] - subtitle_bbox[0]
        subtitle_x = (card_width - subtitle_width) // 2
        draw.text((subtitle_x, 130), subtitle_text, fill=(255, 255, 255, 255), font=subtitle_font)
        
        # 4. 添加服务特色
        features = [
            "⚡ 实时小猫追踪",
            "🛡️ 快速安全送达", 
            "📱 可爱客服体验"
        ]
        
        feature_y = 170
        for feature in features:
            draw.text((50, feature_y), feature, fill=(255, 255, 255, 255), font=subtitle_font)
            feature_y += 25
        
        # 5. 添加二维码区域
        qr_area_size = 80
        qr_x = card_width - qr_area_size - 20
        qr_y = card_height - qr_area_size - 20
        
        # 绘制二维码背景
        qr_bg = Image.new('RGBA', (qr_area_size, qr_area_size), (255, 255, 255, 255))
        background.paste(qr_bg, (qr_x, qr_y))
        
        # 添加二维码文字
        qr_text = "扫码下载"
        qr_text_bbox = draw.textbbox((0, 0), qr_text, font=subtitle_font)
        qr_text_width = qr_text_bbox[2] - qr_text_bbox[0]
        qr_text_x = qr_x + (qr_area_size - qr_text_width) // 2
        draw.text((qr_text_x, qr_y + qr_area_size + 5), qr_text, fill=(255, 255, 255, 255), font=subtitle_font)
        
        # 6. 保存服务卡片
        background.save('service_cards.png', 'PNG')
        
        print("✅ 服务卡片创建完成!")
        print("📁 生成的文件: service_cards.png")
        
        return True
        
    except Exception as e:
        print(f"❌ 创建服务卡片时出错: {str(e)}")
        return False

def create_simple_service_card():
    """创建简单的服务卡片"""
    
    try:
        # 创建服务卡片
        card_width = 350
        card_height = 250
        
        # 使用渐变背景
        background = Image.new('RGBA', (card_width, card_height), (176, 211, 232, 255))
        
        # 添加渐变效果
        draw = ImageDraw.Draw(background)
        for y in range(card_height):
            alpha = int(255 * (1 - y / card_height * 0.3))
            color = (176, 211, 232, alpha)
            draw.line([(0, y), (card_width, y)], fill=color)
        
        # 加载公司 LOGO
        if os.path.exists('public/logo.png'):
            company_logo = Image.open('public/logo.png')
            logo_size = (50, 50)
            company_logo_resized = company_logo.resize(logo_size, Image.Resampling.LANCZOS)
            
            # 将 LOGO 放在左上角
            background.paste(company_logo_resized, (15, 15), company_logo_resized)
        
        # 添加标题
        try:
            title_font = ImageFont.truetype("arial.ttf", 20)
            subtitle_font = ImageFont.truetype("arial.ttf", 14)
        except:
            title_font = ImageFont.load_default()
            subtitle_font = ImageFont.load_default()
        
        # 标题
        title_text = "MARKET LINK EXPRESS"
        draw.text((80, 20), title_text, fill=(255, 255, 255, 255), font=title_font)
        
        # 副标题
        subtitle_text = "曼德勒最萌快递服务"
        draw.text((80, 45), subtitle_text, fill=(255, 255, 255, 255), font=subtitle_font)
        
        # 添加服务特色
        features = [
            "⚡ 实时小猫追踪",
            "🛡️ 快速安全送达", 
            "📱 可爱客服体验"
        ]
        
        feature_y = 80
        for feature in features:
            draw.text((20, feature_y), feature, fill=(255, 255, 255, 255), font=subtitle_font)
            feature_y += 25
        
        # 添加二维码区域
        qr_area_size = 60
        qr_x = card_width - qr_area_size - 15
        qr_y = card_height - qr_area_size - 15
        
        # 绘制二维码背景
        qr_bg = Image.new('RGBA', (qr_area_size, qr_area_size), (255, 255, 255, 255))
        background.paste(qr_bg, (qr_x, qr_y))
        
        # 添加二维码文字
        qr_text = "扫码下载"
        draw.text((qr_x, qr_y + qr_area_size + 5), qr_text, fill=(255, 255, 255, 255), font=subtitle_font)
        
        # 保存服务卡片
        background.save('simple_service_card.png', 'PNG')
        
        print("✅ 简单服务卡片创建完成!")
        print("📁 生成的文件: simple_service_card.png")
        
        return True
        
    except Exception as e:
        print(f"❌ 创建简单服务卡片时出错: {str(e)}")
        return False

if __name__ == "__main__":
    print("🚀 开始创建 MARKET LINK EXPRESS 服务卡片...")
    
    # 创建两种版本的服务卡片
    success1 = create_service_cards()
    success2 = create_simple_service_card()
    
    if success1 and success2:
        print("\n🎉 服务卡片创建完成!")
        print("📋 生成的文件:")
        print("   - service_cards.png (完整版本)")
        print("   - simple_service_card.png (简化版本)")
        print("\n📋 下一步:")
        print("1. 检查生成的图片")
        print("2. 将图片复制到应用资源目录")
        print("3. 更新应用中的服务卡片")
    else:
        print("\n❌ 创建失败，请检查错误信息")
