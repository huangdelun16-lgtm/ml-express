export type PackingLang = 'zh' | 'en' | 'my';

export type PackingProfileId =
  | 'food_safety'
  | 'drinks_seal'
  | 'bakery_box'
  | 'flower_wrap'
  | 'apparel_bag'
  | 'grocery_sort'
  | 'parcel_standard';

export type LocalizedText = Record<PackingLang, string>;

export interface PackingVisualPanel {
  title: LocalizedText;
  caption: LocalizedText;
}

export interface PackingProfile {
  id: PackingProfileId;
  storeTypes: string[];
  title: LocalizedText;
  hint: LocalizedText;
  lead: LocalizedText;
  steps: LocalizedText[];
  caution: LocalizedText;
  visualRider?: LocalizedText;
  visualPanels?: PackingVisualPanel[];
}

export const PACKING_ACK_PREFIX = '[平台打包]';

const STORE_TYPE_TO_PROFILE: Record<string, PackingProfileId> = {
  restaurant: 'food_safety',
  breakfast: 'food_safety',
  drinks_snacks: 'drinks_seal',
  tea_shop: 'drinks_seal',
  cake_shop: 'bakery_box',
  flower_shop: 'flower_wrap',
  clothing_store: 'apparel_bag',
  grocery: 'grocery_sort',
  supermarket: 'grocery_sort',
  other: 'parcel_standard',
};

export const PACKING_PROFILES: Record<PackingProfileId, PackingProfile> = {
  food_safety: {
    id: 'food_safety',
    storeTypes: ['restaurant', 'breakfast'],
    title: { zh: '食品安全包装', en: 'Food-safe packing', my: 'အစားအသောက် ဘေးကင်းထုပ်ပိုး' },
    hint: {
      zh: '防漏封口 · 热汤分装 · 忌口外贴',
      en: 'Leak-proof seal · soups separate · allergy tag outside',
      my: 'ယိုမရအောင် ပိတ် · ဟင်းရည်ခွဲထုပ် · မစားရ အပြင်ကပ်',
    },
    lead: {
      zh: '热食必须按这个样式封好再交给骑手。骑手只取已封袋，途中不再开箱。',
      en: 'Hot food must be sealed in this style before handover. Riders take sealed bags only and do not reopen them.',
      my: 'ပူသောအစားအစာကို ဤပုံစံအတိုင်း ထုပ်ပိုးပိတ်ပြီးမှ ပို့သူထံ ပေးပါ။ ပို့သူက ပိတ်ပြီးသားအိတ်ကိုသာ ယူမည်၊ လမ်းမှာ ပြန်မဖွင့်ပါ။',
    },
    visualRider: {
      zh: '骑手只收已封好的袋子，路上不再打开',
      en: 'Riders collect sealed bags only and do not reopen them on the way',
      my: 'ပို့သူက ပိတ်ပြီးသားအိတ်ကိုသာ ယူမည်။ လမ်းမှာ ပြန်မဖွင့်ပါ',
    },
    visualPanels: [
      {
        title: { zh: '盖紧内盒', en: 'Seal inner boxes', my: 'အတွင်းဘူး အဖုံးပိတ်' },
        caption: { zh: '汤、饭分开，盖子扣死', en: 'Soup and rice apart, lids locked', my: 'ဟင်းရည်နဲ့ ထမင်းခွဲ၊ အဖုံးခိုင်အောင် ပိတ်' },
      },
      {
        title: { zh: '二次封口', en: 'Seal the outer bag', my: 'အပြင်အိတ် ထပ်ပိတ်' },
        caption: { zh: '外袋封好，直立摆放', en: 'Seal the bag, keep upright', my: 'အိတ်ပါးစပ်ပိတ်ပြီး မတ်မတ်ထား' },
      },
      {
        title: { zh: '热冷分袋', en: 'Separate hot and cold', my: 'ပူ / အေး အိတ်ခွဲ' },
        caption: { zh: '餐具纸巾放外袋', en: 'Utensils and napkins in the pocket', my: 'ဇွန်း၊ ချောင်းတူ၊ တစ်ရှူးကို အပြင်အိတ်ထည့်' },
      },
      {
        title: { zh: '外贴标签', en: 'Label the outside', my: 'အပြင်ကပ်လက်မှတ်' },
        caption: { zh: '店名电话 · 热 / 会漏', en: 'Shop name · Hot / May leak', my: 'ဆိုင်နာမည်၊ ဖုန်း · ပူ / ယိုနိုင်' },
      },
    ],
    steps: [
      {
        zh: '餐盒盖紧扣实，汤汁单独加盖，不要让汤泡到主食。',
        en: 'Snap the meal-box lid shut. Pack soup in its own lidded cup so it never soaks the rice.',
        my: 'ထမင်းဘူးအဖုံးကို တင်းတင်းပိတ်ပါ။ ဟင်းရည်ကို သီးသန့်အဖုံးပါခွက်ထဲထည့်ပြီး ထမင်းမစိုစေရ။',
      },
      {
        zh: '再装入防漏外袋，袋口二次封贴，直立摆放。',
        en: 'Place the box in a leak-proof outer bag, tape the mouth a second time, and keep it upright.',
        my: 'ဘူးကို ယိုမရသော အပြင်အိတ်ထဲထည့်ပါ။ ပါးစပ်ကို တိပ်နဲ့ ထပ်ပိတ်ပြီး မတ်မတ်ထားပါ။',
      },
      {
        zh: '热食与冷食分袋。筷子、叉子、纸巾放在外袋，不要塞进未封的餐盒。',
        en: 'Keep hot and cold items in separate bags. Put chopsticks, forks and napkins in the outer bag, not inside an open box.',
        my: 'ပူတာနဲ့ အေးတာကို အိတ်ခွဲပါ။ ဇွန်း၊ ချောင်းတူ၊ တစ်ရှူးကို အပြင်အိတ်ထဲထည့်ပါ။ မပိတ်သေးသောဘူးထဲ မထည့်ရ။',
      },
      {
        zh: '袋外贴店名、忌口和「热食 / 易洒」。顾客打开第一眼要能看见。',
        en: 'Stick shop name, allergy notes and a Hot / Spill-care tag on the outside. The customer must see them at first open.',
        my: 'ဆိုင်နာမည်၊ မစားရသောအရာနဲ့ «ပူ / ယိုနိုင်» ကို အပြင်ကပ်ပါ။ ဖောက်သည် ဖွင့်တာနဲ့ မြင်ရမည်။',
      },
    ],
    caution: {
      zh: '不要用开口塑料袋或未盖的碗直接交给骑手。',
      en: 'Do not hand riders an open plastic bag or an uncovered bowl.',
      my: 'အဖုံးမပိတ်သော ပလတ်စတစ်အိတ် သို့မဟုတ် ပန်းကန်ကို ပို့သူထံ တိုက်ရိုက် မပေးရ။',
    },
  },
  drinks_seal: {
    id: 'drinks_seal',
    storeTypes: ['drinks_snacks', 'tea_shop'],
    title: { zh: '饮品防漏包装', en: 'Sealed drink packing', my: 'အဖျော်ယမကာ ယိုမရအောင် ထုပ်ပိုး' },
    hint: {
      zh: '杯盖扣紧 · 杯套 · 吸管另封',
      en: 'Lid locked · sleeve on · straw sealed separately',
      my: 'အဖုံးခိုင်အောင် · ခွက်စွပ် · သောက်ပြွန် သီးသန့်ပိတ်',
    },
    lead: {
      zh: '饮料在路上最容易洒。杯盖、杯套和吸管必须按这个样式封好。',
      en: 'Drinks spill first on the road. Lid, sleeve and straw must follow this seal style.',
      my: 'အဖျော်ယမကာ လမ်းမှာ အလွယ်ဆုံး ယိုတတ်သည်။ အဖုံး၊ ခွက်စွပ်နဲ့ သောက်ပြွန်ကို ဤပုံစံအတိုင်း ပိတ်ပါ။',
    },
    visualRider: {
      zh: '骑手只收已封好的杯子，路上不再开盖',
      en: 'Riders collect sealed cups only and do not open the lids on the way',
      my: 'ပို့သူက ပိတ်ပြီးသားခွက်ကိုသာ ယူမည်။ လမ်းမှာ အဖုံးမဖွင့်ပါ',
    },
    visualPanels: [
      {
        title: { zh: '扣紧杯盖', en: 'Lock the lid', my: 'အဖုံးခိုင်အောင် ပိတ်' },
        caption: { zh: '听到扣声，再贴封口膜', en: 'Click, then seal the rim', my: 'ကလစ်မြည်အောင် ဖိ၊ နှုတ်ခမ်းထပ်ပိတ်' },
      },
      {
        title: { zh: '套上杯套', en: 'Add a sleeve', my: 'ခွက်စွပ်တပ်' },
        caption: { zh: '热饮再加隔热袋', en: 'Insulate hot drinks', my: 'ပူသောအဖျော်ကို အပူကာအိတ်ထည့်' },
      },
      {
        title: { zh: '吸管另封', en: 'Straw in a pouch', my: 'သောက်ပြွန် သီးသန့်' },
        caption: { zh: '不要提前插进杯盖', en: 'Do not pre-insert the straw', my: 'ကြိုတင် မစိုက်ရ' },
      },
      {
        title: { zh: '杯托装袋', en: 'Carrier, then bag', my: 'ခွက်ဗန်းနဲ့ အိတ်' },
        caption: { zh: '两杯以上一次端稳', en: 'Two or more, hold steady', my: 'နှစ်ခွက်နဲ့အထက် တည်ငြိမ်ကိုင်' },
      },
    ],
    steps: [
      {
        zh: '杯盖听到扣紧声，杯口再贴一层封口膜或胶带。',
        en: 'Press the lid until it clicks, then add a seal film or tape over the rim.',
        my: 'အဖုံးကလစ်မြည်သည်အထိ ဖိပါ။ ခွက်နှုတ်ခမ်းပေါ် တံဆိပ်ဖလင် သို့မဟုတ် တိပ် ထပ်ကပ်ပါ။',
      },
      {
        zh: '套上杯套，热饮再加一层隔热袋，避免烫手和胀盖。',
        en: 'Add a sleeve. For hot drinks, add an insulated bag so the lid does not pop from heat.',
        my: 'ခွက်စွပ်တပ်ပါ။ ပူသောအဖျော်ကို အပူကာအိတ်ထပ်ထည့်ပြီး အဖုံးမပေါက်စေရ။',
      },
      {
        zh: '吸管、糖包单独装小袋并贴在杯身外侧，不要提前插进杯盖。',
        en: 'Pack straw and sugar in a small pouch taped to the cup. Do not pre-insert the straw.',
        my: 'သောက်ပြွန်နဲ့ သကြားကို အိတ်ငယ်ထဲထည့်ပြီး ခွက်ဘေးကပ်ပါ။ ကြိုတင် မစိုက်ရ။',
      },
      {
        zh: '两杯以上用杯托，整组再装袋，骑手一次能端稳。',
        en: 'Use a cup carrier for two or more drinks, then bag the whole set so the rider can hold it steady.',
        my: 'နှစ်ခွက်နဲ့အထက်ဆို ခွက်ဗန်းသုံးပြီး တစ်စုံလုံးအိတ်ထည့်ပါ။ ပို့သူ တစ်ခါတည်း တည်တည်ငြိမ်ငြိမ် ကိုင်နိုင်ရမည်။',
      },
    ],
    caution: {
      zh: '不要只盖松盖、不封口就把饮料交给骑手。',
      en: 'Do not hand over a drink with a loose lid and no seal.',
      my: 'လျော့နေသောအဖုံး၊ မပိတ်ရသေးသောခွက်ကို ပို့သူထံ မပေးရ။',
    },
  },
  bakery_box: {
    id: 'bakery_box',
    storeTypes: ['cake_shop'],
    title: { zh: '蛋糕直立包装', en: 'Upright cake packing', my: 'ကိတ် မတ်မတ်ထုပ်ပိုး' },
    hint: {
      zh: '硬盒 · 底部固定 · 不可倒置',
      en: 'Rigid box · base locked · this side up',
      my: 'မာသောဘူး · အောက်ခံပိတ် · မှောက်မထားရ',
    },
    lead: {
      zh: '蛋糕怕压、怕倒。必须用硬盒固定，并让骑手一眼看到「向上」。',
      en: 'Cakes crush and tip easily. Use a rigid box and make the This-side-up mark obvious.',
      my: 'ကိတ်က ဖိလွယ်၊ လဲလွယ်သည်။ မာသောဘူးနဲ့ တပ်ပြီး «အပေါ်» ဆိုတာ ပို့သူ တစ်ချက်မြင်ရအောင် လုပ်ပါ။',
    },
    visualRider: {
      zh: '蛋糕必须直立交接，骑手途中不得倒置',
      en: 'Hand cakes over upright. Riders must not turn them upside down',
      my: 'ကိတ်ကို မတ်မတ်ပေးပါ။ ပို့သူ လမ်းမှာ မှောက်မထားရ',
    },
    visualPanels: [
      {
        title: { zh: '硬盒固定', en: 'Lock in a rigid box', my: 'မာသောဘူးနှင့် တပ်' },
        caption: { zh: '底部卡住，盒盖扣严', en: 'Base locked, lid shut', my: 'အောက်ခံဖိ၊ အဖုံးပိတ်' },
      },
      {
        title: { zh: '外层捆扎', en: 'Outer wrap', my: 'အပြင်ထပ်ပတ်' },
        caption: { zh: '套袋或绑带防松', en: 'Bag or ribbon so the lid stays', my: 'အိတ် သို့ ကြိုးထပ်' },
      },
      {
        title: { zh: '向上勿压', en: 'This side up', my: 'အပေါ် · မဖိရ' },
        caption: { zh: '四面箭头，冷藏隔水', en: 'Arrows on all sides, ice sealed', my: 'လေးဘက်မြား၊ အအေးရေကာ' },
      },
      {
        title: { zh: '配件分袋', en: 'Extras separate', my: 'ပစ္စည်းခွဲထုပ်' },
        caption: { zh: '字牌蜡烛不放盒盖', en: 'Plaques and candles in a pouch', my: 'စာပြား၊ ဖယောင်းတိုင် သီးသန့်' },
      },
    ],
    steps: [
      {
        zh: '蛋糕放进硬盒，底部用垫片或固定座卡住，盒盖扣严。',
        en: 'Set the cake in a rigid box with a base board or collar so it cannot slide. Close the lid fully.',
        my: 'ကိတ်ကို မာသောဘူးထဲထည့်ပြီး အောက်ခံပြားနဲ့ မရွေ့အောင် ဖိထားပါ။ အဖုံးကို ခိုင်အောင် ပိတ်ပါ။',
      },
      {
        zh: '外层再套袋或绑带，避免盒盖中途松开。',
        en: 'Add an outer bag or ribbon so the lid cannot pop open in transit.',
        my: 'အပြင်အိတ် သို့ ကြိုးထပ်ပတ်ပြီး လမ်းတွင် အဖုံးမပွင့်စေရ။',
      },
      {
        zh: '盒外四面贴「向上 / 勿压」箭头，冷藏蛋糕加冰袋并隔水。',
        en: 'Mark This side up / Do not stack on all sides. Chilled cakes need an ice pack with a water barrier.',
        my: 'ဘူးအပြင်လေးဘက်တွင် «အပေါ် / မဖိရ» မြားကပ်ပါ။ အအေးကိတ်ကို ရေခဲအိတ်နှင့် ရေကာထည့်ပါ။',
      },
      {
        zh: '奶油字牌、蜡烛单独小袋，不要散放在盒盖上。',
        en: 'Pack cream plaques and candles in a separate pouch. Do not leave them loose on the lid.',
        my: 'ခရင်မ်စာနှင့် ဖယောင်းတိုင်ကို သီးသန့်အိတ်ထည့်ပါ။ အဖုံးပေါ် လွှတ်မထားရ။',
      },
    ],
    caution: {
      zh: '不要用软袋直接装蛋糕，也不要和其他重物叠放。',
      en: 'Do not pack a cake in a soft bag, and do not stack heavy items on it.',
      my: 'ကိတ်ကို ပျော့အိတ်နှင့် မထုပ်ရ။ အပေါ်တွင် လေးသောပစ္စည်း မတင်ရ။',
    },
  },
  flower_wrap: {
    id: 'flower_wrap',
    storeTypes: ['flower_shop'],
    title: { zh: '鲜花保水包装', en: 'Hydrated flower wrap', my: 'ပန်း ရေထိန်းထုပ်ပိုး' },
    hint: {
      zh: '花茎保水 · 直立 · 防压',
      en: 'Stems watered · upright · crush-safe',
      my: 'ပင်စည်ရေထိန်း · မတ်မတ် · မနယ်ရ',
    },
    lead: {
      zh: '花要在路上保持水和形状。包装必须让花束直立、花头不被压。',
      en: 'Flowers need water and shape on the road. Keep the bouquet upright and the heads uncrushed.',
      my: 'ပန်းသည် လမ်းတွင် ရေနှင့် ပုံသဏ္ဌာန် လိုသည်။ ပန်းစည်းကို မတ်မတ်ထားပြီး ပန်းခေါင်း မနယ်ရ။',
    },
    visualRider: {
      zh: '花束必须直立交接，途中不得平放',
      en: 'Hand bouquets over upright. Do not lay them flat on the way',
      my: 'ပန်းစည်းကို မတ်မတ်ပေးပါ။ လမ်းမှာ လှဲမထားရ',
    },
    visualPanels: [
      {
        title: { zh: '花茎保水', en: 'Water the stems', my: 'ပင်စည်ရေထိန်း' },
        caption: { zh: '保水管加防漏膜', en: 'Tube plus leak wrap', my: 'ရေပြွန်နဲ့ ယိုကာ' },
      },
      {
        title: { zh: '由下往上包', en: 'Wrap from the base', my: 'အောက်မှအပေါ် ပတ်' },
        caption: { zh: '花头露出不贴壁', en: 'Heads visible, off the wall', my: 'ပန်းခေါင်းပေါ်မြင်ရ' },
      },
      {
        title: { zh: '直立防压', en: 'Upright, crush-safe', my: 'မတ်မတ် · မနယ်ရ' },
        caption: { zh: '硬纸筒交给骑手', en: 'Stiff sleeve, hand upright', my: 'မာသောပြွန်နဲ့ မတ်မတ်ပေး' },
      },
      {
        title: { zh: '贺卡分袋', en: 'Cards separate', my: 'ကတ်ခွဲထုပ်' },
        caption: { zh: '不要压在花头上', en: 'Never rest them on the blooms', my: 'ပန်းခေါင်းပေါ် မတင်ရ' },
      },
    ],
    steps: [
      {
        zh: '花茎根部套保水管或湿棉，再包一层防漏膜。',
        en: 'Cover stem ends with a water tube or wet cotton, then wrap a leak barrier.',
        my: 'ပင်စည်အရင်းကို ရေပြွန် သို့ စိုဝါဂွမ်းစွပ်ပြီး ယိုမရအောင် ဖလင်ထပ်ပတ်ပါ။',
      },
      {
        zh: '牛皮纸或花袋由下往上包，花头露出但不贴袋壁。',
        en: 'Wrap kraft or a flower sleeve from the base up. Heads stay visible and off the bag wall.',
        my: 'ကြမ်းစက္ကူ သို့ ပန်းအိတ်ကို အောက်မှအပေါ် ပတ်ပါ။ ပန်းခေါင်းပေါ်မြင်ရပြီး အိတ်နံရံနှင့် မကပ်ရ။',
      },
      {
        zh: '外层加硬纸筒或护角，整束直立交给骑手。',
        en: 'Add a stiff sleeve or corner guards and hand the bouquet to the rider upright.',
        my: 'မာသောစက္ကူပြွန် သို့ ထောင့်ကာထည့်ပြီး ပန်းစည်းကို မတ်မတ်ပေးပါ။',
      },
      {
        zh: '贺卡、花泥、小礼盒分袋，不要压在花头上。',
        en: 'Pack cards, floral foam and gift boxes separately. Never rest them on the blooms.',
        my: 'ကတ်၊ ပန်းမြေနှင့် လက်ဆောင်ဘူးကို အိတ်ခွဲပါ။ ပန်းခေါင်းပေါ် မတင်ရ။',
      },
    ],
    caution: {
      zh: '不要平放花束，也不要用完全密封的闷袋长时间捂花。',
      en: 'Do not lay the bouquet flat, and do not trap flowers in a fully sealed bag for long.',
      my: 'ပန်းစည်းကို လှဲမထားရ။ လေလုံအိတ်ထဲ ကြာကြာ မအုပ်ရ။',
    },
  },
  apparel_bag: {
    id: 'apparel_bag',
    storeTypes: ['clothing_store'],
    title: { zh: '服装平整包装', en: 'Folded apparel packing', my: 'အဝတ် ခေါက်၍ ထုပ်ပိုး' },
    hint: {
      zh: '折叠入袋 · 封口 · 尺码外标',
      en: 'Folded in bag · sealed · size on the outside',
      my: 'ခေါက်အိတ်ထည့် · ပိတ် · အရွယ်အစား အပြင်ရေး',
    },
    lead: {
      zh: '衣服要防皱、防潮、可核对。包装必须让顾客拆开就能穿、能退换核对。',
      en: 'Clothes must stay neat, dry and easy to check. The customer should be able to wear or exchange after one open.',
      my: 'အဝတ် မတွန့်ရ၊ မစိုရ၊ စစ်ဆေးရလွယ်ရမည်။ ဖောက်သည် တစ်ခါဖွင့်ပြီး ဝတ်နိုင်၊ လဲလှယ် စစ်နိုင်ရမည်။',
    },
    visualRider: {
      zh: '衣服必须封袋后再交给骑手',
      en: 'Seal garments in a bag before handover',
      my: 'အဝတ်ကို အိတ်ပိတ်ပြီးမှ ပို့သူထံ ပေးပါ',
    },
    visualPanels: [
      {
        title: { zh: '叠平整', en: 'Fold flat', my: 'ပြားပြားခေါက်' },
        caption: { zh: '深浅与扣饰分开', en: 'Dark, light and hardware apart', my: 'အနက် / အဖြူ ခွဲ' },
      },
      {
        title: { zh: '封口入袋', en: 'Seal in a bag', my: 'အိတ်ထည့်ပိတ်' },
        caption: { zh: '不透明袋完全封贴', en: 'Opaque bag, fully sealed', my: 'အလင်းမဖောက်အိတ် အပြည့်ပိတ်' },
      },
      {
        title: { zh: '尺码外标', en: 'Size on the outside', my: 'အရွယ်အစား အပြင်ရေး' },
        caption: { zh: '颜色件数当面可核', en: 'Color and count visible', my: 'အရောင်၊ အရေအတွက် ပေါ်လွင်' },
      },
      {
        title: { zh: '挂钩包好', en: 'Wrap the hook', my: 'ချိတ်ကို ထုပ်' },
        caption: { zh: '仅在顾客要求时用衣架', en: 'Hanger only if asked', my: 'တောင်းမှသာ သံစင်' },
      },
    ],
    steps: [
      {
        zh: '叠平整，深色与浅色、带扣饰品分开放，避免勾丝。',
        en: 'Fold flat. Keep dark and light pieces, and anything with hardware, apart so nothing snags.',
        my: 'ပြားပြားခေါက်ပါ။ အနက်/အဖြူနဲ့ ခလုတ်ရှိပစ္စည်းကို ခွဲထားပြီး ချည်မစုတ်စေရ။',
      },
      {
        zh: '装入不透明服装袋或快递袋，袋口完全封贴。',
        en: 'Use an opaque garment or courier bag and seal the mouth completely.',
        my: 'အလင်းမဖောက်သော အဝတ်အိတ် သို့ ပို့ဆောင်အိတ်ထည့်ပြီး ပါးစပ်ကို အပြည့်ပိတ်ပါ။',
      },
      {
        zh: '外袋写清尺码、颜色和件数，方便顾客当面核对。',
        en: 'Write size, color and piece count on the outside so the customer can check on the spot.',
        my: 'အပြင်တွင် အရွယ်အစား၊ အရောင်နှင့် အရေအတွက် ရေးပါ။ ဖောက်သည် နေရာတွင် စစ်နိုင်ရမည်။',
      },
      {
        zh: '衣架只在顾客明确要求时使用，并包好挂钩，避免扎袋。',
        en: 'Use a hanger only if the customer asked. Wrap the hook so it cannot puncture the bag.',
        my: 'ဖောက်သည် တောင်းမှသာ သံစင်သုံးပါ။ ချိတ်ကို ထုပ်ပြီး အိတ်မထိုးစေရ။',
      },
    ],
    caution: {
      zh: '不要把未封口的衣服直接搭在骑手车上。',
      en: 'Do not drape unsealed garments over the rider’s bike.',
      my: 'မပိတ်ရသေးသောအဝတ်ကို ပို့သူဆိုင်ကယ်ပေါ် တိုက်ရိုက် မတင်ရ။',
    },
  },
  grocery_sort: {
    id: 'grocery_sort',
    storeTypes: ['grocery', 'supermarket'],
    title: { zh: '百货分装包装', en: 'Sorted grocery packing', my: 'ကုန်စုံ ခွဲထုပ်ပိုး' },
    hint: {
      zh: '干湿分开 · 易碎加垫 · 冷冻隔水',
      en: 'Dry / wet split · pad fragile · ice sealed',
      my: 'ခြောက်/စိုခွဲ · ကွဲလွယ်ကူအောင် · ရေခဲရေကာ',
    },
    lead: {
      zh: '一单里常有干货、生鲜和易碎品。必须分袋，避免串味和压坏。',
      en: 'One order often mixes dry goods, fresh food and breakables. Split bags so nothing leaks, smells or crushes.',
      my: 'တစ်အော်ဒါထဲ ခြောက်ကုန်၊ လတ်ဆတ်နှင့် ကွဲလွယ်သောပစ္စည်း ရောတတ်သည်။ အိတ်ခွဲပြီး အနံ့မရော၊ မပျက်စေရ။',
    },
    visualRider: {
      zh: '干货、生鲜必须分袋，骑手途中不再重装',
      en: 'Split dry goods and fresh food. Riders will not repack on the way',
      my: 'ခြောက်ကုန်နဲ့ လတ်ဆတ်ကို အိတ်ခွဲပါ။ ပို့သူ လမ်းမှာ ပြန်မထုပ်ပါ',
    },
    visualPanels: [
      {
        title: { zh: '干湿分开', en: 'Split dry and wet', my: 'ခြောက် / စို ခွဲ' },
        caption: { zh: '生熟冷藏冷冻分袋', en: 'Raw, cooked, chilled, frozen apart', my: 'စိမ်း၊ ချက်၊ အအေး ခွဲအိတ်' },
      },
      {
        title: { zh: '易碎加垫', en: 'Pad breakables', my: 'ကွဲလွယ်ကူအောင်' },
        caption: { zh: '瓶罐放袋底两侧', en: 'Bottles at the sides', my: 'ပုလင်းကို နံဘေးထား' },
      },
      {
        title: { zh: '冷冻隔水', en: 'Ice, keep dry', my: 'အေးခဲ ရေကာ' },
        caption: { zh: '外袋标明冷冻易化', en: 'Mark Frozen / Melts', my: 'အေးခဲ / အရည်ပျော်နိုင်' },
      },
      {
        title: { zh: '多袋成组', en: 'Bundle the bags', my: 'အိတ်စု' },
        caption: { zh: '写清袋数一次提走', en: 'Write bag count', my: 'အိတ်ရေ ရေး၊ တစ်ခါယူ' },
      },
    ],
    steps: [
      {
        zh: '干货、冷藏、冷冻、生鲜分袋，生熟分开。',
        en: 'Split dry, chilled, frozen and fresh into different bags. Keep raw and cooked apart.',
        my: 'ခြောက်၊ အအေး၊ အေးခဲ၊ လတ်ဆတ်ကို အိတ်ခွဲပါ။ စိမ်း/ချက်ပြီး မရောရ။',
      },
      {
        zh: '瓶罐和玻璃加气泡或纸垫，放在袋底两侧，不要压在面包或蛋上。',
        en: 'Pad bottles and glass. Stand them at the bag sides, never on bread or eggs.',
        my: 'ပုလင်းနှင့် ဖန်ကို စက္ကူ/ပလပ်စတစ်ဖျာထည့်ပါ။ အိတ်အောက်နံဘေးထားပြီး ပေါင်မုန့် သို့ ဥပေါ် မတင်ရ။',
      },
      {
        zh: '冷冻品加冰袋并隔水，外袋再写「冷冻 / 易化」。',
        en: 'Add an ice pack with a water barrier for frozen goods, and mark Frozen / Melts on the bag.',
        my: 'အေးခဲပစ္စည်းကို ရေခဲအိတ်နှင့် ရေကာထည့်ပြီး အပြင်တွင် «အေးခဲ / အရည်ပျော်နိုင်» ရေးပါ။',
      },
      {
        zh: '多袋时用总袋或提手捆成一组，并写清袋数。',
        en: 'Bundle multiple bags with a master bag or handles and write the bag count.',
        my: 'အိတ်များလျှင် ပင်မအိတ် သို့ လက်ကိုင်နှင့် စုပြီး အိတ်ရေ ရေးပါ။',
      },
    ],
    caution: {
      zh: '不要把生肉和即食食品装在同一个未隔开的袋里。',
      en: 'Do not put raw meat and ready-to-eat food in the same unseparated bag.',
      my: 'စိမ်းသားနှင့် အသင့်စားကို မခွဲသောအိတ်တစ်ခုထဲ မထည့်ရ။',
    },
  },
  parcel_standard: {
    id: 'parcel_standard',
    storeTypes: ['other'],
    title: { zh: '标准包裹包装', en: 'Standard parcel packing', my: 'ပုံမှန်ပါဆယ် ထုပ်ပိုး' },
    hint: {
      zh: '内垫 · 十字封箱 · 外标完整',
      en: 'Inner pad · H-tape · full outer label',
      my: 'အတွင်းခံ · အပေါ်အောက် တိပ် · အပြင်တံဆိပ်ပြည့်',
    },
    lead: {
      zh: '网购件要按快递件包装：内有缓冲，外有封箱，单号和店铺信息清楚。',
      en: 'Online-shop orders pack like courier parcels: padding inside, sealed carton outside, shop and order marks clear.',
      my: 'အွန်လိုင်းပစ္စည်းကို ပါဆယ်လို ထုပ်ပါ။ အတွင်းခံရှိ၊ အပြင်ပိတ်၊ ဆိုင်နှင့် အော်ဒါအချက်အလက် ပေါ်လွင်ရမည်။',
    },
    steps: [
      {
        zh: '商品先装内袋或纸盒，空隙用纸或泡沫填满，避免晃动。',
        en: 'Bag or box the item first, then fill empty space so it cannot rattle.',
        my: 'ပစ္စည်းကို အတွင်းအိတ် သို့ စက္ကူဘူးထည့်ပြီး ကွက်လပ်ကို ဖြည့်ပါ။ မလှုပ်ရ။',
      },
      {
        zh: '外箱用胶带按工字封箱，底面和顶面都要封。',
        en: 'Seal the carton with H-tape on both the top and the bottom.',
        my: 'အပြင်သေတ္တာကို အပေါ်အောက် နှစ်ဖက်လုံး တိပ်နဲ့ ပိတ်ပါ။',
      },
      {
        zh: '外箱写清店铺名、件数和「易碎」等必要标记。',
        en: 'Write shop name, piece count and Fragile or similar marks on the outside.',
        my: 'အပြင်တွင် ဆိုင်အမည်၊ အရေအတွက်နှင့် «ကွဲလွယ်» စသည့် အမှတ်အသား ရေးပါ။',
      },
      {
        zh: '发票或售后卡放在外袋透明口，方便顾客核验。',
        en: 'Put the invoice or after-sales card in an outer window pouch so the customer can check it.',
        my: 'ငွေတောင်းခံလွှာ သို့ ရောင်းချပြီးကတ်ကို အပြင်အိတ်ပွင့်လင်းနေရာတွင် ထည့်ပါ။',
      },
    ],
    caution: {
      zh: '不要用开口纸袋或仅用绳子捆扎作为唯一包装。',
      en: 'Do not use an open paper bag or string-only wrap as the only packing.',
      my: 'ဖွင့်ထားသော စက္ကူအိတ် သို့ ကြိုးသက်သက်ကို တစ်ခုတည်းသော ထုပ်ပိုးအဖြစ် မသုံးရ။',
    },
  },
};

export function packingProfileIdForStoreType(storeType: string): PackingProfileId {
  return STORE_TYPE_TO_PROFILE[String(storeType || '').trim()] || 'parcel_standard';
}

export function getPackingProfile(storeType: string): PackingProfile {
  return PACKING_PROFILES[packingProfileIdForStoreType(storeType)];
}

export function isValidPackingAck(
  storeType: string,
  packingProfile: string,
  acknowledged: boolean,
): boolean {
  return acknowledged === true && packingProfile === packingProfileIdForStoreType(storeType);
}

export function packingAckLine(profile: PackingProfile): string {
  return `${PACKING_ACK_PREFIX} 已确认：${profile.title.zh}`;
}

export function appendPackingAckToNotes(notes: string, profile: PackingProfile): string {
  const cleaned = String(notes || '')
    .replace(new RegExp(`${escapeRegExp(PACKING_ACK_PREFIX)}[^\\n]*`, 'g'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  const line = packingAckLine(profile);
  return cleaned ? `${cleaned}\n${line}` : line;
}

export function parsePackingAckFromNotes(notes: string | null | undefined): string | null {
  const match = String(notes || '').match(/\[平台打包\]\s*已确认：(.+)/);
  const label = match?.[1]?.trim();
  return label || null;
}

export function notesWithoutPackingAck(notes: string | null | undefined): string {
  return String(notes || '')
    .replace(new RegExp(`${escapeRegExp(PACKING_ACK_PREFIX)}[^\\n]*`, 'g'), '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
