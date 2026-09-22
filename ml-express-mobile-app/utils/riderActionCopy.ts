import { tr3 } from './tr3';

const STATUS_LABELS: Record<string, [string, string, string]> = {
  待取件: ['待取件', 'Pending pickup', 'ယူရန်ကျန်'],
  待收款: ['待收款', 'Wait collect', 'ငွေကောက်ရန်'],
  待确认: ['待确认', 'Pending confirm', 'အတည်ပြုရန်'],
  打包中: ['打包中', 'Packing', 'ထုပ်ပိုးနေသည်'],
  已取件: ['已取件', 'Picked up', 'ယူပြီး'],
  配送中: ['配送中', 'Delivering', 'ပို့ဆောင်နေသည်'],
  已送达: ['已送达', 'Delivered', 'ပို့ပြီး'],
  已完成: ['已完成', 'Completed', 'ပြီးပါပြီ'],
  异常上报: ['异常上报', 'Anomaly reported', 'ပုံမှန်မဟုတ် တင်ပြပြီး'],
  已取消: ['已取消', 'Cancelled', 'ပယ်ဖျက်ပြီး'],
};

export function riderActionCopy(language: string) {
  return {
    mockLocationTitle: tr3(language, '检测到异常', 'Anomaly Detected', 'ပုံမှန်မဟုတ်သော အခြေအနေ'),
    mockLocationBody: tr3(
      language,
      '系统检测到模拟定位，该操作已被禁止并已上报。',
      'Mock location detected. This action is prohibited and reported.',
      'တည်နေရာအတု သုံးနေသည်ကို တွေ့ရှိသဖြင့် လုပ်ဆောင်မှုကို ပိတ်ပြီး တင်ပြပြီးပါပြီ။',
    ),
    mockLocationScan: tr3(
      language,
      '禁止使用模拟定位进行扫码',
      'Mock location is not allowed for scan',
      'တည်နေရာအတုဖြင့် စကင်န်ဖတ်၍ မရပါ',
    ),
    tooFarTitle: tr3(language, '距离过远', 'Too Far', 'အလွန်ဝေးနေသည်'),
    tooFarPhoto: (meters: number) =>
      tr3(
        language,
        `您距离送达点还剩 ${meters} 米，请到达目的地后再拍照。`,
        `You are ${meters}m away from destination. Please arrive before taking photo.`,
        `ပို့ဆောင်ရာနေရာမှ ${meters} မီတာ ကျန်ပါသေးသည်။ ရောက်မှ ဓာတ်ပုံရိုက်ပါ။`,
      ),
    tooFarFinish: (meters: number) =>
      tr3(
        language,
        `您距离送达点还剩 ${meters} 米，请到达目的地后再点击（需在 200 米范围内）。`,
        `You are ${meters}m away from destination. Please arrive before tapping (within 200m).`,
        `ပို့ဆောင်ရာနေရာမှ ${meters} မီတာ ကျန်ပါသေးသည်။ ၂၀၀ မီတာအတွင်း ရောက်မှ နှိပ်ပါ။`,
      ),
    tooFarConfirm: (meters: number) =>
      tr3(
        language,
        `您当前距离目标点约 ${meters} 米，请到达目的地 200 米范围内再确认。`,
        `You are about ${meters}m away. Confirm within 200m of the destination.`,
        `ပို့ဆောင်ရာနေရာမှ ${meters} မီတာခန့်။ ၂၀၀ မီတာအတွင်း ရောက်မှ အတည်ပြုပါ။`,
      ),
    tooFarScan: (meters: number) =>
      tr3(
        language,
        `距离送达点约 ${meters} 米，请靠近后再扫码`,
        `About ${meters}m away. Move closer before scanning.`,
        `ပို့ဆောင်ရာနေရာမှ ${meters} မီတာခန့်။ နီးကပ်မှ စကင်န်ဖတ်ပါ။`,
      ),
    confirmPickupTitle: tr3(language, '确认取件', 'Confirm Pickup', 'ပစ္စည်းယူရန် အတည်ပြုပါ'),
    confirmPickupBody: tr3(
      language,
      '确定已收到此包裹吗？',
      'Are you sure you have received this package?',
      'ဤပါဆယ်ကို လက်ခံရရှိပြီးပြီလား။',
    ),
    confirmPickupScanBody: (pkgId: string, receiverName: string) =>
      tr3(
        language,
        `包裹：${pkgId}\n收件人：${receiverName}\n\n确认后状态将更新为「已取件」`,
        `Package: ${pkgId}\nReceiver: ${receiverName}\n\nConfirm to mark as picked up.`,
        `ပါဆယ်: ${pkgId}\nလက်ခံသူ: ${receiverName}\n\nအတည်ပြုပါက 「ယူပြီး」 ဖြစ်မည်။`,
      ),
    pickupConfirmed: tr3(language, '已确认取件', 'Pickup confirmed', 'ပစ္စည်းယူပြီးပါပြီ'),
    pickupSuccess: tr3(language, '取件成功，可开始配送', 'Picked up. Ready to deliver.', 'ယူပြီးပါပြီ။ ပို့ဆောင်နိုင်ပါပြီ။'),
    pickupSuccessTitle: tr3(language, '取件成功', 'Pickup done', 'ယူပြီးပါပြီ'),
    pickupSuccessId: (pkgId: string) =>
      tr3(language, `取件成功：${pkgId}`, `Picked up: ${pkgId}`, `ယူပြီး: ${pkgId}`),
    pickupNextSteps: (pkgId: string) =>
      tr3(
        language,
        `包裹 ${pkgId} 已取件。下一步可去详情导航并送达。`,
        `Package ${pkgId} picked up. Open detail to navigate & deliver.`,
        `ပါဆယ် ${pkgId} ယူပြီးပါပြီ။ အသေးစိတ်ဖွင့်ပြီး လမ်းညွှန် / ပို့ဆောင်နိုင်သည်။`,
      ),
    pickupFailed: tr3(language, '取件失败', 'Pickup failed', 'ပစ္စည်းယူမှု မအောင်မြင်ပါ'),
    pickupFailedRetry: tr3(language, '取件失败，请重试', 'Pickup failed. Please retry.', 'ယူမှု မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။'),
    pickupFailedNetwork: tr3(
      language,
      '取件失败，请检查网络',
      'Pickup failed. Check network.',
      'ယူမှု မအောင်မြင်ပါ။ ကွန်ရက် စစ်ပါ။',
    ),
    pickupWrongStage: tr3(
      language,
      '当前为取件阶段，请扫描包裹码；店长收件码用于送达',
      'Pickup stage: scan package code. Store code is for delivery.',
      'ယခု အဆင့်သည် ပစ္စည်းယူရန်ဖြစ်သည်။ ပါဆယ်ကုဒ်ကို စကင်န်ဖတ်ပါ။ ဆိုင်ကုဒ်သည် ပို့ဆောင်ချိန်အတွက်ဖြစ်သည်။',
    ),
    pickupNow: tr3(language, '立即取件', 'Pickup', 'ယခုယူမည်'),
    scanPickup: tr3(language, '扫码取件', 'Scan pickup', 'စကင်န်ဖြင့် ယူမည်'),
    manualPickup: tr3(language, '手动取件', 'Manual pickup', 'ကိုယ်တိုင်ယူ'),
    completeDelivery: tr3(language, '完成配送', 'Complete', 'ပို့ဆောင်မှု ပြီးပါစေ'),
    startDelivery: tr3(language, '开始配送', 'Start delivery', 'ပို့ဆောင်မှု စတင်'),
    deliveryStarted: tr3(language, '已开始配送', 'Delivery started', 'ပို့ဆောင်မှု စတင်ပြီး'),
    pickupPoint: tr3(language, '取货点', 'Pickup', 'ပစ္စည်းယူရန်'),
    dropPoint: tr3(language, '送货点', 'Delivery', 'ပစ္စည်းပို့ရန်'),
    scanDeliver: tr3(language, '扫码送达', 'Scan delivery', 'စကင်န်ဖြင့် ပို့မည်'),
    photoDeliver: tr3(language, '拍照送达', 'Photo delivery', 'ဓာတ်ပုံဖြင့် ပို့မည်'),
    chooseProof: tr3(language, '选择配送证明', 'Delivery proof', 'ပို့ဆောင်အထောက်အထား ရွေးပါ'),
    confirmDeliveryTitle: tr3(language, '确认配送', 'Confirm delivery', 'ပို့ဆောင်မှု အတည်ပြု'),
    proofToUpload: tr3(language, '待上传证明', 'Proof to upload', 'တင်ရန် အထောက်အထား'),
    retake: tr3(language, '重新拍摄', 'Retake', 'ပြန်ရိုက်မည်'),
    uploading: tr3(language, '正在上传...', 'Uploading...', 'တင်နေသည်...'),
    confirmDeliver: tr3(language, '确认送达', 'Confirm delivery', 'ပို့ဆောင်ပြီးဟု အတည်ပြု'),
    deliveryOps: tr3(language, '配送操作', 'Delivery', 'ပို့ဆောင်မှု'),
    scanMismatch: tr3(
      language,
      '扫码与当前包裹不匹配，请对准本单二维码',
      'Code does not match this package',
      'စကင်န်ကုဒ်သည် ဤပါဆယ်နှင့် မကိုက်ညီပါ',
    ),
    photoReadFailed: tr3(
      language,
      '配送证明读取失败，请重新拍照',
      'Could not read proof photo. Please retake.',
      'ဓာတ်ပုံဖတ်၍မရပါ။ ထပ်ရိုက်ပါ။',
    ),
    photoUploadFailed: tr3(
      language,
      '配送证明上传失败，未标记送达。请重试。',
      'Proof photo failed. Package was not marked delivered.',
      'ဓာတ်ပုံတင်၍မရသဖြင့် ပို့ဆောင်ပြီးဟု မမှတ်သားပါ။ ထပ်ကြိုးစားပါ။',
    ),
    photoSavedStatusFailed: tr3(
      language,
      '照片已保存，但状态更新失败，请重试',
      'Photo saved, but status update failed. Please retry.',
      'ဓာတ်ပုံ သိမ်းပြီးသော်လည်း အခြေအနေ မပြောင်းပါ။ ထပ်ကြိုးစားပါ။',
    ),
    deliveredTitle: tr3(language, '送达成功', 'Delivered', 'ပို့ဆောင်ပြီးပါပြီ'),
    savedOfflineTitle: tr3(language, '已保存待同步', 'Saved offline', 'ချိတ်ဆက်မှုပြန်ရလျှင် တင်မည်'),
    proofSubmitted: tr3(language, '配送证明已提交', 'Delivery proof submitted', 'ပို့ဆောင်အထောက်အထား တင်ပြီးပါပြီ'),
    packageDelivered: tr3(language, '包裹已送达', 'Package delivered', 'ပါဆယ် ရောက်ရှိပြီးပါပြီ'),
    deliveryUpdateFailed: tr3(language, '送达更新失败', 'Delivery update failed', 'ပို့ဆောင်မှု မအောင်မြင်ပါ'),
    invalidStoreCode: tr3(language, '收件码无效', 'Invalid store code', 'ဆိုင်လက်ခံကုဒ် မမှန်ကန်ပါ'),
    storeMismatch: tr3(
      language,
      '该店长码与本单绑定门店不一致',
      'This store code does not match this package',
      'ဤဆိုင်ကုဒ်သည် ဤပါဆယ်နှင့် မကိုက်ညီပါ',
    ),
    scanStoreToDeliver: tr3(
      language,
      '请扫描店长收件码（STORE_…）完成送达',
      'Scan store receive code (STORE_…) to deliver',
      'ဆိုင်လက်ခံကုဒ် (STORE_…) ကို စကင်န်ဖတ်ပြီး ပို့ဆောင်မှု ပြီးပါစေ',
    ),
    scanStoreOrPhoto: tr3(
      language,
      '请扫描店长收件码完成送达，或改用拍照送达',
      'Scan store receive code, or use photo delivery',
      'ဆိုင်လက်ခံကုဒ်ကို စကင်န်ဖတ်ပါ သို့မဟုတ် ဓာတ်ပုံဖြင့် ပို့ဆောင်ပါ',
    ),
    cannotScanStatus: (status: string) =>
      tr3(
        language,
        `当前状态「${status}」无法通过扫码操作`,
        `Status ${status} cannot be updated via scan`,
        `ယခု အခြေအနေ (${status}) ကို စကင်န်ဖြင့် မပြောင်းနိုင်ပါ`,
      ),
    scanHandlingFailed: tr3(language, '扫码处理失败', 'Scan handling failed', 'စကင်န်လုပ်ဆောင်မှု မအောင်မြင်ပါ'),
    anomalyReport: tr3(language, '异常上报', 'Anomaly', 'ပုံမှန်မဟုတ် တင်ပြ'),
    anomalyTitle: tr3(language, '异常场景申报', 'Anomaly Report', 'ပုံမှန်မဟုတ်သော အခြေအနေ တင်ပြရန်'),
    anomalyHint: tr3(
      language,
      '请选择类型并填写说明',
      'Choose a type and describe the situation',
      'အမျိုးအစားရွေးပြီး အကြောင်းအရာ ရေးပါ',
    ),
    anomalyPenaltyHint: tr3(
      language,
      '遇到问题请先报备，平台将核实免责。严禁在未送达的情况下直接点击“确认送达”，虚假点击将面临平台重罚！',
      'Report issues first. The platform will verify. Do not mark delivered without actual delivery; false clicks are penalized.',
      'ပြဿနာရှိပါက အရင်တင်ပြပါ။ မရောက်သေးဘဲ 「ပို့ပြီး」 နှိပ်ခြင်းကို တားမြစ်သည်။',
    ),
    anomalyTypeLabel: tr3(language, '选择异常类型', 'Anomaly Type', 'အမျိုးအစား ရွေးပါ'),
    anomalyDescLabel: tr3(language, '详细说明', 'Description', 'အသေးစိတ် ရှင်းလင်းချက်'),
    anomalyPlaceholder: tr3(
      language,
      '请描述具体情况，如：拨打收件人电话3次未接通…',
      'Describe the situation…',
      'အခြေအနေကို ဖော်ပြပါ…',
    ),
    anomalyNeedFields: tr3(
      language,
      '请选择异常类型并填写详细说明',
      'Please choose an anomaly type and description',
      'အမျိုးအစားနှင့် ရှင်းလင်းချက် ဖြည့်ပါ',
    ),
    anomalySubmit: tr3(language, '提交报备', 'Submit Report', 'တင်ပြရန်'),
    anomalySuccessTitle: tr3(language, '提交成功', 'Reported Successfully', 'တင်ပြပြီးပါပြီ'),
    anomalySuccessBody: tr3(
      language,
      '异常已报备，平台将介入处理。感谢您的配合！',
      'Anomaly reported. The platform will intervene. Thank you for your cooperation!',
      'ပုံမှန်မဟုတ်သော အခြေအနေကို တင်ပြပြီးပါပြီ။ ပလက်ဖောင်းမှ ဆက်လက်ကိုင်တွယ်ပါမည်။',
    ),
    anomalySubmitFailed: tr3(language, '提交报备失败，请重试', 'Submit failed. Please retry.', 'တင်ပြမှု မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။'),
    anomalyTypes: [
      {
        value: '联系不上收件人',
        label: tr3(language, '联系不上收件人', 'Cannot reach receiver', 'လက်ခံသူကို ဆက်သွယ်မရပါ'),
      },
      {
        value: '地址错误/无法送达',
        label: tr3(language, '地址错误/无法送达', 'Wrong address / undeliverable', 'လိပ်စာမှား / ပို့မရ'),
      },
      {
        value: '收件人拒绝签收',
        label: tr3(language, '收件人拒绝签收', 'Receiver refused', 'လက်ခံသူ ငြင်းဆန်သည်'),
      },
      {
        value: '包裹损坏',
        label: tr3(language, '包裹损坏', 'Package damaged', 'ပါဆယ် ပျက်စီးနေသည်'),
      },
      {
        value: '其他异常',
        label: tr3(language, '其他异常', 'Other issue', 'အခြားပြဿနာ'),
      },
    ],
    noticeTitle: tr3(language, '提示', 'Notice', 'သတိပေး'),
    cancel: tr3(language, '取消', 'Cancel', 'ပယ်ဖျက်'),
    confirm: tr3(language, '确认', 'Confirm', 'အတည်ပြု'),
    ok: tr3(language, '确定', 'OK', 'ရပါပြီ'),
    done: tr3(language, '完成', 'Done', 'ပြီးပါပြီ'),
    failed: tr3(language, '失败', 'Failed', 'မအောင်မြင်ပါ'),
    errorTitle: tr3(language, '错误', 'Error', 'အမှား'),
    operationFailed: tr3(language, '操作失败', 'Operation failed', 'လုပ်ဆောင်မှု မအောင်မြင်ပါ'),
    gpsRequired: tr3(language, '需要定位', 'Location required', 'တည်နေရာလိုအပ်ပါ'),
    gpsRequiredBody: tr3(
      language,
      '无法获取您的当前位置，请确保 GPS 已开启',
      'Cannot get your location. Please turn on GPS.',
      'တည်နေရာ မရပါ။ GPS ဖွင့်ထားကြောင်း စစ်ပါ။',
    ),
    storeReceiveTitle: tr3(language, '店长收件码', 'Store receive code', 'ဆိုင်လက်ခံကုဒ်'),
    storeReceiveNone: tr3(
      language,
      '没有可送达此店的进行中包裹。请先取件后再扫店长码。',
      'No in-progress packages can be delivered to this store. Pick up first, then scan again.',
      'ဤဆိုင်သို့ ပို့ရန် လုပ်ဆောင်နေသော ပါဆယ် မရှိပါ။ အရင်ယူပြီးမှ ဆိုင်ကုဒ်ကို စကင်န်ဖတ်ပါ။',
    ),
    storeReceiveConfirmOne: (pkgId: string, storeName: string) =>
      tr3(
        language,
        `将包裹 ${pkgId} 送达「${storeName}」？`,
        `Deliver package ${pkgId} to ${storeName}?`,
        `ပါဆယ် ${pkgId} ကို ${storeName} သို့ ပို့မလား။`,
      ),
    storeReceiveConfirmMany: (count: number, storeName: string) =>
      tr3(
        language,
        `有 ${count} 票可送达「${storeName}」。全部送达，还是只送第一票？`,
        `${count} packages can be delivered to ${storeName}. Deliver all, or only the first?`,
        `${storeName} သို့ ပို့နိုင်သော ပါဆယ် ${count} ခုရှိသည်။ အားလုံးပို့မလား၊ ပထမတစ်ခုသာ ပို့မလား။`,
      ),
    storeReceiveDeliverFirst: tr3(language, '只送第一票', 'First only', 'ပထမတစ်ခုသာ'),
    storeReceiveDeliverAll: tr3(language, '全部送达', 'Deliver all', 'အားလုံးပို့မည်'),
    storeReceiveUnmatched: (count: number, storeName: string) =>
      tr3(
        language,
        `未匹配到指定该店的包裹。进行中共 ${count} 票，是否将第一票送达「${storeName}」？`,
        `No package is bound to this store. ${count} in progress. Deliver the first to ${storeName}?`,
        `ဤဆိုင်နှင့် ချိတ်ထားသော ပါဆယ် မရှိပါ။ လုပ်ဆောင်နေသော ${count} ခုရှိသည်။ ပထမတစ်ခုကို ${storeName} သို့ ပို့မလား။`,
      ),
    storeReceiveOpenDetail: tr3(language, '打开详情', 'Open detail', 'အသေးစိတ် ဖွင့်ရန်'),
    viewDetail: tr3(language, '查看详情', 'Open', 'အသေးစိတ် ကြည့်ရန်'),
    deliveredToStore: (storeName: string) =>
      tr3(language, `已送达：${storeName}`, `Delivered: ${storeName}`, `${storeName} သို့ ရောက်ရှိပြီး`),
    deliveredToStoreBody: (storeName: string) =>
      tr3(
        language,
        `包裹已送达至 ${storeName}`,
        `Package delivered to ${storeName}`,
        `ပါဆယ်ကို ${storeName} သို့ ပို့ပြီးပါပြီ`,
      ),
    googleNavTruncatedTitle: tr3(language, '超过 Google 导航站数上限', 'Google Maps stop limit', 'Google Maps မှတ်တိုင် အကန့်အသတ်'),
    googleNavTruncatedBody: (kept: number, left: number) =>
      tr3(
        language,
        `Google Maps 一次最多约 ${kept} 站。将先导航前 ${kept} 站，剩余 ${left} 站请完成后再规划。`,
        `Google Maps can keep about ${kept} stops. Navigate the first ${kept} now; plan the remaining ${left} after that.`,
        `Google Maps တွင် တစ်ကြိမ် ${kept} မှတ်တိုင်အထိသာ။ ရှေ့ ${kept} ခုကို အရင်လမ်းညွှန်မည်။ ကျန် ${left} ခုကို နောက်မှ စီစဉ်ပါ။`,
      ),
    googleNavContinue: tr3(language, '先走前段', 'Navigate first segment', 'ရှေ့ပိုင်းသွားမည်'),
    continueScan: tr3(language, '继续扫码', 'Rescan', 'ဆက်စကင်န်ဖတ်မည်'),
    goDeliver: tr3(language, '去配送', 'Deliver', 'ပို့ဆောင်ရန်'),
    goDeliverOpen: tr3(language, '去配送', 'Open', 'ပို့ဆောင်ရန်'),
    courierNameMissing: tr3(
      language,
      '未识别到骑手姓名，请重新登录后再分配',
      'Courier name missing. Sign in again.',
      'ပို့ဆောင်သူအမည် မတွေ့ပါ။ ပြန်ဝင်ပါ။',
    ),
    courierNameMissingScan: tr3(
      language,
      '未识别到骑手姓名，请重新登录后再扫码',
      'Courier name missing. Sign in again.',
      'ပို့ဆောင်သူအမည် မတွေ့ပါ။ ပြန်ဝင်ပါ။',
    ),
    claimTransferTitle: tr3(language, '确认领取中转包裹', 'Claim transfer package', 'လွှဲပြောင်းပါဆယ် လက်ခံရန်'),
    claimTransferBody: (pkgId: string, statusText: string, code: string, courierName: string) =>
      tr3(
        language,
        `包裹：${pkgId}\n状态：${statusText}\n中转码：${code}\n\n是否分配给：${courierName}？`,
        `Package: ${pkgId}\nStatus: ${statusText}\nAssign to ${courierName}?`,
        `ပါဆယ်: ${pkgId}\nအခြေအနေ: ${statusText}\n${courierName} သို့ ပေးမလား။`,
      ),
    atStation: tr3(language, '已到达中转站', 'At station', 'လွှဲပြောင်းစခန်းသို့ ရောက်ပြီး'),
    assignConfirm: tr3(language, '确认分配', 'Assign', 'ပေးအပ်မည်'),
    assignSuccess: tr3(language, '分配成功', 'Assigned', 'ပေးအပ်ပြီးပါပြီ'),
    assignedBody: (pkgId: string, courierName: string) =>
      tr3(
        language,
        `包裹 ${pkgId} 已分配给 ${courierName}`,
        `Package ${pkgId} assigned to ${courierName}`,
        `ပါဆယ် ${pkgId} ကို ${courierName} သို့ ပေးအပ်ပြီး`,
      ),
    assignFailed: tr3(language, '分配失败，请重试', 'Assign failed', 'ပေးအပ်မှု မအောင်မြင်ပါ။ ထပ်ကြိုးစားပါ။'),
    notReadyTitle: tr3(language, '暂不可取件', 'Not ready', 'ယခုမယူနိုင်သေးပါ'),
    notReadyBody: (pkgId: string, status: string) =>
      tr3(
        language,
        `包裹 ${pkgId} 状态为「${status}」，请等待商家备货完成。`,
        `Package ${pkgId} is still packing. Wait for merchant.`,
        `ပါဆယ် ${pkgId} အခြေအနေ 「${status}」။ ဆိုင်ထုပ်ပိုးပြီးမှ ယူပါ။`,
      ),
    continueDeliveryTitle: tr3(language, '继续配送', 'Continue delivery', 'ပို့ဆောင်မှု ဆက်လုပ်ရန်'),
    continueDeliveryBody: (pkgId: string, status: string) =>
      tr3(
        language,
        `包裹 ${pkgId} 状态：${status}\n请打开详情完成拍照或扫码送达。`,
        `Package ${pkgId} (${status}). Open detail to deliver.`,
        `ပါဆယ် ${pkgId} အခြေအနေ: ${status}\nအသေးစိတ်ဖွင့်ပြီး ဓာတ်ပုံ သို့မဟုတ် စကင်န်ဖြင့် ပို့ပါ။`,
      ),
    alreadyDelivered: (pkgId: string) =>
      tr3(language, `包裹 ${pkgId} 已送达`, `Package ${pkgId} already delivered`, `ပါဆယ် ${pkgId} ပို့ပြီးပါပြီ`),
    cannotActionTitle: tr3(language, '无法在此扫码操作', 'Cannot action here', 'ဤနေရာတွင် စကင်န်လုပ်၍မရပါ'),
    cannotActionBody: (pkgId: string, status: string) =>
      tr3(
        language,
        `包裹 ${pkgId} 状态：${status}\n请打开任务详情处理。`,
        `Package ${pkgId}: ${status}`,
        `ပါဆယ် ${pkgId} အခြေအနေ: ${status}\nအသေးစိတ်ဖွင့်ပြီး ဆက်လုပ်ပါ။`,
      ),
    packageNotFound: tr3(
      language,
      '未找到该包裹，请确认编号或中转码',
      'Package not found. Check ID or transfer code.',
      'ပါဆယ် မတွေ့ပါ။ နံပါတ် သို့မဟုတ် လွှဲကုဒ် စစ်ပါ။',
    ),
    packageNotFoundOffline: tr3(
      language,
      '离线未找到该单。请确认编号，或联网后重试。',
      'Not in offline cache. Check the code, or retry online.',
      'အော့ဖ်လိုင်းတွင် မတွေ့ပါ။ နံပါတ်စစ်ပါ သို့မဟုတ် ကွန်ရက်ပြန်ရမှ ထပ်ကြိုးစားပါ။',
    ),
    offlineCacheHint: tr3(language, '离线查找：来自本地缓存', 'Offline lookup from local cache', 'အော့ဖ်လိုင်း ရှာဖွေမှု: ဒေသတွင်း သိမ်းထားသည်မှ'),
    lookupFailed: tr3(language, '查询包裹失败，请稍后重试', 'Failed to look up package', 'ပါဆယ်ရှာမရပါ။ ခဏနေမှ ထပ်ကြိုးစားပါ။'),
    networkUnreachable: tr3(
      language,
      '无法连接服务器，请检查网络',
      'Cannot reach server. Check network.',
      'ဆာဗာချိတ်မရပါ။ ကွန်ရက် စစ်ပါ။',
    ),
    enterPackageId: tr3(language, '请输入包裹编号', 'Please enter a package ID', 'ပါဆယ်နံပါတ် ထည့်ပါ'),
    merchantPacking: tr3(language, '商家备货中', 'Merchant packing', 'ဆိုင် ထုပ်ပိုးနေသည်'),
    awaitingMerchant: tr3(language, '待商家确认', 'Awaiting merchant', 'ဆိုင် အတည်ပြုရန် စောင့်နေသည်'),
    statusLabel: (status: string) => {
      const row = STATUS_LABELS[status];
      return row ? tr3(language, row[0], row[1], row[2]) : status;
    },
  };
}
