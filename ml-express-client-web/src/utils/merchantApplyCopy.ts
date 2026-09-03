export type MerchantApplyLang = 'zh' | 'en' | 'my';

export type MerchantApplyCopy = {
  badge: string;
  title: string;
  subtitle: string;
  step1: string;
  step2: string;
  step3: string;
  registration: string;
  salesperson: string;
  salespersonPlaceholder: string;
  applicationDate: string;
  uploadLicense: string;
  uploadHint: string;
  uploadFormats: string;
  archiveHint: string;
  removeDoc: string;
  noDocsYet: string;
  uploadUploading: string;
  uploadReady: string;
  uploadFailed: string;
  uploadRetry: string;
  uploadNeedReady: string;
  uploadStillUploading: string;
  basic: string;
  storeName: string;
  storeType: string;
  storeTypePlaceholder: string;
  region: string;
  address: string;
  mapHint: string;
  phone: string;
  email: string;
  manager: string;
  managerPhone: string;
  hours: string;
  hoursPlaceholder: string;
  cod: string;
  notes: string;
  notesPlaceholder: string;
  submit: string;
  submitting: string;
  home: string;
  successTitle: string;
  coords: string;
  mapUnavailable: string;
  mapAuthFailed: string;
  mapLoading: string;
  submitError: string;
  packingLabel: string;
  packingNeedView: string;
  packingView: string;
  packingAck: string;
  packingPending: string;
  packingDone: string;
  packingKicker: string;
  packingForType: string;
  packingConfirm: string;
  packingClose: string;
  packingConfirmHint: string;
  packingRequired: string;
  locateLabel: string;
  locateUnsupported: string;
  locateDenied: string;
  locateUnavailable: string;
  locateTimeout: string;
  locateFailed: string;
  searchAddress: string;
  searchAddressPlaceholder: string;
  searchAddressBtn: string;
  searchNoResults: string;
  searchFailed: string;
  searchUseAddress: string;
  manualCoords: string;
  manualLat: string;
  manualLng: string;
  applyCoords: string;
  invalidCoords: string;
  locationRequired: string;
  locationConfirmed: string;
  locationPending: string;
  geocodeFailed: string;
  coordsOutsideHint: string;
  successLead: string;
  successId: string;
  successCopyId: string;
  successCopied: string;
  successReview: string;
  successContact: string;
  successLookupTitle: string;
  successLookupHint: string;
  successLookupPhone: string;
  successLookupBtn: string;
  successLookuping: string;
  successApplyAgain: string;
  lookupNotFound: string;
  lookupFailed: string;
  checkStatus: string;
  hideStatus: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  statusUnknown: string;
  tooManyDocs: string;
  badFileType: string;
  fileTooLarge: string;
  pdfTooLarge: string;
};

const EN: MerchantApplyCopy = {
  badge: 'Partner onboarding',
  title: 'Join MARKET LINK Merchant Platform',
  subtitle:
    'Apply to list your store on our City Mall. After review, we will issue your store code and password for the Merchant App and Web.',
  step1: '1. Fill in details',
  step2: '2. Admin review',
  step3: '3. Receive login credentials',
  registration: 'Application registration',
  salesperson: 'Salesperson',
  salespersonPlaceholder: 'MARKET LINK sales contact name',
  applicationDate: 'Date',
  uploadLicense: '+ Upload license',
  uploadHint: 'Business license, shop registration, or other store credentials (required)',
  uploadFormats: 'JPG, PNG, WEBP or PDF · light compression only if the file is too large · PDF max 3.5MB · up to 8 files',
  archiveHint: 'Your application and license files are kept on file for audit if something goes wrong.',
  removeDoc: 'Remove',
  noDocsYet: 'No documents uploaded yet',
  uploadUploading: 'Uploading…',
  uploadReady: 'Uploaded',
  uploadFailed: 'Upload failed',
  uploadRetry: 'Retry',
  uploadNeedReady: 'Please wait for at least one document to finish uploading.',
  uploadStillUploading: 'A document is still uploading. Please wait.',
  basic: 'Store information',
  storeName: 'Store name',
  storeType: 'Store type',
  storeTypePlaceholder: 'Select a store type',
  region: 'City / region',
  address: 'Full address',
  mapHint: 'Search, tap the map, use your location, or enter coordinates to pin the store.',
  phone: 'Store phone',
  email: 'Email (optional)',
  manager: 'Manager name',
  managerPhone: 'Manager phone',
  hours: 'Operating hours',
  hoursPlaceholder: 'e.g. 08:00 - 22:00',
  cod: 'COD settlement cycle',
  notes: 'Notes (optional)',
  notesPlaceholder: 'Briefly describe your store or products…',
  submit: 'Submit application',
  submitting: 'Submitting…',
  home: 'Back to home',
  successTitle: 'Application submitted successfully',
  coords: 'Pinned location',
  mapUnavailable: 'Map tiles are unavailable. Search the address or enter latitude and longitude below.',
  mapAuthFailed:
    'Google Maps could not authorize this page. You can still search an address, use “Find current location”, or enter coordinates.',
  mapLoading: 'Loading map…',
  submitError: 'Submission failed. Please try again.',
  packingLabel: 'Platform packing style',
  packingNeedView: 'Open the packing style first, then confirm you understand.',
  packingView: 'View packing style',
  packingAck: 'I have read this packing style and will pack every order this way.',
  packingPending: 'Not confirmed yet',
  packingDone: 'Confirmed',
  packingKicker: 'Required packing style',
  packingForType: 'For this store type',
  packingConfirm: 'I understand',
  packingClose: 'Close',
  packingConfirmHint: 'Confirming unlocks the submit button. Changing store type will ask you to confirm again.',
  packingRequired: 'Please view and confirm the platform packing style before submitting.',
  locateLabel: 'Find current location',
  locateUnsupported: 'This browser does not support geolocation.',
  locateDenied: 'Location permission denied. Please allow location access and try again.',
  locateUnavailable: 'Current location is unavailable. Please check GPS or network and try again.',
  locateTimeout: 'Timed out while finding your location. Please try again.',
  locateFailed: 'Could not find your current location. Please try again.',
  searchAddress: 'Search on map',
  searchAddressPlaceholder: 'Shop name, street, or landmark',
  searchAddressBtn: 'Search',
  searchNoResults: 'No matching places. Try a shorter name or enter coordinates.',
  searchFailed: 'Address search failed. Enter coordinates if the map is unavailable.',
  searchUseAddress: 'Find this address on the map',
  manualCoords: 'Or enter coordinates',
  manualLat: 'Latitude',
  manualLng: 'Longitude',
  applyCoords: 'Use these coordinates',
  invalidCoords: 'Please enter valid latitude and longitude.',
  locationRequired: 'Please pin the real store location. The default city center cannot be submitted.',
  locationConfirmed: 'Location confirmed',
  locationPending: 'Location not confirmed yet',
  geocodeFailed: 'Could not fill the address from this pin. Please type the address.',
  coordsOutsideHint: 'These coordinates look outside Myanmar. Please double-check before submitting.',
  successLead: 'We have received your application. Keep this number — you will need it if you contact support.',
  successId: 'Application ID',
  successCopyId: 'Copy ID',
  successCopied: 'Copied',
  successReview: 'Review usually takes 1–2 working days.',
  successContact: 'After approval we will call the store phone or email you with the merchant login.',
  successLookupTitle: 'Check application status',
  successLookupHint: 'Enter the store phone used on the form. We only show status, store name, and time.',
  successLookupPhone: 'Store phone',
  successLookupBtn: 'Check status',
  successLookuping: 'Checking…',
  successApplyAgain: 'Submit another application',
  lookupNotFound: 'No application found for this phone number.',
  lookupFailed: 'Could not check status. Please try again later.',
  checkStatus: 'Already applied? Check status',
  hideStatus: 'Hide status check',
  statusPending: 'Pending review',
  statusApproved: 'Approved',
  statusRejected: 'Rejected',
  statusUnknown: 'Unknown status',
  tooManyDocs: 'Maximum 8 documents',
  badFileType: 'Only JPG, PNG, WEBP or PDF',
  fileTooLarge: 'Each image must be under 5MB',
  pdfTooLarge: 'PDF must be under 3.5MB',
};

const MY: MerchantApplyCopy = {
  badge: 'ကုန်သည်လျှောက်ထားမှု',
  title: 'MARKET LINK ကုန်သည်ပလက်ဖောင်းသို့ ချိတ်ဆက်ရန်',
  subtitle:
    'City Mall တွင် ဆိုင်ဖွင့်ရန် လျှောက်လွှာတင်ပါ။ Admin အတည်ပြုပြီးနောက် Merchant App/Web အတွက် ဆိုင်ကုဒ်နှင့် လျှို့ဝှက်နံပါတ် ပေးအပ်ပါမည်။',
  step1: '၁. အချက်အလက်ဖြည့်ပါ',
  step2: '၂. Admin စစ်ဆေးမည်',
  step3: '၃. အကောင့်ရယူပါ',
  registration: 'လျှောက်လွှာ မှတ်တမ်း',
  salesperson: 'အရောင်းနာမည်',
  salespersonPlaceholder: 'MARKET LINK အရောင်းသက်ဆိုင်ရာ အမည်',
  applicationDate: 'ရက်စွဲ',
  uploadLicense: '+ မှတ်ပုံတင်တင်ရန်',
  uploadHint: 'လုပ်ငန်းလိုင်စင်၊ ဆိုင်မှတ်ပုံတင် စသည့် အထောက်အထားများ (မဖြစ်မနေ)',
  uploadFormats: 'JPG, PNG, WEBP သို့ PDF · ဖိုင်ကြီးမှသာ အနည်းငယ်ချုံ့မည် · စာလုံးရှင်းနေစေရန် · PDF 3.5MB အထိ · ၈ ဖိုင်အထိ',
  archiveHint: 'လျှောက်လွှာနှင့် အထောက်အထားများကို ရေရှည်သိမ်းထားမည်။ လိုအပ်လျှင် စစ်ဆေးနိုင်သည်။',
  removeDoc: 'ဖယ်ရှားရန်',
  noDocsYet: 'မှတ်ပုံတင် မတင်ရသေးပါ',
  uploadUploading: 'တင်နေသည်…',
  uploadReady: 'တင်ပြီးပါပြီ',
  uploadFailed: 'တင်ရန် မအောင်မြင်ပါ',
  uploadRetry: 'ပြန်တင်ရန်',
  uploadNeedReady: 'မှတ်ပုံတင် အနည်းဆုံး ၁ ခု တင်ပြီးမှ ဆက်လုပ်ပါ။',
  uploadStillUploading: 'ဖိုင်တစ်ခု တင်နေသေးသည်။ ခဏစောင့်ပါ။',
  basic: 'ဆိုင်အချက်အလက်',
  storeName: 'ဆိုင်အမည်',
  storeType: 'ဆိုင်အမျိုးအစား',
  storeTypePlaceholder: 'ဆိုင်အမျိုးအစား ရွေးပါ',
  region: 'ဒေသ / မြို့',
  address: 'လိပ်စာ',
  mapHint: 'ရှာဖွေခြင်း၊ မြေပုံနှိပ်ခြင်း၊ လက်ရှိတည်နေရာ သို့မဟုတ် ကိုဩဒိနိတ်ဖြင့် ဆိုင်နေရာ ရွေးပါ။',
  phone: 'ဆိုင်ဖုန်း',
  email: 'Email (မဖြည့်လည်းရ)',
  manager: 'တာဝန်ခံအမည်',
  managerPhone: 'တာဝန်ခံဖုန်း',
  hours: 'ဖွင့်ချိန်',
  hoursPlaceholder: 'ဥပမာ 08:00 - 22:00',
  cod: 'COD ရက်ချိန်သတ်မှတ်ချက်',
  notes: 'မှတ်ချက် (မဖြည့်လည်းရ)',
  notesPlaceholder: 'ဆိုင်နှင့် ရောင်းချသောပစ္စည်းအကြောင်း အကျဉ်းချုပ်…',
  submit: 'လျှောက်လွှာတင်ရန်',
  submitting: 'တင်နေသည်…',
  home: 'ပင်မသို့',
  successTitle: 'လျှောက်လွှာ တင်ပြီးပါပြီ',
  coords: 'ရွေးချယ်ထားသော တည်နေရာ',
  mapUnavailable: 'မြေပုံ မရရှိနိုင်ပါ။ လိပ်စာရှာပါ သို့မဟုတ် ကိုဩဒိနိတ် ဖြည့်ပါ။',
  mapAuthFailed:
    'Google Maps ခွင့်ပြုချက် မအောင်မြင်ပါ။ လိပ်စာရှာခြင်း၊ လက်ရှိတည်နေရာ သို့မဟုတ် ကိုဩဒိနိတ်ဖြင့် ဆက်ရွေးနိုင်သည်။',
  mapLoading: 'မြေပုံ ဖွင့်နေသည်…',
  submitError: 'တင်သွင်းမှု မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။',
  packingLabel: 'ပလက်ဖောင်း သတ်မှတ် ထုပ်ပိုးစံ',
  packingNeedView: 'အရင်ဆုံး ထုပ်ပိုးနည်းကို ကြည့်ပါ။ နားလည်မှ အတည်ပြုပါ။',
  packingView: 'ထုပ်ပိုးနည်း ကြည့်မည်',
  packingAck: 'ဤထုပ်ပိုးနည်းကို ဖတ်ပြီးပါပြီ။ အော်ဒါတိုင်း ဤနည်းအတိုင်း ထုပ်ပိုးပါမည်။',
  packingPending: 'မအတည်ပြုရသေးပါ',
  packingDone: 'အတည်ပြုပြီးပါပြီ',
  packingKicker: 'လိုအပ်သည့် ထုပ်ပိုးစံ',
  packingForType: 'ဆိုင်အမျိုးအစား',
  packingConfirm: 'နားလည်ပါပြီ',
  packingClose: 'ပိတ်ရန်',
  packingConfirmHint: 'အတည်ပြုမှ လျှောက်လွှာတင်ခလုတ် ပွင့်ပါမည်။ ဆိုင်အမျိုးအစားပြောင်းရင် ပြန်အတည်ပြုရပါမည်။',
  packingRequired: 'လျှောက်လွှာမတင်မီ ပလက်ဖောင်းထုပ်ပိုးစံကို ကြည့်ပြီး အတည်ပြုပါ။',
  locateLabel: 'လက်ရှိတည်နေရာ ရှာရန်',
  locateUnsupported: 'ဤဘရောက်ဇာသည် တည်နေရာရှာခြင်းကို မပံ့ပိုးပါ။',
  locateDenied: 'တည်နေရာခွင့်ပြုချက် ငြင်းပယ်ထားသည်။ ခွင့်ပြုပြီး ထပ်မံကြိုးစားပါ။',
  locateUnavailable: 'လက်ရှိတည်နေရာ မရနိုင်ပါ။ GPS သို့မဟုတ် ကွန်ရက်ကို စစ်ဆေးပါ။',
  locateTimeout: 'တည်နေရာရှာရန် အချိန်ကုန်သွားပါသည်။ ထပ်မံကြိုးစားပါ။',
  locateFailed: 'လက်ရှိတည်နေရာ မရှာနိုင်ပါ။ ထပ်မံကြိုးစားပါ။',
  searchAddress: 'မြေပုံတွင် ရှာရန်',
  searchAddressPlaceholder: 'ဆိုင်အမည်၊ လမ်း သို့မဟုတ် မှတ်တိုင်',
  searchAddressBtn: 'ရှာရန်',
  searchNoResults: 'မတွေ့ပါ။ အမည်တိုတို သို့မဟုတ် ကိုဩဒိနိတ် ဖြည့်ပါ။',
  searchFailed: 'လိပ်စာရှာ၍ မရပါ။ မြေပုံမရလျှင် ကိုဩဒိနိတ် ဖြည့်ပါ။',
  searchUseAddress: 'ဤလိပ်စာကို မြေပုံတွင် ရှာမည်',
  manualCoords: 'သို့မဟုတ် ကိုဩဒိနိတ် ဖြည့်ပါ',
  manualLat: 'လတ္တီတွဒ်',
  manualLng: 'လောင်ဂျီတွဒ်',
  applyCoords: 'ဤကိုဩဒိနိတ် သုံးမည်',
  invalidCoords: 'မှန်ကန်သော လတ္တီတွဒ် / လောင်ဂျီတွဒ် ဖြည့်ပါ။',
  locationRequired: 'ဆိုင်၏ အမှန်တကယ် တည်နေရာကို ရွေးပါ။ မြို့လယ် ပုံသေနေရာဖြင့် တင်၍မရပါ။',
  locationConfirmed: 'တည်နေရာ အတည်ပြုပြီး',
  locationPending: 'တည်နေရာ မအတည်ပြုရသေးပါ',
  geocodeFailed: 'ဤနေရာမှ လိပ်စာ မယူနိုင်ပါ။ ကိုယ်တိုင် ဖြည့်ပါ။',
  coordsOutsideHint: 'ဤကိုဩဒိနိတ်သည် မြန်မာပြင်ပ ဖြစ်နိုင်သည်။ ထပ်စစ်ပါ။',
  successLead: 'လျှောက်လွှာ လက်ခံပြီးပါပြီ။ ဤနံပါတ်ကို သိမ်းထားပါ။',
  successId: 'လျှောက်လွှာ နံပါတ်',
  successCopyId: 'ကူးယူရန်',
  successCopied: 'ကူးပြီးပါပြီ',
  successReview: 'စစ်ဆေးချိန်သည် အလုပ်ချိန် ၁–၂ ရက် ကြာတတ်သည်။',
  successContact: 'အတည်ပြုပြီးနောက် ဆိုင်ဖုန်း သို့မဟုတ် အီးမေးလ်ဖြင့် အကောင့်ပေးပါမည်။',
  successLookupTitle: 'လျှောက်လွှာ အခြေအနေ ကြည့်ရန်',
  successLookupHint: 'ဖောင်တွင် သုံးသော ဆိုင်ဖုန်းကို ဖြည့်ပါ။ အခြေအနေ၊ ဆိုင်အမည်နှင့် အချိန်သာ ပြပါမည်။',
  successLookupPhone: 'ဆိုင်ဖုန်း',
  successLookupBtn: 'စစ်ဆေးရန်',
  successLookuping: 'စစ်နေသည်…',
  successApplyAgain: 'နောက်ထပ် လျှောက်လွှာတင်ရန်',
  lookupNotFound: 'ဤဖုန်းနံပါတ်အတွက် လျှောက်လွှာ မတွေ့ပါ။',
  lookupFailed: 'အခြေအနေ မစစ်နိုင်ပါ။ နောက်မှ ထပ်ကြိုးစားပါ။',
  checkStatus: 'တင်ပြီးသားလား။ အခြေအနေကြည့်ရန်',
  hideStatus: 'ပိတ်ရန်',
  statusPending: 'စစ်ဆေးဆဲ',
  statusApproved: 'အတည်ပြုပြီး',
  statusRejected: 'ငြင်းပယ်ထားသည်',
  statusUnknown: 'အခြေအနေ မသိ',
  tooManyDocs: 'ဖိုင် ၈ ခု အထိသာ',
  badFileType: 'JPG, PNG, WEBP, PDF သာ',
  fileTooLarge: 'ဓာတ်ပုံ 5MB ထက်မကြီးရ',
  pdfTooLarge: 'PDF 3.5MB ထက်မကြီးရ',
};

const ZH: MerchantApplyCopy = {
  badge: '商家入驻',
  title: '申请加入 MARKET LINK 商家平台',
  subtitle:
    '填写以下资料申请入驻同城商场。审核通过后，我们将为您开通商家账号（店铺代码 + 密码），可用于商家 App / Web 登录经营。',
  step1: '1. 填写资料',
  step2: '2. 平台审核',
  step3: '3. 获取账号',
  registration: '申请登记',
  salesperson: '推销员',
  salespersonPlaceholder: 'MARKET LINK 推销员姓名',
  applicationDate: '日期',
  uploadLicense: '+ 上传证件',
  uploadHint: '请上传营业执照、店铺登记证等商店证件（必填）',
  uploadFormats: '支持 JPG、PNG、WEBP 或 PDF · 仅在文件过大时轻度压缩，保证证件文字清晰 · PDF 不超过 3.5MB · 最多 8 份',
  archiveHint: '申请记录和证件会长期保留，出事可查。',
  removeDoc: '删除',
  noDocsYet: '尚未上传证件',
  uploadUploading: '上传中…',
  uploadReady: '已上传',
  uploadFailed: '上传失败',
  uploadRetry: '重试',
  uploadNeedReady: '请至少成功上传一份证件后再提交。',
  uploadStillUploading: '仍有证件正在上传，请稍候。',
  basic: '店铺基本信息',
  storeName: '店铺名称',
  storeType: '店铺类型',
  storeTypePlaceholder: '请先选择店铺类型',
  region: '经营区域',
  address: '详细地址',
  mapHint: '可搜索地址、点击地图、定位，或手动填写经纬度来确认店铺位置。',
  phone: '店铺电话',
  email: '邮箱（选填）',
  manager: '负责人姓名',
  managerPhone: '负责人手机',
  hours: '营业时间',
  hoursPlaceholder: '例如 08:00 - 22:00',
  cod: 'COD 结清周期',
  notes: '备注（选填）',
  notesPlaceholder: '可简要介绍店铺或主营商品…',
  submit: '提交入驻申请',
  submitting: '提交中…',
  home: '返回首页',
  successTitle: '申请已提交',
  coords: '已选坐标',
  mapUnavailable: '地图瓦片暂不可用。请搜索地址，或在下方填写经纬度。',
  mapAuthFailed: 'Google 地图未能完成本页授权。仍可搜索地址、「查找当前位置」，或手动填写经纬度。',
  mapLoading: '地图加载中…',
  submitError: '提交失败，请稍后再试',
  packingLabel: '平台要求打包',
  packingNeedView: '请先打开打包样式，确认了解后才能提交。',
  packingView: '查看打包样式',
  packingAck: '我已了解此打包样式，入驻后每单都按此包装。',
  packingPending: '尚未确认',
  packingDone: '已确认了解',
  packingKicker: '平台要求打包',
  packingForType: '适用于当前店铺类型',
  packingConfirm: '确认了解',
  packingClose: '关闭',
  packingConfirmHint: '确认后才可以提交申请。若改选店铺类型，需要重新确认对应的打包样式。',
  packingRequired: '请先查看并确认平台打包样式，再提交入驻申请。',
  locateLabel: '查找当前位置',
  locateUnsupported: '当前浏览器不支持定位。',
  locateDenied: '定位权限被拒绝，请在浏览器中允许位置访问后重试。',
  locateUnavailable: '无法获取当前位置，请检查定位或网络后重试。',
  locateTimeout: '定位超时，请稍后重试。',
  locateFailed: '查找当前位置失败，请重试。',
  searchAddress: '搜索地址',
  searchAddressPlaceholder: '店铺名、街道或地标',
  searchAddressBtn: '搜索',
  searchNoResults: '没有匹配地点。可缩短关键词，或改填经纬度。',
  searchFailed: '地址搜索失败。地图不可用时请手动填写经纬度。',
  searchUseAddress: '用此地址在地图上定位',
  manualCoords: '或手动填写经纬度',
  manualLat: '纬度',
  manualLng: '经度',
  applyCoords: '使用此坐标',
  invalidCoords: '请填写有效的纬度和经度。',
  locationRequired: '请确认真实店铺位置。不能直接提交默认的城市中心点。',
  locationConfirmed: '位置已确认',
  locationPending: '尚未确认位置',
  geocodeFailed: '无法根据坐标回填地址，请手动填写详细地址。',
  coordsOutsideHint: '该坐标看起来不在缅甸范围内，请核对后再提交。',
  successLead: '我们已收到您的入驻申请。请保存下面的申请编号，联系客服时可能需要。',
  successId: '申请编号',
  successCopyId: '复制编号',
  successCopied: '已复制',
  successReview: '审核一般需要 1–2 个工作日。',
  successContact: '审核通过后，我们将通过店铺电话或邮箱联系您，并开通商家账号。',
  successLookupTitle: '查询申请进度',
  successLookupHint: '请填写申请时使用的店铺电话。我们只返回状态、店名和时间。',
  successLookupPhone: '店铺电话',
  successLookupBtn: '查询进度',
  successLookuping: '查询中…',
  successApplyAgain: '再提交一份申请',
  lookupNotFound: '未找到该手机号的申请。',
  lookupFailed: '暂时无法查询进度，请稍后再试。',
  checkStatus: '已提交？查询进度',
  hideStatus: '收起查询',
  statusPending: '审核中',
  statusApproved: '已通过',
  statusRejected: '未通过',
  statusUnknown: '未知状态',
  tooManyDocs: '最多上传 8 份证件',
  badFileType: '仅支持 JPG、PNG、WEBP 或 PDF',
  fileTooLarge: '单个图片不能超过 5MB',
  pdfTooLarge: 'PDF 不能超过 3.5MB',
};

export function getMerchantApplyCopy(lang: MerchantApplyLang): MerchantApplyCopy {
  if (lang === 'en') return EN;
  if (lang === 'my') return MY;
  return ZH;
}

export function statusLabel(status: string, t: MerchantApplyCopy): string {
  if (status === 'pending') return t.statusPending;
  if (status === 'approved') return t.statusApproved;
  if (status === 'rejected') return t.statusRejected;
  return t.statusUnknown;
}
