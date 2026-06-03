export type OrderWizardStepIndex = 0 | 1 | 2 | 3;

export const WIZARD_LAST_STEP: OrderWizardStepIndex = 3;

export function getWizardStepLabels(language: string): string[] {
  if (language === 'en') return ['Address', 'Package', 'Delivery', 'Confirm'];
  if (language === 'my') return ['လိပ်စာ', 'ပါဆယ်', 'ပို့ဆောင်', 'အတည်ပြု'];
  return ['地址', '包裹', '配送', '确认'];
}

export function getWizardCopy(language: string) {
  if (language === 'en') {
    return {
      next: 'Next',
      back: 'Back',
      subtitle: 'Please fill in order information',
      coordsRequired: 'Please pick sender and receiver locations on the map',
      fillRequired: 'Please fill all required fields',
      weightRequired: 'Please enter package weight',
      weightInvalid: 'Please enter a valid weight',
      scheduleRequired: 'Please set scheduled delivery time',
      phoneInvalid: 'Invalid phone format (09...)',
    };
  }
  if (language === 'my') {
    return {
      next: 'ရှေ့သို့',
      back: 'နောက်သို့',
      subtitle: 'အမှာစာအချက်အလက်ဖြည့်ပါ',
      coordsRequired: 'ပို့သူနှင့် လက်ခံသူ လိပ်စာကို မြေပွင့်တွင် ရွေးချယ်ပါ',
      fillRequired: 'လိုအပ်သောအချက်အလက်အားလုံးဖြည့်ပါ',
      weightRequired: 'ပါဆယ်အလေးချိန် ထည့်ပါ',
      weightInvalid: 'အလေးချိန်မှန်ကန်စွာ ထည့်ပါ',
      scheduleRequired: 'ပို့ဆောင်မည့်အချိန် ရွေးချယ်ပါ',
      phoneInvalid: 'ဖုန်းနံပါတ်ပုံစံမမှန် (09...)',
    };
  }
  return {
    next: '下一步',
    back: '上一步',
    subtitle: '请填写订单信息',
    coordsRequired: '请在地图中选择寄件与收件精确位置',
    fillRequired: '请填写所有必填项',
    weightRequired: '请填写包裹重量',
    weightInvalid: '请输入有效包裹重量',
    scheduleRequired: '请填写指定送达时间',
    phoneInvalid: '手机号格式错误 (09...)',
  };
}

function validatePhone(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && /^09\d{7,9}$/.test(trimmed);
}

/** 从地址文本中解析「📍 坐标: lat, lng」 */
export function parseCoordsFromAddress(
  addressText: string,
): { lat: number; lng: number } | null {
  const match = addressText?.match(/📍\s*坐标:\s*(-?\d+\.?\d*),\s*(-?\d+\.?\d*)/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lng = parseFloat(match[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function resolveLocation(
  location: { lat: number; lng: number } | null | undefined,
  addressText: string,
): { lat: number; lng: number } | null {
  if (location?.lat != null && location?.lng != null) return location;
  return parseCoordsFromAddress(addressText);
}

export function validateAddressStep(
  fields: {
    senderName: string;
    senderPhone: string;
    senderAddress: string;
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
    senderLocation: { lat: number; lng: number } | null;
    receiverLocation: { lat: number; lng: number } | null;
  },
  copy: ReturnType<typeof getWizardCopy>
): string | null {
  if (!fields.senderName.trim() || !fields.receiverName.trim()) return copy.fillRequired;
  if (!fields.senderAddress.trim() || !fields.receiverAddress.trim()) return copy.fillRequired;
  if (!validatePhone(fields.senderPhone) || !validatePhone(fields.receiverPhone)) return copy.phoneInvalid;
  const senderLoc = resolveLocation(fields.senderLocation, fields.senderAddress);
  const receiverLoc = resolveLocation(fields.receiverLocation, fields.receiverAddress);
  if (!senderLoc || !receiverLoc) return copy.coordsRequired;
  return null;
}

export function validatePackageStep(
  showWeightInput: boolean,
  orderWeight: string,
  copy: ReturnType<typeof getWizardCopy>
): string | null {
  if (!showWeightInput) return null;
  if (!String(orderWeight).trim()) return copy.weightRequired;
  const parsed = Number(orderWeight);
  if (!Number.isFinite(parsed) || parsed <= 0) return copy.weightInvalid;
  return null;
}

export function validateDeliveryStep(
  selectedDeliverySpeed: string,
  scheduledDeliveryTime: string,
  scheduledSpeedValue: string,
  copy: ReturnType<typeof getWizardCopy>
): string | null {
  if (selectedDeliverySpeed === scheduledSpeedValue && !scheduledDeliveryTime.trim()) {
    return copy.scheduleRequired;
  }
  return null;
}
