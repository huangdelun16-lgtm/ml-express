import React, { useEffect, useState } from 'react';
import { AppBar, Toolbar, Typography, Box, Container, Button, Table, TableHead, TableRow, TableCell, TableBody, TableContainer, Paper, Chip, Dialog, DialogTitle, DialogContent, DialogActions, Grid, TextField } from '@mui/material';
import { LocalShipping, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface User { username: string; role: string; loginTime: string }
type InventoryItem = { id: string; name: string; sku: string; unit: string; quantity: number; minStock: number; note?: string };

const AdminInventory: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [openInvDialog, setOpenInvDialog] = useState(false);
  const [newItem, setNewItem] = useState<InventoryItem>({ id: '', name: '', sku: '', unit: '件', quantity: 0, minStock: 0, note: '' });

  useEffect(() => {
    const raw = localStorage.getItem('adminUser');
    if (!raw) { navigate('/admin/login'); return; }
    try {
      const u = JSON.parse(raw);
      setUser(u);
      if (!['accountant','manager','master'].includes(u.role)) { navigate('/admin/dashboard'); return; }
      const ri = localStorage.getItem('inventory');
      setInventory(ri ? JSON.parse(ri) : []);
    } catch { navigate('/admin/login'); }
  }, [navigate]);

  const adjustStock = (id: string, delta: number) => {
    const updated = inventory.map(it => it.id === id ? { ...it, quantity: Math.max(0, it.quantity + delta) } : it);
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
  };

  const handleSaveItem = () => {
    if (!newItem.name.trim()) return;
    const entry = { ...newItem, id: Date.now().toString() };
    const updated = [entry, ...inventory];
    setInventory(updated);
    localStorage.setItem('inventory', JSON.stringify(updated));
    setOpenInvDialog(false);
    setNewItem({ id: '', name: '', sku: '', unit: '件', quantity: 0, minStock: 0, note: '' });
  };

  if (!user) return null;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <AppBar position="static" sx={{ backgroundColor: 'white', color: 'text.primary' }}>
        <Toolbar>
          <LocalShipping sx={{ color: 'primary.main', mr: 2 }} />
          <Typography variant="h6" component="div" sx={{ color: 'primary.main', fontWeight: 600 }}>
            MARKETLINK EXPRESS 管理后台
          </Typography>
          <Box sx={{ flexGrow: 1 }} />
          <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
            <Button size="small" onClick={() => navigate('/admin/dashboard')}>包裹管理</Button>
            <Button size="small" onClick={() => navigate('/admin/finance')}>财务系统</Button>
            <Button size="small" variant="contained" onClick={() => navigate('/admin/inventory')}>库存管理</Button>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
            <Typography variant="body2" color="text.secondary">欢迎，{user.username} ({user.role})</Typography>
            <Person />
          </Box>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>库存管理</Typography>
          <Button variant="contained" onClick={() => setOpenInvDialog(true)}>新增物品</Button>
        </Box>
        <Paper>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: 'grey.50' }}>
                  <TableCell>名称</TableCell>
                  <TableCell>SKU</TableCell>
                  <TableCell>单位</TableCell>
                  <TableCell>当前库存</TableCell>
                  <TableCell>安全库存</TableCell>
                  <TableCell>备注</TableCell>
                  <TableCell>操作</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {inventory.map(item => (
                  <TableRow key={item.id} hover>
                    <TableCell>{item.name}</TableCell>
                    <TableCell>{item.sku}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell>
                      <Chip label={item.quantity} color={item.quantity <= item.minStock ? 'warning' : 'default'} size="small" />
                    </TableCell>
                    <TableCell>{item.minStock}</TableCell>
                    <TableCell>{item.note}</TableCell>
                    <TableCell>
                      <Button size="small" onClick={() => adjustStock(item.id, +1)}>入库+1</Button>
                      <Button size="small" color="error" onClick={() => adjustStock(item.id, -1)}>出库-1</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Container>

      <Dialog open={openInvDialog} onClose={() => setOpenInvDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>新增库存物品</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="名称" value={newItem.name} onChange={(e)=>setNewItem({ ...newItem, name: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="SKU" value={newItem.sku} onChange={(e)=>setNewItem({ ...newItem, sku: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="单位" value={newItem.unit} onChange={(e)=>setNewItem({ ...newItem, unit: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="安全库存" type="number" value={newItem.minStock} onChange={(e)=>setNewItem({ ...newItem, minStock: Number(e.target.value) })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="备注" value={newItem.note} onChange={(e)=>setNewItem({ ...newItem, note: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInvDialog(false)}>取消</Button>
          <Button variant="contained" onClick={handleSaveItem}>保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AdminInventory;


