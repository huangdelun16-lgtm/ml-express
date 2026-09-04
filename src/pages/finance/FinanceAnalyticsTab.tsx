import React, { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

const INK = "#0f172a";
const IN = "#0d9488";
const OUT = "#be123c";
const PROFIT = "#1677ff";
const GRID = "#e8edf3";
const AXIS = "#94a3b8";
const PIE = [
  "#0f172a",
  "#0d9488",
  "#1677ff",
  "#d97706",
  "#64748b",
  "#be123c",
  "#334155",
  "#94a3b8",
];

const tooltipStyle = {
  backgroundColor: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  color: INK,
  fontSize: 12,
};

const formatMmk = (value: number) => `${(value || 0).toLocaleString()} MMK`;

const EmptyHint: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="finance-an-empty">{children}</div>
);

const FinanceAnalyticsTab: React.FC<Props> = ({
  t,
  isMobile,
  language,
  records,
  packages,
}) => {
  const [timePeriod, setTimePeriod] = useState<FinanceTimePeriod>("30days");
  const chartH = isMobile ? 260 : 320;
  const pkgUnit =
    language === "zh" ? "个" : language === "en" ? "pkgs" : "ခု";

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

  const kpis = useMemo(() => {
    const recentRecords = filterByTimePeriod(
      records,
      timePeriod,
      "record_date",
    );
    const recentPackages = filterByTimePeriod(packages, timePeriod);
    const days =
      getDaysFromPeriod(timePeriod) || Math.max(records.length, 1);
    const recentIncome = recentRecords
      .filter((r) => isCompletedFinanceRecord(r) && r.record_type === "income")
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const recentExpense = recentRecords
      .filter((r) => isCompletedFinanceRecord(r) && r.record_type === "expense")
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const delivered = recentPackages.filter((pkg) => pkg.status === "已送达");
    const recentPackageIncome = delivered.reduce((sum, pkg) => {
      const price = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
      return sum + price;
    }, 0);
    const totalIncome = records
      .filter((r) => isCompletedFinanceRecord(r) && r.record_type === "income")
      .reduce((sum, r) => sum + (r.amount || 0), 0);
    const avgDailyIncome = totalIncome / Math.max(records.length, 1);
    const recentAvgDailyIncome = recentIncome / days;
    const incomeGrowth =
      avgDailyIncome > 0
        ? ((recentAvgDailyIncome - avgDailyIncome) / avgDailyIncome) * 100
        : 0;
    const profit = recentIncome - recentExpense;
    return {
      days,
      recentIncome,
      recentExpense,
      recentPackageIncome,
      recentPackageCount: delivered.length,
      incomeGrowth,
      profit,
      margin: recentIncome > 0 ? (profit / recentIncome) * 100 : 0,
    };
  }, [records, packages, timePeriod]);

  const monthly = useMemo(() => {
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
        const price = parseFloat(pkg.price?.replace(/[^\d.]/g, "") || "0");
        monthlyData[monthKey].packageIncome += price;
        monthlyData[monthKey].packageCount += 1;
        monthlyData[monthKey].courierKm += pkg.delivery_distance || 0;
      }
    });
    const sortedMonths = Object.keys(monthlyData).sort().slice(-6);
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
    return { monthlyData, sortedMonths, chartData };
  }, [records, packages]);

  const dailyChartData = useMemo(() => {
    const dailyData: Record<
      string,
      { income: number; expense: number; profit: number }
    > = {};
    const today = new Date();
    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().slice(0, 10);
      dailyData[dateKey] = { income: 0, expense: 0, profit: 0 };
    }
    filterByTimePeriod(records, "30days", "record_date").forEach((record) => {
      if (!isCompletedFinanceRecord(record)) return;
      const dateKey = record.record_date;
      if (!dailyData[dateKey]) return;
      if (record.record_type === "income") {
        dailyData[dateKey].income += record.amount || 0;
      } else {
        dailyData[dateKey].expense += record.amount || 0;
      }
      dailyData[dateKey].profit =
        dailyData[dateKey].income - dailyData[dateKey].expense;
    });
    return Object.entries(dailyData)
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
  }, [records]);

  const typePie = useMemo(() => {
    const typeStats: Record<string, number> = {};
    packages
      .filter((pkg) => pkg.status === "已送达")
      .forEach((pkg) => {
        const type = pkg.package_type || "未知";
        typeStats[type] = (typeStats[type] || 0) + 1;
      });
    const total = Object.values(typeStats).reduce((sum, count) => sum + count, 0);
    const data = Object.entries(typeStats)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total ? ((value / total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.value - a.value);
    return { total, data };
  }, [packages]);

  const incomePie = useMemo(() => {
    const recentRecords = filterByTimePeriod(
      records,
      timePeriod,
      "record_date",
    );
    const incomeStats: Record<string, number> = {};
    recentRecords
      .filter((r) => isCompletedFinanceRecord(r) && r.record_type === "income")
      .forEach((record) => {
        const category = record.category || "其他";
        incomeStats[category] =
          (incomeStats[category] || 0) + (record.amount || 0);
      });
    const total = Object.values(incomeStats).reduce((sum, amount) => sum + amount, 0);
    const data = Object.entries(incomeStats)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total ? ((value / total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.value - a.value);
    return { total, data };
  }, [records, timePeriod]);

  const expensePie = useMemo(() => {
    const recentRecords = filterByTimePeriod(
      records,
      timePeriod,
      "record_date",
    );
    const expenseStats: Record<string, number> = {};
    recentRecords
      .filter((r) => isCompletedFinanceRecord(r) && r.record_type === "expense")
      .forEach((record) => {
        const category = record.category || "其他";
        expenseStats[category] =
          (expenseStats[category] || 0) + (record.amount || 0);
      });
    const total = Object.values(expenseStats).reduce((sum, amount) => sum + amount, 0);
    const data = Object.entries(expenseStats)
      .map(([name, value]) => ({
        name,
        value,
        percentage: total ? ((value / total) * 100).toFixed(1) : "0.0",
      }))
      .sort((a, b) => b.value - a.value);
    return { total, data };
  }, [records, timePeriod]);

  const couriers = useMemo(() => {
    const courierStats: Record<string, { count: number; km: number }> = {};
    packages
      .filter(
        (pkg) =>
          pkg.status === "已送达" && pkg.courier && pkg.courier !== "待分配",
      )
      .forEach((pkg) => {
        const courier = pkg.courier as string;
        if (!courierStats[courier]) courierStats[courier] = { count: 0, km: 0 };
        courierStats[courier].count += 1;
        courierStats[courier].km += pkg.delivery_distance || 0;
      });
    const top = Object.entries(courierStats)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10);
    const chartData = top.map(([courier, stats]) => ({
      name: courier.length > 8 ? `${courier.substring(0, 8)}…` : courier,
      fullName: courier,
      count: stats.count,
      km: stats.km,
    }));
    return { top, chartData };
  }, [packages]);

  const periods: { key: FinanceTimePeriod; label: string }[] = [
    { key: "7days", label: t.last7Days },
    { key: "30days", label: t.last30Days },
    { key: "90days", label: t.last90Days },
    { key: "all", label: t.all },
  ];

  const tickK = (value: number) => `${(value / 1000).toFixed(0)}K`;

  return (
    <div className="finance-an">
      <div className="finance-an-toolbar">
        <div>
          <p className="finance-an-kicker">{t.analysisPeriod}</p>
          <h3 className="finance-an-title">{t.dataAnalysis}</h3>
        </div>
        <div className="finance-an-periods" role="tablist" aria-label={t.analysisPeriod}>
          {periods.map((period) => (
            <button
              key={period.key}
              type="button"
              role="tab"
              aria-selected={timePeriod === period.key}
              className={`finance-an-period${timePeriod === period.key ? " is-on" : ""}`}
              onClick={() => setTimePeriod(period.key)}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="finance-an-metrics">
        <article className="finance-an-metric finance-an-metric--pkg">
          <div className="finance-an-metric__label">
            {getPeriodLabel()}
            {t.recentPackages}
          </div>
          <div className="finance-an-metric__value">
            {kpis.recentPackageCount} {pkgUnit}
          </div>
          <div className="finance-an-metric__hint">
            {t.income}: {formatMmk(kpis.recentPackageIncome)}
          </div>
        </article>
        <article className="finance-an-metric finance-an-metric--in">
          <div className="finance-an-metric__top">
            <div className="finance-an-metric__label">
              {getPeriodLabel()}
              {t.recentIncome}
            </div>
            <span
              className={`finance-an-metric__delta finance-an-metric__delta--${kpis.incomeGrowth >= 0 ? "up" : "down"}`}
            >
              {kpis.incomeGrowth >= 0 ? "+" : "−"}
              {Math.abs(kpis.incomeGrowth).toFixed(1)}%
            </span>
          </div>
          <div className="finance-an-metric__value">
            {formatMmk(kpis.recentIncome)}
          </div>
          <div className="finance-an-metric__hint">
            {t.dailyAvg}: {formatMmk(kpis.recentIncome / kpis.days)}
          </div>
        </article>
        <article className="finance-an-metric finance-an-metric--out">
          <div className="finance-an-metric__label">
            {getPeriodLabel()}
            {t.recentExpense}
          </div>
          <div className="finance-an-metric__value">
            {formatMmk(kpis.recentExpense)}
          </div>
          <div className="finance-an-metric__hint">
            {t.dailyAvg}: {formatMmk(kpis.recentExpense / kpis.days)}
          </div>
        </article>
        <article
          className={`finance-an-metric finance-an-metric--${kpis.profit >= 0 ? "net" : "net-neg"}`}
        >
          <div className="finance-an-metric__label">
            {getPeriodLabel()}
            {t.recentProfit}
          </div>
          <div className="finance-an-metric__value">{formatMmk(kpis.profit)}</div>
          <div className="finance-an-metric__hint">
            {t.profitMargin}: {kpis.margin.toFixed(1)}%
          </div>
        </article>
      </div>

      <section className="finance-an-panel">
        <h4 className="finance-an-panel__title">月度收支趋势</h4>
        <p className="finance-an-panel__sub">
          手工已完成账。包裹收入在表里另列，不并入手工柱。
        </p>
        {monthly.sortedMonths.length === 0 ? (
          <EmptyHint>这段时间还没有月度账。</EmptyHint>
        ) : (
          <div className="finance-an-charts finance-an-charts--wide">
            <div>
              <h5 className="finance-an-panel__title">收支对比</h5>
              <ResponsiveContainer width="100%" height={isMobile ? 280 : 340}>
                <ComposedChart
                  data={monthly.chartData}
                  margin={{ top: 12, right: 12, left: 0, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="monthShort" stroke={AXIS} tick={{ fontSize: 12 }} />
                  <YAxis stroke={AXIS} tick={{ fontSize: 12 }} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatMmk(value)}
                  />
                  <Legend wrapperStyle={{ paddingTop: 12, fontSize: 12 }} />
                  <Bar dataKey="income" fill={IN} name="收入" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill={OUT} name="支出" radius={[4, 4, 0, 0]} />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke={PROFIT}
                    strokeWidth={2}
                    name="利润"
                    dot={{ fill: PROFIT, r: 3 }}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h5 className="finance-an-panel__title">收入</h5>
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart
                  data={monthly.chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="anIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={IN} stopOpacity={0.28} />
                      <stop offset="95%" stopColor={IN} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="monthShort" stroke={AXIS} tick={{ fontSize: 12 }} />
                  <YAxis stroke={AXIS} tick={{ fontSize: 12 }} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatMmk(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="income"
                    stroke={IN}
                    fill="url(#anIncome)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
            <div>
              <h5 className="finance-an-panel__title">支出</h5>
              <ResponsiveContainer width="100%" height={chartH}>
                <AreaChart
                  data={monthly.chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="anExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={OUT} stopOpacity={0.22} />
                      <stop offset="95%" stopColor={OUT} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis dataKey="monthShort" stroke={AXIS} tick={{ fontSize: 12 }} />
                  <YAxis stroke={AXIS} tick={{ fontSize: 12 }} tickFormatter={tickK} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatMmk(value)}
                  />
                  <Area
                    type="monotone"
                    dataKey="expense"
                    stroke={OUT}
                    fill="url(#anExpense)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <h5 className="finance-an-panel__title" style={{ marginTop: 18 }}>
          近 30 日手工账
        </h5>
        <ResponsiveContainer width="100%" height={isMobile ? 260 : 300}>
          <LineChart
            data={dailyChartData}
            margin={{ top: 8, right: 8, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
            <XAxis
              dataKey="date"
              stroke={AXIS}
              tick={{ fontSize: 11 }}
              interval="preserveStartEnd"
            />
            <YAxis stroke={AXIS} tick={{ fontSize: 12 }} tickFormatter={tickK} />
            <Tooltip
              contentStyle={tooltipStyle}
              formatter={(value: number) => formatMmk(value)}
            />
            <Legend wrapperStyle={{ paddingTop: 8, fontSize: 12 }} />
            <Line type="monotone" dataKey="income" stroke={IN} strokeWidth={2} name="收入" dot={false} />
            <Line type="monotone" dataKey="expense" stroke={OUT} strokeWidth={2} name="支出" dot={false} />
            <Line
              type="monotone"
              dataKey="profit"
              stroke={PROFIT}
              strokeWidth={1.5}
              name="利润"
              strokeDasharray="4 4"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>

        {monthly.sortedMonths.length > 0 ? (
          <div className="finance-an-table-wrap">
            <table className="finance-an-table">
              <thead>
                <tr>
                  <th>月份</th>
                  <th>收入</th>
                  <th>支出</th>
                  <th>利润</th>
                  <th>包裹数</th>
                  <th>包裹收入</th>
                  <th>配送距离</th>
                </tr>
              </thead>
              <tbody>
                {monthly.sortedMonths.map((month) => {
                  const data = monthly.monthlyData[month];
                  const profit = data.income - data.expense;
                  return (
                    <tr key={month}>
                      <td>{month}</td>
                      <td>{data.income.toLocaleString()}</td>
                      <td>{data.expense.toLocaleString()}</td>
                      <td>{profit.toLocaleString()}</td>
                      <td>
                        {data.packageCount} {pkgUnit}
                      </td>
                      <td>{data.packageIncome.toLocaleString()}</td>
                      <td>{data.courierKm.toFixed(2)} KM</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className="finance-an-grid2">
        <section className="finance-an-panel">
          <h4 className="finance-an-panel__title">包裹类型</h4>
          <p className="finance-an-panel__sub">已送达订单，不限当前周期。</p>
          {typePie.total === 0 ? (
            <EmptyHint>还没有已送达包裹。</EmptyHint>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={typePie.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {typePie.data.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE[index % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => `${value} ${pkgUnit}`}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="finance-an-legend">
                {typePie.data.map((item, index) => (
                  <li key={item.name}>
                    <span
                      className="finance-an-legend__swatch"
                      style={{ background: PIE[index % PIE.length] }}
                    />
                    <span className="finance-an-legend__name">{item.name}</span>
                    <span className="finance-an-legend__value">
                      {item.value} {pkgUnit} · {item.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="finance-an-panel">
          <h4 className="finance-an-panel__title">收入分类</h4>
          <p className="finance-an-panel__sub">当前周期内已完成的手工收入。</p>
          {incomePie.total === 0 ? (
            <EmptyHint>这个周期没有手工收入。</EmptyHint>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={incomePie.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {incomePie.data.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE[index % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatMmk(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="finance-an-legend">
                {incomePie.data.map((item, index) => (
                  <li key={item.name}>
                    <span
                      className="finance-an-legend__swatch"
                      style={{ background: PIE[index % PIE.length] }}
                    />
                    <span className="finance-an-legend__name">{item.name}</span>
                    <span className="finance-an-legend__value">
                      {formatMmk(item.value)} · {item.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="finance-an-panel">
          <h4 className="finance-an-panel__title">支出分类</h4>
          <p className="finance-an-panel__sub">当前周期内已完成的手工支出。</p>
          {expensePie.total === 0 ? (
            <EmptyHint>这个周期没有手工支出。</EmptyHint>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={expensePie.data}
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={88}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {expensePie.data.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE[index % PIE.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number) => formatMmk(value)}
                  />
                </PieChart>
              </ResponsiveContainer>
              <ul className="finance-an-legend">
                {expensePie.data.map((item, index) => (
                  <li key={item.name}>
                    <span
                      className="finance-an-legend__swatch"
                      style={{ background: PIE[index % PIE.length] }}
                    />
                    <span className="finance-an-legend__name">{item.name}</span>
                    <span className="finance-an-legend__value">
                      {formatMmk(item.value)} · {item.percentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>

        <section className="finance-an-panel">
          <h4 className="finance-an-panel__title">骑手配送量</h4>
          <p className="finance-an-panel__sub">已送达单数前十，不含待分配。</p>
          {couriers.top.length === 0 ? (
            <EmptyHint>还没有骑手配送记录。</EmptyHint>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart
                  data={couriers.chartData}
                  margin={{ top: 8, right: 8, left: 0, bottom: 40 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
                  <XAxis
                    dataKey="name"
                    stroke={AXIS}
                    tick={{ fontSize: 11 }}
                    interval={0}
                    angle={-28}
                    textAnchor="end"
                    height={56}
                  />
                  <YAxis stroke={AXIS} tick={{ fontSize: 12 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(value: number, name: string) => {
                      if (name === "count") return [`${value} 单`, "配送单数"];
                      if (name === "km") return [`${value.toFixed(1)} KM`, "配送距离"];
                      return value;
                    }}
                    labelFormatter={(label) =>
                      couriers.chartData.find((d) => d.name === label)?.fullName ||
                      label
                    }
                  />
                  <Bar
                    dataKey="count"
                    fill={INK}
                    name="count"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
              <ol className="finance-an-rank">
                {couriers.top.map(([courier, stats], index) => (
                  <li key={courier}>
                    <span className="finance-an-rank__n">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="finance-an-rank__name">{courier}</span>
                    <span className="finance-an-rank__meta">
                      {stats.count} 单 · {stats.km.toFixed(1)} KM
                    </span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default FinanceAnalyticsTab;
