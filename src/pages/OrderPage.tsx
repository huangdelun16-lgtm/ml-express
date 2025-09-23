import React, { useState } from 'react';
import {
  Container,
  Typography,
  Paper,
  TextField,
  Button,
  Box,
  Grid,
  MenuItem,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
} from '@mui/material';
import {
  LocalShipping,
  Person,
  Payment,
  CheckCircle,
} from '@mui/icons-material';
import PremiumBackground from '../components/PremiumBackground';

const OrderPage: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [orderData, setOrderData] = useState({
    senderName: '',
    senderPhone: '',
    senderAddress: '',
    receiverName: '',
    receiverPhone: '',
    receiverAddress: '',
    packageType: '',
    weight: '',
    description: '',
    serviceType: '',
  });

  const steps = ['寄件信息', '收件信息', '包裹信息', '确认下单'];

  const packageTypes = [
    { value: 'document', label: '文件' },
    { value: 'electronics', label: '电子产品' },
    { value: 'clothing', label: '服装' },
    { value: 'food', label: '食品' },
    { value: 'other', label: '其他' },
  ];

  const serviceTypes = [
    { value: 'standard', label: '标准快递 (3-5天)', price: '¥15' },
    { value: 'express', label: '特快专递 (1-2天)', price: '¥25' },
    { value: 'overnight', label: '次日达 (24小时)', price: '¥35' },
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInputChange = (field: string, value: string) => {
    setOrderData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = () => {
    // 这里可以添加提交订单的逻辑
    alert('订单提交成功！我们将尽快联系您确认详细信息。');
    setActiveStep(4);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                寄件人信息
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="寄件人姓名"
                value={orderData.senderName}
                onChange={(e) => handleInputChange('senderName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="联系电话"
                value={orderData.senderPhone}
                onChange={(e) => handleInputChange('senderPhone', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="寄件地址"
                multiline
                rows={3}
                value={orderData.senderAddress}
                onChange={(e) => handleInputChange('senderAddress', e.target.value)}
                required
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                收件人信息
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="收件人姓名"
                value={orderData.receiverName}
                onChange={(e) => handleInputChange('receiverName', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="联系电话"
                value={orderData.receiverPhone}
                onChange={(e) => handleInputChange('receiverPhone', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="收件地址"
                multiline
                rows={3}
                value={orderData.receiverAddress}
                onChange={(e) => handleInputChange('receiverAddress', e.target.value)}
                required
              />
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                包裹信息
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                select
                label="包裹类型"
                value={orderData.packageType}
                onChange={(e) => handleInputChange('packageType', e.target.value)}
                required
              >
                {packageTypes.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="重量 (kg)"
                type="number"
                value={orderData.weight}
                onChange={(e) => handleInputChange('weight', e.target.value)}
                required
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="物品描述"
                multiline
                rows={3}
                value={orderData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="请详细描述包裹内容..."
              />
            </Grid>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                选择服务类型
              </Typography>
              <Grid container spacing={2}>
                {serviceTypes.map((service) => (
                  <Grid item xs={12} sm={4} key={service.value}>
                    <Card 
                      sx={{ 
                        cursor: 'pointer',
                        border: orderData.serviceType === service.value ? 2 : 1,
                        borderColor: orderData.serviceType === service.value ? 'primary.main' : 'divider',
                      }}
                      onClick={() => handleInputChange('serviceType', service.value)}
                    >
                      <CardContent>
                        <Typography variant="h6" color="primary">
                          {service.price}
                        </Typography>
                        <Typography variant="body2">
                          {service.label}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                确认订单信息
              </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    寄件人信息
                  </Typography>
                  <Typography variant="body2">
                    姓名: {orderData.senderName}
                  </Typography>
                  <Typography variant="body2">
                    电话: {orderData.senderPhone}
                  </Typography>
                  <Typography variant="body2">
                    地址: {orderData.senderAddress}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={6}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    收件人信息
                  </Typography>
                  <Typography variant="body2">
                    姓名: {orderData.receiverName}
                  </Typography>
                  <Typography variant="body2">
                    电话: {orderData.receiverPhone}
                  </Typography>
                  <Typography variant="body2">
                    地址: {orderData.receiverAddress}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle1" gutterBottom>
                    包裹信息
                  </Typography>
                  <Typography variant="body2">
                    类型: {packageTypes.find(p => p.value === orderData.packageType)?.label}
                  </Typography>
                  <Typography variant="body2">
                    重量: {orderData.weight} kg
                  </Typography>
                  <Typography variant="body2">
                    描述: {orderData.description}
                  </Typography>
                  <Typography variant="body2">
                    服务: {serviceTypes.find(s => s.value === orderData.serviceType)?.label}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                    预估费用: {serviceTypes.find(s => s.value === orderData.serviceType)?.price}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );

      default:
        return (
          <Box textAlign="center" py={4}>
            <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              订单提交成功！
            </Typography>
            <Typography variant="body1" color="text.secondary">
              我们已收到您的订单，客服人员将在24小时内联系您确认详细信息。
            </Typography>
          </Box>
        );
    }
  };

  return (
    <PremiumBackground variant="page">
      <Container maxWidth="md" sx={{ py: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" component="h1" textAlign="center" gutterBottom>
          在线下单
        </Typography>
        <Typography variant="body1" textAlign="center" color="text.secondary" sx={{ mb: 4 }}>
          填写以下信息，我们将为您提供最优质的快递服务
        </Typography>

        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep < 4 && (
          <Alert severity="info" sx={{ mb: 3 }}>
            请填写准确的联系信息，我们的客服将联系您确认订单详情和最终价格。
          </Alert>
        )}

        {renderStepContent(activeStep)}

        {activeStep < 4 && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              disabled={activeStep === 0}
              onClick={handleBack}
            >
              上一步
            </Button>
            <Button
              variant="contained"
              onClick={activeStep === steps.length - 1 ? handleSubmit : handleNext}
            >
              {activeStep === steps.length - 1 ? '提交订单' : '下一步'}
            </Button>
          </Box>
        )}
      </Paper>
      </Container>
    </PremiumBackground>
  );
};

export default OrderPage;
