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
import { useNavigate } from 'react-router-dom';
import PremiumBackground from '../components/PremiumBackground';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  generateOrderId, 
  calculateDistance, 
  calculateOrderAmount, 
  formatMyanmarTime,
  OrderStatus,
  OrderData 
} from '../utils/orderUtils';

const OrderPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
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
  const [calculatedPrice, setCalculatedPrice] = useState(0);
  const [calculatedDistance, setCalculatedDistance] = useState(0);
  const [submittedOrderId, setSubmittedOrderId] = useState('');

  const steps = ['寄件信息', '收件信息', '包裹信息', '确认下单'];

  const packageTypes = [
    { value: '文件', label: '文件' },
    { value: '电子产品', label: '电子产品' },
    { value: '服装', label: '服装' },
    { value: '食品', label: '食品' },
    { value: '其他', label: '其他' },
  ];

  const serviceTypes = [
    { value: 'standard', label: '标准快递 (当日-次日)', basePrice: 5000 },
    { value: 'express', label: '特快专递 (2-4小时)', basePrice: 8000 },
    { value: 'same_day', label: '同城急送 (1-2小时)', basePrice: 12000 },
  ];

  const handleNext = () => {
    setActiveStep((prevActiveStep) => prevActiveStep + 1);
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const handleInputChange = (field: string, value: string) => {
    const newOrderData = {
      ...orderData,
      [field]: value
    };
    setOrderData(newOrderData);
    
    // 当地址和包裹信息完整时，实时计算价格
    if (newOrderData.senderAddress && newOrderData.receiverAddress && 
        newOrderData.packageType && newOrderData.weight && newOrderData.serviceType) {
      calculateOrderPrice();
    }
  };

  const calculateOrderPrice = () => {
    if (!orderData.senderAddress || !orderData.receiverAddress || 
        !orderData.packageType || !orderData.weight) return;
    
    const distance = calculateDistance(orderData.senderAddress, orderData.receiverAddress);
    const weight = parseFloat(orderData.weight) || 0;
    const price = calculateOrderAmount(distance, weight, orderData.packageType);
    
    // 根据服务类型调整价格
    const serviceType = serviceTypes.find(s => s.value === orderData.serviceType);
    const finalPrice = serviceType ? price + serviceType.basePrice : price;
    
    setCalculatedDistance(Math.round(distance * 10) / 10);
    setCalculatedPrice(finalPrice);
  };

  const handleSubmit = () => {
    try {
      // 生成订单号
      const orderId = generateOrderId();
      
      // 计算最终价格和距离
      const distance = calculateDistance(orderData.senderAddress, orderData.receiverAddress);
      const weight = parseFloat(orderData.weight) || 0;
      const basePrice = calculateOrderAmount(distance, weight, orderData.packageType);
      const serviceType = serviceTypes.find(s => s.value === orderData.serviceType);
      const finalPrice = serviceType ? basePrice + serviceType.basePrice : basePrice;
      
      // 创建完整订单对象
      const newOrder: OrderData = {
        orderId,
        customerName: orderData.senderName,
        customerPhone: orderData.senderPhone,
        senderAddress: orderData.senderAddress,
        receiverName: orderData.receiverName,
        receiverPhone: orderData.receiverPhone,
        receiverAddress: orderData.receiverAddress,
        packageType: orderData.packageType,
        weight: weight,
        description: orderData.description,
        serviceType: orderData.serviceType,
        distance: Math.round(distance * 10) / 10,
        amount: finalPrice,
        status: OrderStatus.PENDING,
        createdAt: formatMyanmarTime(),
        estimatedDelivery: getEstimatedDelivery(orderData.serviceType),
        notes: `客户下单 - ${formatMyanmarTime()}`,
      };
      
      // 保存到localStorage（模拟数据库）
      const existingOrders = JSON.parse(localStorage.getItem('courier_orders') || '[]');
      existingOrders.unshift(newOrder);
      localStorage.setItem('courier_orders', JSON.stringify(existingOrders));
      
      // 设置订单号并进入成功页面
      setSubmittedOrderId(orderId);
      setActiveStep(4);
      
      console.log('订单创建成功:', newOrder);
    } catch (error) {
      console.error('订单创建失败:', error);
      alert('订单创建失败，请重试');
    }
  };

  const getEstimatedDelivery = (serviceType: string): string => {
    const myanmarTime = new Date();
    myanmarTime.setTime(myanmarTime.getTime() + (6.5 * 60 * 60 * 1000)); // 缅甸时间
    
    switch (serviceType) {
      case 'same_day':
        myanmarTime.setHours(myanmarTime.getHours() + 2);
        break;
      case 'express':
        myanmarTime.setHours(myanmarTime.getHours() + 4);
        break;
      default:
        myanmarTime.setDate(myanmarTime.getDate() + 1);
        break;
    }
    
    return formatMyanmarTime(myanmarTime);
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
                          起价 {service.basePrice.toLocaleString()} MMK
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
            
            {/* 实时价格预览 */}
            {orderData.senderAddress && orderData.receiverAddress && 
             orderData.packageType && orderData.weight && orderData.serviceType && (
              <Grid item xs={12}>
                <Alert severity="info" sx={{ mt: 2 }}>
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    📍 预估距离: {calculatedDistance} km
                  </Typography>
                  <Typography variant="h6" color="primary">
                    💰 预估费用: {calculatedPrice.toLocaleString()} MMK
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    *最终价格可能根据实际情况调整
                  </Typography>
                </Alert>
              </Grid>
            )}
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
                    距离: {calculatedDistance} km
                  </Typography>
                  <Typography variant="body2">
                    描述: {orderData.description}
                  </Typography>
                  <Typography variant="body2">
                    服务: {serviceTypes.find(s => s.value === orderData.serviceType)?.label}
                  </Typography>
                  <Typography variant="h6" color="primary" sx={{ mt: 2 }}>
                    预估费用: {calculatedPrice > 0 ? `${calculatedPrice.toLocaleString()} MMK` : '计算中...'}
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
            <Typography variant="h6" color="primary" sx={{ mb: 2, fontWeight: 600 }}>
              订单号: {submittedOrderId}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              我们已收到您的订单，客服人员将在30分钟内联系您确认详细信息。
            </Typography>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                onClick={() => navigate('/tracking')}
              >
                查询订单
              </Button>
              <Button 
                variant="outlined" 
                onClick={() => navigate('/admin/orders')}
              >
                查看管理后台
              </Button>
            </Box>
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
