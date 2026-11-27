import type { OfflineUpdate } from '../services/cacheService';

export function offlineQueueFailureText(
  item: OfflineUpdate,
  language: string,
  online: boolean,
): string {
  if (!item.lastError) {
    if (!online) {
      return language === 'zh'
        ? '待上传：手机没网，还在这台手机上'
        : language === 'my'
          ? 'မတင်ရသေး။ ကွန်ရက်မရှိ'
          : 'Waiting: this phone is offline';
    }
    return language === 'zh'
      ? '待上传：还在这台手机上，还没交给服务器'
      : language === 'my'
        ? 'မတင်ရသေး။ ဖုန်းထဲတွင်ရှိသည်'
        : 'Waiting: still on this phone';
  }
  const reason =
    item.lastError === 'photo_rejected'
      ? language === 'zh'
        ? '照片没有传上去'
        : language === 'my'
          ? 'ဓာတ်ပုံ မတင်ရ'
          : 'photo was not uploaded'
      : item.lastError === 'status_rejected'
        ? language === 'zh'
          ? '状态没有写到服务器'
          : language === 'my'
            ? 'အခြေအနေ မသိမ်းရ'
            : 'status was not saved'
        : item.lastError === 'network'
          ? language === 'zh'
            ? '网络中断'
            : language === 'my'
              ? 'ကွန်ရက်ပြတ်'
              : 'network dropped'
          : item.lastError;
  const action =
    item.type === 'photo'
      ? language === 'zh'
        ? '拍照'
        : language === 'my'
          ? 'ဓာတ်ပုံ'
          : 'Photo'
      : item.status === '已取件'
        ? language === 'zh'
          ? '取件'
          : language === 'my'
            ? 'ယူခြင်း'
            : 'Pickup'
        : item.status === '已送达' || item.status === '已完成'
          ? language === 'zh'
            ? '送达'
            : language === 'my'
              ? 'ပို့ခြင်း'
              : 'Delivery'
          : language === 'zh'
            ? '这一步'
            : language === 'my'
              ? 'ဤအဆင့်'
              : 'This step';
  return language === 'zh'
    ? `${action}没传上去：${reason}`
    : language === 'my'
      ? `${action} မတင်ရ：${reason}`
      : `${action} failed: ${reason}`;
}
