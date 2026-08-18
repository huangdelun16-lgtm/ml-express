/**
 * 强制密码加密迁移脚本
 * 将所有明文密码强制迁移到 bcrypt 加密格式
 * 
 * ⚠️ 警告：此脚本会要求所有使用明文密码的用户重置密码
 * 
 * 使用方法：
 * 1. 配置环境变量：
 *    export SUPABASE_URL="https://uopkyuluxnrewvlmutam.supabase.co"
 *    export SUPABASE_SERVICE_ROLE="your-service-role-key"
 * 
 * 2. 运行脚本：
 *    node scripts/force-migrate-passwords.js
 */

const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const readline = require('readline');

// 配置 Supabase
const supabaseUrl = process.env.SUPABASE_URL || 'https://uopkyuluxnrewvlmutam.supabase.co';
const supabaseServiceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!supabaseUrl) {
  console.error('❌ 错误：缺少 SUPABASE_URL 环境变量');
  process.exit(1);
}

if (!supabaseServiceRole) {
  console.error('❌ 错误：缺少 SUPABASE_SERVICE_ROLE 环境变量');
  console.error('   请使用 Service Role Key（不是 Anon Key）');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRole);

// 创建 readline 接口
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

/**
 * 检查密码是否为加密格式
 */
function isPasswordHashed(password) {
  if (!password) return false;
  return password.startsWith('$2a$') || 
         password.startsWith('$2b$') || 
         password.startsWith('$2y$');
}

/**
 * 强制迁移所有明文密码
 */
async function forceMigratePasswords() {
  console.log('🔒 强制密码加密迁移脚本');
  console.log('⚠️  警告：此操作会要求所有使用明文密码的用户重置密码\n');
  
  // 确认操作
  const confirm = await question('是否继续？(yes/no): ');
  if (confirm.toLowerCase() !== 'yes') {
    console.log('❌ 操作已取消');
    rl.close();
    return;
  }
  
  console.log('\n🔄 开始扫描数据库...\n');
  
  try {
    // 获取所有账号
    const { data: accounts, error } = await supabase
      .from('admin_accounts')
      .select('id, username, employee_name, password, status');
    
    if (error) {
      console.error('❌ 获取账号列表失败:', error);
      rl.close();
      return;
    }
    
    if (!accounts || accounts.length === 0) {
      console.log('ℹ️  没有找到账号');
      rl.close();
      return;
    }
    
    // 分析密码状态
    const plaintextAccounts = [];
    const hashedAccounts = [];
    const emptyAccounts = [];
    
    for (const account of accounts) {
      if (!account.password || account.password.trim() === '') {
        emptyAccounts.push(account);
      } else if (isPasswordHashed(account.password)) {
        hashedAccounts.push(account);
      } else {
        plaintextAccounts.push(account);
      }
    }
    
    console.log('📊 密码状态分析:');
    console.log(`   ✅ 已加密: ${hashedAccounts.length}`);
    console.log(`   ⚠️  明文密码: ${plaintextAccounts.length}`);
    console.log(`   ❌ 无密码: ${emptyAccounts.length}\n`);
    
    if (plaintextAccounts.length === 0 && emptyAccounts.length === 0) {
      console.log('✅ 所有密码都已加密，无需迁移！');
      rl.close();
      return;
    }
    
    // 显示需要迁移的账号
    if (plaintextAccounts.length > 0) {
      console.log('⚠️  以下账号使用明文密码，需要重置:');
      plaintextAccounts.forEach(acc => {
        console.log(`   - ${acc.username} (${acc.employee_name})`);
      });
      console.log('');
    }
    
    if (emptyAccounts.length > 0) {
      console.log('❌ 以下账号没有密码:');
      emptyAccounts.forEach(acc => {
        console.log(`   - ${acc.username} (${acc.employee_name})`);
      });
      console.log('');
    }
    
    // 确认迁移方式
    console.log('选择迁移方式:');
    console.log('1. 将明文密码设置为临时密码（需要用户首次登录后修改）');
    console.log('2. 将明文密码设置为空（强制用户重置密码）');
    console.log('3. 取消操作');
    
    const choice = await question('\n请选择 (1/2/3): ');
    
    if (choice === '3') {
      console.log('❌ 操作已取消');
      rl.close();
      return;
    }
    
    let tempPassword = null;
    if (choice === '1') {
      tempPassword = await question('请输入临时密码（所有用户将使用此密码）: ');
      if (!tempPassword || tempPassword.trim() === '') {
        console.log('❌ 临时密码不能为空');
        rl.close();
        return;
      }
    }
    
    console.log('\n🔄 开始迁移...\n');
    
    let migratedCount = 0;
    let errorCount = 0;
    
    // 迁移明文密码
    for (const account of plaintextAccounts) {
      try {
        let newPassword;
        
        if (choice === '1') {
          // 使用临时密码
          newPassword = await bcrypt.hash(tempPassword, 10);
        } else {
          // 设置为空（需要用户重置）
          newPassword = null;
        }
        
        const updateData = choice === '1' 
          ? { password: newPassword }
          : { password: null };
        
        const { error: updateError } = await supabase
          .from('admin_accounts')
          .update(updateData)
          .eq('id', account.id);
        
        if (updateError) {
          console.error(`❌ 更新 ${account.username} 失败:`, updateError.message);
          errorCount++;
        } else {
          if (choice === '1') {
            console.log(`✅ ${account.username} 已设置为临时密码`);
          } else {
            console.log(`✅ ${account.username} 密码已清空（需要重置）`);
          }
          migratedCount++;
        }
      } catch (err) {
        console.error(`❌ 处理 ${account.username} 时出错:`, err.message);
        errorCount++;
      }
    }
    
    // 处理无密码账号
    if (emptyAccounts.length > 0 && choice === '1') {
      console.log('\n处理无密码账号...\n');
      
      for (const account of emptyAccounts) {
        try {
          const newPassword = await bcrypt.hash(tempPassword, 10);
          
          const { error: updateError } = await supabase
            .from('admin_accounts')
            .update({ password: newPassword })
            .eq('id', account.id);
          
          if (updateError) {
            console.error(`❌ 更新 ${account.username} 失败:`, updateError.message);
            errorCount++;
          } else {
            console.log(`✅ ${account.username} 已设置临时密码`);
            migratedCount++;
          }
        } catch (err) {
          console.error(`❌ 处理 ${account.username} 时出错:`, err.message);
          errorCount++;
        }
      }
    }
    
    console.log('\n📊 迁移完成:');
    console.log(`   ✅ 成功: ${migratedCount}`);
    console.log(`   ❌ 失败: ${errorCount}`);
    
    if (choice === '1') {
      console.log('\n⚠️  重要提示:');
      console.log(`   所有迁移的账号现在使用临时密码: ${tempPassword}`);
      console.log('   请通知用户首次登录后立即修改密码！');
    } else {
      console.log('\n⚠️  重要提示:');
      console.log('   所有迁移的账号密码已清空');
      console.log('   用户需要通过"忘记密码"功能重置密码！');
    }
    
  } catch (err) {
    console.error('❌ 迁移过程出错:', err);
  } finally {
    rl.close();
  }
}

// 运行迁移
if (require.main === module) {
  forceMigratePasswords().catch(err => {
    console.error('❌ 脚本执行失败:', err);
    process.exit(1);
  });
}

module.exports = { forceMigratePasswords };

