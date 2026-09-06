import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../contexts/LanguageContext";
import { useMerchantOrdersOptional } from "../../contexts/MerchantOrderContext";
import { MERCHANT_ORDER_STATUS } from "../../constants/merchantOrderStatus";
import { deliveryStoreService } from "../../services/supabase";
import StorageImg from "../StorageImg";
import {
  STORE_AVATAR_UPDATED_EVENT,
  storeAvatarSrc,
} from "../../utils/storeAvatar";
import "../../styles/merchantSidebar.css";

const Sidebar: React.FC<{
  currentUser: any;
  onLogout: () => void;
  onNavigate?: () => void;
}> = ({ currentUser, onLogout, onNavigate }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const merchantOrders = useMerchantOrdersOptional();
  const pendingBadge = merchantOrders?.pendingCount ?? 0;
  const [isAccountExpanded, setIsAccountExpanded] = useState(false);
  const [isOrdersExpanded, setIsOrdersExpanded] = useState(false);
  const [storeAvatarUrl, setStoreAvatarUrl] = useState(
    String(currentUser?.avatar_url || ""),
  );
  const [storeAvatarUpdatedAt, setStoreAvatarUpdatedAt] = useState("");

  useEffect(() => {
    if (location.pathname === "/") {
      setIsAccountExpanded(true);
    }
    if (location.pathname.startsWith("/orders")) {
      setIsOrdersExpanded(true);
    }
  }, [location.pathname]);

  useEffect(() => {
    setStoreAvatarUrl(String(currentUser?.avatar_url || ""));
  }, [currentUser?.avatar_url]);

  useEffect(() => {
    const storeId = currentUser?.store_id || currentUser?.id;
    if (!storeId) return;
    void deliveryStoreService.getStoreById(storeId).then((store) => {
      if (store?.avatar_url) {
        setStoreAvatarUrl(store.avatar_url);
        setStoreAvatarUpdatedAt(store.updated_at || "");
      }
    });
    const onUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ url?: string; updatedAt?: string }>)
        .detail;
      setStoreAvatarUrl(detail?.url || "");
      setStoreAvatarUpdatedAt(detail?.updatedAt || "");
    };
    window.addEventListener(STORE_AVATAR_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(STORE_AVATAR_UPDATED_EVENT, onUpdated);
  }, [currentUser?.id, currentUser?.store_id]);

  const mainMenuItems = [
    {
      id: "/",
      label:
        language === "zh"
          ? "我的账号"
          : language === "en"
            ? "My account"
            : "ကျွန်ုပ်၏အကောင့်",
    },
    {
      id: "/orders",
      label:
        language === "zh"
          ? "订单列表"
          : language === "en"
            ? "Orders"
            : "အော်ဒါစာရင်း",
    },
    {
      id: "/products",
      label:
        language === "zh"
          ? "商品管理"
          : language === "en"
            ? "Products"
            : "ကုန်ပစ္စည်းစီမံမှု",
    },
  ];

  const subMenuItems = [
    {
      id: "cod-stats",
      label:
        language === "zh"
          ? "代收款统计"
          : language === "en"
            ? "COD stats"
            : "COD စာရင်းအင်း",
    },
    {
      id: "business-hours",
      label:
        language === "zh"
          ? "营业时间"
          : language === "en"
            ? "Business hours"
            : "ဖွင့်ချိန်သတ်မှတ်ချက်",
    },
  ];

  const orderStatuses = [
    {
      id: "all",
      label:
        language === "zh"
          ? "全部订单"
          : language === "en"
            ? "All orders"
            : "အော်ဒါအားလုံး",
    },
    {
      id: MERCHANT_ORDER_STATUS.PENDING_CONFIRM,
      label:
        language === "zh"
          ? "待接单"
          : language === "en"
            ? "To accept"
            : "လက်ခံရန်စောင့်ဆိုင်း",
    },
    {
      id: "打包中",
      label:
        language === "zh" ? "打包中" : language === "en" ? "Packing" : "ထုပ်ပိုးနေသည်",
    },
    {
      id: "待取件",
      label:
        language === "zh"
          ? "待取件"
          : language === "en"
            ? "Pickup"
            : "လာယူရန်စောင့်ဆိုင်း",
    },
    {
      id: "运输中",
      label:
        language === "zh"
          ? "配送中"
          : language === "en"
            ? "In transit"
            : "ပို့ဆောင်နေသည်",
    },
    {
      id: "已完成",
      label:
        language === "zh" ? "已完成" : language === "en" ? "Completed" : "ပြီးစီးသည်",
    },
    {
      id: "已取消",
      label:
        language === "zh"
          ? "已取消"
          : language === "en"
            ? "Cancelled"
            : "ပယ်ဖျက်သည်",
    },
  ];

  const handleMenuClick = (id: string) => {
    onNavigate?.();
    if (id === "place-order") {
      if (location.pathname !== "/") {
        navigate("/", { state: { triggerOrder: true } });
      } else {
        window.dispatchEvent(new CustomEvent("trigger-place-order"));
      }
      return;
    }

    if (id === "/") {
      setIsAccountExpanded(!isAccountExpanded);
      if (location.pathname !== "/") navigate("/");
      return;
    }

    if (id === "/orders") {
      setIsOrdersExpanded(!isOrdersExpanded);
      if (!location.pathname.startsWith("/orders")) navigate("/orders");
      return;
    }

    if (id.startsWith("status-")) {
      const status = id.replace("status-", "");
      navigate(`/orders${status === "all" ? "" : `?status=${status}`}`);
      return;
    }

    if (id === "cod-stats") {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document
            .getElementById("cod-stats-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document
          .getElementById("cod-stats-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    } else if (id === "business-hours") {
      if (location.pathname !== "/") {
        navigate("/");
        setTimeout(() => {
          document
            .getElementById("business-hours-section")
            ?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        document
          .getElementById("business-hours-section")
          ?.scrollIntoView({ behavior: "smooth" });
      }
    } else {
      navigate(id);
    }
  };

  const storeRole =
    language === "zh"
      ? "店铺管理员"
      : language === "en"
        ? "Store admin"
        : "ဆိုင်အက်ဒ်မင်";

  return (
    <div className="merchant-sidebar-inner">
      <nav className="merchant-sidebar__nav" aria-label="Merchant">
        {currentUser?.user_type === "merchant" && (
          <button
            type="button"
            className="merchant-sidebar__order"
            onClick={() => handleMenuClick("place-order")}
          >
            {language === "zh"
              ? "立即下单"
              : language === "en"
                ? "Place order"
                : "အော်ဒါတင်မည်"}
          </button>
        )}

        {mainMenuItems.map((item) => {
          const isActive =
            item.id === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(item.id);
          const isAccount = item.id === "/";
          const isOrders = item.id === "/orders";
          const isExpanded = isAccount
            ? isAccountExpanded
            : isOrders
              ? isOrdersExpanded
              : false;
          const hasSubMenu = isAccount || isOrders;

          return (
            <React.Fragment key={item.id}>
              <button
                type="button"
                className={`merchant-sidebar__item${isActive ? " is-active" : ""}${
                  isExpanded ? " is-open" : ""
                }`}
                onClick={() => handleMenuClick(item.id)}
              >
                <span className="merchant-sidebar__item-main">
                  <span>{item.label}</span>
                  {item.id === "/orders" && pendingBadge > 0 ? (
                    <span className="merchant-sidebar__badge">
                      {pendingBadge > 99 ? "99+" : pendingBadge}
                    </span>
                  ) : null}
                </span>
                {hasSubMenu ? (
                  <span className="merchant-sidebar__chevron" aria-hidden="true" />
                ) : null}
              </button>

              {isAccount && isAccountExpanded ? (
                <div className="merchant-sidebar__sub">
                  {subMenuItems.map((sub) => (
                    <button
                      key={sub.id}
                      type="button"
                      className="merchant-sidebar__sub-item"
                      onClick={() => handleMenuClick(sub.id)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              ) : null}

              {isOrders && isOrdersExpanded ? (
                <div className="merchant-sidebar__sub">
                  {orderStatuses.map((status) => {
                    const searchParams = new URLSearchParams(location.search);
                    const currentStatus = searchParams.get("status") || "all";
                    const isStatusActive = currentStatus === status.id;
                    return (
                      <button
                        key={status.id}
                        type="button"
                        className={`merchant-sidebar__sub-item${
                          isStatusActive ? " is-active" : ""
                        }`}
                        onClick={() => handleMenuClick(`status-${status.id}`)}
                      >
                        {status.label}
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </React.Fragment>
          );
        })}
      </nav>

      <div className="merchant-sidebar__foot">
        <div className="merchant-sidebar__langs">
          {[
            { id: "zh", label: "中" },
            { id: "en", label: "英" },
            { id: "my", label: "缅" },
          ].map((lang) => (
            <button
              key={lang.id}
              type="button"
              className={`merchant-sidebar__lang${language === lang.id ? " is-on" : ""}`}
              onClick={() => setLanguage(lang.id)}
            >
              {lang.label}
            </button>
          ))}
        </div>

        <div className="merchant-sidebar__store">
          <div className="merchant-sidebar__avatar">
            <StorageImg
              src={storeAvatarSrc(storeAvatarUrl, storeAvatarUpdatedAt)}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              fallback={<span>{currentUser?.name?.charAt(0)}</span>}
            />
          </div>
          <div className="merchant-sidebar__store-text">
            <div className="merchant-sidebar__name">{currentUser?.name}</div>
            <div className="merchant-sidebar__role">{storeRole}</div>
          </div>
        </div>
        <button type="button" className="merchant-sidebar__logout" onClick={onLogout}>
          {language === "zh"
            ? "安全退出"
            : language === "en"
              ? "Log out"
              : "ထွက်ရန်"}
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
