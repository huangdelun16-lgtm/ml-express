import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAccountService, AdminAccount } from '../services/supabase';
import { fileUploadService } from '../services/FileUploadService';
import { imageCompressionService, CompressionResult } from '../services/ImageCompressionService';
import { fileValidationService } from '../services/FileValidationService';
import { BatchProgress, UploadProgress } from '../components/UploadProgress';
import { useResponsive } from '../hooks/useResponsive';

const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '眉苗', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' }
];

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [viewingAccount, setViewingAccount] = useState<AdminAccount | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showCvUploadModal, setShowCvUploadModal] = useState(false);
  const [showCvViewModal, setShowCvViewModal] = useState(false);
  const [cvImages, setCvImages] = useState<string[]>([]);
  const [uploadingCv, setUploadingCv] = useState(false);
  const [uploadProgresses, setUploadProgresses] = useState<UploadProgress[]>([]);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [compressionResults, setCompressionResults] = useState<CompressionResult[]>([]);
  const [notification, setNotification] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>({ show: false, message: '', type: 'info' });

  // 显示通知
  const showNotification = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // 显示确认对话框
  const showConfirmDialog = (message: string): Promise<boolean> => {
    return new Promise((resolve) => {
      const result = window.confirm(message);
      resolve(result);
    });
  };

  const [formData, setFormData] = useState({
    username: '',
    password: '',
    employee_name: '',
    employee_id: '',
    phone: '',
    email: '',
    department: '',
    position: '',
    salary: '',
    role: 'operator' as 'admin' | 'manager' | 'operator' | 'finance',
    hire_date: new Date().toISOString().split('T')[0],
    id_number: '',
    emergency_contact: '',
    emergency_phone: '',
    address: '',
    notes: '',
    region: 'yangon'
  });

  const [editFormData, setEditFormData] = useState({
    username: '',
    password: '',
    employee_name: ''
  });

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const data = await adminAccountService.getAllAccounts();
    setAccounts(data);
    setLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    // 当选择区域、职位或角色时，自动生成员工编号
    if (name === 'region' || name === 'position' || name === 'role') {
      setFormData(prev => {
        const newData = { ...prev, [name]: value };
        // 如果三个字段都有值，自动生成员工编号
        if (newData.region && newData.position && newData.role) {
          const autoId = generateEmployeeId(newData.region, newData.position, newData.role);
          return { ...newData, employee_id: autoId };
        }
        return newData;
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // 自动生成员工编号
  const generateEmployeeId = (regionId: string, position: string, role: string): string => {
    const region = REGIONS.find(r => r.id === regionId);
    const regionPrefix = region ? region.prefix : 'MDY';
    
    // 根据角色确定职位类型
    let positionType = '';
    if (position.includes('骑手') || position === '骑手') {
      positionType = 'RIDER';
    } else if (role === 'finance' || position.includes('财务')) {
      positionType = 'ACCOUNT';
    } else if (role === 'manager' || position.includes('经理')) {
      positionType = 'MANAGER';
    } else if (role === 'admin' || position.includes('管理员')) {
      positionType = 'ADMIN';
    } else {
      positionType = 'STAFF';
    }
    
    // 获取该区域该类型的现有账号数量
    const filteredAccounts = accounts.filter(acc => {
      const idPrefix = `${regionPrefix}-${positionType}`;
      return acc.employee_id && acc.employee_id.startsWith(idPrefix);
    });
    
    // 生成下一个编号
    const nextNumber = (filteredAccounts.length + 1).toString().padStart(3, '0');
    return `${regionPrefix}-${positionType}-${nextNumber}`;
  };

  const tableHeaderStyle: React.CSSProperties = {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '0.75rem',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.5)',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    borderBottom: '1px solid rgba(255,255,255,0.1)'
  };

  const tableCellStyle: React.CSSProperties = {
    padding: '16px',
    fontSize: '0.9rem',
    color: 'white',
    verticalAlign: 'middle'
  };

  const actionButtonStyle = (color: string): React.CSSProperties => ({
    background: 'rgba(255,255,255,0.05)',
    border: `1px solid ${color}44`,
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s',
    fontSize: '1rem',
    color: color
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    try {
      // 自动生成员工编号（如果没有手动输入）
      const autoEmployeeId = generateEmployeeId(formData.region, formData.position, formData.role);
      
      const newAccount = {
        username: formData.username,
        password: formData.password,
        employee_name: formData.employee_name,
        employee_id: formData.employee_id || autoEmployeeId,
        phone: formData.phone,
        email: formData.email,
        department: formData.department,
        position: formData.position,
        salary: formData.salary ? Number(formData.salary) : undefined,
        role: formData.role,
        hire_date: formData.hire_date,
        id_number: formData.id_number,
        emergency_contact: formData.emergency_contact,
        emergency_phone: formData.emergency_phone,
        address: formData.address,
        notes: formData.notes,
        region: formData.region
      };

      await adminAccountService.createAccount(newAccount);
      setSuccessMessage(`账号创建成功！员工编号：${formData.employee_id || autoEmployeeId}`);
      setFormData({
        username: '',
        password: '',
        employee_name: '',
        employee_id: '',
        phone: '',
        email: '',
        department: '',
        position: '',
        salary: '',
        role: 'operator',
        hire_date: new Date().toISOString().split('T')[0],
        id_number: '',
        emergency_contact: '',
        emergency_phone: '',
        address: '',
        notes: '',
        region: 'yangon'
      });
      setShowForm(false);
      loadAccounts();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error: any) {
      setErrorMessage(error.message || '创建账号失败');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const handleViewAccount = (account: AdminAccount) => {
    setViewingAccount(account);
    setShowViewModal(true);
  };

  const handleEditAccount = (account: AdminAccount) => {
    setEditingAccount(account);
    setEditFormData({
      username: account.username,
      password: '', // 不显示原密码
      employee_name: account.employee_name
    });
    setShowEditModal(true);
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      const updateData: Partial<AdminAccount> = {
        username: editFormData.username,
        employee_name: editFormData.employee_name
      };

      // 只有在输入了新密码时才更新密码
      if (editFormData.password.trim()) {
        updateData.password = editFormData.password;
      }

      await adminAccountService.updateAccount(editingAccount.id!, updateData);
      await loadAccounts();
      setShowEditModal(false);
      setEditingAccount(null);
      setEditFormData({ username: '', password: '', employee_name: '' });
      showNotification('账号信息更新成功！', 'success');
    } catch (error) {
      console.error('更新账号失败:', error);
      showNotification('更新账号失败，请重试', 'error');
    }
  };

  const handleStatusChange = async (id: string, newStatus: 'active' | 'inactive' | 'suspended') => {
    const success = await adminAccountService.updateAccountStatus(id, newStatus);
    if (success) {
      loadAccounts();
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  const filteredAccounts = accounts.filter(acc => {
    const matchesSearch = acc.username.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         acc.employee_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         acc.employee_id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || acc.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#48bb78';
      case 'inactive': return '#ed8936';
      case 'suspended': return '#f56565';
      default: return '#a0aec0';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#9f7aea';
      case 'manager': return '#4299e1';
      case 'operator': return '#48bb78';
      case 'finance': return '#ed8936';
      default: return '#a0aec0';
    }
  };

  // 处理CV文件上传
  const handleCvFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const fileArray = Array.from(files);
    
    // 第一步：文件验证
    const validationResult = fileValidationService.validateFiles(fileArray);
    
    if (!validationResult.valid) {
      // 显示验证错误
      const errorMessage = validationResult.allErrors.join('\n');
      showNotification(`文件验证失败：${errorMessage}`, 'error');
      return;
    }

    // 显示警告（如果有）
    if (validationResult.allWarnings.length > 0) {
      const warningMessage = validationResult.allWarnings.join('\n');
      const proceed = await showConfirmDialog(`发现以下警告，是否继续上传？\n\n${warningMessage}`);
      if (!proceed) return;
    }

    setSelectedFiles(fileArray);
    
    // 初始化进度状态
    const initialProgresses: UploadProgress[] = fileArray.map(file => ({
      fileName: file.name,
      progress: 0,
      status: 'pending',
      fileSize: file.size
    }));
    setUploadProgresses(initialProgresses);
    setShowUploadProgress(true);

    try {
      // 第二步：压缩图片
      const compressionResults = await imageCompressionService.compressImages(fileArray);
      setCompressionResults(compressionResults);

      // 更新进度状态
      const compressionProgresses: UploadProgress[] = compressionResults.map((result, index) => ({
        fileName: fileArray[index].name,
        progress: result.success ? 30 : 0,
        status: (result.success ? 'pending' : 'error') as 'pending' | 'uploading' | 'completed' | 'error',
        error: result.error,
        fileSize: fileArray[index].size
      }));
      setUploadProgresses(compressionProgresses);

      // 第三步：上传文件
      const filesToUpload = compressionResults
        .filter(result => result.success)
        .map(result => result.compressedFile!);

      if (filesToUpload.length === 0) {
        showNotification('所有文件压缩失败', 'error');
        return;
      }

      // 创建上传进度跟踪
      const uploadProgresses = filesToUpload.map(file => ({
        fileName: file.name,
        progress: 30,
        status: 'uploading' as const,
        fileSize: file.size
      }));
      setUploadProgresses(uploadProgresses);

      // 执行上传
      const uploadResults = await fileUploadService.uploadFiles(filesToUpload, formData.employee_id);

      // 更新最终进度状态
      const finalProgresses: UploadProgress[] = uploadResults.results.map((result, index) => ({
        fileName: filesToUpload[index].name,
        progress: result.success ? 100 : 0,
        status: (result.success ? 'completed' : 'error') as 'pending' | 'uploading' | 'completed' | 'error',
        error: result.error,
        fileSize: filesToUpload[index].size
      }));
      setUploadProgresses(finalProgresses);

      // 收集成功上传的URL
      const successfulUrls = uploadResults.results
        .filter(result => result.success)
        .map(result => result.url!);

      if (successfulUrls.length > 0) {
        setCvImages(prev => [...prev, ...successfulUrls]);
        showNotification(`成功上传 ${successfulUrls.length} 个文件`, 'success');
      }

      if (uploadResults.errorCount > 0) {
        showNotification(`${uploadResults.errorCount} 个文件上传失败`, 'warning');
      }

    } catch (error: any) {
      console.error('文件处理失败:', error);
      showNotification(`文件处理失败: ${error.message}`, 'error');
      
      // 更新所有进度为错误状态
      const errorProgresses = fileArray.map(file => ({
        fileName: file.name,
        progress: 0,
        status: 'error' as const,
        error: error.message,
        fileSize: file.size
      }));
      setUploadProgresses(errorProgresses);
    }
  };

  // 保存CV图片
  const handleSaveCvImages = async () => {
    if (cvImages.length === 0) {
      showNotification('请先上传CV Form', 'warning');
      return;
    }

    setUploadingCv(true);
    try {
      // 这里应该将CV图片URL保存到员工记录中
      // 由于当前没有员工ID，我们暂时保存到本地状态
      // 在实际应用中，应该在创建员工时一起保存CV图片
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟保存延迟
      
      showNotification('CV Form保存成功！', 'success');
      setShowCvUploadModal(false);
      setCvImages([]);
      setUploadProgresses([]);
      setShowUploadProgress(false);
      setSelectedFiles([]);
      setCompressionResults([]);
    } catch (error) {
      console.error('保存CV Form失败:', error);
      showNotification('保存CV Form失败，请重试', 'error');
    } finally {
      setUploadingCv(false);
    }
  };

  // 删除CV图片
  const handleDeleteCvImage = async (imageUrl: string, index: number) => {
    try {
      // 从Supabase Storage删除文件
      const deleteResult = await fileUploadService.deleteFile(imageUrl);
      
      if (deleteResult.success) {
        // 从本地状态中移除
        const newImages = cvImages.filter((_, i) => i !== index);
        setCvImages(newImages);
        showNotification('图片删除成功', 'success');
      } else {
        showNotification(`删除失败: ${deleteResult.error}`, 'error');
      }
    } catch (error: any) {
      console.error('删除图片失败:', error);
      showNotification(`删除失败: ${error.message}`, 'error');
    }
  };

  // 取消上传
  const handleCancelUpload = () => {
    setShowUploadProgress(false);
    setUploadProgresses([]);
    setSelectedFiles([]);
    setCompressionResults([]);
  };

  // 重试上传
  const handleRetryUpload = async () => {
    if (selectedFiles.length === 0) return;
    
    // 重新处理失败的文件
    const failedProgresses = uploadProgresses.filter(p => p.status === 'error');
    const failedFileNames = failedProgresses.map(p => p.fileName);
    const failedFiles = selectedFiles.filter(file => failedFileNames.includes(file.name));

    if (failedFiles.length === 0) return;

    // 直接处理失败的文件，而不是模拟事件
    const fileArray = failedFiles;
    
    // 第一步：文件验证
    const validationResult = fileValidationService.validateFiles(fileArray);
    
    if (!validationResult.valid) {
      const errorMessage = validationResult.allErrors.join('\n');
      showNotification(`文件验证失败：${errorMessage}`, 'error');
      return;
    }

    setShowUploadProgress(true);

    try {
      // 第二步：压缩图片
      const compressionResults = await imageCompressionService.compressImages(fileArray);
      
      // 第三步：上传文件
      const filesToUpload = compressionResults
        .filter(result => result.success)
        .map(result => result.compressedFile!);

      if (filesToUpload.length === 0) {
        showNotification('所有文件压缩失败', 'error');
        return;
      }

      // 执行上传
      const uploadResults = await fileUploadService.uploadFiles(filesToUpload, formData.employee_id);

      // 更新进度状态
      const retryProgresses: UploadProgress[] = uploadResults.results.map((result, index) => ({
        fileName: filesToUpload[index].name,
        progress: result.success ? 100 : 0,
        status: (result.success ? 'completed' : 'error') as 'pending' | 'uploading' | 'completed' | 'error',
        error: result.error,
        fileSize: filesToUpload[index].size
      }));
      
      // 更新uploadProgresses，替换失败的文件进度
      const updatedProgresses = uploadProgresses.map(p => {
        const retryProgress = retryProgresses.find(rp => rp.fileName === p.fileName);
        return retryProgress || p;
      });
      setUploadProgresses(updatedProgresses);

      // 收集成功上传的URL
      const successfulUrls = uploadResults.results
        .filter(result => result.success)
        .map(result => result.url!);

      if (successfulUrls.length > 0) {
        setCvImages(prev => [...prev, ...successfulUrls]);
        showNotification(`重试成功上传 ${successfulUrls.length} 个文件`, 'success');
      }

      if (uploadResults.errorCount > 0) {
        showNotification(`${uploadResults.errorCount} 个文件重试失败`, 'warning');
      }

    } catch (error: any) {
      console.error('重试上传失败:', error);
      showNotification(`重试失败: ${error.message}`, 'error');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0f172a 0%, #1a202c 50%, #2d3748 100%)',
      padding: isMobile ? '16px' : '40px',
      color: 'white',
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '40px',
          background: 'rgba(255,255,255,0.03)',
          padding: '24px 32px',
          borderRadius: '20px',
          border: '1px solid rgba(255,255,255,0.08)',
          backdropFilter: 'blur(10px)'
        }}>
          <div>
            <h1 style={{ fontSize: isMobile ? '1.8rem' : '2.5rem', fontWeight: 800, margin: 0, letterSpacing: '-0.5px' }}>
              账号管理 <span style={{ color: '#4299e1', fontSize: '1rem', fontWeight: 500, verticalAlign: 'middle', marginLeft: '12px' }}>Account Management</span>
            </h1>
            <p style={{ margin: '8px 0 0 0', opacity: 0.6, fontSize: '1rem' }}>管理系统管理员、运营经理、操作员及财务人员账号权限</p>
          </div>
          <div style={{ display: 'flex', gap: isMobile ? '12px' : '16px' }}>
            <button
              onClick={() => setShowForm(!showForm)}
              style={{
                background: showForm ? 'rgba(255,255,255,0.1)' : 'linear-gradient(135deg, #3182ce 0%, #2c5282 100%)',
                color: 'white',
                border: showForm ? '1px solid rgba(255,255,255,0.2)' : 'none',
                padding: '12px 28px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 600,
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: showForm ? 'none' : '0 10px 20px rgba(49, 130, 206, 0.3)'
              }}
            >
              <span>{showForm ? '✕ 取消' : '➕ 创建账号'}</span>
            </button>
            <button
              onClick={() => navigate('/admin/dashboard')}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.15)',
                padding: '12px 24px',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '1rem',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
            >
              返回主页
            </button>
          </div>
        </div>

        {successMessage && (
          <div style={{
            background: 'rgba(72, 187, 120, 0.2)',
            border: '1px solid rgba(72, 187, 120, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#68d391'
          }}>
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div style={{
            background: 'rgba(245, 101, 101, 0.2)',
            border: '1px solid rgba(245, 101, 101, 0.5)',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px',
            color: '#fc8181'
          }}>
            {errorMessage}
          </div>
        )}

        {showForm && (
          <div style={{
            background: 'rgba(15, 32, 60, 0.5)',
            borderRadius: '20px',
            padding: isMobile ? '24px' : '32px',
            marginBottom: '32px',
            border: '1px solid rgba(255,255,255,0.15)',
            boxShadow: '0 15px 35px rgba(0,0,0,0.3)',
            backdropFilter: 'blur(20px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '16px' }}>
              <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '1.8rem' }}>📝</span> 创建新员工账号
              </h2>
              {/* 区域选择下拉框 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255,255,255,0.05)', padding: '6px 16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <label style={{ fontSize: '0.9rem', fontWeight: 600, color: 'rgba(255,255,255,0.7)' }}>工作区域：</label>
                <select
                  name="region"
                  value={formData.region}
                  onChange={handleInputChange}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(66, 153, 225, 0.2)',
                    color: '#63b3ed',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                >
                  {REGIONS.map(r => (
                    <option key={r.id} value={r.id} style={{ color: '#000' }}>
                      {r.name} ({r.prefix})
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: isMobile ? '12px' : '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    用户名 *
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    密码 *
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    员工姓名 *
                  </label>
                  <input
                    type="text"
                    name="employee_name"
                    value={formData.employee_name}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    员工编号 * （自动生成）
                  </label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    readOnly
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(72, 187, 120, 0.5)',
                      background: 'rgba(72, 187, 120, 0.1)',
                      color: '#48bb78',
                      fontSize: '1rem',
                      outline: 'none',
                      fontWeight: 'bold',
                      cursor: 'not-allowed'
                    }}
                    placeholder="请先选择区域、职位和角色"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    部门 *
                  </label>
                  <select
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="" style={{ color: '#000' }}>请选择部门</option>
                    <option value="运营部" style={{ color: '#000' }}>运营部</option>
                    <option value="配送部" style={{ color: '#000' }}>配送部</option>
                    <option value="客服部" style={{ color: '#000' }}>客服部</option>
                    <option value="财务部" style={{ color: '#000' }}>财务部</option>
                    <option value="技术部" style={{ color: '#000' }}>技术部</option>
                    <option value="人事部" style={{ color: '#000' }}>人事部</option>
                    <option value="市场部" style={{ color: '#000' }}>市场部</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    职位 *
                  </label>
                  <select
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none',
                      cursor: 'pointer'
                    }}
                    required
                  >
                    <option value="" style={{ color: '#000' }}>请选择职位</option>
                    <option value="总经理" style={{ color: '#000' }}>总经理</option>
                    <option value="部门经理" style={{ color: '#000' }}>部门经理</option>
                    <option value="主管" style={{ color: '#000' }}>主管</option>
                    <option value="骑手队长" style={{ color: '#000' }}>骑手队长</option>
                    <option value="骑手" style={{ color: '#000' }}>骑手</option>
                    <option value="客服专员" style={{ color: '#000' }}>客服专员</option>
                    <option value="财务专员" style={{ color: '#000' }}>财务专员</option>
                    <option value="技术专员" style={{ color: '#000' }}>技术专员</option>
                    <option value="操作员" style={{ color: '#000' }}>操作员</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    角色 *
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  >
                    <option value="operator">操作员</option>
                    <option value="manager">经理</option>
                    <option value="admin">管理员</option>
                    <option value="finance">财务</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    手机号码
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    邮箱
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', gap: isMobile ? '12px' : '16px', justifyContent: 'center' }}>
                <button
                  type="submit"
                  style={{
                    background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  创建账号
                </button>
                <button
                  type="button"
                  onClick={() => setShowCvUploadModal(true)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  📄 上传CV Form
                </button>
              </div>
            </form>
          </div>
        )}

        <div style={{
          background: 'rgba(15, 32, 60, 0.45)',
          borderRadius: '20px',
          padding: isMobile ? '20px' : '32px',
          border: '1px solid rgba(255,255,255,0.12)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.25)',
          backdropFilter: 'blur(15px)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '28px',
            flexWrap: 'wrap',
            gap: '20px'
          }}>
            <h2 style={{ margin: 0, fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.8rem' }}>👥</span> 现有账号列表
              <span style={{ 
                fontSize: '0.9rem', 
                background: 'rgba(255,255,255,0.1)', 
                padding: '4px 12px', 
                borderRadius: '20px',
                fontWeight: 400,
                opacity: 0.8
              }}>
                共 {filteredAccounts.length} 个账号
              </span>
            </h2>

            <div style={{ display: 'flex', gap: '12px', flex: isMobile ? '1 1 100%' : 'none' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}>🔍</span>
                <input
                  type="text"
                  placeholder="搜索用户名/姓名/编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    padding: '10px 12px 10px 36px',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(0,0,0,0.2)',
                    color: 'white',
                    width: isMobile ? '100%' : '260px',
                    outline: 'none',
                    transition: 'all 0.2s'
                  }}
                  onFocus={(e) => e.target.style.borderColor = '#4299e1'}
                  onBlur={(e) => e.target.style.borderColor = 'rgba(255,255,255,0.2)'}
                />
              </div>
              <select
                value={filterRole}
                onChange={(e) => setFilterRole(e.target.value)}
                style={{
                  padding: '10px 16px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(0,0,0,0.2)',
                  color: 'white',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                <option value="all" style={{ color: '#000' }}>所有角色</option>
                <option value="admin" style={{ color: '#000' }}>管理员</option>
                <option value="manager" style={{ color: '#000' }}>经理</option>
                <option value="operator" style={{ color: '#000' }}>操作员</option>
                <option value="finance" style={{ color: '#000' }}>财务</option>
              </select>
            </div>
          </div>
          
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px' }}>
              <div className="loader" style={{ marginBottom: '16px' }}></div>
              <div style={{ fontSize: '1.1rem', opacity: 0.7 }}>正在加载数据...</div>
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '80px 40px',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '16px',
              border: '1px dashed rgba(255,255,255,0.1)'
            }}>
              <div style={{ fontSize: '3rem', marginBottom: '16px', opacity: 0.5 }}>🔎</div>
              <div style={{ fontSize: '1.2rem', color: 'rgba(255,255,255,0.6)' }}>未找到符合条件的账号</div>
              {searchTerm && (
                <button 
                  onClick={() => {setSearchTerm(''); setFilterRole('all');}}
                  style={{ 
                    marginTop: '16px', 
                    background: 'none', 
                    border: '1px solid rgba(255,255,255,0.3)', 
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  重置筛选
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: '12px' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 8px' }}>
                <thead>
                  <tr>
                    <th style={tableHeaderStyle}>员工信息</th>
                    <th style={tableHeaderStyle}>所属区域</th>
                    <th style={tableHeaderStyle}>员工编号</th>
                    <th style={tableHeaderStyle}>职位/部门</th>
                    <th style={tableHeaderStyle}>角色权限</th>
                    <th style={tableHeaderStyle}>当前状态</th>
                    <th style={tableHeaderStyle}>最后登录</th>
                    <th style={{ ...tableHeaderStyle, textAlign: 'center' }}>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id} style={{ 
                      background: 'rgba(255,255,255,0.04)',
                      transition: 'all 0.2s',
                      cursor: 'default'
                    }} 
                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
                    >
                      <td style={{ ...tableCellStyle, borderRadius: '12px 0 0 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{ 
                            width: '36px', 
                            height: '36px', 
                            borderRadius: '50%', 
                            background: getRoleColor(account.role),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '1.1rem',
                            fontWeight: 'bold',
                            boxShadow: '0 4px 10px rgba(0,0,0,0.2)'
                          }}>
                            {account.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{account.employee_name}</div>
                            <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>@{account.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ fontSize: '1rem' }}>📍</span>
                          <span style={{ fontWeight: 'bold', color: '#48bb78' }}>
                            {REGIONS.find(r => r.id === account.region)?.prefix || account.region || '-'}
                          </span>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <code style={{ 
                          background: 'rgba(0,0,0,0.3)', 
                          padding: '3px 8px', 
                          borderRadius: '4px',
                          fontSize: '0.85rem',
                          color: '#63b3ed',
                          fontFamily: 'monospace'
                        }}>
                          {account.employee_id}
                        </code>
                      </td>
                      <td style={tableCellStyle}>
                        <div>{account.position || '-'}</div>
                        <div style={{ fontSize: '0.75rem', opacity: 0.5 }}>{account.department || '-'}</div>
                      </td>
                      <td style={tableCellStyle}>
                        <span style={{
                          background: `${getRoleColor(account.role)}33`, // 20% opacity
                          color: getRoleColor(account.role),
                          border: `1px solid ${getRoleColor(account.role)}66`,
                          padding: '4px 10px',
                          borderRadius: '20px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {account.role === 'admin' ? '系统管理员' : 
                           account.role === 'manager' ? '经理' : 
                           account.role === 'operator' ? '操作员' : 
                           account.role === 'finance' ? '财务人员' : account.role}
                        </span>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ position: 'relative' }}>
                          <select
                            value={account.status || 'active'}
                            onChange={(e) => handleStatusChange(account.id!, e.target.value as 'active' | 'inactive' | 'suspended')}
                            style={{
                              background: getStatusColor(account.status || 'active'),
                              color: 'white',
                              border: 'none',
                              padding: '4px 24px 4px 10px',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              cursor: 'pointer',
                              appearance: 'none',
                              outline: 'none',
                              boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
                            }}
                          >
                            <option value="active">🟢 正常</option>
                            <option value="inactive">🟠 停用</option>
                            <option value="suspended">🔴 暂停</option>
                          </select>
                          <div style={{ 
                            position: 'absolute', 
                            right: '8px', 
                            top: '50%', 
                            transform: 'translateY(-50%)',
                            pointerEvents: 'none',
                            fontSize: '0.6rem'
                          }}>▼</div>
                        </div>
                      </td>
                      <td style={tableCellStyle}>
                        <div style={{ fontSize: '0.85rem' }}>
                          {account.last_login ? new Date(account.last_login).toLocaleDateString('zh-CN') : '-'}
                        </div>
                        <div style={{ fontSize: '0.7rem', opacity: 0.5 }}>
                          {account.last_login ? new Date(account.last_login).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }) : '从未登录'}
                        </div>
                      </td>
                      <td style={{ ...tableCellStyle, borderRadius: '0 12px 12px 0', textAlign: 'center' }}>
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                          <button
                            onClick={() => handleViewAccount(account)}
                            title="查看详情"
                            style={actionButtonStyle('#4299e1')}
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleEditAccount(account)}
                            title="编辑账号"
                            style={actionButtonStyle('#48bb78')}
                          >
                            ✏️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 编辑账号模态框 */}
        {showEditModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
              borderRadius: '16px',
              padding: '32px',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)'
            }}>
              <h2 style={{ marginBottom: '24px', textAlign: 'center' }}>编辑账号信息</h2>
              <form onSubmit={handleUpdateAccount}>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    用户名 *
                  </label>
                  <input
                    type="text"
                    value={editFormData.username}
                    onChange={(e) => setEditFormData({...editFormData, username: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    员工姓名 *
                  </label>
                  <input
                    type="text"
                    value={editFormData.employee_name}
                    onChange={(e) => setEditFormData({...editFormData, employee_name: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                    required
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>
                    新密码 (留空则不修改)
                  </label>
                  <input
                    type="password"
                    value={editFormData.password}
                    onChange={(e) => setEditFormData({...editFormData, password: e.target.value})}
                    placeholder="输入新密码或留空保持不变"
                    style={{
                      width: '100%',
                      padding: '12px',
                      borderRadius: '8px',
                      border: '1px solid rgba(255,255,255,0.25)',
                      background: 'rgba(15, 32, 60, 0.55)',
                      color: 'white',
                      fontSize: '1rem',
                      outline: 'none'
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    type="submit"
                    style={{
                      background: 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    保存修改
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingAccount(null);
                      setEditFormData({ username: '', password: '', employee_name: '' });
                    }}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)',
                      padding: '12px 24px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '1rem'
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 查看员工详情模态框 */}
        {showViewModal && viewingAccount && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              backdropFilter: 'blur(5px)'
            }}
          >
            <div
              style={{
                background: 'rgba(15, 32, 60, 0.85)',
                borderRadius: '16px',
                padding: '32px',
                width: '90%',
                maxWidth: '700px',
                maxHeight: '85vh',
                overflowY: 'auto',
                border: '1px solid rgba(255,255,255,0.2)',
                color: 'white',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>员工详细信息</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
                >
                  ×
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                {/* 基本信息 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: isMobile ? '12px' : '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#60a5fa' }}>基本信息</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>员工姓名：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.employee_name}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>所属区域：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                        {REGIONS.find(r => r.id === viewingAccount.region)?.name || viewingAccount.region || '未填写'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>员工编号：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.employee_id}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>用户名：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.username}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>身份证号：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.id_number || '未填写'}</span>
                    </div>
                  </div>
                </div>

                {/* 职位信息 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: isMobile ? '12px' : '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#34d399' }}>职位信息</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>部门：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.department || '未分配'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>职位：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.position || '未分配'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>角色：</span>
                      <span style={{ 
                        fontSize: '1rem', 
                        fontWeight: 500,
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: viewingAccount.role === 'admin' ? 'rgba(239, 68, 68, 0.2)' : 
                                   viewingAccount.role === 'manager' ? 'rgba(245, 158, 11, 0.2)' :
                                   viewingAccount.role === 'finance' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                        color: viewingAccount.role === 'admin' ? '#fca5a5' : 
                               viewingAccount.role === 'manager' ? '#fbbf24' :
                               viewingAccount.role === 'finance' ? '#86efac' : '#93c5fd'
                      }}>
                        {viewingAccount.role === 'admin' ? '系统管理员' : 
                         viewingAccount.role === 'manager' ? '经理' :
                         viewingAccount.role === 'finance' ? '财务' : '操作员'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>入职日期：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                        {viewingAccount.hire_date ? new Date(viewingAccount.hire_date).toLocaleDateString('zh-CN') : '未填写'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 联系信息 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: isMobile ? '12px' : '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#f59e0b' }}>联系信息</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>手机号码：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.phone || '未填写'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>邮箱地址：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.email || '未填写'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>家庭地址：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500, wordBreak: 'break-all' }}>
                        {viewingAccount.address || '未填写'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 薪资与紧急联系人 */}
                <div style={{ 
                  background: 'rgba(255,255,255,0.05)', 
                  padding: isMobile ? '12px' : '20px', 
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#ec4899' }}>薪资与紧急联系</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>薪资：</span>
                      <span style={{ 
                        fontSize: '1.1rem', 
                        fontWeight: 600,
                        color: '#10b981'
                      }}>
                        {viewingAccount.salary ? `¥${viewingAccount.salary.toLocaleString()}` : '未设置'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>紧急联系人：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.emergency_contact || '未填写'}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>紧急联系电话：</span>
                      <span style={{ fontSize: '1rem', fontWeight: 500 }}>{viewingAccount.emergency_phone || '未填写'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 账号状态与备注 */}
              <div style={{ 
                marginTop: '24px',
                background: 'rgba(255,255,255,0.05)', 
                padding: isMobile ? '12px' : '20px', 
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#8b5cf6' }}>账号状态与备注</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: isMobile ? '12px' : '16px', marginBottom: '16px' }}>
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>账号状态：</span>
                    <span style={{ 
                      fontSize: '1rem', 
                      fontWeight: 500,
                      padding: '4px 8px',
                      borderRadius: '4px',
                      background: viewingAccount.status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 
                                 viewingAccount.status === 'inactive' ? 'rgba(156, 163, 175, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                      color: viewingAccount.status === 'active' ? '#86efac' : 
                             viewingAccount.status === 'inactive' ? '#d1d5db' : '#fca5a5'
                    }}>
                      {viewingAccount.status === 'active' ? '正常' : 
                       viewingAccount.status === 'inactive' ? '停用' : '暂停'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>创建时间：</span>
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                      {viewingAccount.created_at ? new Date(viewingAccount.created_at).toLocaleDateString('zh-CN') : '未知'}
                    </span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>最后登录：</span>
                    <span style={{ fontSize: '1rem', fontWeight: 500 }}>
                      {viewingAccount.last_login ? new Date(viewingAccount.last_login).toLocaleString('zh-CN') : '从未登录'}
                    </span>
                  </div>
                </div>
                {viewingAccount.notes && (
                  <div>
                    <span style={{ fontSize: '0.9rem', opacity: 0.7 }}>备注信息：</span>
                    <div style={{ 
                      marginTop: '8px',
                      padding: '12px',
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '8px',
                      fontSize: '1rem',
                      lineHeight: '1.5',
                      wordBreak: 'break-all'
                    }}>
                      {viewingAccount.notes}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', gap: isMobile ? '12px' : '16px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setCvImages(viewingAccount.cv_images || []);
                    setShowCvViewModal(true);
                  }}
                  style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.target as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  📄 查看CV Form
                </button>
                <button
                  onClick={() => setShowViewModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500,
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(-2px)';
                    (e.target as HTMLButtonElement).style.boxShadow = '0 8px 20px rgba(102, 126, 234, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.transform = 'translateY(0)';
                    (e.target as HTMLButtonElement).style.boxShadow = 'none';
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CV Form 上传模态框 */}
        {showCvUploadModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.7)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(15, 32, 60, 0.95)',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '800px',
              maxHeight: '85vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>📄 上传员工CV Form</h2>
                <button
                  onClick={() => setShowCvUploadModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
                >
                  ×
                </button>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                border: '2px dashed rgba(255,255,255,0.3)'
              }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                  <div style={{ fontSize: '48px', marginBottom: '16px' }}>📁</div>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>拖拽文件到此处或点击上传</h3>
                  <p style={{ margin: 0, opacity: 0.7, fontSize: '0.9rem' }}>
                    支持 JPG、PNG、PDF 格式，单个文件不超过 10MB
                  </p>
                </div>
                
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleCvFileUpload}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255,255,255,0.25)',
                    background: 'rgba(15, 32, 60, 0.55)',
                    color: 'white',
                    fontSize: '1rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                />
              </div>

              {/* 上传进度显示 */}
              {showUploadProgress && uploadProgresses.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <BatchProgress
                    progresses={uploadProgresses}
                    onCancelAll={handleCancelUpload}
                    onRetryAll={handleRetryUpload}
                  />
                </div>
              )}

              {/* 已上传的CV图片预览 */}
              {cvImages.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#60a5fa' }}>
                    已上传的CV Form ({cvImages.length} 张)
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                    gap: isMobile ? '12px' : '16px'
                  }}>
                    {cvImages.map((image, index) => (
                      <div key={index} style={{
                        position: 'relative',
                        background: 'rgba(255,255,255,0.05)',
                        borderRadius: '8px',
                        padding: '8px',
                        border: '1px solid rgba(255,255,255,0.1)'
                      }}>
                        <img
                          src={image}
                          alt={`CV Form ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setCvImages([image]);
                            setShowCvViewModal(true);
                          }}
                        />
                        <button
                          onClick={() => handleDeleteCvImage(image, index)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            background: 'rgba(239, 68, 68, 0.8)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          ×
                        </button>
                        <div style={{
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          marginTop: '8px',
                          opacity: 0.7
                        }}>
                          CV Form {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={() => {
                    setCvImages([]);
                    setShowCvUploadModal(false);
                    setUploadProgresses([]);
                    setShowUploadProgress(false);
                    setSelectedFiles([]);
                    setCompressionResults([]);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  取消
                </button>
                <button
                  onClick={handleSaveCvImages}
                  disabled={cvImages.length === 0 || uploadingCv}
                  style={{
                    background: uploadingCv ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #38a169 0%, #48bb78 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    cursor: uploadingCv ? 'not-allowed' : 'pointer',
                    fontSize: '1rem',
                    fontWeight: 600,
                    opacity: uploadingCv ? 0.6 : 1
                  }}
                >
                  {uploadingCv ? '保存中...' : '保存CV Form'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* CV Form 查看模态框 */}
        {showCvViewModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1000
          }}>
            <div style={{
              background: 'rgba(15, 32, 60, 0.95)',
              borderRadius: '16px',
              padding: '24px',
              width: '95%',
              maxWidth: '1200px',
              maxHeight: '90vh',
              overflowY: 'auto',
              border: '1px solid rgba(255,255,255,0.2)',
              color: 'white',
              boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
              backdropFilter: 'blur(10px)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 600 }}>📄 员工CV Form</h2>
                <button
                  onClick={() => setShowCvViewModal(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'white',
                    fontSize: '28px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.target as HTMLButtonElement).style.background = 'rgba(255,255,255,0.1)'}
                  onMouseLeave={(e) => (e.target as HTMLButtonElement).style.background = 'transparent'}
                >
                  ×
                </button>
              </div>

              {cvImages.length > 0 ? (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: isMobile ? '12px' : '20px'
                }}>
                  {cvImages.map((image, index) => (
                    <div key={index} style={{
                      background: 'rgba(255,255,255,0.05)',
                      borderRadius: '12px',
                      padding: '16px',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                      <div style={{
                        fontSize: '0.9rem',
                        marginBottom: '12px',
                        opacity: 0.7,
                        textAlign: 'center'
                      }}>
                        CV Form {index + 1}
                      </div>
                      <img
                        src={image}
                        alt={`CV Form ${index + 1}`}
                        style={{
                          width: '100%',
                          height: 'auto',
                          maxHeight: '600px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'transform 0.2s'
                        }}
                        onClick={() => window.open(image, '_blank')}
                        onMouseEnter={(e) => (e.target as HTMLImageElement).style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => (e.target as HTMLImageElement).style.transform = 'scale(1)'}
                      />
                      <div style={{
                        textAlign: 'center',
                        marginTop: '12px',
                        fontSize: '0.8rem',
                        opacity: 0.6
                      }}>
                        点击图片查看大图
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{
                  textAlign: 'center',
                  padding: '60px 20px',
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}>
                  <div style={{ fontSize: '64px', marginBottom: '20px', opacity: 0.5 }}>📄</div>
                  <h3 style={{ margin: '0 0 12px 0', fontSize: '1.2rem', opacity: 0.8 }}>
                    暂无CV Form
                  </h3>
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.9rem' }}>
                    该员工尚未上传CV Form
                  </p>
                </div>
              )}

              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <button
                  onClick={() => setShowCvViewModal(false)}
                  style={{
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 32px',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '1rem',
                    fontWeight: 500
                  }}
                >
                  关闭
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 通知组件 */}
      {notification.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: notification.type === 'success' ? '#10b981' : 
                     notification.type === 'error' ? '#ef4444' : 
                     notification.type === 'warning' ? '#f59e0b' : '#3b82f6',
          color: 'white',
          padding: '12px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 10000,
          maxWidth: '400px',
          fontSize: '14px',
          fontWeight: 500,
          animation: 'slideInRight 0.3s ease-out'
        }}>
          {notification.message}
        </div>
      )}

      <style>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .loader {
          border: 3px solid rgba(255, 255, 255, 0.1);
          border-radius: 50%;
          border-top: 3px solid #4299e1;
          width: 24px;
          height: 24px;
          animation: spin 1s linear infinite;
          margin: 0 auto;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AccountManagement;
