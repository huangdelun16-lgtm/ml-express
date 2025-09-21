import React, { useEffect, useState } from 'react';
import {
	AppBar,
	Toolbar,
	Typography,
	Box,
	Container,
	Grid,
	Card,
	CardContent,
	Paper,
	Table,
	TableHead,
	TableRow,
	TableCell,
	TableContainer,
	TableBody,
	Button,
	TextField,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Chip,
	MenuItem,
	Pagination,
} from '@mui/material';
import { LocalShipping, Person } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

interface User {
	username: string;
	role: string;
	loginTime: string;
}

interface FinanceTxn {
	id: string;
	type: '收入' | '支出';
	category?: string;
	amount: number;
	note: string;
	date: string; // YYYY-MM-DD
}

const AdminFinance: React.FC = () => {
	const navigate = useNavigate();
	const [user, setUser] = useState<User | null>(null);
	const [finance, setFinance] = useState<FinanceTxn[]>([]);
	const [openFinanceDialog, setOpenFinanceDialog] = useState(false);
	const [newTxn, setNewTxn] = useState<FinanceTxn>({ id: '', type: '收入', category: '运费', amount: 0, note: '', date: new Date().toISOString().slice(0,10) });
	const [startDate, setStartDate] = useState<string>('');
	const [endDate, setEndDate] = useState<string>('');
	const [typeFilter, setTypeFilter] = useState<'all' | '收入' | '支出'>('all');
	const [financePage, setFinancePage] = useState<number>(1);
	const [financePageSize] = useState<number>(8);

	useEffect(() => {
		const raw = localStorage.getItem('adminUser');
		if (!raw) { navigate('/admin/login'); return; }
		try {
			const u = JSON.parse(raw);
			setUser(u);
			if (!['accountant','manager','master'].includes(u.role)) { navigate('/admin/dashboard'); return; }
			const rf = localStorage.getItem('finance');
			setFinance(rf ? JSON.parse(rf) : []);
		} catch { navigate('/admin/login'); }
	}, [navigate]);

	const inRange = (d: string) => {
		if (startDate && d < startDate) return false;
		if (endDate && d > endDate) return false;
		return true;
	};

	const filteredFinance = finance.filter(t => inRange(t.date) && (typeFilter === 'all' || t.type === typeFilter));
	const totalFinancePages = Math.max(1, Math.ceil(filteredFinance.length / financePageSize));
	const financePageData = filteredFinance.slice((financePage - 1) * financePageSize, financePage * financePageSize);

	useEffect(() => { setFinancePage(1); }, [startDate, endDate, typeFilter, finance.length]);

	const financeSummary = filteredFinance.reduce((acc, t) => {
		if (t.type === '收入') acc.income += t.amount; else acc.expense += t.amount;
		return acc;
	}, { income: 0, expense: 0 });

	const handleAddTxn = () => {
		if (!newTxn.amount || newTxn.amount <= 0) return;
		const entry = { ...newTxn, id: Date.now().toString() };
		const updated = [entry, ...finance];
		setFinance(updated);
		localStorage.setItem('finance', JSON.stringify(updated));
		setOpenFinanceDialog(false);
		setNewTxn({ id: '', type: '收入', category: '运费', amount: 0, note: '', date: new Date().toISOString().slice(0,10) });
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
					{/* 后台顶部导航 */}
					<Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
						<Button size="small" onClick={() => navigate('/admin/dashboard')}>包裹管理</Button>
						<Button size="small" variant="contained" onClick={() => navigate('/admin/finance')}>财务系统</Button>
						<Button size="small" onClick={() => navigate('/admin/inventory')}>库存管理</Button>
					</Box>
					{/* 财务分页放在右侧头部 */}
					<Pagination count={totalFinancePages} page={financePage} onChange={(_, p)=>setFinancePage(p)} size="small" color="primary" />
					<Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
						<Typography variant="body2" color="text.secondary">欢迎，{user.username} ({user.role})</Typography>
						<Person />
					</Box>
				</Toolbar>
			</AppBar>

			<Container maxWidth="lg" sx={{ py: 4 }}>
				<Grid container spacing={3} sx={{ mb: 2 }}>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="body2" color="text.secondary">总收入</Typography>
								<Typography variant="h5" sx={{ fontWeight: 700, color: 'success.main' }}>{financeSummary.income.toLocaleString()} 缅币</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="body2" color="text.secondary">总支出</Typography>
								<Typography variant="h5" sx={{ fontWeight: 700, color: 'error.main' }}>{financeSummary.expense.toLocaleString()} 缅币</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Card>
							<CardContent sx={{ textAlign: 'center' }}>
								<Typography variant="body2" color="text.secondary">净收益</Typography>
								<Typography variant="h5" sx={{ fontWeight: 700 }}>{(financeSummary.income - financeSummary.expense).toLocaleString()} 缅币</Typography>
							</CardContent>
						</Card>
					</Grid>
					<Grid item xs={12} sm={6} md={3}>
						<Button fullWidth variant="contained" onClick={() => setOpenFinanceDialog(true)}>新增记录</Button>
					</Grid>
				</Grid>

				<Paper sx={{ p: 2, mb: 2 }}>
					<Grid container spacing={2} alignItems="center">
						<Grid item xs={12} md={3}>
							<TextField fullWidth label="开始日期" type="date" value={startDate} onChange={(e)=>setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
						</Grid>
						<Grid item xs={12} md={3}>
							<TextField fullWidth label="结束日期" type="date" value={endDate} onChange={(e)=>setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
						</Grid>
						<Grid item xs={12} md={3}>
							<TextField select fullWidth label="类型" value={typeFilter} onChange={(e)=>setTypeFilter(e.target.value as any)}>
								<MenuItem value="all">全部</MenuItem>
								<MenuItem value="收入">收入</MenuItem>
								<MenuItem value="支出">支出</MenuItem>
							</TextField>
						</Grid>
						<Grid item xs={12} md={3} sx={{ display: 'flex', gap: 1 }}>
							<Button variant="outlined" onClick={()=>{ const t=new Date().toISOString().slice(0,10); setStartDate(t); setEndDate(t); }}>今天</Button>
							<Button variant="outlined" onClick={()=>{ const now=new Date(); const t=now.toISOString().slice(0,10); const first=new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10); setStartDate(first); setEndDate(t); }}>本月</Button>
							<Button variant="text" onClick={()=>{ setStartDate(''); setEndDate(''); setTypeFilter('all'); }}>重置</Button>
						</Grid>
					</Grid>
				</Paper>

				<Paper>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow sx={{ backgroundColor: 'grey.50' }}>
									<TableCell>日期</TableCell>
									<TableCell>类型</TableCell>
									<TableCell>类别</TableCell>
									<TableCell>金额</TableCell>
									<TableCell>备注</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{financePageData.map(txn => (
									<TableRow key={txn.id}>
										<TableCell>{txn.date}</TableCell>
										<TableCell>
											<Chip label={txn.type} color={txn.type === '收入' ? 'success' : 'error'} size="small" />
										</TableCell>
										<TableCell>{txn.category || '—'}</TableCell>
										<TableCell>{txn.amount.toLocaleString()}</TableCell>
										<TableCell>{txn.note}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>

				<Typography variant="subtitle1" sx={{ mt: 3, mb: 1, fontWeight: 600 }}>按日汇总</Typography>
				<Paper>
					<TableContainer>
						<Table>
							<TableHead>
								<TableRow sx={{ backgroundColor: 'grey.50' }}>
									<TableCell>日期</TableCell>
									<TableCell>当日收入</TableCell>
									<TableCell>当日支出</TableCell>
									<TableCell>当日净额</TableCell>
								</TableRow>
							</TableHead>
							<TableBody>
								{Object.entries(filteredFinance.reduce<Record<string, { i:number; e:number }>>((acc, t)=>{ const k=t.date; acc[k] ||= { i:0, e:0 }; if (t.type==='收入') acc[k].i+=t.amount; else acc[k].e+=t.amount; return acc; }, {})).sort((a,b)=>a[0]<b[0]?1:-1).map(([date, v])=> (
									<TableRow key={date}>
										<TableCell>{date}</TableCell>
										<TableCell sx={{ color: 'success.main' }}>{v.i.toLocaleString()}</TableCell>
										<TableCell sx={{ color: 'error.main' }}>{v.e.toLocaleString()}</TableCell>
										<TableCell>{(v.i - v.e).toLocaleString()}</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</TableContainer>
				</Paper>
			</Container>

			<Dialog open={openFinanceDialog} onClose={() => setOpenFinanceDialog(false)} maxWidth="sm" fullWidth>
				<DialogTitle>新增财务记录</DialogTitle>
				<DialogContent>
					<Grid container spacing={2} sx={{ mt: 1 }}>
						<Grid item xs={12} sm={6}>
							<TextField select fullWidth label="类型" value={newTxn.type} onChange={(e) => setNewTxn({ ...newTxn, type: e.target.value as any })}>
								<MenuItem value="收入">收入</MenuItem>
								<MenuItem value="支出">支出</MenuItem>
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="金额" type="number" value={newTxn.amount} onChange={(e) => setNewTxn({ ...newTxn, amount: Number(e.target.value) })} />
						</Grid>
						<Grid item xs={12}>
							<TextField select fullWidth label="类别" value={newTxn.category} onChange={(e)=> setNewTxn({ ...newTxn, category: e.target.value })}>
								{(newTxn.type === '收入' ? ['运费','快递服务','上门取件费','附加费','其他收入'] : ['油费','包装材料','工资','房租','维修保养','罚款','其他支出']).map(c => (
									<MenuItem key={c} value={c}>{c}</MenuItem>
								))}
							</TextField>
						</Grid>
						<Grid item xs={12} sm={6}>
							<TextField fullWidth label="日期" type="date" value={newTxn.date} onChange={(e) => setNewTxn({ ...newTxn, date: e.target.value })} InputLabelProps={{ shrink: true }} />
						</Grid>
						<Grid item xs={12}>
							<TextField fullWidth label="备注" value={newTxn.note} onChange={(e) => setNewTxn({ ...newTxn, note: e.target.value })} />
						</Grid>
					</Grid>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setOpenFinanceDialog(false)}>取消</Button>
					<Button variant="contained" onClick={handleAddTxn}>保存</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default AdminFinance;


