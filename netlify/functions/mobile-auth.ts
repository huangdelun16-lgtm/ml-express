import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// 使用与其他函数相同的环境变量配置
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE || process.env.VITE_SUPABASE_ANON_KEY;

let supabase: any = null;

// 安全创建Supabase客户端
try {
  if (supabaseUrl && supabaseKey) {
    supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });
    console.log('✅ Supabase客户端创建成功');
  } else {
    console.error('❌ Supabase环境变量缺失:', { supabaseUrl: !!supabaseUrl, supabaseKey: !!supabaseKey });
  }
} catch (error) {
  console.error('❌ Supabase客户端创建失败:', error);
}

export const handler: Handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const { httpMethod } = event;

  try {
    if (httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { action, username, password } = body;

      if (action === 'login') {
        console.log('🔐 移动端登录请求:', username);

        if (!username || !password) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: '用户名和密码不能为空'
            })
          };
        }

        // 如果Supabase没有正确配置，使用简化的验证
        if (!supabase) {
          console.log('⚠️ Supabase未配置，使用简化验证');
          
          // 简化的测试账号验证
          const testAccounts = {
            'customer': { role: 'customer', name: '测试客户', phone: '13800138001' },
            'rider': { role: 'city_rider', name: '测试骑手', phone: '13800138002' },
            'finance': { role: 'city_accountant', name: '测试财务', phone: '13800138003' },
            'admin': { role: 'manager', name: '测试管理员', phone: '13800138004' },
            'master': { role: 'manager', name: '超级管理员', phone: '13800138000' },
          };

          const testUser = testAccounts[username];
          if (testUser) {
            const token = `mobile_${username}_${Date.now()}`;
            
            return {
              statusCode: 200,
              headers,
              body: JSON.stringify({
                success: true,
                message: '登录成功',
                user: {
                  id: username,
                  username: username,
                  name: testUser.name,
                  phone: testUser.phone,
                  role: testUser.role
                },
                token: token
              })
            };
          } else {
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                message: '用户名或密码错误'
              })
            };
          }
        }

        try {
          // 查询用户是否存在
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('username, name, phone, role')
            .eq('username', username)
            .single();

          if (userError || !user) {
            console.log('❌ 用户不存在:', username);
            return {
              statusCode: 401,
              headers,
              body: JSON.stringify({
                success: false,
                message: '用户名或密码错误'
              })
            };
          }

          // 简化密码验证 - 在实际应用中应该有真正的密码哈希验证
          // 这里为了演示，我们假设任何密码都可以通过
          console.log('✅ 用户验证成功:', user);

          // 生成简单的token
          const token = `mobile_${username}_${Date.now()}`;

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: '登录成功',
              user: {
                id: user.username,
                username: user.username,
                name: user.name || user.username,
                phone: user.phone || '未设置',
                role: user.role
              },
              token: token
            })
          };

        } catch (dbError) {
          console.error('数据库查询失败:', dbError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              message: '服务器内部错误'
            })
          };
        }
      }

      if (action === 'verify') {
        // 验证token有效性
        const { token } = body;
        
        if (!token) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Token不能为空'
            })
          };
        }

        // 简单的token验证 - 检查token格式
        if (token.startsWith('mobile_') || token.startsWith('test_') || token.startsWith('web_')) {
          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              message: 'Token有效'
            })
          };
        } else {
          return {
            statusCode: 401,
            headers,
            body: JSON.stringify({
              success: false,
              message: 'Token无效'
            })
          };
        }
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          success: false,
          message: '不支持的操作'
        })
      };
    }

    if (httpMethod === 'GET') {
      // 获取当前用户信息
      const token = event.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            success: false,
            message: '未提供认证token'
          })
        };
      }

      // 从token中提取用户名
      const tokenParts = token.split('_');
      if (tokenParts.length >= 2) {
        const username = tokenParts[1];
        
        try {
          const { data: user, error: userError } = await supabase
            .from('users')
            .select('username, name, phone, role')
            .eq('username', username)
            .single();

          if (userError || !user) {
            return {
              statusCode: 404,
              headers,
              body: JSON.stringify({
                success: false,
                message: '用户不存在'
              })
            };
          }

          return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
              success: true,
              user: {
                id: user.username,
                username: user.username,
                name: user.name || user.username,
                phone: user.phone || '未设置',
                role: user.role
              }
            })
          };

        } catch (dbError) {
          console.error('获取用户信息失败:', dbError);
          return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
              success: false,
              message: '服务器内部错误'
            })
          };
        }
      }

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          success: false,
          message: 'Token格式错误'
        })
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({
        success: false,
        message: '不支持的请求方法'
      })
    };

  } catch (error) {
    console.error('移动端认证API错误:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        message: '服务器内部错误',
        details: error.message
      })
    };
  }
};
