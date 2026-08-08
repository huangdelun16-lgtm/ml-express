#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Generate MARKET LINK EXPRESS Mandalay investor recruitment PDF (Chinese, MMK)."""

from fpdf import FPDF
from datetime import date

FONT_PATH = "/usr/share/fonts/truetype/wqy/wqy-microhei.ttc"
OUTPUT_PATH = "/workspace/docs/investor/MARKET_LINK_EXPRESS_曼德勒同城快递_投资者招募说明书.pdf"
TODAY = date.today().strftime("%Y年%m月%d日")

# 文档内统一使用缅币；汇率仅作国际对照说明（会波动）
FX_NOTE = "约 1 USD ≈ 4,500 MMK（市场参考，波动较大，本文金额一律以缅币为准）"


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
        self.cell(
            0,
            10,
            f"MARKET LINK EXPRESS | 曼德勒投资者招募 | 机密 | 第 {self.page_no()} 页",
            align="C",
        )

    def cover(self):
        self.add_page()
        self.set_fill_color(26, 54, 93)
        self.rect(0, 0, 210, 297, "F")
        # gold accent bar
        self.set_fill_color(212, 175, 55)
        self.rect(0, 90, 210, 3, "F")
        self.set_text_color(255, 255, 255)
        self.set_font("wqy", size=14)
        self.ln(45)
        self.cell(0, 8, "CONFIDENTIAL  ·  投资者招募说明书", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(8)
        self.set_font("wqy", size=26)
        self.cell(0, 14, "MARKET LINK EXPRESS", align="C", new_x="LMARGIN", new_y="NEXT")
        self.set_font("wqy", size=15)
        self.cell(0, 10, "曼德勒同城快递项目", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(6)
        self.set_font("wqy", size=20)
        self.cell(0, 12, "投资者招募与合作说明书", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(4)
        self.set_font("wqy", size=11)
        self.cell(0, 8, "从曼德勒起步  ·  数字化五端平台已就绪  ·  金额以缅币（MMK）计", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(28)
        self.set_font("wqy", size=11)
        self.cell(0, 7, "本轮重点：曼德勒城市深耕与同城履约网络建设", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "目标融资：缅元 800,000,000 – 1,500,000,000", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "（八亿至十五亿缅元）", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(35)
        self.set_font("wqy", size=10)
        self.cell(0, 7, f"文档日期：{TODAY}", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "运营起点：Mandalay, Myanmar", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "官网：www.market-link-express.com", align="C", new_x="LMARGIN", new_y="NEXT")
        self.cell(0, 7, "邮箱：marketlink982@gmail.com", align="C", new_x="LMARGIN", new_y="NEXT")
        self.ln(10)
        self.set_font("wqy", size=9)
        self.cell(0, 6, "本文件仅供受邀投资者内部洽谈使用，请勿外传", align="C", new_x="LMARGIN", new_y="NEXT")

    def section(self, title):
        self._section_num += 1
        self.add_page()
        self.set_text_color(26, 54, 93)
        self.set_font("wqy", size=17)
        self.cell(0, 11, f"{self._section_num}. {title}", new_x="LMARGIN", new_y="NEXT")
        self.set_draw_color(212, 175, 55)
        self.set_line_width(0.8)
        self.line(10, self.get_y(), 200, self.get_y())
        self.set_line_width(0.2)
        self.ln(6)
        self.set_text_color(0, 0, 0)

    def subsection(self, title):
        self.ln(2)
        if self.get_y() > 260:
            self.add_page()
        self.set_font("wqy", size=12)
        self.set_text_color(44, 82, 130)
        self.cell(0, 8, title, new_x="LMARGIN", new_y="NEXT")
        self.set_text_color(0, 0, 0)
        self.ln(1)

    def body(self, text):
        self.set_font("wqy", size=10)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def highlight(self, text):
        self.set_fill_color(255, 248, 230)
        self.set_draw_color(212, 175, 55)
        self.set_font("wqy", size=10)
        x = self.l_margin
        w = self.w - self.l_margin - self.r_margin
        y = self.get_y()
        self.set_xy(x, y)
        self.multi_cell(w, 6, text, border=1, fill=True)
        self.ln(3)

    def bullet_list(self, items):
        self.set_font("wqy", size=10)
        w = self.w - self.l_margin - self.r_margin - 5
        for item in items:
            if self.get_y() > self.h - 25:
                self.add_page()
            self.set_x(15)
            self.multi_cell(w, 6, f"  -  {item}")
        self.ln(2)

    def table(self, headers, rows, col_widths=None):
        if col_widths is None:
            col_widths = [190 / len(headers)] * len(headers)
        total_w = sum(col_widths)
        if total_w > 190:
            scale = 190 / total_w
            col_widths = [c * scale for c in col_widths]
        self.set_font("wqy", size=9)
        self.set_fill_color(26, 54, 93)
        self.set_text_color(255, 255, 255)
        x0 = self.l_margin
        for i, h in enumerate(headers):
            self.set_x(x0 + sum(col_widths[:i]))
            self.cell(col_widths[i], 8, h, border=1, fill=True, align="C")
        self.ln()
        self.set_text_color(0, 0, 0)
        fill = False
        for row in rows:
            if self.get_y() > self.h - 30:
                self.add_page()
            y0 = self.get_y()
            x0 = self.l_margin
            heights = []
            self.set_fill_color(245, 248, 252) if fill else self.set_fill_color(255, 255, 255)
            for i, cell in enumerate(row):
                self.set_xy(x0 + sum(col_widths[:i]), y0)
                self.multi_cell(col_widths[i], 6, cell, border=1, align="L", fill=True)
                heights.append(self.get_y() - y0)
            self.set_y(y0 + max(heights, default=8))
            fill = not fill
        self.ln(3)


def build_pdf():
    pdf = InvestorPDF()
    pdf.cover()

    # 1 一页纸摘要 — 投资者最想先看
    pdf.section("一页纸摘要（给投资者的第一印象）")
    pdf.highlight(
        "我们不是从零画蓝图：MARKET LINK EXPRESS 已完成客户端 / 商家端 / 骑手端 / 后台管理"
        "五端系统的生产级开发与部署。本轮融资的核心用途，是把「已能跑的系统」变成"
        "「在曼德勒每天真正跑起来的同城配送生意」。"
    )
    pdf.subsection("为什么投我们")
    pdf.bullet_list([
        "产品已落地：官网 market-link-express.com、商家端、骑手 App、客户 App、后台调度已具备",
        "曼德勒切入：避开仰光超竞争与超高成本，先做第二大城市深耕，ROI 更清晰",
        "缅甸真实痛点：Facebook/TikTok 社交电商爆发，但最后一公里仍靠电话与纸笔，COD 刚需强",
        "商业闭环清晰：配送费 + COD 手续费 + 商家服务 + City Mall 佣金 + VIP 充值",
        "本轮只做一件事：在曼德勒证明日单量、单位经济与可复制模型",
    ])
    pdf.subsection("本轮关键数字（缅币）")
    pdf.table(
        ["项目", "数字（MMK）", "说明"],
        [
            ["本轮融资目标", "8亿 – 15亿", "曼德勒启动与 12–18 个月运营"],
            ["单笔最低认购", "5,000万", "便于本地投资者参与"],
            ["资金用途占比", "见第6章", "骑手网络35% / 市场25% / 运营20% / 研发12% / 储备8%"],
            ["12个月目标日单", "300 – 500单", "曼德勒城区网格化覆盖"],
            ["目标签约商家", "150 – 250家", "市场、药房、餐饮、社交电商卖家"],
            ["目标活跃骑手", "30 – 60人", "网格站长制管理"],
            ["盈亏平衡路径", "18–24个月", "取决于日单与骑手人效"],
        ],
        [45, 40, 105],
    )
    pdf.body(f"汇率说明：{FX_NOTE}。所有对内运营、结算、报表建议统一用缅币，降低沟通摩擦。")

    # 2 公司与项目
    pdf.section("公司与项目是什么")
    pdf.subsection("公司定位")
    pdf.body(
        "MARKET LINK EXPRESS（ML Express）是面向缅甸市场的同城快递与本地商业配送数字化平台。"
        "我们连接三类人：需要寄件/收件的消费者、需要履约与代收款的商家、需要稳定订单的骑手。"
        "品牌主张：专业、可靠、透明、可追踪。"
    )
    pdf.subsection("已具备的真实能力（不是规划）")
    pdf.table(
        ["端", "现状", "对投资者的意义"],
        [
            ["客户端 Web/App", "下单、追踪、VIP、多语言", "获客入口已存在，无需再造产品"],
            ["商家端 Web/App", "接单、商品、对账、休假", "可快速签约并让商家自助经营"],
            ["骑手端 App", "接单、导航、状态、拍照", "履约效率可度量、可审计"],
            ["后台管理", "调度、财务、告警、设置", "投资人可要求透明经营数据看板"],
            ["City Mall", "同城商场+购物车", "配送之外的第二增长曲线"],
            ["COD/财务", "代收款与财务记录", "贴合缅甸主流支付习惯"],
        ],
        [40, 55, 95],
    )
    pdf.subsection("为什么现在适合找投资")
    pdf.body(
        "技术底座已完成，边际成本从「再开发一个 App」变成「复制一个城市的运营」。"
        "投资者的钱主要进入市场、骑手、商家拓展与本地运营，而不是漫长的纯研发消耗。"
        "这使本轮资金效率显著高于「只有想法、没有产品」的早期项目。"
    )

    # 3 曼德勒真实市场分析
    pdf.section("曼德勒市场真实情况分析")
    pdf.subsection("为什么从曼德勒开始，而不是仰光")
    pdf.bullet_list([
        "曼德勒都市圈人口约 150–160 万级，是缅甸第二大城市与上缅甸商业枢纽",
        "仰光电商份额高、竞争与运营成本更高；曼德勒数字化渗透更低，先发窗口更清晰",
        "项目系统默认区域已支持曼德勒（MDY）地理编码与订单前缀，技术切换成本低",
        "团队与本地网络更易在曼德勒建立网格站、地推与骑手供给",
        "先在一个城市打穿模型，再复制到内比都、仰光等城市，符合投资者「可复制」偏好",
    ])
    pdf.subsection("当前真实市场画像（2025–2026）")
    pdf.table(
        ["维度", "现状判断", "对我们的含义"],
        [
            ["消费习惯", "Facebook / TikTok 社交下单为主", "商家需要可靠同城取送与 COD"],
            ["支付", "COD 仍占重要比例；KBZPay/Wave 增长快", "必须做好代收与电子钱包并行"],
            ["履约", "大量依赖摩托帮、电话派单、纸质记录", "数字化调度有明显效率差"],
            ["价格敏感", "客单价与配送费对价格极敏感", "定价要透明，商家套餐要灵活"],
            ["信任", "客户怕丢件、商家怕钱收不回", "追踪+拍照签收+财务对账是卖点"],
            ["语言", "缅语为主，中英也有场景", "三语产品已具备本地优势"],
        ],
        [35, 70, 85],
    )
    pdf.subsection("目标客群（曼德勒）")
    pdf.table(
        ["客群", "痛点", "我们怎么赚钱"],
        [
            ["社交电商卖家", "发货乱、COD 难对账", "配送费 + COD 手续费"],
            ["市场/药店/餐饮", "临时叫车贵且不可追踪", "月结/套餐 + 订阅"],
            ["个人用户", "不知道多少钱、到哪了", "按单配送费 + VIP"],
            ["同城商户（Mall）", "有货没配送能力", "交易佣金 + 配送"],
        ],
        [40, 70, 80],
    )
    pdf.subsection("曼德勒可服务市场规模（估算）")
    pdf.body(
        "以下为基于公开人口与本地业态的经营估算，供投资判断，不构成业绩承诺："
    )
    pdf.table(
        ["指标", "保守", "基准", "乐观"],
        [
            ["城区日均可寻址订单需求", "800单", "1,500单", "3,000单"],
            ["12个月末我们日单占有", "200单", "400单", "700单"],
            ["平均每单收入（含附加）", "3,500 MMK", "4,500 MMK", "5,500 MMK"],
            ["月平台相关收入（约）", "2,100万", "5,400万", "1.15亿"],
        ],
        [70, 40, 40, 40],
    )
    pdf.body(
        "说明：平均每单收入含配送服务费及部分 COD/增值分摊；骑手分成后公司毛利另计。"
        "曼德勒同城配送市场目前高度碎片化，不存在统一的数字化龙头，这是进入时机。"
    )

    # 4 商业模式
    pdf.section("怎么赚钱：商业模式（投资者最关心）")
    pdf.subsection("收入结构")
    pdf.table(
        ["收入项", "定价参考（MMK）", "何时成熟"],
        [
            ["同城配送费", "2,500 – 8,000 /单（距重时效）", "立刻"],
            ["急送/定时达加价", "+1,000 – 3,000 /单", "立刻"],
            ["COD 代收手续费", "代收金额的 1% – 3%", "0–3个月"],
            ["商家月费/套餐", "30,000 – 150,000 /月", "3–6个月"],
            ["City Mall 佣金", "成交额 5% – 15%", "6–12个月"],
            ["VIP 充值权益", "预充 50,000 起，享折扣/优先", "3–9个月"],
            ["Banner/本地广告", "按周/月位售卖", "6个月后"],
        ],
        [45, 75, 70],
    )
    pdf.subsection("单位经济（曼德勒目标模型）")
    pdf.table(
        ["指标", "目标值", "解读"],
        [
            ["客单配送费", "3,500 – 5,000 MMK", "对个人与商家可接受区间"],
            ["骑手成本占比", "配送费的 55% – 65%", "用密度与顺路单压低"],
            ["平台毛利/单", "1,000 – 2,000 MMK", "叠加 COD 后更高"],
            ["骑手日人效", "20 – 35 单", "网格化后可达"],
            ["商家获客成本 CAC", "50,000 – 150,000 MMK", "地推+试用期后回收"],
            ["商家月贡献", "80,000 – 300,000 MMK", "决定 LTV"],
        ],
        [50, 55, 85],
    )
    pdf.highlight(
        "投资人要看的不是「故事有多大」，而是：单日能否稳定出单、每单是否赚钱、"
        "商家是否续费、骑手是否留得住。本项目以这四项作为曼德勒阶段的核心经营看板。"
    )

    # 5 需要投资多少
    pdf.section("需要投资多少（缅币）")
    pdf.subsection("本轮融资区间")
    pdf.body(
        "本轮建议融资总额：缅元 800,000,000 至 1,500,000,000"
        "（八亿至十五亿缅元）。"
        "取中位方案 1,200,000,000 MMK（十二亿缅元）作为详细拆解基准。"
    )
    pdf.subsection("十二亿缅元资金用途明细")
    pdf.table(
        ["用途", "金额（MMK）", "占比", "具体花在哪"],
        [
            ["骑手网络与履约", "420,000,000", "35%", "招募、头盔马甲、油补/单量补贴、站点押金、保险"],
            ["市场与获客", "300,000,000", "25%", "FB/TikTok、地推提成、首单券、商家0佣试用"],
            ["本地运营中心", "240,000,000", "20%", "曼德勒办公室/仓配点、客服、站长、水电通讯"],
            ["产品与系统强化", "144,000,000", "12%", "派单优化、钱包对接、打印/对账、稳定性"],
            ["合规与现金储备", "96,000,000", "8%", "执照法务、应急储备、汇率与坏账缓冲"],
        ],
        [40, 40, 25, 85],
    )
    pdf.subsection("分档认购（方便本地投资者）")
    pdf.table(
        ["档位", "出资金额（MMK）", "适合对象", "权益方向（协商）"],
        [
            ["天使档", "5,000万 – 1亿", "个人天使/亲友联合", "小股权或利润分红权"],
            ["核心档", "1亿 – 3亿", "本地企业家", "股权 + 董事会观察席"],
            ["领投档", "3亿 – 8亿+", "领投机构/产业方", "较大股权 + 重大事项否决权协商"],
        ],
        [30, 45, 50, 65],
    )
    pdf.body(
        "最终股权比例按投前估值谈判确定。示例（仅供讨论，非要约）："
        "若投前估值定为 3,000,000,000 – 5,000,000,000 MMK（三十亿至五十亿缅元），"
        "本轮融资 12 亿对应约 19% – 29% 股权区间（按投后计算会更低）。"
        "具体以尽职调查与正式协议为准。"
    )

    # 6 怎样投资
    pdf.section("怎样投资：路径、流程与保障")
    pdf.subsection("可选择的投资方式")
    pdf.table(
        ["方式", "说明", "适合谁"],
        [
            ["股权投资", "增资扩股，共享长期增值与退出收益", "看好3–5年平台价值的投资者"],
            ["可转债/可转股", "先债权保底利息，达标后转股", "想降低早期风险的投资者"],
            ["城市合伙/利润分成", "聚焦曼德勒利润分成，不稀释全国股权", "本地资源型合作方"],
            ["战略资源入股", "场地、车队、商户渠道作价入股", "有实体网络的产业伙伴"],
        ],
        [40, 85, 65],
    )
    pdf.subsection("标准投资流程（建议 4–6 周）")
    pdf.bullet_list([
        "第1步：签署保密协议（NDA），获取完整数据包与系统演示账号",
        "第2步：管理层路演 + 曼德勒实地走访（市场、站点候选、商家样本）",
        "第3步：财务与技术尽调（代码仓库、域名、数据库权限、流水与合同）",
        "第4步：条款清单（Term Sheet）：金额、估值、股权、董事会、信息权",
        "第5步：正式协议（增资协议/股东协议）与资金到账里程碑",
        "第6步：资金按预算账户拨付；每月经营报告与季度董事会",
    ])
    pdf.subsection("资金拨付建议（保护双方）")
    pdf.table(
        ["批次", "比例", "触发条件"],
        [
            ["首批", "40%", "协议生效、公司账户就绪、曼德勒运营负责人到位"],
            ["第二批", "35%", "日均订单连续 30 天达 100 单 或 签约商家达 80 家"],
            ["第三批", "25%", "日均订单连续 30 天达 250 单 或 达成约定毛利指标"],
        ],
        [30, 30, 130],
    )
    pdf.highlight(
        "我们欢迎「分批到账 + 里程碑拨付」。这能降低投资者风险，也倒逼团队用结果说话。"
    )

    # 7 怎样管理
    pdf.section("怎样管理：治理、透明与风控")
    pdf.subsection("治理结构建议")
    pdf.bullet_list([
        "设立曼德勒项目经营委员会：创始人/CEO、运营负责人、财务负责人、投资人代表",
        "重大事项需投资人知情或同意：超预算支出、再融资、股权质押、核心资产处置",
        "银行账户双签或「经营账户 + 监管账户」分离：日常运营与投资款用途可追踪",
        "每月提供：订单量、GMV、毛利、现金余额、商家数、骑手数、客诉率",
        "每季董事会/经营会：对照预算复盘，调整下一季投放",
    ])
    pdf.subsection("投资者可获得的信息权")
    pdf.table(
        ["频率", "内容"],
        [
            ["每周（前6个月）", "核心KPI快报：日单、完成率、异常单、现金COD在途"],
            ["每月", "经营报告 + 资金使用对照预算表"],
            ["每季", "财务简报、下一季计划、风险清单"],
            ["随时（重大）", "安全事故、监管变化、大额坏账、系统重大故障"],
        ],
        [45, 145],
    )
    pdf.subsection("运营管理体系（曼德勒）")
    pdf.bullet_list([
        "城市网格：把曼德勒拆成若干配送网格，每格设站长，对时效与客诉负责",
        "骑手管理：App 接单、拍照签收、评分；好骑手优先派单，差骑手淘汰",
        "商家成功：签约后7天内完成首单；专人教商家后台/App；月度对账会",
        "客服：缅/中/英三语响应；丢失损坏有标准赔付流程",
        "财务：COD 日清周结；骑手结算 T+1；坏账与短款有追责",
        "系统：后台实时看单；异常告警；审计日志可回溯",
    ])
    pdf.subsection("关键风险与应对")
    pdf.table(
        ["风险", "等级", "应对"],
        [
            ["政治与宏观波动", "中高", "轻资产、短账期、现金储备、多网点不押单一区域"],
            ["缅币汇率波动", "中", "收入成本同币种匹配；大额采购锁定；报表双币种备注"],
            ["COD 现金风险", "中", "额度管控、商家信用分级、骑手押金、日对账"],
            ["骑手流失", "中", "即时结算、单量保障、装备与保险、等级奖金"],
            ["竞争降价", "中", "拼服务质量与对账能力，不陷入长期自杀式补贴"],
            ["系统故障", "低中", "云监控、备份、关键路径人工兜底SOP"],
        ],
        [40, 25, 125],
    )

    # 8 怎样开拓市场
    pdf.section("怎样开拓市场（曼德勒打法）")
    pdf.subsection("90天攻坚计划")
    pdf.table(
        ["阶段", "时间", "动作", "验收"],
        [
            ["准备期", "第1–30天", "租点、招站长、训骑手、签种子商家30家", "系统日活跑通、日单30+"],
            ["引爆期", "第31–60天", "市场地推、首单补贴、KOL种草、药店餐饮攻坚", "日单100+、商家80+"],
            ["稳定期", "第61–90天", "网格加密、去过度补贴、上套餐月结", "日单200+、复购可见"],
        ],
        [30, 30, 80, 50],
    )
    pdf.subsection("商家获取（最重要的增长发动机）")
    pdf.bullet_list([
        "阵地：Zay Cho、各区市场、手机配件街、服装批发、药房连锁、餐厅",
        "话术卖点：可追踪、COD自动对账、小票/打印、休假一键打烊、比摩托帮更省心",
        "激励：前 60–90 天 0 平台佣金或配送折扣；介绍同行商家给奖励",
        "留存：客户成功每周回访；丢件极速处理；月报显示帮商家省了多少时间与纠纷",
    ])
    pdf.subsection("C端与骑手两端飞轮")
    pdf.bullet_list([
        "C端：下载领券、邀请好友、VIP充值满赠；重点做「急送」心智",
        "骑手：保证高峰单量；好评奖金；周冠军；装备统一提升品牌辨识度",
        "飞轮：商家多 → 单多 → 骑手赚得多 → 时效更好 → 客户更信任 → 商家更愿续费",
    ])
    pdf.subsection("12个月后如何扩城（投资者退出叙事的前奏）")
    pdf.body(
        "曼德勒验证成功的标准建议定义为："
        "日均订单稳定 ≥ 400；单位经济为正；商家续费率 ≥ 70%；骑手月流失率可控。"
        "达标后，用同一套系统复制到："
    )
    pdf.bullet_list([
        "内比都（政府与商务往来件）",
        "仰光分区试点（不再全城撒网，先选 2–3 个高密度镇区）",
        "上缅甸卫星城（围绕曼德勒商圈做次日达/专线）",
    ])

    # 9 财务预测
    pdf.section("财务预测框架（缅币，基准情景）")
    pdf.body("以下为经营模型测算，供讨论用，实际以落地数据校准。单位：百万缅元（MMK million）。")
    pdf.table(
        ["指标", "第6个月", "第12个月", "第18个月", "第24个月"],
        [
            ["日均订单", "120", "400", "650", "900"],
            ["月GMV（约）", "16", "54", "88", "122"],
            ["月平台净收入（约）", "4", "16", "30", "45"],
            ["月运营成本（约）", "18", "22", "28", "32"],
            ["月经营结果", "投入期", "收窄亏损", "接近打平", "转正"],
        ],
        [45, 35, 35, 35, 40],
    )
    pdf.subsection("回本与回报逻辑（投资者最想听清楚）")
    pdf.bullet_list([
        "短期回报：曼德勒现金流转正后，可讨论分红或股东借款利息（若选可转债结构）",
        "中期回报：18–36 个月引入下一轮融资时估值提升带来账面回报",
        "长期退出：被区域物流/电商/电信战略并购，或扩大至全国后寻求更大轮融资",
        "本地投资者额外价值：可优先获得区域代理、仓配合作、广告位与供应链协同",
    ])
    pdf.table(
        ["情景", "24个月末估测企业价值（MMK）", "对本轮投资含义"],
        [
            ["保守", "40亿 – 60亿", "若持有约20%股权，账面可达较高倍数但仍依赖执行"],
            ["基准", "80亿 – 120亿", "曼德勒打穿+开始第二城，估值台阶上移"],
            ["乐观", "150亿+", "双城或全国叙事成立，具备下一轮溢价"],
        ],
        [30, 70, 90],
    )
    pdf.body("以上估值区间为讨论框架，不构成承诺或要约。")

    # 10 里程碑
    pdf.section("里程碑与KPI（用来管理投资人预期）")
    pdf.table(
        ["时间", "里程碑", "核心KPI（MMK/运营）"],
        [
            ["第1个月", "曼德勒运营上线", "站点1个、骑手15、商家30、日单30"],
            ["第3个月", "产品市场契合验证", "日单100、完成率≥92%、客诉可控"],
            ["第6个月", "网格成型", "日单200、商家120、骑手40"],
            ["第9个月", "单位经济转正趋势", "单均毛利稳定、补贴下降"],
            ["第12个月", "城市模型可复制", "日单400、月收入达标、准备第二城"],
            ["第18–24个月", "规模化", "第二城启动或曼德勒日单700+"],
        ],
        [30, 50, 110],
    )

    # 11 竞争与护城河
    pdf.section("竞争格局与我们的壁垒")
    pdf.table(
        ["对比项", "传统摩托帮", "仅有电话的小公司", "ML Express"],
        [
            ["下单体验", "聊天/电话", "电话", "App/Web 三语下单"],
            ["追踪", "几乎没有", "偶尔有", "实时状态+地图"],
            ["COD对账", "易扯皮", "手工账", "系统自动对账"],
            ["商家工具", "无", "弱", "经营中心/休假/商品"],
            ["可复制性", "靠人", "靠人", "系统+SOP可扩城"],
        ],
        [35, 40, 50, 65],
    )
    pdf.body(
        "我们的壁垒不是「烧钱补贴」，而是：五端系统 + 本地运营 SOP + COD/财务信任 + 曼德勒密度。"
        "密度一旦形成，后进者要用更高成本抢商家和骑手。"
    )

    # 12 团队与使用资金纪律
    pdf.section("团队、执行纪律与投资者保护条款建议")
    pdf.subsection("执行原则")
    pdf.bullet_list([
        "先利润模型，后规模：曼德勒不打无效价格战",
        "每周看四件事：日单、完成率、单均毛利、现金余额",
        "投资款专款专用，超预算需委员会批准",
        "核心岗位与骑手骨干绑定绩效，而不是只发固定工资",
    ])
    pdf.subsection("建议写入协议的投资者保护")
    pdf.bullet_list([
        "信息权与检查权（合理频次）",
        "反稀释条款（后续融资时按约定机制）",
        "领售/随售权（退出时保护小股东）",
        "创始人竞业与股权成熟（Vesting）",
        "里程碑未达成时的治理加强或预算冻结机制",
    ])

    # 13 号召行动
    pdf.section("邀请您一起把曼德勒同城配送做成标准")
    pdf.body(
        "缅甸同城履约正在从「熟人摩托」走向「可信平台」。"
        "MARKET LINK EXPRESS 已经把最难的系统层走完了；"
        "现在缺的是：在曼德勒把密度做出来的资本与本地伙伴。"
    )
    pdf.highlight(
        "如果您认同「从曼德勒打穿再复制」的路径，请与我们预约：\n"
        "1）产品演示（客户下单 / 商家后台 / 骑手 App / 管理调度）\n"
        "2）曼德勒市场一日走访\n"
        "3）条款与尽调启动\n\n"
        "联系邮箱：marketlink982@gmail.com\n"
        "官网：www.market-link-express.com\n"
        f"文档日期：{TODAY}"
    )
    pdf.subsection("给投资者的三句话")
    pdf.bullet_list([
        "投的是已经能运行的系统，不是 PPT",
        "钱主要花在曼德勒订单密度，不是无底洞研发",
        "用里程碑拨付与月度透明报表管理风险",
    ])

    # 14 附录
    pdf.section("附录：术语与免责声明")
    pdf.subsection("术语")
    pdf.bullet_list([
        "MMK：缅甸元（缅币）",
        "COD：货到付款 / 代收款",
        "GMV：成交总额（含代收与配送相关流水口径需在报表中定义）",
        "CAC：获客成本",
        "VIP：预充值会员权益",
        "网格：城市内按区域划分的配送责任区",
    ])
    pdf.subsection("免责声明")
    pdf.body(
        "本说明书所含市场数据、财务测算、估值区间与业务规划均为基于当前信息的前瞻性陈述，"
        "受宏观经济、政策、汇率、竞争与执行因素影响，实际结果可能显著不同。"
        "本文不构成投资邀约、证券发行或任何具有法律约束力的承诺。"
        "任何投资决策应基于您独立的尽职调查与专业顾问意见。"
        "未经书面许可，请勿复制或向第三方传播本文全文。"
        f"\n\nMARKET LINK EXPRESS  ·  {TODAY}"
    )

    pdf.output(OUTPUT_PATH)
    print(f"PDF generated: {OUTPUT_PATH}")
    print(f"Pages: {pdf.page_no()}")


if __name__ == "__main__":
    build_pdf()
