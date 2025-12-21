import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import NavigationBar from '../components/home/NavigationBar';

const PrivacyPolicyPage: React.FC = () => {
  const navigate = useNavigate();
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('ml-express-language') || 'zh';
  });
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem('ml-express-language', newLanguage);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showLanguageDropdown && !target.closest('[data-language-dropdown]')) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLanguageDropdown]);

  const translations = {
    zh: {
      nav: {
        home: '首页',
        services: '服务',
        tracking: '包裹跟踪',
        contact: '联系我们',
        admin: '管理后台',
      },
      title: '隐私政策',
      subtitle: '我们重视您的隐私，本政策说明了我们如何收集、使用和保护您的个人信息',
      lastUpdated: '最后更新：2024年12月',
      sections: {
        introduction: {
          title: '1. 引言',
          content: 'MARKET LINK EXPRESS（以下简称"我们"或"公司"）致力于保护您的隐私。本隐私政策说明了当您使用我们的移动应用程序（ML Express Staff）和网站服务时，我们如何收集、使用、披露和保护您的个人信息。'
        },
        informationCollection: {
          title: '2. 信息收集',
          content: '我们可能收集以下类型的信息：',
          items: [
            '个人身份信息：姓名、电话号码、电子邮件地址、地址等',
            '位置信息：当您使用我们的应用程序时，我们会收集您的位置数据以提供配送服务',
            '设备信息：设备型号、操作系统版本、唯一设备标识符',
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
            '使用加密技术保护数据传输',
            '限制对个人信息的访问权限',
            '定期进行安全审计和更新',
            '使用安全的服务器和数据库'
          ]
        },
        yourRights: {
          title: '6. 您的权利',
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
          title: '7. 位置服务',
          content: '我们的应用程序需要访问您的位置信息以提供配送服务。位置数据仅用于：',
          items: [
            '计算配送距离和路线',
            '实时跟踪配送状态',
            '优化配送路线',
            '提供导航服务'
          ],
          note: '您可以在设备设置中随时关闭位置服务，但这可能影响应用程序的某些功能。'
        },
        dataRetention: {
          title: '8. 数据保留',
          content: '我们仅在必要的时间内保留您的个人信息，以提供服务并遵守法律义务。当数据不再需要时，我们将安全地删除或匿名化处理。'
        },
        childrenPrivacy: {
          title: '9. 儿童隐私',
          content: '我们的服务不面向13岁以下的儿童。我们不会故意收集儿童的个人信息。如果我们发现收集了儿童信息，我们将立即删除。'
        },
        changes: {
          title: '10. 政策变更',
          content: '我们可能会不时更新本隐私政策。重大变更将通过应用程序通知或电子邮件通知您。继续使用我们的服务即表示您接受更新后的政策。'
        },
        contact: {
          title: '11. 联系我们',
          content: '如果您对本隐私政策有任何问题或疑虑，请通过以下方式联系我们：',
          items: [
            '电话：(+95) 09788848928',
            '邮箱：marketlink982@gmail.com',
            '地址：ChanMyaThaZi Mandalay'
          ]
        }
      }
    },
    en: {
      nav: {
        home: 'Home',
        services: 'Services',
        tracking: 'Tracking',
        contact: 'Contact',
        admin: 'Admin',
      },
      title: 'Privacy Policy',
      subtitle: 'We value your privacy. This policy explains how we collect, use, and protect your personal information',
      lastUpdated: 'Last Updated: December 2024',
      sections: {
        introduction: {
          title: '1. Introduction',
          content: 'MARKET LINK EXPRESS (referred to as "we" or "company") is committed to protecting your privacy. This privacy policy explains how we collect, use, disclose, and protect your personal information when you use our mobile application (ML Express Staff) and website services.'
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
    my: {
      nav: {
        home: 'ပင်မ',
        services: 'ဝန်ဆောင်မှု',
        tracking: 'ထုပ်ပိုးခြင်း',
        contact: 'ဆက်သွယ်ရန်',
        admin: 'စီမံခန့်ခွဲမှု',
      },
      title: 'ကိုယ်ရေးလုံခြုံမှု မူဝါဒ',
      subtitle: 'ကျွန်ုပ်တို့သည် သင့်ကိုယ်ရေးလုံခြုံမှုကို တန်ဖိုးထားပါသည်။ ဤမူဝါဒသည် ကျွန်ုပ်တို့အနေဖြင့် သင့်ကိုယ်ရေးအချက်အလက်များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ ကာကွယ်သည်ကို ရှင်းလင်းပြထားပါသည်',
      lastUpdated: 'နောက်ဆုံးအပ်ဒိတ်: ၂၀၂၄ ဒီဇင်ဘာ',
      sections: {
        introduction: {
          title: '၁. မိတ်ဆက်',
          content: 'MARKET LINK EXPRESS (အောက်တွင် "ကျွန်ုပ်တို့" သို့မဟုတ် "ကုမ္ပဏီ" ဟု ရည်ညွှန်းသည်) သည် သင့်ကိုယ်ရေးလုံခြုံမှုကို ကာကွယ်ရန် ကတိပြုထားပါသည်။ ဤကိုယ်ရေးလုံခြုံမှု မူဝါဒသည် သင်သည် ကျွန်ုပ်တို့၏ မိုဘိုင်း application (ML Express Staff) နှင့် website ဝန်ဆောင်မှုများကို အသုံးပြုသောအခါ ကျွန်ုပ်တို့အနေဖြင့် သင့်ကိုယ်ရေးအချက်အလက်များကို မည်သို့ စုဆောင်း၊ အသုံးပြု၊ ထုတ်ဖော်၊ ကာကွယ်သည်ကို ရှင်းလင်းပြထားပါသည်။'
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
            'အော်ဒါများကို လုပ်ဆောင်ရန်နှင့် ထုပ်ပိုးများကို ခြေရာခံရန်',
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
    }
  };

  const t = translations[language as keyof typeof translations] || translations.zh;

  const handleNavigation = (path: string) => {
    setIsVisible(false);
    setTimeout(() => {
      navigate(path);
    }, 300);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)',
      position: 'relative',
      overflow: 'hidden',
      padding: window.innerWidth < 768 ? '12px' : '20px'
    }}>
      {/* 背景装饰 */}
      <div style={{
        position: 'absolute',
        top: '5%',
        right: '5%',
        width: '200px',
        height: '200px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(40px)',
        zIndex: 1
      }}></div>
      <div style={{
        position: 'absolute',
        bottom: '5%',
        left: '5%',
        width: '150px',
        height: '150px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '50%',
        filter: 'blur(30px)',
        zIndex: 1
      }}></div>
      
      {/* 导航栏 */}
      <NavigationBar
        language={language}
        onLanguageChange={handleLanguageChange}
        currentUser={null} 
        onLogout={() => {}} 
        onShowRegisterModal={() => {}} 
        translations={t as any}
      />

      {/* 主要内容区域 */}
      <div style={{
        position: 'relative',
        zIndex: 5,
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translateY(0)' : 'translateY(30px)',
        transition: 'all 0.6s ease-in-out',
        color: 'white',
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* 页面标题 */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <h1 style={{
            fontSize: window.innerWidth < 768 ? '2.5rem' : '3.5rem',
            color: 'white',
            marginBottom: '1rem',
            fontWeight: '800',
            textShadow: '2px 2px 8px rgba(0,0,0,0.3)',
            letterSpacing: '-1px'
          }}>
            {t.title}
          </h1>
          <p style={{
            fontSize: window.innerWidth < 768 ? '1rem' : '1.2rem',
            color: 'rgba(255,255,255,0.9)',
            maxWidth: '600px',
            margin: '0 auto',
            lineHeight: '1.6',
            fontWeight: '300'
          }}>
            {t.subtitle}
          </p>
          <p style={{
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.7)',
            marginTop: '1rem'
          }}>
            {t.lastUpdated}
          </p>
        </div>

        {/* 隐私政策内容 */}
        <div style={{
          background: 'var(--card-bg)',
          backdropFilter: 'var(--card-backdrop)',
          borderRadius: 'var(--card-radius-lg)',
          padding: 'var(--card-padding-lg)',
          border: 'var(--card-border)',
          boxShadow: 'var(--shadow-card)',
          marginBottom: '2rem'
        }}>
          {Object.values(t.sections).map((section: any, index: number) => (
            <div key={index} style={{ marginBottom: '2.5rem' }}>
              <h2 style={{
                fontSize: '1.5rem',
                fontWeight: '700',
                color: '#2d3748',
                marginBottom: '1rem',
                paddingBottom: '0.5rem',
                borderBottom: '2px solid #428cc9'
              }}>
                {section.title}
              </h2>
              <p style={{
                fontSize: '1rem',
                color: '#4a5568',
                lineHeight: '1.8',
                marginBottom: section.items ? '1rem' : 0
              }}>
                {section.content}
              </p>
              {section.items && (
                <ul style={{
                  listStyle: 'none',
                  padding: 0,
                  margin: '1rem 0'
                }}>
                  {section.items.map((item: string, itemIndex: number) => (
                    <li key={itemIndex} style={{
                      padding: '0.5rem 0',
                      paddingLeft: '1.5rem',
                      position: 'relative',
                      fontSize: '1rem',
                      color: '#4a5568',
                      lineHeight: '1.8'
                    }}>
                      <span style={{
                        position: 'absolute',
                        left: 0,
                        color: '#428cc9',
                        fontWeight: 'bold'
                      }}>•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
              {section.note && (
                <div style={{
                  background: 'rgba(66, 140, 201, 0.1)',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginTop: '1rem',
                  borderLeft: '4px solid #428cc9'
                }}>
                  <p style={{
                    fontSize: '0.95rem',
                    color: '#2d3748',
                    lineHeight: '1.6',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    {section.note}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* 页脚信息 */}
        <div style={{
          textAlign: 'center',
          padding: 'var(--card-padding-lg)',
          background: 'rgba(255,255,255,0.1)',
          backdropFilter: 'blur(10px)',
          borderRadius: 'var(--card-radius-lg)',
          border: 'var(--card-border)',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', marginBottom: '1rem' }}>
            <img 
              src="/logo.png" 
              alt="Logo" 
              style={{ 
                width: '40px', 
                height: '40px' 
              }} 
            />
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1 }}>
              <span style={{ 
                color: 'white',
                fontSize: '1.6rem',
                fontWeight: '800',
                textShadow: '3px 3px 6px rgba(0,0,0,0.4)',
                background: 'linear-gradient(45deg, #ffffff, #f0f8ff, #e6f3ff)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
                letterSpacing: '-1px',
                whiteSpace: 'nowrap'
              }}>
                MARKET LINK <span style={{ fontSize: '0.6em', fontStyle: 'italic', fontWeight: '400' }}>EXPRESS</span>
              </span>
              <span style={{
                color: 'white',
                fontSize: '0.6rem',
                fontStyle: 'italic',
                fontWeight: '400',
                letterSpacing: '1px',
                opacity: 0.9,
                marginTop: '-2px',
                textAlign: 'right',
                paddingRight: '4px',
                textShadow: '1px 1px 2px rgba(0,0,0,0.2)'
              }}>
                Delivery Services
              </span>
            </div>
          </div>
          <p style={{ 
            color: 'rgba(255,255,255,0.8)',
            fontSize: '0.9rem',
            margin: '0.5rem 0'
          }}>
            © 2024 MARKET LINK EXPRESS. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;

