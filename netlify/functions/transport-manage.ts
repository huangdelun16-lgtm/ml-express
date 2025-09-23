import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import { getAuthFromEvent, hasDbRole } from './_auth';

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
  const headers: Record<string,string> = { 'Content-Type': 'application/json', ...cors };
  if (cc) {
    headers['Cache-Control'] = cc;
    headers['Vary'] = 'Authorization, x-ml-actor, x-ml-role';
  }
  return { statusCode, headers, body: JSON.stringify(body) };
}

function deny(msg = 'Forbidden') { return json(403, { message: msg }); }

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE' });

  const session = getAuthFromEvent(event);
  const actor = session?.username || (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();

  try {
    if (event.httpMethod === 'GET') {
      const qs = event.queryStringParameters || {};
      if ((qs.debug as string) === '1') {
        try {
          const probe1 = await client.from('shipments').select('id', { head: true, count: 'exact' });
          const probe2 = await client.from('shipment_packages').select('shipment_id', { head: true, count: 'exact' });
          return json(200, {
            env: { SUPABASE_URL: !!process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE },
            shipments: { count: (probe1 as any)?.count ?? null, error: (probe1 as any)?.error?.message || null },
            shipment_packages: { count: (probe2 as any)?.count ?? null, error: (probe2 as any)?.error?.message || null },
          });
        } catch (e: any) {
          return json(500, { status: 'probe_failed', message: e?.message || 'unknown' });
        }
      }
      if ((qs.debug as string) === '2') {
        // 非 HEAD 查询，返回更详细的错误信息
        const s1 = await client.from('shipments').select('id').limit(1);
        const s2 = await client.from('shipment_packages').select('shipment_id').limit(1);
        return json(200, {
          env: { SUPABASE_URL: !!process.env.SUPABASE_URL, SUPABASE_SERVICE_ROLE: !!process.env.SUPABASE_SERVICE_ROLE },
          shipments: { status: (s1 as any)?.status, error: (s1 as any)?.error || null, data: Array.isArray((s1 as any)?.data) ? (s1 as any).data.length : null },
          shipment_packages: { status: (s2 as any)?.status, error: (s2 as any)?.error || null, data: Array.isArray((s2 as any)?.data) ? (s2 as any).data.length : null },
        });
      }
      const page = Math.max(1, parseInt((qs.page as string) || '1', 10));
      const pageSize = Math.min(100, Math.max(5, parseInt((qs.pageSize as string) || '20', 10)));
      const search = (qs.search || '').toString();
      const shipmentId = (qs.shipmentId || '').toString();

      if (shipmentId) {
        // 返回某个运单详情和包含的包裹
        const { data: shipment, error: se } = await client
          .from('shipments')
          .select('*')
          .eq('id', shipmentId)
          .single();
        if (se) return json(500, { message: se.message });
        const { data: sp } = await client
          .from('shipment_packages')
          .select('tracking_no')
          .eq('shipment_id', shipmentId);
        const trackingNos = (sp || []).map((r: any) => r.tracking_no).filter(Boolean);
        let packages: any[] = [];
        if (trackingNos.length) {
          const { data: pkg } = await (client as any)
            .from('packages')
            .select('id,tracking_no,sender,receiver,status,weight,fee,created_at')
            .in('tracking_no', trackingNos);
          packages = pkg || [];
        }
        // 同时返回 trackingNumbers 以便前端兜底展示
        return json(200, { shipment, packages, trackingNumbers: trackingNos }, { maxAge: 15, swr: 60 });
      }

      // 列表与统计
      let countQ = client.from('shipments').select('id', { count: 'exact', head: true });
      if (search) countQ = countQ.ilike('freight_no', `%${search}%`);
      const { count: total = 0 } = (await countQ) as any;

      let listQ = client
        .from('shipments')
        .select('*')
        .order('depart_date', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
      if (search) listQ = listQ.ilike('freight_no', `%${search}%`);
      const { data, error } = await listQ;
      if (error) return json(500, { message: error.message });

      // 每个运单的包裹数
      const ids = (data || []).map((s: any) => s.id);
      let counts: Record<string, number> = {};
      if (ids.length) {
        const { data: pairs } = await client
          .from('shipment_packages')
          .select('shipment_id');
        for (const r of (pairs || [])) {
          const k = r.shipment_id; counts[k] = (counts[k] || 0) + 1;
        }
      }

      const items = (data || []).map((s: any) => {
        const destination = (s.destination || s.dest || null);
        // 调试日志：记录目的地字段处理
        if (s.freight_no && !destination) {
          console.log(`运单 ${s.freight_no} 目的地字段为空:`, {
            raw_destination: s.destination,
            raw_dest: s.dest,
            final_destination: destination,
            all_fields: Object.keys(s)
          });
        }
        return {
          id: s.id,
          freightNo: s.freight_no,
          vehicleNo: s.vehicle_no,
          departDate: s.depart_date,
          destination,
          note: s.note,
          createdBy: s.created_by,
          packageCount: counts[s.id] || 0,
        };
      });
      // 为了避免编辑后列表仍显示旧数据，这里关闭缓存
      return json(200, { items, page, pageSize, total }, { maxAge: 0, swr: 0 });
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const op = (body.op || 'create').toString();
      if (op === 'create') {
        const allowed = await hasDbRole(client!, actor, ['manager', 'master', 'staff','cross_clearance']);
        if (!allowed) return deny();
        const { freightNo, vehicleNo, departDate, note, destination } = body || {};
        if (!freightNo || !freightNo.trim()) return json(400, { message: '缺少货运号' });
        
        console.log('创建运单请求数据:', { freightNo, vehicleNo, departDate, note, destination, destinationType: typeof destination });
        
        try {
          const insertData = {
            freight_no: freightNo.trim(),
            vehicle_no: vehicleNo ? String(vehicleNo).trim() : null,
            depart_date: departDate || null,
            note: note ? String(note).trim() : null,
            destination: destination ? String(destination).trim() : null,
            created_by: actor,
            created_at: new Date().toISOString()
          };
          console.log('准备插入数据库的数据:', insertData);
          
          const { data, error } = await client.from('shipments').insert([insertData]).select('*').single();
          
          if (error) {
            console.error('Insert shipment error:', error);
            // 兼容旧库：若 destination 列不存在，则尝试使用 legacy 列 dest
            console.log('destination列不存在，尝试使用dest列');
            const fallbackData = {
              freight_no: freightNo.trim(),
              vehicle_no: vehicleNo ? String(vehicleNo).trim() : null,
              depart_date: departDate || null,
              note: note ? String(note).trim() : null,
              dest: destination ? String(destination).trim() : null,
              created_by: actor,
              created_at: new Date().toISOString()
            };
            console.log('使用dest列的数据:', fallbackData);
            
            const r2 = await client.from('shipments').insert([fallbackData]).select('*').single();
            if ((r2 as any)?.error) {
              console.error('Fallback insert error:', (r2 as any).error);
              // 最后一次降级：完全忽略目的地列
              console.log('dest列也不存在，忽略目的地字段');
              const finalData = {
                freight_no: freightNo.trim(),
                vehicle_no: vehicleNo ? String(vehicleNo).trim() : null,
                depart_date: departDate || null,
                note: note ? String(note).trim() : null,
                created_by: actor,
                created_at: new Date().toISOString()
              };
              console.log('最终插入数据（无目的地）:', finalData);
              
              const r3 = await client.from('shipments').insert([finalData]).select('*').single();
              if ((r3 as any)?.error) {
                console.error('Final insert error:', (r3 as any).error);
                return json(500, { message: (r3 as any).error.message });
              }
              console.log('创建运单成功（无目的地）:', (r3 as any).data);
              return json(200, { item: (r3 as any).data });
            }
            console.log('创建运单成功（使用dest列）:', (r2 as any).data);
            return json(200, { item: (r2 as any).data });
          }
          
          console.log('创建运单成功:', data);
          
          // 为兼容旧库：若存在 legacy 列 dest，则把 destination 同步写入 dest（忽略错误）
          try {
            if (destination && String(destination).trim()) {
              await client.from('shipments').update({ dest: String(destination).trim() }).eq('id', (data as any)?.id);
            }
          } catch {}

          // 审计日志
          try { await client.from('audit_logs').insert([{ actor, action: 'transport.create', detail: { freightNo, vehicleNo, departDate, note, destination } }]); } catch {}
          
          return json(200, { item: data });
        } catch (e: any) {
          console.error('创建运单异常:', e);
          return json(500, { message: e?.message || '创建失败' });
        }
      }
      if (op === 'addPackages') {
        const allowed = await hasDbRole(client!, actor, ['manager', 'master', 'staff','cross_clearance']);
        if (!allowed) return deny();
        const { shipmentId, trackingNumbers } = body || {};
        if (!shipmentId) return json(400, { message: '缺少运单ID' });
        const arr = Array.isArray(trackingNumbers) ? trackingNumbers : [];
        if (!arr.length) return json(400, { message: '缺少单号列表' });
        const rows = arr.map((t: string) => ({ shipment_id: shipmentId, tracking_no: String(t), added_by: actor }));
        // 去重插入
        try { await client.from('shipment_packages').insert(rows, { upsert: true }); } catch (e: any) { return json(500, { message: e?.message || '插入失败' }); }
        // 更新包裹状态为 运输中（若存在该包裹）
        try {
          await (client as any)
            .from('packages')
            .update({ status: '运输中' })
            .in('tracking_no', arr);
        } catch {}
        try { await client.from('audit_logs').insert([{ actor, action: 'transport.addPackages', detail: { shipmentId, trackingNumbers: arr } }]); } catch {}
        return json(200, { ok: true });
      }
      if (op === 'arrive') {
        // 到货通知：把该运单所有包裹对应的财务记录置为"待签收"，若缺失则补建
        const allowed = await hasDbRole(client!, actor, ['manager', 'master', 'staff','cross_clearance']);
        if (!allowed) return deny();
        const { shipmentId } = body || {};
        if (!shipmentId) return json(400, { message: '缺少运单ID' });
        // 取该运单下所有 tracking_no
        const { data: sp, error: spErr } = await client
          .from('shipment_packages')
          .select('tracking_no')
          .eq('shipment_id', shipmentId);
        if (spErr) return json(500, { message: spErr.message });
        const arr = Array.from(new Set((sp || []).map((r: any) => String(r.tracking_no || '')).filter(Boolean)));
        if (!arr.length) return json(200, { ok: true, updated: 0, created: 0 });
        // 1) 现有财务：按 tracking_no 批量置为"待签收"
        try { await (client as any).from('finances').update({ status: '待签收' }).in('tracking_no', arr); } catch {}
        // 兼容旧数据：备注中包含"新包裹入库 - 单号 X"
        for (const t of arr) {
          const noteEq = `新包裹入库 - 单号 ${t}`;
          try { await (client as any).from('finances').update({ status: '待签收' }).eq('note', noteEq); } catch {}
        }
        // 2) 补建缺失财务（若该单号既无 tracking_no 命中，也无"新包裹入库 - 单号 X"的记录）
        const today = new Date().toISOString().slice(0,10);
        const notes = arr.map(t => `新包裹入库 - 单号 ${t}`);
        let existingByTracking: any[] = [];
        try { const r = await client.from('finances').select('id,tracking_no').in('tracking_no', arr); existingByTracking = (r as any)?.data || []; } catch {}
        let existingByNote: any[] = [];
        try { const r2 = await client.from('finances').select('id,note').in('note', notes); existingByNote = (r2 as any)?.data || []; } catch {}
        const existSet = new Set<string>();
        for (const r of existingByTracking) { if (r?.tracking_no) existSet.add(String(r.tracking_no)); }
        for (const r of existingByNote) {
          const m = String(r?.note || '').match(/单号\s*([\w-]+)/);
          if (m && m[1]) existSet.add(String(m[1]));
        }
        // 查包裹费用
        let pkgRows: any[] = [];
        try {
          const r3 = await (client as any)
            .from('packages')
            .select('tracking_no,fee')
            .in('tracking_no', arr);
          pkgRows = (r3 as any)?.data || [];
        } catch {}
        const toCreate = pkgRows.filter((p: any) => p?.tracking_no && !existSet.has(String(p.tracking_no)));
        let created = 0;
        if (toCreate.length) {
          const rows = toCreate.map((p: any) => ({
            type: '收入',
            category: '运费',
            amount: Number(p.fee || 0),
            note: '运费收入',
            date: today,
            status: '待签收',
            tracking_no: String(p.tracking_no),
            created_by: actor,
          }));
          try { const ins = await client.from('finances').insert(rows); if (!(ins as any)?.error) created = rows.length; } catch {}
        }
        try { await client.from('audit_logs').insert([{ actor, action: 'transport.arrive', detail: { shipmentId, count: arr.length, created } }]); } catch {}
        return json(200, { ok: true, updated: arr.length, created });
      }
      if (op === 'transit') {
        // 中转操作：记录中转信息，财务状态保持"运输中"
        const allowed = await hasDbRole(client!, actor, ['manager', 'master', 'staff','cross_clearance']);
        if (!allowed) return deny();
        const { shipmentId, transitLocation, nextFreightNo, note } = body || {};
        if (!shipmentId) return json(400, { message: '缺少运单ID' });
        if (!transitLocation || !transitLocation.trim()) return json(400, { message: '缺少中转地点' });
        
        // 记录中转信息到 shipments 表
        const transitInfo = {
          transit_location: transitLocation.trim(),
          transit_time: new Date().toISOString(),
          next_freight_no: nextFreightNo ? String(nextFreightNo).trim() : null,
          transit_note: note ? String(note).trim() : null,
          transit_by: actor,
        };
        
        try {
          await client.from('shipments').update(transitInfo).eq('id', shipmentId);
        } catch (e: any) {
          return json(500, { message: e?.message || '更新中转信息失败' });
        }
        
        // 若填写了下一程货运号：创建/复用新运单，并把包裹迁移到新运单
        let newShipmentId: string | null = null;
        if (nextFreightNo && String(nextFreightNo).trim()) {
          const nf = String(nextFreightNo).trim();
          try {
            // 1) 复用已存在的同号运单
            const { data: exist } = await client.from('shipments').select('id').eq('freight_no', nf).limit(1);
            if (exist && exist.length > 0) {
              newShipmentId = exist[0]?.id || null;
            }
          } catch {}
          try {
            if (!newShipmentId) {
              // 读取旧运单以承接目的地等
              let old: any = null;
              try { const r = await client.from('shipments').select('*').eq('id', shipmentId).single(); old = (r as any)?.data || null; } catch {}
              const row: any = {
                freight_no: nf,
                vehicle_no: null,
                depart_date: null,
                note: (note ? String(note).trim() + '；' : '') + `由 ${old?.freight_no || ''} 中转（${transitLocation.trim()}）`,
                destination: old?.destination || old?.dest || null,
                created_by: actor,
                created_at: new Date().toISOString()
              };
              // 主写 destination，失败则降级到 dest
              let ins = await client.from('shipments').insert([row]).select('*').single();
              if ((ins as any)?.error) {
                const { destination, ...rest } = row;
                ins = await client.from('shipments').insert([{ ...rest, dest: destination }]).select('*').single();
                if ((ins as any)?.error) {
                  const r3 = await client.from('shipments').insert([rest]).select('*').single();
                  if ((r3 as any)?.error) throw new Error((r3 as any).error.message);
                  newShipmentId = (r3 as any).data?.id || null;
                } else {
                  newShipmentId = (ins as any).data?.id || null;
                }
              } else {
                newShipmentId = (ins as any).data?.id || null;
              }
            }
          } catch (e: any) {
            return json(500, { message: e?.message || '创建下一程运单失败' });
          }

          // 2) 迁移包裹关联（从旧运单迁移至新运单）
          if (newShipmentId) {
            try {
              const { data: sp } = await client.from('shipment_packages').select('tracking_no').eq('shipment_id', shipmentId);
              const arr = Array.from(new Set((sp || []).map((r: any) => String(r.tracking_no || '')).filter(Boolean)));
              if (arr.length) {
                const rows = arr.map(t => ({ shipment_id: newShipmentId!, tracking_no: t, added_by: actor }));
                try { await client.from('shipment_packages').insert(rows, { upsert: true }); } catch {}
                try { await client.from('shipment_packages').delete().eq('shipment_id', shipmentId); } catch {}
              }
            } catch {}
          }
        }

        // 审计日志
        try { 
          await client.from('audit_logs').insert([{ 
            actor, 
            action: 'transport.transit', 
            detail: { shipmentId, ...transitInfo, newShipmentId } 
          }]); 
        } catch {}
        
        return json(200, { ok: true, transitInfo, newShipmentId });
      }
      return json(400, { message: '未知操作' });
    }

    if (event.httpMethod === 'PATCH') {
      const allowed = await hasDbRole(client!, actor, ['manager', 'master']);
      if (!allowed) return deny();
      const body = event.body ? JSON.parse(event.body) : {};
      const { shipmentId, changes } = body || {};
      if (!shipmentId) return json(400, { message: '缺少运单ID' });
      if (changes?.departDate && !/^\d{4}-\d{2}-\d{2}$/.test(String(changes.departDate))) return json(400, { message: '日期格式错误' });
      const mapped: any = {};
      if (typeof changes?.freightNo !== 'undefined') mapped.freight_no = changes.freightNo;
      if (typeof changes?.vehicleNo !== 'undefined') mapped.vehicle_no = changes.vehicleNo;
      if (typeof changes?.departDate !== 'undefined') mapped.depart_date = changes.departDate;
      if (typeof changes?.note !== 'undefined') mapped.note = changes.note;
      if (typeof changes?.destination !== 'undefined') mapped.destination = changes.destination;
      let { error } = await client.from('shipments').update(mapped).eq('id', shipmentId);
      if (error) {
        // 旧库可能没有 destination：回退写入 dest 列
        const { destination, ...rest } = mapped as any;
        if (typeof destination !== 'undefined') {
          const r2 = await client.from('shipments').update({ ...rest, dest: destination }).eq('id', shipmentId);
          if (r2.error) {
            // 仍失败则移除目的地重试
            const r3 = await client.from('shipments').update(rest).eq('id', shipmentId);
            if (r3.error) return json(500, { message: r3.error.message });
          }
        } else {
          const r3 = await client.from('shipments').update(rest).eq('id', shipmentId);
          if (r3.error) return json(500, { message: r3.error.message });
        }
      } else {
        // 更新 destination 成功后，尝试同步 legacy 列 dest（忽略错误）
        try {
          if (typeof (mapped as any).destination !== 'undefined') {
            await client.from('shipments').update({ dest: (mapped as any).destination }).eq('id', shipmentId);
          }
        } catch {}
      }
      try { await client.from('audit_logs').insert([{ actor, action: 'transport.update', detail: { shipmentId, changes } }]); } catch {}
      return json(200, { ok: true });
    }

    if (event.httpMethod === 'DELETE') {
      const allowed = await hasDbRole(client!, actor, ['manager', 'master']);
      if (!allowed) return deny();
      const body = event.body ? JSON.parse(event.body) : {};
      const { shipmentId, trackingNumber } = body || {};
      if (shipmentId && trackingNumber) {
        // 从运单移除包裹
        const { error } = await client.from('shipment_packages').delete().match({ shipment_id: shipmentId, tracking_no: trackingNumber });
        if (error) return json(500, { message: error.message });
        try { await client.from('audit_logs').insert([{ actor, action: 'transport.removePackage', detail: { shipmentId, trackingNumber } }]); } catch {}
        return json(200, { ok: true });
      }
      if (shipmentId) {
        // 删除运单及关联
        try { await client.from('shipment_packages').delete().eq('shipment_id', shipmentId); } catch {}
        const { error } = await client.from('shipments').delete().eq('id', shipmentId);
        if (error) return json(500, { message: error.message });
        try { await client.from('audit_logs').insert([{ actor, action: 'transport.delete', detail: { shipmentId } }]); } catch {}
        return json(200, { ok: true });
      }
      return json(400, { message: '缺少删除条件' });
    }

    return json(405, { message: 'Method Not Allowed' });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};



