import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Alert,
  CircularProgress,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Tab,
  Tabs,
  Grid,
  Card,
  CardContent,
} from '@mui/material';
import { Sync, CloudUpload, Storage, Warning, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import AdminNavigation from '../components/AdminNavigation';
import { getAdminSession } from '../utils/auth';
import { fetchWithRetry } from '../utils/api';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const DataMerger: React.FC = () => {
  const navigate = useNavigate();
  const session = getAdminSession();
  const [tabValue, setTabValue] = useState(0);
  const [loading, setLoading] = useState(false);
  const [localData, setLocalData] = useState<any>({
    packages: [],
    finance: [],
    users: [],
  });
  const [cloudData, setCloudData] = useState<any>({
    packages: [],
    finance: [],
    users: [],
  });
  const [mergeStatus, setMergeStatus] = useState<any>({});
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [mergeResult, setMergeResult] = useState<any>(null);

  useEffect(() => {
    if (!session) {
      navigate('/admin/login');
      return;
    }
    loadAllData();
  }, [session, navigate]);

  const loadAllData = async () => {
    setLoading(true);
    
    // 加载本地数据
    const localPackages = JSON.parse(localStorage.getItem('packages') || '[]');
    const localFinance = JSON.parse(localStorage.getItem('finance') || '[]');
    const localUsers = JSON.parse(localStorage.getItem('users') || '[]');
    
    setLocalData({
      packages: Array.isArray(localPackages) ? localPackages : [],
      finance: Array.isArray(localFinance) ? localFinance : [],
      users: Array.isArray(localUsers) ? localUsers : [],
    });

    // 加载云端数据
    try {
      // 获取包裹数据
      const packagesRes = await fetchWithRetry('/.netlify/functions/packages-manage?pageSize=1000', {
        headers: { 'x-ml-actor': session?.username || '' },
      });
      const packagesData = await packagesRes.json();
      
      // 获取财务数据
      const financeRes = await fetchWithRetry('/.netlify/functions/finances-manage?pageSize=1000', {
        headers: { 'x-ml-actor': session?.username || '' },
      });
      const financeData = await financeRes.json();
      
      // 获取用户数据
      const usersRes = await fetchWithRetry('/.netlify/functions/users-manage', {
        headers: { 'x-ml-actor': session?.username || '' },
      });
      const usersData = await usersRes.json();
      
      setCloudData({
        packages: packagesData.items || [],
        finance: financeData.items || [],
        users: usersData.users || [],
      });
    } catch (error) {
      console.error('加载云端数据失败:', error);
    }
    
    setLoading(false);
  };

  const analyzeData = () => {
    const status: any = {};
    
    // 分析包裹数据
    const localPackageIds = new Set(localData.packages.map((p: any) => p.trackingNumber || p.id));
    const cloudPackageIds = new Set(cloudData.packages.map((p: any) => p.trackingNumber || p.id));
    
    const packagesOnlyLocal = Array.from(localPackageIds).filter(id => !cloudPackageIds.has(id));
    const packagesOnlyCloud = Array.from(cloudPackageIds).filter(id => !localPackageIds.has(id));
    const packagesBoth = Array.from(localPackageIds).filter(id => cloudPackageIds.has(id));
    
    status.packages = {
      local: localData.packages.length,
      cloud: cloudData.packages.length,
      onlyLocal: packagesOnlyLocal.length,
      onlyCloud: packagesOnlyCloud.length,
      both: packagesBoth.length,
      conflicts: packagesBoth.filter(id => {
        const localPkg = localData.packages.find((p: any) => (p.trackingNumber || p.id) === id);
        const cloudPkg = cloudData.packages.find((p: any) => (p.trackingNumber || p.id) === id);
        return JSON.stringify(localPkg) !== JSON.stringify(cloudPkg);
      }).length,
    };
    
    // 分析财务数据
    const localFinanceIds = new Set(localData.finance.map((f: any) => f.id));
    const cloudFinanceIds = new Set(cloudData.finance.map((f: any) => f.id));
    
    status.finance = {
      local: localData.finance.length,
      cloud: cloudData.finance.length,
      onlyLocal: Array.from(localFinanceIds).filter(id => !cloudFinanceIds.has(id)).length,
      onlyCloud: Array.from(cloudFinanceIds).filter(id => !localFinanceIds.has(id)).length,
      both: Array.from(localFinanceIds).filter(id => cloudFinanceIds.has(id)).length,
    };
    
    // 分析用户数据
    const localUsernames = new Set(localData.users.map((u: any) => u.username));
    const cloudUsernames = new Set(cloudData.users.map((u: any) => u.username));
    
    status.users = {
      local: localData.users.length,
      cloud: cloudData.users.length,
      onlyLocal: Array.from(localUsernames).filter(u => !cloudUsernames.has(u)).length,
      onlyCloud: Array.from(cloudUsernames).filter(u => !localUsernames.has(u)).length,
      both: Array.from(localUsernames).filter(u => cloudUsernames.has(u)).length,
    };
    
    setMergeStatus(status);
  };

  useEffect(() => {
    if (localData.packages.length > 0 || cloudData.packages.length > 0) {
      analyzeData();
    }
  }, [localData, cloudData]);

  const handleSelectAll = (type: string) => {
    const items = localData[type];
    const newSelected = new Set(selectedItems);
    items.forEach((item: any) => {
      const id = `${type}-${item.trackingNumber || item.id || item.username}`;
      newSelected.add(id);
    });
    setSelectedItems(newSelected);
  };

  const handleSelectItem = (id: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedItems(newSelected);
  };

  const handleMergeToCloud = async () => {
    setLoading(true);
    const results = { success: 0, failed: 0, errors: [] as string[] };
    
    // 合并包裹数据
    const selectedPackages = localData.packages.filter((p: any) => 
      selectedItems.has(`packages-${p.trackingNumber || p.id}`)
    );
    
    for (const pkg of selectedPackages) {
      try {
        // 检查是否已存在
        const exists = cloudData.packages.find((cp: any) => 
          cp.trackingNumber === pkg.trackingNumber
        );
        
        if (!exists) {
          // 创建新包裹
          const response = await fetchWithRetry('/.netlify/functions/packages-manage', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-ml-actor': session?.username || '',
            },
            body: JSON.stringify({
              tracking_number: pkg.trackingNumber,
              sender: pkg.sender,
              receiver: pkg.receiver,
              receiver_phone: pkg.receiverPhone,
              origin: pkg.origin,
              destination: pkg.destination,
              package_type: pkg.packageType,
              weight_kg: pkg.weight || pkg.weightKg,
              fee: pkg.fee,
              status: pkg.status,
              note: pkg.note,
              created_by: session?.username,
              biz: pkg.packageType?.includes('city') ? 'city' : 'cross',
            }),
          });
          
          if (response.ok) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`包裹 ${pkg.trackingNumber} 上传失败`);
          }
        } else {
          // 更新现有包裹
          const response = await fetchWithRetry('/.netlify/functions/packages-manage', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'x-ml-actor': session?.username || '',
            },
            body: JSON.stringify({
              id: exists.id,
              tracking_number: pkg.trackingNumber,
              sender: pkg.sender,
              receiver: pkg.receiver,
              status: pkg.status,
              fee: pkg.fee,
              note: pkg.note,
            }),
          });
          
          if (response.ok) {
            results.success++;
          } else {
            results.failed++;
            results.errors.push(`包裹 ${pkg.trackingNumber} 更新失败`);
          }
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`包裹 ${pkg.trackingNumber} 处理失败: ${error}`);
      }
    }
    
    // 合并财务数据
    const selectedFinance = localData.finance.filter((f: any) => 
      selectedItems.has(`finance-${f.id}`)
    );
    
    for (const fin of selectedFinance) {
      try {
        const response = await fetchWithRetry('/.netlify/functions/finances-manage', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-ml-actor': session?.username || '',
          },
          body: JSON.stringify({
            type: fin.type,
            category: fin.category,
            amount: fin.amount,
            note: fin.note,
            date: fin.date,
            tracking_no: fin.trackingNo,
            created_by: session?.username,
          }),
        });
        
        if (response.ok) {
          results.success++;
        } else {
          results.failed++;
          results.errors.push(`财务记录 ${fin.id} 上传失败`);
        }
      } catch (error) {
        results.failed++;
        results.errors.push(`财务记录 ${fin.id} 处理失败: ${error}`);
      }
    }
    
    setLoading(false);
    setMergeResult(results);
    setConfirmDialog(false);
    
    // 重新加载数据
    await loadAllData();
    
    // 清除选择
    setSelectedItems(new Set());
  };

  const clearLocalData = () => {
    if (window.confirm('确定要清除本地数据吗？这将删除所有存储在浏览器中的数据！')) {
      localStorage.removeItem('packages');
      localStorage.removeItem('finance');
      localStorage.removeItem('users');
      loadAllData();
      alert('本地数据已清除');
    }
  };

  if (!session) return null;

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <AdminNavigation title="数据合并工具" />
      
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>重要提示：</strong>此工具用于将本地存储的数据合并到云端数据库。
            请仔细检查数据后再执行合并操作，避免数据丢失或重复。
          </Typography>
        </Alert>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Storage sx={{ mr: 1 }} />
                      <Typography variant="h6">本地数据</Typography>
                    </Box>
                    <Typography>包裹: {localData.packages.length} 条</Typography>
                    <Typography>财务: {localData.finance.length} 条</Typography>
                    <Typography>用户: {localData.users.length} 条</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <CloudUpload sx={{ mr: 1 }} />
                      <Typography variant="h6">云端数据</Typography>
                    </Box>
                    <Typography>包裹: {cloudData.packages.length} 条</Typography>
                    <Typography>财务: {cloudData.finance.length} 条</Typography>
                    <Typography>用户: {cloudData.users.length} 条</Typography>
                  </CardContent>
                </Card>
              </Grid>
              
              <Grid item xs={12} md={4}>
                <Card>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Warning sx={{ mr: 1, color: 'warning.main' }} />
                      <Typography variant="h6">差异分析</Typography>
                    </Box>
                    <Typography color="error">
                      仅本地: {mergeStatus.packages?.onlyLocal || 0} 个包裹
                    </Typography>
                    <Typography color="primary">
                      仅云端: {mergeStatus.packages?.onlyCloud || 0} 个包裹
                    </Typography>
                    <Typography color="warning.main">
                      冲突: {mergeStatus.packages?.conflicts || 0} 个包裹
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Paper sx={{ mb: 3 }}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}>
                  <Tab label={`包裹数据 (${localData.packages.length})`} />
                  <Tab label={`财务数据 (${localData.finance.length})`} />
                  <Tab label={`用户数据 (${localData.users.length})`} />
                </Tabs>
              </Box>

              <TabPanel value={tabValue} index={0}>
                <Box sx={{ mb: 2, display: 'flex', gap: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => handleSelectAll('packages')}
                  >
                    全选本地包裹
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<Sync />}
                    onClick={() => setConfirmDialog(true)}
                    disabled={selectedItems.size === 0}
                  >
                    合并选中到云端 ({selectedItems.size})
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">选择</TableCell>
                        <TableCell>追踪号</TableCell>
                        <TableCell>发件人</TableCell>
                        <TableCell>收件人</TableCell>
                        <TableCell>状态</TableCell>
                        <TableCell>来源</TableCell>
                        <TableCell>云端状态</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {localData.packages.map((pkg: any) => {
                        const id = `packages-${pkg.trackingNumber || pkg.id}`;
                        const cloudPkg = cloudData.packages.find((cp: any) => 
                          cp.trackingNumber === pkg.trackingNumber
                        );
                        
                        return (
                          <TableRow key={id}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.has(id)}
                                onChange={() => handleSelectItem(id)}
                              />
                            </TableCell>
                            <TableCell>{pkg.trackingNumber}</TableCell>
                            <TableCell>{pkg.sender}</TableCell>
                            <TableCell>{pkg.receiver}</TableCell>
                            <TableCell>
                              <Chip label={pkg.status} size="small" />
                            </TableCell>
                            <TableCell>
                              <Chip label="本地" size="small" variant="outlined" />
                            </TableCell>
                            <TableCell>
                              {cloudPkg ? (
                                <Chip 
                                  label="已存在" 
                                  size="small" 
                                  color="success"
                                  icon={<CheckCircle />}
                                />
                              ) : (
                                <Chip 
                                  label="未上传" 
                                  size="small" 
                                  color="warning"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={1}>
                <Box sx={{ mb: 2 }}>
                  <Button 
                    variant="outlined" 
                    onClick={() => handleSelectAll('finance')}
                  >
                    全选本地财务记录
                  </Button>
                </Box>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell padding="checkbox">选择</TableCell>
                        <TableCell>日期</TableCell>
                        <TableCell>类型</TableCell>
                        <TableCell>金额</TableCell>
                        <TableCell>备注</TableCell>
                        <TableCell>来源</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {localData.finance.map((fin: any) => {
                        const id = `finance-${fin.id}`;
                        return (
                          <TableRow key={id}>
                            <TableCell padding="checkbox">
                              <Checkbox
                                checked={selectedItems.has(id)}
                                onChange={() => handleSelectItem(id)}
                              />
                            </TableCell>
                            <TableCell>{fin.date}</TableCell>
                            <TableCell>{fin.type}</TableCell>
                            <TableCell>¥{fin.amount}</TableCell>
                            <TableCell>{fin.note}</TableCell>
                            <TableCell>
                              <Chip label="本地" size="small" variant="outlined" />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </TabPanel>

              <TabPanel value={tabValue} index={2}>
                <Typography color="text.secondary">
                  用户数据通常由系统管理，不建议手动合并。
                </Typography>
              </TabPanel>
            </Paper>

            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button 
                variant="outlined" 
                color="error"
                onClick={clearLocalData}
              >
                清除本地数据
              </Button>
              <Button 
                variant="outlined"
                onClick={loadAllData}
              >
                刷新数据
              </Button>
            </Box>

            {mergeResult && (
              <Alert 
                severity={mergeResult.failed === 0 ? 'success' : 'warning'}
                sx={{ mt: 3 }}
                onClose={() => setMergeResult(null)}
              >
                <Typography variant="body2">
                  合并完成：成功 {mergeResult.success} 条，失败 {mergeResult.failed} 条
                </Typography>
                {mergeResult.errors.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    {mergeResult.errors.map((err: string, i: number) => (
                      <Typography key={i} variant="caption" display="block">
                        - {err}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Alert>
            )}
          </>
        )}

        <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)}>
          <DialogTitle>确认合并数据</DialogTitle>
          <DialogContent>
            <Typography>
              您选择了 {selectedItems.size} 条数据要合并到云端。
            </Typography>
            <Typography sx={{ mt: 2 }}>
              此操作将：
            </Typography>
            <ul>
              <li>将选中的本地数据上传到云端数据库</li>
              <li>如果数据已存在，将更新云端数据</li>
              <li>不会删除任何数据</li>
            </ul>
            <Typography color="warning.main" sx={{ mt: 2 }}>
              请确保您有权限执行此操作！
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConfirmDialog(false)}>取消</Button>
            <Button 
              variant="contained" 
              onClick={handleMergeToCloud}
              color="primary"
            >
              确认合并
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};

export default DataMerger;
