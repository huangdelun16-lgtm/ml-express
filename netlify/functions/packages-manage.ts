
// import type { Handler } from '@netlify/functions';
import { getAuthFromEvent, hasDbRole } from './_auth';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor, x-ml-role, Authorization',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any, cache?: { maxAge?: number; swr?: number }) {
  const cc = cache && statusCode === 200
    ? `public, max-age=${Math.max(0, cache.maxAge ?? 30)}, stale-while-revalidate=${Math.max(0, cache.swr ?? 120)}`
    : undefined;
  const headers: Record<string,string> = { 'Content-Type': 'application/json', 'X-Function-Rev': 'pkg-guard-v3-secure', ...cors };
  if (cc) {
    headers['Cache-Control'] = cc;
    headers['Vary'] = 'Authorization, x-ml-actor, x-ml-role';
  }
  return { statusCode, headers, body: JSON.stringify(body) };
}

async function hasRequiredRole(username: string, roles: string[]): Promise<boolean> {
  if (!username) return false;
  try {
    const { data, error } = await client!.from('users').select('role').eq('username', username).limit(1);
    if (error) return false;
    const role = data && data[0]?.role;
    return role ? roles.includes(role) : false;
  } catch {
    return false;
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  const session = getAuthFromEvent(event);
  const actor = session?.username || (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString() || 'customer';

  try {
    const qs = event.queryStringParameters || {};
    if (qs.debug === '1') {
      try {
        const probe = await client.from('packages').select('id', { count: 'exact', head: true });
        return json(200, {
          env: {
            SUPABASE_URL: !!process.env.SUPABASE_URL,
            SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE,
          },
          status: 'ok',
          count: (probe as any)?.count ?? null,
          error: (probe as any)?.error?.message || null,
        });
      } catch (e: any) {
        return json(500, { status: 'error', message: e?.message || 'probe failed' });
      }
    }
    if (event.httpMethod === 'GET') {
      // RBAC: staff/city_rider/cross_clearance 只可查看自己创建的包裹
      let isStaff = false;
      try { isStaff = await hasDbRole(client!, actor, ['staff','city_rider','cross_clearance']); } catch {}
      let hasCreatedByCol = true;
      try {
        const probe = await client.from('packages').select('created_by').limit(1);
        if ((probe as any)?.error) hasCreatedByCol = false;
      } catch { hasCreatedByCol = false; }
      const status = (qs.status || '') as string;
      const biz = (qs.biz || '') as string; // 'city' | 'cross'
      const search = (qs.search || '') as string;
      const page = Math.max(1, parseInt((qs.page as string) || '1', 10));
      const pageSize = Math.min(15, Math.max(5, parseInt((qs.pageSize as string) || '8', 10))); // 减少默认页面大小 // 优化默认页面大小

      // 统计总数
      let countQuery = client.from('packages').select('id', { count: 'exact', head: true });
      if (status) countQuery = countQuery.eq('status', status);
      // biz 过滤（优先使用 biz 列，若无则降级用 package_type 模糊）
      if (biz === 'city') {
        let usedBiz = false;
        try { countQuery = (countQuery as any).eq('biz', 'city'); usedBiz = true; } catch {}
        try {
          const { count: bizAny } = await client.from('packages').select('id', { count: 'exact', head: true }).not('biz','is','null');
          if (!bizAny) throw new Error('biz-empty');
        } catch {
          // 无 biz 列或 biz 全为空：按类型模糊匹配
          usedBiz = false;
        }
        if (!usedBiz) {
          countQuery = (client.from('packages') as any)
            .select('id', { count: 'exact', head: true })
            .or('package_type.ilike.%城%,package_type.ilike.%city%');
          if (status) countQuery = (countQuery as any).eq('status', status);
        }
      } else if (biz === 'cross') {
        let usedBiz = false;
        try { countQuery = (countQuery as any).eq('biz', 'cross'); usedBiz = true; } catch {}
        try {
          const { count: bizAny } = await client.from('packages').select('id', { count: 'exact', head: true }).not('biz','is','null');
          if (!bizAny) throw new Error('biz-empty');
        } catch {
          usedBiz = false;
        }
        if (!usedBiz) {
          // 无 biz 或 biz 全为空：跨境=排除同城关键词
          countQuery = (client.from('packages') as any)
            .select('id', { count: 'exact', head: true })
            .not('package_type','ilike','%城%')
            .not('package_type','ilike','%city%');
          if (status) countQuery = (countQuery as any).eq('status', status);
        }
      }
      if (isStaff && hasCreatedByCol && actor) {
        try { countQuery = (countQuery as any).eq('created_by', actor); } catch {}
      }
      if (search) {
        countQuery = (countQuery as any).or(
          `tracking_no.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%`
        );
      }
      const { count: total = 0 } = (await countQuery) as any;

      // 分页查询 - 只选择必要字段提高性能（移除不存在的tracking_number字段）
      let listQuery = client
        .from('packages')
        .select('id,tracking_no,sender,receiver,receiver_phone,destination,package_type,weight_kg,fee,status,created_at,order_date,biz,quantity,length_cm,width_cm,height_cm,origin,note')
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (status) listQuery = listQuery.eq('status', status);
      if (biz === 'city') {
        let usedBiz = false;
        try { listQuery = (listQuery as any).eq('biz', 'city'); usedBiz = true; } catch {}
        try {
          const { count: bizAny } = await client.from('packages').select('id', { count: 'exact', head: true }).not('biz','is','null');
          if (!bizAny) throw new Error('biz-empty');
        } catch {
          usedBiz = false;
        }
        if (!usedBiz) {
          // 保持原有的查询设置，只添加同城过滤条件
          listQuery = (listQuery as any)
            .or('package_type.ilike.%城%,package_type.ilike.%city%');
        }
      } else if (biz === 'cross') {
        let usedBiz = false;
        try { listQuery = (listQuery as any).eq('biz', 'cross'); usedBiz = true; } catch {}
        try {
          const { count: bizAny } = await client.from('packages').select('id', { count: 'exact', head: true }).not('biz','is','null');
          if (!bizAny) throw new Error('biz-empty');
        } catch {
          usedBiz = false;
        }
        if (!usedBiz) {
          // 保持原有的查询设置，只添加跨境过滤条件
          listQuery = (listQuery as any)
            .not('package_type','ilike','%城%')
            .not('package_type','ilike','%city%');
        }
      }
      if (isStaff && hasCreatedByCol && actor) {
        try { listQuery = (listQuery as any).eq('created_by', actor); } catch {}
      }
      if (search) {
        listQuery = (listQuery as any).or(
          `tracking_no.ilike.%${search}%,sender.ilike.%${search}%,receiver.ilike.%${search}%`
        );
      }
      const { data, error } = await listQuery;
      if (error) {
        console.error('包裹查询错误:', error, { biz, page, pageSize, status, search });
        return json(500, { message: error.message });
      }
      
      // 调试日志
      console.log('包裹查询结果:', { 
        biz, 
        page, 
        pageSize, 
        status, 
        search, 
        dataCount: data?.length || 0,
        firstItem: data?.[0] ? { 
          id: data[0].id, 
          tracking_no: data[0].tracking_no, 
          biz: data[0].biz,
          package_type: data[0].package_type 
        } : null
      });
      const items = (data || []).map((r: any) => ({
        id: r.id,
        trackingNumber: r.tracking_number ?? r.tracking_no ?? r.tracking,
        sender: r.sender,
        receiver: r.receiver,
        receiverPhone: r.receiver_phone || null,
        origin: r.origin,
        destination: r.destination ?? r.dest ?? r.to_city ?? r.to,
        packageType: r.package_type ?? r.packageType,
        weightKg: Number(r.weight_kg || 0),
        dimensions: { lengthCm: Number(r.length_cm || 0), widthCm: Number(r.width_cm || 0), heightCm: Number(r.height_cm || 0) },
        fee: Number(r.fee || 0),
        status: r.status,
        createdAt: r.created_at ?? r.created_date,
        estimatedDelivery: r.estimated_delivery ?? r.eta,
        note: r.note,
        inboundBy: r.inbound_by || null,
        inboundAt: r.inbound_at || null,
        packageImages: r.package_images || null,
        quantity: r.quantity || 1,
      }));
      // 禁用缓存，避免修改后短时间内仍显示旧的目的地
      return json(200, { items, page, pageSize, total });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      
      if (body.op === 'sign') {
        // 签收证明：上传照片、签名等
        const allowed = await hasDbRole(client!, actor, ['manager', 'master', 'staff']);
        if (!allowed) return json(403, { message: 'Forbidden' });
        const { packageId, photos, signature, courierInfo, note, destination } = body || {};
        if (!packageId) return json(400, { message: '缺少包裹ID' });
        if (!photos || !Array.isArray(photos) || photos.length === 0) return json(400, { message: '请上传签收证明照片' });
        // RBAC: staff 仅可签收自己创建的包裹
        try {
          const isStaff = await hasDbRole(client!, actor, ['staff']);
          if (isStaff) {
            let hasCreatedByCol = true;
            try {
              const probe = await client.from('packages').select('created_by').limit(1);
              if ((probe as any)?.error) hasCreatedByCol = false;
            } catch { hasCreatedByCol = false; }
            if (hasCreatedByCol) {
              const { data: ownerRow } = await client.from('packages').select('created_by').eq('id', packageId).single();
              const owner = ownerRow?.created_by || null;
              if (owner && actor && owner !== actor) return json(403, { message: '仅可操作自己创建的包裹' });
            }
          }
        } catch {}
        
        try {
          // 更新包裹状态为已签收
          await client.from('packages').update({
            status: '已签收',
            signed_at: new Date().toISOString(),
            signed_by: actor,
            destination: destination || null
          }).eq('id', packageId);
          
          // 创建签收证明记录
          const proofData = {
            package_id: packageId,
            photos: photos,
            signature: signature || null,
            courier_name: courierInfo?.name || null,
            courier_phone: courierInfo?.phone || null,
            courier_id: courierInfo?.id || null,
            note: note || null,
            created_by: actor,
            created_at: new Date().toISOString()
          };
          
          await client.from('delivery_proofs').insert([proofData]);
          
          // 审计日志
          try {
            let trackingNo: string | null = null;
            try { const { data: row } = await client.from('packages').select('tracking_no').eq('id', packageId).single(); trackingNo = row?.tracking_no || null; } catch {}
            await client.from('audit_logs').insert([{ actor, action: 'package.sign', detail: { packageId, tracking_no: trackingNo, proofData } }]);
          } catch {}
          
          return json(200, { ok: true, message: '签收证明已保存' });
        } catch (e: any) {
          return json(500, { message: e?.message || '签收失败' });
        }
      }
      
      // 创建新包裹
      const pkg = body || {};
      // 友好错误：重复单号
      try {
        const { data: dup } = await client.from('packages').select('id').eq('tracking_no', pkg.trackingNumber).limit(1);
        if (dup && dup.length > 0) {
          return json(409, { message: '单号已存在，请更换一个新的单号' });
        }
      } catch (e: any) {
        // 忽略检测错误，走正常流程
      }

      const row: any = {
        tracking_no: pkg.trackingNumber,
        sender: pkg.sender,
        receiver: pkg.receiver,
        receiver_phone: pkg.receiverPhone,
        origin: pkg.origin,
        destination: pkg.destination,
        package_type: pkg.packageType,
        weight_kg: pkg.weightKg,
        length_cm: pkg.dimensions?.lengthCm,
        width_cm: pkg.dimensions?.widthCm,
        height_cm: pkg.dimensions?.heightCm,
        fee: pkg.fee,
        status: pkg.status,
        
        created_at: pkg.createdAt || new Date().toISOString().slice(0,10),
        estimated_delivery: pkg.estimatedDelivery,
        note: pkg.note,
        created_by: actor,
      };
      // 处理包裹图片
      if (pkg.packageImages) {
        try {
          row.package_images = pkg.packageImages;
        } catch (e) {
          // 忽略图片存储错误，不影响包裹创建
        }
      }
      // 处理件数
      if (pkg.quantity) {
        try {
          row.quantity = pkg.quantity;
        } catch (e) {
          // 忽略件数字段错误，不影响包裹创建
        }
      }
      // 写入 biz（若表结构支持）；降级：city 则确保类型含“同城”
      const biz = (body.biz || '') as string;
      if (biz) row.biz = biz;
      if (biz === 'city') {
        if (!row.package_type) row.package_type = '同城';
        else if (!String(row.package_type).includes('城') && !String(row.package_type).toLowerCase().includes('city')) row.package_type = '同城';
      }
      let { data, error } = await client.from('packages').insert([row]).select('*').single();
      
      // 包裹创建成功后，自动生成对应的财务记录
      console.log('包裹创建成功，准备生成财务记录:', { 
        error: !!error, 
        hasData: !!data, 
        fee: pkg.fee, 
        feeNum: Number(pkg.fee),
        trackingNumber: pkg.trackingNumber,
        status: pkg.status,
        biz: biz
      });
      
      // 为有费用的包裹创建财务记录（同城默认2000，跨境默认不创建）
      const defaultFee = biz === 'city' ? 2000 : 0;
      const finalFee = pkg.fee ? Number(pkg.fee) : defaultFee;
      
      if (!error && data && finalFee > 0) {
        console.log('开始生成财务记录，费用:', finalFee, '业务类型:', biz);
        try {
          // 根据包裹状态确定财务状态和分类
          let financeStatus = '待签收';
          let category = '运费';
          let financeNote = `运费收入 - 单号 ${pkg.trackingNumber}`;
          
          if (pkg.status === '待预付') {
            financeStatus = '待签收';
            category = '运费';
          } else if (pkg.status === '已签收') {
            financeStatus = '已入账';
          }
          
          // 判断 finances 表是否有 biz 列
          let hasFinanceBiz = true;
          try { 
            const probe = await client.from('finances').select('biz').limit(1); 
            if ((probe as any)?.error) hasFinanceBiz = false; 
          } catch { 
            hasFinanceBiz = false; 
          }
          
          const financeRecord: any = {
            type: '收入',
            category: category,
            amount: finalFee,
            note: financeNote,
            date: pkg.createdAt || new Date().toISOString().slice(0,10),
            status: financeStatus,
            tracking_no: pkg.trackingNumber,
            destination: pkg.destination,
            receiver: pkg.receiver,
            sender: pkg.sender,
            sender_phone: pkg.senderPhone,
            receiver_phone: pkg.receiverPhone,
            created_by: actor
          };
          
          // 如果支持 biz 字段，添加业务类型
          if (hasFinanceBiz && biz) {
            financeRecord.biz = biz;
          }
          
          // 尝试插入财务记录
          console.log('尝试插入财务记录:', financeRecord);
          const financeResult = await client.from('finances').insert([financeRecord]);
          console.log('财务记录插入结果:', financeResult);
          
          if ((financeResult as any).error) {
            throw new Error((financeResult as any).error.message);
          }
          
        } catch (financeError) {
          // 财务记录创建失败不影响包裹创建，只记录日志
          console.error('Failed to create finance record for package:', pkg.trackingNumber, financeError);
          
          // 尝试降级插入（去掉可能不存在的字段）
          try {
            console.log('尝试降级插入财务记录');
            const fallbackRecord = {
              type: '收入',
              category: '运费',
              amount: finalFee,
              note: `运费收入 - 单号 ${pkg.trackingNumber}`,
              date: pkg.createdAt || new Date().toISOString().slice(0,10)
            };
            const fallbackResult = await client.from('finances').insert([fallbackRecord]);
            console.log('降级插入结果:', fallbackResult);
            
            if ((fallbackResult as any).error) {
              console.error('降级插入也失败:', (fallbackResult as any).error);
            } else {
              console.log('降级插入成功');
            }
          } catch (fallbackError) {
            // 完全失败也不影响包裹创建
            console.error('降级插入异常:', fallbackError);
          }
        }
      }
      
      if (error) {
        // 兼容库结构：若 destination 列不存在，则降级为 dest 列；若不存在 biz 列则移除后重试
        const msg = error.message || '';
        if (/destination/i.test(msg)) {
          const row2: any = { ...row };
          row2.dest = row2.destination; delete row2.destination;
          const retry = await client.from('packages').insert([row2]).select('*').single();
          if (retry.error) return json(500, { message: retry.error.message });
          data = retry.data as any;
        } else if (/biz/i.test(msg)) {
          const row3: any = { ...row };
          delete row3.biz;
          const retry2 = await client.from('packages').insert([row3]).select('*').single();
          if (retry2.error) return json(500, { message: retry2.error.message });
          data = retry2.data as any;
        } else if (/package_images/i.test(msg)) {
          const row4: any = { ...row };
          delete row4.package_images;
          const retry3 = await client.from('packages').insert([row4]).select('*').single();
          if (retry3.error) return json(500, { message: retry3.error.message });
          data = retry3.data as any;
        } else if (/quantity/i.test(msg)) {
          const row5: any = { ...row };
          delete row5.quantity;
          const retry4 = await client.from('packages').insert([row5]).select('*').single();
          if (retry4.error) return json(500, { message: retry4.error.message });
          data = retry4.data as any;
        } else if (/receiver_phone/i.test(msg)) {
          const row6: any = { ...row };
          delete row6.receiver_phone;
          const retry5 = await client.from('packages').insert([row6]).select('*').single();
          if (retry5.error) return json(500, { message: retry5.error.message });
          data = retry5.data as any;
        } else {
          return json(500, { message: error.message });
        }
      }
      try { await client.from('audit_logs').insert([{ actor, action: 'packages.create', detail: { ...pkg, tracking_no: pkg.trackingNumber } }]); } catch {}
      return json(200, { item: data });
    }

    if (event.httpMethod === 'PATCH') {
      const allowed = await hasDbRole(client!, actor, ['manager','master','staff']);
      if (!allowed) return json(403, { message: 'Forbidden' });
      const body = event.body ? JSON.parse(event.body) : {};
      const { id, ...changes } = body || {};
      if (!id) return json(400, { message: '缺少ID' });
      // RBAC: staff 仅可修改自己创建的包裹
      try {
        const isStaff = await hasDbRole(client!, actor, ['staff']);
        if (isStaff) {
          let hasCreatedByCol = true;
          try {
            const probe = await client.from('packages').select('created_by').limit(1);
            if ((probe as any)?.error) hasCreatedByCol = false;
          } catch { hasCreatedByCol = false; }
          if (hasCreatedByCol) {
            const { data: ownerRow } = await client.from('packages').select('created_by').eq('id', id).single();
            const owner = ownerRow?.created_by || null;
            if (owner && actor && owner !== actor) return json(403, { message: '仅可操作自己创建的包裹' });
          }
        }
      } catch {}
      // 如果修改了 trackingNumber，先检测重复
      if (changes.trackingNumber) {
        try {
          const { data: dup } = await client
            .from('packages')
            .select('id')
            .eq('tracking_no', changes.trackingNumber)
            .neq('id', id)
            .limit(1);
          if (dup && dup.length > 0) {
            return json(409, { message: '单号已存在，请更换一个新的单号' });
          }
        } catch {}
      }

      // 检测是否存在 inbound_by / inbound_at 列，避免未知列导致 500
      let hasInboundCols = true;
      try {
        const probe = await client.from('packages').select('inbound_by,inbound_at').limit(1);
        if ((probe as any)?.error) hasInboundCols = false;
      } catch { hasInboundCols = false; }

      const update: any = {};
      // 规范化与校验状态
      if (typeof changes.status !== 'undefined') {
        const statusMap: Record<string, string> = { '入库': '已入库', '出库': '运输中' };
        const normalized = statusMap[changes.status] || changes.status;
        const allowed = ['已下单','待预付','已预付','已入库','运输中','已签收','已取消'];
        if (!allowed.includes(normalized)) {
          return json(400, { message: '无效的状态值' });
        }
        update.status = normalized;
      }
      if (changes.trackingNumber) update.tracking_no = changes.trackingNumber;
      if (changes.sender) update.sender = changes.sender;
      if (changes.receiver) update.receiver = changes.receiver;
      if (changes.receiverPhone) update.receiver_phone = changes.receiverPhone;
      if (changes.origin) update.origin = changes.origin;
      if (typeof changes.destination !== 'undefined') update.destination = changes.destination;
      if (changes.packageType) update.package_type = changes.packageType;
      if (typeof changes.weightKg !== 'undefined') update.weight_kg = changes.weightKg;
      if (changes.dimensions) {
        if (typeof changes.dimensions.lengthCm !== 'undefined') update.length_cm = changes.dimensions.lengthCm;
        if (typeof changes.dimensions.widthCm !== 'undefined') update.width_cm = changes.dimensions.widthCm;
        if (typeof changes.dimensions.heightCm !== 'undefined') update.height_cm = changes.dimensions.heightCm;
      }
      if (typeof changes.fee !== 'undefined') update.fee = changes.fee;
      if (typeof changes.quantity !== 'undefined') update.quantity = changes.quantity;
      // 为避免因不同库结构导致的 created_at 更新错误，这里忽略前端传入的 createdAt 字段
      if (changes.estimatedDelivery) update.estimated_delivery = changes.estimatedDelivery;
      if (typeof changes.note !== 'undefined') update.note = changes.note;
      // 当状态改为"已入库"时记录入库账号与时间
      if (update.status === '已入库' && hasInboundCols) {
        update.inbound_by = actor || null;
        update.inbound_at = new Date().toISOString();
      }
      // 当状态改为"已签收"时记录签收账号与时间
      if (update.status === '已签收') {
        update.signed_by = actor || null;
        update.signed_at = new Date().toISOString();
      }

      // 尝试更新，若因不存在的列失败，做一次降级重试
      let errMsg: string | null = null;
      let r1 = await client.from('packages').update(update).eq('id', id);
      if (r1.error) {
        errMsg = r1.error.message || '';
        const downgrade: any = { ...update };
        if (/inbound_by/i.test(errMsg)) delete downgrade.inbound_by;
        if (/inbound_at/i.test(errMsg)) delete downgrade.inbound_at;
        if (/quantity/i.test(errMsg)) delete downgrade.quantity;
        if (/receiver_phone/i.test(errMsg)) delete downgrade.receiver_phone;
        // 兼容库结构：若 destination 列不存在，则改写为 dest 列
        if (/destination/i.test(errMsg) && typeof downgrade.destination !== 'undefined') {
          downgrade.dest = downgrade.destination;
          delete downgrade.destination;
        }
        if (JSON.stringify(downgrade) !== JSON.stringify(update)) {
          r1 = await client.from('packages').update(downgrade).eq('id', id);
        }
      }
      if (r1.error) {
        const msg = r1.error.message || '更新失败';
        return json(500, { message: msg, hint: 'packages.patch' });
      }
      // 若费用发生变更，则同步更新财务记录中的金额，保持与包裹费用一致
      try {
        if (typeof changes.fee !== 'undefined') {
          let trackingNo: string | null = null;
          try {
            const { data: row } = await client.from('packages').select('tracking_no,fee').eq('id', id).single();
            trackingNo = row?.tracking_no ? String(row.tracking_no) : null;
          } catch {}
          if (trackingNo) {
            const feeNum = Number(changes.fee);
            // 按 tracking_no 更新财务记录
            try { await client.from('finances').update({ amount: feeNum }).eq('tracking_no', trackingNo); } catch {}
          }
        }
      } catch {}
      
      // 包裹状态变化时，同步更新财务记录状态（除了取消状态，单独处理）
      try {
        if (update.status && update.status !== '已取消') {
          let trackingNo: string | null = null;
          try {
            const { data: row } = await client.from('packages').select('tracking_no').eq('id', id).single();
            trackingNo = row?.tracking_no ? String(row.tracking_no) : null;
          } catch {}
          
          if (trackingNo) {
            let financeStatus = '待签收';
            
            // 根据包裹状态确定财务状态
            switch (update.status) {
              case '待预付':
                financeStatus = '待付费';
                break;
              case '已预付':
                financeStatus = '已预付';
                break;
              case '已下单':
                financeStatus = '待签收';
                break;
              case '已入库':
                financeStatus = '待签收';
                break;
              case '运输中':
                financeStatus = '运输中';
                break;
              case '已签收':
                financeStatus = '已入账';
                break;
              default:
                financeStatus = '待签收';
            }
            
            // 更新对应的财务记录状态
            try { 
              await client.from('finances').update({ status: financeStatus }).eq('tracking_no', trackingNo); 
            } catch {}
          }
        }
      } catch {}
      
      // 业务规则：设置为"已取消"时，更新财务记录为pickup费
      try {
        const setToCanceled = (update.status === '已取消') || (changes.status === '已取消');
        if (setToCanceled) {
          let trackingNo: string | null = null;
          let pkgBiz: string | null = null;
          try {
            const { data: row } = await client.from('packages').select('tracking_no,biz').eq('id', id).single();
            trackingNo = row?.tracking_no ? String(row.tracking_no) : null;
            pkgBiz = row?.biz || null;
          } catch {}
          if (trackingNo) {
            // 只有同城包裹取消时才收取pickup费
            if (pkgBiz === 'city') {
              try { 
                await client.from('finances').update({ 
                  status: '已入账',
                  category: 'pickup费',
                  note: `取消订单pickup费 - ${trackingNo}`
                }).eq('tracking_no', trackingNo); 
              } catch {}
        } else {
              // 跨境包裹取消时，财务记录设为作废
              try { await client.from('finances').update({ status: '作废' }).eq('tracking_no', trackingNo); } catch {}
            }
          }
        }
      } catch {}
      try {
        let trackingNo: string | null = null;
        try { const { data: row } = await client.from('packages').select('tracking_no').eq('id', id).single(); trackingNo = row?.tracking_no || null; } catch {}
        await client.from('audit_logs').insert([{ actor, action: 'packages.update', detail: { id, tracking_no: trackingNo, before: undefined, after: undefined, changes } }]);
      } catch {}
      return json(200, { ok: true });
    }



    if (event.httpMethod === 'DELETE') {
      const allowed = await hasDbRole(client!, actor, ['manager','master','staff']);
      if (!allowed) return json(403, { message: 'Forbidden' });
      const body = event.body ? JSON.parse(event.body) : {};
      const { id, trackingNumber } = body || {};
      if (!id && !trackingNumber) return json(400, { message: '缺少ID或trackingNumber' });
      let error: any = null;
      if (id) {
        // RBAC: staff 仅可删除自己创建的包裹
        try {
          const isStaff = await hasDbRole(client!, actor, ['staff']);
          if (isStaff) {
            let hasCreatedByCol = true;
            try {
              const probe = await client.from('packages').select('created_by').limit(1);
              if ((probe as any)?.error) hasCreatedByCol = false;
            } catch { hasCreatedByCol = false; }
            if (hasCreatedByCol) {
              const { data: ownerRow } = await client.from('packages').select('created_by').eq('id', id).single();
              const owner = ownerRow?.created_by || null;
              if (owner && actor && owner !== actor) return json(403, { message: '仅可操作自己创建的包裹' });
            }
          }
        } catch {}
        // 读取包裹以拿到单号，随后删除财务
        const { data: p } = await client.from('packages').select('tracking_no').eq('id', id).single();
        const t = p?.tracking_no;
        ({ error } = await client.from('packages').delete().eq('id', id));
        if (!error && t) {
          try { await client.from('finances').delete().eq('tracking_no', t); } catch {}
          // 删除旧格式的财务记录（向后兼容）
          try { await client.from('finances').delete().eq('note', `新包裹入库 - 单号 ${t}`); } catch {}
          try { await client.from('finances').delete().eq('note', `包裹签收 - 单号 ${t}`); } catch {}
          try { await client.from('finances').delete().eq('note', `包裹已到站 - 单号 ${t}`); } catch {}
        }
      } else if (trackingNumber) {
        ({ error } = await client.from('packages').delete().eq('tracking_no', trackingNumber));
        try {
          await client.from('finances').delete().eq('tracking_no', trackingNumber);
          // 删除旧格式的财务记录（向后兼容）
          await client.from('finances').delete().eq('note', `新包裹入库 - 单号 ${trackingNumber}`);
          await client.from('finances').delete().eq('note', `包裹签收 - 单号 ${trackingNumber}`);
          await client.from('finances').delete().eq('note', `包裹已到站 - 单号 ${trackingNumber}`);
        } catch {}
      }
      if (error) return json(500, { message: error.message });
      try { await client.from('audit_logs').insert([{ actor, action: 'packages.delete', detail: { id, trackingNumber } }]); } catch {}
      return json(200, { ok: true });
    }

    return json(405, { message: 'Method Not Allowed' });
  } catch (e: any) {
    const msg = e?.message || 'Server Error';
    return json(500, { message: msg });
  }
};


