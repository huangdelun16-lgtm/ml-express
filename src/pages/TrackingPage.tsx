import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  TextField,
  Button,
  Paper,
  Grid,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Search,
  LocalShipping,
  CheckCircle,
  Schedule,
  LocationOn,
  AccessTime,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';

interface TrackingInfo {
  trackingNumber: string;
  status: string;
  sender: string;
  receiver: string;
  packageType: string;
  weight: string;
  createdAt: string;
  estimatedDelivery: string;
  steps: TrackingStep[];
}

interface TrackingStep {
  status: string;
  description: string;
  location: string;
  timestamp: string;
  completed: boolean;
}

const TrackingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [trackingNumber, setTrackingNumber] = useState(searchParams.get('number') || '');
  const [trackingResult, setTrackingResult] = useState<TrackingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // 模拟快递数据
  const mockTrackingData: { [key: string]: TrackingInfo } = {
    'ML123456789': {
      trackingNumber: 'ML123456789',
      status: '运输中',
      sender: '张三 - 仰光市',
      receiver: '李四 - 曼德勒市',
      packageType: '文件包裹',
      weight: '0.5kg',
      createdAt: '2024-01-14',
      estimatedDelivery: '2024-01-15',
      steps: [
        {
          status: '已下单',
          description: '包裹已成功下单',
          location: '仰光市',
          timestamp: '2024-01-14 09:00',
          completed: true,
        },
        {
          status: '已揽收',
          description: '快递员已上门揽收包裹',
          location: '仰光市',
          timestamp: '2024-01-14 14:30',
          completed: true,
        },
        {
          status: '运输中',
          description: '包裹正在运输途中',
          location: '曼德勒市',
          timestamp: '2024-01-15 08:00',
          completed: false,
        },
        {
          status: '派送中',
          description: '快递员正在派送包裹',
          location: '曼德勒市',
          timestamp: '',
          completed: false,
        },
        {
          status: '已签收',
          description: '包裹已成功签收',
          location: '曼德勒市',
          timestamp: '',
          completed: false,
        },
      ],
    },
    'ML987654321': {
      trackingNumber: 'ML987654321',
      status: '已签收',
      sender: '王五 - 仰光市',
      receiver: '赵六 - 内比都市',
      packageType: '电子产品',
      weight: '2.0kg',
      createdAt: '2024-01-12',
      estimatedDelivery: '2024-01-14',
      steps: [
        {
          status: '已下单',
          description: '包裹已成功下单',
          location: '仰光市',
          timestamp: '2024-01-12 10:00',
          completed: true,
        },
        {
          status: '已揽收',
          description: '快递员已上门揽收包裹',
          location: '仰光市',
          timestamp: '2024-01-12 15:00',
          completed: true,
        },
        {
          status: '运输中',
          description: '包裹正在运输途中',
          location: '内比都市',
          timestamp: '2024-01-13 09:00',
          completed: true,
        },
        {
          status: '派送中',
          description: '快递员正在派送包裹',
          location: '内比都市',
          timestamp: '2024-01-14 10:00',
          completed: true,
        },
        {
          status: '已签收',
          description: '包裹已成功签收',
          location: '内比都市',
          timestamp: '2024-01-14 14:30',
          completed: true,
        },
      ],
    },
  };

  const handleSearch = async () => {
    if (!trackingNumber.trim()) {
      setError('请输入快递单号');
      return;
    }

    setLoading(true);
    setError('');
    setTrackingResult(null);

    // 模拟API调用延迟
    setTimeout(() => {
      const result = mockTrackingData[trackingNumber];
      if (result) {
        setTrackingResult(result);
      } else {
        setError('未找到该快递单号，请检查后重试');
      }
      setLoading(false);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case '已签收':
        return 'success';
      case '运输中':
        return 'warning';
      case '已揽收':
        return 'info';
      case '派送中':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case '已签收':
        return <CheckCircle />;
      case '运输中':
        return <LocalShipping />;
      case '已揽收':
        return <Schedule />;
      case '派送中':
        return <LocationOn />;
      default:
        return <AccessTime />;
    }
  };

  return (
    <PremiumBackground variant="page">
      {/* Hero Section */}
      <Box
        sx={{
          background: `
            linear-gradient(135deg, rgba(15, 32, 39, 0.9) 0%, rgba(32, 58, 67, 0.9) 50%, rgba(44, 83, 100, 0.9) 100%),
            radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.3) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.3) 0%, transparent 50%)
          `,
          color: 'white',
          py: { xs: 6, md: 8 },
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{ fontWeight: 700, mb: 3 }}
          >
            快递查询
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
            输入快递单号，实时跟踪您的包裹状态
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* 查询表单 */}
        <Paper sx={{ p: 4, mb: 4 }}>
          <Typography variant="h5" component="h2" sx={{ mb: 3, fontWeight: 600, textAlign: 'center' }}>
            查询快递状态
          </Typography>
          
          <Grid container spacing={3} alignItems="center" justifyContent="center">
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="请输入快递单号"
                value={trackingNumber}
                onChange={(e) => setTrackingNumber(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                variant="outlined"
                size="medium"
                sx={{ mb: { xs: 2, md: 0 } }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <Button
                fullWidth
                variant="contained"
                onClick={handleSearch}
                disabled={loading}
                startIcon={loading ? null : <Search />}
                sx={{ py: 1.5, fontSize: '1.1rem' }}
              >
                {loading ? '查询中...' : '查询'}
              </Button>
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mt: 3 }}>
              {error}
            </Alert>
          )}
        </Paper>

        {/* 查询结果 */}
        {trackingResult && (
          <Grid container spacing={4}>
            {/* 包裹信息 */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
                    包裹信息
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      快递单号
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, fontFamily: 'monospace' }}>
                      {trackingResult.trackingNumber}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      当前状态
                    </Typography>
                    <Chip
                      label={trackingResult.status}
                      color={getStatusColor(trackingResult.status) as any}
                      icon={getStatusIcon(trackingResult.status)}
                      sx={{ mt: 1 }}
                    />
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      寄件人
                    </Typography>
                    <Typography variant="body1">
                      {trackingResult.sender}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      收件人
                    </Typography>
                    <Typography variant="body1">
                      {trackingResult.receiver}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      包裹类型
                    </Typography>
                    <Typography variant="body1">
                      {trackingResult.packageType}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      重量
                    </Typography>
                    <Typography variant="body1">
                      {trackingResult.weight}
                    </Typography>
                  </Box>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      创建时间
                    </Typography>
                    <Typography variant="body1">
                      {trackingResult.createdAt}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      预计送达
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {trackingResult.estimatedDelivery}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 物流轨迹 */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
                    物流轨迹
                  </Typography>
                  
                  <Stepper orientation="vertical">
                    {trackingResult.steps.map((step, index) => (
                      <Step key={index} active={step.completed} completed={step.completed}>
                        <StepLabel
                          icon={step.completed ? <CheckCircle color="success" /> : <Schedule />}
                          sx={{
                            '& .MuiStepLabel-label': {
                              color: step.completed ? 'text.primary' : 'text.secondary',
                              fontWeight: step.completed ? 600 : 400,
                            },
                          }}
                        >
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="body1" sx={{ fontWeight: 600 }}>
                              {step.status}
                            </Typography>
                            {step.timestamp && (
                              <Typography variant="body2" color="text.secondary">
                                {step.timestamp}
                              </Typography>
                            )}
                          </Box>
                        </StepLabel>
                        <StepContent>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              {step.description}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
                              <Typography variant="body2" color="text.secondary">
                                {step.location}
                              </Typography>
                            </Box>
                          </Box>
                        </StepContent>
                      </Step>
                    ))}
                  </Stepper>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {/* 示例单号 */}
        {!trackingResult && !loading && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" component="h3" sx={{ mb: 3, fontWeight: 600 }}>
              测试用快递单号
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              您可以使用以下单号进行测试：
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
              {Object.keys(mockTrackingData).map((number) => (
                <Chip
                  key={number}
                  label={number}
                  variant="outlined"
                  onClick={() => {
                    setTrackingNumber(number);
                    handleSearch();
                  }}
                  sx={{ cursor: 'pointer', '&:hover': { backgroundColor: 'primary.50' } }}
                />
              ))}
            </Box>
          </Paper>
        )}
      </Container>
    </PremiumBackground>
  );
};

export default TrackingPage;
