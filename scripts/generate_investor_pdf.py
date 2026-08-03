#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate MARKET LINK EXPRESS investor pitch PDF (Chinese)."""

from fpdf import FPDF
from datetime import date

FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
OUTPUT_PATH = "/workspace/docs/investor/MARKET_LINK_EXPRESS_投资者商业计划书_2026.pdf"
TODAY = date.today().strftime("%Y年%m月%d日")


class InvestorPDF(FPDF):
    def __init__(self):
        super().__init__(orientation="P", unit="mm", format="A4")
        self.add_font("wqy", "", FONT_PATH)
        self.set_auto_page_break(auto=True, margin=20)
        self._section_num = 0

    def footer(self):
        self.set_y(-15)
        self.set_font("wqy", size=8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 10, f"MARKET LINK EXPRESS | 投资者商业计划书 | 第 {self.page_no()} 页", align="C")

    def cover(self):
        self.add_page()
        self.set_fill_color(26, 54, 93)
        self.rect(0, 0, 210, 297, "F")
        self.set_text_color(255, 255, 255)
        self.set_font("wqy", size=28)
        self.ln(60)
        self.cell(0, 15, "MARKET LINK EXPRESS", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("wqy", size=16)
        self.cell(0, 12, "缅甸同城快递与商业配送生态系统", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_font("wqy", size=22)
        self.cell(0, 14, "投资者商业计划书", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_font("wqy", size=12)
        self.cell(0, 10, "Future Roadmap & Growth Strategy", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(40)
        self.set_font("wqy", size=11)
        self.cell(0, 8, f"文档日期：{TODAY}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "总部：Yangon, Myanmar", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "官网：www.market-link-express.com", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 8, "机密文件 — 仅供投资洽谈使用", align="C", new_x="LMARGIN", new_y="NEXT")

    def toc(self, items):
        self.add_page()
        self.set_text_color(0, 0, 0)
        self.set_font("wqy", size=18)
        self.cell(0, 12, "目  录", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_font("wqy", size=11)
        for title, page in items:
            self.cell(0, 8, f"{title} ................................ {page}", new_x="LMARGIN", new_y="NEXT")

    def section(self, title):
        self._section_num += 1
        self.add_page()
        self.set_text_color(26, 54, 93)
        self.set_font("wqy", size=18)
        self.cell(0, 12, f"{self._section_num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(49, 130, 206)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(6)
        self.set_text_color(0, 0, 0)

    def subsection(self, title):
        self.ln(2)
        self.set_font("wqy", size=13)
        self.set_text_color(44, 82, 130)
        self.cell(0, 9, title, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(1)

    def body(self, text):
        self.set_font("wqy", size=10)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet_list(self, items):
        self.set_font("wqy", size=10)
        self.set_x(15)
        w = self.w - self.l_margin - self.r_margin - 5
        for item in items:
            if self.get_y() > self.h - 25:
                self.add_page()
            self.set_x(15)
            self.multi_cell(w, 6, f"  -  {item}")
        self.ln(2)

    def table(self, headers, rows, col_widths=None):
        if col_widths is None:
            w = 190 / len(headers)
            col_widths = [w] * len(headers)
        total_w = sum(col_widths)
        if total_w > 190:
            scale = 190 / total_w
            col_widths = [w * scale for w in col_widths]
        self.set_font("wqy", size=9)
        self.set_fill_color(230, 240, 250)
        x0 = self.l_margin
        for i, h in enumerate(headers):
            self.set_x(x0 + sum(col_widths[:i]))
            self.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
        self.ln()
        self.set_fill_color(255, 255, 255)
        for row in rows:
            if self.get_y() > self.h - 30:
                self.add_page()
            y0 = self.get_y()
            x0 = self.l_margin
            row_heights = []
            for i, cell in enumerate(row):
                self.set_xy(x0 + sum(col_widths[:i]), y0)
                self.multi_cell(col_widths[i], 6, cell, border=1, align="L")
                row_heights.append(self.get_y() - y0)
            self.set_y(y0 + max(row_heights, default=8))
        self.ln(3)


def build_pdf():
    pdf = InvestorPDF()
    pdf.cover()

    # Pre-build content; record TOC pages approximately after generation
    sections = []

    # --- 1 执行摘要 ---
    pdf.section("执行摘要")
    sections.append(("执行摘要", pdf.page_no()))
    pdf.body(
        "MARKET LINK EXPRESS（以下简称 ML Express）是面向缅甸市场的同城快递与商业配送数字化平台。"
        "公司总部位于仰光（Yangon），以「连接商家、骑手与消费者」为核心使命，"
        "构建覆盖下单、履约、结算、追踪全链路的五端一体化生态系统。"
    )
    pdf.body(
        "截至 2026 年，ML Express 已完成客户端 Web/App、商家端 Web/App、骑手端 App 及后台管理系统的"
        "全栈开发与生产部署，技术架构基于 React/React Native + Supabase + Netlify，"
        "支持中文、英文、缅甸语三语，并已在 Google Play / App Store 完成上架准备。"
    )
    pdf.subsection("投资亮点")
    pdf.bullet_list([
        "五端联动完整产品矩阵，非单点工具，具备平台型扩张潜力",
        "同城快递 + 同城商场（City Mall）双引擎，配送与电商协同变现",
        "VIP 会员体系、COD 代收款、财务对账等成熟商业化模块已落地",
        "仰光、曼德勒等核心城市地理编码与区域前缀体系已内置",
        "云原生架构，边际扩展成本低，可快速复制至新城市",
        "缅甸物流数字化渗透率仍低，先发优势窗口明确",
    ])
    pdf.subsection("融资目标（建议框架）")
    pdf.table(
        ["轮次", "目标金额", "主要用途", "预期里程碑"],
        [
            ["种子轮/Pre-A", "USD 50万–150万", "市场扩张、骑手网络、品牌营销", "仰光日单量 500+，商家 200+"],
            ["A 轮", "USD 300万–800万", "曼德勒扩张、团队扩建、支付合规", "两城日单量 3000+，盈亏平衡路径清晰"],
            ["B 轮", "USD 1500万+", "全国网络、金融科技、API 开放平台", "缅甸同城配送市场份额 Top 3"],
        ],
        [30, 35, 65, 60],
    )

    # --- 2 公司概况 ---
    pdf.section("公司概况与愿景")
    sections.append(("公司概况与愿景", pdf.page_no()))
    pdf.subsection("公司简介")
    pdf.body(
        "MARKET LINK EXPRESS 是一家专注于缅甸同城即时配送与本地商业服务的科技公司。"
        "品牌定位：专业、可靠、透明的同城物流与商业连接平台。"
        "服务范围涵盖：个人寄件、商家 B2B 配送、同城商场商品配送、COD 代收款、VIP 会员增值服务。"
    )
    pdf.subsection("使命 · 愿景 · 价值观")
    pdf.bullet_list([
        "使命：让缅甸每一个包裹和每一笔本地交易都高效、可追踪、可信赖",
        "愿景：成为东南亚新兴市场领先的同城即时配送与本地商业基础设施",
        "价值观：用户体验至上、数据驱动决策、透明财务、多语言包容、安全合规",
    ])
    pdf.subsection("品牌与线上资产")
    pdf.table(
        ["资产", "地址/标识", "状态"],
        [
            ["客户端 Web", "market-link-express.com", "已部署 Netlify"],
            ["后台管理", "admin-market-link-express.com", "已部署"],
            ["商家端 Web", "mlexpress-merchant (Netlify)", "已部署"],
            ["客户端 App", "com.mlexpress.client", "v2.3.6，已构建"],
            ["商家端 App", "com.mlexpress.merchants", "v2.0.0，已构建"],
            ["骑手端 App", "ml-express-mobile-app", "v1.0.0，可运行"],
            ["隐私政策", "/privacy-policy", "合规页面上线"],
            ["服务条款", "/terms-of-service", "合规页面上线"],
        ],
        [55, 80, 55],
    )

    # --- 3 市场分析 ---
    pdf.section("市场分析与机会")
    sections.append(("市场分析与机会", pdf.page_no()))
    pdf.subsection("宏观市场背景")
    pdf.body(
        "缅甸拥有约 5500 万人口，城镇化率持续提升，仰光、曼德勒构成双核心消费与商业枢纽。"
        "电商与社交媒体（Facebook、TikTok 等）驱动的非正式电商快速增长，"
        "但最后一公里配送仍大量依赖传统摩托车配送、电话下单与纸质记录，数字化渗透率极低。"
    )
    pdf.subsection("目标市场规模（TAM / SAM / SOM）")
    pdf.table(
        ["层级", "定义", "估算逻辑", "规模区间"],
        [
            ["TAM", "缅甸整体物流市场", "年物流支出约 USD 8–12 亿", "USD 8–12 亿/年"],
            ["SAM", "城市同城即时配送", "仰光+曼德勒+B2B 商家配送", "USD 1.5–3 亿/年"],
            ["SOM", "ML Express 3 年可达", "双城 15–25% 份额", "USD 2000万–7500万/年"],
        ],
        [25, 45, 55, 65],
    )
    pdf.subsection("市场驱动因素")
    pdf.bullet_list([
        "智能手机普及率上升，移动端下单成为主流",
        "本地 SME 商家缺乏自建配送能力，外包需求强烈",
        "COD（货到付款）在缅甸仍是主流支付方式，平台代收款需求旺盛",
        "同城商场、直播带货等新零售形态需要可靠履约_partner",
        "外资与本地资本对东南亚新兴市场物流赛道持续关注",
    ])
    pdf.subsection("目标客户细分")
    pdf.table(
        ["客户群", "痛点", "ML Express 解决方案", "付费意愿"],
        [
            ["C 端个人用户", "价格不透明、无法追踪", "App 下单+实时地图追踪", "中"],
            ["中小商家", "配送难、对账乱", "商家端+COD 结算+小票打印", "高"],
            ["同城商场商户", "库存与配送割裂", "City Mall 集成+库存管理", "高"],
            ["连锁/大客户", "批量运单、SLA 要求", "API 对接+专属账户（规划中）", "很高"],
            ["骑手/配送员", "派单乱、结算慢", "骑手 App+状态同步+审计", "平台侧成本"],
        ],
        [35, 45, 65, 45],
    )

    # --- 4 产品现状 ---
    pdf.section("产品现状 — 已实现能力")
    sections.append(("产品现状", pdf.page_no()))
    pdf.subsection("五端产品矩阵")
    pdf.body("ML Express 不是单一 App，而是完整的五端联动商业操作系统：")
    pdf.table(
        ["端", "技术栈", "核心功能", "版本"],
        [
            ["客户端 Web", "React 18 + TS", "下单、City Mall、购物车、追踪", "生产"],
            ["客户端 App", "Expo RN + TS", "会员、VIP、地图追踪、多语言", "v2.3.6"],
            ["商家端 Web", "React + TS", "经营指挥中心、订单、商品、对账", "2026 升级"],
            ["商家端 App", "Expo RN", "与 Web 100% 对齐、营收图表", "v2.0.0"],
            ["骑手端 App", "Expo RN", "导航、状态更新、离线照片", "v1.0.0"],
            ["后台管理", "React CRA", "调度、财务、VIP、系统设置", "v2.2.4"],
        ],
        [35, 40, 75, 40],
    )
    pdf.subsection("核心业务模块（已上线）")
    pdf.bullet_list([
        "智能下单：寄/收件人表单、地图选址、包裹类型、配送速度（准时达/急送达/定时达）、自动计价",
        "订单全生命周期：创建 → 待取件 → 配送中 → 已送达 → 财务结算",
        "实时追踪：二维码/订单号查询、骑手位置地图展示",
        "City Mall 同城商场：商品浏览、购物车、商家商品配送一体化",
        "VIP 会员体系：充值升级、余额支付、会员等级权益",
        "COD 代收款：商家 COD 统计、已结清/待结清、月度对账导出",
        "商家 Autopilot：营业时间覆盖、休假预设、手动打烊/延长营业",
        "状态归一化：现金/余额/待收款状态在三端（客户/商家/骑手）逻辑一致",
        "财务对账：每笔完成订单自动生成 FinanceRecord",
        "多语言：中文 / English / မြန်မာ（Unicode 缅甸语适配）",
        "通知系统：Push Token、短信验证（Twilio）、邮件（Nodemailer）",
        "安全与审计：audit_logs、地理围栏配送验证、RLS 策略",
        "App Store / Google Play：隐私政策、服务条款、EAS 构建流程完备",
    ])

    # --- 5 技术架构 ---
    pdf.section("技术架构与竞争壁垒")
    sections.append(("技术架构与竞争壁垒", pdf.page_no()))
    pdf.subsection("技术栈概览")
    pdf.table(
        ["层级", "选型", "优势"],
        [
            ["前端 Web", "React 18 + TypeScript", "组件化、人才池大、迭代快"],
            ["移动端", "Expo ~54 + React Native 0.81", "一套代码双端、OTA 热更新"],
            ["后端", "Supabase (PostgreSQL)", "实时订阅、RLS、低运维成本"],
            ["Serverless", "Netlify Functions", "JWT 验证、SMS、边缘计算"],
            ["地图", "Google Maps API", "选址、导航、地理编码缓存"],
            ["部署", "Netlify + EAS Build", "Git Push 自动部署、App 云构建"],
            ["监控", "Sentry（可选）", "生产环境错误追踪"],
        ],
        [35, 55, 100],
    )
    pdf.subsection("数据与技术壁垒")
    pdf.bullet_list([
        "五端共享单一 Supabase 数据模型，订单/用户/财务/商品实时同步，切换成本低",
        "缅甸城市地理编码缓存（geocode_cache）与区域前缀（YGN/MDY）内置，本地化深度高",
        "完整 SQL 迁移脚本库（100+ 文件），数据库演进可追溯",
        "状态归一化与 COD 财务逻辑已生产验证，新竞品复制需 12–18 个月",
        "多语言翻译体系与 Unicode 缅甸语 UI 适配，本地用户体验领先",
        "Netlify 多站点 + 多 Functions 目录架构，客户端/商家/管理隔离部署",
    ])

    # --- 6 商业模式 ---
    pdf.section("商业模式与收入结构")
    sections.append(("商业模式与收入结构", pdf.page_no()))
    pdf.subsection("收入来源")
    pdf.table(
        ["收入类型", "描述", "费率/定价模型", "成熟度"],
        [
            ["配送服务费", "按距离/重量/时效计费", "每单 USD 0.5–3", "已上线"],
            ["商家 SaaS 订阅", "商家端高级功能月费", "USD 10–50/月", "部分上线"],
            ["COD 手续费", "代收款结算抽成", "1–3% 交易额", "已上线"],
            ["VIP 会员", "充值返利、优先配送", "预充值制", "已上线"],
            ["City Mall 佣金", "商品交易额抽成", "5–15%", "已上线"],
            ["广告/Banner", "首页 Banner 位", "CPM/CPT", "已上线"],
            ["API 对接费", "大客户系统对接", "年费+按量", "规划中"],
            ["数据增值服务", "热力图、选址分析", "B2B 订阅", "规划中"],
        ],
        [40, 55, 45, 50],
    )
    pdf.subsection("单位经济模型（Unit Economics 目标）")
    pdf.table(
        ["指标", "当前基准", "12 个月目标", "36 个月目标"],
        [
            ["平均客单价 (AOV)", "USD 1.5–2.5", "USD 2.5–3.5", "USD 3.5–5"],
            ["每单毛利", "USD 0.3–0.8", "USD 0.8–1.2", "USD 1.2–2"],
            ["商家 LTV", "USD 200–500", "USD 800–1500", "USD 2000+"],
            ["CAC 回收期", "6–9 个月", "4–6 个月", "2–4 个月"],
            ["骑手人效", "15–25 单/日", "25–35 单/日", "35–50 单/日"],
        ],
        [45, 45, 45, 55],
    )

    # --- 7 竞争格局 ---
    pdf.section("竞争格局与差异化")
    sections.append(("竞争格局与差异化", pdf.page_no()))
    pdf.body(
        "缅甸同城配送市场呈现「传统摩托帮 + 少量数字化新 entrants」格局。"
        "传统参与者依赖 WhatsApp/Facebook 私域下单，缺乏系统化追踪与财务对账；"
        "国际玩家（Grab 等）重心不在缅甸同城 SME 深度服务。"
    )
    pdf.subsection("竞争优势矩阵")
    pdf.table(
        ["维度", "传统配送", "通用超级 App", "ML Express"],
        [
            ["五端完整度", "无", "部分", "完整五端"],
            ["商家 COD 对账", "手工", "有限", "自动化"],
            ["City Mall 集成", "无", "有（泛化）", "深度垂直"],
            ["缅甸语体验", "一般", "一般", "原生三语"],
            ["中小企业定价", "不透明", "偏高", "灵活透明"],
            ["本地合规", "弱", "国际标准", "缅甸法域适配"],
        ],
        [40, 45, 45, 60],
    )

    # --- 8 未来战略规划 ---
    pdf.section("未来战略规划（2026–2029）")
    sections.append(("未来战略规划", pdf.page_no()))
    pdf.body(
        "以下为 ML Express 三年战略规划，分四个阶段推进。"
        "各阶段目标相互衔接，技术底座已在 2025–2026 年完成，"
        "2026 下半年起重心转向市场扩张与商业化深化。"
    )

    pdf.subsection("Phase 1：市场验证与仰光深耕（2026 Q3 – 2027 Q1，0–6 个月）")
    pdf.bullet_list([
        "目标：仰光核心区域日订单 300–500 单，签约商家 150–200 家，活跃骑手 30–50 人",
        "产品：客户端/商家端 App 正式推广；优化下单转化漏斗；上线骑手智能派单 v1",
        "运营：仰光 5–8 个配送网格化站点；商家地推团队 5–8 人；骑手招募与培训体系",
        "营销：Facebook/TikTok 本地化投放；新用户首单优惠；商家入驻 0 佣金试用期",
        "技术：派单算法 MVP（距离+负载均衡）；配送 SLA 监控大屏；Sentry 全端监控",
        "财务：COD 日结/周结流程标准化；商家对账单 PDF 自动生成",
        "KPI：月 GMV USD 3万–5万；用户留存率 D30 > 25%；NPS > 40",
    ])

    pdf.subsection("Phase 2：双城扩张与商业化深化（2027 Q1 – Q3，6–12 个月）")
    pdf.bullet_list([
        "目标：曼德勒开城；双城日订单 1500–3000 单；VIP 会员 5000+；City Mall GMV 占比 20%",
        "产品：VIP 等级权益体系 2.0（免配送费、优先派单）；商家数据分析 Dashboard",
        "产品：骑手 App 离线模式增强；电子签收+拍照存证；客户评价与骑手评分系统",
        "产品：客户端「预约配送」「批量寄件」；商家 API 文档 v1（REST Webhook）",
        "运营：曼德勒运营中心；跨城转运标准流程；大客户 BD 团队（餐饮、药房、电商）",
        "支付：接入 KBZ Pay / Wave Money 等本地电子钱包；减少现金依赖",
        "合规：缅甸公司注册完善、劳务合规、数据保护政策本地化",
        "KPI：月 GMV USD 15万–30万；商家续费率 > 70%；骑手月流失率 < 15%",
    ])

    pdf.subsection("Phase 3：全国网络与平台化（2027 Q3 – 2028 Q3，12–24 个月）")
    pdf.bullet_list([
        "目标：覆盖 Naypyidaw、Mawlamyine 等 3–5 个城市；日订单 8000–15000 单",
        "产品：开放平台 API 2.0 — 第三方电商/ERP 一键对接",
        "产品：AI 智能定价（动态调价、高峰溢价）；AI 路径优化（多 stop 配送）",
        "产品：冷链/医药配送专项模块；B2B 合同运单管理",
        "产品：骑手众包模式 — 兼职骑手弹性运力池",
        "金融：ML Express Wallet — 用户/商家钱包、信用额度、骑手即时结算",
        "金融：COD T+1 自动结算；商家供应链金融（应收账款保理，合作金融机构）",
        "数据：配送热力图 SaaS 售卖给品牌方；选址分析报告",
        "KPI：月 GMV USD 80万–150万；平台抽佣+SaaS 收入占比 > 40%",
    ])

    pdf.subsection("Phase 4：区域领先与资本化准备（2028 Q3 – 2029+，24–36 个月）")
    pdf.bullet_list([
        "目标：缅甸同城即时配送市场份额 Top 3；评估老挝/柬埔寨等邻国扩张",
        "战略：并购区域小型配送团队；与 telecom / bank 战略合作",
        "产品：无人配送试点（无人机/自动柜，仰光郊区）；跨境包裹（中缅边境贸易区）",
        "组织：C-level 团队完整（CTO/COO/CFO）；ISO 27001 信息安全认证",
        "资本：启动 B 轮或 Pre-IPO 路径；财务审计国际化（IFRS）",
        "KPI：年 GMV USD 1500万+；EBITDA 转正；估值 USD 5000万–1亿+",
    ])

    # --- 9 产品路线图 ---
    pdf.section("详细产品路线图")
    sections.append(("产品路线图", pdf.page_no()))
    pdf.table(
        ["季度", "客户端", "商家端", "骑手端", "后台/平台"],
        [
            ["2026 Q3", "下单优化、推送增强", "批量导入订单", "派单接收优化", "实时调度大屏"],
            ["2026 Q4", "会员裂变分享", "营销工具（优惠券）", "电子签收", "BI 报表 v1"],
            ["2027 Q1", "电子钱包接入", "经营分析 AI 摘要", "路径导航优化", "自动派单引擎"],
            ["2027 Q2", "预约/批量寄件", "API 对接", "骑手评分", "大客户 SLA 管理"],
            ["2027 Q3", "跨城下单", "多门店管理", "众包模式", "开放平台 Portal"],
            ["2027 Q4", "AI 客服 Chatbot", "供应链预警", "AR 签收", "动态定价引擎"],
            ["2028+", "邻国版 App", "连锁品牌版", "Fleet 管理", "数据中台"],
        ],
        [25, 40, 40, 40, 45],
    )

    # --- 10 运营计划 ---
    pdf.section("运营与市场推广计划")
    sections.append(("运营与市场推广", pdf.page_no()))
    pdf.subsection("骑手网络建设")
    pdf.bullet_list([
        "招募：摩托车/电动车骑手为主；提供 App 培训、装备补贴、保底单量",
        "管理：网格化站长制；每日晨会+晚复盘；配送质量 KPI 与奖金挂钩",
        "留存：即时结算（T+0/T+1）；骑手等级与优先派单；保险与事故保障计划",
        "规模：Phase 1 仰光 30–50 人 → Phase 2 双城 120–200 人 → Phase 3 全国 500–800 人",
    ])
    pdf.subsection("商家获取策略")
    pdf.bullet_list([
        "地推：仰光 Chinatown、各大 Market 集中攻坚 SME 商家",
        "行业：餐饮外卖、药房、服装店、手机配件、同城电商卖家",
        "激励：首 3 个月 0 佣金；免费 POS 小票机（押金制）；COD 快速结算",
        "留存：专属客户经理；月度经营报告；City Mall 流量导入",
    ])
    pdf.subsection("C 端用户增长")
    pdf.bullet_list([
        "渠道：Facebook Ads、TikTok KOL、Google Play ASO、线下 QR 码",
        "裂变：邀请好友得配送券；VIP 充值满赠",
        "品牌：统一视觉（蓝色渐变品牌色）；本地缅甸语品牌故事内容",
    ])

    # --- 11 团队 ---
    pdf.section("团队与组织规划")
    sections.append(("团队与组织规划", pdf.page_no()))
    pdf.subsection("现有技术资产（团队能力体现）")
    pdf.body(
        "项目已积累 1000+ 源文件、五端生产级代码、100+ SQL 迁移脚本、"
        "80+ 技术与运营文档，证明团队具备全栈交付与持续迭代能力。"
    )
    pdf.subsection("组织扩张计划")
    pdf.table(
        ["阶段", "团队规模", "关键岗位"],
        [
            ["当前", "5–10 人（估）", "全栈开发、产品、运营"],
            ["Phase 1", "15–20 人", "+BD 5人、+骑手运营 3人、+客服 2人"],
            ["Phase 2", "35–50 人", "+CTO、+CFO、+城市经理、+数据分析师"],
            ["Phase 3", "80–120 人", "+各城市运营中心、+法务合规、+金融合作"],
        ],
        [30, 35, 125],
    )

    # --- 12 财务预测 ---
    pdf.section("财务预测框架（2026–2029）")
    sections.append(("财务预测框架", pdf.page_no()))
    pdf.body("以下为保守/基准/乐观三情景下的关键财务指标预测（单位：USD）：")
    pdf.subsection("GMV 与收入预测（基准情景）")
    pdf.table(
        ["年份", "年 GMV", "平台净收入", "毛利率", "净利率"],
        [
            ["2026", "40万–60万", "8万–12万", "35–45%", "-60%（投入期）"],
            ["2027", "200万–350万", "50万–90万", "45–55%", "-20%"],
            ["2028", "800万–1200万", "200万–350万", "50–60%", "5–10%"],
            ["2029", "1500万–2500万", "400万–700万", "55–65%", "12–18%"],
        ],
        [25, 40, 45, 40, 40],
    )
    pdf.subsection("成本结构")
    pdf.bullet_list([
        "骑手配送成本：GMV 的 45–55%（最大成本项，随规模效应下降）",
        "技术与云服务：GMV 的 3–5%（Supabase/Netlify/Google Maps）",
        "市场与获客：GMV 的 8–15%（早期偏高，后期降至 5–8%）",
        "人员成本：随团队扩张线性增长，Phase 2 后占收入 25–35%",
        "管理与合规：GMV 的 2–4%",
    ])
    pdf.subsection("盈亏平衡分析")
    pdf.body(
        "基准情景下，预计 2027 Q4 – 2028 Q2 实现运营层面盈亏平衡（Contribution Margin Positive），"
        "2028 全年实现公司层面 EBITDA 转正。关键变量：日单量、骑手人效、商家 COD 渗透率。"
    )

    # --- 13 融资 ---
    pdf.section("融资需求与资金用途")
    sections.append(("融资需求与资金用途", pdf.page_no()))
    pdf.subsection("本轮融资建议（Pre-A / 种子+）")
    pdf.table(
        ["项目", "金额占比", "明细"],
        [
            ["骑手网络与运营", "35%", "招募补贴、装备、站点、站长薪资"],
            ["市场推广", "25%", "FB/TikTok 投放、地推、品牌活动"],
            ["产品研发", "20%", "派单算法、支付接入、App 迭代"],
            ["团队扩建", "12%", "BD、运营、客服、管理层"],
            ["合规与储备", "8%", "法务、财务审计、6 个月 Runway 缓冲"],
        ],
        [45, 30, 115],
    )
    pdf.subsection("投资者回报路径")
    pdf.bullet_list([
        "3–5 年战略并购：东南亚物流/电商巨头收购（Grab、Ninja Van、本地 Telecom）",
        "5–7 年独立 IPO：缅甸/新加坡双重上市可能性",
        "预期 IRR：基准情景 25–40%（早期进入新兴市场物流赛道）",
        "退出估值参考：东南亚同城配送 PS Ratio 2–5x GMV",
    ])

    # --- 14 风险 ---
    pdf.section("风险分析与应对策略")
    sections.append(("风险分析与应对", pdf.page_no()))
    pdf.table(
        ["风险类型", "描述", "概率", "应对策略"],
        [
            ["政策/regulatory", "缅甸政治经济波动", "中", "多城市分散、合规优先、现金储备"],
            ["竞争", "国际玩家降价进入", "中", "垂直深耕 SME+COD、本地化壁垒"],
            ["运营", "骑手流失/服务质量", "中高", "即时结算、等级体系、地理围栏验证"],
            ["技术", "系统宕机/数据泄露", "低", "Supabase SLA、RLS、Sentry、备份"],
            ["支付", "COD 坏账/现金风险", "中", "商家信用评分、预付比例、保险"],
            ["外汇", "缅元贬值", "中", "USD 定价锚定、多币种结算"],
        ],
        [30, 50, 20, 90],
    )

    # --- 15 里程碑 ---
    pdf.section("关键里程碑与 KPI 仪表盘")
    sections.append(("关键里程碑与 KPI", pdf.page_no()))
    pdf.table(
        ["时间", "里程碑", "核心 KPI"],
        [
            ["2026 Q4", "仰光日单 500+", "商家 200+, 骑手 50+"],
            ["2027 Q2", "曼德勒开城", "双城日单 2000+"],
            ["2027 Q4", "电子钱包全面接入", "非 COD 支付占比 30%"],
            ["2028 Q2", "盈亏平衡", "月 GMV USD 80万+"],
            ["2028 Q4", "5 城覆盖", "日单 10000+"],
            ["2029", "B 轮 / 并购谈判", "年 GMV USD 1500万+"],
        ],
        [30, 60, 100],
    )

    # --- 16 附录 ---
    pdf.section("附录")
    sections.append(("附录", pdf.page_no()))
    pdf.subsection("A. 技术模块清单")
    pdf.bullet_list([
        "packages 订单表 — 完整生命周期字段（坐标、COD、transfer_code 等）",
        "stores / delivery_stores — 商家与配送站管理",
        "users — 多角色（admin/manager/operator/finance/courier/customer/merchant）",
        "finance_records — 自动财务记录",
        "audit_logs — 全操作审计",
        "verification_codes — 短信验证",
        "chat_messages — 客服聊天",
        "banners / tutorials / welcome_screens — 运营配置",
        "geocode_cache — 地理编码缓存",
        "delivery_photos — 配送照片存证",
    ])
    pdf.subsection("B. 联系方式")
    pdf.body(
        "公司名称：MARKET LINK EXPRESS\n"
        "总部地址：Yangon, Myanmar\n"
        "官方网站：www.market-link-express.com\n"
        "客服邮箱：marketlink982@gmail.com\n"
        "客户端：https://market-link-express.com\n"
        "后台管理：https://admin-market-link-express.com"
    )
    pdf.subsection("C. 免责声明")
    pdf.body(
        "本文件所载财务预测、市场估算及战略规划均为基于当前信息的前瞻性陈述，"
        "实际结果可能因市场条件、政策变化、竞争环境等因素产生重大差异。"
        "本文档不构成投资建议，投资者应自行进行尽职调查。"
        f"\n\n文档生成日期：{TODAY}"
    )

    pdf.output(OUTPUT_PATH)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Pages: {pdf.page_no()}")


if __name__ == "__main__":
    build_pdf()
