 
import { createClient } from '@supabase/supabase-js';
import { getAuthFromEvent, hasDbRole } from './_auth';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any, cache?: { maxAge?: number; swr?: number }) {
  const cc = cache && statusCode === 200
    ? `public, max-age=${Math.max(0, cache.maxAge ?? 20)}, stale-while-revalidate=${Math.max(0, cache.swr ?? 60)}`
    : undefined;
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...cors };
  if (cc) {
    headers['Cache-Control'] = cc;
    headers['Vary'] = 'Authorization, x-ml-actor, x-ml-role';
  }
  return { statusCode, headers, body: JSON.stringify(body) };
}

function deny(msg = 'Forbidden') { return json(403, { message: msg }); }

// 从备注文本中解析单号（兼容多种格式）
function parseTrackingNoFromNote(note?: string): string | undefined {
  const text = String(note || '');
  const patterns = [
    /新包裹入库\s*[-—–]?\s*单号[:：]?\s*([^\s，,]+)/,
    /包裹签收\s*[-—–]?\s*单号[:：]?\s*([^\s，,]+)/,
    /包裹已到站\s*[-—–]?\s*单号[:：]?\s*([^\s，,]+)/,
    /单号[:：]?\s*([^\s，,]+)/,
    // 添加更多单号格式匹配
    /([A-Z]{1,2}\d{10,15})/,  // 匹配如 YT7560943547559, JT540321080945 等格式
    /([C]\d{10,15})/,         // 匹配如 C20250911113631568 等格式
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return String(m[1]).replace(/[，,。.;；]$/, '');
  }
  return undefined;
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  const session = getAuthFromEvent(event);
  const actor = session?.username || (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();

  async function hasRequiredRole(required: string[]): Promise<boolean> {
    if (!actor) return false;
    try {
      const { data, error } = await client!.from('users').select('role').eq('username', actor).limit(1);
      if (error) return false;
      const r = data && data[0]?.role;
      return r ? required.includes(r) : false;
    } catch {
      return false;
    }
  }

  try {
    // 简单限速：按 IP + 路径计数（1 分钟内超过阈值则拒绝）
    const ip = (event.headers['x-forwarded-for'] || event.headers['client-ip'] || '').toString().split(',')[0].trim();
    const key = `ratelimit:${ip}:${event.path}`;
    try {
      await client!.from('rate_limits').insert([{ key, ts: new Date().toISOString() }]);
    } catch {}
    try {
      const oneMinAgo = new Date(Date.now() - 60_000).toISOString();
      const { count } = (await client!.from('rate_limits').select('id', { count: 'exact', head: true }).gte('ts', oneMinAgo).eq('key', key)) as any;
      const limit = event.httpMethod === 'GET' ? 120 : 30;
      if ((count || 0) > limit) return json(429, { message: 'Too Many Requests' });
    } catch {}
    if (event.httpMethod === 'GET') {
      // 允许 accountant/cross_accountant/city_accountant/manager/master 读取财务
      const allowedRoles = ['accountant','cross_accountant','city_accountant','manager','master'];
      let canRead = await hasRequiredRole(allowedRoles);
      if (!canRead) {
        const hdrRole = (event.headers['x-ml-role'] || event.headers['X-ML-Role'] || '').toString().trim().toLowerCase();
        if (hdrRole && allowedRoles.includes(hdrRole)) canRead = true; // 回退到前端传入角色
      }
      if (!canRead) return deny();
      const qs = event.queryStringParameters || {};
      const start = (qs.start || '') as string;
      const biz = (qs.biz || '') as string; // 'city' | 'cross'
      const end = (qs.end || '') as string;
      const type = (qs.type || '') as string;
      const search = (qs.search || '').toString();
      const page = Math.max(1, parseInt((qs.page as string) || '1', 10));
      const pageSize = Math.min(20, Math.max(5, parseInt((qs.pageSize as string) || '8', 10))); // 减少默认页面大小提高性能
      const status = (qs.status || '') as string; // 可选：已入账、作废、运输中、待签收 等

      // 兼容老库：检测 finances 是否存在 biz 列
      let hasFinanceBizCol = true;
      try {
        const probe = await client.from('finances').select('biz').limit(1);
        if ((probe as any)?.error) hasFinanceBizCol = false;
      } catch { hasFinanceBizCol = false; }
      // 若按 biz 过滤但 finances 无 biz 列，则通过 packages 的 tracking_no 集合回退筛选
      let trackingFilter: string[] | null = null;
      if ((biz === 'city' || biz === 'cross') && !hasFinanceBizCol) {
        // 检测 packages 是否存在 biz 列
        let hasPackagesBizCol = true;
        try {
          const p = await client.from('packages').select('biz').limit(1);
          if ((p as any)?.error) hasPackagesBizCol = false;
        } catch { hasPackagesBizCol = false; }
        let pkQ: any = client.from('packages').select('tracking_no');
        if (hasPackagesBizCol) {
          if (biz === 'city') { try { pkQ = pkQ.eq('biz', 'city'); } catch {} }
          if (biz === 'cross') { try { pkQ = pkQ.eq('biz', 'cross'); } catch {} }
        } else {
          if (biz === 'city') {
            pkQ = pkQ.or('package_type.ilike.%城%,package_type.ilike.%city%');
          } else {
            pkQ = pkQ.not('package_type.ilike.%城%').not('package_type.ilike.%city%');
          }
        }
        try {
          const { data: pkRows } = await pkQ;
          const arr = Array.from(new Set((pkRows || []).map((r: any) => r?.tracking_no).filter(Boolean).map((s: any) => String(s))));
          trackingFilter = arr;
        } catch {}
      }

      // 统计总数
      let countQ = client.from('finances').select('id', { count: 'exact', head: true });
      if (start) countQ = countQ.gte('date', start);
      if (trackingFilter && trackingFilter.length) {
        countQ = (countQ as any).in('tracking_no', trackingFilter);
      } else {
        if (hasFinanceBizCol) {
          if (biz === 'city') { try { countQ = (countQ as any).or('biz.eq.city,biz.is.null'); } catch {} }
          if (biz === 'cross') { try { countQ = (countQ as any).or('biz.eq.cross,biz.is.null'); } catch {} }
        }
      }
      if (end) countQ = countQ.lte('date', end);
      if (type === '收入' || type === '支出') countQ = countQ.eq('type', type);
      if (search) countQ = countQ.ilike('note', `%${search}%`);
      if (status) countQ = countQ.eq('status', status);
      const { count: total = 0 } = (await countQ) as any;

      // 列表 - 只选择必要字段提高性能
      let listQ = client.from('finances').select('id,type,category,amount,note,date,status,tracking_no,destination,receiver,sender,sender_phone,receiver_phone,biz,created_at').order('date', { ascending: false }).range((page-1)*pageSize, page*pageSize-1);
      if (trackingFilter && trackingFilter.length) {
        listQ = (listQ as any).in('tracking_no', trackingFilter);
      } else {
        if (hasFinanceBizCol) {
          if (biz === 'city') { try { listQ = (listQ as any).or('biz.eq.city,biz.is.null'); } catch {} }
          if (biz === 'cross') { try { listQ = (listQ as any).or('biz.eq.cross,biz.is.null'); } catch {} }
        }
      }
      if (start) listQ = listQ.gte('date', start);
      if (end) listQ = listQ.lte('date', end);
      if (type === '收入' || type === '支出') listQ = listQ.eq('type', type);
      if (search) listQ = listQ.ilike('note', `%${search}%`);
      if (status) listQ = listQ.eq('status', status);
      const { data, error } = await listQ;
      if (error) return json(500, { message: error.message });
      // 目的地/收件人 兜底：若 finances 记录缺少字段且存在 tracking_no，则从 packages 映射
      const baseItems = (data || []).map((r: any) => ({
        raw: r,
        trackingNo: r.tracking_no || parseTrackingNoFromNote(r.note),
      }));
      const trackArr = Array.from(new Set(baseItems.map(x => x.trackingNo).filter(Boolean) as string[]));
      let pkgMap: Record<string, { destination?: string | null; receiver?: string | null; sender?: string | null; sender_phone?: string | null; receiver_phone?: string | null; biz?: string | null; package_type?: string | null; order_date?: string | null; created_at?: string | null }> = {};
      if (trackArr.length) {
        try {
          // 尝试多种字段名组合查询包裹数据
          let pkRows: any = [];
          const queryFields = ['tracking_no', 'tracking_number', 'destination', 'dest', 'receiver', 'sender', 'receiver_phone', 'biz', 'package_type', 'order_date', 'created_at'];
          
          // 尝试不同的字段组合
          const fieldCombinations = [
            'tracking_no,tracking_number,destination,dest,receiver,sender,receiver_phone,biz,package_type,order_date,created_at',
            'tracking_no,destination,dest,receiver,sender,receiver_phone,biz,package_type,order_date,created_at',
            'tracking_number,destination,dest,receiver,sender,receiver_phone,biz,package_type,order_date,created_at',
            'tracking_no,dest,receiver,sender,receiver_phone,biz,package_type,created_at',
            'tracking_number,dest,receiver,sender,receiver_phone,biz,package_type,created_at'
          ];
          
          for (const fields of fieldCombinations) {
            try {
              // 尝试用tracking_no匹配
              let result = await client.from('packages').select(fields).in('tracking_no', trackArr);
              if (result.data && result.data.length > 0) {
                pkRows = [...pkRows, ...result.data];
              }
              
              // 如果有tracking_number字段，也尝试用它匹配
              if (fields.includes('tracking_number')) {
                try {
                  result = await client.from('packages').select(fields).in('tracking_number', trackArr);
                  if (result.data && result.data.length > 0) {
                    pkRows = [...pkRows, ...result.data];
                  }
                } catch {}
              }
              break; // 如果成功，跳出循环
            } catch (e: any) {
              // 继续尝试下一个字段组合
              continue;
            }
          }
          
          // 去重并构建映射
          const uniquePkRows = pkRows.filter((row: any, index: number, self: any[]) => {
            const trackingNo = row?.tracking_no || row?.tracking_number;
            return index === self.findIndex((r: any) => (r?.tracking_no || r?.tracking_number) === trackingNo);
          });
          
          for (const r of uniquePkRows) {
            const t = r?.tracking_no || r?.tracking_number;
            if (t) {
              const trackingStr = String(t);
              pkgMap[trackingStr] = { 
                destination: r?.destination || r?.dest || null, 
                receiver: r?.receiver || null,
                sender: r?.sender || null,
                sender_phone: r?.sender_phone || null,
                receiver_phone: r?.receiver_phone || null,
                biz: (r as any)?.biz || null, 
                package_type: (r as any)?.package_type || null,
                order_date: r?.order_date || null,
                created_at: r?.created_at || null
              };
            }
          }
        } catch {}
      }
      const items = baseItems.map(({ raw, trackingNo }) => ({
        id: raw.id,
        type: raw.type,
        category: raw.category,
        amount: Number(raw.amount||0),
        note: raw.note,
        date: (trackingNo && pkgMap[trackingNo]?.order_date) || (trackingNo && pkgMap[trackingNo]?.created_at?.slice(0,10)) || raw.date || raw.occurred_on,
        status: raw.status || '已入账',
        tracking_no: trackingNo,
        destination: raw.destination || (trackingNo ? (pkgMap[trackingNo]?.destination ?? null) : null),
        receiver: raw.receiver || (trackingNo ? (pkgMap[trackingNo]?.receiver ?? null) : null),
        sender: raw.sender || (trackingNo ? (pkgMap[trackingNo]?.sender ?? null) : null),
        sender_phone: raw.sender_phone || (trackingNo ? (pkgMap[trackingNo]?.sender_phone ?? null) : null),
        receiver_phone: raw.receiver_phone || (trackingNo ? (pkgMap[trackingNo]?.receiver_phone ?? null) : null),
        biz: raw.biz || (trackingNo ? (pkgMap[trackingNo]?.biz ?? null) : null),
      }));

      // 终态筛选：对于无 finances.biz 或无 tracking_no 的记录，依据包裹信息/类型推断后剔除/保留，防止同城混入跨境
      const norm = (s: any) => String(s || '').toLowerCase();
      const looksCity = (t: string | null | undefined) => {
        const v = String(t || '').toLowerCase();
        return v.includes('城') || v.includes('city');
      };
      const filteredItems = items; // 依赖上游 SQL 过滤，不再在内存重复筛选以避免误排除
      // 过滤汇总（仅统计已入账；兼容老库无 status 列或 status 为空）
      let fIncome = 0, fExpense = 0;
      try {
        let sumQ: any = client.from('finances').select('amount,type,status');
        // 与列表/计数保持一致的 biz 过滤（或回退到 tracking_no 集合）
        if (trackingFilter && trackingFilter.length) {
          sumQ = sumQ.in('tracking_no', trackingFilter);
        } else {
          if (hasFinanceBizCol) {
            if (biz === 'city') { try { sumQ = (sumQ as any).or('biz.eq.city,biz.is.null'); } catch {} }
            if (biz === 'cross') { try { sumQ = (sumQ as any).or('biz.eq.cross,biz.is.null'); } catch {} }
          }
        }
        if (start) sumQ = sumQ.gte('date', start);
        if (end) sumQ = sumQ.lte('date', end);
        if (type === '收入' || type === '支出') sumQ = sumQ.eq('type', type);
        if (search) sumQ = sumQ.ilike('note', `%${search}%`);
        let { data: srows, error: serr } = await sumQ as any;
        if (serr) {
          // 老库缺 status 列，降级忽略 status 字段
          let sumQ2: any = client.from('finances').select('amount,type');
          if (trackingFilter && trackingFilter.length) {
            sumQ2 = sumQ2.in('tracking_no', trackingFilter);
          } else {
            if (biz === 'city' && hasFinanceBizCol) { try { sumQ2 = sumQ2.eq('biz', 'city'); } catch {} }
            if (biz === 'cross' && hasFinanceBizCol) { try { sumQ2 = sumQ2.eq('biz', 'cross'); } catch {} }
          }
          if (start) sumQ2 = sumQ2.gte('date', start);
          if (end) sumQ2 = sumQ2.lte('date', end);
          if (type === '收入' || type === '支出') sumQ2 = sumQ2.eq('type', type);
          if (search) sumQ2 = sumQ2.ilike('note', `%${search}%`);
          const r2 = await sumQ2 as any;
          srows = r2.data || [];
          serr = r2.error;
        }
        for (const r of (srows || [])) {
          const st = (r as any).status;
          const isPosted = (st === '已入账' || st === null || typeof st === 'undefined');
          if (!isPosted) continue;
          const t = String((r as any).type || '').trim();
          if (t === '收入') fIncome += Number((r as any).amount||0); else if (t === '支出') fExpense += Number((r as any).amount||0);
        }
      } catch {}
      // 全量汇总（仅统计已入账；兼容老库无 status 列或 status 为空）
      let aIncome = 0, aExpense = 0;
      try {
        let allQ = client.from('finances').select('amount,type,status');
        if (trackingFilter && trackingFilter.length) {
          allQ = (allQ as any).in('tracking_no', trackingFilter);
        } else {
          if (hasFinanceBizCol) {
            if (biz === 'city') { try { allQ = (allQ as any).or('biz.eq.city,biz.is.null'); } catch {} }
            if (biz === 'cross') { try { allQ = (allQ as any).or('biz.eq.cross,biz.is.null'); } catch {} }
          }
        }
        let { data: arows, error: aerr } = await allQ as any;
        if (aerr) {
          const r2 = await client.from('finances').select('amount,type') as any;
          arows = r2.data || [];
        }
        for (const r of (arows || [])) {
          const st = (r as any).status;
          const isPosted = (st === '已入账' || st === null || typeof st === 'undefined');
          if (!isPosted) continue;
          const t = String((r as any).type || '').trim();
          if (t === '收入') aIncome += Number((r as any).amount||0); else if (t === '支出') aExpense += Number((r as any).amount||0);
        }
      } catch {}
      return json(200, { items: filteredItems, page, pageSize, total, summaryFiltered: { income: fIncome, expense: fExpense, net: fIncome - fExpense }, summaryAll: { income: aIncome, expense: aExpense, net: aIncome - aExpense } }, { maxAge: 20, swr: 60 });
    }

    if (event.httpMethod === 'POST') {
      const allowed = await hasDbRole(client!, actor, ['accountant','cross_accountant', 'master']);
      if (!allowed) return deny();
      const body = event.body ? JSON.parse(event.body) : {};
      const { type, category, amount, note, date, status } = body || {};
      const trackingNo: string | undefined = (body.tracking_no || body.trackingNo || body.trackingNumber) ? String(body.tracking_no || body.trackingNo || body.trackingNumber) : undefined;
      if (!['收入','支出'].includes(type)) return json(400, { message: '类型错误' });
      if (!(amount>0)) return json(400, { message: '金额需>0' });
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))) return json(400, { message: '日期格式应为YYYY-MM-DD' });
      if (note && String(note).length>200) return json(400, { message: '备注过长' });
      const allowedStatus = ['已入账','作废','待签收','运输中'];
      const finalStatus = status && allowedStatus.includes(status) ? status : '已入账';
      
      // 获取包裹目的地信息
      let destination: string | null = null;
      if (trackingNo) {
        try {
          const { data: packageData } = await client.from('packages').select('destination').eq('tracking_no', trackingNo).single();
          if (packageData?.destination) {
            destination = packageData.destination;
          }
        } catch {}
      }
      
      const record: any = { type, category, amount, note, date, status: finalStatus, created_by: actor, destination };
      if (trackingNo) {
        record.tracking_no = trackingNo;
      } else {
        const parsed = parseTrackingNoFromNote(note);
        if (parsed) {
          record.tracking_no = parsed;
          // 如果从备注中解析出单号，也尝试获取目的地
          try {
            const { data: packageData } = await client.from('packages').select('destination').eq('tracking_no', parsed).single();
            if (packageData?.destination) {
              record.destination = packageData.destination;
            }
          } catch {}
        }
      }
      let { data, error } = await client.from('finances').insert([record]).select('*').single();
      if (error) {
        // 无条件降级：移除 destination / status / tracking_no，保证老库也可写入
        const fallback: any = { type, category, amount, note, date, created_by: actor };
        const r2 = await client.from('finances').insert([fallback]).select('*').single();
        data = (r2 as any)?.data;
        error = (r2 as any)?.error;
      }
      if (error) return json(500, { message: error.message });
      try { await client.from('audit_logs').insert([{ actor, action: 'finances.create', detail: { ...record, tracking_no: record.tracking_no || parseTrackingNoFromNote(record.note) } }]); } catch {}
      return json(200, { item: data });
    }

    if (event.httpMethod === 'PATCH') {
      const allowed = await hasDbRole(client!, actor, ['accountant','city_accountant','cross_accountant', 'manager', 'master']);
      if (!allowed) return deny();
      const body = event.body ? JSON.parse(event.body) : {};
      const { id, ...changes } = body || {};
      // 兼容：允许用 trackingNumber 字段更新
      if ((changes as any).trackingNumber && !(changes as any).tracking_no) {
        (changes as any).tracking_no = (changes as any).trackingNumber;
        delete (changes as any).trackingNumber;
      }
      if (!id) return json(400, { message: '缺少ID' });
      if (changes.type && !['收入','支出'].includes(changes.type)) return json(400, { message: '类型错误' });
      if (typeof changes.amount!=='undefined' && !(Number(changes.amount)>0)) return json(400, { message: '金额需>0' });
      if (changes.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(changes.date))) return json(400, { message: '日期格式错误' });
      if (changes.note && String(changes.note).length>200) return json(400, { message: '备注过长' });
      if (typeof changes.status !== 'undefined') {
        const allowedStatus = ['已入账','作废','待签收','运输中','待付费','已预付'];
        if (!allowedStatus.includes(changes.status)) return json(400, { message: '状态错误' });
      }
      const updatePayload: any = { ...changes, updated_by: actor };
      
      // 如果更新了tracking_no，自动同步目的地
      if (updatePayload.tracking_no) {
        try {
          const { data: packageData } = await client.from('packages').select('destination').eq('tracking_no', updatePayload.tracking_no).single();
          if (packageData?.destination) {
            updatePayload.destination = packageData.destination;
          }
        } catch {}
      }
      
      // 后端兜底：若未显式传入 tracking_no，则尽量保留或回填
      if (typeof updatePayload.tracking_no === 'undefined') {
        try {
          const { data: prev } = await client.from('finances').select('tracking_no,note').eq('id', id).single();
          if (prev) {
            if (prev.tracking_no) {
              // 保留原 tracking_no
              updatePayload.tracking_no = prev.tracking_no;
            } else {
              // 从"旧备注"或"新备注"中解析并回填
              const parsed = parseTrackingNoFromNote(prev.note) || parseTrackingNoFromNote(updatePayload.note);
              if (parsed) updatePayload.tracking_no = parsed;
            }
          }
        } catch {}
      }
      console.log('正在更新财务记录:', { id, updatePayload });
      
      let { data: updatedData, error: updErr } = await client.from('finances').update(updatePayload).eq('id', id).select();
      if (updErr) {
        console.error('财务记录更新失败，尝试简化字段:', updErr);
        const { status: _omitS, tracking_no: _omitT, destination: _omitD, ...rest } = updatePayload as any;
        const result = await client.from('finances').update({ ...rest, updated_by: actor }).eq('id', id).select();
        updatedData = result.data;
        updErr = result.error;
      }
      
      if (updErr) {
        console.error('财务记录更新最终失败:', updErr);
        return json(500, { message: updErr.message });
      }
      
      console.log('✅ 财务记录更新成功:', updatedData);
      
      // 🔄 重要：如果更新了状态，强制同步更新对应的包裹状态
      if (changes.status && (changes.tracking_no || updatedData?.[0]?.tracking_no)) {
        const trackingNo = changes.tracking_no || updatedData?.[0]?.tracking_no;
        try {
          console.log('正在同步包裹状态:', { tracking_no: trackingNo, new_status: changes.status });
          
          // 强制更新包裹状态，确保同步
          const { data: packageUpdate, error: packageError } = await client
            .from('packages')
            .update({ 
              status: changes.status
            })
            .eq('tracking_no', trackingNo)
            .select();
            
          if (packageError) {
            console.error('包裹状态同步失败:', packageError);
          } else {
            console.log('✅ 包裹状态同步成功:', packageUpdate);
          }
        } catch (syncError) {
          console.error('包裹状态同步异常:', syncError);
        }
      }
      
      try { await client.from('audit_logs').insert([{ actor, action: 'finances.update', detail: { id, tracking_no: (changes.tracking_no || undefined), before: undefined, after: undefined, changes } }]); } catch {}
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const allowed = await hasDbRole(client!, actor, ['accountant','city_accountant','cross_accountant', 'manager', 'master']);
      if (!allowed) return deny();
      const body = event.body ? JSON.parse(event.body) : {};
      const { id, trackingNumber } = body || {};
      if (!id && !trackingNumber) return json(400, { message: '缺少删除条件' });
      
      // 在删除财务记录前，先获取tracking_no用于同步包裹状态
      let affectedTrackingNo: string | null = null;
      
      if (id) {
        // 通过ID查找对应的tracking_no
        try {
          const { data: financeRecord } = await client.from('finances').select('tracking_no').eq('id', id).single();
          affectedTrackingNo = financeRecord?.tracking_no || null;
        } catch {}
      } else if (trackingNumber) {
        affectedTrackingNo = trackingNumber;
      }
      
      let error: any = null;
      if (id) {
        ({ error } = await client.from('finances').delete().eq('id', id));
      } else if (trackingNumber) {
        // 兼容两种字段：优先 tracking_no，兼容旧数据的 note 文本
        const noteEq = `新包裹入库 - 单号 ${trackingNumber}`;
        ({ error } = await (client as any)
          .from('finances')
          .delete()
          .or(`tracking_no.eq.${trackingNumber},note.eq.${noteEq}`));
      }
      
      if (error) return json(500, { message: error.message });
      
      // 财务记录删除成功后，同步处理对应的包裹
      if (affectedTrackingNo) {
        try {
          // 检查是否还有其他财务记录关联此包裹
          const { data: remainingFinances } = await client
            .from('finances')
            .select('id')
            .eq('tracking_no', affectedTrackingNo);
          
          if (!remainingFinances || remainingFinances.length === 0) {
            // 如果没有其他财务记录，删除对应的包裹
            console.log('尝试删除包裹:', affectedTrackingNo);
            const { error: deleteError } = await client
              .from('packages')
              .delete()
              .eq('tracking_no', affectedTrackingNo);
            
            if (!deleteError) {
              console.log('包裹删除成功:', affectedTrackingNo);
              // 记录包裹删除日志
              try {
                await client.from('audit_logs').insert([{ 
                  actor, 
                  action: 'packages.auto_delete', 
                  detail: { tracking_no: affectedTrackingNo, reason: 'finance_record_deleted' } 
                }]);
              } catch {}
            } else {
              console.error('包裹删除失败:', affectedTrackingNo, deleteError);
              // 如果删除失败，尝试更新状态为已取消
              await client
                .from('packages')
                .update({ status: '已取消' })
                .eq('tracking_no', affectedTrackingNo);
            }
          }
        } catch (syncError) {
          // 包裹同步失败不影响财务记录删除的成功
          console.warn('Failed to sync package status after finance deletion:', syncError);
        }
      }
      
      try { await client.from('audit_logs').insert([{ actor, action: 'finances.delete', detail: { id, trackingNumber, affectedTrackingNo } }]); } catch {}
      return json(200, { ok: true });
    }

    return json(405, { message: 'Method Not Allowed' });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};


