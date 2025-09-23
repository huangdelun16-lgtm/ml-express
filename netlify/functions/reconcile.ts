import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, x-ml-actor',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) };
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (!client) return json(500, { message: 'backend not configured' });

  try {
    // 仅允许 manager/master 执行（或将此函数仅用于计划任务）
    const actor = (event.headers['x-ml-actor'] || event.headers['X-ML-Actor'] || '').toString();
    if (event.httpMethod !== 'GET') {
      try {
        const { data } = await client.from('users').select('role').eq('username', actor).limit(1);
        const r = data && data[0]?.role;
        if (!['accountant','manager','master'].includes(r)) return json(403, { message: 'Forbidden' });
      } catch {
        return json(403, { message: 'Forbidden' });
      }
    }
    const { data: pkgs, error: e1 } = await client.from('packages').select('tracking_no, fee, created_at, status, note, receiver, destination, dest, biz');
    if (e1) return json(500, { message: e1.message });
    // 兼容不存在的 tracking_no 列：只读取 note/amount/date
    const { data: fins, error: e2 } = await client.from('finances').select('id, note, amount, date, tracking_no, status');
    if (e2) return json(500, { message: e2.message });

    const pkgSet = new Set<string>((pkgs || []).map((p: any) => String(p.tracking_no)));
    const finMap = new Map<string, any>();
    (fins || []).forEach((f: any) => {
      const k = f.tracking_no || (f.note && String(f.note).replace('新包裹入库 - 单号 ', ''));
      if (k) finMap.set(String(k), f);
    });

    const missingFinance: string[] = [];
    for (const k of pkgSet) {
      if (!finMap.has(k)) missingFinance.push(k);
    }
    const extraFinance: string[] = [];
    for (const k of finMap.keys()) {
      if (!pkgSet.has(k)) extraFinance.push(k);
    }

    if (event.httpMethod === 'POST') {
      const body = event.body ? JSON.parse(event.body) : {};
      const keepOnlyPackages = !!body.keepOnlyPackages;
      const markTransit = !!body.markTransit; // 新增：将与运输中包裹关联的财务记录改为“运输中”
      const fixAmounts = !!body.fixAmounts;  // 新增：将财务记录金额与包裹费用对齐
      const deleteVoided = !!body.deleteVoided; // 新增：删除作废财务与已取消包裹相关财务
      const ops: any[] = [];
      const prefix = '新包裹入库 - 单号 ';

      if (keepOnlyPackages) {
        // 删除所有“不是包裹入库收入”的记录，及与当前包裹不匹配的记录
        const idsToDelete: string[] = [];
        for (const f of fins || []) {
          const note: string = f.note || '';
          if (!note.startsWith(prefix)) { idsToDelete.push(f.id); continue; }
          const t = note.slice(prefix.length).trim();
          if (!pkgSet.has(t)) idsToDelete.push(f.id);
        }
        if (idsToDelete.length) {
          ops.push(client.from('finances').delete().in('id', idsToDelete as any));
        }
      }
      // 补财务：根据包裹生成收入
      for (const t of missingFinance) {
        const p = (pkgs || []).find((x: any) => String(x.tracking_no) === t);
        if (p && Number(p.fee || 0) > 0) {
          // 根据包裹状态设置财务状态和分类
          let financeStatus = '待签收';
          let category = '运费';
          let note = p.note || '运费收入';
          
          if (p.status === '已取消') {
            financeStatus = '已入账'; // 已取消的包裹，pickup fee已确定收取
            category = 'pickup费'; // 取消包裹的费用分类
            note = `取消订单pickup费 - ${p.tracking_no}`;
          } else if (p.status === '待预付') {
            financeStatus = '待签收';
          } else if (p.status === '已签收') {
            financeStatus = '已入账';
          }
          
          ops.push(client.from('finances').insert([{ 
            type: '收入', 
            category: category, 
            amount: Number(p.fee||0), 
            note: note, 
            date: p.created_at, 
            tracking_no: t, 
            status: financeStatus,
            receiver: p.receiver || null,
            destination: p.destination || p.dest || null,
            biz: p.biz || null
          }]));
        }
      }
      // 对齐状态：若请求 markTransit=true，则把所有“运输中”包裹对应的财务记录状态改为“运输中”
      if (markTransit) {
        const inTransit = new Set<string>((pkgs || []).filter((p:any)=>p.status==='运输中').map((p:any)=>String(p.tracking_no)));
        if (inTransit.size) {
          const arr = Array.from(inTransit);
          // 先尝试更新 tracking_no 命中的记录
          ops.push((client as any).from('finances').update({ status: '运输中' }).in('tracking_no', arr));
          // 再兼容 note 文本匹配
          for (const t of arr) {
            // 兼容旧格式的备注
            const noteEq = `新包裹入库 - 单号 ${t}`;
            ops.push((client as any).from('finances').update({ status: '运输中' }).eq('note', noteEq));
          }
        }
      }
      // 对齐金额：把 finance.amount 调整为与 package.fee 一致
      if (fixAmounts) {
        for (const p of pkgs || []) {
          const t = String(p.tracking_no || '');
          if (!t) continue;
          const feeNum = Number(p.fee || 0);
          ops.push((client as any).from('finances').update({ amount: feeNum }).eq('tracking_no', t));
          // 兼容旧格式的备注
          ops.push((client as any).from('finances').update({ amount: feeNum }).eq('note', `新包裹入库 - 单号 ${t}`));
        }
      }
      // 清理：删除所有 status=作废 的财务记录；以及所有与“已取消”包裹关联的财务记录
      if (deleteVoided) {
        try { ops.push((client as any).from('finances').delete().eq('status','作废')); } catch {}
        const canceled = (pkgs || []).filter((p:any)=>p.status==='已取消').map((p:any)=>String(p.tracking_no));
        for (const t of canceled) {
          if (!t) continue;
          // 兼容旧格式的备注
          const noteNew = `新包裹入库 - 单号 ${t}`;
          const noteSigned = `包裹签收 - 单号 ${t}`;
          ops.push((client as any).from('finances').delete().eq('tracking_no', t));
          ops.push((client as any).from('finances').delete().eq('note', noteNew));
          ops.push((client as any).from('finances').delete().eq('note', noteSigned));
        }
      }
      // 删多余财务
      for (const t of extraFinance) {
        ops.push(client.from('finances').delete().or(`tracking_no.eq.${t},note.eq.${encodeURIComponent('新包裹入库 - 单号 ' + t)})` as any));
      }
      await Promise.allSettled(ops);
      return json(200, { ok: true, fixed_missing: missingFinance.length, fixed_extra: extraFinance.length, purged: keepOnlyPackages, marked_transit: markTransit, fixed_amounts: fixAmounts, deleted_voided: deleteVoided });
    }

    return json(200, { ok: true, missingFinance, extraFinance, packages: pkgSet.size, finances: finMap.size });
  } catch (e: any) {
    return json(500, { message: e?.message || 'Server Error' });
  }
};


