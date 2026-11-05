import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { adminAccountService, AdminAccount } from '../services/supabase';
import { fileUploadService } from '../services/FileUploadService';
import { imageCompressionService, CompressionResult } from '../services/ImageCompressionService';
import { fileValidationService } from '../services/FileValidationService';
import { rewritePublicStorageUrl } from '../utils/supabaseBrowserUrl';
import { BatchProgress, UploadProgress } from '../components/UploadProgress';
import { useResponsive } from '../hooks/useResponsive';
import '../styles/adminAccountCreateForm.css';
import '../styles/adminAccountList.css';

const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' }
];

const DEPARTMENTS = ['运营部', '配送部', '客服部', '财务部', '技术部', '人事部', '市场部'];

const POSITIONS_BY_DEPARTMENT: Record<string, string[]> = {
  运营部: ['总经理', '部门经理', '主管', '操作员'],
  配送部: ['部门经理', '主管', '骑手队长', '骑手'],
  客服部: ['部门经理', '主管', '客服专员'],
  财务部: ['部门经理', '主管', '财务专员'],
  技术部: ['部门经理', '主管', '技术专员'],
  人事部: ['部门经理', '主管'],
  市场部: ['部门经理', '主管'],
};

type AccountRole = 'admin' | 'manager' | 'operator' | 'finance';

const ROLE_FOR_POSITION: Record<string, AccountRole> = {
  总经理: 'manager',
  部门经理: 'manager',
  主管: 'manager',
  骑手队长: 'operator',
  骑手: 'operator',
  客服专员: 'operator',
  财务专员: 'finance',
  技术专员: 'operator',
  操作员: 'operator',
};

const ROLE_CHOICES: { id: AccountRole; name: string; detail: string }[] = [
  { id: 'operator', name: '操作员', detail: '订单、跟踪、跨境、货物' },
  { id: 'manager', name: '经理', detail: '再加用户、商家、财务、报表' },
  { id: 'finance', name: '财务', detail: '财务、充值、对账、报表' },
  { id: 'admin', name: '管理员', detail: '全部功能，含系统设置' },
];

const ACCOUNT_PERMISSIONS = [
  { id: 'city_packages', name: '同城订单', group: '日常' },
  { id: 'tracking', name: '实时跟踪', group: '日常' },
  { id: 'delivery_alerts', name: '配送警报', group: '日常' },
  { id: 'courier_performance', name: '骑手绩效', group: '日常' },
  { id: 'after_sales', name: '售后跟单', group: '日常' },
  { id: 'users', name: '用户管理', group: '商家' },
  { id: 'merchant_stores', name: '商家管理', group: '商家' },
  { id: 'product_reviews', name: '商品审核', group: '商家' },
  { id: 'banners', name: '页面管理', group: '商家' },
  { id: 'finance', name: '财务管理', group: '财务' },
  { id: 'recharges', name: '充值管理', group: '财务' },
  { id: 'merchant_reconciliation', name: '商家对账', group: '财务' },
  { id: 'reports', name: '报表导出', group: '财务' },
  { id: 'supervision', name: '操作审计', group: '财务' },
  { id: 'cross_border_logistics', name: '跨境物流', group: '货物' },
  { id: 'goods_management', name: '货物管理', group: '货物' },
  { id: 'metric_management', name: '商品明细', group: '货物' },
  { id: 'product_price', name: '商品价格', group: '货物' },
  { id: 'personal_expenses', name: '个人开销', group: '货物' },
  { id: 'settings', name: '系统设置', group: '系统' },
];

const ROLE_MENU_IDS: Record<AccountRole, string[]> = {
  operator: ['city_packages', 'tracking', 'courier_performance', 'cross_border_logistics', 'goods_management'],
  manager: ACCOUNT_PERMISSIONS.map((item) => item.id).filter((id) => id !== 'settings' && id !== 'recharges'),
  finance: [
    'city_packages', 'tracking', 'delivery_alerts', 'courier_performance', 'after_sales',
    'finance', 'recharges', 'merchant_reconciliation', 'reports', 'supervision',
    'cross_border_logistics', 'goods_management', 'metric_management', 'product_price', 'personal_expenses',
  ],
  admin: ACCOUNT_PERMISSIONS.map((item) => item.id),
};

function samePermissionSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) return false;
  const rightSet = new Set(right);
  return left.every((id) => rightSet.has(id));
}

function employeeIdKind(position: string, role: string): { code: string; reason: string } {
  if (position.includes('骑手')) {
    return { code: 'RIDER', reason: '职位是骑手，编号按骑手记，不跟登录角色改' };
  }
  if (role === 'finance' || position.includes('财务')) {
    return {
      code: 'ACCOUNT',
      reason: position.includes('财务') && role !== 'finance' ? '职位含财务，编号按财务记' : '按财务记',
    };
  }
  if (role === 'manager' || position.includes('经理')) {
    return { code: 'MANAGER', reason: '按经理记' };
  }
  if (role === 'admin' || position.includes('管理员')) {
    return { code: 'ADMIN', reason: '按管理员记' };
  }
  return { code: 'STAFF', reason: '按普通员工记' };
}

function formatHireDateLabel(value: string): string {
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '';
  return `${year}年${Number(month)}月${Number(day)}日`;
}

function formatAccountDate(value?: string | null): string {
  if (!value) return '';
  const day = String(value).slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return formatHireDateLabel(day);
  return String(value);
}

function formatAccountDateTime(value?: string | null): string {
  if (!value) return '从未登录';
  const date = formatAccountDate(value);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return date || String(value);
  const hm = parsed.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  return `${date} ${hm}`;
}

const AccountManagement: React.FC = () => {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const { isMobile, isTablet, isDesktop, width } = useResponsive();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<AdminAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [permissionsFormData, setPermissionsPermissionsFormData] = useState<string[]>([]);
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
    role: 'operator' as AccountRole,
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
    employee_name: '',
    phone: '',
    department: '',
    position: '',
    role: 'operator' as AccountRole,
  });
  const [showEditPassword, setShowEditPassword] = useState(false);

  useEffect(() => {
    loadAccounts();
  }, []);

  useEffect(() => {
    if (!showForm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [showForm]);

  const closeCreateForm = () => {
    setShowCreatePassword(false);
    setShowForm(false);
  };

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

  const applyOrgFields = (patch: Partial<Pick<typeof formData, 'department' | 'position' | 'role'>>) => {
    setFormData(prev => {
      const next = { ...prev, ...patch };
      if (patch.department !== undefined && next.position) {
        const allowed = POSITIONS_BY_DEPARTMENT[next.department] || [];
        if (!allowed.includes(next.position)) {
          next.position = '';
        }
      }
      if (patch.position && ROLE_FOR_POSITION[patch.position]) {
        next.role = ROLE_FOR_POSITION[patch.position];
      }
      if (next.region && next.position && next.role) {
        next.employee_id = generateEmployeeId(next.region, next.position, next.role);
      } else if (!next.position) {
        next.employee_id = '';
      }
      return next;
    });
  };

  // 自动生成员工编号
  const generateEmployeeId = (regionId: string, position: string, role: string): string => {
    const region = REGIONS.find(r => r.id === regionId);
    const regionPrefix = region ? region.prefix : 'MDY';
    const positionType = employeeIdKind(position, role).code;
    
    // 获取该区域该类型的现有账号数量
    const filteredAccounts = accounts.filter(acc => {
      const idPrefix = `${regionPrefix}-${positionType}`;
      return acc.employee_id && acc.employee_id.startsWith(idPrefix);
    });
    
    // 生成下一个编号
    const nextNumber = (filteredAccounts.length + 1).toString().padStart(3, '0');
    return `${regionPrefix}-${positionType}-${nextNumber}`;
  };

  const getAccountRegionLabel = (account: AdminAccount): string => {
    if (account.role === 'admin') return '万能';
    const region = REGIONS.find(r => r.id === account.region);
    if (region) return region.prefix;
    if (account.employee_id) {
      const prefix = account.employee_id.split('-')[0];
      if (['MDY', 'YGN', 'POL', 'NPW', 'TGI', 'LSO', 'MUSE'].includes(prefix)) return prefix;
      if (account.employee_id.startsWith('YGN')) return 'YGN';
      if (account.employee_id.startsWith('MDY')) return 'MDY';
      if (account.employee_id.startsWith('POL')) return 'POL';
    }
    return account.region || '-';
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return '系统管理员';
      case 'manager': return '经理';
      case 'operator': return '操作员';
      case 'finance': return '财务人员';
      default: return role;
    }
  };

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
    setShowEditPassword(false);
    setEditFormData({
      username: account.username,
      password: '',
      employee_name: account.employee_name,
      phone: account.phone || '',
      department: account.department || '',
      position: account.position || '',
      role: (account.role || 'operator') as AccountRole,
    });
    setShowEditModal(true);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setShowEditPassword(false);
    setEditingAccount(null);
    setEditFormData({
      username: '',
      password: '',
      employee_name: '',
      phone: '',
      department: '',
      position: '',
      role: 'operator',
    });
  };

  const normalizePermissionIds = (permissions: string[]) => {
    const normalized = permissions.map(id => (id === 'merchants_stores' ? 'merchant_stores' : id));
    return Array.from(new Set(normalized));
  };

  const handleEditPermissions = (account: AdminAccount) => {
    setEditingAccount(account);
    const defaults = ROLE_MENU_IDS[(account.role || 'operator') as AccountRole] || ROLE_MENU_IDS.operator;
    const stored = Array.isArray(account.permissions) ? normalizePermissionIds(account.permissions) : [];
    setPermissionsPermissionsFormData(stored.length ? stored : defaults);
    setShowPermissionsModal(true);
  };

  const handleUpdatePermissions = async () => {
    if (!editingAccount || !editingAccount.id) return;

    try {
      const defaults = ROLE_MENU_IDS[(editingAccount.role || 'operator') as AccountRole] || ROLE_MENU_IDS.operator;
      const nextPermissions = normalizePermissionIds(permissionsFormData);
      const followRole = nextPermissions.length === 0 || samePermissionSet(nextPermissions, defaults);
      const success = await adminAccountService.updateAccount(editingAccount.id, {
        permissions: followRole ? null : nextPermissions,
      } as Partial<AdminAccount>);

      if (success) {
        showNotification('权限更新成功！', 'success');
        setShowPermissionsModal(false);
        loadAccounts();
      } else {
        showNotification('权限更新失败', 'error');
      }
    } catch (error) {
      console.error('更新权限异常:', error);
      showNotification('操作出错', 'error');
    }
  };

  const togglePermission = (permId: string) => {
    setPermissionsPermissionsFormData(prev => 
      prev.includes(permId) 
        ? prev.filter(id => id !== permId) 
        : [...prev, permId]
    );
  };

  const handleUpdateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAccount) return;

    try {
      const updateData: Partial<AdminAccount> = {
        username: editFormData.username.trim(),
        employee_name: editFormData.employee_name.trim(),
        phone: editFormData.phone.trim(),
        department: editFormData.department,
        position: editFormData.position,
        role: editFormData.role,
      };

      if (editFormData.password.trim()) {
        updateData.password = editFormData.password;
      }

      const success = await adminAccountService.updateAccount(editingAccount.id!, updateData);
      if (!success) {
        showNotification('更新账号失败，请重试', 'error');
        return;
      }
      await loadAccounts();
      closeEditModal();
      showNotification('账号信息更新成功！', 'success');
    } catch (error) {
      console.error('更新账号失败:', error);
      showNotification('更新账号失败，请重试', 'error');
    }
  };

  const currentUsername = sessionStorage.getItem('currentUser') || localStorage.getItem('currentUser') || '';

  const handleDeleteAccount = async (account: AdminAccount) => {
    if (!account.id) return;
    if (account.username === currentUsername) {
      showNotification('不能删除当前登录的账号', 'warning');
      return;
    }
    
    const confirm = await showConfirmDialog(`确定要永久删除账号 "${account.employee_name} (@${account.username})" 吗？此操作不可恢复！`);
    if (!confirm) return;

    try {
      const success = await adminAccountService.deleteAccount(account.id);
      if (success) {
        showNotification('账号已成功删除', 'success');
        loadAccounts();
      } else {
        showNotification('删除失败，请稍后重试', 'error');
      }
    } catch (error) {
      console.error('删除账号异常:', error);
      showNotification('删除账号出错', 'error');
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
    <div className="admin-page">
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
      }}>
        <div className="admin-page-head">
          <div>
            <h1>
              账号管理 <span className="admin-page-head__en">Account Management</span>
            </h1>
            <p>管理系统管理员、运营经理、操作员及财务人员账号权限</p>
          </div>
          <div className="admin-page-actions">
            <button
              type="button"
              className={showForm ? 'admin-shell__btn' : 'admin-shell__btn admin-shell__btn--primary'}
              onClick={() => setShowForm(!showForm)}
            >
              {showForm ? '取消' : '+ 创建账号'}
            </button>
            <button
              type="button"
              className="admin-shell__btn"
              onClick={() => navigate('/admin/dashboard')}
            >
              返回主页
            </button>
          </div>
        </div>

        {successMessage && (
          <div className="admin-notice admin-notice--ok">
            {successMessage}
          </div>
        )}

        {errorMessage && (
          <div className="admin-notice admin-notice--err">
            {errorMessage}
          </div>
        )}

        {showForm && createPortal(
          <div
            className="acct-create-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeCreateForm();
            }}
          >
            <div className="acct-create-modal" role="dialog" aria-modal="true" aria-labelledby="acct-create-title">
              <div className="acct-create-modal__head">
                <div className="acct-create-modal__title-wrap">
                  <h2 id="acct-create-title" className="acct-create-modal__title">创建新员工账号</h2>
                  <p className="acct-create-modal__sub">先填这个人，再填登录。右上角的工作区域、职位和角色会一起生成员工编号。</p>
                </div>
                <div className="acct-create-modal__head-actions">
                  <div className="acct-create-modal__region">
                    <label htmlFor="acct-create-region">工作区域</label>
                    <select
                      id="acct-create-region"
                      name="region"
                      value={formData.region}
                      onChange={handleInputChange}
                    >
                      {REGIONS.map(r => (
                        <option key={r.id} value={r.id}>
                          {r.name} ({r.prefix})
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    className="acct-create-modal__close"
                    aria-label="关闭"
                    onClick={closeCreateForm}
                  >
                    ×
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="acct-create-modal__form">
                <div className="acct-create-modal__body">
                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">员工信息</h3>
                    <div className="acct-create-grid">
                      <div className="acct-create-field">
                        <label>员工姓名 <span>*</span></label>
                        <input
                          type="text"
                          name="employee_name"
                          value={formData.employee_name}
                          onChange={handleInputChange}
                          placeholder="真实姓名"
                          autoComplete="name"
                          required
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>入职日期 <span>*</span></label>
                        <input
                          type="date"
                          name="hire_date"
                          lang="zh-CN"
                          value={formData.hire_date}
                          onChange={handleInputChange}
                          required
                        />
                        {formData.hire_date ? (
                          <span className="acct-create-field__hint">{formatHireDateLabel(formData.hire_date)}</span>
                        ) : null}
                      </div>
                      <div className="acct-create-field">
                        <label>部门 <span>*</span></label>
                        <select
                          name="department"
                          value={formData.department}
                          onChange={(e) => applyOrgFields({ department: e.target.value })}
                          required
                        >
                          <option value="">请选择部门</option>
                          {DEPARTMENTS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="acct-create-field">
                        <label>职位 <span>*</span></label>
                        <select
                          name="position"
                          value={formData.position}
                          onChange={(e) => applyOrgFields({ position: e.target.value })}
                          disabled={!formData.department}
                          required
                        >
                          <option value="">{formData.department ? '请选择职位' : '请先选择部门'}</option>
                          {(POSITIONS_BY_DEPARTMENT[formData.department] || []).map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                        {formData.position === '骑手' || formData.position === '骑手队长' ? (
                          <span className="acct-create-field__hint">会同时开通骑手登录。</span>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">登录凭证</h3>
                    <div className="acct-create-grid">
                      <div className="acct-create-field">
                        <label>用户名 <span>*</span></label>
                        <input
                          type="text"
                          name="username"
                          value={formData.username}
                          onChange={handleInputChange}
                          placeholder="例如 ML-Grok"
                          autoComplete="off"
                          required
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>密码 <span>*</span></label>
                        <div className="acct-create-password">
                          <input
                            type={showCreatePassword ? 'text' : 'password'}
                            name="password"
                            value={formData.password}
                            onChange={handleInputChange}
                            placeholder="交给员工登录用"
                            autoComplete="new-password"
                            required
                          />
                          <button
                            type="button"
                            className="acct-create-password__toggle"
                            onClick={() => setShowCreatePassword((open) => !open)}
                          >
                            {showCreatePassword ? '隐藏' : '显示'}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="acct-create-roles">
                      <span className="acct-create-roles__label">登录角色</span>
                      {ROLE_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className={`acct-create-role${formData.role === choice.id ? ' is-on' : ''}`}
                          aria-pressed={formData.role === choice.id}
                          onClick={() => applyOrgFields({ role: choice.id })}
                        >
                          <strong>{choice.name}</strong>
                          <span>{choice.detail}</span>
                        </button>
                      ))}
                    </div>
                  </section>

                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">员工编号</h3>
                    <div className="acct-create-field acct-create-field--readonly">
                      <label>根据工作区域、职位和角色生成 <em>自动生成</em></label>
                      <input
                        type="text"
                        name="employee_id"
                        value={formData.employee_id}
                        readOnly
                        placeholder="请先选择区域、职位和角色"
                      />
                    </div>
                    {formData.employee_id ? (
                      <p className="acct-create-id-note">
                        {REGIONS.find((item) => item.id === formData.region)?.name} · {formData.employee_id} · {employeeIdKind(formData.position, formData.role).reason}
                      </p>
                    ) : null}
                  </section>

                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">联系方式与薪资</h3>
                    <div className="acct-create-grid">
                      <div className="acct-create-field">
                        <label>手机号码</label>
                        <input
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          placeholder="09…"
                          autoComplete="tel"
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>邮箱</label>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          placeholder="name@market-link-express.com"
                          autoComplete="email"
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>基本工资</label>
                        <div className="acct-create-money">
                          <span>MMK</span>
                          <input
                            type="number"
                            name="salary"
                            value={formData.salary}
                            onChange={handleInputChange}
                            placeholder="300000"
                            min="0"
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="acct-create-modal__foot">
                  <button type="button" className="acct-create-btn acct-create-btn--ghost" onClick={closeCreateForm}>
                    取消
                  </button>
                  <button
                    type="button"
                    className="acct-create-btn acct-create-btn--secondary"
                    onClick={() => setShowCvUploadModal(true)}
                  >
                    上传 CV Form
                  </button>
                  <button type="submit" className="acct-create-btn acct-create-btn--primary">
                    创建账号
                  </button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        <div className="acct-list">
          <div className="acct-list__toolbar">
            <div className="acct-list__title-row">
              <h2 className="acct-list__title">现有账号列表</h2>
              <span className="acct-list__count">共 {filteredAccounts.length} 个账号</span>
            </div>
            <div className="acct-list__filters">
              <div className="acct-list__search">
                <span className="acct-list__search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="搜索用户名/姓名/编号..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
                <option value="all">所有角色</option>
                <option value="admin">管理员</option>
                <option value="manager">经理</option>
                <option value="operator">操作员</option>
                <option value="finance">财务</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="acct-list__state">正在加载数据...</div>
          ) : filteredAccounts.length === 0 ? (
            <div className="acct-list__empty">
              <div className="acct-list__empty-icon">🔎</div>
              <div className="acct-list__empty-text">未找到符合条件的账号</div>
              {searchTerm && (
                <button
                  type="button"
                  className="acct-list__reset"
                  onClick={() => { setSearchTerm(''); setFilterRole('all'); }}
                >
                  重置筛选
                </button>
              )}
            </div>
          ) : (
            <div className="acct-list__table-wrap">
              <table className="acct-list__table">
                <thead>
                  <tr>
                    <th>员工信息</th>
                    <th>所属区域</th>
                    <th>员工编号</th>
                    <th>职位/部门</th>
                    <th>角色权限</th>
                    <th>当前状态</th>
                    <th>最后登录</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAccounts.map((account) => (
                    <tr key={account.id}>
                      <td>
                        <div className="acct-list__user">
                          <div
                            className="acct-list__avatar"
                            style={{ background: getRoleColor(account.role) }}
                          >
                            {account.employee_name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="acct-list__name">{account.employee_name}</div>
                            <div className="acct-list__username">@{account.username}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="acct-list__region">{getAccountRegionLabel(account)}</span>
                      </td>
                      <td>
                        <code className="acct-list__code">{account.employee_id}</code>
                      </td>
                      <td>
                        <div>{account.position || '-'}</div>
                        <div className="acct-list__dept">{account.department || '-'}</div>
                      </td>
                      <td>
                        <span
                          className="acct-list__role"
                          style={{
                            background: `${getRoleColor(account.role)}22`,
                            color: getRoleColor(account.role),
                            border: `1px solid ${getRoleColor(account.role)}55`,
                          }}
                        >
                          {getRoleLabel(account.role)}
                        </span>
                      </td>
                      <td>
                        <div className="acct-list__status-wrap">
                          <select
                            className="acct-list__status"
                            data-status={account.status || 'active'}
                            value={account.status || 'active'}
                            onChange={(e) => handleStatusChange(account.id!, e.target.value as 'active' | 'inactive' | 'suspended')}
                          >
                            <option value="active">正常</option>
                            <option value="inactive">停用</option>
                            <option value="suspended">暂停</option>
                          </select>
                          <span className="acct-list__status-arrow">▼</span>
                        </div>
                      </td>
                      <td>
                        <div className="acct-list__login-date">
                          {account.last_login ? new Date(account.last_login).toLocaleDateString('zh-CN') : '-'}
                        </div>
                        <div className="acct-list__login-time">
                          {account.last_login
                            ? new Date(account.last_login).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
                            : '从未登录'}
                        </div>
                      </td>
                      <td>
                        <div className="acct-list__actions">
                          <button
                            type="button"
                            className="acct-list__action acct-list__action--view"
                            onClick={() => handleViewAccount(account)}
                          >
                            查看
                          </button>
                          <button
                            type="button"
                            className="acct-list__action acct-list__action--edit"
                            onClick={() => handleEditAccount(account)}
                          >
                            编辑
                          </button>
                          <button
                            type="button"
                            className="acct-list__action acct-list__action--perm"
                            onClick={() => handleEditPermissions(account)}
                          >
                            权限
                          </button>
                          <button
                            type="button"
                            className="acct-list__action acct-list__action--delete"
                            onClick={() => handleDeleteAccount(account)}
                            disabled={account.username === currentUsername}
                            title={account.username === currentUsername ? '不能删除当前登录的账号' : '删除账号'}
                          >
                            删除
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

        {showEditModal && editingAccount && createPortal(
          <div
            className="acct-create-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) closeEditModal();
            }}
          >
            <div className="acct-create-modal acct-create-modal--fit" role="dialog" aria-modal="true" aria-labelledby="acct-edit-title">
              <div className="acct-create-modal__head">
                <div className="acct-create-modal__title-wrap">
                  <h2 id="acct-edit-title" className="acct-create-modal__title">编辑账号</h2>
                  <p className="acct-create-modal__sub">
                    {editingAccount.employee_id} · 编号不改。密码留空就保持原密码。
                  </p>
                </div>
                <button type="button" className="acct-create-modal__close" aria-label="关闭" onClick={closeEditModal}>×</button>
              </div>
              <form onSubmit={handleUpdateAccount} className="acct-create-modal__form">
                <div className="acct-create-modal__body">
                  <section className="acct-create-section">
                    <div className="acct-create-grid">
                      <div className="acct-create-field">
                        <label>员工姓名 <span>*</span></label>
                        <input
                          type="text"
                          value={editFormData.employee_name}
                          onChange={(e) => setEditFormData({ ...editFormData, employee_name: e.target.value })}
                          required
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>用户名 <span>*</span></label>
                        <input
                          type="text"
                          value={editFormData.username}
                          onChange={(e) => setEditFormData({ ...editFormData, username: e.target.value })}
                          required
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>手机号码</label>
                        <input
                          type="tel"
                          value={editFormData.phone}
                          onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                          placeholder="09…"
                        />
                      </div>
                      <div className="acct-create-field">
                        <label>新密码</label>
                        <div className="acct-create-password">
                          <input
                            type={showEditPassword ? 'text' : 'password'}
                            value={editFormData.password}
                            onChange={(e) => setEditFormData({ ...editFormData, password: e.target.value })}
                            placeholder="留空则不修改"
                            autoComplete="new-password"
                          />
                          <button
                            type="button"
                            className="acct-create-password__toggle"
                            onClick={() => setShowEditPassword((open) => !open)}
                          >
                            {showEditPassword ? '隐藏' : '显示'}
                          </button>
                        </div>
                      </div>
                      <div className="acct-create-field">
                        <label>部门</label>
                        <select
                          value={editFormData.department}
                          onChange={(e) => {
                            const department = e.target.value;
                            const allowed = POSITIONS_BY_DEPARTMENT[department] || [];
                            setEditFormData((prev) => ({
                              ...prev,
                              department,
                              position: !department || allowed.includes(prev.position) ? prev.position : '',
                            }));
                          }}
                        >
                          <option value="">未分配</option>
                          {DEPARTMENTS.map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="acct-create-field">
                        <label>职位</label>
                        <select
                          value={editFormData.position}
                          onChange={(e) => setEditFormData({ ...editFormData, position: e.target.value })}
                          disabled={!editFormData.department}
                        >
                          <option value="">{editFormData.department ? '请选择职位' : '请先选择部门'}</option>
                          {(editFormData.position && !(POSITIONS_BY_DEPARTMENT[editFormData.department] || []).includes(editFormData.position)
                            ? [editFormData.position]
                            : []
                          ).concat(POSITIONS_BY_DEPARTMENT[editFormData.department] || []).map((name) => (
                            <option key={name} value={name}>{name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="acct-create-roles">
                      <span className="acct-create-roles__label">登录角色</span>
                      {ROLE_CHOICES.map((choice) => (
                        <button
                          key={choice.id}
                          type="button"
                          className={`acct-create-role${editFormData.role === choice.id ? ' is-on' : ''}`}
                          aria-pressed={editFormData.role === choice.id}
                          onClick={() => setEditFormData({ ...editFormData, role: choice.id })}
                        >
                          <strong>{choice.name}</strong>
                          <span>{choice.detail}</span>
                        </button>
                      ))}
                    </div>
                  </section>
                </div>
                <div className="acct-create-modal__foot">
                  <button type="button" className="acct-create-btn acct-create-btn--ghost" onClick={closeEditModal}>取消</button>
                  <button type="submit" className="acct-create-btn acct-create-btn--primary">保存修改</button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

        {showViewModal && viewingAccount && createPortal(
          <div
            className="acct-create-overlay"
            role="presentation"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowViewModal(false);
            }}
          >
            <div className="acct-create-modal acct-create-modal--fit" role="dialog" aria-modal="true" aria-labelledby="acct-view-title">
              <div className="acct-create-modal__head">
                <div className="acct-create-modal__title-wrap">
                  <h2 id="acct-view-title" className="acct-create-modal__title">{viewingAccount.employee_name}</h2>
                  <p className="acct-create-modal__sub">{viewingAccount.employee_id} · @{viewingAccount.username}</p>
                  <div className="acct-view-tags">
                    <span className="acct-view-tag">
                      {viewingAccount.role === 'admin'
                        ? '万能'
                        : (REGIONS.find((item) => item.id === viewingAccount.region)?.name || viewingAccount.region || '未填区域')}
                    </span>
                    <span className="acct-view-tag">{getRoleLabel(viewingAccount.role)}</span>
                    <span className={`acct-view-tag ${viewingAccount.status === 'inactive' ? 'is-off' : viewingAccount.status === 'suspended' ? 'is-stop' : 'is-ok'}`}>
                      {viewingAccount.status === 'inactive' ? '停用' : viewingAccount.status === 'suspended' ? '暂停' : '正常'}
                    </span>
                    <span className="acct-view-tag is-off">最后登录 {formatAccountDateTime(viewingAccount.last_login)}</span>
                  </div>
                </div>
                <button type="button" className="acct-create-modal__close" aria-label="关闭" onClick={() => setShowViewModal(false)}>×</button>
              </div>
              <div className="acct-create-modal__form">
                <div className="acct-create-modal__body">
                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">在职</h3>
                    <dl className="acct-view-facts">
                      <div>
                        <dt>部门</dt>
                        <dd>{viewingAccount.department || '未分配'}</dd>
                      </div>
                      <div>
                        <dt>职位</dt>
                        <dd>{viewingAccount.position || '未分配'}</dd>
                      </div>
                      <div>
                        <dt>入职日期</dt>
                        <dd>{viewingAccount.hire_date ? formatAccountDate(viewingAccount.hire_date) : '未填写'}</dd>
                      </div>
                      <div>
                        <dt>员工编号</dt>
                        <dd>{viewingAccount.employee_id}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">登录</h3>
                    <dl className="acct-view-facts">
                      <div>
                        <dt>用户名</dt>
                        <dd>{viewingAccount.username}</dd>
                      </div>
                      <div>
                        <dt>登录角色</dt>
                        <dd>
                          {getRoleLabel(viewingAccount.role)}
                          {ROLE_CHOICES.find((choice) => choice.id === viewingAccount.role)
                            ? ` · ${ROLE_CHOICES.find((choice) => choice.id === viewingAccount.role)?.detail}`
                            : ''}
                        </dd>
                      </div>
                      <div>
                        <dt>创建时间</dt>
                        <dd>{viewingAccount.created_at ? formatAccountDate(viewingAccount.created_at) : '未知'}</dd>
                      </div>
                      <div>
                        <dt>最后登录</dt>
                        <dd>{formatAccountDateTime(viewingAccount.last_login)}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="acct-create-section">
                    <h3 className="acct-create-section__title">联系与薪资</h3>
                    <dl className="acct-view-facts">
                      {viewingAccount.phone ? (
                        <div>
                          <dt>手机号码</dt>
                          <dd><a href={`tel:${viewingAccount.phone}`}>{viewingAccount.phone}</a></dd>
                        </div>
                      ) : null}
                      {viewingAccount.email ? (
                        <div>
                          <dt>邮箱</dt>
                          <dd><a href={`mailto:${viewingAccount.email}`}>{viewingAccount.email}</a></dd>
                        </div>
                      ) : null}
                      {viewingAccount.salary ? (
                        <div>
                          <dt>基本工资</dt>
                          <dd>{viewingAccount.salary.toLocaleString()} MMK</dd>
                        </div>
                      ) : null}
                      {viewingAccount.id_number ? (
                        <div>
                          <dt>身份证号</dt>
                          <dd>{viewingAccount.id_number}</dd>
                        </div>
                      ) : null}
                      {viewingAccount.address ? (
                        <div>
                          <dt>地址</dt>
                          <dd>{viewingAccount.address}</dd>
                        </div>
                      ) : null}
                      {viewingAccount.emergency_contact ? (
                        <div>
                          <dt>紧急联系人</dt>
                          <dd>{viewingAccount.emergency_contact}</dd>
                        </div>
                      ) : null}
                      {viewingAccount.emergency_phone ? (
                        <div>
                          <dt>紧急电话</dt>
                          <dd><a href={`tel:${viewingAccount.emergency_phone}`}>{viewingAccount.emergency_phone}</a></dd>
                        </div>
                      ) : null}
                    </dl>
                    {(() => {
                      const missing = [
                        !viewingAccount.phone && '手机',
                        !viewingAccount.email && '邮箱',
                        !viewingAccount.salary && '工资',
                        !viewingAccount.id_number && '身份证',
                        !viewingAccount.address && '地址',
                        !viewingAccount.emergency_contact && '紧急联系人',
                        !viewingAccount.emergency_phone && '紧急电话',
                      ].filter(Boolean);
                      return missing.length ? <p className="acct-view-missing">未填写：{missing.join('、')}</p> : null;
                    })()}
                    {viewingAccount.notes ? <p className="acct-view-note">{viewingAccount.notes}</p> : null}
                  </section>
                </div>
                <div className="acct-create-modal__foot">
                  <button
                    type="button"
                    className="acct-create-btn"
                    onClick={() => {
                      const account = viewingAccount;
                      setShowViewModal(false);
                      handleEditAccount(account);
                    }}
                  >
                    编辑
                  </button>
                  <button
                    type="button"
                    className="acct-create-btn acct-create-btn--secondary"
                    onClick={() => {
                      const account = viewingAccount;
                      setShowViewModal(false);
                      handleEditPermissions(account);
                    }}
                  >
                    权限
                  </button>
                  <button
                    type="button"
                    className="acct-create-btn"
                    disabled={!viewingAccount.cv_images?.length}
                    title={viewingAccount.cv_images?.length ? '查看 CV' : '还没有 CV'}
                    onClick={() => {
                      setCvImages((viewingAccount.cv_images || []).map(rewritePublicStorageUrl));
                      setShowCvViewModal(true);
                    }}
                  >
                    {viewingAccount.cv_images?.length ? `查看 CV (${viewingAccount.cv_images.length})` : '暂无 CV'}
                  </button>
                  <button type="button" className="acct-create-btn acct-create-btn--ghost" onClick={() => setShowViewModal(false)}>
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
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
            zIndex: 10100
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
                          src={rewritePublicStorageUrl(image)}
                          alt={`CV Form ${index + 1}`}
                          style={{
                            width: '100%',
                            height: '120px',
                            objectFit: 'cover',
                            borderRadius: '4px',
                            cursor: 'pointer'
                          }}
                          onClick={() => {
                            setCvImages([rewritePublicStorageUrl(image)]);
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
                        src={rewritePublicStorageUrl(image)}
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
                        onClick={() => window.open(rewritePublicStorageUrl(image), '_blank')}
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

        {showPermissionsModal && editingAccount && (() => {
          const roleDefaults = ROLE_MENU_IDS[(editingAccount.role || 'operator') as AccountRole] || ROLE_MENU_IDS.operator;
          const followsRole = permissionsFormData.length === 0 || samePermissionSet(permissionsFormData, roleDefaults);
          const groups = ['日常', '商家', '财务', '货物', '系统'];
          return createPortal(
            <div
              className="acct-create-overlay"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setShowPermissionsModal(false);
              }}
            >
              <div className="acct-create-modal" role="dialog" aria-modal="true" aria-labelledby="acct-perm-title">
                <div className="acct-create-modal__head">
                  <div className="acct-create-modal__title-wrap">
                    <h2 id="acct-perm-title" className="acct-create-modal__title">权限</h2>
                    <p className="acct-create-modal__sub">
                      {editingAccount.employee_name} · {getRoleLabel(editingAccount.role)} · 已勾 {permissionsFormData.length} 项
                    </p>
                  </div>
                  <button type="button" className="acct-create-modal__close" aria-label="关闭" onClick={() => setShowPermissionsModal(false)}>×</button>
                </div>
                <div className="acct-create-modal__form">
                  <div className="acct-create-modal__body">
                    <p className={`acct-perm-note${followsRole ? '' : ' is-warn'}`}>
                      {editingAccount.role === 'admin'
                        ? '管理员首页始终是全部功能。这里的勾选不会收窄他的菜单。'
                        : followsRole
                          ? '现在和这个角色一致。保存后仍按角色打开功能。'
                          : '保存后首页只留下勾中的功能，没勾的会从菜单拿掉。清空再保存，会回到角色自带。'}
                    </p>
                    <div className="acct-perm-tools">
                      <button type="button" className="acct-create-btn" onClick={() => setPermissionsPermissionsFormData(roleDefaults)}>
                        按角色恢复
                      </button>
                      <button
                        type="button"
                        className="acct-create-btn"
                        onClick={() => setPermissionsPermissionsFormData(ACCOUNT_PERMISSIONS.map((item) => item.id))}
                      >
                        全选
                      </button>
                      <button type="button" className="acct-create-btn acct-create-btn--ghost" onClick={() => setPermissionsPermissionsFormData([])}>
                        清空
                      </button>
                    </div>
                    {groups.map((group) => (
                      <div className="acct-perm-group" key={group}>
                        <h4>{group}</h4>
                        <div className="acct-perm-grid">
                          {ACCOUNT_PERMISSIONS.filter((item) => item.group === group).map((item) => {
                            const on = permissionsFormData.includes(item.id);
                            const builtin = roleDefaults.includes(item.id);
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`acct-perm-item${on ? ' is-on' : ''}`}
                                aria-pressed={on}
                                onClick={() => togglePermission(item.id)}
                              >
                                <span>
                                  <strong>{item.name}</strong>
                                  {builtin ? <em>角色自带</em> : <em>额外</em>}
                                </span>
                                <i />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="acct-create-modal__foot">
                    <button type="button" className="acct-create-btn acct-create-btn--ghost" onClick={() => setShowPermissionsModal(false)}>
                      取消
                    </button>
                    <button type="button" className="acct-create-btn acct-create-btn--primary" onClick={handleUpdatePermissions}>
                      保存
                    </button>
                  </div>
                </div>
              </div>
            </div>,
            document.body
          );
        })()}
      </div>
  );
};

export default AccountManagement;
