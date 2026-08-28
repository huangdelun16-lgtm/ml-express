import React, { useState, useEffect, useCallback, useRef } from "react";
import LoggerService from "../services/LoggerService";
import { useNavigate, useLocation } from "react-router-dom";
import { packageService, merchantService, deliveryStoreService } from "../services/supabase";
import { useLanguage } from "../contexts/LanguageContext";
import { useMerchantOrdersOptional } from "../contexts/MerchantOrderContext";
import { MERCHANT_ORDERS_REFRESH } from "../utils/merchantOrderEvents";
import { useMerchantUnreadCounts } from "../hooks/useMerchantUnreadCounts";
import {
  filterPackagesByTab,
  getMerchantOrderStatusColor,
  getMerchantOrderStatusLabel,
  getMerchantPaymentMethodText,
  type MerchantLanguage,
} from "../constants/merchantOrderStatus";
import { useMerchantPackageModals } from "../hooks/useMerchantPackageModals";
import { buildProductNamePriceMap } from "../utils/parseOrderPackingItems";
import MerchantPackageDetailModal from "../components/orders/MerchantPackageDetailModal";
import MerchantPackingModal from "../components/orders/MerchantPackingModal";

const TrackingPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, t: allT } = useLanguage();
  const merchantOrdersCtx = useMerchantOrdersOptional();
  const t = allT.profile;

  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeOrders, setActiveOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPartnerStore, setIsPartnerStore] = useState(false);
  const [storeInfo, setStoreInfo] = useState<any>(null);
  const [productPriceMap, setProductPriceMap] = useState<
    Record<string, number>
  >({});
  const orderIds = activeOrders.map((o) => o.id);
  const unreadCounts = useMerchantUnreadCounts(currentUser?.id, orderIds);

  const lang = language as MerchantLanguage;
  const currentUserRef = useRef<any>(null);

  const loadStoreData = useCallback(async (storeId: string) => {
    try {
      const [storeData, productsData] = await Promise.all([
        deliveryStoreService.getStoreById(storeId),
        merchantService.getStoreProducts(storeId),
      ]);
      setStoreInfo(storeData);

      setProductPriceMap(buildProductNamePriceMap(productsData));
    } catch (error) {
      LoggerService.error(
        "Failed to load store/products data in TrackingPage:",
        error,
      );
    }
  }, []);

  const loadActiveOrders = useCallback(
    async (user: any, options?: { background?: boolean }) => {
      const background = options?.background === true;
      if (!background) {
        setInitialLoading(true);
      } else {
        setIsRefreshing(true);
      }
      try {
        const storeId = user.store_id || user.id;
        const packages = await packageService.getPackagesByStore(storeId, {
          limit: 500,
        });

        setActiveOrders(packages);
        if (user.user_type === "merchant") {
          setIsPartnerStore(true);
          if (!storeInfo) {
            await loadStoreData(storeId);
          }
        }
      } catch (error) {
        LoggerService.error("Failed to load orders:", error);
      } finally {
        setInitialLoading(false);
        setIsRefreshing(false);
      }
    },
    [loadStoreData, storeInfo],
  );

  const packageModals = useMerchantPackageModals({
    language: lang,
    productPriceMap,
    isPartnerStore,
    onRefresh: () => {
      const user = currentUserRef.current;
      if (user) void loadActiveOrders(user, { background: true });
    },
    onPackageStatusChange: (packageId, status) => {
      setActiveOrders((prev) =>
        prev.map((p) => (p.id === packageId ? { ...p, status } : p)),
      );
    },
    removePendingOrder: (id) => merchantOrdersCtx?.removePendingOrder(id),
  });

  const [currentPage, setCurrentPage] = useState(1);
  const packagesPerPage = 5;

  const searchParams = new URLSearchParams(location.search);
  const statusFilter = searchParams.get("status") || "all";

  useEffect(() => {
    const savedUser = localStorage.getItem("ml-express-customer");
    if (savedUser) {
      const user = JSON.parse(savedUser);
      setCurrentUser(user);
      currentUserRef.current = user;
      void loadActiveOrders(user);
    } else {
      navigate("/login");
    }
  }, [navigate, loadActiveOrders]);

  useEffect(() => {
    setFilteredOrders(filterPackagesByTab(activeOrders, statusFilter));
    setCurrentPage(1);
  }, [activeOrders, statusFilter]);

  useEffect(() => {
    const onRefresh = () => {
      const user = currentUserRef.current;
      if (user) void loadActiveOrders(user, { background: true });
    };
    window.addEventListener(MERCHANT_ORDERS_REFRESH, onRefresh);
    return () => window.removeEventListener(MERCHANT_ORDERS_REFRESH, onRefresh);
  }, [loadActiveOrders]);

  const getStatusColor = getMerchantOrderStatusColor;
  const getStatusText = (status: string) =>
    getMerchantOrderStatusLabel(status, lang);
  const getPaymentMethodText = (paymentMethod?: string) =>
    getMerchantPaymentMethodText(paymentMethod, lang, { emptyAsDash: true });

  const formatOrderTime = (order: { created_at?: string; create_time?: string }) => {
    const raw = order.created_at || order.create_time;
    if (!raw) return "—";
    const d = new Date(raw);
    return Number.isNaN(d.getTime()) ? raw : d.toLocaleString();
  };

  const formatDisplayStatus = (status: string) =>
    getStatusText(status === "待收款" ? "待取件" : status);

  return (
    <>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "2.5rem",
            background: "rgba(255, 255, 255, 0.03)",
            padding: "2rem",
            borderRadius: "30px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div
              style={{
                width: "60px",
                height: "60px",
                borderRadius: "18px",
                background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "2rem",
                boxShadow: "0 10px 20px rgba(37, 99, 235, 0.3)",
              }}
            >
              📦
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.8rem",
                  fontWeight: "900",
                  margin: 0,
                  letterSpacing: "-0.5px",
                  color: "#ffffff",
                }}
              >
                {t?.packages || "订单列表"}
              </h1>
              <p
                style={{
                  color: "rgba(255,255,255,0.5)",
                  marginTop: "4px",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
              >
                {statusFilter === "all"
                  ? t?.totalOrders || "全部订单"
                  : statusFilter}{" "}
                {filteredOrders.length}
                {language === "zh"
                  ? " 笔"
                  : language === "en"
                    ? " orders"
                    : language === "my"
                      ? " ခု"
                      : ""}
                {isRefreshing ? " · 更新中…" : ""}
              </p>
            </div>
          </div>
          <div style={{ color: "rgba(255,255,255,0.3)", fontSize: "0.85rem" }}>
            {statusFilter.toUpperCase()}
          </div>
        </div>

        {initialLoading && activeOrders.length === 0 ? (
          <div style={{ textAlign: "center", padding: "10rem 0" }}>
            <div
              className="spinner"
              style={{
                width: "40px",
                height: "40px",
                border: "4px solid rgba(255,255,255,0.1)",
                borderTop: "4px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                margin: "0 auto",
              }}
            />
          </div>
        ) : (
          <div style={{ display: "grid", gap: "1.5rem" }}>
            {filteredOrders
              .slice(
                (currentPage - 1) * packagesPerPage,
                currentPage * packagesPerPage,
              )
              .map((order) => (
                <div
                  key={order.id}
                  onClick={() => packageModals.handleOrderClick(order)}
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "20px",
                    padding: "1.5rem",
                    border: "1px solid rgba(255,255,255,0.1)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backdropFilter: "blur(10px)",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.1)";
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: "900",
                          color: "white",
                        }}
                      >
                        #{order.id}
                      </span>
                      <span
                        style={{
                          background: getStatusColor(
                            order.status === "待收款" ? "待取件" : order.status,
                          ),
                          color: "white",
                          padding: "2px 10px",
                          borderRadius: "6px",
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                        }}
                      >
                        {formatDisplayStatus(order.status)}
                      </span>
                      {unreadCounts[order.id] > 0 ? (
                        <span
                          style={{
                            background: "#ef4444",
                            color: "white",
                            padding: "2px 8px",
                            borderRadius: "999px",
                            fontSize: "0.72rem",
                            fontWeight: 800,
                          }}
                        >
                          💬 {unreadCounts[order.id]}
                        </span>
                      ) : null}
                    </div>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        margin: 0,
                        fontSize: "0.9rem",
                      }}
                    >
                      客户: {order.receiver_name}
                    </p>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.6)",
                        margin: 0,
                        fontSize: "0.9rem",
                      }}
                    >
                      地址: {order.receiver_address}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <p
                      style={{
                        color: "#fbbf24",
                        fontSize: "1.2rem",
                        fontWeight: "900",
                        margin: 0,
                      }}
                    >
                      {order.price
                        ? `${order.price.replace(/MMK/gi, "").trim()} MMK`
                        : "-"}
                    </p>
                    <p
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "0.8rem",
                      }}
                    >
                      {formatOrderTime(order)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}

        {filteredOrders.length > packagesPerPage && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: "3rem",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: "1.2rem",
                alignItems: "center",
                padding: "1rem",
                background: "rgba(255, 255, 255, 0.03)",
                borderRadius: "24px",
                border: "1px solid rgba(255, 255, 255, 0.05)",
              }}
            >
              <button
                type="button"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  cursor: currentPage === 1 ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  opacity: currentPage === 1 ? 0.3 : 1,
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>‹</span>
              </button>
              <div
                style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
              >
                {Array.from(
                  {
                    length: Math.ceil(filteredOrders.length / packagesPerPage),
                  },
                  (_, i) => i + 1,
                ).map((page) => (
                  <button
                    type="button"
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    style={{
                      background:
                        currentPage === page ? "#3b82f6" : "transparent",
                      color: "white",
                      border:
                        currentPage === page
                          ? "none"
                          : "1px solid rgba(255, 255, 255, 0.1)",
                      width: "36px",
                      height: "36px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "800",
                      transition: "all 0.2s ease",
                      boxShadow:
                        currentPage === page
                          ? "0 4px 12px rgba(59, 130, 246, 0.4)"
                          : "none",
                    }}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() =>
                  setCurrentPage((prev) =>
                    Math.min(
                      Math.ceil(filteredOrders.length / packagesPerPage),
                      prev + 1,
                    ),
                  )
                }
                disabled={
                  currentPage ===
                  Math.ceil(filteredOrders.length / packagesPerPage)
                }
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  cursor:
                    currentPage ===
                    Math.ceil(filteredOrders.length / packagesPerPage)
                      ? "not-allowed"
                      : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s ease",
                  opacity:
                    currentPage ===
                    Math.ceil(filteredOrders.length / packagesPerPage)
                      ? 0.3
                      : 1,
                }}
              >
                <span style={{ fontSize: "1.2rem" }}>›</span>
              </button>
            </div>
            <div
              style={{
                textAlign: "center",
                marginTop: "1.5rem",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.9rem",
              }}
            >
              {language === "zh"
                ? `显示第 ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, filteredOrders.length)} 条，共 ${filteredOrders.length} 条`
                : `Showing ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, filteredOrders.length)} of ${filteredOrders.length}`}
            </div>
          </div>
        )}

        {!initialLoading && filteredOrders.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: "8rem 0",
              background: "rgba(255,255,255,0.03)",
              borderRadius: "32px",
              border: "2px dashed rgba(255,255,255,0.1)",
            }}
          >
            <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>✨</div>
            <h3 style={{ color: "rgba(255,255,255,0.5)" }}>
              当前暂无该状态下的订单
            </h3>
          </div>
        )}
      </div>

      <style>{` @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } } .spinner { animation: spin 1s linear infinite; } `}</style>

      <MerchantPackageDetailModal
        open={packageModals.showPackageDetailModal}
        pkg={packageModals.selectedPackage}
        language={lang}
        productPriceMap={productPriceMap}
        isPartnerStore={isPartnerStore}
        actionLoading={packageModals.actionLoading}
        title={t?.packageDetails || "包裹详情"}
        closeLabel={t?.close || "关闭"}
        packageIdLabel={t.packageId}
        getStatusColor={getStatusColor}
        getStatusText={getStatusText}
        getPaymentMethodText={getPaymentMethodText}
        onClose={packageModals.closePackageDetail}
        onAccept={packageModals.handleAcceptOrder}
        onCancel={packageModals.handleCancelOrder}
        onStartPacking={packageModals.handleStartPacking}
        merchantUserId={currentUser?.id}
      />
      <MerchantPackingModal
        open={packageModals.showPackingModal}
        order={packageModals.packingOrderData}
        language={lang}
        packageIdLabel={t?.packageId || "订单号"}
        model={packageModals.packingModalModel}
        checkedItems={packageModals.checkedItems}
        actionLoading={packageModals.actionLoading}
        printLoading={packageModals.printLoading}
        canComplete={packageModals.isPackingCompleteEnabled}
        onClose={packageModals.closePackingModal}
        onToggleItem={packageModals.togglePackingItem}
        onPrint={packageModals.handlePackingPrint}
        onComplete={packageModals.handleCompletePacking}
      />
    </>
  );
};

export default TrackingPage;
