import React, { useState, useEffect } from 'react';
import { Box, Container, Typography, Button, Paper, CircularProgress, Alert } from '@mui/material';
import { getAdminSession } from '../utils/auth';
import { fetchWithRetry } from '../utils/backend';

const DbDebug: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const loadDebugInfo = async () => {
    const session = getAdminSession();
    if (!session || session.role !== 'master') {
      setError('只有 master 可以访问此页面');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await fetchWithRetry('/.netlify/functions/db-debug', {
        headers: {
          'x-ml-actor': session.username,
          'x-ml-role': session.role
        }
      });
      const result = await response.json();
      setData(result);
    } catch (err: any) {
      setError(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugInfo();
  }, []);

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Typography variant="h5" gutterBottom>数据库调试信息</Typography>
      
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      
      {loading && <CircularProgress />}
      
      {data && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Users 表列信息</Typography>
            <pre style={{ overflow: 'auto' }}>{JSON.stringify(data.columns, null, 2)}</pre>
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>样本用户数据</Typography>
            <pre style={{ overflow: 'auto' }}>{JSON.stringify(data.sampleUsers, null, 2)}</pre>
          </Paper>
          
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>调试信息</Typography>
            <pre style={{ overflow: 'auto' }}>{JSON.stringify(data.debug, null, 2)}</pre>
          </Paper>
        </Box>
      )}
      
      <Button variant="contained" onClick={loadDebugInfo} sx={{ mt: 2 }}>
        重新加载
      </Button>
    </Container>
  );
};

export default DbDebug;
