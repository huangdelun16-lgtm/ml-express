// 国际化多语言系统

/** 应用支持的语言代码（AsyncStorage / 设置里也可能是任意 string，故 useTranslation 同时接受 string） */
export type Language = 'zh' | 'en' | 'my';

export interface LanguageTexts {
  // 通用
  loading: string;
  save: string;
  cancel: string;
  confirm: string;
  delete: string;
  edit: string;
  add: string;
  search: string;
  refresh: string;
  back: string;
  close: string;
  success: string;
  error: string;
  
  // 客户专区
  customerZone: string;
  immediateOrder: string;
  packageTracking: string;
  contactCustomerService: string;
  professionalExpressService: string;
  serviceDescription: string;
  adminEntrance: string;
  admin: string;
  
  // 下单相关
  placeOrder: string;
  expressOrder: string;
  senderInfo: string;
  receiverInfo: string;
  packageInfo: string;
  contactInfo: string;
  yourContactInfo: string;
  name: string;
  phone: string;
  address: string;
  packageType: string;
  weight: string;
  description: string;
  estimatedCost: string;
  submitOrder: string;
  orderSuccess: string;
  yourName: string;
  yourPhone: string;
  pleaseEnterSenderName: string;
  pleaseEnterSenderPhone: string;
  pleaseEnterSenderAddress: string;
  pleaseEnterReceiverName: string;
  pleaseEnterReceiverPhone: string;
  pleaseEnterReceiverAddress: string;
  pleaseEnterYourName: string;
  pleaseEnterYourPhone: string;
  pleaseEnterPackageNumber: string;
  packageNumberExample: string;
  receiver: string;
  receiverAddress: string;
  courier: string;
  createTime: string;
  pickupTime: string;
  deliveryTime: string;
  packageStatus: string;
  status: string;
  pending: string;
  pickedUp: string;
  delivering: string;
  delivered: string;
  cancelled: string;
  
  // 包裹追踪
  trackPackage: string;
  packageNumber: string;
  query: string;
  trackingResult: string;
  picked: string;
  
  // 管理系统
  dashboard: string;
  packageManagement: string;
  courierManagement: string;
  financeManagement: string;
  settings: string;
  myTasks: string;
  map: string;
  selectFromMap: string;
  selectSenderAddress: string;
  selectReceiverAddress: string;
  currentLocation: string;
  selectLocation: string;
  confirmSelection: string;
  locationSelected: string;
  getCurrentLocation: string;
  locationPermissionDenied: string;
  locationPermissionMessage: string;
  getLocationFailed: string;
  getLocationErrorMessage: string;
  locationSuccess: string;
  locationSuccessMessage: string;
  pleaseSelectLocation: string;
  scan: string;
  profile: string;
  
  // 统计
  statistics: string;
  total: string;
  today: string;
  thisMonth: string;
  income: string;
  expense: string;
  profit: string;
  completed: string;
  inProgress: string;
  
  // 设置
  generalSettings: string;
  accountSecurity: string;
  helpSupport: string;
  pushNotifications: string;
  languageSettings: string;
  themeMode: string;
  changePassword: string;
  permissionManagement: string;
  privacySettings: string;
  aboutUs: string;
  userGuide: string;
  visitWebsite: string;
  
  // 帮助内容
  howToOrder: string;
  howToTrack: string;
  howToContact: string;
  shippingCost: string;
  shippingTime: string;
  securityGuarantee: string;
  
  // 操作与详情
  call: string;
  navigate: string;
  uploadPhoto: string;
  updateStatus: string;
  camera: string;
  startCamera: string;
  packageDetail: string;
  cod: string;
  shippingFee: string;
  totalAmount: string;
  note: string;
  confirmUpdate: string;
  statusUpdateSuccess: string;
  statusUpdateFailed: string;
  photoUploaded: string;
  scanSuccess: string;
  confirmDelivery: string;
  locationVerified: string;
  locationWarning: string;
  retry: string;
  rephoto: string;
  confirmUpload: string;
  uploading: string;
  scanInstruction: string;
  scanResult: string;

  // 底部 Tab / 应用壳层
  tabHome: string;
  tabAccount: string;
  tabMyTasks: string;
  tipTitle: string;
  sessionKickedTitle: string;
  sessionKickedMessage: string;
  criticalAppErrorTitle: string;
  criticalAppErrorMessage: string;
  unknownError: string;
  ok: string;
  initTakingLong: string;
  initSlowHint: string;
  syncInProgress: string;
  syncPending: string;
  newOrderVoiceAnnouncement: string;

  // 财务管理（管理端）
  financeManagementTitle: string;
  financeTabOverview: string;
  financeTabRecords: string;
  financeTabAnalytics: string;
  financeTabReports: string;
  financeLoadingData: string;
  financeFillCategoryAndAmount: string;
  financeAddFailed: string;
  financeAddSuccess: string;
  financeConfirmDeleteTitle: string;
  financeConfirmDeleteBody: string;
  financeRecordDeleted: string;
  financeDeleteFailed: string;
  financeConfirmBatchDelete: string;
  financeBatchDeleteConfirm: string;
  financeBatchDeleteFailed: string;
  financeBatchDeleteSuccess: string;
  financeActionOptions: string;
  financeChooseActionFor: string;
  financeMonthlyReport: string;
  financeMonthlyReportHint: string;
  financeExportData: string;
  financeExportDataHint: string;
  financeTaxReport: string;
  financeTaxReportHint: string;
  financeStatusCompleted: string;
  financeStatusPending: string;
  financeStatusCancelled: string;
  financeAddRecordTitle: string;

  /** 运行环境与推送说明 */
  envSectionTitle: string;
  envRuntimeLabel: string;
  envRuntimeExpoGoIos: string;
  envRuntimeExpoGoAndroid: string;
  envRuntimeStandalone: string;
  envRuntimeBare: string;
  envRuntimeUnknown: string;
  envPushLabel: string;
  envPushReady: string;
  envPushExpoGoAndroid: string;
  envPushSimulator: string;
  envPushNoModule: string;
  envPushFootnote: string;
  openSystemSettings: string;
  locationOpenSettingsHint: string;
  adminAccessDeniedTitle: string;
  adminAccessDeniedBody: string;
  /** 无障碍 */
  a11yBack: string;
  a11yLogout: string;
  a11yOnlineToggle: string;
  a11yPackageOpenDetail: string;
  a11yNextStepAction: string;
  a11yRefreshTaskList: string;
  a11yCallRecipient: string;
  a11yNavigateToAddress: string;
  a11ySyncBadge: string;
  a11yMapNavPickup: string;
  a11yMapNavDelivery: string;
  a11yMapStartDelivery: string;
  a11yMapFinishDelivery: string;
  a11yMapScanPickup: string;
  a11yMapManualPickup: string;
  a11yMapPlanRoute: string;
  a11yMapSearchPackages: string;
  a11yMapRoutePreviewClose: string;
  a11yMapOpenGoogleNav: string;
  a11yScanToggleMode: string;
  a11yScanGrantCamera: string;
  a11yScanRetryCamera: string;
  a11yScanRescan: string;
  a11yScanPackageInput: string;
  a11yScanLookupPackage: string;
  a11yMapReportAnomaly: string;
  a11yMapPhotoDelivery: string;
  a11yMapSubmitAnomaly: string;
}

export const translations: { [key: string]: LanguageTexts } = {
  zh: {
    // 通用
    loading: '加载中...',
    save: '保存',
    cancel: '取消',
    confirm: '确认',
    delete: '删除',
    edit: '编辑',
    add: '添加',
    search: '搜索',
    refresh: '刷新',
    back: '返回',
    close: '关闭',
    success: '成功',
    error: '错误',
    
    // 客户专区
    customerZone: '客户专区',
    immediateOrder: '立即下单',
    packageTracking: '包裹追踪',
    contactCustomerService: '联系客服',
    professionalExpressService: '专业快递服务',
    serviceDescription: '提供同城配送、包裹追踪、安全可靠的快递服务',
    adminEntrance: '管理员入口',
    admin: '管理员',
    
    // 下单相关
    placeOrder: '立即下单',
    expressOrder: '快递下单',
    senderInfo: '寄件人信息',
    receiverInfo: '收件人信息',
    packageInfo: '包裹信息',
    contactInfo: '联系信息',
    yourContactInfo: '您的联系信息',
    name: '姓名',
    phone: '电话',
    address: '地址',
    packageType: '包裹类型',
    weight: '重量',
    description: '描述',
    estimatedCost: '预计费用',
    submitOrder: '提交订单',
    orderSuccess: '下单成功！',
    yourName: '您的姓名',
    yourPhone: '您的电话',
    pleaseEnterSenderName: '请输入寄件人姓名',
    pleaseEnterSenderPhone: '请输入寄件人电话',
    pleaseEnterSenderAddress: '请输入详细的寄件地址',
    pleaseEnterReceiverName: '请输入收件人姓名',
    pleaseEnterReceiverPhone: '请输入收件人电话',
    pleaseEnterReceiverAddress: '请输入详细的收件地址',
    pleaseEnterYourName: '请输入您的姓名',
    pleaseEnterYourPhone: '请输入您的联系电话',
    pleaseEnterPackageNumber: '请输入包裹编号',
    packageNumberExample: '请输入包裹编号，例如：PKG001',
    receiver: '收件人',
    receiverAddress: '收件地址',
    courier: '快递员',
    createTime: '创建时间',
    pickupTime: '取件时间',
    deliveryTime: '送达时间',
    packageStatus: '包裹状态',
    status: '状态',
    pending: '待取件',
    pickedUp: '已取件',
    delivering: '配送中',
    delivered: '已送达',
    cancelled: '已取消',
    
    // 包裹追踪
    trackPackage: '包裹追踪',
    packageNumber: '包裹编号',
    query: '查询',
    trackingResult: '追踪结果',
    picked: '已取件',
    
    // 管理系统
    dashboard: '仪表板',
    packageManagement: '包裹管理',
    courierManagement: '骑手管理',
    financeManagement: '财务管理',
    settings: '设置',
    myTasks: '我的任务',
    map: '地图',
    selectFromMap: '地图中选择',
    selectSenderAddress: '选择寄件地址',
    selectReceiverAddress: '选择收件地址',
    currentLocation: '当前位置',
    selectLocation: '选择位置',
    confirmSelection: '确认选择',
    locationSelected: '地址已选择',
    getCurrentLocation: '获取当前位置',
    locationPermissionDenied: '位置权限被拒绝',
    locationPermissionMessage: '请在设置中允许应用访问您的位置以使用地图功能。',
    getLocationFailed: '获取位置失败',
    getLocationErrorMessage: '请检查您的GPS和网络连接，并确保已授予位置权限。',
    locationSuccess: '位置获取成功！',
    locationSuccessMessage: '纬度: {latitude}\n精度: {accuracy}米',
    pleaseSelectLocation: '请先选择一个位置',
    scan: '扫码',
    profile: '我的',
    
    // 统计
    statistics: '统计',
    total: '总计',
    today: '今日',
    thisMonth: '本月',
    income: '收入',
    expense: '支出',
    profit: '利润',
    completed: '已完成',
    inProgress: '进行中',
    
    // 设置
    generalSettings: '通用设置',
    accountSecurity: '账户与安全',
    helpSupport: '帮助与支持',
    pushNotifications: '推送通知',
    languageSettings: '语言设置',
    themeMode: '主题模式',
    changePassword: '修改密码',
    permissionManagement: '权限管理',
    privacySettings: '隐私设置',
    aboutUs: '关于我们',
    userGuide: '使用帮助',
    visitWebsite: '访问网站',
    
    // 帮助内容
    howToOrder: '如何下单',
    howToTrack: '如何追踪包裹',
    howToContact: '如何联系客服',
    shippingCost: '配送费用',
    shippingTime: '配送时间',
    securityGuarantee: '安全保障',
    
    // 操作与详情
    call: '拨打电话',
    navigate: '导航',
    uploadPhoto: '上传照片',
    updateStatus: '更新状态',
    camera: '拍照功能',
    startCamera: '开始拍照',
    packageDetail: '包裹详情',
    cod: '代收款',
    shippingFee: '跑腿费',
    totalAmount: '总金额',
    note: '备注',
    confirmUpdate: '确认更新',
    statusUpdateSuccess: '状态更新成功',
    statusUpdateFailed: '状态更新失败',
    photoUploaded: '照片已上传',
    scanSuccess: '扫码成功',
    confirmDelivery: '确认送达',
    locationVerified: '位置验证通过',
    locationWarning: '位置验证警告',
    retry: '重试',
    rephoto: '重新拍照',
    confirmUpload: '确认上传',
    uploading: '上传中...',
    scanInstruction: '将二维码/条形码对准扫描框',
    scanResult: '扫描结果',

    tabHome: '首页',
    tabAccount: '账号',
    tabMyTasks: '我的任务',
    tipTitle: '提示',
    sessionKickedTitle: '登录状态异常',
    sessionKickedMessage: '您的账号已在其他设备登录，当前设备已被强制下线。',
    criticalAppErrorTitle: '⚠️ 应用程序异常',
    criticalAppErrorMessage: '很抱歉，程序遇到一个致命错误。我们已记录此问题，请尝试重启应用。',
    unknownError: '未知错误',
    ok: '确定',
    initTakingLong: '初始化时间较长…',
    initSlowHint: '如果长时间无法进入，请检查网络或重启应用',
    syncInProgress: '同步中 ({count})',
    syncPending: '待同步 ({count})',
    newOrderVoiceAnnouncement: '您有新的同城配送订单，请及时查看',

    financeManagementTitle: '财务管理',
    financeTabOverview: '概览',
    financeTabRecords: '记录',
    financeTabAnalytics: '分析',
    financeTabReports: '报表',
    financeLoadingData: '加载财务数据…',
    financeFillCategoryAndAmount: '请填写分类和金额',
    financeAddFailed: '添加记录失败',
    financeAddSuccess: '财务记录添加成功',
    financeConfirmDeleteTitle: '确认删除',
    financeConfirmDeleteBody: '确定要删除这条财务记录吗？\n\n分类：{category}\n金额：{amount} {currency}',
    financeRecordDeleted: '记录删除成功',
    financeDeleteFailed: '删除失败',
    financeConfirmBatchDelete: '确认批量删除',
    financeBatchDeleteConfirm: '确定要删除选中的 {count} 条记录吗？',
    financeBatchDeleteFailed: '批量删除失败',
    financeBatchDeleteSuccess: '成功删除 {count} 条记录',
    financeActionOptions: '操作选项',
    financeChooseActionFor: '选择对「{category}」的操作',
    financeMonthlyReport: '月度报表',
    financeMonthlyReportHint: '生成本月财务报表…',
    financeExportData: '导出数据',
    financeExportDataHint: '导出所有财务数据…',
    financeTaxReport: '税务报表',
    financeTaxReportHint: '生成税务申报资料…',
    financeStatusCompleted: '已完成',
    financeStatusPending: '待处理',
    financeStatusCancelled: '已取消',
    financeAddRecordTitle: '新增财务记录',

    envSectionTitle: '运行环境与推送',
    envRuntimeLabel: '当前运行方式',
    envRuntimeExpoGoIos: 'Expo Go（iOS）：用于开发调试；远程推送可用。',
    envRuntimeExpoGoAndroid: 'Expo Go（Android）：系统限制下无法注册远程推送；请使用商店版或开发版安装包。',
    envRuntimeStandalone: '正式/安装包（Standalone）：与推送、后台能力一致，适合骑手日常使用。',
    envRuntimeBare: 'Bare / 自定义原生：与原生工程一致，请按构建配置确认推送证书。',
    envRuntimeUnknown: '未知环境',
    envPushLabel: '远程推送状态',
    envPushReady: '可注册远程推送（需真机且已授权通知权限）。',
    envPushExpoGoAndroid: '当前环境无法注册远程推送（Expo Go Android 限制）。',
    envPushSimulator: '模拟器不支持远程推送；请使用真机验证。',
    envPushNoModule: '通知模块未加载，请使用正式构建。',
    envPushFootnote: '新订单仍可通过应用内实时监听与语音提醒；推送用于后台或杀进程场景。',
    openSystemSettings: '打开系统设置',
    locationOpenSettingsHint: '位置权限被拒绝且无法再次弹窗。请在系统设置中开启本应用的位置权限。',
    adminAccessDeniedTitle: '无权限',
    adminAccessDeniedBody: '当前账号无法访问此管理功能。',
    a11yBack: '返回上一页',
    a11yLogout: '退出登录',
    a11yOnlineToggle: '切换在线接单状态',
    a11yPackageOpenDetail: '打开包裹详情',
    a11yNextStepAction: '下一步配送操作',
    a11yRefreshTaskList: '刷新任务列表',
    a11yCallRecipient: '拨打收件人电话',
    a11yNavigateToAddress: '打开地图导航',
    a11ySyncBadge: '离线同步状态',
    a11yMapNavPickup: '导航到取货点',
    a11yMapNavDelivery: '导航到送货点',
    a11yMapStartDelivery: '开始配送此单',
    a11yMapFinishDelivery: '完成或结束本单配送',
    a11yMapScanPickup: '扫码取件',
    a11yMapManualPickup: '手动确认取件',
    a11yMapPlanRoute: '根据当前位置规划配送路线',
    a11yMapSearchPackages: '搜索包裹编号或地址',
    a11yMapRoutePreviewClose: '关闭路线预览',
    a11yMapOpenGoogleNav: '在外部地图中开始导航',
    a11yScanToggleMode: '切换扫码与手动输入',
    a11yScanGrantCamera: '授予相机权限以扫码',
    a11yScanRetryCamera: '重试相机',
    a11yScanRescan: '重新扫描',
    a11yScanPackageInput: '输入包裹编号或中转码',
    a11yScanLookupPackage: '查询包裹',
    a11yMapReportAnomaly: '上报配送异常',
    a11yMapPhotoDelivery: '拍照作为送达凭证',
    a11yMapSubmitAnomaly: '提交异常报备',
  },
  
  en: {
    // 通用
    loading: 'Loading...',
    save: 'Save',
    cancel: 'Cancel',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    refresh: 'Refresh',
    back: 'Back',
    close: 'Close',
    success: 'Success',
    error: 'Error',
    
    // 客户专区
    customerZone: 'Customer Zone',
    immediateOrder: 'Place Order',
    packageTracking: 'Track Package',
    contactCustomerService: 'Contact Support',
    professionalExpressService: 'Professional Express Service',
    serviceDescription: 'Providing same-day delivery, package tracking, safe and reliable express service',
    adminEntrance: 'Admin Access',
    admin: 'Admin',
    
    // 下单相关
    placeOrder: 'Place Order',
    expressOrder: 'Express Order',
    senderInfo: 'Sender Information',
    receiverInfo: 'Receiver Information',
    packageInfo: 'Package Information',
    contactInfo: 'Contact Information',
    yourContactInfo: 'Your Contact Information',
    name: 'Name',
    phone: 'Phone',
    address: 'Address',
    packageType: 'Package Type',
    weight: 'Weight',
    description: 'Description',
    estimatedCost: 'Estimated Cost',
    submitOrder: 'Submit Order',
    orderSuccess: 'Order Placed Successfully!',
    yourName: 'Your Name',
    yourPhone: 'Your Phone',
    pleaseEnterSenderName: 'Please enter sender name',
    pleaseEnterSenderPhone: 'Please enter sender phone',
    pleaseEnterSenderAddress: 'Please enter detailed sender address',
    pleaseEnterReceiverName: 'Please enter receiver name',
    pleaseEnterReceiverPhone: 'Please enter receiver phone',
    pleaseEnterReceiverAddress: 'Please enter detailed receiver address',
    pleaseEnterYourName: 'Please enter your name',
    pleaseEnterYourPhone: 'Please enter your phone number',
    pleaseEnterPackageNumber: 'Please enter package number',
    packageNumberExample: 'Please enter package number, e.g.: PKG001',
    receiver: 'Receiver',
    receiverAddress: 'Receiver Address',
    courier: 'Courier',
    createTime: 'Create Time',
    pickupTime: 'Pickup Time',
    deliveryTime: 'Delivery Time',
    packageStatus: 'Package Status',
    status: 'Status',
    pending: 'Pending Pickup',
    pickedUp: 'Picked Up',
    delivering: 'Delivering',
    delivered: 'Delivered',
    cancelled: 'Cancelled',
    
    // 包裹追踪
    trackPackage: 'Track Package',
    packageNumber: 'Package Number',
    query: 'Query',
    trackingResult: 'Tracking Result',
    picked: 'Picked Up',
    
    // 管理系统
    dashboard: 'Dashboard',
    packageManagement: 'Package Management',
    courierManagement: 'Courier Management',
    financeManagement: 'Finance Management',
    settings: 'Settings',
    myTasks: 'My Tasks',
    map: 'Map',
    selectFromMap: 'Select from Map',
    selectSenderAddress: 'Select Sender Address',
    selectReceiverAddress: 'Select Receiver Address',
    currentLocation: 'Current Location',
    selectLocation: 'Select Location',
    confirmSelection: 'Confirm Selection',
    locationSelected: 'Address Selected',
    getCurrentLocation: 'Get Current Location',
    locationPermissionDenied: 'Location Permission Denied',
    locationPermissionMessage: 'Please allow the app to access your location in settings to use map features.',
    getLocationFailed: 'Get Location Failed',
    getLocationErrorMessage: 'Please check your GPS and network connection, and ensure location permission is granted.',
    locationSuccess: 'Location Retrieved Successfully!',
    locationSuccessMessage: 'Latitude: {latitude}\nLongitude: {longitude}\nAccuracy: {accuracy}m',
    pleaseSelectLocation: 'Please select a location first',
    scan: 'Scan',
    profile: 'Profile',
    
    // 统计
    statistics: 'Statistics',
    total: 'Total',
    today: 'Today',
    thisMonth: 'This Month',
    income: 'Income',
    expense: 'Expense',
    profit: 'Profit',
    completed: 'Completed',
    inProgress: 'In Progress',
    
    // 设置
    generalSettings: 'General Settings',
    accountSecurity: 'Account & Security',
    helpSupport: 'Help & Support',
    pushNotifications: 'Push Notifications',
    languageSettings: 'Language Settings',
    themeMode: 'Theme Mode',
    changePassword: 'Change Password',
    permissionManagement: 'Permission Management',
    privacySettings: 'Privacy Settings',
    aboutUs: 'About Us',
    userGuide: 'User Guide',
    visitWebsite: 'Visit Website',
    
    // 帮助内容
    howToOrder: 'How to Place Order',
    howToTrack: 'How to Track Package',
    howToContact: 'How to Contact Support',
    shippingCost: 'Shipping Cost',
    shippingTime: 'Shipping Time',
    securityGuarantee: 'Security Guarantee',
    
    // 操作与详情
    call: 'Call',
    navigate: 'Navigate',
    uploadPhoto: 'Upload Photo',
    updateStatus: 'Update Status',
    camera: 'Camera',
    startCamera: 'Take Photo',
    packageDetail: 'Package Detail',
    cod: 'COD Amount',
    shippingFee: 'Shipping Fee',
    totalAmount: 'Total Amount',
    note: 'Note',
    confirmUpdate: 'Confirm Update',
    statusUpdateSuccess: 'Status Updated',
    statusUpdateFailed: 'Update Failed',
    photoUploaded: 'Photo Uploaded',
    scanSuccess: 'Scan Success',
    confirmDelivery: 'Confirm Delivery',
    locationVerified: 'Location Verified',
    locationWarning: 'Location Warning',
    retry: 'Retry',
    rephoto: 'Retake',
    confirmUpload: 'Confirm Upload',
    uploading: 'Uploading...',
    scanInstruction: 'Align QR/Barcode within frame',
    scanResult: 'Scan Result',

    tabHome: 'Home',
    tabAccount: 'Account',
    tabMyTasks: 'My Tasks',
    tipTitle: 'Notice',
    sessionKickedTitle: 'Session issue',
    sessionKickedMessage: 'Your account signed in on another device. This device was signed out.',
    criticalAppErrorTitle: '⚠️ Application error',
    criticalAppErrorMessage: 'Sorry, the app hit a fatal error. This has been reported. Please try restarting the app.',
    unknownError: 'Unknown error',
    ok: 'OK',
    initTakingLong: 'Still initializing…',
    initSlowHint: 'If this takes too long, check your network or restart the app.',
    syncInProgress: 'Syncing ({count})',
    syncPending: 'Pending sync ({count})',
    newOrderVoiceAnnouncement: 'You have a new local delivery order. Please check it in time.',

    financeManagementTitle: 'Finance',
    financeTabOverview: 'Overview',
    financeTabRecords: 'Records',
    financeTabAnalytics: 'Analytics',
    financeTabReports: 'Reports',
    financeLoadingData: 'Loading finance data…',
    financeFillCategoryAndAmount: 'Please enter category and amount',
    financeAddFailed: 'Could not add record',
    financeAddSuccess: 'Finance record added',
    financeConfirmDeleteTitle: 'Delete record',
    financeConfirmDeleteBody: 'Delete this finance record?\n\nCategory: {category}\nAmount: {amount} {currency}',
    financeRecordDeleted: 'Record deleted',
    financeDeleteFailed: 'Delete failed',
    financeConfirmBatchDelete: 'Batch delete',
    financeBatchDeleteConfirm: 'Delete {count} selected records?',
    financeBatchDeleteFailed: 'Batch delete failed',
    financeBatchDeleteSuccess: 'Deleted {count} records',
    financeActionOptions: 'Actions',
    financeChooseActionFor: 'Choose an action for "{category}"',
    financeMonthlyReport: 'Monthly report',
    financeMonthlyReportHint: 'Generate monthly finance report…',
    financeExportData: 'Export',
    financeExportDataHint: 'Export all finance data…',
    financeTaxReport: 'Tax report',
    financeTaxReportHint: 'Generate tax filing materials…',
    financeStatusCompleted: 'Completed',
    financeStatusPending: 'Pending',
    financeStatusCancelled: 'Cancelled',
    financeAddRecordTitle: 'Add finance record',

    envSectionTitle: 'Environment & push',
    envRuntimeLabel: 'Runtime',
    envRuntimeExpoGoIos: 'Expo Go (iOS): for development; remote push works.',
    envRuntimeExpoGoAndroid: 'Expo Go (Android): remote push registration is blocked by the platform; use a store or dev build.',
    envRuntimeStandalone: 'Store / standalone build: full push and background behavior for daily use.',
    envRuntimeBare: 'Bare / custom native: same as your native project; verify push credentials per build.',
    envRuntimeUnknown: 'Unknown environment',
    envPushLabel: 'Remote push',
    envPushReady: 'Push registration available (real device, notification permission).',
    envPushExpoGoAndroid: 'Cannot register push (Expo Go on Android limitation).',
    envPushSimulator: 'Simulator does not support push; test on a real device.',
    envPushNoModule: 'Notification module not loaded; use a production build.',
    envPushFootnote: 'New orders can still use in-app realtime and voice; push helps when the app is backgrounded.',
    openSystemSettings: 'Open Settings',
    locationOpenSettingsHint: 'Location was denied and cannot be asked again. Enable location for this app in system settings.',
    adminAccessDeniedTitle: 'Access denied',
    adminAccessDeniedBody: 'Your role cannot open this management screen.',
    a11yBack: 'Go back',
    a11yLogout: 'Log out',
    a11yOnlineToggle: 'Toggle online for orders',
    a11yPackageOpenDetail: 'Open package details',
    a11yNextStepAction: 'Next delivery step',
    a11yRefreshTaskList: 'Refresh task list',
    a11yCallRecipient: 'Call recipient',
    a11yNavigateToAddress: 'Open maps navigation',
    a11ySyncBadge: 'Offline sync status',
    a11yMapNavPickup: 'Navigate to pickup',
    a11yMapNavDelivery: 'Navigate to delivery',
    a11yMapStartDelivery: 'Start delivering this stop',
    a11yMapFinishDelivery: 'Complete or finish this delivery',
    a11yMapScanPickup: 'Scan to pick up',
    a11yMapManualPickup: 'Manual pickup confirm',
    a11yMapPlanRoute: 'Plan route from your location',
    a11yMapSearchPackages: 'Search package ID or address',
    a11yMapRoutePreviewClose: 'Close route preview',
    a11yMapOpenGoogleNav: 'Start navigation in maps app',
    a11yScanToggleMode: 'Switch camera scan or manual input',
    a11yScanGrantCamera: 'Grant camera for scanning',
    a11yScanRetryCamera: 'Retry camera',
    a11yScanRescan: 'Scan again',
    a11yScanPackageInput: 'Enter package ID or transfer code',
    a11yScanLookupPackage: 'Look up package',
    a11yMapReportAnomaly: 'Report delivery issue',
    a11yMapPhotoDelivery: 'Take photo as delivery proof',
    a11yMapSubmitAnomaly: 'Submit anomaly report',
  },
  
  my: {
    // 通用（缅甸语）
    loading: 'လုပ်ဆောင်နေသည်...',
    save: 'သိမ်းမည်',
    cancel: 'ပယ်ဖျက်မည်',
    confirm: 'အတည်ပြုမည်',
    delete: 'ဖျက်မည်',
    edit: 'ပြင်ဆင်မည်',
    add: 'ထည့်မည်',
    search: 'ရှာမည်',
    refresh: 'ပြန်လည်ရယူမည်',
    back: 'ပြန်မည်',
    close: 'ပိတ်မည်',
    success: 'အောင်မြင်ပါသည်',
    error: 'အမှားရှိပါသည်',
    
    // 客户专区
    customerZone: 'ဖောက်သည်ဇုန်',
    immediateOrder: 'ချက်ချင်းမှာယူမည်',
    packageTracking: 'ပက်ကေ့ဂျ်ခြေရာခံမည်',
    contactCustomerService: 'ဖောက်သည်ဝန်ဆောင်မှုဆက်သွယ်မည်',
    professionalExpressService: 'ပရော်ဖက်ရှင်နယ်စာတိုက်ဝန်ဆောင်မှု',
    serviceDescription: 'တစ်နေ့တည်းပေးပို့ခြင်း၊ ပက်ကေ့ဂျ်ခြေရာခံခြင်း၊ ဘေးကင်းယုံကြည်စရာစာတိုက်ဝန်ဆောင်မှုများ ပေးအပ်ပါသည်',
    adminEntrance: 'စီမံခန့်ခွဲသူ၀င်ပေါက်',
    admin: 'စီမံခန့်ခွဲသူ',
    
    // 下单相关
    placeOrder: 'ချက်ခြင်းမှာယူပါ',
    expressOrder: 'အမြန်ပို့ဆောင်မှာယူပါ',
    senderInfo: 'ပို့သူအချက်အလက်',
    receiverInfo: 'လက်ခံသူအချက်အလက်',
    packageInfo: 'ပက်ကေ့ဂျ်အချက်အလက်',
    contactInfo: 'ဆက်သွယ်ရေးအချက်အလက်',
    yourContactInfo: 'သင့်ဆက်သွယ်ရေးအချက်အလက်',
    name: 'နာမည်',
    phone: 'ဖုန်းနံပါတ်',
    address: 'လိပ်စာ',
    packageType: 'ပက်ကေ့ဂျ်အမျိုးအစား',
    weight: 'အလေးချိန်',
    description: 'ဖော်ပြချက်',
    estimatedCost: 'ခန့်မှန်းကုန်ကျစရိတ်',
    submitOrder: 'အော်ဒါတင်မည်',
    orderSuccess: 'အော်ဒါအောင်မြင်ပါသည်!',
    yourName: 'သင့်နာမည်',
    yourPhone: 'သင့်ဖုန်းနံပါတ်',
    pleaseEnterSenderName: 'ပို့သူနာမည်ထည့်သွင်းပါ',
    pleaseEnterSenderPhone: 'ပို့သူဖုန်းနံပါတ်ထည့်သွင်းပါ',
    pleaseEnterSenderAddress: 'ပို့သူလိပ်စာအသေးစိတ်ထည့်သွင်းပါ',
    pleaseEnterReceiverName: 'လက်ခံသူနာမည်ထည့်သွင်းပါ',
    pleaseEnterReceiverPhone: 'လက်ခံသူဖုန်းနံပါတ်ထည့်သွင်းပါ',
    pleaseEnterReceiverAddress: 'လက်ခံသူလိပ်စာအသေးစိတ်ထည့်သွင်းပါ',
    pleaseEnterYourName: 'သင့်နာမည်ထည့်သွင်းပါ',
    pleaseEnterYourPhone: 'သင့်ဖုန်းနံပါတ်ထည့်သွင်းပါ',
    pleaseEnterPackageNumber: 'ပက်ကေ့ဂျ်နံပါတ်ထည့်သွင်းပါ',
    packageNumberExample: 'ပက်ကေ့ဂျ်နံပါတ်ထည့်သွင်းပါ၊ ဥပမာ: PKG001',
    receiver: 'လက်ခံသူ',
    receiverAddress: 'လက်ခံသူလိပ်စာ',
    courier: 'စာပို့သမား',
    createTime: 'ဖန်တီးချိန်',
    pickupTime: 'ယူချိန်',
    deliveryTime: 'ပေးပို့ချိန်',
    packageStatus: 'ပက်ကေ့ဂျ်အခြေအနေ',
    status: 'အခြေအနေ',
    pending: 'ကောက်ယူရန်စောင့်ဆိုင်း',
    pickedUp: 'ကောက်ယူပြီး',
    delivering: 'ပို့ဆောင်နေသည်',
    delivered: 'ပို့ဆောင်ပြီး',
    cancelled: 'ပယ်ဖျက်ပြီး',
    
    // 包裹追踪
    trackPackage: 'ပက်ကေ့ဂျ်ခြေရာခံခြင်း',
    packageNumber: 'ပက်ကေ့ဂျ်နံပါတ်',
    query: 'မေးမြန်းမည်',
    trackingResult: 'ခြေရာခံရလဒ်',
    picked: 'ယူပြီးပါပြီ',
    
    // 管理系统
    dashboard: 'ဒက်ရှ်ဘုတ်',
    packageManagement: 'ပက်ကေ့ဂျ်စီမံခန့်ခွဲခြင်း',
    courierManagement: 'စာပို့သမားစီမံခန့်ခွဲခြင်း',
    financeManagement: 'ဘဏ္ဍာရေးစီမံခန့်ခွဲခြင်း',
    settings: 'ဆက်တင်များ',
    myTasks: 'ကျွန်ုပ်၏အလုပ်များ',
    map: 'မြေပုံ',
    selectFromMap: 'မြေပုံမှရွေးချယ်ပါ',
    selectSenderAddress: 'ပို့သူလိပ်စာရွေးချယ်ပါ',
    selectReceiverAddress: 'လက်ခံသူလိပ်စာရွေးချယ်ပါ',
    currentLocation: 'လက်ရှိတည်နေရာ',
    selectLocation: 'တည်နေရာရွေးချယ်ပါ',
    confirmSelection: 'ရွေးချယ်မှုအတည်ပြုပါ',
    locationSelected: 'လိပ်စာရွေးချယ်ပြီးပါပြီ',
    getCurrentLocation: 'လက်ရှိတည်နေရာရယူပါ',
    locationPermissionDenied: 'တည်နေရာခွင့်ပြုချက်ငြင်းဆိုပါပြီ',
    locationPermissionMessage: 'မြေပုံအင်္ဂါရပ်များကိုအသုံးပြုရန်အတွက် အက်ပ်ကိုသင့်တည်နေရာကိုအသုံးပြုခွင့်ပေးပါ။',
    getLocationFailed: 'တည်နေရာရယူခြင်းမအောင်မြင်ပါ',
    getLocationErrorMessage: 'သင့် GPS နှင့်ကွန်ရက်ချိတ်ဆက်မှုကိုစစ်ဆေးပြီး တည်နေရာခွင့်ပြုချက်ပေးထားကြောင်းသေချာစေပါ။',
    locationSuccess: 'တည်နေရာရယူခြင်းအောင်မြင်ပါပြီ!',
    locationSuccessMessage: 'လတ္တီတွဒ်: {latitude}\nလောင်ဂျီတွဒ်: {longitude}\nတိကျမှု: {accuracy}မီတာ',
    pleaseSelectLocation: 'ဦးစွာတည်နေရာတစ်ခုရွေးချယ်ပါ',
    scan: 'စကင်န်ဖတ်ခြင်း',
    profile: 'ကျွန်ုပ်၏',
    
    // 统计
    statistics: 'စာရင်းအင်း',
    total: 'စုစုပေါင်း',
    today: 'ယနေ့',
    thisMonth: 'ယခုလ',
    income: 'ဝင်ငွေ',
    expense: 'ထွက်ငွေ',
    profit: 'အမြတ်',
    completed: 'ပြီးစီးပါပြီ',
    inProgress: 'လုပ်ဆောင်နေသည်',
    
    // 设置
    generalSettings: 'ယေဘုယျဆက်တင်များ',
    accountSecurity: 'အကောင့်နှင့်လုံခြုံရေး',
    helpSupport: 'အကူအညီနှင့်ပံ့ပိုးမှု',
    pushNotifications: 'အကြောင်းကြားချက်များ',
    languageSettings: 'ဘာသာစကားဆက်တင်',
    themeMode: 'အပြင်အဆင်',
    changePassword: 'စကားဝှက်ပြောင်းခြင်း',
    permissionManagement: 'ခွင့်ပြုချက်စီမံခန့်ခွဲခြင်း',
    privacySettings: 'ကိုယ်ရေးကိုယ်တာဆက်တင်များ',
    aboutUs: 'ကျွန်ုပ်တို့အကြောင်း',
    userGuide: 'အသုံးပြုမှုလမ်းညွှန်',
    visitWebsite: 'ဝက်ဘ်ဆိုက်သို့သွားရောက်ခြင်း',
    
    // 帮助内容
    howToOrder: 'မှာယူနည်း',
    howToTrack: 'ပက်ကေ့ဂျ်ခြေရာခံနည်း',
    howToContact: 'ဖောက်သည်ဝန်ဆောင်မှုဆက်သွယ်နည်း',
    shippingCost: 'ပေးပို့ခ',
    shippingTime: 'ပေးပို့ချိန်',
    securityGuarantee: 'လုံခြုံရေးအာမခံချက်',
    
    // 操作与详情
    call: 'ဖုန်းခေါ်မည်',
    navigate: 'လမ်းညွှန်',
    uploadPhoto: 'ဓာတ်ပုံတင်မည်',
    updateStatus: 'အခြေအနေပြောင်းမည်',
    camera: 'ကင်မရာ',
    startCamera: 'ဓာတ်ပုံရိုက်မည်',
    packageDetail: 'ပက်ကေ့ဂျ်အသေးစိတ်',
    cod: 'ငွေကောက်ခံရန်',
    shippingFee: 'ပို့ဆောင်ခ',
    totalAmount: 'စုစုပေါင်းငွေပမာဏ',
    note: 'မှတ်ချက်',
    confirmUpdate: 'အတည်ပြုမည်',
    statusUpdateSuccess: 'အခြေအနေပြောင်းလဲပြီးပါပြီ',
    statusUpdateFailed: 'မအောင်မြင်ပါ',
    photoUploaded: 'ဓာတ်ပုံတင်ပြီးပါပြီ',
    scanSuccess: 'စကင်န်အောင်မြင်သည်',
    confirmDelivery: 'ပို့ဆောင်မှုအတည်ပြုမည်',
    locationVerified: 'တည်နေရာအတည်ပြုပြီး',
    locationWarning: 'တည်နေရာသတိပေးချက်',
    retry: 'ထပ်မံကြိုးစားမည်',
    rephoto: 'ပြန်ရိုက်မည်',
    confirmUpload: 'အတည်ပြုသည်',
    uploading: 'တင်နေသည်...',
    scanInstruction: 'QR/ဘားကုဒ်ကို ဘောင်အတွင်းထားပါ',
    scanResult: 'စကင်န်ရလဒ်',

    tabHome: 'ပင်မ',
    tabAccount: 'အကောင့်',
    tabMyTasks: 'ကျွန်ုပ်၏တာဝန်',
    tipTitle: 'အသိပေးချက်',
    sessionKickedTitle: 'အကောင့်အခြေအနေ',
    sessionKickedMessage: 'သင့်အကောင့်ကို အခြားစက်တစ်ခုမှဝင်ရောက်ထားပါသည်။ ဤစက်မှထွက်ပြီးပါပြီ။',
    criticalAppErrorTitle: '⚠️ အက်ပ်အမှား',
    criticalAppErrorMessage: 'တောင်းပန်ပါသည်၊ အက်ပ်တွင် အရေးကြီးအမှားအယွင်းရှိပါသည်။ ကျွန်ုပ်တို့မှတ်တမ်းတင်ပြီးပါပြီ။ အက်ပ်ကို ပြန်ဖွင့်ကြည့်ပါ။',
    unknownError: 'မသိရသောအမှား',
    ok: 'အိုကေ',
    initTakingLong: 'စတင်နေဆဲ…',
    initSlowHint: 'ကြာလွန်းပါက ကွန်ရက်ကိုစစ်ဆေးပါ သို့မဟုတ် အက်ပ်ကို ပြန်ဖွင့်ပါ။',
    syncInProgress: 'ထပ်တူညီမှု ({count})',
    syncPending: 'စောင့်ဆိုင်းထပ်တူညီမှု ({count})',
    newOrderVoiceAnnouncement: 'သင့်တွင် မြို့တွင်းပို့ဆောင်ရေး အော်ဒါအသစ်တစ်ခုရှိသည်။ ကျေးဇူးပြု၍ အချိန်မီစစ်ဆေးပါ။',

    financeManagementTitle: 'ဘဏ္ဍာရေးစီမံခန့်ခွဲခြင်း',
    financeTabOverview: 'ခြုံငုံသုံးသပ်',
    financeTabRecords: 'မှတ်တမ်းများ',
    financeTabAnalytics: 'ခွဲခြမ်းစိတ်ဖြာ',
    financeTabReports: 'အစီရင်ခံစာများ',
    financeLoadingData: 'ဘဏ္ဍာရေးဒေတာတင်နေသည်…',
    financeFillCategoryAndAmount: 'အမျိုးအစားနှင့် ငွေပမာဏထည့်သွင်းပါ',
    financeAddFailed: 'မှတ်တမ်းထည့်သွင်းမရပါ',
    financeAddSuccess: 'ဘဏ္ဍာရေးမှတ်တမ်းထည့်သွင်းပြီးပါပြီ',
    financeConfirmDeleteTitle: 'ဖျက်ရန်အတည်ပြုပါ',
    financeConfirmDeleteBody: 'ဤဘဏ္ဍာရေးမှတ်တမ်းကို ဖျက်မလား။\n\nအမျိုးအစား：{category}\nငွေပမာဏ：{amount} {currency}',
    financeRecordDeleted: 'မှတ်တမ်းဖျက်ပြီးပါပြီ',
    financeDeleteFailed: 'ဖျက်မရပါ',
    financeConfirmBatchDelete: 'အများအပြားဖျက်ရန်',
    financeBatchDeleteConfirm: 'ရွေးချယ်ထားသော မှတ်တမ်း {count} ခုကို ဖျက်မလား။',
    financeBatchDeleteFailed: 'အများအပြားဖျက်ရန်မအောင်မြင်ပါ',
    financeBatchDeleteSuccess: 'မှတ်တမ်း {count} ခုဖျက်ပြီးပါပြီ',
    financeActionOptions: 'လုပ်ဆောင်ချက်များ',
    financeChooseActionFor: '「{category}」အတွက် လုပ်ဆောင်ချက်ရွေးပါ',
    financeMonthlyReport: 'လစဉ်အစီရင်ခံစာ',
    financeMonthlyReportHint: 'လစဉ်ဘဏ္ဍာရေးအစီရင်ခံစာထုတ်မည်…',
    financeExportData: 'ဒေတာထုတ်ယူ',
    financeExportDataHint: 'ဘဏ္ဍာရေးဒေတာအားလုံးထုတ်ယူ…',
    financeTaxReport: 'အခွန်အစီရင်ခံစာ',
    financeTaxReportHint: 'အခွန်တင်သွင်းမှုအချက်အလက်ထုတ်မည်…',
    financeStatusCompleted: 'ပြီးစီးပါပြီ',
    financeStatusPending: 'စောင့်ဆိုင်းဆဲ',
    financeStatusCancelled: 'ပယ်ဖျက်ပြီး',
    financeAddRecordTitle: 'ဘဏ္ဍာရေးမှတ်တမ်းအသစ်',

    envSectionTitle: 'ပတ်ဝန်းကျင်နှင့် push',
    envRuntimeLabel: 'လက်ရှိအလုပ်လုပ်ပုံ',
    envRuntimeExpoGoIos: 'Expo Go (iOS) — ဖွံ့ဖြိုးမှုအတွက်၊ အဝေးသတိပေးချက်အသုံးပြုနိုင်သည်။',
    envRuntimeExpoGoAndroid: 'Expo Go (Android) — စနစ်က အဝေးသတိပေးချက်မှတ်ပုံတင်ခြင်းကို ခွင့်မပြုပါ။ စတိုးအက်ပ် သို့မဟုတ် ဖွံ့ဖြိုးမှုဗားရှင်းသုံးပါ။',
    envRuntimeStandalone: 'စတိုး/standalone build — နေ့စဉ်အသုံးပြုရန် အပြည့်အဝ push နှင့် နောက်ခံလုပ်ဆောင်ချက်များ။',
    envRuntimeBare: 'Bare / စိတ်ကြိုက် native — native ပရောဂျက်နှင့်တူသည်။',
    envRuntimeUnknown: 'မသိသောပတ်ဝန်းကျင်',
    envPushLabel: 'အဝေးသတိပေးချက်',
    envPushReady: 'မှတ်ပုံတင်နိုင်သည် (စစ်မှန်စက်၊ အကြောင်းကြားခွင့်ပြုချက်)။',
    envPushExpoGoAndroid: 'ဤပတ်ဝန်းကျင်တွင် မှတ်ပုံတင်မရပါ (Expo Go Android)။',
    envPushSimulator: 'စင်မလေးတာတွင် push မပံ့ပိုးပါ။ စစ်မှန်စက်ဖြင့် စမ်းပါ။',
    envPushNoModule: 'အကြောင်းကြားမှု မော်ဂျူးမတင်ပါ။ ထုတ်ကုန်ဗားရှင်းသုံးပါ။',
    envPushFootnote: 'အော်ဒါအသစ်ကို အက်ပ်အတွင်း realtime နှင့် အသံဖြင့် ရနိုင်သည်။',
    openSystemSettings: 'စနစ်ဆက်တင်ဖွင့်မည်',
    locationOpenSettingsHint: 'တည်နေရာခွင့်ပြုချက်ငြင်းပြီး ထပ်မမေးနိုင်ပါ။ စနစ်ဆက်တင်တွင် ဖွင့်ပေးပါ။',
    adminAccessDeniedTitle: 'ခွင့်ပြုချက်မရှိ',
    adminAccessDeniedBody: 'ဤစီမံခန့်ခွဲမှုစာမျက်နှာကို သင့်အခန်းကဏ္ဍမှ မဖွင့်နိုင်ပါ။',
    a11yBack: 'နောက်သို့',
    a11yLogout: 'အကောင့်မှထွက်ရန်',
    a11yOnlineToggle: 'အွန်လိုင်းမှာယူမှု ဖွင့်/ပိတ်',
    a11yPackageOpenDetail: 'ပက်ကေ့ဂျ်အသေးစိတ်ဖွင့်မည်',
    a11yNextStepAction: 'နောက်တစ်ဆင့် ပို့ဆောင်မှု',
    a11yRefreshTaskList: 'တာဝန်စာရင်းပြန်လည်ရယူမည်',
    a11yCallRecipient: 'လက်ခံသူကိုခေါ်မည်',
    a11yNavigateToAddress: 'မြေပုံလမ်းညွှန်ဖွင့်မည်',
    a11ySyncBadge: 'အော့ဖ်လိုင်း ထပ်တူညီမှု',
    a11yMapNavPickup: 'ပစ္စည်းယူမည့်နေရာသို့ လမ်းညွှန်',
    a11yMapNavDelivery: 'ပစ္စည်းပို့မည့်နေရာသို့ လမ်းညွှန်',
    a11yMapStartDelivery: 'ဤတာဝန်ကို ပို့ဆောင်မှု စတင်မည်',
    a11yMapFinishDelivery: 'ပို့ဆောင်မှု ပြီးမြောက်အောင် သို့မဟုတ် အဆုံးသတ်မည်',
    a11yMapScanPickup: 'စကင်န်ဖြင့် ယူရန်',
    a11yMapManualPickup: 'ကိုယ်တိုင်ယူမှု အတည်ပြုမည်',
    a11yMapPlanRoute: 'လက်ရှိတည်နေရာမှ ပို့ဆောင်လမ်းကြောင်း စီမံပါ',
    a11yMapSearchPackages: 'ပါဆယ်နံပါတ် သို့မဟုတ် လိပ်စာရှာပါ',
    a11yMapRoutePreviewClose: 'လမ်းကြောင်းအစမ်းကြည့်ကို ပိတ်မည်',
    a11yMapOpenGoogleNav: 'ပြင်ပမြေပုံအက်ပ်တွင် လမ်းညွှန်စတင်မည်',
    a11yScanToggleMode: 'စကင်န်နှင့် လက်ဖြင့် ထည့်သွင်းမှု ပြောင်းမည်',
    a11yScanGrantCamera: 'စကင်န်အတွက် ကင်မရာခွင့်ပြုချက်ပေးမည်',
    a11yScanRetryCamera: 'ကင်မရာပြန်ကြိုးစားမည်',
    a11yScanRescan: 'ပြန်စကင်န်ဖတ်မည်',
    a11yScanPackageInput: 'ပါဆယ်နံပါတ် သို့မဟုတ် လွှဲပြောင်းကုဒ်ထည့်ပါ',
    a11yScanLookupPackage: 'ပါဆယ်ရှာမည်',
    a11yMapReportAnomaly: 'ပို့ဆောင်မှုအမှားအယွင်းတင်ပြမည်',
    a11yMapPhotoDelivery: 'ပို့ဆောင်မှုအထောက်အထားဓာတ်ပုံရိုက်မည်',
    a11yMapSubmitAnomaly: 'အမှားအယွင်းတင်ပြမည်',
  }
};

// 获取当前语言文本
export const useTranslation = (language: string | Language): LanguageTexts => {
  return translations[language] || translations.zh;
};

/** 替换 `{key}` 占位符，用于 syncInProgress、financeBatchDeleteConfirm 等 */
export function formatI18n(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : ''
  );
}
