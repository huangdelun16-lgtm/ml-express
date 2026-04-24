/**
 * 客户端 C 端「订单全链路可预期」：根据状态生成下一步说明与进度下标（与列表/详情共用）
 */

export type AppLang = 'zh' | 'en' | 'my';

/** 四段进度：待取件 → 已取件 → 配送中 → 已送达（用于圆点/横条） */
export function getJourneyStepIndex(status: string): number {
  const s = (status || '').trim();
  if (s === '已取消') return -1;
  if (s === '已送达' || s === '已完成') return 3;
  if (s === '待取件' || s === '待确认' || s === '打包中') return 0;
  if (s === '已取件') return 1;
  if (s === '配送中' || s === '配送进行中' || s === '待收款') return 2;
  if (s === '异常上报') return 2;
  return 0;
}

export function getJourneyLabels(lang: AppLang): string[] {
  if (lang === 'en') return ['Pickup', 'Picked up', 'Delivering', 'Done'];
  if (lang === 'my') return ['ထုပ်ယူရန်', 'ထုပ်ယူပြီး', 'ပို့ဆောင်နေ', 'ပြီးပါပြီ'];
  return ['待取件', '已取件', '配送中', '已送达'];
}

export type JourneyCopy = {
  headline: string;
  detail: string;
  /** 进度高亮到哪一步 0..3，-1 取消，3 也可为已完成 */
  activeStep: number;
  variant: 'normal' | 'warning' | 'success' | 'muted';
  suggestTrack: boolean;
  suggestChat: boolean;
};

export function getJourneyCopy(status: string, lang: AppLang): JourneyCopy {
  const s = (status || '').trim();
  const L = (zh: string, en: string, my: string) => (lang === 'en' ? en : lang === 'my' ? my : zh);

  if (s === '已取消') {
    return {
      headline: L('本单已取消', 'This order was cancelled', 'ဤအော်ဒါပယ်ဖျက်ပြီး'),
      detail: L('无需等待配送。如有疑问请联系客服。', 'No delivery will occur. Contact support if needed.', 'ပို့ဆောင်မှုမလိုပါ။ မေးခွန်းရှိပါက ဆက်သွယ်ပါ။'),
      activeStep: -1,
      variant: 'muted',
      suggestTrack: false,
      suggestChat: false,
    };
  }
  if (s === '已送达' || s === '已完成') {
    return {
      headline: L('订单已送达', 'Delivered', 'ပို့ဆောင်ပြီး'),
      detail: L('感谢使用！可在下方查看凭证或进行评价。', 'Thank you! You can view proof or rate below.', 'ကျေးဇူးတင်ပါသည်! အောက်တွင်အထောက်အထားသို့ အဆင့်ပေးနိုင်သည်။'),
      activeStep: 3,
      variant: 'success',
      suggestTrack: false,
      suggestChat: false,
    };
  }
  if (s === '异常上报') {
    return {
      headline: L('订单异常已上报', 'An issue was reported', 'ပြဿနာတင်ပြပြီး'),
      detail: L('请通过「联系配送员」或电话沟通；您也可在实时追踪中查看位置。', 'Use chat or call the courier. You can also check live map.', 'ဆက်သွယ်ရန် ချတ်/ခေါ်ဆိုပါ။ တိုက်ရိုက်မြေပုံ၌ ကြည့်နိုင်သည်။'),
      activeStep: 2,
      variant: 'warning',
      suggestTrack: true,
      suggestChat: true,
    };
  }
  if (s === '待取件' || s === '待确认' || s === '打包中') {
    return {
      headline: L('等待骑手取件', 'Waiting for pickup', 'ပို့ဆောင်သမားထုပ်ယူစောင့်ဆိုင်း'),
      detail: L(
        '骑手接单后将上门取件，请保持手机畅通；开启通知可及时收到更新。',
        'A courier will pick up the parcel. Keep your phone on; turn on notifications for updates.',
        'ပို့ဆောင်သမားလာရောက်ထုပ်ယူပါမည်။ ဖုန်းဖွင့်ထားပြီး အသိပေးချက်ဖွင့်ထားပါ။'
      ),
      activeStep: 0,
      variant: 'normal',
      suggestTrack: true,
      suggestChat: false,
    };
  }
  if (s === '已取件') {
    return {
      headline: L('包裹已取件', 'Parcel picked up', 'ပါဆယ်ထုပ်ယူပြီး'),
      detail: L('骑手已取件，正准备送往收件地址，您可查看实时位置与预计进度。', 'The courier is heading to the recipient. Check live location.', 'ပို့ဆောင်သမားလက်ခံလိပ်စာသို့ သွားသည်။ တိုက်ရိုက် တည်နေရာ ကြည့်ပါ။'),
      activeStep: 1,
      variant: 'normal',
      suggestTrack: true,
      suggestChat: true,
    };
  }
  if (s === '配送中' || s === '配送进行中' || s === '待收款') {
    return {
      headline: L('正在配送中', 'Out for delivery', 'ပို့ဆောင်နေသည်'),
      detail: L(
        '骑手正前往收货地址，可在「实时追踪」看地图与骑手位置，有问题用聊天或电话联系。',
        'Tap Live tracking for map; contact the courier by chat or call if needed.',
        'မြေပုံမှာ တိုက်ရိုက်ကြည့်နိုင်ပြီး ချိတ်ဆက်နိုင်သည်။'
      ),
      activeStep: 2,
      variant: 'normal',
      suggestTrack: true,
      suggestChat: true,
    };
  }
  return {
    headline: L('处理中', 'In progress', 'လုပ်ဆောင်နေသည်'),
    detail: L('请稍候，或查看订单状态与通知。', 'Please wait, or check status and notifications.', 'စောင့်ပြီး အခြေအနေကြည့်ပါ။'),
    activeStep: getJourneyStepIndex(s),
    variant: 'normal',
    suggestTrack: true,
    suggestChat: !!s && s !== '待分配',
  };
}

/** 我的订单列表：一行副标题（短句，避免占满卡片） */
export function getOrderListJourneyHint(status: string, lang: AppLang): string {
  const j = getJourneyCopy(status, lang);
  return j.headline;
}
