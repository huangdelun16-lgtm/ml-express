import React, { useEffect, useMemo, useState } from 'react';
import { AppBar, Box, BottomNavigation, BottomNavigationAction, Toolbar, Typography, Paper, IconButton, TextField, Button, List, ListItem, ListItemText } from '@mui/material';
import { QrCodeScanner, LocalShipping, Inventory2, Search } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { getAdminSession } from '../utils/auth';
import AdminNavigation from '../components/AdminNavigation';
import { fetchWithRetry } from '../utils/backend';

const AdminMobile: React.FC = () => {
  const nav = useNavigate();
  const [tab, setTab] = useState(0);
  const [searchNo, setSearchNo] = useState('');
  const [result, setResult] = useState<any[]>([]);
  const user = getAdminSession();

  useEffect(() => {
    if (!user) { nav('/admin/login'); }
  }, [user, nav]);

  const actions = useMemo(() => ([
    { label: '查单', icon: <Search /> },
    { label: '扫码', icon: <QrCodeScanner /> },
    { label: '包裹', icon: <Inventory2 /> },
    { label: '运输', icon: <LocalShipping /> },
  ]), []);

  return (
    <Box sx={{ pb: 7 }}>
      <AdminNavigation title="移动管理后台" />

      {/* 查单 */}
      {tab === 0 && (
        <Box sx={{ p: 2 }}>
          <TextField fullWidth label="输入单号" value={searchNo} onChange={(e) => setSearchNo(e.target.value)} />
          <Button fullWidth variant="contained" sx={{ mt: 2 }} onClick={async () => {
            setResult([]);
            const qs = new URLSearchParams({ page: '1', pageSize: '20', search: searchNo });
            const r1 = await fetchWithRetry('/.netlify/functions/packages-manage?' + qs.toString(), { headers: user ? ({ 'x-ml-actor': user.username, 'x-ml-role': user.role } as any) : undefined });
            const j1 = await r1.json();
            setResult((j1.items || []).slice(0, 20));
          }}>查询</Button>
          <List dense>
            {result.map((p: any) => (
              <ListItem key={p.id} divider>
                <ListItemText
                  primary={`${p.trackingNumber || p.tracking_no} · ${p.status || ''}`}
                  secondary={`${p.sender || ''} → ${p.destination || p.receiver || ''}`}
                />
              </ListItem>
            ))}
          </List>
        </Box>
      )}

      {/* 扫码 */}
      {tab === 1 && (
        <Box sx={{ p: 2, textAlign: 'center', color: 'text.secondary' }}>扫码功能沿用“扫描录入”页面，请使用页头PC版进入后在手机中使用。</Box>
      )}

      {/* 包裹/运输 快捷入口 */}
      {tab === 2 && (
        <Box sx={{ p: 2 }}>
          <Button fullWidth variant="contained" sx={{ mb: 2 }} onClick={() => nav('/admin/inventory')}>打开包裹管理（移动端适配）</Button>
          <Button fullWidth variant="outlined" onClick={() => nav('/admin/finance')}>财务（仅会计/管理员可见）</Button>
        </Box>
      )}
      {tab === 3 && (
        <Box sx={{ p: 2 }}>
          <Button fullWidth variant="contained" onClick={() => nav('/admin/transport')}>打开跨境运输（移动端适配）</Button>
        </Box>
      )}

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0 }} elevation={3}>
        <BottomNavigation value={tab} onChange={(_, v) => setTab(v)} showLabels>
          {actions.map((a, i) => (
            <BottomNavigationAction key={i} label={a.label} icon={a.icon} />
          ))}
        </BottomNavigation>
      </Paper>
    </Box>
  );
};

export default AdminMobile;


