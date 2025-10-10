#!/usr/bin/env node
/**
 * 创建 MARKET LINK EXPRESS 服务卡片
 * 使用 Node.js 和 Canvas API 生成服务卡片
 */

const fs = require('fs');
const path = require('path');

// 检查是否安装了 canvas
let canvas, Image;
try {
    canvas = require('canvas');
    Image = canvas.Image;
} catch (error) {
    console.log('❌ 需要安装 canvas 包: npm install canvas');
    console.log('📋 或者使用其他方法处理图片');
    process.exit(1);
}

function createServiceCard() {
    try {
        // 创建画布
        const width = 400;
        const height = 300;
        const canvasElement = canvas.createCanvas(width, height);
        const ctx = canvasElement.getContext('2d');
        
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#b0d3e8');
        gradient.addColorStop(1, '#558cea');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 添加公司 LOGO (如果有的话)
        if (fs.existsSync('public/logo.png')) {
            try {
                const logoImg = new Image();
                logoImg.src = fs.readFileSync('public/logo.png');
                
                // 调整 LOGO 大小
                const logoSize = 50;
                ctx.drawImage(logoImg, 15, 15, logoSize, logoSize);
            } catch (error) {
                console.log('⚠️ 无法加载 LOGO 图片');
            }
        }
        
        // 添加标题
        ctx.fillStyle = 'white';
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('MARKET LINK EXPRESS', 80, 35);
        
        // 添加副标题
        ctx.font = '14px Arial';
        ctx.fillText('曼德勒最萌快递服务', 80, 55);
        
        // 添加服务特色
        const features = [
            '⚡ 实时小猫追踪',
            '🛡️ 快速安全送达',
            '📱 可爱客服体验'
        ];
        
        let y = 90;
        features.forEach(feature => {
            ctx.fillText(feature, 20, y);
            y += 25;
        });
        
        // 添加二维码区域
        const qrSize = 60;
        const qrX = width - qrSize - 15;
        const qrY = height - qrSize - 15;
        
        // 绘制二维码背景
        ctx.fillStyle = 'white';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        
        // 添加二维码边框
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        
        // 添加二维码文字
        ctx.fillStyle = 'white';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('扫码下载', qrX + qrSize/2, qrY + qrSize + 20);
        
        // 保存图片
        const buffer = canvasElement.toBuffer('image/png');
        fs.writeFileSync('service_cards.png', buffer);
        
        console.log('✅ 服务卡片创建完成!');
        console.log('📁 生成的文件: service_cards.png');
        
        return true;
        
    } catch (error) {
        console.log(`❌ 创建服务卡片时出错: ${error.message}`);
        return false;
    }
}

function createSimpleServiceCard() {
    try {
        // 创建较小的服务卡片
        const width = 300;
        const height = 200;
        const canvasElement = canvas.createCanvas(width, height);
        const ctx = canvasElement.getContext('2d');
        
        // 创建渐变背景
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#b0d3e8');
        gradient.addColorStop(1, '#558cea');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        
        // 添加公司 LOGO
        if (fs.existsSync('public/logo.png')) {
            try {
                const logoImg = new Image();
                logoImg.src = fs.readFileSync('public/logo.png');
                
                const logoSize = 40;
                ctx.drawImage(logoImg, 10, 10, logoSize, logoSize);
            } catch (error) {
                console.log('⚠️ 无法加载 LOGO 图片');
            }
        }
        
        // 添加标题
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('MARKET LINK EXPRESS', 60, 30);
        
        // 添加副标题
        ctx.font = '12px Arial';
        ctx.fillText('曼德勒最萌快递服务', 60, 45);
        
        // 添加服务特色
        const features = [
            '⚡ 实时追踪',
            '🛡️ 安全送达',
            '📱 客服体验'
        ];
        
        let y = 70;
        features.forEach(feature => {
            ctx.fillText(feature, 15, y);
            y += 20;
        });
        
        // 添加二维码区域
        const qrSize = 50;
        const qrX = width - qrSize - 10;
        const qrY = height - qrSize - 10;
        
        // 绘制二维码背景
        ctx.fillStyle = 'white';
        ctx.fillRect(qrX, qrY, qrSize, qrSize);
        
        // 添加二维码边框
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.strokeRect(qrX, qrY, qrSize, qrSize);
        
        // 添加二维码文字
        ctx.fillStyle = 'white';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('扫码下载', qrX + qrSize/2, qrY + qrSize + 15);
        
        // 保存图片
        const buffer = canvasElement.toBuffer('image/png');
        fs.writeFileSync('simple_service_card.png', buffer);
        
        console.log('✅ 简单服务卡片创建完成!');
        console.log('📁 生成的文件: simple_service_card.png');
        
        return true;
        
    } catch (error) {
        console.log(`❌ 创建简单服务卡片时出错: ${error.message}`);
        return false;
    }
}

// 主函数
function main() {
    console.log('🚀 开始创建 MARKET LINK EXPRESS 服务卡片...');
    
    const success1 = createServiceCard();
    const success2 = createSimpleServiceCard();
    
    if (success1 && success2) {
        console.log('\n🎉 服务卡片创建完成!');
        console.log('📋 生成的文件:');
        console.log('   - service_cards.png (完整版本)');
        console.log('   - simple_service_card.png (简化版本)');
        console.log('\n📋 下一步:');
        console.log('1. 检查生成的图片');
        console.log('2. 将图片复制到应用资源目录');
        console.log('3. 更新应用中的服务卡片');
    } else {
        console.log('\n❌ 创建失败，请检查错误信息');
    }
}

// 运行主函数
main();
