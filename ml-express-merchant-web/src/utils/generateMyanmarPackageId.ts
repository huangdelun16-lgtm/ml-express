/** 根据寄件地址与缅甸时区生成包裹/订单号（与客户端 Web、商家 App 一致） */
export function generateMyanmarPackageId(senderAddress?: string): string {
  const now = new Date();

  const myanmarTimeParts = {
    year: now.toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      year: "numeric",
    }),
    month: now.toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      month: "2-digit",
    }),
    day: now.toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      day: "2-digit",
    }),
    hour: now.toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      hour: "2-digit",
      hour12: false,
    }),
    minute: now.toLocaleString("en-US", {
      timeZone: "Asia/Yangon",
      minute: "2-digit",
    }),
  };

  const year = myanmarTimeParts.year;
  const month = myanmarTimeParts.month.padStart(2, "0");
  const day = myanmarTimeParts.day.padStart(2, "0");
  const hour = myanmarTimeParts.hour.padStart(2, "0");
  const minute = myanmarTimeParts.minute.padStart(2, "0");
  const random1 = Math.floor(Math.random() * 10);
  const random2 = Math.floor(Math.random() * 10);

  const cityPrefixMap: Record<string, string> = {
    彬乌伦: "POL",
    "Pyin Oo Lwin": "POL",
    ပင်းတလဲ: "POL",
    内比都: "NPW",
    Naypyidaw: "NPW",
    နေပြည်တော်: "NPW",
    东枝: "TGI",
    Taunggyi: "TGI",
    တောင်ကြီး: "TGI",
    腊戌: "LSO",
    Lashio: "LSO",
    လားရှိုး: "LSO",
    木姐: "MSE",
    Muse: "MSE",
    မူဆယ်: "MSE",
    仰光: "YGN",
    Yangon: "YGN",
    ရန်ကုန်: "YGN",
    曼德勒: "MDY",
    Mandalay: "MDY",
    မန္တလေး: "MDY",
  };

  let prefix = "MDY";
  if (senderAddress) {
    for (const [city, cityPrefix] of Object.entries(cityPrefixMap)) {
      if (senderAddress.includes(city)) {
        prefix = cityPrefix;
        break;
      }
    }
  }

  return `${prefix}${year}${month}${day}${hour}${minute}${random1}${random2}`;
}
