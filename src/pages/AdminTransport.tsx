import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AppBar, Toolbar, Typography, Box, Container, Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField, IconButton, Chip, Pagination, CircularProgress, Autocomplete, Skeleton, Card, Divider, ButtonGroup, Checkbox } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import SwipeableItem from '../components/SwipeableItem';
import ActiveFilterChips from '../components/ActiveFilterChips';
import FilterDrawer from '../components/FilterDrawer';
import { LocalShipping, Person, Edit, Delete, Add } from '@mui/icons-material';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingButton from '../components/LoadingButton';
import { useNavigate, useLocation } from 'react-router-dom';
import { getAdminSession } from '../utils/auth';
import AdminNavigation from '../components/AdminNavigation';
import { fetchWithRetry } from '../utils/backend';

type ShipmentItem = {
  id: string;
  freightNo: string;
  vehicleNo?: string | null;
  departDate?: string | null; // YYYY-MM-DD
  arrivalDate?: string | null; // 到货日期 YYYY-MM-DD
  destination?: string | null;
  note?: string | null;
  createdBy?: string;
  packageCount: number;
};

const AdminTransport: React.FC = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [user, setUser] = useState<{ username: string; role: string; loginTime: string } | null>(null);
  const [items, setItems] = useState<ShipmentItem[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [draft, setDraft] = useState<ShipmentItem | null>(null);
  const [openAddPkgs, setOpenAddPkgs] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingPkgs, setAddingPkgs] = useState(false);
  const [availablePackages, setAvailablePackages] = useState<any[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const [loadingPackages, setLoadingPackages] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // 运单历史联想
  const [histFreight, setHistFreight] = useState<string[]>([]);
  const [histVehicle, setHistVehicle] = useState<string[]>([]);
  // 查看某运单下的包裹
  const [openPkgList, setOpenPkgList] = useState(false);
  const [pkgLoading, setPkgLoading] = useState(false);
  const [pkgShipmentTitle, setPkgShipmentTitle] = useState('');
  const [pkgItems, setPkgItems] = useState<Array<{ tracking_no: string; sender?: string; receiver?: string }>>([]);
  const [pkgShipmentId, setPkgShipmentId] = useState<string>('');
  const [pkgAddInput, setPkgAddInput] = useState('');
  const [pkgFilter, setPkgFilter] = useState('');
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  // 异常核对（运输中但未装车）
  const [diagOpen, setDiagOpen] = useState(false);
  const [diagLoading, setDiagLoading] = useState(false);
  const [diagMissing, setDiagMissing] = useState<string[]>([]);
  const [diagFreightNo, setDiagFreightNo] = useState('');
  const [diagBusy, setDiagBusy] = useState(false);
  // 中转相关
  const [transitShipment, setTransitShipment] = useState<ShipmentItem | null>(null);
  const [transitLocation, setTransitLocation] = useState('');
  const [nextFreightNo, setNextFreightNo] = useState('');
  const [transitNote, setTransitNote] = useState('');
  const [transitOpen, setTransitOpen] = useState(false);
  const [transitBusy, setTransitBusy] = useState(false);

  const filteredPkgItems = useMemo(() => {
    const keyword = (pkgFilter || '').trim().toLowerCase();
    if (!keyword) return pkgItems;
    return pkgItems.filter(p => (p.tracking_no || '').toLowerCase().includes(keyword));
  }, [pkgItems, pkgFilter]);

  const copyAllTracking = async () => {
    try {
      const text = filteredPkgItems.map(p => p.tracking_no).join('\n');
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const reloadShipmentsList = async () => {
    if (!user) return;
    setLoading(true);
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
    const r2 = await fetchWithRetry('/.netlify/functions/transport-manage?' + qs.toString(), { headers: { 'x-ml-actor': user.username } });
    const j2 = await r2.json();
    console.log('刷新运单列表响应:', j2);
    
    // 验证目的地数据完整性
    if (j2.items && Array.isArray(j2.items)) {
      j2.items.forEach((item: any, index: number) => {
        if (item.freightNo && !item.destination) {
          console.warn(`运单 ${item.freightNo} 缺少目的地信息:`, item);
        }
        if (item.destination === null || item.destination === undefined) {
          console.log(`运单 ${item.freightNo} 目的地为空:`, { destination: item.destination, type: typeof item.destination });
        }
      });
    }
    
    setItems(j2.items || []);
    setTotal(j2.total || 0);
    setLoading(false);
  };

  useEffect(() => {
    const sess = getAdminSession();
    if (!sess) { navigate('/admin/login'); return; }
    const u = { username: sess.username, role: sess.role, loginTime: sess.loginTime };
    setUser(u);
    try {
      setHistFreight(JSON.parse(localStorage.getItem('ml_hist_freight') || '[]'));
      setHistVehicle(JSON.parse(localStorage.getItem('ml_hist_vehicle') || '[]'));
    } catch {}
  }, [navigate]);

  const queryClient = useQueryClient();
  const listKey = ['shipments', { page, pageSize, search }];
  const { data: shipData, isFetching } = useQuery({
    queryKey: listKey,
    enabled: !!user,
    queryFn: async () => {
      const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
      const r = await fetchWithRetry('/.netlify/functions/transport-manage?' + qs.toString(), { headers: user ? ({ 'x-ml-actor': user.username } as any) : undefined });
      return r.json();
    },
    staleTime: 60_000,
  });

  useEffect(() => {
    setLoading(isFetching);
    if (shipData) {
      console.log('React Query数据更新:', shipData);
      
      // 验证目的地数据完整性
      if (shipData.items && Array.isArray(shipData.items)) {
        shipData.items.forEach((item: any, index: number) => {
          if (item.freightNo && !item.destination) {
            console.warn(`运单 ${item.freightNo} 缺少目的地信息:`, item);
          }
          if (item.destination === null || item.destination === undefined) {
            console.log(`运单 ${item.freightNo} 目的地为空:`, { destination: item.destination, type: typeof item.destination });
          }
        });
      }
      
      setItems(shipData.items || []);
      setTotal(shipData.total || 0);
    }
  }, [isFetching, shipData]);

  useEffect(() => {
    const next = page + 1;
    const qs = new URLSearchParams({ page: String(next), pageSize: String(pageSize), search });
    queryClient.prefetchQuery({
      queryKey: ['shipments', { page: next, pageSize, search }],
      queryFn: async () => { const r = await fetchWithRetry('/.netlify/functions/transport-manage?' + qs.toString(), { headers: user ? ({ 'x-ml-actor': user.username } as any) : undefined }); return r.json(); },
      staleTime: 60_000,
      enabled: !!user,
    } as any);
  }, [queryClient, page, pageSize, search, user]);

  const totalPages = Math.max(1, Math.ceil((total || 0) / pageSize));

  const canManage = !!(user && ['manager','master'].includes(user.role));

  const createEmpty = (): ShipmentItem => ({ id: '', freightNo: '', vehicleNo: '', departDate: new Date().toISOString().slice(0,10), destination: '', note: '', createdBy: user?.username, packageCount: 0 });

  const saveShipment = async () => {
    if (!draft || !user) return;
    if (!draft.freightNo.trim()) return;
    const isNew = !draft.id;
    setSaving(true);
    
    console.log('保存运单数据:', { 
      isNew, 
      freightNo: draft.freightNo, 
      destination: draft.destination,
      destinationType: typeof draft.destination,
      destinationLength: draft.destination?.length 
    });
    
    if (isNew) {
      const payload = { op: 'create', freightNo: draft.freightNo, vehicleNo: draft.vehicleNo, departDate: draft.departDate, arrivalDate: draft.arrivalDate, note: draft.note, destination: draft.destination };
      console.log('创建运单请求载荷:', payload);
      const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify(payload) });
      if (!r.ok) { 
        try { 
          const j = await r.json(); 
          console.error('创建运单失败:', j);
          alert(j.message || '创建失败'); 
        } catch {} 
        setSaving(false); 
        return; 
      }
      // 验证创建结果
      try {
        const result = await r.json();
        console.log('创建运单响应:', result);
        if (result.item && result.item.destination !== draft.destination) {
          console.warn('目的地保存不一致:', { expected: draft.destination, actual: result.item.destination });
        }
      } catch {}
    } else {
      const changes = { freightNo: draft.freightNo, vehicleNo: draft.vehicleNo, departDate: draft.departDate, arrivalDate: draft.arrivalDate, note: draft.note, destination: draft.destination };
      console.log('更新运单请求:', { shipmentId: draft.id, changes });
      const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ shipmentId: draft.id, changes }) });
      if (!r.ok) { 
        try { 
          const j = await r.json(); 
          console.error('更新运单失败:', j);
          alert(j.message || '保存失败'); 
        } catch {} 
        setSaving(false); 
        return; 
      }
      // 验证更新结果
      try {
        const result = await r.json();
        console.log('更新运单响应:', result);
      } catch {}
    }
    const qs = new URLSearchParams({ page: String(page), pageSize: String(pageSize), search });
    const r2 = await fetchWithRetry('/.netlify/functions/transport-manage?' + qs.toString(), { headers: { 'x-ml-actor': user.username } });
    const j2 = await r2.json();
    setItems(j2.items || []);
    setTotal(j2.total || 0);
    // 写入历史
    try {
      if (draft?.freightNo) {
        const next = [draft.freightNo, ...histFreight.filter(x=>x!==draft.freightNo)].slice(0, 30);
        setHistFreight(next); localStorage.setItem('ml_hist_freight', JSON.stringify(next));
      }
      if (draft?.vehicleNo) {
        const next = [draft.vehicleNo, ...histVehicle.filter(x=>x!==draft.vehicleNo)].slice(0, 30);
        setHistVehicle(next); localStorage.setItem('ml_hist_vehicle', JSON.stringify(next));
      }
    } catch {}
    setOpenEdit(false);
    setDraft(null);
    setSaving(false);
  };

  // 加载可用的跨境包裹（已入库但未装车、未签收）
  const loadAvailablePackages = async () => {
    if (!user) return;
    setLoadingPackages(true);
    try {
      // 获取已入库的跨境包裹
      const r = await fetchWithRetry('/.netlify/functions/packages-manage?biz=cross&status=已入库&pageSize=100', { 
        headers: { 'x-ml-actor': user.username, 'x-ml-role': user.role } 
      });
      if (r.ok) {
        const data = await r.json();
        setAvailablePackages(data.items || []);
      }
    } catch (error) {
      console.error('加载可用包裹失败:', error);
    } finally {
      setLoadingPackages(false);
    }
  };

  const addPackages = async () => {
    if (!draft || !user) return;
    if (selectedPackages.length === 0) return;
    setAddingPkgs(true);
    const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ op: 'addPackages', shipmentId: draft.id, trackingNumbers: selectedPackages }) });
    if (!r.ok) { try { const j = await r.json(); alert(j.message || '添加失败'); } catch {} setAddingPkgs(false); return; }
    setOpenAddPkgs(false);
    setSelectedPackages([]);
    setAvailablePackages([]);
    setAddingPkgs(false);
    // 刷新运单列表
    await reloadShipmentsList();
  };

  const viewPackagesOfShipment = async (shipment: ShipmentItem) => {
    if (!user) return;
    setPkgShipmentTitle(`${shipment.freightNo}（共 ${shipment.packageCount} 件）`);
    setPkgShipmentId(shipment.id);
    setPkgItems([]);
    setOpenPkgList(true);
    setPkgLoading(true);
    try {
      const qs = new URLSearchParams({ shipmentId: shipment.id });
      const r = await fetchWithRetry('/.netlify/functions/transport-manage?' + qs.toString(), { headers: { 'x-ml-actor': user.username } });
      const j = await r.json();
      const list = Array.isArray(j.packages) ? j.packages : [];
      let mapped = list.map((p: any) => ({
        tracking_no: p.tracking_no || p.trackingNo || p.tracking_number || '',
        sender: p.sender,
        receiver: p.receiver,
      })).filter((p: any) => p.tracking_no);
      if (!mapped.length && Array.isArray(j.trackingNumbers)) {
        mapped = j.trackingNumbers.map((t: any) => ({ tracking_no: String(t || '') })).filter((p: any) => p.tracking_no);
      }
      setPkgItems(mapped);
    } catch {}
    setPkgLoading(false);
  };

  const notifyArrival = async (shipment: ShipmentItem) => {
    if (!user) return;
    if (!(window as any).confirm('确定标记该运单到货并通知财务置为"待签收"？')) return;
    try {
      const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ op: 'arrive', shipmentId: shipment.id }) });
      if (!r.ok) { 
        try { 
          const j = await r.json(); 
          alert(`到货通知失败: ${j.message || '未知错误'}`); 
        } catch { 
          alert(`到货通知失败: HTTP ${r.status}`); 
        } 
        return; 
      }
      
      // 解析成功响应
      try {
        const result = await r.json();
        const message = result.message || `到货已通知，相关包裹和财务记录已置为"待签收"。`;
        alert(message);
      } catch {
        alert('到货已通知，相关包裹和财务记录已置为"待签收"。');
      }
      
      // 刷新财务页签缓存：触发一次查询
      try { await fetchWithRetry('/.netlify/functions/finances-manage?status=' + encodeURIComponent('待签收')); } catch {}
      
      // 🔄 刷新当前运单列表以反映状态变化
      await reloadShipmentsList();
      
    } catch (error) {
      console.error('到货通知异常:', error);
      alert(`到货通知失败: ${error.message || '网络错误'}`);
    }
  };

  const openTransitDialog = (shipment: ShipmentItem) => {
    setTransitShipment(shipment);
    setTransitLocation('');
    setNextFreightNo('');
    setTransitNote('');
    setTransitOpen(true);
  };

  const confirmTransit = async () => {
    if (!user || !transitShipment) return;
    const location = transitLocation.trim();
    if (!location) { alert('请输入中转地点'); return; }
    
    setTransitBusy(true);
    try {
      const r = await fetchWithRetry('/.netlify/functions/transport-manage', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, 
        body: JSON.stringify({ 
          op: 'transit', 
          shipmentId: transitShipment.id,
          transitLocation: location,
          nextFreightNo: nextFreightNo.trim() || null,
          note: transitNote.trim() || null
        }) 
      });
      
      if (!r.ok) { 
        try { const j = await r.json(); alert(j.message || '中转操作失败'); } catch {} 
        return; 
      }
      const resp = await r.json().catch(()=>({}));
      const newId = resp?.newShipmentId || null;
      if (newId) {
        alert('中转完成，已生成下一程运单');
      } else {
        alert('中转信息已记录');
      }
      setTransitOpen(false);
      setTransitShipment(null);
      // 刷新列表
      await reloadShipmentsList();
    } catch {
      alert('中转操作失败');
    } finally {
      setTransitBusy(false);
    }
  };

  const addPackagesInModal = async () => {
    if (!user || !pkgShipmentId) return;
    const lines = pkgAddInput.split(/\s|,|;|\n/).map(s => s.trim()).filter(Boolean);
    if (!lines.length) return;
    const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ op: 'addPackages', shipmentId: pkgShipmentId, trackingNumbers: lines }) });
    if (!r.ok) { try { const j = await r.json(); alert(j.message || '添加失败'); } catch {} return; }
    // 刷新弹窗与列表数量
    setPkgItems(prev => [...prev, ...lines.map(t => ({ tracking_no: t }))]);
    setItems(prev => prev.map(i => i.id === pkgShipmentId ? { ...i, packageCount: i.packageCount + lines.length } : i));
    setPkgAddInput('');
  };

  const removePackageFromShipment = async (trackingNo: string) => {
    if (!user || !pkgShipmentId) return;
    const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ shipmentId: pkgShipmentId, trackingNumber: trackingNo }) });
    if (!r.ok) { try { const j = await r.json(); alert(j.message || '移除失败'); } catch {} return; }
    setPkgItems(prev => prev.filter(p => p.tracking_no !== trackingNo));
    setItems(prev => prev.map(i => i.id === pkgShipmentId ? { ...i, packageCount: Math.max(0, i.packageCount - 1) } : i));
  };

  const askRemoveShipment = (id: string) => { setConfirmDeleteId(id); };
  const doRemoveShipment = async () => {
    if (!user || !confirmDeleteId) return;
    const r = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ shipmentId: confirmDeleteId }) });
    if (!r.ok) { try { const j = await r.json(); alert(j.message || '删除失败'); } catch {} return; }
    setItems(prev => prev.filter(i => i.id !== confirmDeleteId));
    setConfirmDeleteId(null);
  };

  if (!user) return null;
  const role = (user.role || '').trim().toLowerCase();

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <AdminNavigation title="跨境运输" />

      <Container maxWidth="lg" sx={{ py: 4, pb: { xs: 10, md: 4 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>跨境运输</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {!isMobile && (
              <>
                <TextField size="small" placeholder="搜索货运号" value={search} onChange={(e)=>setSearch(e.target.value)} />
                <Button variant="outlined" onClick={async ()=>{
                  if (!user) return;
                  setDiagOpen(true);
                  setDiagLoading(true);
                  try {
                    const r = await fetchWithRetry('/.netlify/functions/transport-consistency', { headers: { 'x-ml-actor': user.username } });
                    const j = await r.json();
                    setDiagMissing(Array.isArray(j.missing) ? j.missing : []);
                  } catch {
                    setDiagMissing([]);
                    alert('加载异常列表失败');
                  } finally {
                    setDiagLoading(false);
                  }
                }}>异常核对</Button>
                {canManage && <Button variant="contained" onClick={()=>{ setDraft(createEmpty()); setOpenEdit(true); }}>新建运单</Button>}
              </>
            )}
            {isMobile && (
              <Button variant="outlined" onClick={()=> setMobileFilterOpen(true)}>筛选</Button>
            )}
          </Box>
        </Box>

        <ActiveFilterChips
          items={[...(search.trim() ? [{ key: 'search', label: `搜索: ${search.trim()}`, onDelete: ()=>setSearch('') }] : [])]}
          onClearAll={()=>{ setSearch(''); }}
        />

        {isMobile ? (
          <Box>
            {loading && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} variant="rounded" height={88} />))}
              </Box>
            )}
            {!loading && items.length === 0 && (
              <Paper sx={{ p: 3, textAlign: 'center', color: 'text.secondary' }}>暂无运单</Paper>
            )}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {items.map(s => (
                <SwipeableItem key={s.id} onLeftAction={()=>askRemoveShipment(s.id)} leftLabel="删除" leftColor="error" onRightAction={()=>{ setDraft(s); setOpenEdit(true); }} rightLabel="编辑" rightColor="primary" height={96}>
                <Card sx={{ p: 1.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography sx={{ fontWeight: 700 }}>{s.freightNo}</Typography>
                    <Chip size="small" label={`${s.packageCount} 件`} color={s.packageCount>0 ? 'primary' : 'default'} onClick={()=>viewPackagesOfShipment(s)} clickable={s.packageCount>0} />
                  </Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: .5 }}>车牌 {s.vehicleNo || '—'} · 发车 {s.departDate || '—'}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="body2" color="text.secondary">{s.note || ' '}</Typography>
                    <Box sx={{ display: 'flex', gap: .5 }}>
                      <Button size="small" onClick={()=>{ setDraft(s); setOpenEdit(true); }}>编辑</Button>
                      <Button size="small" onClick={()=>{ setDraft(s); setOpenAddPkgs(true); }}>加包裹</Button>
                      <Button size="small" color="warning" onClick={()=>openTransitDialog(s)}>中转</Button>
                      <Button size="small" color="success" onClick={()=>notifyArrival(s)}>到货</Button>
                      <IconButton size="small" color="error" onClick={()=>askRemoveShipment(s.id)}><Delete fontSize="small" /></IconButton>
                    </Box>
                  </Box>
                </Card>
                </SwipeableItem>
              ))}
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p)=>setPage(p)} size="small" color="primary" />
            </Box>
          </Box>
        ) : (
          <Paper>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: 'grey.50' }}>
                    <TableCell>货运号</TableCell>
                    <TableCell>车牌</TableCell>
                    <TableCell>发车日期</TableCell>
                    <TableCell>到货日期</TableCell>
                    <TableCell>包裹数</TableCell>
                    <TableCell>备注</TableCell>
                    <TableCell align="right">操作</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {items.map(s => (
                    <TableRow key={s.id} hover>
                      <TableCell><Chip size="small" label={s.freightNo} /></TableCell>
                      <TableCell>{s.vehicleNo || '—'}</TableCell>
                      <TableCell>{s.departDate || '—'}</TableCell>
                      <TableCell>{s.arrivalDate || '—'}</TableCell>
                      <TableCell>
                        <Chip size="small" color={s.packageCount > 0 ? 'primary' : undefined} variant={s.packageCount > 0 ? 'outlined' : undefined} label={s.packageCount} onClick={()=>viewPackagesOfShipment(s)} clickable={s.packageCount > 0} />
                      </TableCell>
                      <TableCell>{s.note || ''}</TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={()=>{ setDraft(s); setOpenEdit(true); }}>编辑</Button>
                        <Button size="small" onClick={()=>{ setDraft(s); setOpenAddPkgs(true); loadAvailablePackages(); }}>添加包裹</Button>
                        <Button size="small" color="warning" onClick={()=>openTransitDialog(s)}>中转</Button>
                        <Button size="small" color="success" onClick={()=>notifyArrival(s)}>到货通知</Button>
                        <IconButton size="small" color="error" onClick={()=>askRemoveShipment(s.id)}><Delete fontSize="small" /></IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 2 }}>
              <Pagination count={totalPages} page={page} onChange={(_, p)=>setPage(p)} size="small" color="primary" />
            </Box>
          </Paper>
        )}

        {/* 新建/编辑运单 */}
        <Dialog open={openEdit} onClose={()=>{ setOpenEdit(false); setDraft(null); }} maxWidth="sm" fullWidth>
          <DialogTitle>{draft?.id ? '编辑运单' : '新建运单'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <Autocomplete freeSolo options={histFreight}
                  inputValue={draft?.freightNo || ''}
                  onInputChange={(_, v)=>draft && setDraft({ ...draft, freightNo: v })}
                  renderInput={(params)=>(<TextField {...params} fullWidth label="货运号" />)}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete freeSolo options={histVehicle}
                  inputValue={draft?.vehicleNo || ''}
                  onInputChange={(_, v)=>draft && setDraft({ ...draft, vehicleNo: v })}
                  renderInput={(params)=>(<TextField {...params} fullWidth label="车牌" />)}
                />
              </Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="发车日期" value={draft?.departDate || ''} onChange={(e)=>draft && setDraft({ ...draft, departDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12} sm={6}><TextField fullWidth type="date" label="到货日期" value={draft?.arrivalDate || ''} onChange={(e)=>draft && setDraft({ ...draft, arrivalDate: e.target.value })} InputLabelProps={{ shrink: true }} /></Grid>
              <Grid item xs={12}><TextField fullWidth label="备注" value={draft?.note || ''} onChange={(e)=>draft && setDraft({ ...draft, note: e.target.value })} /></Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>{ if (!saving) { setOpenEdit(false); setDraft(null); } }} disabled={saving}>取消</Button>
            {canManage && (
              <LoadingButton variant="contained" onClick={saveShipment} loading={saving}>保存</LoadingButton>
            )}
          </DialogActions>
        </Dialog>

        {/* 添加包裹 */}
        <Dialog open={openAddPkgs} onClose={()=>{ setOpenAddPkgs(false); setSelectedPackages([]); setAvailablePackages([]); }} maxWidth="md" fullWidth>
          <DialogTitle>添加包裹至运单 - {draft?.freightNo}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              选择要添加到运单的跨境包裹（只显示已入库状态的包裹）
            </Typography>
            {loadingPackages ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress />
              </Box>
            ) : availablePackages.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', p: 3 }}>
                暂无可添加的包裹
              </Typography>
            ) : (
              <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell padding="checkbox">
                        <Checkbox
                          indeterminate={selectedPackages.length > 0 && selectedPackages.length < availablePackages.length}
                          checked={availablePackages.length > 0 && selectedPackages.length === availablePackages.length}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedPackages(availablePackages.map(p => p.tracking_no || p.trackingNumber));
                            } else {
                              setSelectedPackages([]);
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>运单号</TableCell>
                      <TableCell>收件人</TableCell>
                      <TableCell>目的地</TableCell>
                      <TableCell>件数</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {availablePackages.map((pkg) => (
                      <TableRow key={pkg.tracking_no} hover>
                        <TableCell padding="checkbox">
                          <Checkbox
                            checked={selectedPackages.includes(pkg.tracking_no || pkg.trackingNumber)}
                            onChange={(e) => {
                              const trackingId = pkg.tracking_no || pkg.trackingNumber;
                              if (e.target.checked) {
                                setSelectedPackages([...selectedPackages, trackingId]);
                              } else {
                                setSelectedPackages(selectedPackages.filter(id => id !== trackingId));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell>{pkg.tracking_no || pkg.trackingNumber}</TableCell>
                        <TableCell>{pkg.receiver || '—'}</TableCell>
                        <TableCell>{pkg.destination || '—'}</TableCell>
                        <TableCell>{pkg.quantity || 1}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
            {selectedPackages.length > 0 && (
              <Typography variant="body2" color="primary" sx={{ mt: 2 }}>
                已选择 {selectedPackages.length} 个包裹
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={()=>{ setOpenAddPkgs(false); setSelectedPackages([]); setAvailablePackages([]); }} disabled={addingPkgs}>取消</Button>
            {canManage && (
              <LoadingButton 
                variant="contained" 
                onClick={addPackages} 
                loading={addingPkgs}
                disabled={selectedPackages.length === 0}
              >
                添加 ({selectedPackages.length})
              </LoadingButton>
            )}
          </DialogActions>
        </Dialog>
      </Container>

      <FilterDrawer
        open={mobileFilterOpen}
        onClose={()=>setMobileFilterOpen(false)}
        onReset={()=>{ setSearch(''); }}
        onDone={()=>setMobileFilterOpen(false)}
      >
        <TextField fullWidth size="small" placeholder="搜索货运号" value={search} onChange={(e)=>setSearch(e.target.value)} />
      </FilterDrawer>

      {/* 移动端底部主操作条 */}
      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, display: { xs: 'flex', md: 'none' }, gap: 1, p: 1, borderTopLeftRadius: 12, borderTopRightRadius: 12 }} elevation={10}>
        <Button fullWidth variant="outlined" onClick={()=>setMobileFilterOpen(true)}>筛选</Button>
        <Button fullWidth variant="outlined" onClick={()=>{ setSearch(''); }}>清空</Button>
        {canManage && <Button fullWidth variant="contained" onClick={()=>{ setDraft(createEmpty()); setOpenEdit(true); }}>新建</Button>}
      </Paper>
      {/* 运单包裹列表 */}
      <Dialog open={openPkgList} onClose={()=>setOpenPkgList(false)} maxWidth="xs" PaperProps={{ sx: { width: 320 } }}>
        <DialogTitle>运单包裹 - {pkgShipmentTitle}</DialogTitle>
        <DialogContent>
          {pkgLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              {/* 筛选输入 */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <TextField size="small" fullWidth placeholder="筛选单号" value={pkgFilter} onChange={(e)=>setPkgFilter(e.target.value)} />
                {pkgFilter && <Button size="small" onClick={()=>setPkgFilter('')}>清空</Button>}
              </Box>

              {filteredPkgItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>暂无包裹</Typography>
              ) : (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 260, overflowY: 'auto', pr: 0.5 }}>
                  {filteredPkgItems.map((p, i) => (
                    <Chip key={p.tracking_no + i} size="small" label={p.tracking_no} />
                  ))}
                </Box>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          {filteredPkgItems.length > 0 && <Button onClick={copyAllTracking}>复制筛选结果</Button>}
          <Button onClick={()=>setOpenPkgList(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 运输异常核对 */}
      <Dialog open={diagOpen} onClose={()=>!diagBusy && setDiagOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>运输异常核对</DialogTitle>
        <DialogContent>
          {diagLoading ? (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={24} />
            </Box>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary">以下为“运输中”但未加入任何运单的单号：</Typography>
              {diagMissing.length === 0 ? (
                <Paper sx={{ p: 2, textAlign: 'center', color: 'text.secondary', mt: 1 }}>暂无异常</Paper>
              ) : (
                <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 1, maxHeight: 240, overflowY: 'auto' }}>
                  {diagMissing.map((t, i) => (<Chip key={t + i} size="small" label={t} />))}
                </Box>
              )}
              <Divider sx={{ my: 2 }} />
              <Typography variant="subtitle2" sx={{ mb: 1 }}>批量加入运单</Typography>
              <TextField fullWidth size="small" label="货运号" placeholder="例如：ML-2024-0001" value={diagFreightNo} onChange={(e)=>setDiagFreightNo(e.target.value)} />
              <Typography variant="caption" color="text.secondary">将上方全部异常单号加入该运单，并自动把状态置为“运输中”。</Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button disabled={diagBusy} onClick={()=>setDiagOpen(false)}>关闭</Button>
          <Button variant="contained" disabled={diagBusy || diagMissing.length===0 || !diagFreightNo.trim()} onClick={async ()=>{
            if (!user) return; const freightNo = diagFreightNo.trim(); if (!freightNo) return;
            setDiagBusy(true);
            try {
              // 查找或创建运单
              let shipmentId: string | null = null;
              try {
                const qs = new URLSearchParams({ page: '1', pageSize: '1', search: freightNo });
                const r = await fetchWithRetry('/.netlify/functions/transport-manage?' + qs.toString(), { headers: { 'x-ml-actor': user.username } });
                const j = await r.json();
                const hit = (j.items || []).find((s: any) => String(s.freightNo) === freightNo);
                if (hit) shipmentId = hit.id;
              } catch {}
              if (!shipmentId) {
                const rc = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ op: 'create', freightNo }) });
                const jc = await rc.json().catch(()=>({}));
                if (!rc.ok && !jc?.item?.id) throw new Error(jc?.message || '创建运单失败');
                shipmentId = jc?.item?.id || null;
              }
              if (!shipmentId) throw new Error('无法获取运单ID');
              // 加入全部异常单号
              const arr = Array.from(new Set(diagMissing.filter(Boolean)));
              if (arr.length) {
                const rb = await fetchWithRetry('/.netlify/functions/transport-manage', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': user.username }, body: JSON.stringify({ op: 'addPackages', shipmentId, trackingNumbers: arr }) });
                if (!rb.ok) { const jb = await rb.json().catch(()=>({})); throw new Error(jb?.message || '加入失败'); }
              }
              alert('已将异常单号加入运单');
              setDiagOpen(false);
              setDiagFreightNo('');
              setDiagMissing([]);
              await reloadShipmentsList();
            } catch (e: any) {
              alert(e?.message || '批量加入失败');
            } finally {
              setDiagBusy(false);
            }
          }}>加入该运单</Button>
        </DialogActions>
      </Dialog>

      {/* 中转弹窗 */}
      <Dialog open={transitOpen} onClose={()=>!transitBusy && setTransitOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>中转操作 - {transitShipment?.freightNo}</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField 
              fullWidth 
              label="中转地点 *" 
              placeholder="例如：曼德勒、仰光等"
              value={transitLocation}
              onChange={(e)=>setTransitLocation(e.target.value)}
              required
            />
            <TextField 
              fullWidth 
              label="下一程货运号" 
              placeholder="可选：下一程的货运号"
              value={nextFreightNo}
              onChange={(e)=>setNextFreightNo(e.target.value)}
            />
            <TextField 
              fullWidth 
              label="备注" 
              placeholder="中转相关备注信息"
              value={transitNote}
              onChange={(e)=>setTransitNote(e.target.value)}
              multiline
              minRows={2}
            />
            <Typography variant="body2" color="text.secondary">
              中转后包裹状态保持"运输中"，财务状态不变。只有到货通知后才会变为"待签收"。
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button disabled={transitBusy} onClick={()=>setTransitOpen(false)}>取消</Button>
          <LoadingButton variant="contained" disabled={transitBusy} onClick={confirmTransit} loading={transitBusy}>
            确认中转
          </LoadingButton>
        </DialogActions>
      </Dialog>

      {/* 删除确认 */}
      <ConfirmDialog
        open={Boolean(confirmDeleteId)}
        title="确认删除"
        content="确定删除该运单及其关联包裹关系吗？此操作不可恢复。"
        confirmText="删除"
        confirmColor="error"
        onClose={()=>setConfirmDeleteId(null)}
        onConfirm={doRemoveShipment}
      />
    </Box>
  );
};

export default AdminTransport;


