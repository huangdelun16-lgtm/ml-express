import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Box, IconButton, Typography, Card, CardActionArea, Tooltip, Chip } from '@mui/material';
import { ChevronLeft, ChevronRight, Autorenew } from '@mui/icons-material';
import { keyframes } from '@mui/system';
import { fetchWithRetry } from '../utils/backend';

interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  image?: string;
  url?: string;
  createdAt?: string;
}

const gradients = [
  'linear-gradient(135deg, #FFF1EB 0%, #ACE0F9 100%)',
  'linear-gradient(135deg, #FDEB71 0%, #F8D800 100%)',
  'linear-gradient(135deg, #ABDCFF 0%, #0396FF 100%)',
  'linear-gradient(135deg, #FEB692 0%, #EA5455 100%)',
  'linear-gradient(135deg, #CE9FFC 0%, #7367F0 100%)',
  'linear-gradient(135deg, #90F7EC 0%, #32CCBC 100%)',
];

const marquee = keyframes`
  0% { transform: translateX(0); }
  100% { transform: translateX(-50%); }
`;

const NewsCarousel: React.FC = () => {
  const [items, setItems] = useState<NewsItem[]>([]);
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const [seed] = useState(() => Math.floor(Math.random() * 1000));

  const visible = useMemo(() => {
    if (!items.length) return [] as NewsItem[];
    const a = items[index % items.length];
    const b = items[(index + 1) % items.length];
    const c = items[(index + 2) % items.length];
    return [a,b,c];
  }, [items, index]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetchWithRetry('/.netlify/functions/news?page=1&pageSize=20');
        const j = await r.json();
        const rows: NewsItem[] = (j.items || []);
        if (rows.length) {
          setItems(rows);
          localStorage.setItem('ml_news_cache', JSON.stringify({ at: Date.now(), rows: rows.slice(0, 50) }));
        } else {
          throw new Error('empty');
        }
      } catch {
        try {
          const raw = localStorage.getItem('ml_news_cache');
          if (raw) {
            const cached = JSON.parse(raw);
            setItems(cached.rows || cached || []);
          }
        } catch {}
      }
    })();
  }, []);

  useEffect(() => {
    if (!items.length) return;
    timerRef.current = window.setInterval(() => setIndex((i) => i + 1), 5000);
    return () => { if (timerRef.current) window.clearInterval(timerRef.current); };
  }, [items]);

  if (!items.length) return null;

  return (
    <Box sx={{ position: 'relative', overflow: 'hidden', px: { xs: 2, md: 0 } }}>

      {/* 右上角按钮 */}
      <Box sx={{ position: 'absolute', right: 8, top: 8, zIndex: 3, display: 'flex', gap: 1 }}>
        <Chip size="small" color="primary" variant="outlined" label="今日已更新" />
        <Tooltip title="换一换">
          <IconButton onClick={() => setIndex((i) => i + 3)} sx={{ bgcolor: 'white' }}>
            <Autorenew />
          </IconButton>
        </Tooltip>
      </Box>
      <IconButton onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} sx={{ position: 'absolute', left: 8, top: '40%', zIndex: 2, bgcolor: 'white' }}>
        <ChevronLeft />
      </IconButton>
      <IconButton onClick={() => setIndex((i) => (i + 1) % items.length)} sx={{ position: 'absolute', right: 8, top: '40%', zIndex: 2, bgcolor: 'white' }}>
        <ChevronRight />
      </IconButton>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' }, gap: 2 }}>
        {visible.map((n, idx) => {
          const bg = n.image
            ? `${gradients[(seed + idx) % gradients.length]}, url(${n.image}) center/cover`
            : gradients[(seed + idx) % gradients.length];
          return (
            <Card key={n.id} sx={{ height: 180, borderRadius: 3, boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
              background: n.image ? undefined : bg, overflow: 'hidden',
              '&:hover': { transform: 'translateY(-6px) rotateX(2deg) rotateY(-2deg)', transition: 'transform .25s ease' } }}>
              <CardActionArea href={n.url || '#'} target={n.url ? '_blank' : undefined} sx={{ height: '100%' }}>
                <Box sx={{ height: '100%', background: n.image ? `linear-gradient(0deg, rgba(0,0,0,.35), rgba(0,0,0,.1)), url(${n.image}) center/cover` : bg, p: 2, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                  <Typography variant="subtitle2" color={n.image ? 'grey.100' : 'text.secondary'} sx={{ opacity: 0.9 }}>{n.createdAt ? new Date(n.createdAt).toLocaleDateString() : ''}</Typography>
                  <Typography variant="h6" sx={{ fontWeight: 700, color: n.image ? 'common.white' : 'text.primary', textShadow: n.image ? '0 2px 6px rgba(0,0,0,.35)' : 'none',
                    whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{n.title}</Typography>
                  {n.summary && <Typography variant="body2" color={n.image ? 'grey.100' : 'text.secondary'} sx={{ overflow: 'hidden', display: { xs: 'none', md: 'block' } }}>{n.summary}</Typography>}
                </Box>
              </CardActionArea>
            </Card>
          );
        })}
      </Box>
    </Box>
  );
};

export default NewsCarousel;


