import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: any;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// 客户端网站所有页面的翻译文本
const translations: any = {
  zh: {
    nav: {
      home: '首页',
      services: '服务',
      tracking: '包裹跟踪',
      contact: '联系我们',
      mall: '同城商场',
      cart: '购物车',
      admin: '管理后台',
      profile: '我的账户'
    },
    hero: {
      title: '缅甸同城快递',
      subtitle: '快速、安全、可靠的同城快递服务',
      cta: '立即下单',
      mall: '同城商场',
      cart: '购物车'
    },
    features: {
      title: '服务特色',
      subtitle: '专业、高效、值得信赖的快递服务体验',
      fast: '快速配送',
      safe: '安全可靠',
      convenient: '便捷服务',
      affordable: '价格实惠'
    },
    tracking: {
      title: '包裹跟踪',
      placeholder: '请输入包裹单号',
      track: '查询',
      notFound: '未找到包裹信息',
      packageInfo: '包裹信息',
      trackingNumber: '单号',
      status: '状态',
      location: '当前位置',
      estimatedDelivery: '预计送达',
      sender: '寄件人',
      receiver: '收件人',
      courier: '配送员',
      packageType: '包裹类型',
      weight: '重量',
      courierLocation: '快递员位置',
      packageLocation: '包裹位置',
      realTimeTracking: '实时跟踪',
      lastUpdate: '最后更新',
      courierInfo: '快递员信息',
      vehicle: '车辆',
      contactCourier: '联系快递员'
    },
    cart: {
      title: '我的购物车',
      empty: '您的购物车是空的',
      backToMall: '返回商场',
      total: '订单总计',
      checkout: '立即结算下单',
      clear: '清空全部',
      price: '单价',
      quantity: '数量',
      items: '件商品'
    },
    mall: {
      title: '同城商场',
      subtitle: '发现您身边的优质商户',
      searchPlaceholder: '搜索商户名称或类型...',
      noStores: '该区域暂无商户',
      operatingHours: '营业时间',
      contact: '联系电话',
      visitStore: '进入店铺',
      loading: '正在为您加载...',
      all: '全部',
      region: '所在地区',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日暂停营业'
    },
    store: {
      loading: '正在加载商品...',
      addToCart: '加入购物车',
      noProducts: '该商店暂无商品',
      stock: '库存',
      infinite: '无限',
      addedToCart: '已加入购物车',
      cart: '购物车',
      back: '返回商场',
      merchantInfo: '商家信息',
      address: '详细地址',
      contact: '联系电话',
      hours: '营业时间',
      openNow: '正在营业',
      closedNow: '休息中',
      closedToday: '今日打烊'
    },
    contact: {
      title: '联系我们',
      subtitle: '我们随时为您提供专业的快递服务支持',
      phone: '联系电话',
      email: '邮箱联系',
      address: '公司地址',
      businessHours: '营业时间',
      businessCooperation: '商务合作',
      phoneValue: '(+95) 09788848928',
      phoneValue2: '(+95) 09941118588',
      phoneValue3: '(+95) 09941118688',
      emailValue: 'marketlink982@gmail.com',
      addressValue: 'ChanMyaThaZi Mandalay',
      businessHoursValue: '周一至周日 8:00 - 20:00',
      wechatId: 'WeChat ID',
      wechatValue: 'AMT349',
      viber: 'Viber',
      viberValue: '09259369349'
    },
    services: {
      lightning: {
        title: '闪电配送',
        subtitle: 'LIGHTNING DELIVERY',
        desc: '30分钟内上门取件，极速送达',
        features: ['实时定位', '智能路线', '即时通知']
      },
      secure: {
        title: '安全护航',
        subtitle: 'SECURE ESCORT',
        desc: '全程保险保障，零风险配送',
        features: ['全程保险', '实时监控', '安全认证']
      },
      smart: {
        title: '智能服务',
        subtitle: 'SMART SERVICE',
        desc: '在线下单，实时跟踪，智能客服',
        features: ['在线下单', '实时跟踪', 'AI客服']
      },
      transparent: {
        title: '透明定价',
        subtitle: 'TRANSPARENT PRICING',
        desc: '价格 transparent, 无隐藏费用, 物超所值',
        features: ['透明定价', '无隐藏费', '优惠活动']
      }
    },
    profile: {
      title: '我的账户',
      userInfo: '用户信息',
      packages: '我的包裹',
      noPackages: '暂无包裹记录',
      packageId: '订单号',
      status: '状态',
      createTime: '创建时间',
      price: '跑腿费',
      viewDetails: '查看详情',
      logout: '退出登录',
      welcome: '欢迎',
      email: '邮箱',
      phone: '电话',
      address: '地址',
      name: '姓名',
      searchPackage: '搜索包裹',
      searchPlaceholder: '请输入订单号',
      search: '搜索',
      packageDetails: '包裹详情',
      sender: '寄件人',
      receiver: '收件人',
      close: '关闭',
      paymentMethod: '支付方式',
      qrPayment: '转账',
      cashPayment: '现金支付',
      cod: '代收款',
      totalAmount: '总金额',
      none: '无',
      totalOrders: '全部订单',
      accountDate: '开户日期',
      pendingAccept: '待接单',
      pendingPickup: '待取件',
      inTransit: '配送中',
      completed: '已完成',
      pickupCode: '寄件码',
      storeType: '店铺类型',
      storeCode: '店铺代码',
      codStats: '代收款统计',
      totalCOD: '本月已结清代收款',
      unclearedCOD: '待结清金额',
      unclearedCount: '待结清订单数',
      lastSettledAt: '上次结清日期',
      noSettlement: '暂无结清记录',
      view: '查看',
      codOrders: '代收款订单',
      codAmount: '代收金额',
      noProducts: '暂无商品',
      myProducts: '我的商品',
      addProduct: '添加商品',
      editProduct: '编辑商品',
      productName: '商品名称',
      productPrice: '售价',
      productDiscount: '商品优惠',
      productStock: '商品库存',
      stockInfinite: '无限',
      isAvailable: '是否上架',
      onSale: '已上架',
      offShelf: '已下架',
      save: '保存',
      delete: '删除',
      deleteConfirm: '确定要删除这个商品吗？',
      uploadImage: '上传图片',
      uploading: '正在上传...',
      businessManagement: '营业状态管理',
      operatingHours: '营业时间设置',
      closedToday: '今日暂停营业',
      openNow: '正在营业',
      closedNow: '休息中',
      openingTime: '开门时间',
      closingTime: '打烊时间',
      statusUpdated: '营业状态已更新',
      lastUpdated: '最后更改时间',
      balance: '账户余额',
      recharge: '立即充值',
      enableVoice: '开启语音接单',
      voiceActive: '接单语音已激活'
    },
    deleteAccount: {
      title: '账户删除请求',
      subtitle: 'MARKET LINK EXPRESS - 账户和数据删除说明',
      lastUpdated: '最后更新：2024年12月',
      introduction: {
        title: '1. 引言',
        content: 'MARKET LINK EXPRESS尊重您的隐私权。本页面说明了如何请求删除您的账户和相关数据。'
      },
      steps: {
        title: '2. 如何请求删除账户',
        subtitle: '要删除您的 MARKET LINK EXPRESS 账户 and 相关数据，请按照以下步骤操作：',
        items: [
          'Contact customer service through the app: Open the MARKET LINK EXPRESS app, go to "My" page, click "Contact Us"',
          'Via email: Send an email to marketlink982@gmail.com with the subject "Account Deletion Request"',
          'Via phone: Call (+95) 09788848928 and state that you want to delete your account',
          'Via WeChat: Add WeChat AMT349 and send "Account Deletion Request"',
          'In your request, please provide the following information:',
          '  - Your registered email or phone number',
          '  - Your name',
          '  - Reason for deletion (optional)'
        ]
      },
      dataTypes: {
        title: '3. 删除的数据类型',
        subtitle: '删除账户后，我们将删除以下数据：',
        items: [
          '账户信息（姓名、邮箱、手机号、地址）',
          '订单历史记录（订单详情、配送记录）',
          '位置数据（GPS坐标、地址信息）',
          '应用使用记录',
          '客户服务交互记录',
          '个人偏好设置'
        ]
      },
      retainedData: {
        title: '4. 保留的数据',
        subtitle: '根据法律和会计要求，以下数据可能会 be 保留：',
        items: [
          '订单记录：7年（法律和会计要求）',
          '财务记录：7年（税务和会计要求）',
          '法律要求的其他记录'
        ],
        note: '这些数据将被匿名化处理，不会包含您的个人信息。'
      },
      processingTime: {
        title: '5. 处理时间',
        content: '我们将在收到您的删除请求后30天内处理您的请求。处理完成后，我们将通过您提供的联系方式通知您。'
      },
      consequences: {
        title: '6. 删除账户的后果',
        subtitle: '删除账户后：',
        items: [
          '您将无法再登录 MARKET LINK EXPRESS 应用',
          '您将无法访问之前的订单历史',
          '您将无法使用账户相关的服务',
          '所有账户相关的数据将被删除或匿名化',
          '如果您之后想使用我们的服务，需要重新注册账户'
        ]
      },
      contact: {
        title: '7. 联系我们',
        subtitle: 'If you have any questions about account deletion, please contact us through:',
        items: [
          '电子邮件：marketlink982@gmail.com',
          '电话：(+95) 09788848928',
          '微信：AMT349',
          '网站：www.market-link-express.com',
          '地址：Yangon, Myanmar'
        ],
        note: '我们将在合理的时间内回复您的询问。'
      },
      backToHome: '返回首页'
    },
    privacy: {
      title: '隐私政策',
      subtitle: '我们重视您的隐私，本政策说明了我们如何收集、使用和保护您的个人信息',
      lastUpdated: '最后更新：2024年12月',
      sections: {
        introduction: {
          title: '1. 引言',
          content: 'MARKET LINK EXPRESS致力于保护您的隐私。本隐私政策说明了当您使用我们的移动应用程序和网站服务时，我们如何收集、使用、披露和保护您的个人信息。'
        },
        informationCollection: {
          title: '2. 信息收集',
          content: '我们可能收集以下类型的信息：',
          items: [
            '个人身份信息：姓名、电话号码、电子邮件地址、地址等',
            '位置信息：当您使用我们的应用程序时，我们会收集您的位置数据以提供配送服务',
            '设备信息：设备型号、操作系统版本、唯一 device identifier',
            '使用数据：应用程序使用情况、访问时间、功能使用记录',
            '照片和媒体：当您使用应用程序拍照或上传图片时'
          ]
        },
        informationUse: {
          title: '3. 信息使用',
          content: '我们使用收集的信息用于以下目的：',
          items: [
            '提供和管理快递配送服务',
            '处理订单和跟踪包裹',
            '与您沟通服务相关事宜',
            '改进我们的服务和用户体验',
            '确保应用程序的安全性和防止欺诈',
            '遵守法律法规要求'
          ]
        },
        informationSharing: {
          title: '4. 信息共享',
          content: '我们不会向第三方出售您的个人信息。我们可能在以下情况下共享您的信息：',
          items: [
            '服务提供商：与帮助我们运营服务的第三方服务提供商共享',
            '法律要求：当法律要求或为了保护我们的权利时',
            '业务转让：在公司合并、收购或资产出售的情况下',
            '经您同意：在您明确同意的情况下'
          ]
        },
        dataSecurity: {
          title: '5. 数据安全',
          content: '我们采取合理的技术和组织措施来保护您的个人信息，包括：',
          items: [
            'Using encryption technology to protect data transmission',
            'Restricting access to personal information',
            'Regular security audits and updates',
            'Using secure servers and databases'
          ]
        },
        yourRights: {
          title: '6. Your Rights',
          content: '您有权：',
          items: [
            '访问和查看您的个人信息',
            '更正不准确的个人信息',
            '要求删除您的个人信息',
            '撤回您对数据处理的同意',
            '提出投诉或询问'
          ]
        },
        locationServices: {
          title: '7. Location Services',
          content: '我们的应用程序需要访问您的位置信息以提供配送服务. 位置数据仅用于：',
          items: [
            '计算配送距离和路线',
            '实时跟踪配送状态',
            '优化配送路线',
            '提供导航服务'
          ],
          note: '您可以在设备设置中随时关闭位置服务，但这可能影响应用程序的某些功能。'
        },
        dataRetention: {
          title: '8. Data Retention',
          content: '我们仅在必要的时间内保留您的个人信息，以提供服务并遵守法律义务。当数据不再需要时，我们将安全地删除或匿名化处理。'
        },
        childrenPrivacy: {
          title: '9. Children\'s Privacy',
          content: '我们的服务不面向13岁以下的儿童。我们不会故意收集儿童的个人信息。如果我们发现收集了儿童信息，我们将立即删除。'
        },
        changes: {
          title: '10. Policy Changes',
          content: '我们可能会不时更新本隐私政策. 重大变更将通过应用程序通知或电子邮件通知您. 继续使用我们的服务即表示您接受更新后的政策。'
        },
        contact: {
          title: '11. Contact Us',
          content: '如果您对本隐私政策有任何问题 or 疑虑，请通过以下方式联系我们：',
          items: [
            '电话：(+95) 09788848928',
            '邮箱：marketlink982@gmail.com',
            '地址：ChanMyaThaZi Mandalay'
          ]
        }
      }
    },
    order: {
      title: '创建订单',
      sender: '寄件人信息',
      receiver: '收件人信息',
      package: '速度',
      submit: '提交订单',
      cancel: '取消',
      selectOnMap: '在地图中选择',
      senderName: '寄件人姓名',
      senderPhone: '联系电话',
      senderAddress: '寄件地址',
      receiverName: '收件人姓名',
      receiverPhone: '联系电话',
      receiverAddress: '收件地址',
      packageType: '包裹类型',
      packageDescription: '包裹描述',
      packageWeight: '重量',
      mapTitle: '选择地址',
      mapTip: '💡 提示：点击地图标注位置，系统将自动填充地址. 您可在此基础上补充门牌号等详细信息。',
      mapPlaceholder: '输入详细地址或在地图上点击选择位置',
      confirmSelection: '确认选择',
      getMyLocation: '获取我的位置',
      selectType: '请选择包裹类型'
    },
    ui: {
      packageTracking: '包裹跟踪',
      lightningDelivery: '极速配送',
      secureReliable: '安全可靠',
      smartService: '智能服务',
      transparentPricing: '透明定价',
      prepaidDeliveryFee: '预付配送费',
      scanQrPay: '请扫描二维码支付',
      deliveryFee: '配送费',
      paymentQrCode: '支付二维码',
      confirmPayment: '支付完成',
      cancelPayment: '取消',
      packageType: '包裹类型',
      document: '文件',
      standardPackage: '标准件',
      overweightPackage: '超重件',
      oversizedPackage: '超规件',
      fragile: '易碎品',
      foodDrinks: '食品和饮料',
      standardPackageDetail: '标准件（45x60x15cm）和（5KG）以内',
      overweightPackageDetail: '超重件（5KG）以上',
      oversizedPackageDetail: '超规件（45x60x15cm）以上',
      onTimeDelivery: '准时达（订单后1小时送达）',
      urgentDelivery: '急送达（订单后30分钟送达）',
      scheduledDelivery: '定时达（客户要求的时间送达）',
      selectDeliverySpeed: '请选择配送速度',
      packageInfoMismatch: '如实物和包裹信息内容不一致会导致报价失误',
      selectDeliveryTime: '选择送达时间',
      selectDate: '选择日期',
      selectTime: '选择时间',
      confirmTime: '确认时间',
      cancel: '取消',
      selectedTime: '已选时间',
      calculating: '正在计算价格...',
      deliveryDistance: '配送距离',
      totalAmount: '应付金额',
      paymentQRCode: '收款二维码',
      scanToPay: '扫码支付',
      priceBreakdown: '价格明细',
      paymentWarning: '⚠️ 请注意：付款之后不可退还 已确认下单再付款',
      cashPayment: '现金支付',
      cashPaymentDesc: '选择现金支付，骑手将在取件时代收费用',
      selectPaymentMethod: '选择支付方式',
      qrPayment: '二维码支付',
      underDevelopment: '开发中',
      basePrice: '基础费用',
      distanceFee: '距离费用',
      packageTypeFee: '包裹类型',
      weightFee: '重量费用',
      speedFee: '速度费用',
      orderEmailSending: '正在发送订单确认邮件，请稍候...',
      orderEmailSent: '订单确认邮件已发送，请查收邮箱。',
      orderEmailSentDev: '开发模式：系统未实际发送邮件，请手动保存二维码。',
      orderFollowup: '我们会在1小时内联系您取件。',
      speed: '速度',
      packageTypeInfo: {
        title: '包裹类型说明',
        standard: '适用于常规大小的包裹（45x60x15cm）和（5KG）以内。',
        overweight: '适用于重量超过5公斤的包裹。重物品需要额外运费。',
        oversized: '适用于尺寸超过标准（45x60x15cm）的大型包裹。',
        fragile: '适用于易损坏物品，如玻璃、陶瓷、精密电子产品等. 需加收特殊处理费。',
        foodDrinks: '适用于熟食、饮料等. 为了保证新鲜，建议选择加急配送。',
        document: '适用于信件、护照、合同等纸质文件。',
        waySide: '24小时顺路送达。'
      },
      waySide: '顺路递'
    }
  },
  en: {
    nav: {
      home: 'Home',
      services: 'Services',
      tracking: 'Tracking',
      contact: 'Contact',
      mall: 'City Mall',
      cart: 'Cart',
      admin: 'Admin',
      profile: 'My Account'
    },
    hero: {
      title: 'Myanmar Same-Day Delivery',
      subtitle: 'Fast, Safe, and Reliable Same-Day Delivery Service',
      cta: 'Order Now',
      mall: 'City Mall',
      cart: 'Cart'
    },
    features: {
      title: 'Service Features',
      subtitle: 'Professional, efficient, and trustworthy express delivery service experience',
      fast: 'Fast Delivery',
      safe: 'Safe & Secure',
      convenient: 'Convenient',
      affordable: 'Affordable'
    },
    tracking: {
      title: 'Package Tracking',
      placeholder: 'Enter tracking number',
      track: 'Track',
      notFound: 'Package not found',
      packageInfo: 'Package Information',
      trackingNumber: 'Number',
      status: 'Status',
      location: 'Current Location',
      estimatedDelivery: 'Estimated Delivery',
      sender: 'Sender',
      receiver: 'Receiver',
      courier: 'Courier',
      packageType: 'Type',
      weight: 'Weight',
      courierLocation: 'Courier Location',
      packageLocation: 'Package Location',
      realTimeTracking: 'Real-Time Tracking',
      lastUpdate: 'Last Update',
      courierInfo: 'Courier Info',
      vehicle: 'Vehicle',
      contactCourier: 'Contact Courier'
    },
    cart: {
      title: 'My Cart',
      empty: 'Your cart is empty',
      backToMall: 'Back to Mall',
      total: 'Order Total',
      checkout: 'Checkout Now',
      clear: 'Clear All',
      price: 'Price',
      quantity: 'Qty',
      items: 'Items'
    },
    mall: {
      title: 'City Mall',
      subtitle: 'Discover quality merchants around you',
      searchPlaceholder: 'Search store name or type...',
      noStores: 'No stores found in this region',
      operatingHours: 'Hours',
      contact: 'Phone',
      visitStore: 'Visit Store',
      loading: 'Loading for you...',
      all: 'All',
      region: 'Region',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today'
    },
    store: {
      loading: 'Loading products...',
      addToCart: 'Add to Cart',
      noProducts: 'No products in this store',
      stock: 'Stock',
      infinite: 'Infinite',
      addedToCart: 'Added to cart',
      cart: 'Cart',
      back: 'Back to Mall',
      merchantInfo: 'Merchant Info',
      address: 'Address',
      contact: 'Phone',
      hours: 'Hours',
      openNow: 'Open Now',
      closedNow: 'Closed',
      closedToday: 'Closed Today'
    },
    contact: {
      title: 'Contact Us',
      subtitle: 'We are here to provide professional express service support',
      phone: 'Contact Phone',
      email: 'Email Contact',
      address: 'Company Address',
      businessHours: 'Business Hours',
      businessCooperation: 'Business Cooperation',
      businessHoursValue: 'Monday to Sunday 8:00 - 20:00',
      phoneValue: '(+95) 09788848928',
      phoneValue2: '(+95) 09941118588',
      phoneValue3: '(+95) 09941118688',
      emailValue: 'marketlink982@gmail.com',
      addressValue: 'ChanMyaThaZi Mandalay',
      wechatId: 'WeChat ID',
      wechatValue: 'AMT349',
      viber: 'Viber',
      viberValue: '09259369349'
    },
    services: {
      lightning: {
        title: 'Lightning Delivery',
        subtitle: 'LIGHTNING DELIVERY',
        desc: 'Door-to-door pickup within 30 minutes, ultra-fast delivery',
        features: ['Real-time Location', 'Smart Routing', 'Instant Notifications']
      },
      secure: {
        title: 'Secure Escort',
        subtitle: 'SECURE ESCORT',
        desc: 'Full insurance coverage, zero-risk delivery',
        features: ['Full Insurance', 'Real-time Monitoring', 'Security Certification']
      },
      smart: {
        title: 'Smart Service',
        subtitle: 'SMART SERVICE',
        desc: 'Online ordering, real-time tracking, smart customer service',
        features: ['Online Ordering', 'Real-time Tracking', 'AI Customer Service']
      },
      transparent: {
        title: 'Transparent Pricing',
        subtitle: 'TRANSPARENT PRICING',
        desc: 'Transparent pricing, no hidden fees, great value',
        features: ['Transparent Pricing', 'No Hidden Fees', 'Special Offers']
      }
    },
    profile: {
      title: 'My Account',
      userInfo: 'User Information',
      packages: 'My Packages',
      noPackages: 'No packages yet',
      packageId: 'Order ID',
      status: 'Status',
      createTime: 'Created',
      price: 'Delivery Fee',
      viewDetails: 'View Details',
      logout: 'Logout',
      welcome: 'Welcome',
      email: 'Email',
      phone: 'Phone',
      address: 'Address',
      name: 'Name',
      searchPackage: 'Search Package',
      searchPlaceholder: 'Enter tracking number',
      search: 'Search',
      packageDetails: 'Package Details',
      sender: 'Sender',
      receiver: 'Receiver',
      close: 'Close',
      paymentMethod: 'Payment Method',
      qrPayment: 'Transfer',
      cashPayment: 'Cash',
      cod: 'Collection Amount',
      totalAmount: 'Total Amount',
      none: 'None',
      totalOrders: 'Total Orders',
      accountDate: 'Account Created',
      pendingAccept: 'Pending Accept',
      pendingPickup: 'Pending Pickup',
      inTransit: 'In Transit',
      completed: 'Completed',
      pickupCode: 'Pickup Code',
      storeType: 'Store Type',
      storeCode: 'Store Code',
      codStats: 'COD Statistics',
      totalCOD: 'Monthly Settled COD',
      unclearedCOD: 'Uncleared Amount',
      unclearedCount: 'Uncleared Orders',
      lastSettledAt: 'Last Settled Date',
      noSettlement: 'No Settlement Record',
      view: 'View',
      codOrders: 'COD Orders',
      codAmount: 'COD Amount',
      noProducts: 'No products yet',
      myProducts: 'My Products',
      addProduct: 'Add Product',
      editProduct: 'Edit Product',
      productName: 'Product Name',
      productPrice: 'Sale Price',
      productDiscount: 'Discount',
      productStock: 'Stock',
      stockInfinite: 'Infinite',
      isAvailable: 'Available',
      onSale: 'On Sale',
      offShelf: 'Off Shelf',
      save: 'Save',
      delete: 'Delete',
      deleteConfirm: 'Are you sure you want to delete this product?',
      uploadImage: 'Upload Image',
      uploading: 'Uploading...',
      businessManagement: 'Business Management',
      operatingHours: 'Business Hours Setting',
      closedToday: 'Closed Today',
      openNow: 'Open Now',
      closedNow: 'Closed',
      openingTime: 'Opening Time',
      closingTime: 'Closing Time',
      statusUpdated: 'Business status updated',
      lastUpdated: 'Last Updated',
      balance: 'Balance',
      recharge: 'Recharge',
      enableVoice: 'Enable Voice Alert',
      voiceActive: 'Voice Alert Active'
    },
    deleteAccount: {
      title: 'Account Deletion Request',
      subtitle: 'MARKET LINK EXPRESS - Account and Data Deletion Instructions',
      lastUpdated: 'Last Updated: December 2024',
      introduction: {
        title: '1. Introduction',
        content: 'MARKET LINK EXPRESS respects your privacy rights. This page explains how to request deletion of your account and associated data.'
      },
      steps: {
        title: '2. How to Request Account Deletion',
        subtitle: 'To delete your MARKET LINK EXPRESS account and associated data, please follow these steps:',
        items: [
          'Contact customer service through the app: Open the MARKET LINK EXPRESS app, go to "My" page, click "Contact Us"',
          'Via email: Send an email to marketlink982@gmail.com with the subject "Account Deletion Request"',
          'Via phone: Call (+95) 09788848928 and state that you want to delete your account',
          'Via WeChat: Add WeChat AMT349 and send "Account Deletion Request"',
          'In your request, please provide the following information:',
          '  - Your registered email or phone number',
          '  - Your name',
          '  - Reason for deletion (optional)'
        ]
      },
      dataTypes: {
        title: '3. Types of Data Deleted',
        subtitle: 'After account deletion, we will delete the following data:',
        items: [
          'Account information (name, email, phone number, address)',
          'Order history (order details, delivery records)',
          'Location data (GPS coordinates, address information)',
          'App usage records',
          'Customer service interaction records',
          'Personal preference settings'
        ]
      },
      retainedData: {
        title: '4. Retained Data',
        subtitle: 'According to legal and accounting requirements, the following data may be retained:',
        items: [
          'Order records: 7 years (legal and accounting requirements)',
          'Financial records: 7 years (tax and accounting requirements)',
          'Other records required by law'
        ],
        note: 'This data will be anonymized and will not contain your personal information.'
      },
      processingTime: {
        title: '5. Processing Time',
        content: 'We will process your deletion request within 30 days of receiving it. After processing is complete, we will notify you through the contact method you provided.'
      },
      consequences: {
        title: '6. Consequences of Account Deletion',
        subtitle: 'After account deletion:',
        items: [
          'You will no longer be able to log in to the MARKET LINK EXPRESS app',
          'You will not be able to access your previous order history',
          'You will not be able to use account-related services',
          'All account-related data will be deleted or anonymized',
          'If you want to use our services again in the future, you will need to register a new account'
        ]
      },
      contact: {
        title: '7. Contact Us',
        subtitle: 'If you have any questions about account deletion, please contact us through:',
        items: [
          'Email: marketlink982@gmail.com',
          'Phone: (+95) 09788848928',
          'WeChat: AMT349',
          'Website: www.market-link-express.com',
          'Address: Yangon, Myanmar'
        ],
        note: 'We will respond to your inquiry within a reasonable time.'
      },
      backToHome: 'Back to Home'
    },
    privacy: {
      title: 'Privacy Policy',
      subtitle: 'We value your privacy. This policy explains how we collect, use, and protect your personal information',
      lastUpdated: 'Last Updated: December 2024',
      sections: {
        introduction: {
          title: '1. Introduction',
          content: 'MARKET LINK EXPRESS is committed to protecting your privacy. This privacy policy explains how we collect, use, disclose, and protect your personal information when you use our mobile application and website services.'
        },
        informationCollection: {
          title: '2. Information Collection',
          content: 'We may collect the following types of information:',
          items: [
            'Personal identification information: name, phone number, email address, address, etc.',
            'Location information: When you use our application, we collect your location data to provide delivery services',
            'Device information: device model, operating system version, unique device identifier',
            'Usage data: application usage, access times, feature usage records',
            'Photos and media: When you take photos or upload images using the application'
          ]
        },
        informationUse: {
          title: '3. Information Use',
          content: 'We use the collected information for the following purposes:',
          items: [
            'Provide and manage express delivery services',
            'Process orders and track packages',
            'Communicate with you about service-related matters',
            'Improve our services and user experience',
            'Ensure application security and prevent fraud',
            'Comply with legal and regulatory requirements'
          ]
        },
        informationSharing: {
          title: '4. Information Sharing',
          content: 'We do not sell your personal information to third parties. We may share your information in the following circumstances:',
          items: [
            'Service providers: Share with third-party service providers who help us operate our services',
            'Legal requirements: When required by law or to protect our rights',
            'Business transfers: In the event of company merger, acquisition, or asset sale',
            'With your consent: When you explicitly consent'
          ]
        },
        dataSecurity: {
          title: '5. Data Security',
          content: 'We take reasonable technical and organizational measures to protect your personal information, including:',
          items: [
            'Using encryption technology to protect data transmission',
            'Restricting access to personal information',
            'Regular security audits and updates',
            'Using secure servers and databases'
          ]
        },
        yourRights: {
          title: '6. Your Rights',
          content: 'You have the right to:',
          items: [
            'Access and view your personal information',
            'Correct inaccurate personal information',
            'Request deletion of your personal information',
            'Withdraw your consent to data processing',
            'File complaints or inquiries'
          ]
        },
        locationServices: {
          title: '7. Location Services',
          content: 'Our application requires access to your location information to provide delivery services. Location data is only used for:',
          items: [
            'Calculating delivery distance and routes',
            'Real-time tracking of delivery status',
            'Optimizing delivery routes',
            'Providing navigation services'
          ],
          note: 'You can turn off location services in your device settings at any time, but this may affect certain features of the application.'
        },
        dataRetention: {
          title: '8. Data Retention',
          content: 'We retain your personal information only for as long as necessary to provide services and comply with legal obligations. When data is no longer needed, we will securely delete or anonymize it.'
        },
        childrenPrivacy: {
          title: '9. Children\'s Privacy',
          content: 'Our services are not directed to children under 13 years of age. We do not knowingly collect personal information from children. If we discover that we have collected children\'s information, we will delete it immediately.'
        },
        changes: {
          title: '10. Policy Changes',
          content: 'We may update this privacy policy from time to time. Significant changes will be notified through the application or email. Continued use of our services indicates your acceptance of the updated policy.'
        },
        contact: {
          title: '11. Contact Us',
          content: 'If you have any questions or concerns about this privacy policy, please contact us through:',
          items: [
            'Phone: (+95) 09788848928',
            'Email: marketlink982@gmail.com',
            'Address: ChanMyaThaZi Mandalay'
          ]
        }
      }
    },
    order: {
      title: 'Create Order',
      sender: 'Sender Information',
      receiver: 'Receiver Information',
      package: 'Speed',
      submit: 'Submit Order',
      cancel: 'Cancel',
      selectOnMap: 'Select on Map',
      senderName: 'Sender Name',
      senderPhone: 'Contact Phone',
      senderAddress: 'Sender Address',
      receiverName: 'Receiver Name',
      receiverPhone: 'Contact Phone',
      receiverAddress: 'Receiver Address',
      packageType: 'Package Type',
      packageDescription: 'Package Description',
      packageWeight: 'Weight',
      mapTitle: 'Select Address',
      mapTip: '💡 Tip: Click on the map to mark location, the system will automatically fill in the address. You can add house numbers and other details.',
      mapPlaceholder: 'Enter detailed address or click on the map to select location',
      confirmSelection: 'Confirm Selection',
      getMyLocation: 'Get My Location',
      selectType: 'Select Package Type'
    },
    ui: {
      packageTracking: 'Package Tracking',
      lightningDelivery: 'Lightning Delivery',
      secureReliable: 'Secure & Reliable',
      smartService: 'Smart Service',
      transparentPricing: 'Transparent Pricing',
      prepaidDeliveryFee: 'Prepaid Delivery Fee',
      scanQrPay: 'Please scan QR code to pay',
      deliveryFee: 'Delivery Fee',
      paymentQrCode: 'Payment QR Code',
      confirmPayment: 'Payment Complete',
      cancelPayment: 'Cancel',
      packageType: 'Package Type',
      document: 'Document',
      standardPackage: 'Standard Package',
      overweightPackage: 'Overweight',
      oversizedPackage: 'Oversized',
      fragile: 'Fragile',
      foodDrinks: 'Foods & Drinks',
      standardPackageDetail: 'Standard Package (45x60x15cm) & (5KG)',
      overweightPackageDetail: 'Overweight Package (5KG+)',
      oversizedPackageDetail: 'Oversized Package (45x60x15cm+)',
      onTimeDelivery: 'On-Time Delivery (1 hour after order)',
      urgentDelivery: 'Urgent Delivery (30 minutes after order)',
      scheduledDelivery: 'Scheduled Delivery (Customer requested time)',
      selectDeliverySpeed: 'Please select delivery speed',
      packageInfoMismatch: 'If actual item and package information do not match, it may cause pricing errors',
      selectDeliveryTime: 'Select Delivery Time',
      selectDate: 'Select Date',
      selectTime: 'Select Time',
      confirmTime: 'Confirm Time',
      cancel: 'Cancel',
      selectedTime: 'Selected Time',
      calculating: 'Calculating price...',
      deliveryDistance: 'Delivery Distance',
      totalAmount: 'Total Amount',
      paymentQRCode: 'Payment QR Code',
      scanToPay: 'Scan to Pay',
      priceBreakdown: 'Price Breakdown',
      paymentWarning: '⚠️ Please note: Payment is non-refundable. Please confirm your order before payment.',
      cashPayment: 'Cash Payment',
      cashPaymentDesc: 'Select cash payment, courier will collect payment upon pickup',
      selectPaymentMethod: 'Select Payment Method',
      qrPayment: 'QR Code Payment',
      underDevelopment: 'Under Development',
      basePrice: 'Base Fee',
      distanceFee: 'Distance Fee',
      packageTypeFee: 'Package Type',
      weightFee: 'Weight Fee',
      speedFee: 'Speed Fee',
      orderEmailSending: 'Sending the order confirmation email, please wait...',
      orderEmailSent: 'Order confirmation email sent. Please check your inbox.',
      orderEmailSentDev: 'Development mode: email not actually sent. Please save the QR code manually.',
      orderFollowup: 'We will contact you within 1 hour to arrange pickup.',
      speed: 'Speed',
      packageTypeInfo: {
        title: 'Package Type Description',
        standard: 'Standard package within (45x60x15cm) and (5KG).',
        overweight: 'Packages weighing over 5KG. Heavy items require extra fee.',
        oversized: 'Large packages exceeding standard dimensions (45x60x15cm).',
        fragile: 'Easily damaged items such as glass, ceramics, etc. Special handling fee applies.',
        foodDrinks: 'Foods and drinks. For freshness, express delivery is recommended.',
        document: 'Paper documents like letters, passports, contracts, etc.',
        waySide: 'Eco Way: Delivery within 24 hours.'
      },
      waySide: 'Eco Way'
    }
  },
  my: {
    nav: {
      home: 'ပင်မစာမျက်နှာ',
      services: 'ဝန်ဆောင်မှုများ',
      tracking: 'အော်ဒါခြေရာခံ',
      contact: 'ဆက်သွယ်ရန်',
      mall: 'စျေးဝယ်စင်တာ',
      cart: 'စျေးဝယ်လှည်း',
      admin: 'စီမံခန့်ခွဲမှု',
      profile: 'ကျွန်ုပ်၏အကောင့်'
    },
    hero: {
      title: 'မြန်မာမြို့တွင်းပို့ဆောင်ရေး',
      subtitle: 'မြန်ဆန်၊ လုံခြုံ၊ ယုံကြည်စိတ်ချရသော မြို့တွင်းပို့ဆောင်ရေး',
      cta: 'အော်ဒါတင်မည်',
      mall: 'စျေးဝယ်စင်တာ',
      cart: 'စျေးဝယ်လှည်း'
    },
    features: {
      title: 'ဝန်ဆောင်မှုအထူးခြားမှု',
      subtitle: 'ပရော်ဖက်ရှင်နယ်၊ ထိရောက်သော၊ ယုံကြည်စိတ်ချရသော ပို့ဆောင်မှု အတွေ့အကြုံ',
      fast: 'မြန်ဆန်သောပို့ဆောင်မှု',
      safe: 'လုံခြုံသော',
      convenient: 'အဆင်ပြေသော',
      affordable: 'စျေးနှုန်းသင့်တင့်သော'
    },
    tracking: {
      title: 'အော်ဒါခြေရာခံ',
      placeholder: 'ထုပ်ပိုးနံပါတ်ကို ထည့်ပါ',
      track: 'ရှာဖွေပါ',
      notFound: 'ထုပ်ပိုးအချက်အလက် မတွေ့ပါ',
      packageInfo: 'ထုပ်ပိုးအချက်အလက်',
      trackingNumber: 'နံပါတ်',
      status: 'အခြေအနေ',
      location: 'လက်ရှိတည်နေရာ',
      estimatedDelivery: 'ပို့ဆောင်မည့်အချိန်',
      sender: 'ပို့သူ',
      receiver: 'လက်ခံသူ',
      courier: 'ပေးပို့သူ',
      packageType: 'အမျိုးအစား',
      weight: 'အလေးချိန်',
      courierLocation: 'ပေးပို့သူတည်နေရာ',
      packageLocation: 'ထုပ်ပိုးတည်နေရာ',
      realTimeTracking: 'တိုက်ရိုက်ခြေရာခံခြင်း',
      lastUpdate: 'နောက်ဆုံးအပ်ဒိတ်',
      courierInfo: 'ပေးပို့သူအချက်အလက်',
      vehicle: 'ယာဉ်',
      contactCourier: 'ပေးပို့သူကို ဆက်သွယ်ပါ'
    },
    cart: {
      title: 'စျေးဝယ်လှည်း',
      empty: 'ခြင်းထဲတွင် ပစ္စည်းမရှိသေးပါ',
      backToMall: 'စျေးဝယ်စင်တာသို့ပြန်သွားရန်',
      total: 'စုစုပေါင်း',
      checkout: 'အခုပဲဝယ်မည်',
      clear: 'အားလုံးဖျက်ရန်',
      price: 'စျေးနှုန်း',
      quantity: 'အရေအတွက်',
      items: 'ခု'
    },
    mall: {
      title: 'စျေးဝယ်စင်တာ',
      subtitle: 'သင့်အနီးနားရှိ အရည်အသွေးမြင့်ဆိုင်များကို ရှာဖွေပါ',
      searchPlaceholder: 'ဆိုင်အမည် သို့မဟုတ် အမျိုးအစားရှာရန်...',
      noStores: 'ဤဒေသတွင် ဆိုင်များမရှိသေးပါ',
      operatingHours: 'ဖွင့်ချိန်',
      contact: 'ဖုန်းနံပါတ်',
      visitStore: 'ဆိုင်သို့ဝင်ရန်',
      loading: 'ခေတ္တစောင့်ဆိုင်းပါ...',
      all: 'အားလုံး',
      region: 'ဒေသ',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်'
    },
    store: {
      loading: 'ကုန်ပစ္စည်းများရှာဖွေနေပါသည်...',
      addToCart: 'စျေးဝယ်လှည်းထဲသို့ထည့်ရန်',
      noProducts: 'ဤဆိုင်တွင် ကုန်ပစ္စည်းမရှိသေးပါ',
      stock: 'လက်ကျန်',
      infinite: 'အကန့်အသတ်မရှိ',
      addedToCart: 'စျေးဝယ်လှည်းထဲသို့ထည့်ပြီးပါပြီ',
      cart: 'စျေးဝယ်လှည်း',
      back: 'စျေးဝယ်စင်တာသို့ပြန်သွားရန်',
      merchantInfo: 'ဆိုင်အချက်အလက်',
      address: 'လိပ်စာ',
      contact: 'ဖုန်းနံပါတ်',
      hours: 'ဖွင့်ချိန်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်'
    },
    contact: {
      title: 'ဆက်သွယ်ရန်',
      subtitle: 'ကျွန်ုပ်တို့သည် ပရော်ဖက်ရှင်နယ် ပို့ဆောင်မှု ဝန်ဆောင်မှုကို ပေးဆောင်ရန် ဤနေရာတွင် ရှိပါသည်',
      phone: 'ဆက်သွယ်ရန်ဖုန်းနံပါတ်',
      email: 'အီးမေးလ်ဆက်သွယ်ရန်',
      address: 'ကုမ္ပဏီလိပ်စာ',
      businessHours: 'အလုပ်ချိန်',
      businessCooperation: 'စီးပွားရေးပူးပေါင်းဆောင်ရွက်မှု',
      businessHoursValue: 'တနင်္လာမှ တနင်္ဂနွေ 8:00 - 20:00',
      phoneValue: '(+95) 09788848928',
      phoneValue2: '(+95) 09941118588',
      phoneValue3: '(+95) 09941118688',
      emailValue: 'marketlink982@gmail.com',
      addressValue: 'ChanMyaThaZi Mandalay',
      wechatId: 'WeChat ID',
      wechatValue: 'AMT349',
      viber: 'Viber',
      viberValue: '09259369349'
    },
    services: {
      lightning: {
        title: 'မြန်ဆန်သော ပို့ဆောင်မှု',
        subtitle: 'LIGHTNING DELIVERY',
        desc: 'မိနစ် ၃၀ အတွင်း အိမ်တွင်းလာယူ၊ အလျင်အမြန် ပို့ဆောင်ခြင်း',
        features: ['လက်ရှိတည်နေရာ', 'ဉာဏ်ရည်တု လမ်းကြောင်း', 'ချက်ချင်း အကြောင်းကြားခြင်း']
      },
      secure: {
        title: 'လုံခြုံသော စောင့်ရှောက်မှု',
        subtitle: 'SECURE ESCORT',
        desc: 'တစ်လျှောက်လုံး အာမခံအကာအကွယ်၊ အန္တရာယ်မရှိသော ပို့ဆောင်မှု',
        features: ['တစ်လျှောက်လုံး အာမခံ', 'လက်ရှိ စောင့်ကြည့်ခြင်း', 'လုံခြုံမှု အတည်ပြုခြင်း']
      },
      smart: {
        title: 'ဉာဏ်ရည်တု ဝန်ဆောင်မှု',
        subtitle: 'SMART SERVICE',
        desc: 'အွန်လိုင်း အမှာတင်ခြင်း၊ လက်ရှိ စောင့်ကြည့်ခြင်း၊ ဉာဏ်ရည်တု ဖောက်သည်ဝန်ဆောင်မှု',
        features: ['အွန်လိုင်း အမှာတင်ခြင်း', 'လက်ရှိ စောင့်ကြည့်ခြင်း', 'AI ဖောက်သည်ဝန်ဆောင်မှု']
      },
      transparent: {
        title: 'ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း',
        subtitle: 'TRANSPARENT PRICING',
        desc: 'စျေးနှုန်း ပွင့်လင်းမြင်သာမှု၊ ဖုံးကွယ်ထားသော ကုန်ကျစရိတ်မရှိ၊ တန်ဖိုးရှိသော',
        features: ['ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း', 'ဖုံးကွယ်ထားသော ကုန်ကျစရိတ်မရှိ', 'အထူးလျော့စျေးများ']
      }
    },
    profile: {
      title: 'ကျွန်ုပ်၏အကောင့်',
      userInfo: 'အသုံးပြုသူအချက်အလက်',
      packages: 'ကျွန်ုပ်၏ပက်ကေ့ဂျ်များ',
      noPackages: 'ပက်ကေ့ဂျ်မရှိသေးပါ',
      packageId: 'အော်ဒါနံပါတ်',
      status: 'အခြေအနေ',
      createTime: 'ဖန်တီးထားသောအချိန်',
      price: 'ပို့ဆောင်ခ',
      viewDetails: 'အသေးစိတ်ကြည့်ရန်',
      logout: 'ထွက်ရန်',
      welcome: 'ကြိုဆိုပါတယ်',
      email: 'အီးမေးလ်',
      phone: 'ဖုန်း',
      address: 'လိပ်စာ',
      name: 'အမည်',
      searchPackage: 'ပက်ကေ့ဂျ်ရှာဖွေရန်',
      searchPlaceholder: 'အော်ဒါနံပါတ်ထည့်ပါ',
      search: 'ရှာဖွေရန်',
      packageDetails: 'ပက်ကေ့ဂျ်အသေးစိတ်',
      sender: 'ပို့ဆောင်သူ',
      receiver: 'လက်ခံသူ',
      close: 'ပိတ်ရန်',
      paymentMethod: 'ငွေပေးချေမှုနည်းလမ်း',
      qrPayment: 'လွှဲပြောင်းမှု',
      cashPayment: 'ငွေသား',
      cod: 'ကောက်ခံမည့်ပမာဏ',
      totalAmount: 'စုစုပေါင်းပမာဏ',
      none: 'မရှိပါ',
      totalOrders: 'စုစုပေါင်းအော်ဒါများ',
      accountDate: 'အကောင့်ဖွင့်သည့်ရက်စွဲ',
      pendingAccept: 'အော်ဒါလက်ခံရန်စောင့်ဆိုင်းနေသည်',
      pendingPickup: 'ပစ္စည်းလာယူရန်စောင့်ဆိုင်းနေသည်',
      inTransit: 'ပို့ဆောင်နေသည်',
      completed: 'ပြီးစီးသည်',
      pickupCode: 'လာယူမည့်ကုဒ်',
      storeType: 'ဆိုင်အမျိုးအစား',
      storeCode: 'ဆိုင်ကုဒ်',
      codStats: 'COD စာရင်းအင်းများ',
      totalCOD: 'လစဉ်ရှင်းလင်းပြီး COD',
      unclearedCOD: 'ရှင်းလင်းရန်ကျန်ငွေ',
      unclearedCount: 'ရှင်းလင်းရန်ကျန်အော်ဒါများ',
      lastSettledAt: 'နောက်ဆုံးရှင်းလင်းသည့်ရက်စွဲ',
      noSettlement: 'ရှင်းလင်းမှုမှတ်တမ်းမရှိပါ',
      view: 'ကြည့်ရန်',
      codOrders: 'COD အော်ဒါများ',
      codAmount: 'COD ပမာဏ',
      noProducts: 'ကုန်ပစ္စည်းမရှိသေးပါ',
      myProducts: 'ကျွန်ုပ်၏ကုန်ပစ္စည်းများ',
      addProduct: 'ကုန်ပစ္စည်းထည့်ရန်',
      editProduct: 'ကုန်ပစ္စည်းပြင်ရန်',
      productName: 'ကုန်ပစ္စည်းအမည်',
      productPrice: 'ရောင်းစျေး',
      productDiscount: 'လျှော့စျေး',
      productStock: 'လက်ကျန်',
      stockInfinite: 'အကန့်အသတ်မရှိ',
      isAvailable: 'ရရှိနိုင်သည်',
      onSale: 'ရောင်းချနေသည်',
      offShelf: 'အရောင်းရပ်ဆိုင်းထားသည်',
      save: 'သိမ်းဆည်းရန်',
      delete: 'ဖျက်ရန်',
      deleteConfirm: 'ဤကုန်ပစ္စည်းကို ဖျက်ရန် သေချာပါသလား?',
      uploadImage: 'ပုံတင်ရန်',
      uploading: 'တင်နေသည်...',
      businessManagement: 'စီးပွားရေးစီမံခန့်ခွဲမှု',
      operatingHours: 'အလုပ်ချိန်ဆက်တင်',
      closedToday: 'ယနေ့ ဆိုင်ပိတ်သည်',
      openNow: 'ဆိုင်ဖွင့်ထားသည်',
      closedNow: 'ဆိုင်ပိတ်ထားသည်',
      openingTime: 'ဆိုင်ဖွင့်ချိန်',
      closingTime: 'ဆိုင်ပိတ်ချိန်',
      statusUpdated: 'ဆိုင်အခြေအနေ အပ်ဒိတ်လုပ်ပြီးပါပြီ',
      lastUpdated: 'နောက်ဆုံးအပ်ဒိတ်',
      balance: 'လက်ကျန်ငွေ',
      recharge: 'ငွေဖြည့်ရန်',
      enableVoice: 'အသံဖြင့် အကြောင်းကြားချက် ဖွင့်ရန်',
      voiceActive: 'အသံဖြင့် အကြောင်းကြားချက် ဖွင့်ထားသည်'
    },
    deleteAccount: {
      title: 'အကောင့်ဖျက်ရန်တောင်းဆိုခြင်း',
      subtitle: 'MARKET LINK EXPRESS - အကောင့်နှင့်ဒေတာဖျက်ရန်လမ်းညွှန်',
      lastUpdated: 'နောက်ဆုံးအပ်ဒိတ်: 2024 ဒီဇင်ဘာ',
      introduction: {
        title: '1. မိတ်ဆက်',
        content: 'MARKET LINK EXPRESS သည် သင့်ကိုယ်ရေးလုံခြုံမှုအခွင့်အရေးကို လေးစားပါသည်။ ဤစာမျက်နှာသည် သင့်အကောင့်နှင့်ဆက်စပ်ဒေတာကို ဖျက်ရန်တောင်းဆိုနည်းကို ရှင်းပြပါသည်။'
      },
      steps: {
        title: '2. အကောင့်ဖျက်ရန်တောင်းဆိုနည်း',
        subtitle: 'သင့် MARKET LINK EXPRESS အကောင့်နှင့်ဆက်စပ်ဒေတာကို ဖျက်ရန် အောက်ပါအဆင့်များကို လိုက်နာပါ:',
        items: [
          'အက်ပ်မှတဆင့်ဖောက်သည်ဝန်ဆောင်မှုကို ဆက်သွယ်ရန်: MARKET LINK EXPRESS အက်ပ်ကို ဖွင့်ပါ၊ "ကျွန်ုပ်" စာမျက်နှာသို့သွားပါ၊ "ဆက်သွယ်ရန်" ကိုနှိပ်ပါ',
          'အီးမေးလ်မှတဆင့်: marketlink982@gmail.com သို့ "အကောင့်ဖျက်ရန်တောင်းဆိုခြင်း" ခေါင်းစဉ်ဖြင့် အီးမေးလ်ပို့ပါ',
          'ဖုန်းမှတဆင့်: (+95) 09788848928 သို့ခေါ်ဆိုပြီး အကောင့်ဖျက်လိုကြောင်း ပြောပါ',
          'WeChat မှတဆင့်: WeChat AMT349 ကိုထည့်ပြီး "အကောင့်ဖျက်ရန်တောင်းဆိုခြင်း" ပို့ပါ',
          'သင့်တောင်းဆိုမှုတွင် အောက်ပါအချက်အလက်များကို ပေးပါ:',
          '  - သင့်မှတ်ပုံတင်ထားသော အီးမေးလ် သို့မဟုတ် ဖုန်းနံပါတ်',
          '  - သင့်အမည်',
          '  - ဖျက်ရသည့်အကြောင်းရင်း (ရွေးချယ်ရန်)'
        ]
      },
      dataTypes: {
        title: '3. ဖျက်သိမ်းမည့်ဒေတာအမျိုးအစားများ',
        subtitle: 'အကောင့်ဖျက်ပြီးနောက် အောက်ပါဒေတာများကို ဖျက်သိမ်းပါမည်:',
        items: [
          'အကောင့်အချက်အလက် (အမည်၊ အီးမေးလ်၊ ဖုန်းနံပါတ်၊ လိပ်စာ)',
          'အော်ဒါမှတ်တမ်း (အော်ဒါအသေးစိတ်၊ ပို့ဆောင်မှုမှတ်တမ်းများ)',
          'တည်နေရာဒေတာ (GPS ကိုဩဒိနိတ်၊ လိပ်စာအချက်အလက်)',
          'အက်ပ်အသုံးပြုမှုမှတ်တမ်းများ',
          'ဖောက်သည်ဝန်ဆောင်မှု အပြန်အလှန်ဆက်သွယ်မှုမှတ်တမ်းများ',
          'ကိုယ်ရေးရွေးချယ်မှု ဆက်တင်များ'
        ]
      },
      retainedData: {
        title: '4. ထိန်းသိမ်းထားသောဒေတာ',
        subtitle: 'ဥပဒေနှင့်စာရင်းကိုင်လိုအပ်ချက်များအရ အောက်ပါဒေတာများကို ထိန်းသိမ်းထားနိုင်သည်:',
        items: [
          'အော်ဒါမှတ်တမ်းများ: 7 နှစ် (ဥပဒေနှင့်စာရင်းကိုင်လိုအပ်ချက်များ)',
          'ငွေကြေးမှတ်တမ်းများ: 7 နှစ် (အခွန်နှင့်စာရင်းကိုင်လိုအပ်ချက်များ)',
          'ဥပဒေအရလိုအပ်သော အခြားမှတ်တမ်းများ'
        ],
        note: 'ဤဒေတာကို အမည်မသိဖြစ်အောင် ပြုလုပ်ပြီး သင့်ကိုယ်ရေးအချက်အလက်များ မပါဝင်ပါ။'
      },
      processingTime: {
        title: '5. လုပ်ဆောင်ချိန်',
        content: 'ကျွန်ုပ်တို့သည် သင့်ဖျက်သိမ်းရန်တောင်းဆိုမှုကို လက်ခံရရှိပြီးနောက် 30 ရက်အတွင်း လုပ်ဆောင်ပါမည်။ လုပ်ဆောင်မှုပြီးစီးပြီးနောက် ကျွန်ုပ်တို့သည် သင်ပေးထားသော ဆက်သွယ်ရန်နည်းလမ်းမှတဆင့် အကြောင်းကြားပါမည်။'
      },
      consequences: {
        title: '6. အကောင့်ဖျက်သိမ်းခြင်း၏ အကျိုးဆက်များ',
        subtitle: 'အကောင့်ဖျက်ပြီးနောက်:',
        items: [
          'သင်သည် MARKET LINK EXPRESS အက်ပ်သို့ ထပ်မံဝင်ရောက်၍ မရပါ',
          'သင်သည် ယခင်အော်ဒါမှတ်တမ်းကို ဝင်ရောက်ကြည့်ရှု၍ မရပါ',
          'သင်သည် အကောင့်ဆက်စပ်ဝန်ဆောင်မှုများကို အသုံးပြု၍ မရပါ',
          'အကောင့်ဆက်စပ်ဒေတာအားလုံးကို ဖျက်သိမ်းပြီး သို့မဟုတ် အမည်မသိဖြစ်အောင် ပြုလုပ်ပါမည်',
          'အနာဂတ်တွင် ကျွန်ုပ်တို့၏ဝန်ဆောင်မှုများကို ထပ်မံအသုံးပြုလိုပါက အကောင့်အသစ်မှတ်ပုံတင်ရန် လိုအပ်ပါသည်'
        ]
      },
      contact: {
        title: '7. ဆက်သွယ်ရန်',
        subtitle: 'အကောင့်ဖျက်သိမ်းခြင်းနှင့်ပတ်သက်၍ မေးခွန်းများရှိပါက အောက်ပါနည်းလမ်းများမှတဆင့် ဆက်သွယ်ပါ:',
        items: [
          'အီးမေးလ်: marketlink982@gmail.com',
          'ဖုန်း: (+95) 09788848928',
          'WeChat: AMT349',
          'ဝက်ဘ်ဆိုဒ်: www.market-link-express.com',
          'လိပ်စာ: Yangon, Myanmar'
        ],
        note: 'ကျွန်ုပ်တို့သည် သင့်မေးမြန်းမှုကို သင့်လျော်သောအချိန်အတွင်း အကြောင်းပြန်ပါမည်။'
      },
      backToHome: 'ပင်မစာမျက်နှာသို့ပြန်သွားရန်'
    },
    privacy: {
      title: 'ကိုယ်ရေးလုံခြုံမှု မူဝါဒ',
      subtitle: 'ကျွန်ုပ်တို့သည် သင့်ကိုယ်ရေးလုံခြုံမှုကို တန်ဖိုးထားပါသည်။ ဤမူဝါဒသည် ကျွန်ုပ်တို့အနေဖြင့် သင့်ကိုယ်ရေးအချက်အလက်များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ ကာကွယ်သည်ကို ရှင်းလင်းပြထားပါသည်',
      lastUpdated: 'နောက်ဆုံးအပ်ဒိတ်: ၂၀၂၄ ဒီဇင်ဘာ',
      sections: {
        introduction: {
          title: '၁. မိတ်ဆက်',
          content: 'MARKET LINK EXPRESS သည် သင့်ကိုယ်ရေးလုံခြုံမှုကို ကာကွယ်ရန် ကတိပြုထားပါသည်။ ဤကိုယ်ရေးလုံခြုံမှု မူဝါဒသည် သင်သည် ကျွန်ုပ်တို့၏ application နှင့် website ဝန်ဆောင်မှုများကို အသုံးပြုသောအခါ ကျွန်ုပ်တို့အနေဖြင့် သင့်ကိုယ်ရေးအချက်အလက်များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ ထုတ်ဖော်၊ ကာကွယ်သည်ကို ရှင်းလင်းပြထားပါသည်။'
        },
        informationCollection: {
          title: '၂. အချက်အလက် စုဆောင်းခြင်း',
          content: 'ကျွန်ုပ်တို့သည် အောက်ပါ အမျိုးအစားများကို စုဆောင်းနိုင်ပါသည်:',
          items: [
            'ကိုယ်ရေးကိုယ်တာ ခွဲခြားနိုင်သော အချက်အလက်များ: အမည်၊ ဖုန်းနံပါတ်၊ အီးမေးလ်လိပ်စာ၊ လိပ်စာ စသည်တို့',
            'တည်နေရာ အချက်အလက်များ: သင်သည် ကျွန်ုပ်တို့၏ application ကို အသုံးပြုသောအခါ၊ ပို့ဆောင်မှု ဝန်ဆောင်မှုများကို ပေးဆောင်ရန် သင့်တည်နေရာ အချက်အလက်များကို စုဆောင်းပါသည်',
            'စက်ပစ္စည်း အချက်အလက်များ: စက်ပုံစံ၊ operating system ဗားရှင်း၊ ထူးခြားသော စက်ခွဲခြားနိုင်သော ကုဒ်',
            'အသုံးပြုမှု အချက်အလက်များ: application အသုံးပြုမှု၊ ဝင်ရောက်ချိန်များ၊ လုပ်ဆောင်ချက် အသုံးပြုမှု မှတ်တမ်းများ',
            'ဓာတ်ပုံများနှင့် media: သင်သည် application ကို အသုံးပြု၍ ဓာတ်ပုံရိုက်သောအခါ သို့မဟုတ် ပုံများကို တင်သောအခါ'
          ]
        },
        informationUse: {
          title: '၃. အချက်အလက် အသုံးပြုမှု',
          content: 'ကျွန်ုပ်တို့သည် စုဆောင်းထားသော အချက်အလက်များကို အောက်ပါ ရည်ရွယ်ချက်များအတွက် အသုံးပြုပါသည်:',
          items: [
            'အမြန်ပို့ဆောင်မှု ဝန်ဆောင်မှုများကို ပေးဆောင်ရန်နှင့် စီမံခန့်ခွဲရန်',
            'အော်ဒါများကို လုပ်ဆောင်ရန်และ ထုပ်ပိုးများကို ခြေရာခံရန်',
            'ဝန်ဆောင်မှု ဆက်စပ်ကိစ္စများအကြောင်း သင်နှင့် ဆက်သွယ်ရန်',
            'ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများနှင့် အသုံးပြုသူ အတွေ့အကြုံကို မြှင့်တင်ရန်',
            'application လုံခြုံမှုကို သေချာစေရန်နှင့် လိမ်လည်မှုကို ကာကွယ်ရန်',
            'ဥပဒေနှင့် စည်းမျဉ်းစည်းကမ်းများကို လိုက်နာရန်'
          ]
        },
        informationSharing: {
          title: '၄. အချက်အလက် မျှဝေခြင်း',
          content: 'ကျွန်ုပ်တို့သည် သင့်ကိုယ်ရေးအချက်အလက်များကို တတိယပါတီများသို့ ရောင်းချမည် မဟုတ်ပါ။ ကျွန်ုပ်တို့သည် အောက်ပါ အခြေအနေများတွင် သင့်အချက်အလက်များကို မျှဝေနိုင်ပါသည်:',
          items: [
            'ဝန်ဆောင်မှု ပေးသူများ: ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများကို လုပ်ဆောင်ရန် ကူညီသော တတိယပါတီ ဝန်ဆောင်မှု ပေးသူများနှင့် မျှဝေခြင်း',
            'ဥပဒေဆိုင်ရာ လိုအပ်ချက်များ: ဥပဒေအရ လိုအပ်သောအခါ သို့မဟုတ် ကျွန်ုပ်တို့၏ အခွင့်အရေးများကို ကာကွယ်ရန်',
            'စီးပွားရေး လွှဲပြောင်းမှုများ: ကုမ္ပဏီ ပေါင်းစည်းမှု၊ ဝယ်ယူမှု သို့မဟုတ် ပိုင်ဆိုင်မှု ရောင်းချမှု အခြေအနေတွင်',
            'သင့်ခွင့်ပြုချက်ဖြင့်: သင်သည် ရှင်းလင်းစွာ ခွင့်ပြုသောအခါ'
          ]
        },
        dataSecurity: {
          title: '၅. အချက်အလက် လုံခြုံမှု',
          content: 'ကျွန်ုပ်တို့သည် သင့်ကိုယ်ရေးအချက်အလက်များကို ကာကွယ်ရန် သင့်လျော်သော နည်းပညာနှင့် အဖွဲ့အစည်းဆိုင်ရာ လုပ်ဆောင်ချက်များကို ဆောင်ရွက်ပါသည်၊ အောက်ပါတို့ ပါဝင်ပါသည်:',
          items: [
            'အချက်အလက် ပို့ဆောင်မှုကို ကာကွယ်ရန် encryption နည်းပညာကို အသုံးပြုခြင်း',
            'ကိုယ်ရေးအချက်အလက်များသို့ ဝင်ရောက်ခွင့်ကို ကန့်သတ်ခြင်း',
            'ပုံမှန် လုံခြုံမှု စစ်ဆေးမှုများနှင့် အပ်ဒိတ်များ',
            'လုံခြုံသော server များနှင့် database များကို အသုံးပြုခြင်း'
          ]
        },
        yourRights: {
          title: '၆. သင့်အခွင့်အရေးများ',
          content: 'သင့်တွင် အောက်ပါ အခွင့်အရေးများ ရှိပါသည်:',
          items: [
            'သင့်ကိုယ်ရေးအချက်အလက်များကို ဝင်ရောက်ကြည့်ရှုရန်',
            'မမှန်ကန်သော ကိုယ်ရေးအချက်အလက်များကို ပြင်ဆင်ရန်',
            'သင့်ကိုယ်ရေးအချက်အလက်များကို ဖျက်ရန် တောင်းဆိုရန်',
            'အချက်အလက် လုပ်ဆောင်ချက်များအတွက် သင့်ခွင့်ပြုချက်ကို ရုပ်သိမ်းရန်',
            'တိုင်ကြားချက်များ သို့မဟုတ် မေးမြန်းချက်များ ပြုလုပ်ရန်'
          ]
        },
        locationServices: {
          title: '၇. တည်နေရာ ဝန်ဆောင်မှုများ',
          content: 'ကျွန်ုပ်တို့၏ application သည် ပို့ဆောင်မှု ဝန်ဆောင်မှုများကို ပေးဆောင်ရန် သင့်တည်နေရာ အချက်အလက်များသို့ ဝင်ရောက်ခွင့် လိုအပ်ပါသည်။ တည်နေရာ အချက်အလက်များကို အောက်ပါအတွက်သာ အသုံးပြုပါသည်:',
          items: [
            'ပို့ဆောင်မှု အကွာအဝေးနှင့် လမ်းကြောင်းများကို တွက်ချက်ရန်',
            'ပို့ဆောင်မှု အခြေအနေကို အချိန်နှင့်တပြေးညီ ခြေရာခံရန်',
            'ပို့ဆောင်မှု လမ်းကြောင်းများကို အကောင်းဆုံးဖြစ်အောင် လုပ်ဆောင်ရန်',
            'လမ်းညွှန်မှု ဝန်ဆောင်မှုများကို ပေးဆောင်ရန်'
          ],
          note: 'သင်သည် သင့်စက်ဆက်တင်များတွင် မည်သည့်အချိန်တွင်မဆို တည်နေရာ ဝန်ဆောင်မှုများကို ပိတ်နိုင်ပါသည်၊ သို့သော် ဤအရာသည် application ၏ အချို့သော လုပ်ဆောင်ချက်များကို ထိခိုက်နိုင်ပါသည်။'
        },
        dataRetention: {
          title: '၈. အချက်အလက် ထိန်းသိမ်းထားမှု',
          content: 'ကျွန်ုပ်တို့သည် ဝန်ဆောင်မှုများကို ပေးဆောင်ရန်နှင့် ဥပဒေဆိုင်ရာ ဝတ္တရားများကို လိုက်နာရန် လိုအပ်သော အချိန်အတွက်သာ သင့်ကိုယ်ရေးအချက်အလက်များကို ထိန်းသိမ်းထားပါသည်။ အချက်အလက်များ မလိုအပ်တော့သောအခါ၊ ကျွန်ုပ်တို့သည် လုံခြုံစွာ ဖျက်ပစ်မည် သို့မဟုတ် အမည်မသိ လုပ်ဆောင်မည် ဖြစ်ပါသည်။'
        },
        childrenPrivacy: {
          title: '၉. ကလေးများ၏ ကိုယ်ရေးလုံခြုံမှု',
          content: 'ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများသည် အသက် ၁၃ နှစ်အောက် ကလေးများအတွက် ရည်ရွယ်ထားခြင်း မဟုတ်ပါ။ ကျွန်ုပ်တို့သည် ကလေးများ၏ ကိုယ်ရေးအချက်အလက်များကို သိရှိစွာ စုဆောင်းမည် မဟုတ်ပါ။ ကျွန်ုပ်တို့သည် ကလေးများ၏ အချက်အလက်များကို စုဆောင်းထားသည်ကို တွေ့ရှိပါက၊ ကျွန်ုပ်တို့သည် ချက်ချင်း ဖျက်ပစ်မည် ဖြစ်ပါသည်။'
        },
        changes: {
          title: '၁၀. မူဝါဒ ပြောင်းလဲမှုများ',
          content: 'ကျွန်ုပ်တို့သည် ဤကိုယ်ရေးလုံခြုံမှု မူဝါဒကို အချိန်အခါအလိုက် အပ်ဒိတ်လုပ်နိုင်ပါသည်။ အရေးကြီးသော ပြောင်းလဲမှုများကို application သို့မဟုတ် အီးမေးလ်မှတဆင့် အကြောင်းကြားမည် ဖြစ်ပါသည်။ ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှုများကို ဆက်လက် အသုံးပြုခြင်းသည် အပ်ဒိတ်လုပ်ထားသော မူဝါဒကို သင်လက်ခံကြောင်း ဖော်ပြပါသည်။'
        },
        contact: {
          title: '၁၁. ဆက်သွယ်ရန်',
          content: 'ဤကိုယ်ရေးလုံခြုံမှု မူဝါဒအကြောင်း သင်တွင် မေးခွန်းများ သို့မဟုတ် စိုးရိမ်မှုများ ရှိပါက၊ အောက်ပါနည်းလမ်းများမှတဆင့် ကျွန်ုပ်တို့အား ဆက်သွယ်ပါ:',
          items: [
            'ဖုန်း: (+95) 09788848928',
            'အီးမေးလ်: marketlink982@gmail.com',
            'လိပ်စာ: ChanMyaThaZi Mandalay'
          ]
        }
      }
    },
    order: {
      title: 'အမှာတင်ခြင်း',
      sender: 'ပို့သူအချက်အလက်',
      receiver: 'လက်ခံသူအချက်အလက်',
      package: 'မြန်နှုန်း',
      submit: 'အမှာတင်ပါ',
      cancel: 'ပယ်ဖျက်ပါ',
      selectOnMap: 'မြေပုံတွင်ရွေးချယ်ပါ',
      senderName: 'ပို့သူအမည်',
      senderPhone: 'ဆက်သွယ်ရေးဖုန်းနံပါတ်',
      senderAddress: 'ပို့သူလိပ်စာ',
      receiverName: 'လက်ခံသူအမည်',
      receiverPhone: 'ဆက်သွယ်ရေးဖုန်းနံပါတ်',
      receiverAddress: 'လက်ခံသူလိပ်စာ',
      packageType: 'ထုပ်ပိုးအမျိုးအစား',
      packageDescription: 'ထုပ်ပိုးဖော်ပြချက်',
      packageWeight: 'အလေးချိန်',
      mapTitle: 'ရွေးချယ်ပါ',
      mapTip: '💡 အကြံပြုချက်: မြေပုံပေါ်တွင် နေရာကို နှိပ်ပြီး လိပ်စာကို အလိုအလျောက် ဖြည့်စွက်ပါ။ သင်သည် အိမ်နံပါတ်နှင့် အသေးစိတ်အချက်အလက်များကို ထပ်မံ ဖြည့်စွက်နိုင်သည်။',
      mapPlaceholder: 'အသေးစိတ်လိပ်စာ ထည့်ပါ သို့မဟုတ် မြေပုံပေါ်တွင် နေရာကို ရွေးချယ်ပါ',
      confirmSelection: 'ရွေးချယ်မှုကို အတည်ပြုပါ',
      getMyLocation: 'ကျွန်ုပ်၏တည်နေရာကို ရယူပါ',
      selectType: 'ပစ္စည်းအမျိုးအစားကို ရွေးချယ်ပါ'
    },
    ui: {
      packageTracking: 'ထုပ်ပိုးခြင်း စောင့်ကြည့်ခြင်း',
      lightningDelivery: 'မြန်ဆန်သော ပို့ဆောင်မှု',
      secureReliable: 'လုံခြုံ ယုံကြည်စိတ်ချရသော',
      smartService: 'ဉာဏ်ရည်တု ဝန်ဆောင်မှု',
      transparentPricing: 'ပွင့်လင်းသော စျေးနှုန်းသတ်မှတ်ခြင်း',
      prepaidDeliveryFee: 'ကြိုတင်ပေးချေသော ပို့ဆောင်ခြင်း ကုန်ကျစရိတ်',
      scanQrPay: 'QR Code ကို စကင်န်ဖတ်ပြီး ပေးချေပါ',
      deliveryFee: 'ပို့ဆောင်ခြင်း ကုန်ကျစရိတ်',
      paymentQrCode: 'ပေးချေမှု QR Code',
      confirmPayment: 'ပေးချေမှုကို အတည်ပြုပါ',
      cancelPayment: 'ပေးချေမှုကို ပယ်ဖျက်ပါ',
      packageType: 'ထုပ်ပိုးအမျိုးအစား',
      document: 'စာရွက်စာတမ်း',
      standardPackage: 'စံထုပ်ပိုး',
      overweightPackage: 'အလေးချိန်များသော ထုပ်ပိုး',
      oversizedPackage: 'အရွယ်အစားကြီးသော ထုပ်ပိုး',
      fragile: 'ပျက်စီးလွယ်သော',
      foodDrinks: 'အစားအသောက်များ',
      standardPackageDetail: 'စံထုပ်ပိုး (45x60x15cm) နှင့် (5KG) အတွင်း',
      overweightPackageDetail: 'အလေးချိန်များသော ထုပ်ပိုး (5KG) အထက်',
      oversizedPackageDetail: 'အရွယ်အစားကြီးသော ထုပ်ပိုး (45x60x15cm) အထက်',
      onTimeDelivery: 'အချိန်မှန်ပို့ဆောင်မှု（အမှာတင်ပြီး ၁ နာရီအတွင်း）',
      urgentDelivery: 'အလျင်အမြန်ပို့ဆောင်မှု（အမှာတင်ပြီး ၃၀ မိနစ်အတွင်း）',
      scheduledDelivery: 'အချိန်သတ်မှတ်ပို့ဆောင်မှု（ဖောက်သည်တောင်းဆိုသောအချိန်）',
      selectDeliverySpeed: 'ပို့ဆောင်မှုမြန်နှုန်းကို ရွေးချယ်ပါ',
      packageInfoMismatch: 'အမှန်တကယ်ပစ္စည်းနှင့် ထုပ်ပိုးအချက်အလက် မကိုက်ညီပါက စျေးနှုန်းသတ်မှတ်ခြင်း မှားယွင်းနိုင်ပါသည်',
      selectDeliveryTime: 'ပို့ဆောင်ချိန်ကို ရွေးချယ်ပါ',
      selectDate: 'ရက်စွဲရွေးပါ',
      selectTime: 'အချိန်ရွေးပါ',
      confirmTime: 'အချိန်အတည်ပြုပါ',
      cancel: 'ပယ်ဖျက်',
      selectedTime: 'ရွေးချယ်ထားသောအချိန်',
      calculating: 'စျေးနှုန်းတွက်ချက်နေသည်...',
      deliveryDistance: 'ပို့ဆောင်အကွာအဝေး',
      totalAmount: 'စုစုပေါင်းပမာဏ',
      paymentQRCode: 'ငွေပေးချေမှု QR ကုဒ်',
      scanToPay: 'စကင်န်ဖတ်၍ ငွေပေးပါ',
      priceBreakdown: 'စျေးနှုန်းအသေးစိတ်',
      paymentWarning: '⚠️ မှတ်ချက် - ငွေပေးပြီးရင် ပြန်အမ်းမရပါ ။ မှာယူမှတ်တမ်းအား အတည်ပြုပြီးမှ ငွေပေးရန်',
      cashPayment: 'ငွေသားပေးချေမှု',
      cashPaymentDesc: 'ငွေသားပေးချေမှုကို ရွေးချယ်ပါ၊ ကူရီယာသည် ပစ္စည်းယူသောအခါ ငွေကောက်ခံမည်',
      selectPaymentMethod: 'ပေးချေမှုနည်းလမ်းရွေးချယ်ရန်',
      qrPayment: 'QR ကုဒ်ပေးချေမှု',
      underDevelopment: 'ဖွံ့ဖြိုးဆဲ',
      basePrice: 'အခြေခံအခကြေး',
      distanceFee: 'အကွာအဝေးအခ',
      packageTypeFee: 'ပစ္စည်းအမျိုးအစား',
      weightFee: 'အလေးချိန်အခ',
      speedFee: 'မြန်နှုန်းအခ',
      orderEmailSending: 'အော်ဒါအတည်ပြုအီးမေးလ် ပို့နေပါသည်၊ ခဏစောင့်ပါ...',
      orderEmailSent: 'အော်ဒါအတည်ပြုအီးမေးလ်ပို့ပြီးပါပြီ။ အီးမေးလ်ကို စစ်ဆေးပါ။',
      orderEmailSentDev: 'ဖွံ့ဖြိုးတိုးတက်မှု မုဒ် - အီးမေးလ်ကို မပို့ရသေးပါ။ QR ကုဒ်ကို ကိုယ်တိုင် သိမ်းဆည်းပါ။',
      orderFollowup: '၁ နာရီအတွင်း ကူရီယာမှ ပစ္စည်းယူဖို့ ဆက်သွယ်ပါမည်။',
      speed: 'မြန်နှုန်း',
      packageTypeInfo: {
        title: 'ထုပ်ပိုးအမျိုးအစား ရှင်းလင်းချက်',
        standard: 'စံထုပ်ပိုး (45x60x15cm) နှင့် (5KG) အတွင်း။',
        overweight: '၅ ကီလိုဂရမ်ထက် ပိုလေးသော ထုပ်ပိုးမှုများ။',
        oversized: 'စံအရွယ်အစားထက် ကျော်လွန်သော ထုပ်ပိုးမှုများ။',
        fragile: 'ပျက်စီးလွယ်သော ပစ္စည်းများ (ဥပမာ- ဖန်၊ ကြွေထည်)။',
        foodDrinks: 'အစားအသောက်နှင့် ဖျော်ရည်များ။',
        document: 'စာရွက်စာတမ်းများ (ဥပမာ- စာများ၊ နိုင်ငံကူးလက်မှတ်)။',
        waySide: '၂၄ နာရီအတွင်း တန်တန်လေး ပို့ဆောင်ပေးပါသည်။'
      },
      waySide: 'တန်တန်လေးပို့'
    }
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState(() => {
    const savedLang = localStorage.getItem('ml-express-language');
    if (savedLang && (savedLang === 'zh' || savedLang === 'en' || savedLang === 'my')) {
      return savedLang;
    }
    return 'zh';
  });

  useEffect(() => {
    // 确保body属性 with 状态同步
    document.body.setAttribute('data-language', language);
  }, [language]);

  const setLanguage = (lang: string) => {
    setLanguageState(lang);
    localStorage.setItem('ml-express-language', lang);
    // 设置body的data-language属性，用于CSS选择器
    document.body.setAttribute('data-language', lang);
  };

  const t = translations[language] || translations.zh;

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return context;
};
