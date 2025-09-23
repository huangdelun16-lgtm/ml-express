import { createClient } from '@supabase/supabase-js';
import { getAuthFromEvent } from './_auth';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any) {
  return { 
    statusCode, 
    headers: { 'Content-Type': 'application/json', ...cors }, 
    body: JSON.stringify(body) 
  };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };
  if (!client) return json(500, { message: 'Backend not configured' });

  const session = getAuthFromEvent(event);
  const actor = session?.username || (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();
  
  // 只允许管理员访问
  if (!actor) return json(401, { message: 'Unauthorized' });
  
  try {
    // 1. 检查finances表结构
    const { data: columns } = await client
      .from('finances')
      .select('*')
      .limit(0);
    
    // 2. 获取最近的财务记录
    const { data: recentFinances, error: finError } = await client
      .from('finances')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // 3. 获取有单号的财务记录
    const { data: withTrackingNo } = await client
      .from('finances')
      .select('*')
      .not('tracking_no', 'is', null)
      .order('created_at', { ascending: false })
      .limit(5);
    
    // 4. 获取最近的包裹记录
    const { data: recentPackages } = await client
      .from('packages')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // 5. 检查财务记录中实际的字段
    const sampleFinance = recentFinances?.[0] || {};
    const financeFields = Object.keys(sampleFinance);
    
    // 6. 检查包裹记录中实际的字段
    const samplePackage = recentPackages?.[0] || {};
    const packageFields = Object.keys(samplePackage);
    
    // 7. 尝试关联查询
    let joinedData = null;
    if (withTrackingNo && withTrackingNo.length > 0) {
      const trackingNos = withTrackingNo.map(f => f.tracking_no).filter(Boolean);
      const { data: joinResult } = await client
        .from('packages')
        .select('tracking_no, destination, receiver')
        .in('tracking_no', trackingNos);
      joinedData = joinResult;
    }
    
    return json(200, {
      debug: {
        financeTableInfo: {
          sampleRecord: sampleFinance,
          fields: financeFields,
          hasDestination: financeFields.includes('destination'),
          hasReceiver: financeFields.includes('receiver'),
          hasBiz: financeFields.includes('biz'),
        },
        packageTableInfo: {
          sampleRecord: samplePackage,
          fields: packageFields,
          hasDestination: packageFields.includes('destination'),
          hasDest: packageFields.includes('dest'),
          hasReceiver: packageFields.includes('receiver'),
        },
        recentFinances: recentFinances?.slice(0, 3).map(f => ({
          id: f.id,
          tracking_no: f.tracking_no,
          destination: f.destination,
          receiver: f.receiver,
          amount: f.amount,
          type: f.type,
          created_at: f.created_at
        })),
        recentPackages: recentPackages?.slice(0, 3).map(p => ({
          tracking_no: p.tracking_no,
          destination: p.destination || p.dest,
          receiver: p.receiver,
          status: p.status,
          fee: p.fee,
          created_at: p.created_at
        })),
        joinedData,
        errors: {
          finError
        }
      }
    });
  } catch (error: any) {
    return json(500, { message: error.message });
  }
};
