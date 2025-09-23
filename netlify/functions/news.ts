import type { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL as string;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE as string;

const client = SUPABASE_URL && SERVICE_ROLE
  ? createClient(SUPABASE_URL, SERVICE_ROLE, { auth: { persistSession: false } })
  : null;

const cors = {
  'Access-Control-Allow-Origin': 'https://market-link-express.com',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Credentials': 'true',
};

function json(statusCode: number, body: any) {
  return { statusCode, headers: { 'Content-Type': 'application/json', ...cors }, body: JSON.stringify(body) } as any;
}

async function fetchWithTimeout(url: string, ms = 7000): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ms);
  try {
    const r = await fetch(url, { signal: controller.signal });
    const t = await r.text();
    return t;
  } finally {
    clearTimeout(timer);
  }
}

function parseRssOrAtom(xml: string) {
  const items: Array<{ title: string; link: string; createdAt?: string } > = [];
  const clean = (s: string) => s.replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1').trim();
  const rssItemRe = /<item[\s\S]*?<\/item>/g;
  const titleRe = /<title[\s\S]*?>([\s\S]*?)<\/title>/;
  const linkRe = /<link[\s\S]*?>([\s\S]*?)<\/link>/;
  const dateRe = /<pubDate[\s\S]*?>([\s\S]*?)<\/pubDate>/;
  const matches = xml.match(rssItemRe) || [];
  for (const block of matches) {
    const title = titleRe.exec(block)?.[1];
    const link = linkRe.exec(block)?.[1];
    const date = dateRe.exec(block)?.[1];
    if (title && link) items.push({ title: clean(title), link: clean(link), createdAt: date ? new Date(date).toISOString() : undefined });
  }
  if (!items.length) {
    const entryRe = /<entry[\s\S]*?<\/entry>/g;
    const linkHrefRe = /<link[^>]*href=["']([^"']+)["'][^>]*\/?/;
    const updatedRe = /<updated[\s\S]*?>([\s\S]*?)<\/updated>/;
    const entries = xml.match(entryRe) || [];
    for (const block of entries) {
      const title = titleRe.exec(block)?.[1];
      const link = linkHrefRe.exec(block)?.[1];
      const date = updatedRe.exec(block)?.[1];
      if (title && link) items.push({ title: clean(title), link: clean(link), createdAt: date ? new Date(date).toISOString() : undefined });
    }
  }
  return items;
}

export const handler: Handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' } as any;
  if (event.httpMethod !== 'GET') return json(405, { message: 'Method Not Allowed' });

  const page = Math.max(1, parseInt((event.queryStringParameters?.page as string) || '1', 10));
  const pageSize = Math.min(50, Math.max(3, parseInt((event.queryStringParameters?.pageSize as string) || '10', 10)));
  const externalFirst = String(event.queryStringParameters?.external || '1') !== '0';

  // 尝试聚合外部新闻源（RSS/Atom）
  if (externalFirst) {
    try {
      const sources = [
        'https://36kr.com/feed',
        'https://www.huxiu.com/rss/0.xml',
        'https://rsshub.app/reuters/theWire',
        'https://rsshub.app/caijing/latest',
        'https://rsshub.app/ifeng/news',
      ];
      const results = await Promise.allSettled(sources.map(u => fetchWithTimeout(u)));
      let merged: Array<{ title: string; link: string; createdAt?: string }> = [];
      for (const r of results) {
        if (r.status === 'fulfilled') {
          try { merged = merged.concat(parseRssOrAtom(r.value)); } catch {}
        }
      }
      const seen = new Set<string>();
      const unique = merged.filter(it => { const k = it.title.replace(/\s+/g, ''); if (seen.has(k)) return false; seen.add(k); return true; });
      unique.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      const items = unique.slice(0, pageSize * page).slice((page-1)*pageSize, page*pageSize).map((x, i) => ({ id: `ext-${(page-1)*pageSize+i}`, title: x.title, summary: '', image: '', url: x.link, createdAt: x.createdAt || new Date().toISOString() }));
      if (items.length) return json(200, { items, page, pageSize, total: unique.length });
    } catch {}
  }

  // 数据库兜底
  if (client) {
    try {
      const { data, error } = await client
        .from('news')
        .select('id,title,summary,image,url,created_at')
        .order('created_at', { ascending: false })
        .range((page-1)*pageSize, page*pageSize-1);
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({ id: String(r.id), title: r.title || '', summary: r.summary || '', image: r.image || '', url: r.url || '', createdAt: r.created_at || '' }));
      if (rows.length) return json(200, { items: rows, page, pageSize, total: rows.length });
    } catch {}
  }
  return json(200, { items: demoItems(), page, pageSize, total: demoItems().length });
};

function demoItems() {
  return [
    { id: 'd1', title: '跨境物流高峰将至', summary: '热门线路提速升级，限时优惠进行中', image: '', url: '#', createdAt: new Date().toISOString() },
    { id: 'd2', title: '海关查验政策更新', summary: '新规解读与申报指引，一文看懂', image: '', url: '#', createdAt: new Date().toISOString() },
    { id: 'd3', title: 'MARKET-LINK EXPRESS 新增目的地', summary: '覆盖更多城市，服务更近一步', image: '', url: '#', createdAt: new Date().toISOString() },
  ];
}


