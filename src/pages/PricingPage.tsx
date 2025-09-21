import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  Paper,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stepper,
  Step,
  StepLabel,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  LocalShipping,
  Flight,
  DirectionsCar,
  Calculate,
  Send,
  CheckCircle,
  Info,
} from '@mui/icons-material';

interface PricingForm {
  serviceType: string;
  fromLocation: string;
  toLocation: string;
  packageType: string;
  weight: string;
  dimensions: string;
  customerName: string;
  phone: string;
  email: string;
  additionalNotes: string;
}

const PricingPage: React.FC = () => {
  const [pricingForm, setPricingForm] = useState<PricingForm>({
    serviceType: '',
    fromLocation: '',
    toLocation: '',
    packageType: '',
    weight: '',
    dimensions: '',
    customerName: '',
    phone: '',
    email: '',
    additionalNotes: '',
  });
  const [showForm, setShowForm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const serviceTypes = [
    { id: 'domestic', name: '国内快递', icon: <LocalShipping />, color: 'primary' as const },
    { id: 'international', name: '国际快递', icon: <Flight />, color: 'secondary' as const },
    { id: 'city', name: '同城快递', icon: <DirectionsCar />, color: 'success' as const },
  ];

  const packageTypes = [
    '文件包裹',
    '电子产品',
    '服装鞋帽',
    '食品生鲜',
    '易碎物品',
    '大件货物',
    '其他',
  ];

  const handleInputChange = (field: keyof PricingForm, value: string) => {
    setPricingForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    // 模拟提交
    setTimeout(() => {
      setSubmitted(true);
      setShowForm(false);
      setActiveStep(0);
      setPricingForm({
        serviceType: '',
        fromLocation: '',
        toLocation: '',
        packageType: '',
        weight: '',
        dimensions: '',
        customerName: '',
        phone: '',
        email: '',
        additionalNotes: '',
      });
    }, 2000);
  };

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
  };

  const steps = ['选择服务', '包裹信息', '联系信息'];

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            {serviceTypes.map((service) => (
              <Grid item xs={12} sm={6} key={service.id}>
                <Card
                  sx={{
                    cursor: 'pointer',
                    border: pricingForm.serviceType === service.id ? `2px solid ${(theme.palette as any)[service.color]?.main || theme.palette.primary.main}` : '2px solid transparent',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: '0 8px 25px rgba(0,0,0,0.15)',
                    },
                    transition: 'all 0.3s ease',
                  }}
                  onClick={() => handleInputChange('serviceType', service.id)}
                >
                  <CardContent sx={{ textAlign: 'center', py: 3 }}>
                    <Box sx={{ color: `${service.color}.main`, mb: 2 }}>
                      {service.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {service.name}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        );
      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="起始地点"
                value={pricingForm.fromLocation}
                onChange={(e) => handleInputChange('fromLocation', e.target.value)}
                placeholder="例如：仰光市"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="目的地"
                value={pricingForm.toLocation}
                onChange={(e) => handleInputChange('toLocation', e.target.value)}
                placeholder="例如：曼德勒市"
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>包裹类型</InputLabel>
                <Select
                  value={pricingForm.packageType}
                  label="包裹类型"
                  onChange={(e) => handleInputChange('packageType', e.target.value)}
                >
                  {packageTypes.map((type) => (
                    <MenuItem key={type} value={type}>{type}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="重量 (kg)"
                value={pricingForm.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                placeholder="例如：2.5"
                type="number"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="尺寸 (长×宽×高 cm)"
                value={pricingForm.dimensions}
                onChange={(e) => handleInputChange('dimensions', e.target.value)}
                placeholder="例如：30×20×15"
                helperText="可选，用于更精确的报价"
              />
            </Grid>
          </Grid>
        );
      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="姓名"
                value={pricingForm.customerName}
                onChange={(e) => handleInputChange('customerName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="电话"
                value={pricingForm.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="邮箱"
                value={pricingForm.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                type="email"
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="备注说明"
                value={pricingForm.additionalNotes}
                onChange={(e) => handleInputChange('additionalNotes', e.target.value)}
                multiline
                rows={3}
                placeholder="请描述您的特殊需求或注意事项"
              />
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1976d2 0%, #42a5f5 100%)',
          color: 'white',
          py: { xs: 6, md: 8 },
          textAlign: 'center',
        }}
      >
        <Container maxWidth="lg">
          <Typography
            variant={isMobile ? 'h3' : 'h2'}
            component="h1"
            sx={{ fontWeight: 700, mb: 3 }}
          >
            价格咨询
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9, maxWidth: 600, mx: 'auto' }}>
            获取最优惠的快递价格，专业客服为您提供个性化报价
          </Typography>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* 服务价格概览 */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 4, fontWeight: 600, textAlign: 'center' }}>
            服务价格概览
          </Typography>
          <Grid container spacing={4} justifyContent="center">
            {serviceTypes.map((service) => (
              <Grid item xs={12} sm={6} md={4} key={service.id}>
                <Card sx={{ height: '100%', textAlign: 'center' }}>
                  <CardContent sx={{ py: 4 }}>
                    <Box sx={{ color: `${service.color}.main`, mb: 2 }}>
                      {service.icon}
                    </Box>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                      {service.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      {service.id === 'domestic' && '缅甸境内快递服务'}
                      {service.id === 'international' && '国际快递服务'}
                      {service.id === 'city' && '同城快速配送'}
                      {service.id === 'rail' && '铁路运输服务'}
                    </Typography>
                    <Chip
                      label="询价获取"
                      color={service.color as any}
                      variant="outlined"
                      icon={<Calculate />}
                    />
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 在线询价 */}
        <Box sx={{ mb: 6 }}>
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h4" component="h2" sx={{ mb: 3, fontWeight: 600 }}>
              在线询价
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
              填写以下信息，我们的专业客服将在24小时内为您提供详细报价
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<Calculate />}
              onClick={() => setShowForm(true)}
              sx={{ py: 1.5, px: 4, fontSize: '1.1rem' }}
            >
              开始询价
            </Button>
          </Paper>
        </Box>

        {/* 价格优势 */}
        <Box sx={{ mb: 6 }}>
          <Typography variant="h4" component="h2" sx={{ mb: 4, fontWeight: 600, textAlign: 'center' }}>
            我们的价格优势
          </Typography>
          <Grid container spacing={4}>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent sx={{ py: 4 }}>
                  <CheckCircle sx={{ color: 'success.main', fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    透明定价
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    无隐藏费用，价格清晰明了，让您消费更放心
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent sx={{ py: 4 }}>
                  <Calculate sx={{ color: 'primary.main', fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    批量优惠
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    大客户享受批量优惠，长期合作更有惊喜价格
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={4}>
              <Card sx={{ textAlign: 'center', height: '100%' }}>
                <CardContent sx={{ py: 4 }}>
                  <Info sx={{ color: 'info.main', fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                    灵活方案
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    根据您的需求定制最优方案，性价比更高
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* 询价表单对话框 */}
        <Dialog
          open={showForm}
          onClose={() => setShowForm(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ textAlign: 'center', pb: 1 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              在线询价
            </Typography>
            <Typography variant="body2" color="text.secondary">
              请填写以下信息，我们将为您提供专业报价
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Stepper activeStep={activeStep} sx={{ mb: 4, mt: 2 }}>
              {steps.map((label) => (
                <Step key={label}>
                  <StepLabel>{label}</StepLabel>
                </Step>
              ))}
            </Stepper>
            {renderStepContent(activeStep)}
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
              sx={{ mr: 1 }}
            >
              上一步
            </Button>
            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
              startIcon={activeStep === steps.length - 1 ? <Send /> : null}
            >
              {activeStep === steps.length - 1 ? '提交询价' : '下一步'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* 提交成功提示 */}
        {submitted && (
          <Alert
            severity="success"
            sx={{ mt: 3 }}
            onClose={() => setSubmitted(false)}
          >
            询价提交成功！我们的客服将在24小时内联系您，请保持电话畅通。
          </Alert>
        )}
      </Container>
    </Box>
  );
};

export default PricingPage;
