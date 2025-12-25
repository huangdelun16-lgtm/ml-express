// 国际化多语言系统
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
  }
};

// 获取当前语言文本
export const useTranslation = (language: string): LanguageTexts => {
  return translations[language] || translations.zh;
};
