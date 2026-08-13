import { supabase, netlifyUrl } from './supabaseClient';
import type { AdminAccount } from './types';
import { logger } from '../LoggerService';

export const adminAccountService = {
  async login(username: string, password: string): Promise<AdminAccount | null> {
    try {
      // 方法1: 尝试使用 Netlify Function 验证密码（推荐，支持加密密码）
      let lastLoginError = null;

      // 准备尝试的 URL 列表
      const urlsToTry = [
        'https://admin-market-link-express.netlify.app', // 🚀 调整：优先使用 Netlify 默认域名，通常更稳定
        'https://admin-market-link-express.com',         // 顶级自定义域名
        netlifyUrl                                       // 配置的域名
      ].filter((v, i, a) => v && a.indexOf(v) === i); // 去重且过滤空值

      logger.log('开始登录流程，尝试节点数量:', urlsToTry.length);

      for (const baseUrl of urlsToTry) {
        // 每个节点尝试最多 2 次
        for (let attempt = 1; attempt <= 2; attempt++) {
          try {
            const cleanBaseUrl = baseUrl.replace(/\/$/, ''); // 移除末尾斜杠
            logger.log(`🌐 正在尝试节点 (第 ${attempt} 次): ${cleanBaseUrl}...`);
            
            const controller = new AbortController();
            // 🚀 大幅增加超时时间：第一次 15秒，第二次 30秒，适配缅甸极慢网络
            const timeoutValue = attempt === 1 ? 15000 : 30000; 
            const timeoutId = setTimeout(() => controller.abort(), timeoutValue);
          
            const response = await fetch(`${cleanBaseUrl}/.netlify/functions/admin-password`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Cache-Control': 'no-cache',
                'User-Agent': 'ML-Express-Rider-App'
              },
              body: JSON.stringify({ action: 'login', username, password }),
              signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 🚀 核心修复：即使状态码不是 2xx (如 401)，也要尝试解析 JSON 获取具体错误原因
            const result = await response.json().catch(() => null);

            if (response.ok && result?.success && result?.account) {
              logger.log(`✅ 节点 ${cleanBaseUrl} 验证成功`);
              const accountFromNetlify = result.account;
              
              // 异步更新数据库中的最后登录时间（非阻塞）
              try {
                supabase
                  .from('admin_accounts')
                  .update({ last_login: new Date().toISOString() })
                  .eq('id', accountFromNetlify.id)
                  .then(({error}) => {
                    if (error) logger.warn('最后登录时间更新失败:', error.message);
                  });
              } catch (e) {}

              // 获取数据库中的最新完整信息（尝试一次，失败则使用缓存或 function 返回值）
              try {
                const { data, error } = await supabase
                  .from('admin_accounts')
                  .select('*')
                  .eq('username', username)
                  .single();

                if (!error && data) return data;
              } catch (dbError) {
                logger.warn('获取数据库详细信息失败，使用基础信息');
              }
              
              return {
                ...accountFromNetlify,
                password: '',
                id: accountFromNetlify.id || '',
                status: accountFromNetlify.status || 'active'
              } as AdminAccount;
            } else if (response.status === 401 || (result && !result.success)) {
              // 处理业务逻辑错误 (如密码错误、账号停用等)
              lastLoginError = result?.error || '用户名或密码错误';
              logger.warn(`❌ 验证失败 (${cleanBaseUrl}):`, lastLoginError);
              
              // 如果是明确的凭据错误，不要继续尝试其他节点，直接抛出异常
              if (lastLoginError.includes('密码') || lastLoginError.includes('用户名') || lastLoginError.includes('停用') || lastLoginError.includes('不存在') || lastLoginError.includes('过期')) {
                throw new Error(lastLoginError);
              }
            } else {
              logger.warn(`⚠️ 节点 ${cleanBaseUrl} 返回异常状态: ${response.status}`);
              if (response.status === 404) break; // 路径不对，跳过此节点
            }
          } catch (err: any) {
            if (err.name === 'AbortError') {
              logger.warn(`⏰ 节点 ${baseUrl} 请求超时 (尝试 ${attempt})`);
            } else if (err.message && (err.message.includes('密码') || err.message.includes('用户名') || err.message.includes('不存在') || err.message.includes('停用'))) {
              throw err; // 业务逻辑错误直接抛出
            } else {
              logger.warn(`❌ 访问节点异常 (尝试 ${attempt}):`, err.message);
            }
            
            // 如果是最后一次尝试且失败，则继续下一个 URL
            if (attempt === 2) continue;
            // 否则稍等一会（1.5秒）后重试
            await new Promise(r => setTimeout(r, 1500));
          }
        }
      }

      // 所有云函数节点均失败：不再做客户端明文密码比对（安全风险 + 弱网误导）
      if (lastLoginError) {
        throw new Error(String(lastLoginError));
      }
      throw new Error(
        '无法连接登录服务器，请检查网络后重试。若持续失败请联系管理员。'
      );
    } catch (err: any) {
      logger.error('登录流程最终异常:', err);
      throw err;
    }
  },

  async updatePassword(username: string, currentPassword: string, newPassword: string): Promise<boolean> {
    try {
      const response = await fetch(`${netlifyUrl}/.netlify/functions/admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updatePassword',
          username: username,
          currentPassword: currentPassword,
          newPassword: newPassword
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
      return false;
    } catch (error) {
      logger.error('更新密码失败:', error);
      return false;
    }
  },

  async updateUsername(currentUsername: string, newUsername: string): Promise<boolean> {
    try {
      const response = await fetch(`${netlifyUrl}/.netlify/functions/admin-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action: 'updateUsername',
          currentUsername: currentUsername,
          newUsername: newUsername
        })
      });

      if (response.ok) {
        const result = await response.json();
        return result.success;
      }
      return false;
    } catch (error) {
      logger.error('更新用户名失败:', error);
      return false;
    }
  }
};
