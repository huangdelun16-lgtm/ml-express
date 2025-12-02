/**
 * 密码加密迁移脚本
 * 将数据库中所有明文密码加密为 bcrypt 哈希
 * 
 * 使用方法：
 * 1. 在 Supabase Dashboard 的 SQL Editor 中运行此脚本
 * 2. 或者通过 Node.js 运行（需要配置 Supabase 连接）
 */

// 注意：这个脚本需要在 Supabase SQL Editor 中运行，或者通过 Node.js 执行
// 以下是 SQL 版本的迁移脚本

const MIGRATION_SQL = `
-- 密码加密迁移脚本
-- 注意：此脚本需要在 Supabase SQL Editor 中运行
-- 或者通过 Node.js 使用 Supabase 客户端执行

-- 步骤 1: 创建一个临时函数来加密密码（使用 pgcrypto）
CREATE OR REPLACE FUNCTION encrypt_password(plain_password TEXT)
RETURNS TEXT AS $$
BEGIN
  -- 注意：Supabase 不支持直接在 SQL 中使用 bcrypt
  -- 需要使用 Netlify Function 或应用程序层来加密
  -- 这个函数仅作为占位符
  RETURN plain_password;
END;
$$ LANGUAGE plpgsql;

-- 步骤 2: 标记需要加密的密码（所有不以 $2a$, $2b$, $2y$ 开头的密码）
-- 这个查询会列出所有需要加密的账号
SELECT 
  id,
  username,
  employee_name,
  CASE 
    WHEN password NOT LIKE '$2a$%' 
     AND password NOT LIKE '$2b$%' 
     AND password NOT LIKE '$2y$%' 
    THEN '需要加密'
    ELSE '已加密'
  END as password_status
FROM admin_accounts;

-- 步骤 3: 手动加密密码（需要通过应用程序或 Netlify Function）
-- 由于 bcrypt 在 SQL 中不可用，需要通过以下方式：
-- 1. 使用 Netlify Function admin-password 的 hash action
-- 2. 或使用 Node.js 脚本批量加密

-- 步骤 4: 更新密码（示例，实际需要通过应用程序执行）
-- UPDATE admin_accounts 
-- SET password = '加密后的密码哈希'
-- WHERE id = '账号ID';
`;

// Node.js 版本的迁移脚本
async function migratePasswords() {
  const { createClient } = require('@supabase/supabase-js');
  const bcrypt = require('bcryptjs');
  
  const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ 缺少 Supabase 配置');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  console.log('🔄 开始密码加密迁移...');
  
  try {
    // 获取所有账号
    const { data: accounts, error } = await supabase
      .from('admin_accounts')
      .select('id, username, password');
    
    if (error) {
      console.error('❌ 获取账号列表失败:', error);
      return;
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('ℹ️ 没有找到需要迁移的账号');
      return;
    }
    
    let migratedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (const account of accounts) {
      // 检查密码是否已加密
      if (account.password && 
          (account.password.startsWith('$2a$') || 
           account.password.startsWith('$2b$') || 
           account.password.startsWith('$2y$'))) {
        console.log(`⏭️  跳过 ${account.username}（密码已加密）`);
        skippedCount++;
        continue;
      }
      
      // 如果没有密码，跳过
      if (!account.password || account.password.trim() === '') {
        console.log(`⚠️  跳过 ${account.username}（无密码，需要手动设置）`);
        skippedCount++;
        continue;
      }
      
      // 加密密码
      try {
        const hashedPassword = await bcrypt.hash(account.password, 10);
        
        // 更新数据库
        const { error: updateError } = await supabase
          .from('admin_accounts')
          .update({ password: hashedPassword })
          .eq('id', account.id);
        
        if (updateError) {
          console.error(`❌ 更新 ${account.username} 失败:`, updateError);
          errorCount++;
        } else {
          console.log(`✅ 已加密 ${account.username} 的密码`);
          migratedCount++;
        }
      } catch (hashError) {
        console.error(`❌ 加密 ${account.username} 的密码失败:`, hashError);
        errorCount++;
      }
    }
    
    console.log('\n📊 迁移完成:');
    console.log(`   ✅ 成功: ${migratedCount}`);
    console.log(`   ⏭️  跳过: ${skippedCount}`);
    console.log(`   ❌ 失败: ${errorCount}`);
    
  } catch (err) {
    console.error('❌ 迁移过程出错:', err);
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  migratePasswords();
}

module.exports = { migratePasswords, MIGRATION_SQL };

