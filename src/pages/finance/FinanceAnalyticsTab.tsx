import React, { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import { FinanceRecord, Package } from "../../services/supabase";
import { TranslationKeys } from "../FinanceManagement.translations";
import {
  filterByTimePeriod,
  getDaysFromPeriod,
  isCompletedFinanceRecord,
  type FinanceTimePeriod,
} from "../FinanceManagement.helpers";

type Props = {
  t: TranslationKeys;
  isMobile: boolean;
  language: string;
  records: FinanceRecord[];
  packages: Package[];
};

/**
 * 财务「数据分析」Tab。图表库仅在进入本 Tab 时加载。
 * 计算仍用页面已拉取的 finances / packages，不新增接口。
 */
const FinanceAnalyticsTab: React.FC<Props> = ({
  t,
  isMobile,
  language,
  records,
  packages,
}) => {
  const [timePeriod, setTimePeriod] = useState<FinanceTimePeriod>("30days");

  const getPeriodLabel = (): string => {
    switch (timePeriod) {
      case "7days":
        return t.last7Days;
      case "30days":
        return t.last30Days;
      case "90days":
        return t.last90Days;
      case "all":
        return t.all;
      default:
        return t.last30Days;
    }
  };

  return (
          <div>
            <h3
              style={{
                marginTop: 0,
                marginBottom: "24px",
                color: "#0f172a",
                fontSize: "1.8rem",
              }}
            >
              📈 {t.dataAnalysis}
            </h3>

            {/* 时间范围选择 */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "16px",
                padding: isMobile ? "12px" : "20px",
                marginBottom: "24px",
                border: "1px solid #f8fafc",
                display: "flex",
                gap: isMobile ? "12px" : "16px",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ color: "#0f172a", fontWeight: "600", fontSize: "1rem" }}
              >
                📅 {t.analysisPeriod}：
              </div>
              {[
                { key: "7days", label: t.last7Days },
                { key: "30days", label: t.last30Days },
                { key: "90days", label: t.last90Days },
                { key: "all", label: t.all },
              ].map((period) => (
                <button
                  key={period.key}
                  onClick={() => setTimePeriod(period.key as typeof timePeriod)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: `2px solid ${timePeriod === period.key ? "#4facfe" : "#e2e8f0"}`,
                    background:
                      timePeriod === period.key
                        ? "rgba(79, 172, 254, 0.3)"
                        : "#f1f5f9",
                    color: "#0f172a",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: timePeriod === period.key ? "700" : "500",
                    transition: "all 0.3s ease",
                    boxShadow:
                      timePeriod === period.key
                        ? "0 4px 15px rgba(79, 172, 254, 0.4)"
                        : "none",
                  }}
                  onMouseOver={(e) => {
                    if (timePeriod !== period.key) {
                      e.currentTarget.style.background =
                        "#e2e8f0";
                    }
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    if (timePeriod !== period.key) {
                      e.currentTarget.style.background =
                        "#f1f5f9";
                    }
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {/* 关键指标卡片 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(280px, 1fr))",
                gap: "18px",
                marginBottom: "24px",
              }}
            >
              {(() => {
                // 根据选择的时间周期筛选数据
                const recentRecords = filterByTimePeriod(
                  records,
                  timePeriod,
                  "record_date",
                );
                const recentPackages = filterByTimePeriod(packages, timePeriod);

                // 获取天数用于日均计算
                const days =
                  getDaysFromPeriod(timePeriod) || Math.max(records.length, 1);

                const recentIncome = recentRecords
                  .filter(
                    (r) =>
                      isCompletedFinanceRecord(r) && r.record_type === "income",
                  )
                  .reduce((sum, r) => sum + (r.amount || 0), 0);
                const recentExpense = recentRecords
                  .filter(
                    (r) =>
                      isCompletedFinanceRecord(r) &&
                      r.record_type === "expense",
                  )
                  .reduce((sum, r) => sum + (r.amount || 0), 0);
                const recentPackageIncome = recentPackages
                  .filter((pkg) => pkg.status === "已送达")
                  .reduce((sum, pkg) => {
                    const price = parseFloat(
                      pkg.price?.replace(/[^\d.]/g, "") || "0",
                    );
                    return sum + price;
                  }, 0);
                const recentPackageCount = recentPackages.filter(
                  (pkg) => pkg.status === "已送达",
                ).length;

                // 计算增长率（与总数据对比）
                const totalIncome = records
                  .filter(
                    (r) =>
                      isCompletedFinanceRecord(r) && r.record_type === "income",
                  )
                  .reduce((sum, r) => sum + (r.amount || 0), 0);
                const avgDailyIncome =
                  totalIncome / Math.max(records.length, 1);
                const recentAvgDailyIncome = recentIncome / days;
                const incomeGrowth =
                  avgDailyIncome > 0
                    ? ((recentAvgDailyIncome - avgDailyIncome) /
                        avgDailyIncome) *
                      100
                    : 0;

                return (
                  <>
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(46, 213, 115, 0.2) 0%, rgba(46, 213, 115, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(46, 213, 115, 0.3)",
                        boxShadow: "0 8px 20px rgba(46, 213, 115, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: "12px",
                        }}
                      >
                        <div
                          style={{
                            color: "#0f172a",
                            fontSize: "0.95rem",
                            fontWeight: "500",
                          }}
                        >
                          💰 {getPeriodLabel()}
                          {t.recentIncome}
                        </div>
                        <div
                          style={{
                            padding: "4px 10px",
                            borderRadius: "12px",
                            background:
                              incomeGrowth >= 0
                                ? "rgba(46, 213, 115, 0.3)"
                                : "rgba(255, 107, 107, 0.3)",
                            color: incomeGrowth >= 0 ? "#2ecc71" : "#ff6b6b",
                            fontSize: "0.85rem",
                            fontWeight: "600",
                          }}
                        >
                          {incomeGrowth >= 0 ? "↗" : "↘"}{" "}
                          {Math.abs(incomeGrowth).toFixed(1)}%
                        </div>
                      </div>
                      <div
                        style={{
                          color: "#2ecc71",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {recentIncome.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.dailyAvg}: {(recentIncome / days).toLocaleString()}{" "}
                        MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(255, 107, 107, 0.2) 0%, rgba(255, 107, 107, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(255, 107, 107, 0.3)",
                        boxShadow: "0 8px 20px rgba(255, 107, 107, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "#0f172a",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          marginBottom: "12px",
                        }}
                      >
                        💸 {getPeriodLabel()}
                        {t.recentExpense}
                      </div>
                      <div
                        style={{
                          color: "#ff6b6b",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {recentExpense.toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.dailyAvg}: {(recentExpense / days).toLocaleString()}{" "}
                        MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(108, 92, 231, 0.2) 0%, rgba(108, 92, 231, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(108, 92, 231, 0.3)",
                        boxShadow: "0 8px 20px rgba(108, 92, 231, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "#0f172a",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          marginBottom: "12px",
                        }}
                      >
                        📦 {getPeriodLabel()}
                        {t.recentPackages}
                      </div>
                      <div
                        style={{
                          color: "#6c5ce7",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {recentPackageCount}{" "}
                        {language === "zh"
                          ? "个"
                          : language === "en"
                            ? ""
                            : "ခု"}
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.income}: {recentPackageIncome.toLocaleString()} MMK
                      </div>
                    </div>

                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(0, 206, 201, 0.2) 0%, rgba(0, 206, 201, 0.05) 100%)",
                        borderRadius: "16px",
                        padding: "24px",
                        border: "1px solid rgba(0, 206, 201, 0.3)",
                        boxShadow: "0 8px 20px rgba(0, 206, 201, 0.2)",
                      }}
                    >
                      <div
                        style={{
                          color: "#0f172a",
                          fontSize: "0.95rem",
                          fontWeight: "500",
                          marginBottom: "12px",
                        }}
                      >
                        💎 {getPeriodLabel()}
                        {t.recentProfit}
                      </div>
                      <div
                        style={{
                          color:
                            recentIncome - recentExpense >= 0
                              ? "#00cec9"
                              : "#ff6b6b",
                          fontSize: isMobile ? "1.5rem" : "2rem",
                          fontWeight: "700",
                          marginBottom: "8px",
                        }}
                      >
                        {(recentIncome - recentExpense).toLocaleString()} MMK
                      </div>
                      <div
                        style={{
                          color: "#64748b",
                          fontSize: "0.85rem",
                        }}
                      >
                        {t.profitMargin}:{" "}
                        {recentIncome > 0
                          ? (
                              ((recentIncome - recentExpense) / recentIncome) *
                              100
                            ).toFixed(1)
                          : 0}
                        %
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            {/* 月度趋势分析 */}
            <div
              style={{
                background: "#ffffff",
                borderRadius: "20px",
                padding: "24px",
                marginBottom: "24px",
                border: "1px solid #f8fafc",
                boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
              }}
            >
              <h4
                style={{
                  marginTop: 0,
                  color: "#0f172a",
                  marginBottom: "20px",
                  fontSize: "1.3rem",
                }}
              >
                📊 月度收支趋势
              </h4>

              {(() => {
                // 按月份分组统计
                const monthlyData: Record<
                  string,
                  {
                    income: number;
                    expense: number;
                    packageIncome: number;
                    packageCount: number;
                    courierKm: number;
                  }
                > = {};

                // 处理财务记录
                records.forEach((record) => {
                  if (!isCompletedFinanceRecord(record)) return;
                  const date = new Date(record.record_date);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                      income: 0,
                      expense: 0,
                      packageIncome: 0,
                      packageCount: 0,
                      courierKm: 0,
                    };
                  }

                  if (record.record_type === "income") {
                    monthlyData[monthKey].income += record.amount || 0;
                  } else {
                    monthlyData[monthKey].expense += record.amount || 0;
                  }
                });

                // 处理包裹数据
                packages.forEach((pkg) => {
                  const dateStr = pkg.created_at || pkg.create_time;
                  if (!dateStr) return;

                  const date = new Date(dateStr);
                  const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

                  if (!monthlyData[monthKey]) {
                    monthlyData[monthKey] = {
                      income: 0,
                      expense: 0,
                      packageIncome: 0,
                      packageCount: 0,
                      courierKm: 0,
                    };
                  }

                  if (pkg.status === "已送达") {
                    const price = parseFloat(
                      pkg.price?.replace(/[^\d.]/g, "") || "0",
                    );
                    monthlyData[monthKey].packageIncome += price;
                    monthlyData[monthKey].packageCount += 1;
                    monthlyData[monthKey].courierKm +=
                      pkg.delivery_distance || 0;
                  }
                });

                // 排序并获取最近6个月
                const sortedMonths = Object.keys(monthlyData).sort().slice(-6);

                if (sortedMonths.length === 0) {
                  return (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "40px",
                        color: "#64748b",
                      }}
                    >
                      暂无月度数据
                    </div>
                  );
                }

                // 准备图表数据
                const chartData = sortedMonths.map((month) => {
                  const data = monthlyData[month];
                  return {
                    month: `${month.split("-")[0]}年${month.split("-")[1]}月`,
                    monthShort: `${month.split("-")[1]}月`,
                    income: data.income,
                    expense: data.expense,
                    profit: data.income - data.expense,
                    packageIncome: data.packageIncome,
                    packageCount: data.packageCount,
                  };
                });

                return (
                  <div>
                    {/* 组合图表：柱状图 + 折线图 */}
                    <div style={{ marginBottom: "32px" }}>
                      <h5
                        style={{
                          color: "#0f172a",
                          marginBottom: "16px",
                          fontSize: "1.1rem",
                        }}
                      >
                        📊 收支对比（柱状图 + 利润趋势）
                      </h5>
                      <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart
                          data={chartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="monthShort"
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                          <Legend
                            wrapperStyle={{
                              color: "#0f172a",
                              paddingTop: "20px",
                            }}
                          />
                          <Bar
                            dataKey="income"
                            fill="#2ecc71"
                            name="收入"
                            radius={[8, 8, 0, 0]}
                          />
                          <Bar
                            dataKey="expense"
                            fill="#e74c3c"
                            name="支出"
                            radius={[8, 8, 0, 0]}
                          />
                          <Line
                            type="monotone"
                            dataKey="profit"
                            stroke="#00cec9"
                            strokeWidth={3}
                            name="利润"
                            dot={{ fill: "#00cec9", r: 5 }}
                            activeDot={{ r: 7 }}
                          />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 收入趋势折线图 */}
                    <div style={{ marginBottom: "32px" }}>
                      <h5
                        style={{
                          color: "#0f172a",
                          marginBottom: "16px",
                          fontSize: "1.1rem",
                        }}
                      >
                        📈 收入趋势（折线图）
                      </h5>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorIncome"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#2ecc71"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#2ecc71"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="monthShort"
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="income"
                            stroke="#2ecc71"
                            fillOpacity={1}
                            fill="url(#colorIncome)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 支出趋势折线图 */}
                    <div style={{ marginBottom: "32px" }}>
                      <h5
                        style={{
                          color: "#0f172a",
                          marginBottom: "16px",
                          fontSize: "1.1rem",
                        }}
                      >
                        📉 支出趋势（折线图）
                      </h5>
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          <defs>
                            <linearGradient
                              id="colorExpense"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="5%"
                                stopColor="#e74c3c"
                                stopOpacity={0.8}
                              />
                              <stop
                                offset="95%"
                                stopColor="#e74c3c"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="monthShort"
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                            tickFormatter={(value) =>
                              `${(value / 1000).toFixed(0)}K`
                            }
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                          <Area
                            type="monotone"
                            dataKey="expense"
                            stroke="#e74c3c"
                            fillOpacity={1}
                            fill="url(#colorExpense)"
                            strokeWidth={2}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    {/* 每日收支趋势（最近30天） */}
                    {(() => {
                      // 按日期统计最近30天的数据
                      const dailyData: Record<
                        string,
                        { income: number; expense: number; profit: number }
                      > = {};
                      const days = 30;
                      const today = new Date();

                      // 初始化最近30天的数据
                      for (let i = days - 1; i >= 0; i--) {
                        const date = new Date(today);
                        date.setDate(date.getDate() - i);
                        const dateKey = date.toISOString().slice(0, 10);
                        dailyData[dateKey] = {
                          income: 0,
                          expense: 0,
                          profit: 0,
                        };
                      }

                      // 统计财务记录
                      const recentRecords = filterByTimePeriod(
                        records,
                        "30days",
                        "record_date",
                      );
                      recentRecords.forEach((record) => {
                        if (!isCompletedFinanceRecord(record)) return;
                        const dateKey = record.record_date;
                        if (dailyData[dateKey]) {
                          if (record.record_type === "income") {
                            dailyData[dateKey].income += record.amount || 0;
                          } else {
                            dailyData[dateKey].expense += record.amount || 0;
                          }
                          dailyData[dateKey].profit =
                            dailyData[dateKey].income -
                            dailyData[dateKey].expense;
                        }
                      });

                      const dailyChartData = Object.entries(dailyData)
                        .map(([date, data]) => ({
                          date: new Date(date).toLocaleDateString("zh-CN", {
                            month: "short",
                            day: "numeric",
                          }),
                          dateFull: date,
                          income: data.income,
                          expense: data.expense,
                          profit: data.profit,
                        }))
                        .sort((a, b) => a.dateFull.localeCompare(b.dateFull));

                      return (
                        <div style={{ marginBottom: "32px" }}>
                          <h5
                            style={{
                              color: "#0f172a",
                              marginBottom: "16px",
                              fontSize: "1.1rem",
                            }}
                          >
                            📅 每日收支趋势（最近30天）
                          </h5>
                          <ResponsiveContainer width="100%" height={350}>
                            <LineChart
                              data={dailyChartData}
                              margin={{
                                top: 10,
                                right: 30,
                                left: 0,
                                bottom: 5,
                              }}
                            >
                              <CartesianGrid
                                strokeDasharray="3 3"
                                stroke="#e2e8f0"
                              />
                              <XAxis
                                dataKey="date"
                                stroke="#64748b"
                                style={{ fontSize: "11px" }}
                                angle={-45}
                                textAnchor="end"
                                height={80}
                              />
                              <YAxis
                                stroke="#64748b"
                                style={{ fontSize: "12px" }}
                                tickFormatter={(value) =>
                                  `${(value / 1000).toFixed(0)}K`
                                }
                              />
                              <Tooltip
                                contentStyle={{
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: "8px",
                                  color: "#0f172a",
                                }}
                                formatter={(value: number) =>
                                  `${value.toLocaleString()} MMK`
                                }
                              />
                              <Legend
                                wrapperStyle={{
                                  color: "#0f172a",
                                  paddingTop: "20px",
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="income"
                                stroke="#2ecc71"
                                strokeWidth={2}
                                name="收入"
                                dot={{ fill: "#2ecc71", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="expense"
                                stroke="#e74c3c"
                                strokeWidth={2}
                                name="支出"
                                dot={{ fill: "#e74c3c", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                              <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#00cec9"
                                strokeWidth={2}
                                name="利润"
                                strokeDasharray="5 5"
                                dot={{ fill: "#00cec9", r: 3 }}
                                activeDot={{ r: 5 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      );
                    })()}

                    {/* 月度详细数据表格 */}
                    <div
                      style={{
                        background: "#f8fafc",
                        borderRadius: "12px",
                        overflow: "hidden",
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <table
                        style={{ width: "100%", borderCollapse: "collapse" }}
                      >
                        <thead>
                          <tr
                            style={{ background: "#f1f5f9" }}
                          >
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "left",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              月份
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              收入
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              支出
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              利润
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              包裹数
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              包裹收入
                            </th>
                            <th
                              style={{
                                padding: "12px",
                                textAlign: "right",
                                color: "#0f172a",
                                fontSize: "0.9rem",
                              }}
                            >
                              配送距离
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {sortedMonths.map((month) => {
                            const data = monthlyData[month];
                            const profit = data.income - data.expense;

                            return (
                              <tr
                                key={month}
                                style={{
                                  borderBottom:
                                    "1px solid #e2e8f0",
                                }}
                              >
                                <td
                                  style={{
                                    padding: "12px",
                                    color: "#0f172a",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {month}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#2ecc71",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.income.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#e74c3c",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.expense.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: profit >= 0 ? "#00cec9" : "#ff6b6b",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {profit.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#334155",
                                    fontSize: "0.9rem",
                                  }}
                                >
                                  {data.packageCount} 个
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#6c5ce7",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.packageIncome.toLocaleString()}
                                </td>
                                <td
                                  style={{
                                    padding: "12px",
                                    textAlign: "right",
                                    color: "#fd79a8",
                                    fontSize: "0.9rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {data.courierKm.toFixed(2)} KM
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 业务分析 */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(350px, 1fr))",
                gap: isMobile ? "12px" : "20px",
              }}
            >
              {/* 包裹类型分布 - 饼图 */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid #f8fafc",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "#0f172a", marginBottom: "16px" }}
                >
                  📦 包裹类型分布
                </h4>
                {(() => {
                  const typeStats: Record<string, number> = {};
                  packages
                    .filter((pkg) => pkg.status === "已送达")
                    .forEach((pkg) => {
                      const type = pkg.package_type || "未知";
                      typeStats[type] = (typeStats[type] || 0) + 1;
                    });

                  const total = Object.values(typeStats).reduce(
                    (sum, count) => sum + count,
                    0,
                  );

                  if (total === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#64748b",
                        }}
                      >
                        暂无包裹数据
                      </div>
                    );
                  }

                  // 准备饼图数据
                  const pieColors = [
                    "#6c5ce7",
                    "#a29bfe",
                    "#fd79a8",
                    "#fdcb6e",
                    "#55efc4",
                    "#74b9ff",
                    "#0984e3",
                    "#00b894",
                  ];
                  const pieData = Object.entries(typeStats)
                    .map(([name, value], index) => ({
                      name,
                      value,
                      percentage: ((value / total) * 100).toFixed(1),
                    }))
                    .sort((a, b) => b.value - a.value);

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={pieColors[index % pieColors.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number) => `${value} 个`}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {pieData.map((item, index) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background: pieColors[index % pieColors.length],
                              }}
                            />
                            <span
                              style={{
                                color: "#0f172a",
                                fontSize: "0.85rem",
                                flex: 1,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                color: "#334155",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.value}个 ({item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 收入分类分布 - 饼图 */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid #f8fafc",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "#0f172a", marginBottom: "16px" }}
                >
                  💰 收入分类分布
                </h4>
                {(() => {
                  const recentRecords = filterByTimePeriod(
                    records,
                    timePeriod,
                    "record_date",
                  );
                  const incomeStats: Record<string, number> = {};

                  recentRecords
                    .filter(
                      (r) =>
                        isCompletedFinanceRecord(r) &&
                        r.record_type === "income",
                    )
                    .forEach((record) => {
                      const category = record.category || "其他";
                      incomeStats[category] =
                        (incomeStats[category] || 0) + (record.amount || 0);
                    });

                  const total = Object.values(incomeStats).reduce(
                    (sum, amount) => sum + amount,
                    0,
                  );

                  if (total === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#64748b",
                        }}
                      >
                        暂无收入数据
                      </div>
                    );
                  }

                  // 准备饼图数据
                  const incomeColors = [
                    "#2ecc71",
                    "#27ae60",
                    "#55efc4",
                    "#00b894",
                    "#00cec9",
                    "#74b9ff",
                    "#0984e3",
                    "#6c5ce7",
                  ];
                  const incomePieData = Object.entries(incomeStats)
                    .map(([name, value]) => ({
                      name,
                      value,
                      percentage: ((value / total) * 100).toFixed(1),
                    }))
                    .sort((a, b) => b.value - a.value);

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={incomePieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {incomePieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={incomeColors[index % incomeColors.length]}
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {incomePieData.map((item, index) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background:
                                  incomeColors[index % incomeColors.length],
                              }}
                            />
                            <span
                              style={{
                                color: "#0f172a",
                                fontSize: "0.85rem",
                                flex: 1,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                color: "#334155",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.value.toLocaleString()} MMK (
                              {item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 支出分类分布 - 饼图 */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid #f8fafc",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "#0f172a", marginBottom: "16px" }}
                >
                  💸 支出分类分布
                </h4>
                {(() => {
                  const recentRecords = filterByTimePeriod(
                    records,
                    timePeriod,
                    "record_date",
                  );
                  const expenseStats: Record<string, number> = {};

                  recentRecords
                    .filter(
                      (r) =>
                        isCompletedFinanceRecord(r) &&
                        r.record_type === "expense",
                    )
                    .forEach((record) => {
                      const category = record.category || "其他";
                      expenseStats[category] =
                        (expenseStats[category] || 0) + (record.amount || 0);
                    });

                  const total = Object.values(expenseStats).reduce(
                    (sum, amount) => sum + amount,
                    0,
                  );

                  if (total === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#64748b",
                        }}
                      >
                        暂无支出数据
                      </div>
                    );
                  }

                  // 准备饼图数据
                  const expenseColors = [
                    "#e74c3c",
                    "#c0392b",
                    "#ff6b6b",
                    "#ff7675",
                    "#fd79a8",
                    "#fdcb6e",
                    "#e17055",
                    "#d63031",
                  ];
                  const expensePieData = Object.entries(expenseStats)
                    .map(([name, value]) => ({
                      name,
                      value,
                      percentage: ((value / total) * 100).toFixed(1),
                    }))
                    .sort((a, b) => b.value - a.value);

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={expensePieData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }: any) =>
                              `${name}: ${(percent * 100).toFixed(0)}%`
                            }
                            outerRadius={100}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {expensePieData.map((entry, index) => (
                              <Cell
                                key={`cell-${index}`}
                                fill={
                                  expenseColors[index % expenseColors.length]
                                }
                              />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number) =>
                              `${value.toLocaleString()} MMK`
                            }
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {expensePieData.map((item, index) => (
                          <div
                            key={item.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "8px",
                            }}
                          >
                            <div
                              style={{
                                width: "12px",
                                height: "12px",
                                borderRadius: "3px",
                                background:
                                  expenseColors[index % expenseColors.length],
                              }}
                            />
                            <span
                              style={{
                                color: "#0f172a",
                                fontSize: "0.85rem",
                                flex: 1,
                              }}
                            >
                              {item.name}
                            </span>
                            <span
                              style={{
                                color: "#334155",
                                fontSize: "0.85rem",
                              }}
                            >
                              {item.value.toLocaleString()} MMK (
                              {item.percentage}%)
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* 骑手效率排名 - 柱状图 */}
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: "16px",
                  padding: "24px",
                  border: "1px solid #f8fafc",
                }}
              >
                <h4
                  style={{ marginTop: 0, color: "#0f172a", marginBottom: "16px" }}
                >
                  🏆 骑手效率排名 TOP 10
                </h4>
                {(() => {
                  const courierStats: Record<
                    string,
                    { count: number; km: number }
                  > = {};

                  packages
                    .filter(
                      (pkg) =>
                        pkg.status === "已送达" &&
                        pkg.courier &&
                        pkg.courier !== "待分配",
                    )
                    .forEach((pkg) => {
                      const courier = pkg.courier;
                      if (!courierStats[courier]) {
                        courierStats[courier] = { count: 0, km: 0 };
                      }
                      courierStats[courier].count++;
                      courierStats[courier].km += pkg.delivery_distance || 0;
                    });

                  const topCouriers = Object.entries(courierStats)
                    .sort((a, b) => b[1].count - a[1].count)
                    .slice(0, 10);

                  if (topCouriers.length === 0) {
                    return (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "40px",
                          color: "#64748b",
                        }}
                      >
                        暂无骑手数据
                      </div>
                    );
                  }

                  // 准备柱状图数据
                  const courierChartData = topCouriers.map(
                    ([courier, stats]) => ({
                      name:
                        courier.length > 8
                          ? `${courier.substring(0, 8)}...`
                          : courier,
                      fullName: courier,
                      count: stats.count,
                      km: stats.km,
                    }),
                  );

                  return (
                    <div>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={courierChartData}
                          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid
                            strokeDasharray="3 3"
                            stroke="#e2e8f0"
                          />
                          <XAxis
                            dataKey="name"
                            stroke="#64748b"
                            style={{ fontSize: "11px" }}
                            angle={-45}
                            textAnchor="end"
                            height={80}
                          />
                          <YAxis
                            stroke="#64748b"
                            style={{ fontSize: "12px" }}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: "#ffffff",
                              border: "1px solid #e2e8f0",
                              borderRadius: "8px",
                              color: "#0f172a",
                            }}
                            formatter={(value: number, name: string) => {
                              if (name === "count")
                                return [`${value} 单`, "配送单数"];
                              if (name === "km")
                                return [`${value.toFixed(1)} KM`, "配送距离"];
                              return value;
                            }}
                            labelFormatter={(label) =>
                              `骑手: ${courierChartData.find((d) => d.name === label)?.fullName || label}`
                            }
                          />
                          <Legend
                            wrapperStyle={{
                              color: "#0f172a",
                              paddingTop: "20px",
                            }}
                          />
                          <Bar
                            dataKey="count"
                            fill="#2ecc71"
                            name="配送单数"
                            radius={[8, 8, 0, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                      <div
                        style={{
                          marginTop: "16px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {topCouriers.map(([courier, stats], index) => {
                          const medals = [
                            "🥇",
                            "🥈",
                            "🥉",
                            "4️⃣",
                            "5️⃣",
                            "6️⃣",
                            "7️⃣",
                            "8️⃣",
                            "9️⃣",
                            "🔟",
                          ];
                          return (
                            <div
                              key={courier}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "12px",
                                padding: "8px",
                                background: "#f8fafc",
                                borderRadius: "8px",
                              }}
                            >
                              <div
                                style={{ fontSize: "1.2rem", width: "30px" }}
                              >
                                {medals[index] || `${index + 1}.`}
                              </div>
                              <div style={{ flex: 1 }}>
                                <div
                                  style={{
                                    color: "#0f172a",
                                    fontSize: "0.85rem",
                                    fontWeight: "600",
                                  }}
                                >
                                  {courier}
                                </div>
                                <div
                                  style={{
                                    color: "#64748b",
                                    fontSize: "0.75rem",
                                  }}
                                >
                                  {stats.count}单 · {stats.km.toFixed(1)} KM
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

  );
};

export default FinanceAnalyticsTab;
