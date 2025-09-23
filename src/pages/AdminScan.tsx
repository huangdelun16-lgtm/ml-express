import React, { useEffect, useRef, useState } from 'react';
import { Box, AppBar, Toolbar, Typography, Container, Paper, Button, Alert } from '@mui/material';
import { QrCodeScanner, LocalShipping } from '@mui/icons-material';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { useNavigate } from 'react-router-dom';
import { getAdminSession } from '../utils/auth';
import AdminNavigation from '../components/AdminNavigation';

const AdminScan: React.FC = () => {
  const navigate = useNavigate();
  const [error, setError] = useState('');
  const [result, setResult] = useState('');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    const sess = getAdminSession();
    if (!sess) { navigate('/admin/login'); return; }
  }, [navigate]);

  useEffect(() => {
    const start = async () => {
      try {
        codeReaderRef.current = new BrowserMultiFormatReader();
        const devices = await BrowserMultiFormatReader.listVideoInputDevices();
        const deviceId = devices[0]?.deviceId;
        if (!deviceId) throw new Error('未找到摄像头');
        const stream = await navigator.mediaDevices.getUserMedia({ video: { deviceId } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream as any;
          await videoRef.current.play();
        }
        codeReaderRef.current.decodeFromVideoDevice(deviceId, videoRef.current!, (res, err) => {
          if (res) {
            const text = res.getText();
            setResult(text);
          }
        });
      } catch (e: any) {
        setError(e?.message || '摄像头启动失败');
      }
    };
    start();
    return () => {
      try {
        const tracks = (videoRef.current?.srcObject as MediaStream | null)?.getTracks();
        tracks?.forEach(t => t.stop());
      } catch {}
    };
  }, []);

  const updateStatus = async (trackingNumber: string) => {
    try {
      const endpoint = `${window.location.origin}/.netlify/functions/package-scan-update`;
      const sess = getAdminSession();
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-ml-actor': sess?.username || '', 'x-ml-role': sess?.role || '' }, body: JSON.stringify({ trackingNumber }) });
      const data = await res.json();
      if (res.ok) {
        setError('');
        alert(`已更新包裹状态：${data.status || '已入库'}\n单号：${trackingNumber}`);
      } else {
        setError(data.message || '更新失败');
      }
    } catch {
      setError('网络错误');
    }
  };

  useEffect(() => {
    if (result) updateStatus(result);
  }, [result]);

  return (
    <Box sx={{ minHeight: '100vh', backgroundColor: 'grey.50' }}>
      <AdminNavigation title="扫码流转" />

      <Container maxWidth="md" sx={{ py: 4 }}>
        <Paper sx={{ p: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <QrCodeScanner />
            <Typography>对准运单号二维码/条码即可自动识别并更新状态</Typography>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <video ref={videoRef} style={{ width: '100%', borderRadius: 8 }} muted playsInline />

          {result && (
            <Alert severity="success" sx={{ mt: 2 }}>已识别：{result}</Alert>
          )}
        </Paper>
      </Container>
    </Box>
  );
};

export default AdminScan;


