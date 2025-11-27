// 应用全局常量配置

export const APP_CONFIG = {
  // 应用基础信息
  NAME: 'MARKET LINK EXPRESS',
  VERSION: '1.1.0',
  WEBSITE: 'https://www.market-link-express.com',
  
  // 联系方式
  CONTACT: {
    PHONE: '+959788848928',
    PHONE_DISPLAY: '(+95) 09788848928',
    WECHAT: 'AMT349',
    VIBER: '09259369349',
    GMAIL: 'huangdelun16@gmail.com',
  },
  
  // API配置
  API: {
    TIMEOUT: 30000, // 30秒
    RETRY_COUNT: 3,
    ENDPOINTS: {
      SEND_SMS: '/.netlify/functions/send-sms',
      SEND_EMAIL: 'https://market-link-express.com/.netlify/functions/send-email-code',
      VERIFY_EMAIL: 'https://market-link-express.com/.netlify/functions/verify-email-code',
    }
  },
  
  // 地图配置
  MAP: {
    DEFAULT_LOCATION: {
      latitude: 21.9588,
      longitude: 96.0891,
    },
    DEFAULT_ZOOM: {
      latitudeDelta: 0.01,
      longitudeDelta: 0.01,
    },
    SEARCH_RADIUS: 50000, // 50km
  },
  
  // 订单配置
  ORDER: {
    ID_PREFIXES: {
      MANDALAY: 'MDY',
      PYIN_OO_LWIN: 'POL',
      YANGON: 'YGN',
      NAYPYIDAW: 'NPW',
      TAUNGGYI: 'TGI',
      LASHIO: 'LSO',
      MUSE: 'MSE',
    },
    STATUS: {
      PENDING: 'pending',
      PICKED_UP: 'picked_up',
      IN_TRANSIT: 'in_transit',
      DELIVERED: 'delivered',
      CANCELLED: 'cancelled',
    }
  },
  
  // 本地存储键名
  STORAGE_KEYS: {
    USER_ID: 'userId',
    USER_NAME: 'userName',
    USER_PHONE: 'userPhone',
    USER_EMAIL: 'userEmail',
    CURRENT_USER: 'currentUser',
    IS_GUEST: 'isGuest',
    LANGUAGE: 'language',
    NOTIFICATION_SETTINGS: 'notification_settings',
    OFFLINE_ORDERS: 'offline_orders',
  }
};

