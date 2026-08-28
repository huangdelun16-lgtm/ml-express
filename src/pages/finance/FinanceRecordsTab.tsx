// @ts-nocheck — 从 FinanceManagement 原样搬出的 Tab JSX；类型由父组件工作区承担。
import React from "react";

import { useFinanceWorkspace } from "./FinanceWorkspace";

import { statusColors, typeColors, type FilterStatus, type FilterType } from "../FinanceManagement.helpers";

const FinanceRecordsTab: React.FC = () => {
  const {
    currentUserRole,
    dateRange,
    filterStatus,
    filterType,
    filteredRecords,
    getRecordRegion,
    handleDeleteRecord,
    handleEditRecord,
    isMobile,
    language,
    loading,
    searchTerm,
    setDateRange,
    setFilterStatus,
    setFilterType,
    setSearchTerm,
    t,
  } = useFinanceWorkspace();

  return (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              border: "1px solid #f8fafc",
              boxShadow: "0 12px 35px rgba(7, 23, 55, 0.45)",
            }}
          >
            {/* Filters */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile
                  ? "1fr"
                  : "repeat(auto-fit, minmax(200px, 1fr))",
                gap: isMobile ? "12px" : "16px",
                marginBottom: "24px",
              }}
            >
              <input
                placeholder={t.searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "none",
                  background: "#f8fafc",
                  color: "#0f172a",
                }}
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as FilterType)}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              >
                <option value="all" style={{ color: "#000" }}>
                  {t.allTypes}
                </option>
                <option value="income" style={{ color: "#000" }}>
                  {t.income}
                </option>
                <option value="expense" style={{ color: "#000" }}>
                  {t.expense}
                </option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) =>
                  setFilterStatus(e.target.value as FilterStatus)
                }
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: "1px solid #e2e8f0",
                  background: "#ffffff",
                  color: "#0f172a",
                }}
              >
                <option value="all" style={{ color: "#000" }}>
                  {t.allStatus}
                </option>
                <option value="pending" style={{ color: "#000" }}>
                  {t.pending}
                </option>
                <option value="completed" style={{ color: "#000" }}>
                  {t.completed}
                </option>
                <option value="cancelled" style={{ color: "#000" }}>
                  {t.cancelled}
                </option>
              </select>
              <div style={{ display: "flex", gap: "8px" }}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, start: e.target.value }))
                  }
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#f8fafc",
                    color: "#0f172a",
                  }}
                />
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) =>
                    setDateRange((prev) => ({ ...prev, end: e.target.value }))
                  }
                  style={{
                    flex: 1,
                    padding: "12px 16px",
                    borderRadius: "12px",
                    border: "none",
                    background: "#f8fafc",
                    color: "#0f172a",
                  }}
                />
              </div>
            </div>

            {/* Records Table - Reverted to standard table for reliability */}
            <div
              style={{
                overflowX: "auto",
                background: "#f8fafc",
                borderRadius: "12px",
              }}
            >
              <table
                className="finance-records-table"
                style={{
                  width: "max-content",
                  minWidth: "100%",
                  borderCollapse: "collapse",
                  color: "#0f172a",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#ffffff",
                      borderBottom: "2px solid #f1f5f9",
                    }}
                  >
                    {[
                      t.recordId,
                      t.type,
                      t.category,
                      t.amount,
                      t.currency,
                      t.status,
                      t.orderCourier,
                      t.date,
                      t.workRegion,
                      t.notes,
                      t.actions,
                    ].map((header) => (
                      <th
                        key={header}
                        style={{
                          padding: "14px",
                          textAlign: "left",
                          fontWeight: 600,
                          fontSize: "0.95rem",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td
                        colSpan={11}
                        style={{ textAlign: "center", padding: "48px" }}
                      >
                        <div
                          className="spinner"
                          style={{ marginBottom: "16px" }}
                        ></div>
                        {t.loadingData}
                      </td>
                    </tr>
                  ) : filteredRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={11}
                        style={{ textAlign: "center", padding: "80px 24px" }}
                      >
                        <div
                          style={{
                            fontSize: "3rem",
                            marginBottom: "16px",
                            opacity: 0.5,
                          }}
                        >
                          📝
                        </div>
                        <div
                          style={{
                            color: "#334155",
                            fontSize: "1.2rem",
                            fontWeight: 500,
                          }}
                        >
                          {t.noRecords}
                        </div>
                        {currentUserRole !== "admin" && (
                          <div
                            style={{
                              color: "#94a3b8",
                              fontSize: "1rem",
                              marginTop: "12px",
                            }}
                          >
                            {t.financeAuthOnly}
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((record, index) => (
                      <tr
                        key={record.id}
                        style={{
                          borderBottom: "1px solid #e2e8f0",
                          background:
                            index % 2 === 0
                              ? "#f8fafc"
                              : "transparent",
                        }}
                      >
                        <td
                          style={{
                            padding: "14px",
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {record.id}
                        </td>
                        <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              background: `${typeColors[record.record_type]}22`,
                              color: typeColors[record.record_type],
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {record.record_type === "income"
                              ? t.income
                              : t.expense}
                          </span>
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {record.category}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            color:
                              record.record_type === "income"
                                ? "#4cd137"
                                : "#ff7979",
                            fontWeight: 600,
                            whiteSpace: "nowrap",
                          }}
                        >
                          {record.amount?.toLocaleString()}
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            fontSize: "0.9rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {record.currency}
                        </td>
                        <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "4px 10px",
                              borderRadius: "999px",
                              background: `${statusColors[record.status]}22`,
                              color: statusColors[record.status],
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {record.status === "pending"
                              ? t.pending
                              : record.status === "completed"
                                ? t.completed
                                : t.cancelled}
                          </span>
                        </td>
                        <td style={{ padding: "14px" }}>
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "#0f172a",
                            }}
                          >
                            {t.orderId}: {record.order_id || "—"}
                          </div>
                          <div
                            style={{
                              fontSize: "0.8rem",
                              color: "#64748b",
                            }}
                          >
                            {t.courierId}: {record.courier_id || "—"}
                          </div>
                        </td>
                        <td
                          style={{
                            padding: "14px",
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {record.record_date}
                        </td>
                        <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              background:
                                getRecordRegion(record.created_by) === "—"
                                  ? "#f8fafc"
                                  : "#48bb78",
                              color: "#0f172a",
                              padding: "4px 10px",
                              borderRadius: "8px",
                              fontSize: "0.85rem",
                              fontWeight: "bold",
                              display: "inline-block",
                              minWidth: "45px",
                              textAlign: "center",
                              whiteSpace: "nowrap",
                              boxShadow:
                                getRecordRegion(record.created_by) === "—"
                                  ? "none"
                                  : "0 2px 6px rgba(0,0,0,0.2)",
                            }}
                          >
                            {getRecordRegion(record.created_by)}
                          </div>
                        </td>
                        <td
                          className="finance-records-notes"
                          style={{ padding: "14px", maxWidth: "280px" }}
                        >
                          <div
                            style={{
                              fontSize: "0.85rem",
                              color: "#475569",
                            }}
                          >
                            {record.notes || "—"}
                          </div>
                          {record.reference && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "#94a3b8",
                              }}
                            >
                              {language === "my" ? "ကိုးကား" : "参考"}:{" "}
                              {record.reference}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: "14px", whiteSpace: "nowrap" }}>
                          <div
                            style={{
                              display: "flex",
                              gap: "8px",
                              flexWrap: "nowrap",
                            }}
                          >
                            <button
                              onClick={() => handleEditRecord(record)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "10px",
                                border: "none",
                                background: "rgba(76, 209, 55, 0.2)",
                                color: "#4cd137",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.edit}
                            </button>
                            <button
                              onClick={() => handleDeleteRecord(record.id)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: "10px",
                                border: "none",
                                background: "rgba(255, 71, 87, 0.2)",
                                color: "#ff4757",
                                cursor: "pointer",
                                fontSize: "0.85rem",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {t.delete}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
  );
};

export default FinanceRecordsTab;
