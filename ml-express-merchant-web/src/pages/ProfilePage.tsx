import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  packageService,
  supabase,
  merchantService,
  Product,
  DeliveryStore,
  deliveryStoreService,
  rechargeService,
  reviewService,
  StoreReview,
  userService,
  systemSettingsService,
} from "../services/supabase";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";
import QRCode from "qrcode";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api"; // 🚀 新增
import LoggerService from "../services/LoggerService";
import Logo from "../components/Logo";
import NavigationBar from "../components/home/NavigationBar";
import OrderModal from "../components/home/OrderModal"; // 🚀 新增
import { useLanguage } from "../contexts/LanguageContext";
import OrderQRCode from "../components/profile/OrderQRCode";

// 注入样式
if (typeof document !== "undefined") {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
    .spinner {
      animation: spin 1s linear infinite;
    }
    .merchant-stat-grid > * {
      min-width: 0;
    }
    .merchant-stat-grid .stat-label {
      line-height: 1.3;
      overflow-wrap: break-word;
      word-break: break-word;
    }
  `;
  document.head.appendChild(style);
}

// 🚀 新增：高级滚动时间选择器组件
const TimeWheelPicker: React.FC<{ 
  value: string;
  onChange: (val: string) => void;
  label: string;
  icon: string;
}> = ({ value, onChange, label, icon }) => {
  const parts = (value || "09:00").split(":");
  const hour = parts[0] || "09";
  const minute = parts[1] || "00";
  
  const handleHourChange = (newHour: string) => {
    onChange(`${newHour.padStart(2, "0")}:${minute}`);
  };
  
  const handleMinuteChange = (newMinute: string) => {
    onChange(`${hour}:${newMinute.padStart(2, "0")}`);
  };

  return (
    <div
      style={{
        background: "rgba(255, 255, 255, 0.05)",
        padding: "1.5rem",
        borderRadius: "24px",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        display: "flex",
        flexDirection: "column",
        gap: "1.2rem",
      flex: 1,
        minWidth: "200px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "rgba(255,255,255,0.7)",
          fontSize: "0.9rem",
          fontWeight: "800",
          textTransform: "uppercase",
        }}
      >
        <span style={{ fontSize: "1.2rem" }}>{icon}</span> {label}
      </div>
      
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.5rem",
          padding: "15px",
          background: "rgba(0,0,0,0.3)",
          borderRadius: "24px",
          border: "1px solid rgba(255,255,255,0.05)",
          boxShadow: "inset 0 2px 10px rgba(0,0,0,0.2)",
        }}
      >
        {/* 小时滚轮 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <button 
            onClick={() => handleHourChange(String((parseInt(hour) + 1) % 24))}
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: "40px",
              height: "30px",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ▲
          </button>
          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: "900",
              color: "white",
              fontFamily: "monospace",
              padding: "5px 10px",
            }}
          >
            {hour.padStart(2, "0")}
          </div>
          <button 
            onClick={() =>
              handleHourChange(String((parseInt(hour) - 1 + 24) % 24))
            }
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: "40px",
              height: "30px",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ▼
          </button>
        </div>

        <div
          style={{
            fontSize: "1.8rem",
            fontWeight: "900",
            color: "#fbbf24",
            marginTop: "2px",
          }}
        >
          :
        </div>

        {/* 分钟滚轮 */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "5px",
          }}
        >
          <button 
            onClick={() =>
              handleMinuteChange(String((parseInt(minute) + 5) % 60))
            }
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: "40px",
              height: "30px",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ▲
          </button>
          <div
            style={{
              fontSize: "2.2rem",
              fontWeight: "900",
              color: "white",
              fontFamily: "monospace",
              padding: "5px 10px",
            }}
          >
            {minute.padStart(2, "0")}
          </div>
          <button 
            onClick={() =>
              handleMinuteChange(String((parseInt(minute) - 5 + 60) % 60))
            }
            style={{
              background: "rgba(255,255,255,0.1)",
              border: "none",
              width: "40px",
              height: "30px",
              borderRadius: "8px",
              color: "white",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ▼
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t: allT } = useLanguage();
  const t = allT.profile;
  const [isVisible, setIsVisible] = useState(false);
  const [showLanguageDropdown, setShowLanguageDropdown] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userBalance, setUserBalance] = useState<number>(0); // 🚀 新增：余额状态
  const [showRechargeModal, setShowRechargeModal] = useState(false); // 🚀 新增：充值模态框
  const [rechargeAmount, setRechargeAmount] = useState(""); // 🚀 新增：充值金额
  const [showPaymentQRModal, setShowPaymentQRModal] = useState(false); // 🚀 新增：支付二维码模态框
  const [selectedRechargeAmount, setSelectedRechargeAmount] = useState<
    number | null
  >(null);
  const [rechargeProof, setRechargeProof] = useState<File | null>(null);
  const [rechargeProofPreview, setRechargeProofPreview] = useState<
    string | null
  >(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [userPackages, setUserPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [packagesPerPage] = useState(5); // 每页显示5个包裹
  const [selectedPackage, setSelectedPackage] = useState<any>(null); // 选中的包裹详情
  const [showPackageDetailModal, setShowPackageDetailModal] = useState(false); // 显示包裹详情模态框
  const [showPickupCodeModal, setShowPickupCodeModal] = useState(false); // 显示寄件码模态框
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>(""); // 二维码数据URL
  const [isPartnerStore, setIsPartnerStore] = useState(false); // 是否是合伙店铺账户
  const [showPackingModal, setShowPackingModal] = useState(false); // 🚀 新增：显示打包模态框
  const [showPackingListModal, setShowPackingListModal] = useState(false); // 🚀 新增：显示待打包订单列表模态框
  const [showPendingAcceptListModal, setShowPendingAcceptListModal] =
    useState(false); // 🚀 新增：显示待接单订单列表模态框
  const [packingOrderData, setPackingOrderData] = useState<any>(null); // 🚀 新增：打包订单数据
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({}); // 🚀 新增：打包清单选中项
  const [showPasswordModal, setShowPasswordModal] = useState(false); // 显示密码修改模态框
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  }); // 密码修改表单
  const [storeInfo, setStoreInfo] = useState<any>(null); // 合伙店铺信息
  const [merchantCODStats, setMerchantCODStats] = useState({
    totalCOD: 0,
    unclearedCOD: 0,
    unclearedCount: 0,
    settledCOD: 0,
    lastSettledAt: null as string | null,
  }); // 合伙店铺代收款统计
  const [lastOrderCheckTime, setLastOrderCheckTime] = useState<number>(
    Date.now(),
  ); // 🚀 新增：上次订单检测时间
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false); // 🚀 新增：是否开启语音提醒
  const [pendingMerchantOrdersCount, setPendingMerchantOrdersCount] =
    useState(0); // 🚀 新增：待处理订单数
  const [productPriceMap, setProductPriceMap] = useState<
    Record<string, number>
  >({}); // 🚀 新增：商品价格映射
  const [isSavingStatus, setIsSavingStatus] = useState(false); // 🚀 新增：保存状态反馈
  const [isGuest, setIsGuest] = useState(false); // 🚀 新增：访客状态

  // 🚀 新增：Google Maps 加载 (用于 OrderModal)
  const googleMapsApiKey = process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded: isMapLoaded, loadError: mapLoadError } = useJsApiLoader({
    googleMapsApiKey,
    libraries: ["places"] as any[],
  });

  // 🚀 新增：导出对账单状态
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`; // 本月第一天
  });
  const [exportEndDate, setExportEndDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0]; // 今天
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<"pdf" | "excel">("pdf");
  const [exportMethod, setExportMethod] = useState<"download" | "email">(
    "download",
  );
  
  // 🚀 新增：评价管理状态
  const [showReviewsModal, setShowReviewsModal] = useState(false);
  const [storeReviews, setStoreReviews] = useState<StoreReview[]>([]);
  const [reviewStats, setReviewStats] = useState({
    average: 0,
    count: 0,
    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 },
  });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // 🚀 新增：客户评价提交状态
  const [showReviewSubmitModal, setShowReviewSubmitModal] = useState(false);
  const [reviewOrder, setReviewOrder] = useState<any>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState<string[]>([]);
  const [isUploadingReviewImage, setIsUploadingReviewImage] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [showOrderSuccessModal, setShowOrderSuccessModal] = useState(false); // 🚀 新增
  const [orderSubmitStatus, setOrderSubmitStatus] = useState<
    "idle" | "processing" | "success" | "failed"
  >("idle"); // 🚀 新增
  const [orderError, setOrderError] = useState(""); // 🚀 新增
  const [generatedOrderId, setGeneratedOrderId] = useState(""); // 🚀 新增
  const [qrCodeDataUrlOrder, setQrCodeDataUrlOrder] = useState(""); // 🚀 新增 (区分于寄件码)
  const [showMapModal, setShowMapModal] = useState(false); // 🚀 新增
  const [mapSelectionType, setMapSelectionType] = useState<
    "sender" | "receiver" | null
  >(null); // 🚀 新增
  const [mapClickPosition, setMapClickPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null); // 🚀 新增
  /** 地图弹窗内逆地理编码得到的地址预览（与客户端「立即下单」地图一致） */
  const [mapModalPreviewAddress, setMapModalPreviewAddress] = useState("");
  /** Places 自动完成（店名/地址搜索） */
  const merchantMapRef = useRef<google.maps.Map | null>(null);
  const merchantAutocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const merchantPlacesServiceRef =
    useRef<google.maps.places.PlacesService | null>(null);
  const merchantMapSearchDebounceRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const lastMerchantMapSearchQueryRef = useRef("");
  const [merchantMapSuggestions, setMerchantMapSuggestions] = useState<
    Array<{
      place_id: string;
      main_text: string;
      secondary_text: string;
      description: string;
    }>
  >([]);
  const [showMerchantMapSuggestions, setShowMerchantMapSuggestions] =
    useState(false);
  const [isLoadingMerchantMapSuggestions, setIsLoadingMerchantMapSuggestions] =
    useState(false);
  const [reviewedOrderIds, setReviewedOrderIds] = useState<Set<string>>(
    new Set(),
  );
  const reviewImageInputRef = useRef<HTMLInputElement>(null);

  // 🚀 新增：立即下单相关状态 (对齐 HomePage)
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [senderName, setSenderName] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [senderAddressText, setSenderAddressText] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [receiverPhone, setReceiverPhone] = useState("");
  const [receiverAddressText, setReceiverAddressText] = useState("");
  const [description, setDescription] = useState("");
  const [codAmount, setCodAmount] = useState("");
  const [selectedDeliverySpeed, setSelectedDeliverySpeed] = useState("");
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [scheduledDeliveryTime, setScheduledDeliveryTime] = useState("");
  const [showWeightInput, setShowWeightInput] = useState(false);
  const [isCalculated, setIsCalculated] = useState(false);
  const [calculatedPriceDetail, setCalculatedPriceDetail] = useState(0);
  const [calculatedDistanceDetail, setCalculatedDistanceDetail] = useState(0);
  const [hasCOD, setHasCOD] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<"qr" | "cash" | "balance">(
    "cash",
  );
  const [selectedSenderLocation, setSelectedSenderLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedReceiverLocation, setSelectedReceiverLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<
    Record<string, number>
  >({});
  const [cartTotal, setCartTotal] = useState(0);
  const [pricingSettings, setPricingSettings] = useState({
    baseFee: 1500,
    perKmFee: 250,
    weightSurcharge: 150,
    urgentSurcharge: 500,
    oversizeSurcharge: 300,
    scheduledSurcharge: 200,
    fragileSurcharge: 300,
    foodBeverageSurcharge: 300,
    freeKmThreshold: 3,
  });

  const lastBroadcastCountRef = useRef<number>(0); // 🚀 新增：上次播报的订单数
  const lastVoiceTimeRef = useRef<number>(0); // 🚀 新增：上次播报的时间
  const voiceActivationRef = useRef<HTMLAudioElement | null>(null); // 🚀 新增：用于激活音频上下文的引用

  // 🚀 新增：语音播报函数
  const speakNotification = (text: string) => {
    if ("speechSynthesis" in window) {
      // 停止当前的，防止堆叠
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      window.speechSynthesis.speak(utterance);
      lastVoiceTimeRef.current = Date.now();
      console.log("🗣️ 正在播报:", text);
    }
  };

  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [showCODOrdersModal, setShowCODOrdersModal] = useState(false);
  const [codOrders, setCodOrders] = useState<
    Array<{ orderId: string; codAmount: number; deliveryTime?: string }>
  >([]);
  const [codModalTitle, setCodModalTitle] = useState("");
  const dateInputRef = useRef<HTMLInputElement>(null);

  // 🚀 新增：店铺商品管理状态
  const [showProductsModal, setShowProductsModal] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [showAddEditProductModal, setShowAddEditProductModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    discount_percent: "",
    stock: "-1",
    image_url: "",
    is_available: true,
  });
  const [isUploading, setIsUploading] = useState(false);
  const productFileInputRef = useRef<HTMLInputElement>(null);

  // 🚀 新增：店铺营业状态临时状态（用于保存前修改）
  const [businessStatus, setBusinessStatus] = useState({
    is_closed_today: false,
    operating_hours: "09:00 - 21:00",
    vacation_dates: [] as string[], // 🚀 新增：休假日期
  });
  const [showVacationModal, setShowVacationModal] = useState(false);
  const [tempVacationDate, setTempVacationDate] = useState("");

  // 🚀 新增：编辑资料状态
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const [editProfileForm, setEditProfileForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // 🚀 24小时时间解析助手
  const parseTimeParts = (timeStr: string, defaultTime: string) => {
    try {
      if (!timeStr) return defaultTime.split(":");
      const parts = timeStr.trim().split(":");
      if (parts.length < 2) return defaultTime.split(":");
      return [parts[0].padStart(2, "0"), parts[1].padStart(2, "0")];
    } catch (e) {
      return defaultTime.split(":");
    }
  };

  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month - 1;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split("-").map(Number);
    let newYear = year;
    let newMonth = month + 1;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setSelectedMonth(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  };

  // 🚀 新增：临时延时/早关逻辑
  const handleExtendHour = async () => {
    const hours = businessStatus.operating_hours || "09:00 - 21:00";
    const parts = hours.split(" - ");
    const start = parts[0] || "09:00";
    const end = parts[1] || "21:00";

    const endParts = end.split(":");
    const h = parseInt(endParts[0] || "21");
    const m = parseInt(endParts[1] || "00");
    
    const newH = (h + 1) % 24;
    const newTime = `${String(newH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const newHours = `${start} - ${newTime}`;
    
    setBusinessStatus((prev) => ({
      ...prev,
      operating_hours: newHours,
    }));
    
    // 🚀 立即保存到数据库
    await handleUpdateStoreStatus({ operating_hours: newHours });
  };

  const handleCloseImmediately = async () => {
    setBusinessStatus((prev) => ({ ...prev, is_closed_today: true }));
    // 🚀 立即保存到数据库
    await handleUpdateStoreStatus({ is_closed_today: true });
  };

  const handleAddVacationDate = () => {
    if (!tempVacationDate) return;
    if (businessStatus.vacation_dates.includes(tempVacationDate)) {
      alert(
        language === "zh" ? "该日期已在休假列表中" : "Date already in list",
      );
      return;
    }
    setBusinessStatus((prev) => ({
      ...prev,
      vacation_dates: [...prev.vacation_dates, tempVacationDate].sort(),
    }));
    setTempVacationDate("");
  };

  const handleRemoveVacationDate = (date: string) => {
    setBusinessStatus((prev) => ({
      ...prev,
      vacation_dates: prev.vacation_dates.filter((d) => d !== date),
    }));
  };

  // 🚀 新增：编辑资料逻辑
  const handleOpenEditProfile = () => {
    if (isPartnerStore && storeInfo) {
      setEditProfileForm({
        name: storeInfo.store_name || "",
        phone: storeInfo.phone || storeInfo.manager_phone || "",
        email: storeInfo.email || "",
        address: storeInfo.address || "",
      });
    } else {
      setEditProfileForm({
        name: currentUser?.name || "",
        phone: currentUser?.phone || "",
        email: currentUser?.email || "",
        address: currentUser?.address || "",
      });
    }
    setShowEditProfileModal(true);
  };

  const handleSaveProfile = async () => {
    if (!currentUser?.id) return;
    setIsSavingProfile(true);
    try {
      if (isPartnerStore && storeInfo) {
        // 商家资料更新
        const result = await deliveryStoreService.updateStoreInfo(
          storeInfo.id,
          {
          store_name: editProfileForm.name,
          phone: editProfileForm.phone,
          email: editProfileForm.email,
            address: editProfileForm.address,
          },
        );
        if (result.success) {
          setStoreInfo(result.data);
          alert(
            language === "zh" ? "商家资料更新成功" : "Merchant profile updated",
          );
          setShowEditProfileModal(false);
        } else {
          alert(language === "zh" ? "更新失败，请重试" : "Update failed");
        }
      } else {
        // 客户资料更新
        const result = await userService.updateUser(currentUser.id, {
          name: editProfileForm.name,
          phone: editProfileForm.phone,
          email: editProfileForm.email,
          address: editProfileForm.address,
        });
        if (result.success) {
          const updatedUser = { ...currentUser, ...result.data };
          setCurrentUser(updatedUser);
          localStorage.setItem(
            "ml-express-customer",
            JSON.stringify(updatedUser),
          );
          alert(language === "zh" ? "个人资料更新成功" : "Profile updated");
          setShowEditProfileModal(false);
        } else {
          alert(language === "zh" ? "更新失败，请重试" : "Update failed");
        }
      }
    } catch (error) {
      LoggerService.error("保存资料失败:", error);
      alert(language === "zh" ? "发生错误，请稍后重试" : "An error occurred");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // 🚀 新增：店铺商品管理逻辑
  const loadProducts = useCallback(async () => {
    if (!currentUser?.id) return;
    try {
      setLoadingProducts(true);
      const data = await merchantService.getStoreProducts(currentUser.id);
      setProducts(data);
      
      // 🚀 新增：构建商品价格映射
      const priceMap = data.reduce<Record<string, number>>((acc, product) => {
        acc[product.name] = product.price;
        return acc;
      }, {});
      setProductPriceMap(priceMap);
    } catch (error) {
      LoggerService.error("加载商品失败:", error);
    } finally {
      setLoadingProducts(false);
    }
  }, [currentUser?.id]);

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setProductForm({
      name: "",
      description: "",
      price: "",
      discount_percent: "",
      stock: "-1",
      image_url: "",
      is_available: true,
    });
    setShowAddEditProductModal(true);
  };

  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product);
    
    // 计算优惠百分比
    let discountPercent = "";
    if (product.original_price && product.original_price > product.price) {
      discountPercent = Math.round(
        (1 - product.price / product.original_price) * 100,
      ).toString();
    }

    setProductForm({
      name: product.name,
      description: product.description || "",
      price: product.price.toString(),
      discount_percent: discountPercent,
      stock: product.stock.toString(),
      image_url: product.image_url || "",
      is_available: product.is_available,
    });
    setShowAddEditProductModal(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser?.id) return;

    try {
      setIsUploading(true);
      const url = await merchantService.uploadProductImage(
        currentUser.id,
        file,
      );
      if (url) {
        setProductForm((prev) => ({ ...prev, image_url: url }));
      }
    } catch (error) {
      LoggerService.error("图片上传失败:", error);
      alert("图片上传失败，请重试");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveProduct = async () => {
    if (!productForm.name || !productForm.price || !currentUser?.id) {
      alert("请填写必要信息");
      return;
    }

    try {
      setLoadingProducts(true);
      
      const price = parseFloat(productForm.price);
      const discountPercent = parseFloat(productForm.discount_percent);
      let originalPrice = undefined;
      
      if (
        !isNaN(discountPercent) &&
        discountPercent > 0 &&
        discountPercent < 100
      ) {
        originalPrice = Math.round(price / (1 - discountPercent / 100));
      }

      let productData: Record<string, unknown> = {
        store_id: currentUser.id,
        name: productForm.name,
        price: price,
        original_price: originalPrice,
        stock: parseInt(productForm.stock),
        image_url: productForm.image_url,
        is_available: productForm.is_available,
        description: productForm.description,
      };

      let result;
      if (editingProduct) {
        if (editingProduct.listing_status === "rejected") {
          productData = { ...productData, listing_status: "pending" };
        }
        result = await merchantService.updateProduct(
          editingProduct.id,
          productData as Parameters<typeof merchantService.updateProduct>[1],
        );
      } else {
        result = await merchantService.addProduct(productData as Parameters<typeof merchantService.addProduct>[0]);
      }

      if (result.success) {
        setShowAddEditProductModal(false);
        await loadProducts();
        if (!editingProduct) {
          alert(
            language === "zh"
              ? "商品已提交，待后台审核通过后将展示给顾客。"
              : "Submitted. Visible to customers after admin approval.",
          );
        }
      } else {
        alert("保存失败，请重试");
      }
    } catch (error) {
      LoggerService.error("保存商品失败:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!window.confirm("确定要删除这个商品吗？")) return;

    try {
      setLoadingProducts(true);
      const result = await merchantService.deleteProduct(productId);
      if (result.success) {
        await loadProducts();
      } else {
        alert("删除失败，请重试");
      }
    } catch (error) {
      LoggerService.error("删除商品失败:", error);
    } finally {
      setLoadingProducts(false);
    }
  };

  const toggleProductStatus = async (product: Product) => {
    try {
      const result = await merchantService.updateProduct(product.id, { 
        is_available: !product.is_available,
      });
      if (result.success) {
        await loadProducts();
      }
    } catch (error) {
      LoggerService.error("更新状态失败:", error);
    }
  };

  // 🚀 新增：更新店铺营业状态
  const handleUpdateStoreStatus = async (updates: Partial<DeliveryStore>) => {
    if (!storeInfo?.id) return;
    setIsSavingStatus(true);
    try {
      const result = await deliveryStoreService.updateStoreInfo(
        storeInfo.id,
        updates,
      );
      if (result.success) {
        setStoreInfo((prev: any) => ({ ...prev, ...result.data }));
        // 🚀 优化：根据状态显示不同的通知
        if (updates.vacation_dates !== undefined) {
          alert(
            language === "zh"
              ? "✅ 休假计划已更新"
              : "✅ Vacation schedule updated",
          );
        } else if (updates.is_closed_today !== undefined) {
          alert(
            updates.is_closed_today
              ? language === "zh"
                ? "🛑 今日暂停服务已开启"
                : language === "en"
                  ? "🛑 Service suspended today"
                  : "ယနေ့ ဝန်ဆောင်မှု ရပ်နားထားပါသည်"
              : language === "zh"
                ? "✅ 营业状态已恢复"
                : language === "en"
                  ? "✅ Business resumed"
                  : "လုပ်ငန်း ပြန်လည်စတင်ပါပြီ",
          );
        } else {
          alert(
            language === "zh"
              ? "💾 营业时间设置成功"
              : language === "en"
                ? "💾 Operating hours set successfully"
                : "ဖွင့်လှစ်ချိန် သတ်မှတ်မှု အောင်မြင်ပါသည်",
          );
        }
      } else {
        alert(language === "zh" ? "❌ 保存失败" : "❌ Save failed");
      }
    } catch (error) {
      LoggerService.error("更新营业状态失败:", error);
      alert(language === "zh" ? "❌ 保存发生错误" : "❌ An error occurred");
    } finally {
      setIsSavingStatus(false);
    }
  };

  // 🚀 新增：中转站重新发货逻辑
  const handleReshipOrder = async (pkg: any) => {
    if (!storeInfo || storeInfo.store_type !== "transit_station") {
      alert(language === "zh" ? "仅限中转站账号操作" : "Transit stations only");
      return;
    }

    if (
      !window.confirm(
        language === "zh"
          ? "确认已处理完异常，并将包裹从当前中转站重新发货吗？"
          : "Confirm anomaly resolved and re-ship from current station?",
      )
    )
      return;

    try {
      setLoading(true);
      
      // 1. 状态恢复为“待取件”
      // 2. 寄件人改为当前中转站（确保骑手去正确地点取货）
      // 3. 清除旧骑手，重新进入分配队列
      const { error } = await supabase
        .from("packages")
        .update({
          status: "待取件",
          courier: "待分配",
          sender_name: storeInfo.store_name,
          sender_phone: storeInfo.phone || storeInfo.manager_phone,
          sender_address: storeInfo.address,
          sender_latitude: storeInfo.latitude,
          sender_longitude: storeInfo.longitude,
          description: (pkg.description || "").replace(
            "[异常转送中转站]",
            `[中转站已处理 - 从${storeInfo.store_name}重新发货]`,
          ),
          updated_at: new Date().toISOString(),
        })
        .eq("id", pkg.id);

      if (error) throw error;

      alert(
        language === "zh"
          ? "重新发货成功！包裹已回到待分配队列。"
          : "Re-shipped successfully!",
      );
      await loadUserPackages();
    } catch (error) {
      LoggerService.error("重新发货失败:", error);
      alert(language === "zh" ? "操作失败，请重试" : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  // 检查用户是否是合伙店铺账户
  // 注意：合伙店铺账号只能在admin web中注册，客户端web注册的账号都是普通客户账号
  // 判断逻辑：
  // 1. 如果 user_type === 'merchant'，直接返回 true
  // 2. 如果用户有 store_code 或 store_id，返回 true
  // 3. 否则检查用户的邮箱或手机号是否在 delivery_stores 表中
  const checkIfPartnerStore = useCallback(async (user: any) => {
    if (!user) return false;
    
    // 方法1: 检查 user_type
    if (user.user_type === "merchant") {
      return true;
    }
    
    // 方法2: 检查是否有 store_code 或 store_id
    if (user.store_code || user.store_id) {
      return true;
    }
    
    try {
      // 方法3: 构建查询条件，检查用户的邮箱或手机号是否在 delivery_stores 表中
      const conditions: string[] = [];
      if (user.email) {
        conditions.push(`email.eq.${user.email}`);
      }
      if (user.phone) {
        conditions.push(`phone.eq.${user.phone}`);
      }
      
      // 如果没有邮箱和手机号，无法判断
      if (conditions.length === 0) {
        return false;
      }
      
      // 检查用户的邮箱或手机号是否在 delivery_stores 表中
      // 只有admin web中创建的合伙店铺账号才会在delivery_stores表中有记录
      const { data, error } = await supabase
        .from("delivery_stores")
        .select("id")
        .or(conditions.join(","))
        .limit(1);
      
      if (error) {
        LoggerService.error("检查合伙店铺失败:", error);
        return false;
      }
      
      // 如果找到匹配的记录，说明是合伙店铺账号（在admin web中注册的）
      return data && data.length > 0;
    } catch (error) {
      LoggerService.error("检查合伙店铺异常:", error);
      return false;
    }
  }, []);

  // 从本地存储加载用户信息
  const loadUserFromStorage = useCallback(async () => {
    const savedUser = localStorage.getItem("ml-express-customer");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setUserBalance(user.balance || 0); // 🚀 获取余额
        setIsGuest(false);

      // 🚀 实时从数据库同步最新余额和用户信息
      if (user.id) {
        try {
            const isMerchant =
              user.user_type === "merchant" ||
              (await checkIfPartnerStore(user));
            const syncTable = isMerchant ? "delivery_stores" : "users";
          const selectFields = isMerchant 
              ? "store_name, phone, email, address"
              : "balance, user_type, name, phone, email, address";

          const { data: latestRaw, error: userError } = await supabase
            .from(syncTable)
            .select(selectFields)
              .eq("id", user.id)
            .maybeSingle();
          
          if (!userError && latestRaw) {
              console.log("✅ Web端用户信息同步成功:", latestRaw);
            const rawData = latestRaw as any;
            const latestUser: any = { ...user, ...rawData };
            
            if (isMerchant) {
              latestUser.name = rawData.store_name;
                latestUser.user_type = "merchant";
              setUserBalance(0);
            } else {
              setUserBalance(rawData.balance || 0);
            }

            setCurrentUser(latestUser);
              localStorage.setItem(
                "ml-express-customer",
                JSON.stringify(latestUser),
              );
          }
        } catch (error) {
            console.warn("获取最新用户信息失败");
        }
      }
        
        // 检查是否是合伙店铺账户
        const isPartner = true; // 🚀 商家端强制为 true
        setIsPartnerStore(true);
        
        // 如果是合伙店铺，加载店铺信息
        if (isPartner && (user.store_code || user.store_id)) {
          try {
            let query = supabase.from("delivery_stores").select("*");

            // 🚀 优化：根据可用标识符构建查询，避免空的 .or() 导致 400 错误
            if (user.store_code && user.store_id) {
              query = query.or(
                `store_code.eq.${user.store_code},id.eq.${user.store_id}`,
              );
            } else if (user.store_code) {
              query = query.eq("store_code", user.store_code);
            } else if (user.store_id) {
              query = query.eq("id", user.store_id);
            }

            const { data: store, error } = await query.maybeSingle();
            
            if (!error && store) {
              setStoreInfo(store);
              setBusinessStatus({
                is_closed_today: store.is_closed_today || false,
                operating_hours: store.operating_hours || "09:00 - 21:00",
                vacation_dates: store.vacation_dates || [],
              });
            }
          } catch (error) {
            LoggerService.error("加载店铺信息失败:", error);
          }
        }
      } catch (error) {
        LoggerService.error("加载用户信息失败:", error);
        setCurrentUser(null);
        setIsPartnerStore(false);
        setIsGuest(true);
      }
    } else {
      // 如果未登录，重定向到登录页
      setIsGuest(true);
      navigate("/login");
    }
  }, [navigate, checkIfPartnerStore]);

  // 加载用户的包裹列表
  const loadUserPackages = useCallback(async () => {
    if (!currentUser?.id) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      // 🚀 核心优化：移除所有账号的注册时间限制，确保 Web 端与 App 端数据完全同步一致
      const queryStartDate = undefined;
      
      const packages = await packageService.getPackagesByUser(
        currentUser.email,
        currentUser.phone,
        queryStartDate,
        isPartnerStore ? currentUser.store_id || currentUser.id : undefined,
        currentUser.id,
        isPartnerStore ? currentUser.name : undefined,
      );
      
      setUserPackages(packages);

      // 🚀 新增：获取已评价的订单ID列表
      if (packages.length > 0) {
        const { data: reviews } = await supabase
          .from("store_reviews")
          .select("order_id")
          .eq("user_id", currentUser.id);
        
        if (reviews) {
          setReviewedOrderIds(new Set(reviews.map((r) => r.order_id)));
        }
      }
    } catch (error) {
      LoggerService.error("加载包裹列表失败:", error);
      setUserPackages([]);
    } finally {
      setLoading(false);
    }
  }, [
    currentUser?.id,
    currentUser?.email,
    currentUser?.phone,
    currentUser?.name,
    currentUser?.store_id,
    isPartnerStore,
  ]);

  useEffect(() => {
    setIsVisible(true);
    loadUserFromStorage();
  }, [loadUserFromStorage]);

  // 加载合伙店铺代收款统计
  const loadPartnerCODStats = useCallback(async () => {
    const userId = currentUser?.id || storeInfo?.id;
    const storeName = currentUser?.name || storeInfo?.store_name;

    if (!userId || !isPartnerStore) {
      return;
    }

    try {
      const stats = await packageService.getPartnerStats(
        userId,
        storeName,
        selectedMonth,
      );
      setMerchantCODStats(stats);
    } catch (error) {
      LoggerService.error("加载代收款统计失败:", error);
    }
  }, [
    currentUser?.id,
    currentUser?.name,
    isPartnerStore,
    storeInfo?.id,
    storeInfo?.store_name,
    selectedMonth,
  ]);

  // 🚀 新增：加载店铺评价逻辑
  const loadStoreReviews = useCallback(async () => {
    // 🚀 核心优化：确保商家账号使用正确的 store_id 关联评价
    const storeId = storeInfo?.id || currentUser?.store_id || currentUser?.id;
    
    if (!storeId || !isPartnerStore) {
      return;
    }
    
    try {
      setLoadingReviews(true);
      const { data: rawReviews, error: reviewsError } = await supabase
        .from("store_reviews")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      const stats = await reviewService.getStoreReviewStats(storeId);

      setStoreReviews(rawReviews || []);
      setReviewStats(stats);
    } catch (error) {
      LoggerService.error("加载评价失败:", error);
    } finally {
      setLoadingReviews(false);
    }
  }, [currentUser?.id, currentUser?.store_id, isPartnerStore, storeInfo?.id]);

  // 🚀 新增：商家回复评价逻辑
  const handleReplyReview = async (reviewId: string) => {
    if (!replyText.trim()) return;
    try {
      const result = await reviewService.replyToReview(reviewId, replyText);
      if (result.success) {
        alert(
          language === "zh"
            ? "回复成功"
            : language === "en"
              ? "Reply sent"
              : "ပြန်လည်ဖြေကြားပြီးပါပြီ",
        );
        setReplyText("");
        setReplyingToId(null);
        await loadStoreReviews(); // 重新加载
      }
    } catch (error) {
      LoggerService.error("回复失败:", error);
    }
  };

  // 加载价格配置
  const loadPricingSettings = useCallback(async (region?: string) => {
    try {
      const settings = await systemSettingsService.getPricingSettings(region);
      setPricingSettings({
        baseFee: settings.baseFee,
        perKmFee: settings.perKmFee,
        weightSurcharge: settings.weightSurcharge,
        urgentSurcharge: settings.urgentSurcharge,
        oversizeSurcharge: settings.oversizeSurcharge,
        scheduledSurcharge: settings.scheduledSurcharge,
        fragileSurcharge: settings.fragileSurcharge,
        foodBeverageSurcharge: settings.foodBeverageSurcharge,
        freeKmThreshold: settings.freeKmThreshold,
      });
    } catch (error) {
      console.error("加载价格设置失败:", error);
    }
  }, []);

  useEffect(() => {
    loadPricingSettings();
  }, [loadPricingSettings]);

  // 🚀 新增：打开立即下单窗口
  const handleOpenPlaceOrder = () => {
    if (!currentUser) return;

    // 自动填充商家信息 (寄件人)
    setSenderName(currentUser.name || "");
    setSenderPhone(currentUser.phone || currentUser.email || "");

    if (storeInfo) {
      if (storeInfo.latitude && storeInfo.longitude) {
        const formattedAddress = `${storeInfo.address}\n📍 坐标: ${storeInfo.latitude.toFixed(6)}, ${storeInfo.longitude.toFixed(6)}`;
        setSenderAddressText(formattedAddress);
        setSelectedSenderLocation({
          lat: storeInfo.latitude,
          lng: storeInfo.longitude,
        });
      } else {
        setSenderAddressText(storeInfo.address || "");
      }
    } else {
      setSenderAddressText(currentUser.address || "");
    }

    // 重置其他字段
    setReceiverName("");
    setReceiverPhone("");
    setReceiverAddressText("");
    setCodAmount("");
    setDescription("");
    setSelectedProducts({});
    setCartTotal(0);
    setIsCalculated(false);
    setShowOrderForm(true);
  };

  // 🚀 新增：处理商品数量变化 (对齐 HomePage)
  const handleProductQuantityChange = (productId: string, delta: number) => {
    setSelectedProducts((prev) => {
      const currentQty = prev[productId] || 0;
      const newQty = Math.max(0, currentQty + delta);
      const newMap = { ...prev };
      if (newQty === 0) {
        delete newMap[productId];
      } else {
        newMap[productId] = newQty;
      }
      return newMap;
    });
  };

  // 🚀 新增：自动更新描述和代收金额 (对齐 HomePage)
  useEffect(() => {
    if (Object.keys(selectedProducts).length > 0) {
      let totalProductPrice = 0;
      let productDetails: string[] = [];

      Object.entries(selectedProducts).forEach(([id, qty]) => {
        const product = products.find((p) => p.id === id);
        if (product) {
          totalProductPrice += product.price * qty;
          productDetails.push(`${product.name} x${qty}`);
        }
      });

      if (totalProductPrice > 0) {
        setCartTotal(totalProductPrice);
        setCodAmount(hasCOD ? totalProductPrice.toString() : "0");

        const selectedProductsText =
          language === "zh"
            ? "已选商品"
            : language === "en"
              ? "Selected"
              : "ရွေးချယ်ထားသောပစ္စည်း";
        const balancePaymentText =
          language === "zh"
            ? "余额支付"
            : language === "en"
              ? "Balance Payment"
              : "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း";
        const productsText = `[${selectedProductsText}: ${productDetails.join(", ")}][${balancePaymentText}: ${totalProductPrice.toLocaleString()} MMK]`;

        const cleanDesc = description
          .replace(
            /\[已选商品:.*?\]|\[Selected:.*?\]|\[ကုန်ပစ္စည်းများ:.*?\]|\[付给商家:.*?\]|\[Pay to Merchant:.*?\]|\[ဆိုင်သို့ ပေးချေရန်:.*?\]|\[骑手代付:.*?\]|\[Courier Advance Pay:.*?\]|\[ကောင်ရီယာမှ ကြိုတင်ပေးချေခြင်း:.*?\]|\[平台支付:.*?\]|\[Platform Payment:.*?\]|\[ပလက်ဖောင်းမှ ပေးချေခြင်း:.*?\]|\[余额支付:.*?\]|\[Balance Payment:.*?\]|\[လက်ကျန်ငွေဖြင့် ပေးချေခြင်း:.*?\]|\[商品费用（仅余额支付）:.*?\]|\[Item Cost \(Balance Only\):.*?\]|\[ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\):.*?\]/g,
            "",
          )
          .trim();
        setDescription(`${productsText} ${cleanDesc}`.trim());
      }
    } else {
      setCartTotal(0);
      setCodAmount("0");
    }
  }, [selectedProducts, hasCOD, language]);

  // 🚀 新增：估算价格 (对齐 HomePage)
  const calculatePriceEstimate = async () => {
    if (!selectedSenderLocation || !selectedReceiverLocation) {
      alert(
        language === "zh"
          ? "请先在地图上选择寄件和收件位置"
          : "Please select locations on map",
      );
      return;
    }

    try {
      setLoading(true);
      // 计算距离 (简化版，实际应调用 Google Distance Matrix)
      const dist = packageService.calculateDistance(
        selectedSenderLocation.lat,
        selectedSenderLocation.lng,
        selectedReceiverLocation.lat,
        selectedReceiverLocation.lng,
      );

      setCalculatedDistanceDetail(dist);

      // 这里根据 pricingSettings 计算价格
      const base = pricingSettings.baseFee;
      const kmFee =
        Math.max(0, dist - pricingSettings.freeKmThreshold) *
        pricingSettings.perKmFee;

      // 简单估算，不包含所有附加费
      const total = base + kmFee;

      setCalculatedPriceDetail(total);
      setIsCalculated(true);
    } catch (error) {
      console.error("价格估算失败:", error);
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：提交订单 (对齐 HomePage)
  const handleOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !isCalculated) return;

    try {
      setOrderSubmitStatus("processing");
      setShowOrderSuccessModal(true);

      // 构造订单 ID
      const now = new Date();
      const myanmarTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Yangon" }),
      );
      const datePart = myanmarTime.toISOString().slice(2, 10).replace(/-/g, "");
      const randomPart = Math.floor(1000 + Math.random() * 9000);
      const orderId = `MDY${datePart}${randomPart}`;
      setGeneratedOrderId(orderId);

      const orderData: any = {
        id: orderId,
        customer_id: currentUser.id,
        customer_email: currentUser.email || currentUser.store_code,
        sender_name: senderName,
        sender_phone: senderPhone,
        sender_address: senderAddressText,
        sender_latitude: selectedSenderLocation?.lat,
        sender_longitude: selectedSenderLocation?.lng,
        receiver_name: receiverName,
        receiver_phone: receiverPhone,
        receiver_address: receiverAddressText,
        receiver_latitude: selectedReceiverLocation?.lat,
        receiver_longitude: selectedReceiverLocation?.lng,
        package_type: "标准件",
        weight: "1.0",
        description: description,
        price: `${calculatedPriceDetail} MMK`,
        delivery_distance: calculatedDistanceDetail,
        status: "待取件",
        payment_method: paymentMethod,
        cod_amount: parseFloat(codAmount) || 0,
        delivery_store_id: currentUser.store_id || currentUser.id,
        create_time: now.toLocaleString("zh-CN"),
        pickup_time: "",
        delivery_time: "",
        courier: "待分配",
      };

      const result = await packageService.createPackage(orderData);
      if (result) {
        // 生成二维码
        const qrUrl = await QRCode.toDataURL(orderId, { width: 300 });
        setQrCodeDataUrlOrder(qrUrl);
        setOrderSubmitStatus("success");
        setShowOrderForm(false);
        loadUserPackages(); // 刷新列表
      } else {
        throw new Error("Unknown error during package creation");
      }
    } catch (error: any) {
      console.error("下单失败:", error);
      setOrderSubmitStatus("failed");
      setOrderError(error.message || "下单失败，请重试");
    }
  };

  // 🚀 新增：处理地图弹窗打开
  const handleOpenMapModal = (type: "sender" | "receiver") => {
    setMapSelectionType(type);
    setMapClickPosition(null);
    setMapModalPreviewAddress("");
    setMerchantMapSuggestions([]);
    setShowMerchantMapSuggestions(false);
    lastMerchantMapSearchQueryRef.current = "";
    setShowMapModal(true);
  };

  // 🚀 地图点击：落点 + 逆地理编码（对齐客户端）
  const onMapClick = (e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    setMapClickPosition({ lat, lng });
    if (!window.google?.maps?.Geocoder) {
      setMapModalPreviewAddress(
        language === "zh"
          ? `纬度: ${lat.toFixed(6)}, 经度: ${lng.toFixed(6)}`
          : `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
      );
      return;
    }
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        setMapModalPreviewAddress(results[0].formatted_address);
      } else {
        setMapModalPreviewAddress(
          language === "zh"
            ? `纬度: ${lat.toFixed(6)}, 经度: ${lng.toFixed(6)}`
            : `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`,
        );
      }
    });
  };

  const MERCHANT_MAP_DEFAULT_CENTER = { lat: 21.95, lng: 96.08 };

  const performMerchantMapAutocomplete = (input: string) => {
    const svc = merchantAutocompleteServiceRef.current;
    if (!input.trim() || !svc || input.trim().length < 2) {
      setMerchantMapSuggestions([]);
      setShowMerchantMapSuggestions(false);
      setIsLoadingMerchantMapSuggestions(false);
      return;
    }
    if (lastMerchantMapSearchQueryRef.current === input.trim()) {
      return;
    }
    setIsLoadingMerchantMapSuggestions(true);
    lastMerchantMapSearchQueryRef.current = input.trim();
    const center = mapClickPosition || MERCHANT_MAP_DEFAULT_CENTER;
    svc.getPlacePredictions(
      {
        input: input.trim(),
        location: new window.google.maps.LatLng(center.lat, center.lng),
        radius: 50000,
        componentRestrictions: { country: "mm" },
        language:
          language === "zh" ? "zh-CN" : language === "my" ? "my" : "en",
      },
      (predictions, status) => {
        if (lastMerchantMapSearchQueryRef.current !== input.trim()) {
          return;
        }
        setIsLoadingMerchantMapSuggestions(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          predictions &&
          predictions.length > 0
        ) {
          const suggestions = predictions
            .slice(0, 10)
            .map((prediction: google.maps.places.AutocompletePrediction) => ({
              place_id: prediction.place_id,
              main_text:
                prediction.structured_formatting?.main_text ||
                prediction.description,
              secondary_text:
                prediction.structured_formatting?.secondary_text || "",
              description: prediction.description,
            }));
          setMerchantMapSuggestions(suggestions);
          setShowMerchantMapSuggestions(true);
        } else {
          setMerchantMapSuggestions([]);
          setShowMerchantMapSuggestions(false);
        }
      },
    );
  };

  const handleMerchantMapAddressInputChange = (raw: string) => {
    setMapModalPreviewAddress(raw);
    if (merchantMapSearchDebounceRef.current) {
      clearTimeout(merchantMapSearchDebounceRef.current);
    }
    if (!raw.trim()) {
      setMerchantMapSuggestions([]);
      setShowMerchantMapSuggestions(false);
      setIsLoadingMerchantMapSuggestions(false);
      lastMerchantMapSearchQueryRef.current = "";
      return;
    }
    if (raw.trim().length < 2) {
      setMerchantMapSuggestions([]);
      setShowMerchantMapSuggestions(false);
      setIsLoadingMerchantMapSuggestions(false);
      return;
    }
    merchantMapSearchDebounceRef.current = setTimeout(() => {
      performMerchantMapAutocomplete(raw);
    }, 300);
  };

  const handleMerchantMapSelectSuggestion = (suggestion: {
    place_id: string;
    description: string;
  }) => {
    const places = merchantPlacesServiceRef.current;
    if (!places) return;
    setShowMerchantMapSuggestions(false);
    setIsLoadingMerchantMapSuggestions(true);
    lastMerchantMapSearchQueryRef.current = "";
    setMapModalPreviewAddress(suggestion.description);
    places.getDetails(
      {
        placeId: suggestion.place_id,
        fields: ["geometry", "formatted_address", "name"],
      },
      (place, status) => {
        setIsLoadingMerchantMapSuggestions(false);
        if (
          status === window.google.maps.places.PlacesServiceStatus.OK &&
          place?.geometry?.location
        ) {
          const loc = place.geometry.location;
          const coords = { lat: loc.lat(), lng: loc.lng() };
          setMapClickPosition(coords);
          const addr =
            place.formatted_address || place.name || suggestion.description;
          setMapModalPreviewAddress(addr);
          if (merchantMapRef.current) {
            merchantMapRef.current.panTo(coords);
            merchantMapRef.current.setZoom(16);
          }
        }
      },
    );
    setMerchantMapSuggestions([]);
  };

  useEffect(() => {
    return () => {
      if (merchantMapSearchDebounceRef.current) {
        clearTimeout(merchantMapSearchDebounceRef.current);
      }
    };
  }, []);

  // 🚀 获取当前位置（对齐客户端 HomePage 地图）
  const handleMapModalLocateCurrent = async (
    e: React.MouseEvent<HTMLButtonElement>,
  ) => {
    if (!navigator.geolocation) {
      alert(
        language === "zh"
          ? "您的浏览器不支持地理定位功能"
          : language === "en"
            ? "Geolocation is not supported"
            : "ဤဘရောက်ဆာတွင် တည်နေရာမရရှိပါ",
      );
      return;
    }
    if (!window.google?.maps?.Geocoder) {
      alert(
        language === "zh"
          ? "地图尚未加载完成，请稍后再试"
          : "Map is still loading, please try again",
      );
      return;
    }
    const button = e.currentTarget;
    const originalContent = button.innerHTML;
    button.innerHTML = "🔄";
    button.style.opacity = "0.7";
    button.disabled = true;
    try {
      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 300000,
          });
        },
      );
      const { latitude, longitude } = position.coords;
      setMapClickPosition({ lat: latitude, lng: longitude });
      try {
        const geocoder = new window.google.maps.Geocoder();
        const result = await new Promise<google.maps.GeocoderResult[]>(
          (resolve, reject) => {
            geocoder.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results, status) => {
                if (status === "OK" && results) {
                  resolve(results);
                } else {
                  reject(new Error(`Geocoding failed: ${status}`));
                }
              },
            );
          },
        );
        if (result?.[0]) {
          const address = result[0].formatted_address;
          setMapModalPreviewAddress(address);
          alert(
            language === "zh"
              ? `✅ 定位成功！\n\n地址：${address}\n\n坐标：${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
              : language === "en"
                ? `✅ Located\n\n${address}\n\n${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
                : `✅ ${address}\n${latitude.toFixed(6)}, ${longitude.toFixed(6)}`,
          );
        } else {
          throw new Error("no result");
        }
      } catch {
        setMapModalPreviewAddress(
          language === "zh"
            ? `纬度: ${latitude.toFixed(6)}, 经度: ${longitude.toFixed(6)}`
            : `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`,
        );
        alert(
          language === "zh"
            ? `📍 已获取坐标：\n纬度: ${latitude.toFixed(6)}\n经度: ${longitude.toFixed(6)}\n\n请手动输入详细地址`
            : `📍 Coordinates:\n${latitude.toFixed(6)}, ${longitude.toFixed(6)}\n\nEnter address manually if needed`,
        );
      }
    } catch (error: unknown) {
      const geo = error as GeolocationPositionError;
      let errorMessage =
        language === "zh" ? "无法获取您的位置" : "Could not get your location";
      if (geo && typeof geo.code === "number") {
        switch (geo.code) {
          case 1:
            errorMessage =
              language === "zh"
                ? "❌ 位置权限被拒绝\n\n请在浏览器设置中允许本站使用位置"
                : "❌ Location permission denied";
            break;
          case 2:
            errorMessage =
              language === "zh"
                ? "❌ 位置信息不可用\n\n请检查设备定位设置"
                : "❌ Position unavailable";
            break;
          case 3:
            errorMessage =
              language === "zh"
                ? "❌ 定位超时\n\n请稍后在信号较好处重试"
                : "❌ Location request timed out";
            break;
          default:
            errorMessage = geo.message || errorMessage;
        }
      }
      alert(errorMessage);
    } finally {
      button.innerHTML = originalContent;
      button.style.opacity = "1";
      button.disabled = false;
    }
  };

  // 🚀 新增：确认地图选择
  const confirmMapSelection = () => {
    if (!mapClickPosition) return;
    const coordLine = `📍 坐标: ${mapClickPosition.lat.toFixed(6)}, ${mapClickPosition.lng.toFixed(6)}`;
    const addrBlock = mapModalPreviewAddress.trim();

    if (mapSelectionType === "sender") {
      setSelectedSenderLocation(mapClickPosition);
      setSenderAddressText((prev) => {
        const base = prev.split("\n📍 坐标:")[0].trim();
        return addrBlock
          ? `${base}\n${addrBlock}\n${coordLine}`
          : `${base}\n${coordLine}`;
      });
    } else {
      setSelectedReceiverLocation(mapClickPosition);
      setReceiverAddressText((prev) => {
        const base = prev.split("\n📍 坐标:")[0].trim();
        return addrBlock
          ? `${base}\n${addrBlock}\n${coordLine}`
          : `${base}\n${coordLine}`;
      });
    }
    setShowMapModal(false);
    setMapClickPosition(null);
    setMapModalPreviewAddress("");
    setMerchantMapSuggestions([]);
    setShowMerchantMapSuggestions(false);
  };

  // 🚀 新增：下载订单二维码
  const downloadOrderQRCode = () => {
    if (qrCodeDataUrlOrder && generatedOrderId) {
      const link = document.createElement("a");
      link.download = `订单二维码_${generatedOrderId}.png`;
      link.href = qrCodeDataUrlOrder;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const location = useLocation();

  // 🚀 响应侧边栏触发立即下单
  useEffect(() => {
    if (location.state && (location.state as any).triggerOrder) {
      handleOpenPlaceOrder();
      // 清除 state 防止重复触发
      window.history.replaceState({}, document.title);
    }
  }, [location.state, handleOpenPlaceOrder]);

  useEffect(() => {
    const handleTriggerOrder = () => {
      handleOpenPlaceOrder();
    };
    window.addEventListener("trigger-place-order", handleTriggerOrder);
    return () =>
      window.removeEventListener("trigger-place-order", handleTriggerOrder);
  }, [handleOpenPlaceOrder]);

  // 1. 加载用户包裹列表
  useEffect(() => {
    loadUserPackages();
  }, [loadUserPackages]);

  // 2. 如果是商家，加载相关统计、商品和评价
  useEffect(() => {
    if (isPartnerStore) {
      loadPartnerCODStats();
    }
  }, [isPartnerStore, loadPartnerCODStats]);

  useEffect(() => {
    if (isPartnerStore) {
      loadProducts();
    }
  }, [isPartnerStore, loadProducts]);

  useEffect(() => {
    if (isPartnerStore) {
      loadStoreReviews();
    }
  }, [isPartnerStore, loadStoreReviews]);

  // 🚀 新增：商家订单实时监控逻辑
  useEffect(() => {
    if (!isPartnerStore || !currentUser?.id) return;

    // 每 15 秒轮询一次新订单
    const timer = setInterval(async () => {
      try {
        const storeId = currentUser.store_id || currentUser.id;
        
        // 🚀 修正：仅查询该商家的“待确认”订单（从商城进来的新订单）
        const { count, error } = await supabase
          .from("packages")
          .select("id", { count: "exact" })
          .eq("delivery_store_id", storeId)
          .eq("status", "待确认");

        if (!error && count !== null) {
          setPendingMerchantOrdersCount(count);

          // 🚀 核心优化：检测到有待接单订单时，自动开启语音提醒功能
          if (count > 0 && !isVoiceEnabled) {
            console.log("🚨 检测到待确认订单，自动开启语音提醒状态");
            setIsVoiceEnabled(true);
          }

          // 🚀 播报逻辑
          if (count > 0 && isVoiceEnabled) {
            const now = Date.now();
            
            // 情况1：有新订单进来（数量增加）
            if (count > lastBroadcastCountRef.current) {
              console.log("🚨 检测到新待确认订单!", count);
              speakNotification("你有新的订单 请接单");
              // 🚀 核心：自动刷新包裹列表，让新订单“弹出来”显示在卡片里
              loadUserPackages();
            } 
            // 情况2：仍然有待确认订单，且距离上次播报超过 60 秒
            else if (now - lastVoiceTimeRef.current >= 60000) {
              console.log("📢 60秒周期性播报提醒...");
              speakNotification("你有新的订单 请接单");
            }
          } 
          // 🚀 核心逻辑：假如没有了 “待确认” 状态的订单，且之前是开启状态，则语音播报功能自动关闭
          else if (count === 0 && isVoiceEnabled) {
            console.log("✅ 所有订单已处理，自动关闭语音提醒");
            setIsVoiceEnabled(false);
            speakNotification(
              language === "zh"
                ? "订单已全部接单 语音提醒已关闭"
                : "All orders accepted, voice alert disabled",
            );
          }
          
          lastBroadcastCountRef.current = count;
        }
      } catch (err) {
        console.error("监控商家订单失败:", err);
      }
    }, 15000);

    return () => clearInterval(timer);
  }, [
    isPartnerStore,
    currentUser?.id,
    isVoiceEnabled,
    language,
    loadUserPackages,
  ]);

  // 查看代收款订单
  const handleViewCODOrders = async (settled?: boolean) => {
    if (!currentUser || !isPartnerStore) return;
    
    try {
      const storeName = currentUser.name || storeInfo?.store_name;
      const userId = currentUser.id || storeInfo?.id;
      
      if (userId) {
        // 设置模态框标题
        if (settled === true) {
          setCodModalTitle(
            language === "zh"
              ? "本月已结清订单"
              : language === "en"
                ? "Monthly Settled Orders"
                : "လအလိုက် ငွေရှင်းပြီးသော အော်ဒါများ",
          );
        } else if (settled === false) {
          setCodModalTitle(
            language === "zh"
              ? "待结清订单"
              : language === "en"
                ? "Uncleared Orders"
                : "ရှင်းလင်းရန် စောင့်ဆိုင်းနေသော အော်ဒါများ",
          );
        } else {
          setCodModalTitle(
            language === "zh"
              ? "代收款订单"
              : language === "en"
                ? "COD Orders"
                : "ငွေကောက်ခံရန် အော်商များ",
          );
        }

        // 分页获取第一页
        const { orders } = await packageService.getPartnerCODOrders(
          userId,
          storeName,
          selectedMonth,
          settled,
        );
        setCodOrders(orders);
        setShowCODOrdersModal(true);
      }
    } catch (error) {
      LoggerService.error("加载代收款订单失败:", error);
      alert("加载订单列表失败");
    }
  };

  // 当包裹列表变化时，重置到第一页
  useEffect(() => {
    setCurrentPage(1);
  }, [userPackages.length]);

  // 退出登录
  const handleLogout = () => {
    localStorage.removeItem("ml-express-customer");
    setCurrentUser(null);
    navigate("/");
  };

  // 处理密码修改
  const handlePasswordChange = async () => {
    if (!isPartnerStore || !storeInfo) {
      alert(
        language === "zh"
          ? "只有合伙店铺账户可以修改密码"
          : language === "en"
            ? "Only merchants store accounts can change password"
            : "လုပ်ဖော်ကိုင်ဖက်ဆိုင်အကောင့်သာ စကားဝှက်ကို ပြောင်းလဲနိုင်သည်",
      );
      return;
    }

    // 验证输入
    if (!passwordForm.currentPassword) {
      alert(
        language === "zh"
          ? "请输入当前密码"
          : language === "en"
            ? "Please enter current password"
            : "လက်ရှိစကားဝှက်ထည့်ပါ",
      );
      return;
    }

    if (!passwordForm.newPassword) {
      alert(
        language === "zh"
          ? "请输入新密码"
          : language === "en"
            ? "Please enter new password"
            : "စကားဝှက်အသစ်ထည့်ပါ",
      );
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert(
        language === "zh"
          ? "新密码至少需要6位"
          : language === "en"
            ? "New password must be at least 6 characters"
            : "စကားဝှက်အသစ်သည် အနည်းဆုံး ၆ လုံးရှိရမည်",
      );
      return;
    }

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert(
        language === "zh"
          ? "两次输入的密码不一致"
          : language === "en"
            ? "Passwords do not match"
            : "စကားဝှက်များ မတူညီပါ",
      );
      return;
    }

    // 验证当前密码
    if (storeInfo.password !== passwordForm.currentPassword) {
      alert(
        language === "zh"
          ? "当前密码错误"
          : language === "en"
            ? "Current password is incorrect"
            : "လက်ရှိစကားဝှက် မှားနေပါသည်",
      );
      return;
    }

    try {
      // 更新密码
      const { error } = await supabase
        .from("delivery_stores")
        .update({ password: passwordForm.newPassword })
        .eq("id", storeInfo.id);

      if (error) {
        LoggerService.error("更新密码失败:", error);
        alert(
          language === "zh"
            ? "更新密码失败，请稍后重试"
            : language === "en"
              ? "Failed to update password, please try again later"
              : "စကားဝှက် ပြောင်းလဲရန် မအောင်မြင်ပါ",
        );
        return;
      }

      // 更新本地存储的店铺信息
      setStoreInfo({ ...storeInfo, password: passwordForm.newPassword });
      
      // 清空表单并关闭模态框
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordModal(false);
      
      alert(
        language === "zh"
          ? "密码修改成功！"
          : language === "en"
            ? "Password changed successfully!"
            : "စကားဝှက် ပြောင်းလဲခြင်း အောင်မြင်ပါသည်!",
      );
    } catch (error) {
      LoggerService.error("更新密码异常:", error);
      alert(
        language === "zh"
          ? "更新密码失败，请稍后重试"
          : language === "en"
            ? "Failed to update password, please try again later"
            : "စကားဝှက် ပြောင်းလဲရန် မအောင်မြင်ပါ",
      );
    }
  };

  // 🚀 新增：导出对账单逻辑
  const handleExportStatement = async () => {
    if (!currentUser?.id || !isPartnerStore) return;
    
    try {
      setIsExporting(true);
      
      console.log("📡 开始查询订单数据...", {
        store_id: currentUser.store_id || currentUser.id,
        start: exportStartDate,
        end: exportEndDate,
      });

      // 1. 获取该日期范围内的订单数据
      const { data: orders, error } = await supabase
        .from("packages")
        .select("*")
        .eq("delivery_store_id", currentUser.store_id || currentUser.id)
        .gte("created_at", `${exportStartDate}T00:00:00.000Z`)
        .lte("created_at", `${exportEndDate}T23:59:59.999Z`)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("❌ 数据库查询失败:", error);
        throw error;
      }

      console.log(`✅ 获取到 ${orders?.length || 0} 条订单`);

      if (!orders || orders.length === 0) {
        alert(
          language === "zh"
            ? "所选日期范围内没有订单数据"
            : "No orders found in the selected date range",
        );
        setIsExporting(false);
        return;
      }

      // 2. 准备导出数据
      const fileName = `Statement_${storeInfo?.store_name || "Merchant"}_${exportStartDate}_to_${exportEndDate}`;
      
      if (exportFormat === "excel") {
        // 生成 Excel
        console.log("📄 正在生成 Excel...");
        const worksheetData = orders.map((pkg) => ({
          订单号: pkg.id,
          下单时间: new Date(pkg.created_at).toLocaleString(),
          寄件人: pkg.sender_name,
          收件人: pkg.receiver_name,
          状态: pkg.status,
          跑腿费: pkg.price,
          代收金额: pkg.cod_amount || 0,
          支付方式: pkg.payment_method === "cash" ? "现金" : "余额",
          结算状态: pkg.cod_settled ? "已结算" : "待结算",
        }));

        const ws = XLSX.utils.json_to_sheet(worksheetData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Orders");
        
        if (exportMethod === "download") {
          console.log("⬇️ 正在下载 Excel...");
          XLSX.writeFile(wb, `${fileName}.xlsx`);
          setIsExporting(false);
          setShowExportModal(false);
        } else {
          // 发送邮件需要 Base64
          console.log("📧 正在准备邮件发送 (Excel)...");
          const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
          const base64Data = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
          await sendStatementByEmail(base64Data, `${fileName}.xlsx`);
        }
      } else {
        // 生成 PDF
        console.log("📄 正在尝试生成 PDF...");
        try {
          const doc = new jsPDF();
          
          // 添加标题
          doc.setFontSize(18);
          // 🚀 核心修复：jsPDF 默认不支持中文/缅文。如果 store_name 包含这些字符，doc.text 可能会报错。
          // 我们尝试使用拼音或占位符，并强烈建议用户使用 Excel 格式。
          const displayStoreName = (
            storeInfo?.store_name || "Merchant"
          ).replace(/[^\x00-\x7F]/g, "*");
          doc.text(`Statement: ${displayStoreName}`, 14, 20);
          
          doc.setFontSize(12);
          doc.text(`Period: ${exportStartDate} to ${exportEndDate}`, 14, 30);
          
          // 准备表格数据 - 全部转为 ASCII 兼容字符
          const tableColumn = [
            "ID",
            "Date",
            "Receiver",
            "Status",
            "Price",
            "COD",
            "Settled",
          ];
          const tableRows = orders.map((pkg) => [
            pkg.id.slice(-8), 
            new Date(pkg.created_at).toLocaleDateString(),
            (pkg.receiver_name || "").replace(/[^\x00-\x7F]/g, "*"),
            (pkg.status || "").replace(/[^\x00-\x7F]/g, "*"),
            pkg.price,
            pkg.cod_amount || 0,
            pkg.cod_settled ? "Yes" : "No",
          ]);

          console.log("📊 正在调用 autoTable...");
          (doc as any).autoTable({
            head: [tableColumn],
            body: tableRows,
            startY: 40,
            theme: "grid",
            styles: { fontSize: 8, font: "helvetica" },
          });

          if (exportMethod === "download") {
            console.log("⬇️ 正在执行 PDF 下载保存...");
            doc.save(`${fileName}.pdf`);
            setIsExporting(false);
            setShowExportModal(false);
          } else {
            console.log("📧 正在准备 PDF 邮件数据...");
            const pdfBase64 = doc.output("datauristring");
            await sendStatementByEmail(pdfBase64, `${fileName}.pdf`);
          }
        } catch (pdfErr) {
          console.error("❌ PDF 生成过程崩溃:", pdfErr);
          alert(
            language === "zh"
              ? "PDF 格式暂不支持中文/缅文，请选择 Excel (XLSX) 格式导出。"
              : "PDF format currently does not support Unicode. Please use Excel (XLSX) instead.",
          );
          setIsExporting(false);
        }
      }
    } catch (error) {
      LoggerService.error("导出对账单失败:", error);
      alert("导出失败，请检查网络重试");
      setIsExporting(false);
    }
  };

  const sendStatementByEmail = async (fileData: string, fileName: string) => {
    try {
      const response = await fetch("/.netlify/functions/send-statement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: storeInfo?.email || currentUser?.email,
          storeName: storeInfo?.store_name,
          startDate: exportStartDate,
          endDate: exportEndDate,
          fileData,
          fileName,
          format: exportFormat,
          language,
        }),
      });

      const result = await response.json();
      if (result.success) {
        alert(
          language === "zh"
            ? "✅ 对账单已成功发送到您的邮箱"
            : "✅ Statement has been sent to your email",
        );
        setShowExportModal(false);
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      alert(`发送失败: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 🚀 新增：客户评价相关逻辑
  const handleOpenReviewModal = (pkg: any) => {
    setReviewOrder(pkg);
    setReviewRating(5);
    setReviewComment("");
    setReviewImages([]);
    setShowReviewSubmitModal(true);
  };

  const handleReviewImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !currentUser?.id) return;

    try {
      setIsUploadingReviewImage(true);
      const uploadPromises = Array.from(files).map((file) =>
        reviewService.uploadReviewImage(currentUser.id, file),
      );
      
      const urls = await Promise.all(uploadPromises);
      const validUrls = urls.filter((url): url is string => url !== null);
      
      setReviewImages((prev) => [...prev, ...validUrls].slice(0, 6)); // 最多6张
    } catch (error) {
      LoggerService.error("上传评价图片失败:", error);
    } finally {
      setIsUploadingReviewImage(false);
    }
  };

  const handleRemoveReviewImage = (index: number) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmitReview = async () => {
    if (!reviewOrder || !currentUser?.id) return;
    if (!reviewComment.trim()) {
      alert(
        language === "zh" ? "请输入评价内容" : "Please enter review comment",
      );
      return;
    }

    try {
      setIsSubmittingReview(true);
      const reviewData = {
        store_id:
          reviewOrder.delivery_store_id ||
          "00000000-0000-0000-0000-000000000000", // 使用 UUID 格式的零值作为 fallback
        order_id: reviewOrder.id,
        user_id: currentUser.id,
        user_name: currentUser.name || "User",
        rating: reviewRating,
        comment: reviewComment,
        images: reviewImages,
        is_anonymous: false,
      };

      const result = await reviewService.createReview(reviewData);
      if (result.success) {
        alert(
          language === "zh"
            ? "评价提交成功！感谢您的反馈。"
            : "Review submitted! Thank you.",
        );
        
        // 🚀 更新已评价ID列表，让按钮立即消失
        setReviewedOrderIds((prev) => {
          const newSet = new Set(prev);
          newSet.add(reviewOrder.id);
          return newSet;
        });

        setShowReviewSubmitModal(false);
        // 刷新包裹列表以更新状态（如果需要显示已评价标签）
        await loadUserPackages();
      } else {
        throw new Error("Submit failed");
      }
    } catch (error) {
      LoggerService.error("提交评价失败:", error);
      alert(
        language === "zh"
          ? "提交失败，请重试"
          : "Submission failed, please try again",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // 🚀 新增：商家接单功能
  // 🚀 新增：自动打印小票功能
  const handlePrintReceipt = async (orderData: any) => {
    if (!orderData) return;
    
    try {
      const qrDataUrl = await QRCode.toDataURL(orderData.id, {
        margin: 1,
        width: 180,
      });
      
      // 解析商品信息
      const itemsMatch = orderData.description?.match(
        /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/,
      );
      const productItems = itemsMatch ? itemsMatch[1].split(", ") : [];
      const parsedItems = productItems.map((item: string) => {
        const match = item.match(/^(.+?)\s*x(\d+)$/i);
        if (!match) return { label: item, qty: 1, price: undefined };
        const name = match[1].trim();
        const qty = Number(match[2]) || 1;
        const unitPrice = productPriceMap[name];
        return {
          label: name,
          qty,
          price: unitPrice ? unitPrice * qty : undefined,
        };
      });

      const itemPayMatch = orderData.description?.match(
        /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
      );
      const itemCost = itemPayMatch?.[1]
        ? parseFloat(itemPayMatch[1].replace(/,/g, ""))
        : 0;
      const deliveryFee = parseFloat(
        orderData.price?.replace(/[^0-9.]/g, "") || "0",
      );
      const computedItemTotal = parsedItems.reduce(
        (sum: number, item: any) => sum + (item.price || 0),
        0,
      );
      const finalItemTotal = itemCost > 0 ? itemCost : computedItemTotal;
      const totalFee = deliveryFee + finalItemTotal;
      const paymentText =
        orderData.payment_method === "cash"
          ? language === "zh"
            ? "现金支付"
            : "Cash"
          : language === "zh"
            ? "余额支付"
            : "Balance";
      const orderIdShort = `#${orderData.id.slice(-5)}`;

      const html = `
        <html>
          <head>
            <style>
              body { font-family: sans-serif; padding: 20px; color: #111827; width: 300px; margin: 0 auto; line-height: 1.4; }
              .title { text-align: center; font-size: 20px; font-weight: 900; margin-bottom: 5px; }
              .subtitle { text-align: center; font-size: 12px; color: #6b7280; margin-bottom: 15px; }
              .section { border-top: 1px dashed #d1d5db; padding: 10px 0; margin-top: 5px; }
              .row { display: flex; justify-content: space-between; margin: 4px 0; font-size: 12px; align-items: flex-start; }
              .label { color: #6b7280; min-width: 50px; }
              .value { font-weight: 600; text-align: right; flex: 1; margin-left: 10px; }
              .item-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
              .total-row { font-size: 15px; font-weight: 900; border-top: 1px solid #000; margin-top: 10px; padding-top: 8px; }
              .qr-box { text-align: center; margin: 15px 0; }
              .qr-box img { width: 140px; height: 140px; }
              .footer-note { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 20px; font-style: italic; }
            </style>
          </head>
          <body>
            <div class="title">MARKET LINK EXPRESS</div>
            <div class="subtitle">订单号 ${orderIdShort}</div>
            
            <div class="qr-box">
              <img src="${qrDataUrl}" />
              <div style="font-size: 11px; font-weight: bold; margin-top: 5px;">取件码: ${orderData.id}</div>
            </div>

            <div class="section">
              <div class="row"><span class="label">商家:</span><span class="value">${orderData.sender_name || "-"}</span></div>
              <div class="row"><span class="label">电话:</span><span class="value">${orderData.sender_phone || "-"}</span></div>
              <div class="row"><span class="label">地址:</span><span class="value">${orderData.sender_address || "-"}</span></div>
            </div>

            <div class="section">
              <div class="row"><span class="label">客户:</span><span class="value">${orderData.receiver_name || "-"}</span></div>
              <div class="row"><span class="label">电话:</span><span class="value">${orderData.receiver_phone || "-"}</span></div>
              <div class="row"><span class="label">地址:</span><span class="value">${orderData.receiver_address || "-"}</span></div>
            </div>

            <div class="section">
              <div class="row"><span class="label">支付:</span><span class="value">${paymentText}</span></div>
              ${parsedItems
                .map(
                  (item: any) => `
                <div class="item-row">
                  <span>• ${item.label} x${item.qty}</span>
                  <span>${item.price ? `${item.price.toLocaleString()} MMK` : "-"}</span>
                </div>
              `,
                )
                .join("")}
              <div class="row"><span class="label">跑腿费:</span><span class="value">${deliveryFee.toLocaleString()} MMK</span></div>
              <div class="row total-row"><span>合计:</span><span>${totalFee.toLocaleString()} MMK</span></div>
            </div>

            <div class="footer-note">请保留此票据用于对账，感谢使用！</div>
          </body>
        </html>
      `;

      // 🚀 Web 端静默打印逻辑
      const iframe = document.createElement("iframe");
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "none";
      document.body.appendChild(iframe);
      
      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
        
        // 等待图片加载完成再打印
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          // 打印后移除 iframe
          setTimeout(() => {
            document.body.removeChild(iframe);
          }, 1000);
        }, 500);
      }
    } catch (error) {
      LoggerService.error("生成小票失败:", error);
    }
  };

  const handleAcceptOrder = async (targetPkg?: any) => {
    const pkgToAccept = targetPkg || selectedPackage;
    if (!pkgToAccept?.id) return;
    
    try {
      setLoading(true);
      
      // 检查当前状态是否是待确认
      if (pkgToAccept.status !== "待确认") {
        alert(
          language === "zh"
            ? "该订单状态已变更，无法接单"
            : "Order status has changed, cannot accept",
        );
        return;
      }

      // 更新状态为“打包中”
      const success = await packageService.updatePackageStatus(
        pkgToAccept.id,
        "打包中",
      );
      
      if (success) {
        // 🚀 核心优化：接单成功后自动打印小票
        handlePrintReceipt(pkgToAccept);
        
        alert(
          language === "zh"
            ? "接单成功！小票已自动打印，请开始打包商品。"
            : "Order accepted! Receipt printed, please start packing.",
        );
        // 刷新本地数据
        const updatedPackage = { ...pkgToAccept, status: "打包中" };
        if (!targetPkg) setSelectedPackage(updatedPackage);
        setUserPackages((prev) =>
          prev.map((p) => (p.id === pkgToAccept.id ? updatedPackage : p)),
        );
      } else {
        throw new Error("Update failed");
      }
    } catch (error) {
      LoggerService.error("接单失败:", error);
      alert(
        language === "zh"
          ? "接单失败，请重试"
          : "Accept failed, please try again",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：商家取消订单功能（商品卖完时）
  const handleCancelOrder = async (pkg: any) => {
    if (!pkg?.id) return;
    
    const confirmMsg =
      language === "zh"
        ? "确定要取消此订单吗？（此操作不可逆，通常用于商品已售罄的情况）"
        : language === "en"
          ? "Are you sure you want to cancel this order? (This action is irreversible, typically used when items are sold out)"
          : "ဤအော်ဒါကို ပယ်ဖျက်ရန် သေချာပါသလား? (ပစ္စည်းပြတ်လပ်သွားသောအခါတွင် အသုံးပြုရန်)";
      
    if (!window.confirm(confirmMsg)) return;

    try {
      setLoading(true);
      
      // 更新状态为“已取消”
      const success = await packageService.updatePackageStatus(
        pkg.id,
        "已取消",
      );
      
      if (success) {
        alert(
          language === "zh"
            ? "订单已成功取消"
            : language === "en"
              ? "Order cancelled successfully"
              : "အော်ဒါကို ပယ်ဖျက်ပြီးပါပြီ",
        );
        // 刷新本地数据
        const updatedPackage = { ...pkg, status: "已取消" };
        setUserPackages((prev) =>
          prev.map((p) => (p.id === pkg.id ? updatedPackage : p)),
        );
      } else {
        throw new Error("Cancel failed");
      }
    } catch (error) {
      LoggerService.error("取消订单失败:", error);
      alert(
        language === "zh"
          ? "操作失败，请重试"
          : "Operation failed, please try again",
      );
    } finally {
      setLoading(false);
    }
  };

  // 🚀 新增：开始打包功能
  const handleStartPacking = (pkg: any) => {
    setPackingOrderData(pkg);
    setCheckedItems({});
    setShowPackingModal(true);
    setShowPackageDetailModal(false);
  };

  // 🚀 新增：切换打包项勾选状态
  const toggleItem = (itemId: string) => {
    setCheckedItems((prev) => ({
      ...prev,
      [itemId]: !prev[itemId],
    }));
  };

  // 🚀 新增：完成打包逻辑
  const handleCompletePacking = async () => {
    if (!packingOrderData) return;

    try {
      setLoading(true);
      
      // 确定新的状态：如果已支付（如 VIP 余额支付）则进入待取件，否则进入待收款
      // 实际上对于商家，统称为“待取件”或“待收款”，我们这里统一逻辑
      const isPaid =
        packingOrderData.payment_method === "balance" ||
        packingOrderData.payment_status === "paid";
      const nextStatus = isPaid ? "待取件" : "待收款";

      const success = await packageService.updatePackageStatus(
        packingOrderData.id,
        nextStatus,
      );
      
      if (success) {
        alert(
          language === "zh"
            ? "打包完成！快递员将很快上门取件。"
            : "Packing complete! Courier will arrive soon.",
        );
        setShowPackingModal(false);
        setPackingOrderData(null);
        // 刷新本地列表
        setUserPackages((prev) =>
          prev.map((p) =>
            p.id === packingOrderData.id ? { ...p, status: nextStatus } : p,
          ),
        );
      } else {
        throw new Error("Status update failed");
      }
    } catch (error) {
      LoggerService.error("打包完成更新失败:", error);
      alert(
        language === "zh"
          ? "提交失败，请重试"
          : "Submission failed, please try again",
      );
    } finally {
      setLoading(false);
    }
  };

  // 语言切换函数
  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    localStorage.setItem("ml-express-language", newLanguage);
  };

  // 点击外部关闭下拉框
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showLanguageDropdown && !target.closest("[data-language-dropdown]")) {
        setShowLanguageDropdown(false);
      }
    };

    if (showLanguageDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLanguageDropdown]);

  // 如果未登录，不显示内容
  if (!currentUser) {
    return null;
  }

  // 获取店铺类型文本
  const getStoreTypeLabel = (type: string) => {
    const typeMap: { [key: string]: { zh: string; en: string; my: string } } = {
      restaurant: { zh: "餐厅", en: "Restaurant", my: "စားသောက်ဆိုင်" },
      tea_shop: { zh: "茶馆", en: "Tea Shop", my: "လက်ဖက်ရည်ဆိုင်" },
      drinks_snacks: {
        zh: "饮料小吃",
        en: "Drinks & Snacks",
        my: "အချိုရည်နှင့်မုန့်",
      },
      grocery: { zh: "杂货店", en: "Grocery", my: "ကုန်စုံဆိုင်" },
      transit_station: {
        zh: "中转站",
        en: "Transit Station",
        my: "သယ်ယူပို့ဆောင်ရေးစခန်း",
      },
    };
    const labels = typeMap[type] || { zh: type, en: type, my: type };
    return language === "zh"
      ? labels.zh
      : language === "en"
        ? labels.en
        : labels.my;
  };

  // 格式化日期
  const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString(
      language === "zh" ? "zh-CN" : language === "en" ? "en-US" : "my-MM",
      {
        year: "numeric",
        month: "long",
        day: "numeric",
      },
    );
  };

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const statusMap: { [key: string]: string } = {
      待确认: "#fbbf24", // 🚀 琥珀色
      打包中: "#10b981", // 🚀 绿色
      待取件: "#f59e0b",
      已取件: "#3b82f6",
      运输中: "#8b5cf6",
      已送达: "#10b981",
      待收款: "#ef4444",
      已取消: "#94a3b8", // 🚀 灰色
      已完成: "#6b7280",
    };
    return statusMap[status] || "#6b7280";
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    if (status === "待收款")
      return language === "zh"
        ? "待取件"
        : language === "en"
          ? "Pending Pickup"
          : "ကောက်ယူရန်စောင့်ဆိုင်းနေသည်";
    if (status === "待确认")
      return language === "zh"
        ? "待接单"
        : language === "en"
          ? "Pending Accept"
          : "လက်ခံရန်စောင့်ဆိုင်းနေသည်";
    if (status === "打包中")
      return language === "zh"
        ? "打包中"
        : language === "en"
          ? "Packing"
          : "ထုပ်ပိုးနေသည်";
    if (status === "已取消")
      return language === "zh"
        ? "已取消"
        : language === "en"
          ? "Cancelled"
          : "ပယ်ဖျက်လိုက်သည်";
    return status;
  };

  // 获取支付方式文本
  const getPaymentMethodText = (paymentMethod?: string) => {
    if (paymentMethod === "qr") {
      return language === "zh"
        ? "转账"
        : language === "en"
          ? "Transfer"
          : "ငွေလွှဲ";
    } else if (paymentMethod === "cash") {
      return language === "zh"
        ? "现金支付"
        : language === "en"
          ? "Cash"
          : "ငွေသား";
    } else if (paymentMethod === "balance") {
      return language === "zh"
        ? "余额支付"
        : language === "en"
          ? "Balance"
          : "လက်ကျန်ငွေဖြင့် ပေးချေခြင်း";
    }
    return language === "zh"
      ? "未知"
      : language === "en"
        ? "Unknown"
        : "မသိရှိရ";
  };

  // 获取支付方式颜色
  const getPaymentMethodColor = (paymentMethod?: string) => {
    if (paymentMethod === "qr") {
      return "rgba(34, 197, 94, 0.3)"; // 绿色
    } else if (paymentMethod === "cash") {
      return "rgba(251, 191, 36, 0.3)"; // 黄色
    } else if (paymentMethod === "balance") {
      return "rgba(59, 130, 246, 0.3)"; // 蓝色
    }
    return "rgba(156, 163, 175, 0.3)"; // 灰色
  };

  // 获取支付方式边框颜色
  const getPaymentMethodBorderColor = (paymentMethod?: string) => {
    if (paymentMethod === "qr") {
      return "rgba(34, 197, 94, 0.5)";
    } else if (paymentMethod === "cash") {
      return "rgba(251, 191, 36, 0.5)";
    } else if (paymentMethod === "balance") {
      return "rgba(59, 130, 246, 0.5)";
    }
    return "rgba(156, 163, 175, 0.5)";
  };

  // 计算订单统计
  const orderStats = {
    total: userPackages.length,
    pendingConfirmation: userPackages.filter((pkg) => pkg.status === "待确认")
      .length, // 🚀 待确认
    packing: userPackages.filter((pkg) => pkg.status === "打包中").length, // 🚀 打包中
    pendingPickup: userPackages.filter(
      (pkg) => pkg.status === "待取件" || pkg.status === "待收款",
    ).length,
    inTransit: userPackages.filter(
      (pkg) => pkg.status === "运输中" || pkg.status === "已取件",
    ).length,
    completed: userPackages.filter(
      (pkg) => pkg.status === "已送达" || pkg.status === "已完成",
    ).length,
  };

  // 生成二维码
  const generateQRCode = async (orderId: string) => {
    try {
      const qrCodeUrl = await QRCode.toDataURL(orderId, {
        width: 200,
        margin: 2,
        color: {
          dark: "#2c5282",
          light: "#FFFFFF",
        },
      });
      setQrCodeDataUrl(qrCodeUrl);
    } catch (error) {
      LoggerService.error("生成二维码失败:", error);
    }
  };

  // 显示寄件码
  const showPickupCode = async (pkg: any) => {
    await generateQRCode(pkg.id);
    setShowPickupCodeModal(true);
  };

  // 关闭寄件码模态框
  const closePickupCodeModal = () => {
    setShowPickupCodeModal(false);
    setQrCodeDataUrl("");
  };

  // 保存二维码
  const saveQRCode = () => {
    if (qrCodeDataUrl && selectedPackage) {
      const link = document.createElement("a");
      link.download = `寄件码_${selectedPackage.id}.png`;
      link.href = qrCodeDataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // 🚀 新增：处理充值逻辑
  // 🚀 核心优化：充值流程
  const handleOpenPaymentQR = () => {
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) {
      alert(
        language === "zh"
          ? "请输入有效的充值金额"
          : "Please enter a valid amount",
      );
      return;
    }
    setSelectedRechargeAmount(amount);
    setShowRechargeModal(false);
    setShowPaymentQRModal(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setRechargeProof(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setRechargeProofPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleConfirmRecharge = async () => {
    if (!selectedRechargeAmount || !currentUser?.id) return;
    if (!rechargeProof) {
      alert(
        language === "zh"
          ? "请上传汇款凭证截图"
          : "Please upload payment proof",
      );
      return;
    }

    try {
      setLoading(true);
      
      // 1. 上传图片
      const proofUrl = await rechargeService.uploadProof(
        currentUser.id,
        rechargeProof,
      );
      if (!proofUrl) throw new Error("Upload failed");

      // 2. 创建申请记录
      const result = await rechargeService.createRequest({
        user_id: currentUser.id,
        user_name: currentUser.name || "User",
        amount: selectedRechargeAmount,
        proof_url: proofUrl,
        status: "pending",
        notes: `Web端充值申请: ${selectedRechargeAmount} MMK`,
      });

      if (result.success) {
        alert(
          language === "zh"
            ? "提交成功！管理员审核通过后余额将自动到账。"
            : "Submitted! Balance will be updated after admin review.",
        );
        setShowPaymentQRModal(false);
        setRechargeAmount("");
        setRechargeProof(null);
        setRechargeProofPreview(null);
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error("Recharge failed:", error);
      alert(
        language === "zh"
          ? "提交失败，请稍后重试"
          : "Submission failed, please try again",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSaveQRCode = () => {
    const link = document.createElement("a");
    link.href = `/kbz_qr_${selectedRechargeAmount}.png`;
    link.download = `kbz_qr_${selectedRechargeAmount}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* 主要内容区域 */}
      <div
        style={{
          position: "relative",
        zIndex: 5,
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease",
        }}
      >
        {/* 页面标题 */}
        <div
          style={{
            textAlign: "center", // 🚀 移动到页面中间
            marginBottom: "2rem",
            marginTop: "1.5rem",
          opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(-20px)",
            transition: "all 0.6s ease",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <div
            style={{
              marginBottom: "1rem",
              transform: "scale(1.3)",
              filter: "drop-shadow(0 15px 30px rgba(0,0,0,0.4))",
              transition: "all 0.5s ease",
            }}
          >
            <Logo size="medium" />
          </div>
          <h2
            style={{
              color: "rgba(255,255,255,0.9)",
              fontSize: "1.25rem",
              marginBottom: "0.5rem",
              fontWeight: "800",
              letterSpacing: "3px",
              textTransform: "uppercase",
              textShadow: "0 2px 4px rgba(0,0,0,0.3)",
            }}
          >
            {t.title}
          </h2>
          <p
            style={{
              color: "rgba(255,255,255,0.5)",
              fontSize: "0.85rem",
              fontWeight: "600",
            }}
          >
            {language === "zh"
              ? "欢迎回来，这里是您的经营实时看板"
              : language === "en"
                ? "Welcome back, here is your real-time business dashboard"
                : "ပြန်လည်ကြိုဆိုပါတယ်၊ ဤသည်မှာ သင်၏ အချိန်နှင့်တပြေးညီ လုပ်ငန်းစောင့်ကြည့်စနစ်ဖြစ်ပါသည်"}
          </p>
        </div>

        {/* 用户信息卡片 - 参考客户端app样式 */}
        <div
          style={{
            background: "rgba(255, 255, 255, 0.1)",
            backdropFilter: "blur(12px)",
            borderRadius: "24px",
            padding: "1.5rem",
            marginBottom: "2rem",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          opacity: isVisible ? 1 : 0,
            transform: isVisible ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.6s ease 0.2s",
          }}
        >
          {/* 用户头像和基本信息 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1.5rem",
              marginBottom: "2rem",
              paddingBottom: "1.5rem",
              borderBottom: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            {/* 头像 */}
            
            {/* 用户基本信息 */}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  gap: "1rem",
                  flexWrap: "wrap",
                  marginBottom: "0.5rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.8rem",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      borderRadius: "16px",
                      background:
                        "linear-gradient(135deg, #e0f2fe 0%, #bae6fd 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "3px solid rgba(255, 255, 255, 0.9)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      fontSize: "1.4rem",
                      fontWeight: "700",
                      color: "#0284c7",
                      flexShrink: 0,
                    }}
                  >
                    {currentUser.name
                      ? currentUser.name.charAt(0).toUpperCase()
                      : "U"}
                  </div>
                  <div
                    style={{
                      color: "white",
                      fontSize: "1.6rem",
                      fontWeight: "900",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {currentUser.name || "-"}
                  </div>
                  <div
                    style={{
                    background: isPartnerStore 
                        ? "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)"
                        : userBalance > 0 || currentUser.user_type === "vip"
                          ? "linear-gradient(135deg, #fbbf24 0%, #d97706 100%)"
                          : currentUser.user_type === "admin"
                            ? "linear-gradient(135deg, #f97316 0%, #ea580c 100%)"
                            : currentUser.user_type === "courier"
                              ? "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)"
                              : "linear-gradient(135deg, #7f8c8d 0%, #95a5a6 100%)",
                    boxShadow: isPartnerStore 
                        ? "0 4px 15px rgba(14, 165, 233, 0.4)"
                        : userBalance > 0 || currentUser.user_type === "vip"
                          ? "0 4px 15px rgba(251, 191, 36, 0.4)"
                          : currentUser.user_type === "admin"
                            ? "0 4px 15px rgba(249, 115, 22, 0.4)"
                            : currentUser.user_type === "courier"
                              ? "0 4px 15px rgba(168, 85, 247, 0.4)"
                              : "0 4px 15px rgba(127, 140, 141, 0.4)",
                      color: "white",
                      padding: "0.4rem 1.2rem",
                      borderRadius: "14px",
                      fontSize: "0.85rem",
                      fontWeight: "800",
                      border: "1px solid rgba(255,255,255,0.3)",
                      letterSpacing: "0.5px",
                      textTransform: "uppercase",
                    }}
                  >
                    {isPartnerStore
                      ? "MERCHANTS"
                      : userBalance > 0 || currentUser.user_type === "vip"
                        ? "VIP"
                        : currentUser.user_type === "admin"
                          ? "Admin"
                          : currentUser.user_type === "courier"
                            ? "Courier"
                            : "MEMBER"}
                  </div>

                  {/* 🚀 新增：编辑按钮 (图标形式，匹配 App) */}
                  {currentUser && (
                    <button
                      onClick={handleOpenEditProfile}
                      style={{
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        width: "36px",
                        height: "36px",
                        borderRadius: "10px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        marginLeft: "10px",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.2)";
                        e.currentTarget.style.transform = "scale(1.1)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.1)";
                        e.currentTarget.style.transform = "scale(1)";
                      }}
                      title={language === "zh" ? "编辑资料" : "Edit Profile"}
                    >
                      <span style={{ fontSize: "1.2rem" }}>📝</span>
                    </button>
                  )}
                </div>

                {/* 🚀 商家端：只显示商家资料，不显示会员/充值信息 */}
                <div
                  style={{ display: "flex", alignItems: "center", gap: "1rem" }}
                >
                  {/* 编辑资料按钮 */}
                  <button
                    onClick={handleOpenEditProfile}
                    style={{
                      background: "rgba(59, 130, 246, 0.1)",
                      color: "white",
                      border: "1px solid rgba(59, 130, 246, 0.3)",
                      padding: "0.6rem 1.5rem",
                      borderRadius: "14px",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      whiteSpace: "nowrap",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(59, 130, 246, 0.2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        "rgba(59, 130, 246, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>📝</span>
                    {language === "zh"
                      ? "编辑资料"
                      : language === "en"
                        ? "Edit Profile"
                        : "ကိုယ်ရေးအချက်အလက်ပြင်ဆင်ရန်"}
                  </button>

                  {/* 安全设置按钮 */}
                  <button
                    onClick={() => setShowPasswordModal(true)}
                    style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      color: "white",
                      border: "1px solid rgba(255, 255, 255, 0.3)",
                      padding: "0.6rem 1.5rem",
                      borderRadius: "14px",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      whiteSpace: "nowrap",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>🔐</span>
                    {language === "zh"
                      ? "安全设置"
                      : language === "en"
                        ? "Security"
                        : "လုံခြုံရေး"}
                  </button>

                  <button
                    onClick={() => navigate("/products")}
                    style={{
                      background: "rgba(16, 185, 129, 0.1)",
                      color: "white",
                      border: "1px solid rgba(16, 185, 129, 0.3)",
                      padding: "0.6rem 1.5rem",
                      borderRadius: "14px",
                      fontSize: "0.95rem",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      whiteSpace: "nowrap",
                      backdropFilter: "blur(10px)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(16, 185, 129, 0.2)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        "rgba(16, 185, 129, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: "1.1rem" }}>📦</span>
                    {language === "zh"
                      ? "管理商品"
                      : language === "en"
                        ? "Products"
                        : "ပစ္စည်းစီမံရန်"}
                  </button>
                </div>
              </div>
              
              {isPartnerStore && storeInfo ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      window.innerWidth < 768 ? "1fr" : "repeat(3, 1fr)",
                    gap: "1.25rem",
                    marginTop: "2rem",
                    background: "rgba(255, 255, 255, 0.05)",
                    padding: "1.75rem",
                    borderRadius: "28px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    backdropFilter: "blur(15px)",
                    boxShadow: "inset 0 0 30px rgba(255, 255, 255, 0.03)",
                  }}
                >
                  {/* 第一行：店铺代码, 店铺类型, 电话 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "1.25rem",
                      borderRadius: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      transition: "transform 0.3s ease",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        🆔
                    </div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {t.storeCode}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontFamily: "monospace",
                        fontSize: "1.25rem",
                        letterSpacing: "1px",
                      }}
                    >
                      {storeInfo.store_code}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "1.25rem",
                      borderRadius: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        🏪
                    </div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {t.storeType}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontSize: "1.25rem",
                      }}
                    >
                      {getStoreTypeLabel(storeInfo.store_type)}
                    </span>
                  </div>
                  
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "1.25rem",
                      borderRadius: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        📞
                    </div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {t.phone}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontSize: "1.25rem",
                      }}
                    >
                      {storeInfo.phone ||
                        storeInfo.manager_phone ||
                        currentUser.phone}
                    </span>
                  </div>

                  {/* 第二行：地址, 开户日期 */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "1.25rem",
                      borderRadius: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      gridColumn: window.innerWidth < 768 ? "1" : "1 / span 2",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        📍
                    </div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {t.address}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "white",
                        fontWeight: "600",
                        fontSize: "1.1rem",
                        lineHeight: "1.5",
                      }}
                    >
                      {storeInfo.address}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.6rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      padding: "1.25rem",
                      borderRadius: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          background: "rgba(255,255,255,0.1)",
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "1.1rem",
                        }}
                      >
                        🗓️
                    </div>
                      <span
                        style={{
                          fontSize: "0.85rem",
                          color: "rgba(255,255,255,0.5)",
                          fontWeight: "700",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        {t.accountDate}
                      </span>
                    </div>
                    <span
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontSize: "1.25rem",
                      }}
                    >
                      {formatDate(storeInfo.created_at)}
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", opacity: 0.9 }}>📧</span>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.95)",
                        fontSize: "1rem",
                        fontWeight: "500",
                      }}
                    >
                      {currentUser.email || "未绑定邮箱"}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.8rem",
                    }}
                  >
                    <span style={{ fontSize: "1.1rem", opacity: 0.9 }}>📞</span>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.95)",
                        fontSize: "1rem",
                        fontWeight: "500",
                      }}
                    >
                      {currentUser.phone || "未绑定电话"}
                    </span>
                  </div>
                </div>
              )}
            </div>
            </div>
          </div>

          {/* 订单统计卡片：auto-fill + minmax 避免英文/缅文下一行挤爆；窄屏自动换两行或多行 */}
        <div
          className="merchant-stat-grid"
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(min(100%, 152px), 1fr))",
            gap: "1.5rem",
            marginBottom: "3rem",
            width: "100%",
            minWidth: 0,
          }}
        >
            {/* 全部订单 */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.05) 100%)",
              borderRadius: "24px",
              padding: "1.75rem",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              textAlign: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "default",
              boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 12px 25px rgba(59, 130, 246, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
            }}
          >
            <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
              📦
            </div>
            <div
              style={{
                color: "white",
                fontSize: "2.2rem",
                fontWeight: "900",
                marginBottom: "0.25rem",
                letterSpacing: "-1px",
              }}
            >
                {orderStats.total}
              </div>
            <div
              className="stat-label"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.9rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
                {t.totalOrders}
            </div>
            </div>

            {/* 待接单 (仅当是合伙店铺且有待接单订单时显示) */}
            {isPartnerStore && orderStats.pendingConfirmation > 0 && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(251, 191, 36, 0.2) 0%, rgba(217, 119, 6, 0.1) 100%)",
                borderRadius: "24px",
                padding: "1.75rem",
                border: "2px solid #fbbf24",
                textAlign: "center",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                boxShadow: "0 0 20px rgba(251, 191, 36, 0.3)",
                animation: "pulse-border 2s infinite",
                position: "relative",
                overflow: "hidden",
              }}
              onClick={() => {
                setShowPendingAcceptListModal(true);
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-5px) scale(1.02)";
                e.currentTarget.style.boxShadow =
                  "0 15px 30px rgba(251, 191, 36, 0.4)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0) scale(1)";
                e.currentTarget.style.boxShadow =
                  "0 0 20px rgba(251, 191, 36, 0.3)";
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: "10px",
                  right: "10px",
                  fontSize: "1.2rem",
                }}
              >
                🚨
              </div>
              <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
                🔔
              </div>
              <div
                style={{
                  color: "#fbbf24",
                  fontSize: "2.2rem",
                  fontWeight: "950",
                  marginBottom: "0.25rem",
                  letterSpacing: "-1px",
                }}
              >
                  {orderStats.pendingConfirmation}
                </div>
              <div
                className="stat-label"
                style={{
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                  {t.pendingAccept}
                </div>
              </div>
            )}

            {/* 打包中 (仅限合伙店铺显示) */}
            {isPartnerStore && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(16, 185, 129, 0.2) 0%, rgba(5, 150, 105, 0.1) 100%)",
                borderRadius: "24px",
                padding: "1.75rem",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                textAlign: "center",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
              }}
              onClick={() => setShowPackingListModal(true)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 25px rgba(16, 185, 129, 0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
              }}
            >
              <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
                📦
              </div>
              <div
                style={{
                  color: "#10b981",
                  fontSize: "2.2rem",
                  fontWeight: "900",
                  marginBottom: "0.25rem",
                  letterSpacing: "-1px",
                }}
              >
                  {orderStats.packing}
                </div>
              <div
                className="stat-label"
                style={{
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {language === "zh"
                  ? "打包中"
                  : language === "en"
                    ? "Packing"
                    : "ထုပ်ပိုးနေသည်"}
                </div>
              </div>
            )}

            {/* 待取件 */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)",
              borderRadius: "24px",
              padding: "1.75rem",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              textAlign: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "default",
              boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 12px 25px rgba(245, 158, 11, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
            }}
          >
            <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
              ⏳
            </div>
            <div
              style={{
                color: "white",
                fontSize: "2.2rem",
                fontWeight: "900",
                marginBottom: "0.25rem",
                letterSpacing: "-1px",
              }}
            >
                {orderStats.pendingPickup}
              </div>
            <div
              className="stat-label"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.9rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
                {t.pendingPickup}
              </div>
            </div>

            {/* 配送中 */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(124, 58, 237, 0.05) 100%)",
              borderRadius: "24px",
              padding: "1.75rem",
              border: "1px solid rgba(139, 92, 246, 0.2)",
              textAlign: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "default",
              boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 12px 25px rgba(139, 92, 246, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
            }}
          >
            <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
              🚚
            </div>
            <div
              style={{
                color: "white",
                fontSize: "2.2rem",
                fontWeight: "900",
                marginBottom: "0.25rem",
                letterSpacing: "-1px",
              }}
            >
                {orderStats.inTransit}
              </div>
            <div
              className="stat-label"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.9rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
                {t.inTransit}
              </div>
            </div>

            {/* 已完成 */}
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.05) 100%)",
              borderRadius: "24px",
              padding: "1.75rem",
              border: "1px solid rgba(16, 185, 129, 0.2)",
              textAlign: "center",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              cursor: "default",
              boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = "translateY(-5px)";
              e.currentTarget.style.boxShadow =
                "0 12px 25px rgba(16, 185, 129, 0.2)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
            }}
          >
            <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
              ✅
            </div>
            <div
              style={{
                color: "white",
                fontSize: "2.2rem",
                fontWeight: "900",
                marginBottom: "0.25rem",
                letterSpacing: "-1px",
              }}
            >
                {orderStats.completed}
              </div>
            <div
              className="stat-label"
              style={{
                color: "rgba(255,255,255,0.6)",
                fontSize: "0.9rem",
                fontWeight: "700",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
                {t.completed}
              </div>
            </div>

            {/* 🚀 新增：店铺评价 (仅限合伙店铺显示) */}
            {isPartnerStore && (
            <div
              style={{
                background:
                  "linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(217, 119, 6, 0.05) 100%)",
                borderRadius: "24px",
                padding: "1.75rem",
                border: "1px solid rgba(251, 191, 36, 0.3)",
                textAlign: "center",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                cursor: "pointer",
                boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
              }}
              onClick={() => setShowReviewsModal(true)}
              onMouseOver={(e) => {
                e.currentTarget.style.transform = "translateY(-5px)";
                e.currentTarget.style.boxShadow =
                  "0 12px 25px rgba(251, 191, 36, 0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,0.1)";
              }}
              >
              <div style={{ fontSize: "2.2rem", marginBottom: "0.75rem" }}>
                ⭐
                </div>
              <div
                style={{
                  color: "#fbbf24",
                  fontSize: "2.2rem",
                  fontWeight: "950",
                  marginBottom: "0.25rem",
                  letterSpacing: "-1px",
                }}
              >
                {reviewStats.average || "0.0"}
              </div>
              <div
                className="stat-label"
                style={{
                  color: "white",
                  fontSize: "0.9rem",
                  fontWeight: "800",
                  textTransform: "uppercase",
                  letterSpacing: "1px",
                }}
              >
                {language === "zh"
                  ? `${reviewStats.count} 条评价`
                  : language === "en"
                    ? `${reviewStats.count} Reviews`
                    : `${reviewStats.count} ခု မှတ်ချက်`}
                </div>
              </div>
            )}
          </div>

          {/* 代收款统计卡片 - 仅合伙店铺显示 */}
          {isPartnerStore && storeInfo && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2rem",
              marginBottom: "3rem",
            }}
          >
              {/* 代收款统计 */}
            <div
              id="cod-stats-section"
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(30px)",
                borderRadius: "40px",
                padding: "3rem",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                boxShadow: "0 30px 60px rgba(0, 0, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "1.5rem",
                  flexWrap: "wrap",
                  gap: "2rem",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                  paddingBottom: "2rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      width: "64px",
                      height: "64px",
                      background:
                        "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                      borderRadius: "22px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2.2rem",
                      boxShadow: "0 12px 24px rgba(245, 158, 11, 0.4)",
                    }}
                  >
                    💰
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <h3
                      style={{
                        color: "white",
                        fontSize: "2.2rem",
                        fontWeight: "950",
                        margin: 0,
                        textShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        letterSpacing: "-0.5px",
                      }}
                    >
                        {t.codStats}
                      </h3>
                      {/* 🚀 修正：上次结算日期 - 非卡片样式 */}
                    <div
                      style={{
                        fontSize: "1rem",
                        color: "rgba(255,255,255,0.6)",
                        fontWeight: "700",
                        display: "flex",
                        alignItems: "center",
                        gap: "15px",
                      }}
                    >
                      <div
                          style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <span>📅 {t.lastSettledAt}:</span>
                        <span style={{ color: "#10b981" }}>
                          {merchantCODStats.lastSettledAt
                            ? formatDate(merchantCODStats.lastSettledAt)
                            : t.noSettlement}
                        </span>
                      </div>
                      </div>
                    </div>
                  </div>

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "15px",
                    background: "rgba(15, 23, 42, 0.6)",
                    padding: "10px 24px",
                    borderRadius: "22px",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    boxShadow: "inset 0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                    <button 
                      onClick={handlePrevMonth}
                      style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      borderRadius: "14px",
                      width: "36px",
                      height: "36px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1.4rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      zIndex: 10,
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.3)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.15)")
                    }
                  >
                    ‹
                  </button>
                    
                    <div 
                      onClick={() => dateInputRef.current?.showPicker()}
                      style={{ 
                      color: "white",
                      fontSize: "1.25rem",
                      fontWeight: "900",
                      cursor: "pointer",
                      minWidth: "120px",
                      textAlign: "center",
                      fontFamily: "monospace",
                      letterSpacing: "1px",
                      }}
                    >
                      {selectedMonth}
                      <input
                        ref={dateInputRef}
                        type="month"
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                      style={{
                        position: "absolute",
                        opacity: 0,
                        pointerEvents: "none",
                        width: 0,
                      }}
                      />
                    </div>

                    <button 
                      onClick={handleNextMonth}
                      style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      border: "none",
                      borderRadius: "14px",
                      width: "36px",
                      height: "36px",
                      color: "white",
                      cursor: "pointer",
                      fontSize: "1.4rem",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.2s ease",
                      zIndex: 10,
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.3)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.15)")
                    }
                  >
                    ›
                  </button>
                  </div>

                <div
                  style={{ display: "flex", gap: "12px", alignItems: "center" }}
                >
                  {/* 🚀 移动后的语音播报按钮 - 现在在最右侧 */}
                  <button
                    onClick={() => {
                      if (!isVoiceEnabled) {
                        speakNotification("语音提醒功能已开启");
                        alert(
                          language === "zh"
                            ? "✅ 语音提醒已开启！当有“待确认”新订单时，系统将自动为您播放播报并刷新列表。"
                            : "Voice Alert Active! List will auto-refresh on new orders.",
                        );
                      }
                      setIsVoiceEnabled(!isVoiceEnabled);
                    }}
                    style={{
                      background: isVoiceEnabled
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(255, 255, 255, 0.1)",
                      color: isVoiceEnabled ? "#10b981" : "white",
                      border: `1px solid ${isVoiceEnabled ? "rgba(16, 185, 129, 0.4)" : "rgba(255, 255, 255, 0.2)"}`,
                      padding: "10px 20px",
                      borderRadius: "14px",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontWeight: "bold",
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.3s ease",
                      boxShadow: isVoiceEnabled
                        ? "0 4px 12px rgba(16, 185, 129, 0.2)"
                        : "none",
                    }}
                  >
                    {isVoiceEnabled ? "🔔" : "🔕"}{" "}
                    {isVoiceEnabled
                      ? language === "zh"
                        ? "语音监控中"
                        : t.voiceActive
                      : t.enableVoice}
                  </button>

                  {/* 🚀 导出对账单按钮 */}
                  <button
                    onClick={() => setShowExportModal(true)}
                    style={{
                      background:
                        "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                      color: "white",
                      border: "none",
                      padding: "10px 24px",
                      borderRadius: "18px",
                      fontWeight: "900",
                      fontSize: "1.1rem",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      boxShadow: "0 10px 20px rgba(79, 70, 229, 0.3)",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 15px 30px rgba(79, 70, 229, 0.4)";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 20px rgba(79, 70, 229, 0.3)";
                    }}
                  >
                    📊 {language === "zh" ? "导出对账单" : "Export Statement"}
                  </button>
                </div>
                </div>
                
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    window.innerWidth < 768 ? "1fr" : "repeat(2, 1fr)",
                  gap: "2.5rem",
                }}
              >
                  {/* 本月已结清 */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "2.5rem 2rem",
                    borderRadius: "35px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.2rem",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.4s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.1rem",
                        color: "rgba(255,255,255,0.8)",
                        fontWeight: "800",
                      }}
                    >
                      {t.totalCOD}
                    </span>
                    </div>
                  <div
                    style={{
                      fontSize: "2.8rem",
                      fontWeight: "950",
                      color: "white",
                      flex: 1,
                    }}
                  >
                    {merchantCODStats.settledCOD.toLocaleString()}{" "}
                    <span style={{ fontSize: "1rem", opacity: 0.6 }}>MMK</span>
                    </div>
                    <button 
                      onClick={() => handleViewCODOrders(true)}
                      style={{ 
                      padding: "10px 20px",
                      borderRadius: "14px",
                      background: "#3b82f6",
                      border: "none",
                      color: "white",
                      fontSize: "1rem",
                      fontWeight: "900",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(59, 130, 246, 0.4)",
                      alignSelf: "stretch",
                      marginTop: "1rem",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.02)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    {t.view}
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      right: "-15px",
                      bottom: "40px",
                      fontSize: "6rem",
                      opacity: 0.08,
                      transform: "rotate(-15deg)",
                      pointerEvents: "none",
                    }}
                  >
                    📈
                  </div>
                  </div>

                  {/* 待结清金额 */}
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.3)",
                    padding: "2.5rem 2rem",
                    borderRadius: "35px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.2rem",
                    position: "relative",
                    overflow: "hidden",
                    transition: "all 0.4s ease",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: "1rem",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "1.1rem",
                        color: "rgba(255,255,255,0.8)",
                        fontWeight: "800",
                      }}
                    >
                      {t.unclearedCOD}
                    </span>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#fbbf24",
                        fontWeight: "900",
                        background: "rgba(251, 191, 36, 0.2)",
                        padding: "4px 14px",
                        borderRadius: "12px",
                      }}
                    >
                        {merchantCODStats.unclearedCount} 笔待结算
                      </div>
                    </div>
                  <div
                    style={{
                      fontSize: "2.8rem",
                      fontWeight: "950",
                      color: "#fbbf24",
                      flex: 1,
                    }}
                  >
                    {merchantCODStats.unclearedCOD.toLocaleString()}{" "}
                    <span style={{ fontSize: "1rem", opacity: 0.6 }}>MMK</span>
                    </div>
                    <button 
                      onClick={() => handleViewCODOrders(false)}
                      style={{ 
                      padding: "10px 20px",
                      borderRadius: "14px",
                      background: "#f59e0b",
                      border: "none",
                      color: "white",
                      fontSize: "1rem",
                      fontWeight: "900",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.4)",
                      alignSelf: "stretch",
                      marginTop: "1rem",
                      transition: "all 0.3s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.transform = "scale(1.02)")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.transform = "scale(1)")
                    }
                  >
                    {t.view}
                  </button>
                  <div
                    style={{
                      position: "absolute",
                      right: "-15px",
                      bottom: "40px",
                      fontSize: "6rem",
                      opacity: 0.08,
                      transform: "rotate(-15deg)",
                      pointerEvents: "none",
                    }}
                  >
                    ⏳
                  </div>
                </div>
                </div>
              </div>

              {/* 营业状态管理 */}
            <div
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(30px)",
                borderRadius: "40px",
                padding: "3rem 2.5rem",
                border: "1px solid rgba(255, 255, 255, 0.25)",
                boxShadow: "0 30px 60px rgba(0, 0, 0, 0.2)",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "2.5rem",
                  borderBottom: "1px solid rgba(255, 255, 255, 0.15)",
                  paddingBottom: "2rem",
                  flexWrap: "wrap",
                  gap: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "1.25rem",
                  }}
                >
                  <div
                    style={{
                      width: "56px",
                      height: "56px",
                      background:
                        "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                      borderRadius: "18px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "2rem",
                      boxShadow: "0 10px 20px rgba(239, 68, 68, 0.4)",
                    }}
                  >
                    ⏰
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <h3
                      style={{
                        color: "white",
                        fontSize: "1.8rem",
                        fontWeight: "950",
                        margin: 0,
                        textShadow: "0 2px 4px rgba(0,0,0,0.2)",
                      }}
                    >
                      {t.businessManagement}
                    </h3>
                      {storeInfo?.updated_at && (
                      <div
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "0.85rem",
                          fontWeight: "600",
                          marginTop: "4px",
                        }}
                      >
                        ⏱️ {t.lastUpdated}:{" "}
                        {new Date(storeInfo.updated_at).toLocaleString(
                          language === "zh" ? "zh-CN" : "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                        </div>
                      )}
                    </div>
                  </div>

                <div
                  style={{ display: "flex", gap: "15px", alignItems: "center" }}
                >
                  {/* 今日营业开关 */}
                  <div
                      style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "12px",
                      background: "rgba(15, 23, 42, 0.4)",
                      padding: "0 16px",
                      width: "200px",
                      height: "39px",
                      borderRadius: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontWeight: "800",
                        fontSize: "0.85rem",
                        lineHeight: "1",
                        display: "flex",
                        alignItems: "center",
                        flex: 1,
                        textAlign: "left",
                      }}
                    >
                      {t.closedToday}
                        </span>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        height: "100%",
                      }}
                    >
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setBusinessStatus((prev) => ({
                            ...prev,
                            is_closed_today: !prev.is_closed_today,
                          }));
                        }}
                        style={{
                          width: "42px",
                          height: "22px",
                          borderRadius: "11px",
                          backgroundColor: businessStatus.is_closed_today
                            ? "#ef4444"
                            : "rgba(255,255,255,0.2)",
                          position: "relative",
                          cursor: "pointer",
                          border: "none",
                          transition:
                            "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                          padding: 0,
                          display: "flex",
                          alignItems: "center",
                        }}
                      >
                        <div
                          style={{
                            width: "16px",
                            height: "16px",
                            borderRadius: "8px",
                            backgroundColor: "white",
                            position: "absolute",
                            top: "3px",
                            left: businessStatus.is_closed_today
                              ? "23px"
                              : "3px",
                            transition:
                              "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                            boxShadow: "0 2px 5px rgba(0,0,0,0.2)",
                          }}
                        />
                      </button>
                    </div>
                    </div>
                  </div>
                </div>

              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2rem",
                }}
              >
                  {/* 营业时间设置 */}
                <div
                  id="business-hours-section"
                  style={{
                    background: "rgba(15, 23, 42, 0.4)",
                    padding: "2.5rem",
                    borderRadius: "35px",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    display: "flex",
                    flexDirection: "column",
                    gap: "2rem",
                    boxShadow: "0 20px 50px rgba(0,0,0,0.2)",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                    {/* 背景发光效果 */}
                  <div
                    style={{
                      position: "absolute",
                      top: "-50px",
                      right: "-50px",
                      width: "150px",
                      height: "150px",
                      background:
                        "radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)",
                      zIndex: 0,
                    }}
                  />

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      zIndex: 1,
                      flexWrap: "wrap",
                      gap: "2rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "2rem",
                        flex: 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          color: "white",
                          fontWeight: "900",
                          fontSize: "1.25rem",
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          minWidth: "140px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "12px",
                            background: "rgba(255,255,255,0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <span style={{ fontSize: "1.4rem" }}>⏰</span>
                          </div>
                          {t.operatingHours}
                        </div>

                      <div
                        style={{
                          display: "flex",
                          gap: "1.5rem",
                          alignItems: "center",
                        }}
                      >
                          <TimeWheelPicker 
                            label="OPEN TIME"
                            icon="🌅"
                          value={
                            (
                              businessStatus.operating_hours || "09:00 - 21:00"
                            ).split(" - ")[0] || "09:00"
                          }
                            onChange={(val) => {
                            const parts = (
                              businessStatus.operating_hours || "09:00 - 21:00"
                            ).split(" - ");
                            const end = parts[1] || "21:00";
                            setBusinessStatus((prev) => ({
                              ...prev,
                              operating_hours: `${val} - ${end}`,
                            }));
                          }}
                        />

                        <div
                          style={{
                            color: "rgba(255,255,255,0.2)",
                            fontSize: "1.2rem",
                            fontWeight: "900",
                          }}
                        >
                          →
                        </div>

                          <TimeWheelPicker 
                            label="CLOSED TIME"
                            icon="🌙"
                          value={
                            (
                              businessStatus.operating_hours || "09:00 - 21:00"
                            ).split(" - ")[1] || "21:00"
                          }
                            onChange={(val) => {
                            const parts = (
                              businessStatus.operating_hours || "09:00 - 21:00"
                            ).split(" - ");
                            const start = parts[0] || "09:00";
                            setBusinessStatus((prev) => ({
                              ...prev,
                              operating_hours: `${start} - ${val}`,
                            }));
                            }}
                          />

                          {/* 营业时长预览 */}
                          {(() => {
                          const hours =
                            businessStatus.operating_hours || "09:00 - 21:00";
                          const parts = hours.split(" - ");
                          const start = parts[0] || "09:00";
                          const end = parts[1] || "21:00";

                          const startParts = start.split(":");
                          const endParts = end.split(":");

                          if (startParts.length < 2 || endParts.length < 2)
                            return null;

                            const [sH, sM] = startParts.map(Number);
                            const [eH, eM] = endParts.map(Number);
                            
                          if (isNaN(sH) || isNaN(sM) || isNaN(eH) || isNaN(eM))
                            return null;

                          let duration = eH * 60 + eM - (sH * 60 + sM);
                            if (duration < 0) duration += 24 * 60; // 跨天
                            const h = Math.floor(duration / 60);
                            const m = duration % 60;
                            return (
                            <div
                              style={{
                                background: "rgba(16, 185, 129, 0.15)",
                                color: "#10b981",
                                padding: "6px 15px",
                                borderRadius: "12px",
                                fontSize: "0.85rem",
                                fontWeight: "800",
                                marginLeft: "10px",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {language === "zh"
                                ? `时长: ${h}h${m > 0 ? `${m}m` : ""}`
                                : `Dur: ${h}h ${m > 0 ? `${m}m` : ""}`}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                    {/* 🚀 操作按钮组 - 移动到右侧 */}
                    <div
                      style={{
                        display: "flex",
                        gap: "12px",
                        alignItems: "center",
                        flexWrap: "wrap",
                        justifyContent: "flex-end",
                        zIndex: 10,
                      }}
                    >
                      {/* 延长打烊按钮 */}
                      <button
                        onClick={handleExtendHour}
                        disabled={isSavingStatus}
                        style={{
                          width: "123px",
                          height: "56px",
                          background: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981",
                          border: "1px solid rgba(16, 185, 129, 0.3)",
                          padding: "4px",
                          borderRadius: "18px",
                          fontSize: "0.8rem",
                          fontWeight: "800",
                          cursor: isSavingStatus ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(16, 185, 129, 0.1)",
                        }}
                        onMouseOver={(e) => {
                          if (!isSavingStatus) {
                            e.currentTarget.style.background =
                              "rgba(16, 185, 129, 0.2)";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSavingStatus) {
                            e.currentTarget.style.background =
                              "rgba(16, 185, 129, 0.1)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }
                        }}
                      >
                        ⏳ {language === "zh" ? "延长1h" : "Ext 1h"}
                      </button>

                      {/* 即刻打烊按钮 */}
                      <button
                        onClick={handleCloseImmediately}
                        disabled={isSavingStatus}
                        style={{
                          width: "123px",
                          height: "56px",
                          background: "rgba(239, 68, 68, 0.1)",
                          color: "#ef4444",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          padding: "4px",
                          borderRadius: "18px",
                          fontSize: "0.8rem",
                          fontWeight: "800",
                          cursor: isSavingStatus ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                          boxShadow: "0 4px 12px rgba(239, 68, 68, 0.1)",
                        }}
                        onMouseOver={(e) => {
                          if (!isSavingStatus) {
                            e.currentTarget.style.background =
                              "rgba(239, 68, 68, 0.2)";
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSavingStatus) {
                            e.currentTarget.style.background =
                              "rgba(239, 68, 68, 0.1)";
                            e.currentTarget.style.transform = "translateY(0)";
                          }
                        }}
                      >
                        🛑 {language === "zh" ? "即刻打烊" : "Close Now"}
                      </button>

                      {/* 保存按钮 */}
                      <button
                        onClick={() => handleUpdateStoreStatus(businessStatus)}
                        disabled={isSavingStatus}
                        style={{
                          width: "123px",
                          height: "56px",
                          background: isSavingStatus
                            ? "rgba(255,255,255,0.1)"
                            : "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "16px",
                          padding: 0,
                          fontSize: "0.95rem",
                          fontWeight: "900",
                          cursor: isSavingStatus ? "not-allowed" : "pointer",
                          transition: "all 0.3s ease",
                          boxShadow: isSavingStatus
                            ? "none"
                            : "0 8px 20px rgba(30, 64, 175, 0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "8px",
                          whiteSpace: "nowrap",
                        }}
                        onMouseOver={(e) => {
                          if (!isSavingStatus) {
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                            e.currentTarget.style.boxShadow =
                              "0 12px 25px rgba(30, 64, 175, 0.4)";
                          }
                        }}
                        onMouseOut={(e) => {
                          if (!isSavingStatus) {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 8px 20px rgba(30, 64, 175, 0.3)";
                          }
                        }}
                      >
                        {isSavingStatus ? (
                          <>
                            <div
                              className="spinner"
                              style={{
                                width: "20px",
                                height: "20px",
                                border: "3px solid rgba(255,255,255,0.3)",
                                borderTop: "3px solid white",
                                borderRadius: "50%",
                              }}
                            ></div>
                            <span>
                              {language === "zh" ? "正在保存..." : "Saving..."}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>💾</span> {t.save}
                          </>
                        )}
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 详细信息网格 - 仅非合伙店铺显示 */}
          {!isPartnerStore && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              padding: "1.75rem",
              background: "rgba(255, 255, 255, 0.05)",
              borderRadius: "24px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              backdropFilter: "blur(10px)",
              boxShadow: "inset 0 0 20px rgba(255, 255, 255, 0.02)",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  window.innerWidth < 768 ? "1fr" : "repeat(2, 1fr)",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "1.25rem",
                  borderRadius: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: "1.8rem",
                    background: "rgba(255,255,255,0.1)",
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  🗓️
                </div>
                  <div>
                  <label
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "0.2rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                      {t.accountDate}
                    </label>
                  <div
                    style={{
                      color: "white",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                    }}
                  >
                      {currentUser.created_at 
                      ? new Date(currentUser.created_at).toLocaleDateString(
                          language === "zh"
                            ? "zh-CN"
                            : language === "en"
                              ? "en-US"
                              : "my-MM",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          },
                        )
                      : "-"}
                    </div>
                  </div>
                </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "1.25rem",
                  borderRadius: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div
                  style={{
                    fontSize: "1.8rem",
                    background: "rgba(255,255,255,0.1)",
                    width: "48px",
                    height: "48px",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  📍
                </div>
                  <div>
                  <label
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "0.2rem",
                      textTransform: "uppercase",
                      letterSpacing: "1px",
                    }}
                  >
                      {t.address}
                    </label>
                  <div
                    style={{
                      color: "white",
                      fontSize: "1.1rem",
                      fontWeight: "700",
                    }}
                  >
                    {currentUser.address || "-"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 包裹列表 */}
      <div
        style={{
          background: "rgba(255, 255, 255, 0.15)",
          backdropFilter: "blur(20px)",
          borderRadius: "24px",
          padding: "1.5rem",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.1)",
          opacity: isVisible ? 1 : 0,
          transform: isVisible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.6s ease 0.4s",
        }}
      >
        <h2
          id="packages-section"
          style={{
            color: "#ffffff",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            borderBottom: "2px solid rgba(255,255,255,0.3)",
            paddingBottom: "0.5rem",
          }}
        >
            {t.packages}
          </h2>

          {loading ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "white" }}>
            <div style={{ fontSize: "2rem", marginBottom: "1rem" }}>⏳</div>
            <div>
              {language === "zh"
                ? "加载中..."
                : language === "en"
                  ? "Loading..."
                  : "ဖွင့်နေသည်..."}
            </div>
            </div>
          ) : userPackages.length === 0 ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "white" }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>📦</div>
            <div style={{ fontSize: "1.2rem" }}>{t.noPackages}</div>
            </div>
          ) : (
            <>
            <div
              style={{
                display: "grid",
                gap: "1rem",
              }}
            >
                {userPackages
                .slice(
                  (currentPage - 1) * packagesPerPage,
                  currentPage * packagesPerPage,
                )
                  .map((pkg: any) => (
                <div
                  key={pkg.id}
                  style={{
                      background: "rgba(255, 255, 255, 0.1)",
                      borderRadius: "12px",
                      padding: "1.5rem",
                      border: "1px solid rgba(255, 255, 255, 0.2)",
                      transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.15)";
                      e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseOut={(e) => {
                      e.currentTarget.style.background =
                        "rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  {/* 顶部：订单号、创建时间、价格、包裹类型 - 一行显示 */}
                    <div
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "1rem",
                        alignItems: "center",
                        marginBottom: "1rem",
                        paddingBottom: "1rem",
                        borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                      }}
                    >
                    {/* 订单号 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.8)",
                            fontSize: "0.85rem",
                          }}
                        >
                        {t.packageId}:
                      </span>
                        <span
                          style={{
                            color: "white",
                            fontSize: "0.95rem",
                            fontWeight: "bold",
                          }}
                        >
                        {pkg.id}
                      </span>
                    </div>

                    {/* 分隔符 */}
                      <span
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.85rem",
                        }}
                      >
                        |
                      </span>

                    {/* 创建时间 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.8)",
                            fontSize: "0.85rem",
                          }}
                        >
                        {t.createTime}:
                      </span>
                        <span style={{ color: "white", fontSize: "0.95rem" }}>
                          {pkg.create_time || pkg.created_at || "-"}
                      </span>
                    </div>

                    {/* 分隔符 */}
                      <span
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.85rem",
                        }}
                      >
                        |
                      </span>

                    {/* 价格 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.8)",
                            fontSize: "0.85rem",
                          }}
                        >
                        {t.price}:
                      </span>
                        <span
                          style={{
                            color: "white",
                            fontSize: "0.95rem",
                            fontWeight: "bold",
                          }}
                        >
                          {pkg.price
                            ? `${pkg.price.replace("MMK", "").trim()} MMK`
                            : "-"}
                      </span>
                    </div>

                    {/* 分隔符 */}
                      <span
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.85rem",
                        }}
                      >
                        |
                      </span>

                    {/* 包裹类型 */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          flexWrap: "wrap",
                        }}
                      >
                        <span
                          style={{
                            color: "rgba(255,255,255,0.8)",
                            fontSize: "0.85rem",
                          }}
                        >
                          {language === "zh"
                            ? "包裹类型"
                            : language === "en"
                              ? "Package Type"
                              : "ပက်ကေ့ဂျ်အမျိုးအစား"}
                          :
                      </span>
                        <span style={{ color: "white", fontSize: "0.95rem" }}>
                          {pkg.package_type || "-"}
                      </span>
                    </div>
                  </div>

                  {/* 状态和支付方式按钮 */}
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                        marginBottom: "1rem",
                      }}
                    >
                    {/* 状态按钮 */}
                      <div
                        style={{
                          background: getStatusColor(
                            pkg.status === "待收款" ? "待取件" : pkg.status,
                          ),
                          color: "white",
                          padding: "0.4rem 0.9rem",
                          borderRadius: "24px",
                          fontSize: "0.85rem",
                          fontWeight: "bold",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {pkg.status === "待收款"
                          ? getStatusText(pkg.status)
                          : pkg.status}
                    </div>
                    
                    {/* 支付方式按钮 */}
                    {pkg.payment_method && (
                        <div
                          style={{
                            background: getPaymentMethodColor(
                              pkg.payment_method,
                            ),
                            color: "white",
                        border: `1px solid ${getPaymentMethodBorderColor(pkg.payment_method)}`,
                            padding: "0.4rem 0.9rem",
                            borderRadius: "24px",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                        {getPaymentMethodText(pkg.payment_method)}
                      </div>
                    )}

                    {/* 🚀 新增：商品费用 - 仅限 VIP/普通账号显示 */}
                      {!isPartnerStore &&
                        (() => {
                          const itemMatch = pkg.description?.match(
                            /\[(?:商品费用（仅余额支付）|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)): (.*?) MMK\]/,
                          );
                      if (itemMatch && itemMatch[1]) {
                        return (
                              <div
                                style={{
                                  background: "rgba(251, 191, 36, 0.2)",
                                  color: "#fbbf24",
                                  border: "1px solid rgba(251, 191, 36, 0.3)",
                                  padding: "0.4rem 0.9rem",
                                  borderRadius: "24px",
                                  fontSize: "0.85rem",
                                  fontWeight: "bold",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                🛍️{" "}
                                {language === "zh"
                                  ? "商品费用"
                                  : language === "en"
                                    ? "Item Cost"
                                    : "ကုန်ပစ္စည်းဖိုး"}
                                : {itemMatch[1]} MMK (
                                {language === "zh"
                                  ? "余额支付"
                                  : language === "en"
                                    ? "Balance"
                                    : "လက်ကျန်ငွေ"}
                                )
                          </div>
                        );
                      }
                      return null;
                    })()}

                    {/* 🚀 修正：代收款 - 仅限商家账号显示 */}
                    {isPartnerStore && pkg.cod_amount > 0 ? (
                        <div
                          style={{
                            background: "rgba(239, 68, 68, 0.2)",
                            color: "#fca5a5",
                            border: "1px solid rgba(239, 68, 68, 0.3)",
                            padding: "0.4rem 0.9rem",
                            borderRadius: "24px",
                            fontSize: "0.85rem",
                            fontWeight: "bold",
                            whiteSpace: "nowrap",
                          }}
                        >
                        💰 {t.cod}: {pkg.cod_amount.toLocaleString()} MMK
                      </div>
                    ) : null}
                  </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "1rem",
                        justifyContent: "center",
                        marginTop: "1rem",
                      }}
                    >
                    <button
                      onClick={() => {
                        setSelectedPackage(pkg);
                        setShowPackageDetailModal(true);
                      }}
                      style={{
                          background: "rgba(59, 130, 246, 0.25)",
                          color: "white",
                          border: "1px solid rgba(59, 130, 246, 0.4)",
                          padding: "0.5rem 1.5rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          fontSize: "0.9rem",
                          fontWeight: "bold",
                          transition: "all 0.3s ease",
                        flex: 1,
                          maxWidth: "150px",
                      }}
                      onMouseOver={(e) => {
                          e.currentTarget.style.background =
                            "rgba(59, 130, 246, 0.4)";
                          e.currentTarget.style.transform = "translateY(-2px)";
                      }}
                      onMouseOut={(e) => {
                          e.currentTarget.style.background =
                            "rgba(59, 130, 246, 0.25)";
                          e.currentTarget.style.transform = "translateY(0)";
                      }}
                    >
                      {t.viewDetails}
                    </button>

                    {/* 🚀 新增：评价订单按钮 - 仅限已完成/已送达订单 且 未评价过 */}
                      {!isPartnerStore &&
                        (pkg.status === "已送达" || pkg.status === "已完成") &&
                        !reviewedOrderIds.has(pkg.id) && (
                      <button
                        onClick={() => handleOpenReviewModal(pkg)}
                        style={{
                              background:
                                "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                              color: "white",
                              border: "none",
                              padding: "0.5rem 1.5rem",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "bold",
                              transition: "all 0.3s ease",
                          flex: 1,
                              maxWidth: "150px",
                              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                        }}
                        onMouseOver={(e) => {
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                              e.currentTarget.style.boxShadow =
                                "0 6px 15px rgba(245, 158, 11, 0.4)";
                        }}
                        onMouseOut={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(245, 158, 11, 0.3)";
                            }}
                          >
                            ⭐{" "}
                            {language === "zh"
                              ? "评价订单"
                              : language === "en"
                                ? "Rate Order"
                                : "မှတ်ချက်ပေးရန်"}
                      </button>
                    )}

                    {/* 🚀 新增：打包中状态显示“开始打包”按钮 */}
                      {isPartnerStore && pkg.status === "打包中" && (
                      <button
                        onClick={() => handleStartPacking(pkg)}
                        style={{
                            background:
                              "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                            color: "white",
                            border: "none",
                            padding: "0.5rem 1.5rem",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontSize: "0.9rem",
                            fontWeight: "900",
                            transition: "all 0.3s ease",
                          flex: 1,
                            maxWidth: "150px",
                            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                        }}
                        onMouseOver={(e) => {
                            e.currentTarget.style.transform =
                              "translateY(-2px)";
                            e.currentTarget.style.boxShadow =
                              "0 6px 15px rgba(16, 185, 129, 0.4)";
                        }}
                        onMouseOut={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 4px 12px rgba(16, 185, 129, 0.3)";
                          }}
                        >
                          📦{" "}
                          {language === "zh"
                            ? "开始打包"
                            : language === "en"
                              ? "Start Packing"
                              : "ထုပ်ပိုးရန်စတင်ပါ"}
                      </button>
                    )}

                    {/* 🚀 新增：中转站重新发货按钮 */}
                      {isPartnerStore &&
                        storeInfo?.store_type === "transit_station" &&
                        pkg.status === "已送达" &&
                        pkg.description?.includes("[异常转送中转站]") && (
                      <button
                        onClick={() => handleReshipOrder(pkg)}
                        style={{
                              background:
                                "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                              color: "white",
                              border: "none",
                              padding: "0.5rem 1.5rem",
                              borderRadius: "8px",
                              cursor: "pointer",
                              fontSize: "0.9rem",
                              fontWeight: "900",
                              transition: "all 0.3s ease",
                          flex: 1,
                              maxWidth: "150px",
                              boxShadow: "0 4px 12px rgba(217, 119, 6, 0.3)",
                        }}
                        onMouseOver={(e) => {
                              e.currentTarget.style.transform =
                                "translateY(-2px)";
                              e.currentTarget.style.boxShadow =
                                "0 6px 15px rgba(217, 119, 6, 0.4)";
                        }}
                        onMouseOut={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(217, 119, 6, 0.3)";
                            }}
                          >
                            🚀{" "}
                            {language === "zh"
                              ? "重新发货"
                              : language === "en"
                                ? "Re-ship"
                                : "ပြန်လည်ပို့ဆောင်ပါ"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
              </div>

            {/* 分页控件 - 指挥中心风格 */}
              {userPackages.length > packagesPerPage && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  gap: "0.75rem",
                  marginTop: "2.5rem",
                  padding: "1rem",
                  background: "rgba(255, 255, 255, 0.03)",
                  borderRadius: "24px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                  alignSelf: "center",
                }}
              >
                  <button
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
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
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    alignItems: "center",
                  }}
                >
                  {Array.from(
                    {
                      length: Math.ceil(userPackages.length / packagesPerPage),
                    },
                    (_, i) => i + 1,
                  ).map((page) => (
                      <button
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
                  onClick={() =>
                    setCurrentPage((prev) =>
                      Math.min(
                        Math.ceil(userPackages.length / packagesPerPage),
                        prev + 1,
                      ),
                    )
                  }
                  disabled={
                    currentPage ===
                    Math.ceil(userPackages.length / packagesPerPage)
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
                      Math.ceil(userPackages.length / packagesPerPage)
                        ? "not-allowed"
                        : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.2s ease",
                    opacity:
                      currentPage ===
                      Math.ceil(userPackages.length / packagesPerPage)
                        ? 0.3
                        : 1,
                  }}
                >
                  <span style={{ fontSize: "1.2rem" }}>›</span>
                  </button>
                </div>
              )}

              {/* 显示当前页信息 */}
            <div
              style={{
                textAlign: "center",
                marginTop: "1rem",
                color: "rgba(255, 255, 255, 0.8)",
                fontSize: "0.9rem",
              }}
            >
              {language === "zh"
                  ? `显示第 ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, userPackages.length)} 条，共 ${userPackages.length} 条`
                : language === "en"
                  ? `Showing ${(currentPage - 1) * packagesPerPage + 1}-${Math.min(currentPage * packagesPerPage, userPackages.length)} of ${userPackages.length}`
                  : (currentPage - 1) * packagesPerPage +
                    1 +
                    "-" +
                    Math.min(
                      currentPage * packagesPerPage,
                      userPackages.length,
                    ) +
                    " ကို ပြသထားသည်၊ စုစုပေါင်း " +
                    userPackages.length}
              </div>
            </>
          )}
        </div>
      {showPackageDetailModal && selectedPackage && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(5px)",
          zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "2rem",
        }}
        onClick={() => setShowPackageDetailModal(false)}
        >
          <div
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(20px)",
              borderRadius: "24px",
              padding: "1.5rem",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
              maxWidth: "800px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                borderBottom: "2px solid rgba(255,255,255,0.3)",
                paddingBottom: "1rem",
              }}
            >
              <h2
                style={{
                  color: "white",
                  fontSize: "1.5rem",
                  margin: 0,
                }}
              >
                {t.packageDetails}
              </h2>
              <button
                onClick={() => setShowPackageDetailModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  color: "white",
                  border: "1px solid rgba(255, 255, 255, 0.3)",
                  padding: "0.5rem 1rem",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontSize: "1rem",
                  fontWeight: "bold",
                }}
              >
                {t.close}
              </button>
            </div>

            <div style={{ display: "grid", gap: "1.5rem" }}>
              {/* 🚀 统一后的订单详情内容 (参考待接单列表风格) */}
              {(() => {
                // 解析商品信息
                const itemsMatch = selectedPackage.description?.match(
                  /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/,
                );
                const productItems = itemsMatch
                  ? itemsMatch[1].split(", ")
                  : [];
                const parsedItems = productItems.map((item: string) => {
                  const match = item.match(/^(.+?)\s*x(\d+)$/i);
                  if (!match) return { label: item, qty: 1 };
                  const name = match[1].trim();
                  const qty = Number(match[2]) || 1;
                  const unitPrice = productPriceMap[name];
                  return {
                    label: name,
                    qty,
                    price: unitPrice ? unitPrice * qty : undefined,
                  };
                });

                  return (
                  <>
                    {/* 订单 ID 和 二维码区域 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        background: "rgba(255,255,255,0.03)",
                        padding: "1.5rem",
                        borderRadius: "24px",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}
                    >
                    <div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                            fontWeight: "bold",
                          }}
                        >
                          {t.packageId}
                      </div>
                        <div
                          style={{
                            color: "#fbbf24",
                            fontSize: "1.6rem",
                            fontWeight: "900",
                          }}
                        >
                          #{selectedPackage.id}
                    </div>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.7)",
                            fontSize: "0.9rem",
                            marginTop: "8px",
                          }}
                        >
                          📅{" "}
                          {selectedPackage.create_time ||
                            selectedPackage.created_at ||
                            "-"}
                    </div>
                        <div style={{ marginTop: "1rem" }}>
                          <div
                            style={{
                              display: "inline-block",
                              background: getStatusColor(
                                selectedPackage.status === "待收款"
                                  ? "待取件"
                                  : selectedPackage.status,
                              ),
                              color: "white",
                              padding: "0.5rem 1.2rem",
                              borderRadius: "24px",
                              fontSize: "0.9rem",
                              fontWeight: "900",
                            }}
                          >
                            {selectedPackage.status === "待收款"
                              ? getStatusText(selectedPackage.status)
                              : selectedPackage.status}
                </div>
                    </div>
                  </div>
                      <div
                        style={{
                          background: "white",
                          padding: "10px",
                          borderRadius: "16px",
                          boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                        }}
                      >
                        <OrderQRCode orderId={selectedPackage.id} />
                    </div>
                  </div>

                    {/* 信息网格 */}
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          window.innerWidth < 768 ? "1fr" : "1fr 1fr",
                        gap: "1.5rem",
                      }}
                    >
                      {/* 商家信息 */}
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          padding: "1.5rem",
                          borderRadius: "24px",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div
                          style={{
                            color: "#3b82f6",
                            fontSize: "0.8rem",
                            fontWeight: "900",
                            marginBottom: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          商家信息
                    </div>
                        <div
                          style={{
                            color: "white",
                            fontWeight: "800",
                            fontSize: "1.1rem",
                          }}
                        >
                          {selectedPackage.sender_name}
                  </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.95rem",
                            marginTop: "6px",
                          }}
                        >
                          {selectedPackage.sender_phone}
                </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.9rem",
                            marginTop: "6px",
                            lineHeight: "1.4",
                          }}
                        >
                          {selectedPackage.sender_address}
              </div>
                    </div>
                      {/* 客户信息 */}
                      <div
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          padding: "1.5rem",
                          borderRadius: "24px",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        <div
                          style={{
                            color: "#fbbf24",
                            fontSize: "0.8rem",
                            fontWeight: "900",
                            marginBottom: "12px",
                            textTransform: "uppercase",
                            letterSpacing: "1px",
                          }}
                        >
                          客户信息
                </div>
                        <div
                          style={{
                            color: "white",
                            fontWeight: "800",
                            fontSize: "1.1rem",
                          }}
                        >
                          {selectedPackage.receiver_name}
                    </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.6)",
                            fontSize: "0.95rem",
                            marginTop: "6px",
                          }}
                        >
                          {selectedPackage.receiver_phone}
                  </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.5)",
                            fontSize: "0.9rem",
                            marginTop: "6px",
                            lineHeight: "1.4",
                          }}
                        >
                          {selectedPackage.receiver_address}
                    </div>
                  </div>
                    </div>

                    {/* 商品清单 */}
                    <div
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        padding: "1.5rem",
                        borderRadius: "24px",
                        border: "1px solid rgba(255,255,255,0.05)",
                      }}
                    >
                      <div
                        style={{
                          color: "#10b981",
                          fontSize: "0.8rem",
                          fontWeight: "900",
                          marginBottom: "15px",
                          textTransform: "uppercase",
                          letterSpacing: "1px",
                        }}
                      >
                        商品清单
                  </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        {parsedItems.map((item: any, idx: number) => (
                          <div
                            key={idx}
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              color: "white",
                              fontSize: "1rem",
                            }}
                          >
                            <span style={{ fontWeight: "600" }}>
                              • {item.label}
                            </span>
                            <div
                              style={{
                                display: "flex",
                                gap: "15px",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  color: "rgba(255,255,255,0.4)",
                                  fontSize: "0.9rem",
                                }}
                              >
                                x{item.qty}
                              </span>
                              {item.price && (
                                <span
                                  style={{
                                    fontWeight: "800",
                                    color: "#10b981",
                                  }}
                                >
                                  {item.price.toLocaleString()} MMK
                                </span>
                              )}
                </div>
                          </div>
                        ))}
              </div>

                      <div
                        style={{
                          marginTop: "1.5rem",
                          paddingTop: "1.5rem",
                          borderTop: "1px dashed rgba(255,255,255,0.1)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "rgba(255,255,255,0.5)",
                              fontSize: "0.95rem",
                            }}
                          >
                            支付方式
                          </span>
                          <span style={{ color: "white", fontWeight: "700" }}>
                            {getPaymentMethodText(
                              selectedPackage.payment_method,
                            )}
                          </span>
                  </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                          }}
                        >
                          <span
                            style={{
                              color: "rgba(255,255,255,0.5)",
                              fontSize: "0.95rem",
                            }}
                          >
                            跑腿费用
                          </span>
                          <span style={{ color: "white", fontWeight: "700" }}>
                            {selectedPackage.price}
                          </span>
                </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "5px",
                          }}
                        >
                          <span
                            style={{
                              color: "white",
                              fontWeight: "900",
                              fontSize: "1.1rem",
                            }}
                          >
                            合计金额
                          </span>
                          <span
                            style={{
                              color: "#fbbf24",
                              fontWeight: "950",
                              fontSize: "1.5rem",
                            }}
                          >
                            {(() => {
                              const deliveryFee = parseFloat(
                                selectedPackage.price?.replace(
                                  /[^0-9.]/g,
                                  "",
                                ) || "0",
                              );
                              const itemPayMatch =
                                selectedPackage.description?.match(
                                  /\[(?:商品费用 \(仅余额支付\)|Item Cost \(Balance Only\)|ကုန်ပစ္စည်းဖိုး \(လက်ကျန်ငွေဖြင့်သာ\)|余额支付|Balance Payment|လက်ကျန်ငွေဖြင့် ပေးချေခြင်း|平台支付|Platform Payment|ပလက်ဖောင်းမှ ပေးချေခြင်း): (.*?) MMK\]/,
                                );
                              const itemCost = itemPayMatch?.[1]
                                ? parseFloat(itemPayMatch[1].replace(/,/g, ""))
                                : 0;
                              const computedItemTotal = parsedItems.reduce(
                                (sum: number, item: any) =>
                                  sum + (item.price || 0),
                                0,
                              );
                              const finalItemTotal =
                                itemCost > 0 ? itemCost : computedItemTotal;
                              return (
                                deliveryFee + finalItemTotal
                              ).toLocaleString();
                            })()}{" "}
                            MMK
                          </span>
                  </div>
                  </div>
                </div>

                    {/* 客户备注 */}
                    {selectedPackage.notes && (
                      <div
                        style={{
                          background: "rgba(251, 191, 36, 0.1)",
                          padding: "1.25rem",
                          borderRadius: "20px",
                          border: "1px solid rgba(251, 191, 36, 0.2)",
                        }}
                      >
                        <div
                          style={{
                            color: "#fbbf24",
                            fontSize: "0.8rem",
                            fontWeight: "900",
                            marginBottom: "6px",
                            textTransform: "uppercase",
                          }}
                        >
                          💡 客户备注
                      </div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "1rem",
                            lineHeight: "1.5",
                            fontWeight: "500",
                          }}
                        >
                          {selectedPackage.notes}
                    </div>
                      </div>
                )}
                  </>
                );
              })()}
              </div>

              {/* 🚀 新增：商家接单/开始打包功能按钮 */}
              {isPartnerStore && (
                <>
                {selectedPackage.status === "待确认" && (
                    <button
                      onClick={handleAcceptOrder}
                      disabled={loading}
                      style={{
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      padding: "1rem 2rem",
                      borderRadius: "12px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "900",
                      transition: "all 0.3s ease",
                      width: "100%",
                      boxShadow: "0 8px 20px rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      marginBottom: "0.5rem",
                      }}
                    >
                      {loading ? (
                      <div
                        className="spinner"
                        style={{
                          width: "20px",
                          height: "20px",
                          border: "3px solid rgba(255,255,255,0.3)",
                          borderTop: "3px solid white",
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                        }}
                      ></div>
                    ) : (
                      <>
                        ✅{" "}
                        {language === "zh"
                          ? "立即接单"
                          : language === "en"
                            ? "Accept Order"
                            : "အော်ဒါလက်ခံရန်"}
                      </>
                      )}
                    </button>
                  )}

                {selectedPackage.status === "打包中" && (
                    <button
                      onClick={() => handleStartPacking(selectedPackage)}
                      disabled={loading}
                      style={{
                      background:
                        "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      color: "white",
                      border: "none",
                      padding: "1rem 2rem",
                      borderRadius: "12px",
                      cursor: loading ? "not-allowed" : "pointer",
                      fontSize: "1.1rem",
                      fontWeight: "900",
                      transition: "all 0.3s ease",
                      width: "100%",
                      boxShadow: "0 8px 20px rgba(16, 185, 129, 0.3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                      marginBottom: "0.5rem",
                    }}
                  >
                    <>
                      📦{" "}
                      {language === "zh"
                        ? "开始打包"
                        : language === "en"
                          ? "Start Packing"
                          : "ထုပ်ပိုးရန်စတင်ပါ"}
                    </>
                    </button>
                  )}
                </>
              )}

              {/* 关闭按钮 */}
              <button
                onClick={() => setShowPackageDetailModal(false)}
                style={{
                background: "rgba(59, 130, 246, 0.5)",
                color: "white",
                border: "1px solid rgba(59, 130, 246, 0.7)",
                padding: "0.75rem 2rem",
                borderRadius: "8px",
                cursor: "pointer",
                fontSize: "1rem",
                fontWeight: "bold",
                transition: "all 0.3s ease",
                width: "100%",
                }}
                onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.7)";
                }}
                onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(59, 130, 246, 0.5)";
                }}
              >
                {t.close}
              </button>
          </div>
        </div>
      )}

      {/* 寄件码模态框 */}
      {showPickupCodeModal && selectedPackage && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(5px)",
          zIndex: 1001,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "2rem",
        }}
        onClick={closePickupCodeModal}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #2c5282 0%, #3182ce 100%)",
              borderRadius: "15px",
              padding: "25px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflow: "auto",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  color: "white",
                }}
              >
                📱 {t.pickupCode}
              </h2>
              <button
                onClick={closePickupCodeModal}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.2)",
                  padding: "8px 16px",
                  borderRadius: "24px",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  transition: "all 0.3s ease",
                }}
              >
                ✕ {t.close}
              </button>
            </div>

            <div
              style={{
                background: "rgba(255, 255, 255, 0.1)",
                padding: "20px",
                borderRadius: "15px",
                marginBottom: "20px",
              }}
            >
              <h3
                style={{
                  color: "white",
                  margin: "0 0 15px 0",
                  fontSize: "1.1rem",
                }}
              >
                📦{" "}
                {language === "zh"
                  ? "包裹信息"
                  : language === "en"
                    ? "Package Information"
                    : "ပက်ကေ့ဂျ်အချက်အလက်"}
              </h3>
              <div
                style={{
                  color: "rgba(255,255,255,0.9)",
                  fontSize: "0.9rem",
                  marginBottom: "15px",
                }}
              >
                <p style={{ margin: "5px 0" }}>
                  <strong>
                    {language === "zh"
                      ? "包裹编号"
                      : language === "en"
                        ? "Package ID"
                        : "ပက်ကေ့ဂျ်နံပါတ်"}
                    :
                  </strong>{" "}
                  {selectedPackage.id}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>
                    {language === "zh"
                      ? "包裹类型"
                      : language === "en"
                        ? "Package Type"
                        : "ပက်ကေ့ဂျ်အမျိုးအစား"}
                    :
                  </strong>{" "}
                  {selectedPackage.package_type || "-"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>{t.sender}:</strong>{" "}
                  {selectedPackage.sender_name || "-"}
                </p>
                <p style={{ margin: "5px 0" }}>
                  <strong>{t.receiver}:</strong>{" "}
                  {selectedPackage.receiver_name || "-"}
                </p>
              </div>
              
              <div
                style={{
                  background: "white",
                  padding: "25px",
                  borderRadius: "15px",
                  marginBottom: "20px",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.1)",
                  border: "2px solid rgba(255, 255, 255, 0.2)",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "rgba(0, 0, 0, 0.1)",
                    color: "#666",
                    padding: "4px 8px",
                    borderRadius: "4px",
                    fontSize: "0.7rem",
                    fontWeight: "500",
                  }}
                >
                  {selectedPackage.id}
                </div>
                
                {qrCodeDataUrl ? (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <img 
                      src={qrCodeDataUrl} 
                      alt={t.pickupCode}
                      style={{
                        width: "220px",
                        height: "220px",
                        borderRadius: "8px",
                        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                      }}
                    />
                    <p
                      style={{
                        color: "#666",
                        fontSize: "0.8rem",
                      margin: 0,
                        textAlign: "center",
                      }}
                    >
                      {language === "zh"
                        ? "扫描此二维码完成取件"
                        : language === "en"
                          ? "Scan this QR code to complete pickup"
                          : "ဤ QR code ကို စကင်န်ဖတ်၍ ကောက်ယူမှု ပြီးစီးပါ"}
                    </p>
                  </div>
                ) : (
                  <div
                    style={{
                      width: "220px",
                      height: "220px",
                      background:
                        "linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto",
                      borderRadius: "8px",
                      border: "2px dashed #ccc",
                    }}
                  >
                    <div style={{ textAlign: "center" }}>
                      <div
                        style={{
                          fontSize: "2rem",
                          marginBottom: "10px",
                        }}
                      >
                        ⏳
                      </div>
                      <p
                        style={{ color: "#666", margin: 0, fontSize: "0.9rem" }}
                      >
                        {language === "zh"
                          ? "生成中..."
                          : language === "en"
                            ? "Generating..."
                            : "ထုတ်လုပ်နေသည်..."}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div
                style={{
                  background: "rgba(255, 255, 255, 0.05)",
                  padding: "15px",
                  borderRadius: "10px",
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                }}
              >
                <h4
                  style={{
                    color: "#A5C7FF",
                    margin: "0 0 10px 0",
                    fontSize: "0.9rem",
                  }}
                >
                  💡{" "}
                  {language === "zh"
                    ? "使用说明"
                    : language === "en"
                      ? "Instructions"
                      : "အသုံးပြုမှုညွှန်ကြားချက်"}
                </h4>
                <ul
                  style={{
                    color: "rgba(255,255,255,0.9)",
                    fontSize: "0.85rem",
                    textAlign: "left",
                  margin: 0,
                    paddingLeft: "20px",
                    lineHeight: "1.6",
                  }}
                >
                  <li>
                    {language === "zh"
                      ? "配送员扫描此二维码完成取件"
                      : language === "en"
                        ? "Courier scans this QR code to complete pickup"
                        : "ပို့ဆောင်သူသည် ဤ QR code ကို စကင်န်ဖတ်၍ ကောက်ယူမှု ပြီးစီးပါ"}
                  </li>
                  <li>
                    {language === "zh"
                      ? "您也可以保存二维码图片备用"
                      : language === "en"
                        ? "You can also save the QR code image as backup"
                        : "သင်သည် QR code ပုံကို သိမ်းဆည်းထားနိုင်သည်"}
                  </li>
                </ul>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                gap: "10px",
                justifyContent: "center",
              }}
            >
              <button
                onClick={saveQRCode}
                disabled={!qrCodeDataUrl}
                style={{
                  background: qrCodeDataUrl
                    ? "rgba(255, 255, 255, 0.2)"
                    : "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.3)",
                  padding: "10px 20px",
                  borderRadius: "8px",
                  cursor: qrCodeDataUrl ? "pointer" : "not-allowed",
                  fontSize: "0.9rem",
                  fontWeight: "bold",
                  transition: "all 0.3s ease",
                  opacity: qrCodeDataUrl ? 1 : 0.5,
                }}
                onMouseOver={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.3)";
                  }
                }}
                onMouseOut={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.background =
                      "rgba(255, 255, 255, 0.2)";
                  }
                }}
              >
                💾{" "}
                {language === "zh"
                  ? "保存二维码"
                  : language === "en"
                    ? "Save QR Code"
                    : "QR code သိမ်းဆည်းရန်"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 密码修改模态框 */}
      {showPasswordModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          zIndex: 30000,
            padding: "1rem",
        }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowPasswordModal(false);
              setPasswordForm({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
              });
            }
          }}
        >
          <div
            style={{
              background:
                "linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(255, 255, 255, 0.9))",
              borderRadius: "24px",
              padding: "2.5rem",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <h2
                style={{
                  color: "#1e293b",
                  fontSize: "1.8rem",
                  fontWeight: "800",
                  margin: 0,
                }}
              >
                {language === "zh"
                  ? "修改密码"
                  : language === "en"
                    ? "Change Password"
                    : "စကားဝှက် ပြောင်းလဲရန်"}
              </h2>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPasswordForm({
                    currentPassword: "",
                    newPassword: "",
                    confirmPassword: "",
                  });
                }}
                style={{
                  background: "rgba(0, 0, 0, 0.05)",
                  border: "none",
                  borderRadius: "50%",
                  width: "36px",
                  height: "36px",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                  color: "#64748b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(239, 68, 68, 0.1)";
                  e.currentTarget.style.color = "#ef4444";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                  e.currentTarget.style.color = "#64748b";
                }}
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* 当前密码 */}
              <div>
                <label
                  style={{
                    color: "#475569",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  {language === "zh"
                    ? "当前密码"
                    : language === "en"
                      ? "Current Password"
                      : "လက်ရှိစကားဝှက်"}
                </label>
                <input
                  type="password"
                  value={passwordForm.currentPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      currentPassword: e.target.value,
                    })
                  }
                  placeholder={
                    language === "zh"
                      ? "请输入当前密码"
                      : language === "en"
                        ? "Enter current password"
                        : "လက်ရှိစကားဝှက်ထည့်ပါ"
                  }
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    outline: "none",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* 新密码 */}
              <div>
                <label
                  style={{
                    color: "#475569",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  {language === "zh"
                    ? "新密码"
                    : language === "en"
                      ? "New Password"
                      : "စကားဝှက်အသစ်"}
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      newPassword: e.target.value,
                    })
                  }
                  placeholder={
                    language === "zh"
                      ? "请输入新密码（至少6位）"
                      : language === "en"
                        ? "Enter new password (at least 6 characters)"
                        : "စကားဝှက်အသစ်ထည့်ပါ (အနည်းဆုံး ၆ လုံး)"
                  }
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    outline: "none",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* 确认新密码 */}
              <div>
                <label
                  style={{
                    color: "#475569",
                    fontSize: "0.9rem",
                    fontWeight: "600",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  {language === "zh"
                    ? "确认新密码"
                    : language === "en"
                      ? "Confirm New Password"
                      : "စကားဝှက်အသစ် အတည်ပြုရန်"}
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) =>
                    setPasswordForm({
                      ...passwordForm,
                      confirmPassword: e.target.value,
                    })
                  }
                  placeholder={
                    language === "zh"
                      ? "请再次输入新密码"
                      : language === "en"
                        ? "Enter new password again"
                        : "စကားဝှက်အသစ် ထပ်မံထည့်ပါ"
                  }
                  minLength={6}
                  style={{
                    width: "100%",
                    padding: "0.875rem 1rem",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    outline: "none",
                    transition: "all 0.3s ease",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = "#3b82f6";
                    e.currentTarget.style.boxShadow =
                      "0 0 0 3px rgba(59, 130, 246, 0.1)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = "#e2e8f0";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                />
              </div>

              {/* 按钮 */}
              <div
                style={{
                  display: "flex",
                  gap: "1rem",
                  marginTop: "1rem",
                }}
              >
                <button
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordForm({
                      currentPassword: "",
                      newPassword: "",
                      confirmPassword: "",
                    });
                  }}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background: "rgba(0, 0, 0, 0.05)",
                    color: "#475569",
                    border: "2px solid #e2e8f0",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.1)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = "rgba(0, 0, 0, 0.05)";
                  }}
                >
                  {language === "zh"
                    ? "取消"
                    : language === "en"
                      ? "Cancel"
                      : "ပယ်ဖျက်ရန်"}
                </button>
                <button
                  onClick={handlePasswordChange}
                  style={{
                    flex: 1,
                    padding: "0.875rem",
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    color: "white",
                    border: "none",
                    borderRadius: "12px",
                    fontSize: "1rem",
                    fontWeight: "600",
                    cursor: "pointer",
                    transition: "all 0.3s ease",
                    boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.boxShadow =
                      "0 6px 16px rgba(59, 130, 246, 0.4)";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }}
                >
                  {language === "zh"
                    ? "确认修改"
                    : language === "en"
                      ? "Confirm Change"
                      : "အတည်ပြုရန်"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 代收款订单列表模态框 */}
      {showCODOrdersModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          zIndex: 30000,
            backdropFilter: "blur(10px)",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              padding: window.innerWidth < 768 ? "1.5rem" : "2.5rem",
              borderRadius: "32px",
              maxWidth: "600px",
              width: "100%",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(59, 130, 246, 0.2)",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  💰
                </div>
                <h2
                  style={{
                    color: "white",
                  margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: "900",
                  }}
                >
                  {codModalTitle || t.codOrders}
                </h2>
              </div>
              <button
                onClick={() => setShowCODOrdersModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "none",
                  color: "white",
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ flex: 1, overflowY: "auto", paddingRight: "0.5rem" }}>
              {codOrders.length > 0 ? (
                codOrders.map((order: any, index: number) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1.25rem",
                      marginBottom: "1rem",
                      background: "rgba(255, 255, 255, 0.05)",
                      borderRadius: "16px",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "0.8rem",
                          marginBottom: "4px",
                          fontWeight: "700",
                        }}
                      >
                        {t.packageId}
                      </div>
                      <div
                        style={{
                          color: "white",
                          fontSize: "1rem",
                          fontWeight: "800",
                          fontFamily: "monospace",
                        }}
                      >
                        {order.orderId}
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div
                        style={{
                          color: "rgba(255, 255, 255, 0.5)",
                          fontSize: "0.8rem",
                          marginBottom: "4px",
                          fontWeight: "700",
                        }}
                      >
                        {t.codAmount}
                      </div>
                      <div
                        style={{
                          color: "#fbbf24",
                          fontSize: "1.3rem",
                          fontWeight: "900",
                        }}
                      >
                        {order.codAmount.toLocaleString()}{" "}
                        <span style={{ fontSize: "0.8rem" }}>MMK</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div
                  style={{
                    padding: "4rem 2rem",
                    textAlign: "center",
                    color: "rgba(255, 255, 255, 0.2)",
                  }}
                >
                  <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
                    📭
                  </div>
                  <div style={{ fontSize: "1.2rem", fontWeight: "700" }}>
                    {language === "zh"
                      ? "暂无订单"
                      : language === "en"
                        ? "No orders"
                        : "အော်ဒါမရှိပါ"}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => setShowCODOrdersModal(false)}
              style={{
                width: "100%",
                marginTop: "2rem",
                padding: "14px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "white",
                border: "none",
                borderRadius: "16px",
                fontSize: "1rem",
                fontWeight: "800",
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(255, 255, 255, 0.1)")
              }
            >
              {t.close}
            </button>
          </div>
        </div>
      )}

      {/* 🚀 新增：店铺商品管理大模态框 */}
      {showProductsModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(15px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          zIndex: 20000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#0f172a",
              borderRadius: "32px",
              padding: "2.5rem",
              width: "95%",
              maxWidth: "1000px",
              maxHeight: "90vh",
              display: "flex",
              flexDirection: "column",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 30px 70px rgba(0, 0, 0, 0.5)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1.25rem",
                }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    borderRadius: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                    boxShadow: "0 10px 20px rgba(5, 150, 105, 0.4)",
                  }}
                >
                  🏪
              </div>
                <h3
                  style={{
                    color: "white",
                    fontSize: "2rem",
                    fontWeight: "900",
                    margin: 0,
                  }}
                >
                  {t.myProducts}
                </h3>
              </div>
              <div style={{ display: "flex", gap: "1rem" }}>
                <button 
                  onClick={handleOpenAddProduct}
                  style={{
                    padding: "12px 28px",
                    borderRadius: "16px",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    color: "white",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 8px 25px rgba(5, 150, 105, 0.4)",
                    transition: "all 0.3s ease",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.transform = "translateY(-2px)")
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.transform = "translateY(0)")
                  }
                >
                  + {t.addProduct}
                </button>
                <button 
                  onClick={() => setShowProductsModal(false)}
                  style={{
                    position: "relative",
                    background: "rgba(255,255,255,0.1)",
                    border: "none",
                    color: "white",
                    width: "48px",
                    height: "48px",
                    borderRadius: "16px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.2rem",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div style={{ overflowY: "auto", flex: 1, padding: "0.5rem" }}>
              {loadingProducts ? (
                <div style={{ textAlign: "center", padding: "5rem" }}>
                  <div
                    className="spinner"
                    style={{
                      border: "5px solid rgba(255,255,255,0.1)",
                      borderTop: "5px solid #10b981",
                      borderRadius: "50%",
                      width: "50px",
                      height: "50px",
                      animation: "spin 1s linear infinite",
                      margin: "0 auto",
                    }}
                  ></div>
                </div>
              ) : products.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "5rem",
                    color: "rgba(255,255,255,0.3)",
                  }}
                >
                  <div style={{ fontSize: "5rem", marginBottom: "1.5rem" }}>
                    📦
                  </div>
                  <div style={{ fontSize: "1.5rem", fontWeight: "700" }}>
                    {t.noProducts}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "repeat(auto-fill, minmax(220px, 1fr))",
                    gap: "2rem",
                  }}
                >
                  {products.map((product: any) => (
                    <div 
                      key={product.id}
                      onClick={() => handleOpenEditProduct(product)}
                      style={{
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "28px",
                        padding: "1.5rem",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        cursor: "pointer",
                        transition: "all 0.3s ease",
                        position: "relative",
                        overflow: "hidden",
                        boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                      }}
                      onMouseOver={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.08)";
                        e.currentTarget.style.transform = "translateY(-10px)";
                        e.currentTarget.style.boxShadow =
                          "0 20px 40px rgba(0,0,0,0.4)";
                      }}
                      onMouseOut={(e) => {
                        e.currentTarget.style.background =
                          "rgba(255, 255, 255, 0.05)";
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 10px 30px rgba(0,0,0,0.2)";
                      }}
                    >
                      <div
                        style={{
                          width: "100%",
                          aspectRatio: "1",
                          borderRadius: "24px",
                          background: "#000",
                          marginBottom: "1.25rem",
                          overflow: "hidden",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {product.image_url &&
                        !product.image_url.startsWith("file://") ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: "3rem" }}>🖼️</span>
                        )}
                      </div>
                      <h4
                        style={{
                          color: "white",
                          fontSize: "1.2rem",
                          fontWeight: "800",
                          margin: "0 0 0.75rem 0",
                        }}
                      >
                        {product.name}
                      </h4>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: "10px",
                        }}
                      >
                        <div
                          style={{
                            color: "#10b981",
                            fontWeight: "900",
                            fontSize: "1.5rem",
                          }}
                        >
                          {product.price.toLocaleString()} MMK
                        </div>
                        {product.original_price &&
                          product.original_price > product.price && (
                            <div
                              style={{
                                color: "rgba(255,255,255,0.3)",
                                textDecoration: "line-through",
                                fontSize: "0.9rem",
                                fontWeight: "600",
                              }}
                            >
                            {product.original_price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      {product.original_price &&
                        product.original_price > product.price && (
                          <div
                            style={{
                              position: "absolute",
                              top: "20px",
                              right: "20px",
                              background:
                                "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                              color: "white",
                              padding: "4px 12px",
                              borderRadius: "12px",
                              fontSize: "0.75rem",
                              fontWeight: "900",
                              boxShadow: "0 4px 12px rgba(239, 68, 68, 0.3)",
                              zIndex: 2,
                            }}
                          >
                            {Math.round(
                              (1 - product.price / product.original_price) *
                                100,
                            )}
                            % OFF
                        </div>
                      )}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginTop: "1rem",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "0.85rem",
                            color: "rgba(255,255,255,0.4)",
                            fontWeight: "600",
                          }}
                        >
                          {t.productStock}:{" "}
                          {product.stock === -1
                            ? t.stockInfinite
                            : product.stock}
                        </div>
                        <div
                          style={{
                            padding: "4px 12px",
                            borderRadius: "10px",
                            fontSize: "0.75rem",
                            fontWeight: "800",
                            backgroundColor: product.is_available
                              ? "rgba(16, 185, 129, 0.15)"
                              : "rgba(239, 68, 68, 0.15)",
                            color: product.is_available ? "#10b981" : "#ef4444",
                          }}
                        >
                          {product.is_available ? t.onSale : t.offShelf}
                        </div>
                      </div>
                      {(product.listing_status === "pending" ||
                        product.listing_status === "rejected") && (
                        <div
                          style={{
                            marginTop: "0.5rem",
                            fontSize: "0.75rem",
                            fontWeight: 800,
                            color:
                              product.listing_status === "pending"
                                ? "#fbbf24"
                                : "#f87171",
                          }}
                        >
                          {product.listing_status === "pending"
                            ? language === "zh"
                              ? "待后台审核"
                              : "Pending approval"
                            : language === "zh"
                              ? "审核未通过"
                              : "Rejected"}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：添加/编辑商品模态框 */}
      {showAddEditProductModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          zIndex: 30000,
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "32px",
              padding: "2.5rem",
              width: "100%",
              maxWidth: "550px",
              maxHeight: "90vh",
              overflowY: "auto",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 25px 60px rgba(0, 0, 0, 0.5)",
              position: "relative",
            }}
          >
            <button 
              onClick={() => setShowAddEditProductModal(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              ✕
            </button>

            <h3
              style={{
                color: "white",
                fontSize: "1.8rem",
                fontWeight: "900",
                margin: "0 0 2rem 0",
                textAlign: "center",
              }}
            >
              {editingProduct ? t.editProduct : t.addProduct}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              {/* 图片上传区域 */}
              <div 
                onClick={() => productFileInputRef.current?.click()}
                style={{
                  width: "100%",
                  aspectRatio: "16/9",
                  background: "rgba(255,255,255,0.03)",
                  borderRadius: "24px",
                  border: "2px dashed rgba(255,255,255,0.1)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  overflow: "hidden",
                  position: "relative",
                }}
              >
                {productForm.image_url ? (
                  <img
                    src={productForm.image_url}
                    alt="Preview"
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <>
                    <div
                      style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}
                    >
                      📸
                    </div>
                    <div
                      style={{
                        color: "rgba(255,255,255,0.5)",
                        fontWeight: "700",
                      }}
                    >
                      {isUploading ? t.uploading : t.uploadImage}
                    </div>
                  </>
                )}
                <input 
                  type="file" 
                  ref={productFileInputRef} 
                  onChange={handleImageUpload} 
                  style={{ display: "none" }}
                  accept="image/*"
                />
              </div>

              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  {t.productName} *
                </label>
                <input 
                  type="text"
                  value={productForm.name}
                  onChange={(e) =>
                    setProductForm({ ...productForm, name: e.target.value })
                  }
                  placeholder="如：冰镇可乐 330ml"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  {language === "zh"
                    ? "商品描述 (详细介绍商品细节)"
                    : "Description"}
                </label>
                <textarea 
                  value={productForm.description}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      description: e.target.value,
                    })
                  }
                  placeholder={
                    language === "zh"
                      ? "请输入商品详细描述信息，例如：规格、口味、保质期、使用方法等..."
                      : "Enter product details..."
                  }
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255, 255, 255, 0.1)",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    color: "white",
                    outline: "none",
                    minHeight: "100px",
                    resize: "none",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  {t.productPrice} (MMK) *
                </label>
                <input 
                  type="number"
                  value={productForm.price}
                  onChange={(e) =>
                    setProductForm({ ...productForm, price: e.target.value })
                  }
                  placeholder="输入价格"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  {t.productDiscount} (%)
                </label>
                <input 
                  type="number"
                  value={productForm.discount_percent}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      discount_percent: e.target.value,
                    })
                  }
                  placeholder="输入优惠百分比 (如 10)"
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.6)",
                    fontSize: "0.85rem",
                    fontWeight: "700",
                    marginBottom: "0.5rem",
                    display: "block",
                  }}
                >
                  {t.productStock} (-1={t.stockInfinite})
                </label>
                <input 
                  type="number"
                  value={productForm.stock}
                  onChange={(e) =>
                    setProductForm({ ...productForm, stock: e.target.value })
                  }
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    borderRadius: "14px",
                    padding: "12px 16px",
                    color: "white",
                    outline: "none",
                  }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  background: "rgba(255,255,255,0.03)",
                  padding: "16px",
                  borderRadius: "16px",
                }}
              >
                <span
                  style={{ color: "rgba(255,255,255,0.8)", fontWeight: "700" }}
                >
                  {t.isAvailable}
                </span>
                <input 
                  type="checkbox"
                  checked={productForm.is_available}
                  onChange={(e) =>
                    setProductForm({
                      ...productForm,
                      is_available: e.target.checked,
                    })
                  }
                  style={{ width: "20px", height: "20px", cursor: "pointer" }}
                />
              </div>

              <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                {editingProduct && (
                  <button 
                    onClick={() => handleDeleteProduct(editingProduct.id)}
                    style={{
                      flex: 1,
                      padding: "14px",
                      borderRadius: "16px",
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.3)",
                      color: "#ef4444",
                      fontWeight: "800",
                      cursor: "pointer",
                    }}
                  >
                    🗑️ {t.delete}
                  </button>
                )}
                <button 
                  onClick={handleSaveProduct}
                  style={{
                    flex: 2,
                    padding: "14px",
                    borderRadius: "16px",
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                    border: "none",
                    color: "white",
                    fontWeight: "800",
                    cursor: "pointer",
                    boxShadow: "0 8px 20px rgba(37, 99, 235, 0.3)",
                  }}
                >
                  💾 {t.save}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 新增：充值余额模态框 */}
      {/* 🚀 新增：充值余额模态框 */}
      {showRechargeModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)", // 🚀 加深背景
            backdropFilter: "blur(15px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          zIndex: 99999, // 🚀 极高 Z-Index，确保在所有元素（包括 Header）上方
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "32px",
              padding: "2.5rem",
              width: "100%",
              maxWidth: "450px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 30px 70px rgba(0, 0, 0, 0.6)",
              position: "relative",
              animation: "fadeInUp 0.4s ease-out",
            }}
          >
            <button 
              onClick={() => setShowRechargeModal(false)}
              style={{
                position: "absolute",
                top: "24px",
                right: "24px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseOver={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
              }
              onMouseOut={(e) =>
                (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
              }
            >
              ✕
            </button>

            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>💰</div>
              <h3
                style={{
                  color: "white",
                  fontSize: "1.8rem",
                  fontWeight: "900",
                  margin: 0,
                }}
              >
                {language === "zh"
                  ? "账户充值"
                  : language === "en"
                    ? "Recharge Balance"
                    : "ငွေဖြည့်သွင်းခြင်း"}
              </h3>
              <p
                style={{ color: "rgba(255,255,255,0.5)", marginTop: "0.5rem" }}
              >
                {language === "zh"
                  ? "请选择充值卡金额"
                  : language === "en"
                    ? "Please select recharge amount"
                    : "ငွေဖြည့်ကတ် ပမာဏကို ရွေးချယ်ပါ"}
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(2, 1fr)",
                  gap: "1rem",
                }}
              >
                {[10000, 50000, 100000, 300000, 500000, 1000000].map(
                  (amount: number) => (
                  <button
                    key={amount}
                    onClick={() => setRechargeAmount(amount.toString())}
                    style={{
                        padding: "1.2rem",
                        borderRadius: "18px",
                        background:
                          rechargeAmount === amount.toString()
                            ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                            : "rgba(255,255,255,0.05)",
                        border: "2px solid",
                        borderColor:
                          rechargeAmount === amount.toString()
                            ? "#3b82f6"
                            : "rgba(255,255,255,0.1)",
                        color: "white",
                        fontSize: "1.1rem",
                        fontWeight: "800",
                        cursor: "pointer",
                        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        gap: "4px",
                        transform:
                          rechargeAmount === amount.toString()
                            ? "scale(1.05)"
                            : "scale(1)",
                        boxShadow:
                          rechargeAmount === amount.toString()
                            ? "0 10px 20px rgba(59, 130, 246, 0.3)"
                            : "none",
                    }}
                  >
                    <span>{amount.toLocaleString()}</span>
                      <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>
                        MMK
                      </span>
                  </button>
                  ),
                )}
              </div>

              <button 
                onClick={handleOpenPaymentQR}
                disabled={
                  loading || !rechargeAmount || parseFloat(rechargeAmount) <= 0
                }
                style={{ 
                  marginTop: "1rem",
                  padding: "18px",
                  borderRadius: "18px",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  border: "none",
                  color: "white",
                  fontSize: "1.1rem",
                  fontWeight: "800",
                  cursor:
                    loading || !rechargeAmount ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 25px rgba(16, 185, 129, 0.3)",
                  opacity: loading || !rechargeAmount ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.8rem",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  !loading &&
                  rechargeAmount &&
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseOut={(e) =>
                  !loading &&
                  rechargeAmount &&
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                {language === "zh" ? "下一步" : "Next Step"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：支付二维码模态框 */}
      {showPaymentQRModal && selectedRechargeAmount && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(15px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          zIndex: 100000, // 🚀 确保在最高层
            padding: "20px",
          }}
        >
          <div
            style={{
              backgroundColor: "#1e293b",
              borderRadius: "32px",
              padding: "1.5rem",
              width: "100%",
              maxWidth: "480px",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 30px 70px rgba(0, 0, 0, 0.6)",
              position: "relative",
              animation: "fadeInUp 0.4s ease-out",
            }}
          >
            <button 
              onClick={() => setShowPaymentQRModal(false)}
              style={{
                position: "absolute",
                top: "20px",
                right: "24px",
                background: "rgba(255,255,255,0.1)",
                border: "none",
                color: "white",
                width: "36px",
                height: "36px",
                borderRadius: "12px",
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <h3
                style={{
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: "800",
                  margin: 0,
                }}
              >
                扫描二维码支付
              </h3>
              <p
                style={{
                  color: "#10b981",
                  fontSize: "1.2rem",
                  fontWeight: "900",
                  marginTop: "0.5rem",
                }}
              >
                {selectedRechargeAmount.toLocaleString()} MMK
              </p>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "1.5rem",
              }}
            >
              <div
                style={{
                  background: "white",
                  padding: "15px",
                  borderRadius: "24px",
                  position: "relative",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                }}
              >
                <img 
                  src={`/kbz_qr_${selectedRechargeAmount}.png`} 
                  alt="KBZPay QR" 
                  style={{
                    width: "220px",
                    height: "220px",
                    objectFit: "contain",
                  }}
                />
                <button 
                  onClick={handleSaveQRCode}
                  style={{
                    position: "absolute",
                    top: "10px",
                    right: "10px",
                    background: "#3b82f6",
                    border: "none",
                    color: "white",
                    width: "36px",
                    height: "36px",
                    borderRadius: "50%",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                  }}
                  title="保存图片"
                >
                  💾
                </button>
              </div>

              <div style={{ width: "100%" }}>
                <p
                  style={{
                    color: "white",
                    fontSize: "0.9rem",
                    marginBottom: "10px",
                    fontWeight: "600",
                  }}
                >
                  上传支付凭证截图：
                </p>
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  style={{ 
                    width: "100%",
                    height: "140px",
                    border: "2px dashed rgba(255,255,255,0.2)",
                    borderRadius: "18px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    background: rechargeProofPreview
                      ? `url(${rechargeProofPreview}) center/contain no-repeat`
                      : "rgba(255,255,255,0.02)",
                    backgroundColor: rechargeProofPreview
                      ? "#000"
                      : "transparent",
                    transition: "all 0.3s ease",
                    overflow: "hidden",
                  }}
                >
                  {!rechargeProofPreview && (
                    <>
                      <span
                        style={{ fontSize: "1.75rem", marginBottom: "8px" }}
                      >
                        📸
                      </span>
                      <span
                        style={{
                          color: "rgba(255,255,255,0.4)",
                          fontSize: "0.9rem",
                          fontWeight: "600",
                        }}
                      >
                        点击上传汇款记录
                      </span>
                    </>
                  )}
                </div>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  style={{ display: "none" }}
                />
              </div>

              <button 
                onClick={handleConfirmRecharge}
                disabled={loading || !rechargeProof}
                style={{ 
                  width: "100%",
                  padding: "18px",
                  borderRadius: "18px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
                  border: "none",
                  color: "white",
                  fontSize: "1.1rem",
                  fontWeight: "800",
                  cursor: loading || !rechargeProof ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 25px rgba(37, 99, 235, 0.3)",
                  opacity: loading || !rechargeProof ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.8rem",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  !loading &&
                  rechargeProof &&
                  (e.currentTarget.style.transform = "translateY(-2px)")
                }
                onMouseOut={(e) =>
                  !loading &&
                  rechargeProof &&
                  (e.currentTarget.style.transform = "translateY(0)")
                }
              >
                {loading ? (
                  <div
                    className="spinner"
                    style={{
                      width: "20px",
                      height: "20px",
                      border: "3px solid rgba(255,255,255,0.3)",
                      borderTop: "3px solid white",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                ) : (
                  "确认已支付"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：待打包订单列表模态框 */}
      {showPackingListModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          zIndex: 30000,
            backdropFilter: "blur(10px)",
        }}
        onClick={() => setShowPackingListModal(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              padding: "2.5rem",
              borderRadius: "32px",
              maxWidth: "700px",
              width: "95%",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background:
                      "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  📦
                </div>
                <h2
                  style={{
                    color: "white",
                  margin: 0,
                    fontSize: "1.75rem",
                    fontWeight: "800",
                  }}
                >
                  {language === "zh"
                    ? "待打包订单"
                    : language === "en"
                      ? "Orders to Pack"
                      : "ထုပ်ပိုးရန်ကျန်သောအော်ဒါများ"}
                </h2>
              </div>
              <button
                onClick={() => setShowPackingListModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
              {userPackages.filter((pkg) => pkg.status === "打包中").length >
              0 ? (
                userPackages
                  .filter((pkg) => pkg.status === "打包中")
                  .map((pkg: any) => (
                  <div
                    key={pkg.id}
                    style={{
                        padding: "1.5rem",
                        marginBottom: "1rem",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "24px",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: "1rem",
                        transition: "all 0.3s ease",
                    }}
                  >
                    <div style={{ flex: 1 }}>
                        <div
                          style={{
                            color: "rgba(255, 255, 255, 0.5)",
                            fontSize: "0.85rem",
                            marginBottom: "4px",
                            fontWeight: "bold",
                          }}
                        >
                        {t.packageId}
                      </div>
                        <div
                          style={{
                            color: "white",
                            fontSize: "1.1rem",
                            fontWeight: "800",
                            marginBottom: "8px",
                          }}
                        >
                        {pkg.id}
                      </div>
                        <div style={{ display: "flex", gap: "15px" }}>
                          <div
                            style={{
                              color: "rgba(255, 255, 255, 0.7)",
                              fontSize: "0.9rem",
                            }}
                          >
                            📅 {pkg.create_time || pkg.created_at || "-"}
                        </div>
                        {pkg.cod_amount > 0 && (
                            <div
                              style={{
                                color: "#fca5a5",
                                fontSize: "0.9rem",
                                fontWeight: "bold",
                              }}
                            >
                            💰 {pkg.cod_amount.toLocaleString()} MMK
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setShowPackingListModal(false);
                        handleStartPacking(pkg);
                      }}
                      style={{
                          padding: "12px 24px",
                          background:
                            "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                          color: "white",
                          border: "none",
                          borderRadius: "12px",
                          fontWeight: "800",
                          fontSize: "0.9rem",
                          cursor: "pointer",
                          boxShadow: "0 8px 15px rgba(16, 185, 129, 0.3)",
                          transition: "all 0.3s ease",
                          whiteSpace: "nowrap",
                        }}
                        onMouseOver={(e) =>
                          (e.currentTarget.style.transform = "translateY(-2px)")
                        }
                        onMouseOut={(e) =>
                          (e.currentTarget.style.transform = "translateY(0)")
                        }
                      >
                        📦{" "}
                        {language === "zh"
                          ? "开始打包"
                          : language === "en"
                            ? "Start Packing"
                            : "ထုပ်ပိုးရန်စတင်ပါ"}
                    </button>
                  </div>
                ))
              ) : (
                <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
                    ✨
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: "1.2rem",
                      fontWeight: "700",
                    }}
                  >
                    {language === "zh"
                      ? "暂无待打包订单"
                      : language === "en"
                        ? "No orders to pack"
                        : "ထုပ်ပိုးရန်အော်ဒါမရှိပါ"}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "2rem",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                paddingTop: "1.5rem",
              }}
            >
              <button
                onClick={() => setShowPackingListModal(false)}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.1)")
                }
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：待接单订单列表模态框 */}
      {isPartnerStore && showPendingAcceptListModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          zIndex: 30000,
            backdropFilter: "blur(10px)",
        }}
        onClick={() => setShowPendingAcceptListModal(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              padding: "2.5rem",
              borderRadius: "32px",
              maxWidth: "700px",
              width: "95%",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background:
                      "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  🔔
                </div>
                <h2
                  style={{
                    color: "white",
                  margin: 0,
                    fontSize: "1.75rem",
                    fontWeight: "800",
                  }}
                >
                  {language === "zh"
                    ? "待接单订单"
                    : language === "en"
                      ? "Pending Accept"
                      : "လက်ခံရန်စောင့်ဆိုင်းနေသည်"}
                </h2>
              </div>
              <button
                onClick={() => setShowPendingAcceptListModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
              {userPackages.filter((pkg) => pkg.status === "待确认").length >
              0 ? (
                userPackages
                  .filter((pkg) => pkg.status === "待确认")
                  .map((pkg: any) => {
                  // 解析商品信息
                    const itemsMatch = pkg.description?.match(
                      /\[(?:已选商品|Selected|Selected Products|ရွေးချယ်ထားသောပစ္စည်းများ|ကုန်ပစ္စည်းများ): (.*?)\]/,
                    );
                    const productItems = itemsMatch
                      ? itemsMatch[1].split(", ")
                      : [];
                  const parsedItems = productItems.map((item: string) => {
                    const match = item.match(/^(.+?)\s*x(\d+)$/i);
                    if (!match) return { label: item, qty: 1 };
                      return {
                        label: match[1].trim(),
                        qty: Number(match[2]) || 1,
                      };
                  });

                  return (
                    <div
                      key={pkg.id}
                      style={{
                          padding: "1.5rem",
                          marginBottom: "2rem",
                          background: "rgba(255, 255, 255, 0.05)",
                          borderRadius: "28px",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1.5rem",
                          transition: "all 0.3s ease",
                      }}
                    >
                      {/* 订单 ID 和 二维码区域 */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "flex-start",
                          }}
                        >
                        <div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.5)",
                                fontSize: "0.85rem",
                                marginBottom: "4px",
                                fontWeight: "bold",
                              }}
                            >
                            {t.packageId}
                          </div>
                            <div
                              style={{
                                color: "#fbbf24",
                                fontSize: "1.4rem",
                                fontWeight: "900",
                              }}
                            >
                            #{pkg.id}
                          </div>
                            <div
                              style={{
                                color: "rgba(255, 255, 255, 0.7)",
                                fontSize: "0.9rem",
                                marginTop: "8px",
                              }}
                            >
                              📅 {pkg.create_time || pkg.created_at || "-"}
                          </div>
                        </div>
                          <div
                            style={{
                              background: "white",
                              padding: "10px",
                              borderRadius: "16px",
                            }}
                          >
                          <OrderQRCode orderId={pkg.id} />
                        </div>
                      </div>

                      {/* 信息网格 */}
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: "1.5rem",
                          }}
                        >
                        {/* 商家信息 */}
                          <div
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              padding: "1.2rem",
                              borderRadius: "18px",
                              border: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <div
                              style={{
                                color: "#3b82f6",
                                fontSize: "0.8rem",
                                fontWeight: "900",
                                marginBottom: "8px",
                                textTransform: "uppercase",
                              }}
                            >
                              商家信息
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontWeight: "700",
                                fontSize: "1rem",
                              }}
                            >
                              {pkg.sender_name}
                            </div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.9rem",
                                marginTop: "4px",
                              }}
                            >
                              {pkg.sender_phone}
                            </div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.85rem",
                                marginTop: "4px",
                              }}
                            >
                              {pkg.sender_address}
                            </div>
                        </div>
                        {/* 客户信息 */}
                          <div
                            style={{
                              background: "rgba(255,255,255,0.03)",
                              padding: "1.2rem",
                              borderRadius: "18px",
                              border: "1px solid rgba(255,255,255,0.05)",
                            }}
                          >
                            <div
                              style={{
                                color: "#fbbf24",
                                fontSize: "0.8rem",
                                fontWeight: "900",
                                marginBottom: "8px",
                                textTransform: "uppercase",
                              }}
                            >
                              客户信息
                            </div>
                            <div
                              style={{
                                color: "white",
                                fontWeight: "700",
                                fontSize: "1rem",
                              }}
                            >
                              {pkg.receiver_name}
                            </div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.9rem",
                                marginTop: "4px",
                              }}
                            >
                              {pkg.receiver_phone}
                            </div>
                            <div
                              style={{
                                color: "rgba(255,255,255,0.6)",
                                fontSize: "0.85rem",
                                marginTop: "4px",
                              }}
                            >
                              {pkg.receiver_address}
                            </div>
                        </div>
                      </div>

                      {/* 商品清单 */}
                        <div
                          style={{
                            background: "rgba(255,255,255,0.03)",
                            padding: "1.2rem",
                            borderRadius: "18px",
                            border: "1px solid rgba(255,255,255,0.05)",
                          }}
                        >
                          <div
                            style={{
                              color: "#10b981",
                              fontSize: "0.8rem",
                              fontWeight: "900",
                              marginBottom: "12px",
                              textTransform: "uppercase",
                            }}
                          >
                            商品清单
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                            }}
                          >
                          {parsedItems.map((item: any, idx: number) => (
                              <div
                                key={idx}
                                style={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  color: "white",
                                  fontSize: "0.95rem",
                                }}
                              >
                              <span>• {item.label}</span>
                                <span style={{ fontWeight: "900" }}>
                                  x{item.qty}
                                </span>
                            </div>
                          ))}
                        </div>
                          <div
                            style={{
                              marginTop: "12px",
                              paddingTop: "12px",
                              borderTop: "1px dashed rgba(255,255,255,0.1)",
                              display: "flex",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: "0.9rem",
                              }}
                            >
                              支付方式:{" "}
                              {pkg.payment_method === "cash"
                                ? "现金支付"
                                : "余额支付"}
                            </span>
                            <span
                              style={{
                                color: "#10b981",
                                fontWeight: "900",
                                fontSize: "1.1rem",
                              }}
                            >
                              {pkg.price
                                ? `${pkg.price.replace("MMK", "").trim()} MMK`
                                : "-"}
                            </span>
                        </div>
                      </div>

                      {/* 客户备注 */}
                      {pkg.notes && (
                          <div
                            style={{
                              background: "rgba(251, 191, 36, 0.1)",
                              padding: "1rem",
                              borderRadius: "18px",
                              border: "1px solid rgba(251, 191, 36, 0.2)",
                            }}
                          >
                            <div
                              style={{
                                color: "#fbbf24",
                                fontSize: "0.8rem",
                                fontWeight: "900",
                                marginBottom: "4px",
                              }}
                            >
                              💡 客户备注
                            </div>
                            <div
                              style={{ color: "white", fontSize: "0.95rem" }}
                            >
                              {pkg.notes}
                            </div>
                        </div>
                      )}

                      {/* 操作按钮 */}
                        <div style={{ display: "flex", gap: "1rem" }}>
                        <button
                          onClick={() => handleCancelOrder(pkg)}
                          style={{
                            flex: 1,
                              padding: "1rem",
                              background: "rgba(239, 68, 68, 0.15)",
                              color: "#fca5a5",
                              border: "1px solid rgba(239, 68, 68, 0.3)",
                              borderRadius: "16px",
                              fontWeight: "800",
                              cursor: "pointer",
                              transition: "all 0.3s ease",
                          }}
                        >
                          ✕ 拒绝接单
                        </button>
                        <button
                          onClick={() => handleAcceptOrder(pkg)}
                          style={{
                            flex: 2,
                              padding: "1rem",
                              background:
                                "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "16px",
                              fontWeight: "900",
                              fontSize: "1.1rem",
                              cursor: "pointer",
                              boxShadow: "0 8px 20px rgba(245, 158, 11, 0.3)",
                              transition: "all 0.3s ease",
                          }}
                        >
                          🤝 立即接单 (自动打单)
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ padding: "4rem 2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>
                    ✨
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.5)",
                      fontSize: "1.2rem",
                      fontWeight: "700",
                    }}
                  >
                    {language === "zh"
                      ? "暂无待接单订单"
                      : language === "en"
                        ? "No pending orders"
                        : "လက်ခံရန်အော်ဒါမရှိပါ"}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "2rem",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                paddingTop: "1.5rem",
              }}
            >
              <button
                onClick={() => setShowPendingAcceptListModal(false)}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.1)")
                }
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：打包模态框 (PackingModal) */}
      {showPackingModal && packingOrderData && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
          zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
        }}
        onClick={() => !loading && setShowPackingModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "35px",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 打包窗口页眉 */}
            <div
              style={{
                background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                padding: "2.5rem 2rem",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>📦</div>
              <h2
                style={{
                  color: "white",
                  fontSize: "2rem",
                  fontWeight: "950",
                  margin: 0,
                }}
              >
                {language === "zh"
                  ? "订单打包中"
                  : language === "en"
                    ? "Order Packing"
                    : "အော်ဒါထုပ်ပိုးနေသည်"}
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "1rem",
                  marginTop: "0.5rem",
                  fontWeight: "600",
                }}
              >
                {t.packageId}: {packingOrderData.id}
              </p>
              {!loading && (
                <button 
                  onClick={() => setShowPackingModal(false)}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "rgba(0,0,0,0.2)",
                    border: "none",
                    width: "36px",
                    height: "36px",
                    borderRadius: "18px",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "1.2rem",
                    fontWeight: "bold",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
              {/* 商品清单 */}
              <div style={{ marginBottom: "2rem" }}>
                <h3
                  style={{
                    color: "#1e293b",
                    fontSize: "1.2rem",
                    fontWeight: "900",
                    marginBottom: "1.5rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                  }}
                >
                  📋{" "}
                  {language === "zh"
                    ? "核对商品清单"
                    : language === "en"
                      ? "Checklist"
                      : "ပစ္စည်းစာရင်းစစ်ဆေးရန်"}
                </h3>
                
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1rem",
                  }}
                >
                  {(() => {
                    // 解析商品信息
                    const productsMatch =
                      packingOrderData.description?.match(
                        /\[商品清单: (.*?)\]/,
                      );
                    const productItems = productsMatch
                      ? productsMatch[1].split(", ")
                      : [];
                    
                    if (productItems.length === 0) {
                      return (
                        <div
                          style={{
                            padding: "1.5rem",
                            textAlign: "center",
                            background: "#f8fafc",
                            borderRadius: "24px",
                            border: "2px dashed #e2e8f0",
                          }}
                        >
                          <p style={{ color: "#64748b", fontWeight: "600" }}>
                            {language === "zh"
                              ? "暂无详细商品清单，请核对包裹内容"
                              : "No detailed list, please check package content"}
                          </p>
                          <label
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: "12px",
                              marginTop: "1rem",
                              cursor: "pointer",
                            }}
                          >
                            <input 
                              type="checkbox" 
                              checked={checkedItems["default"]}
                              onChange={() => toggleItem("default")}
                              style={{
                                width: "24px",
                                height: "24px",
                                cursor: "pointer",
                              }}
                            />
                            <span
                              style={{
                                fontSize: "1.1rem",
                                fontWeight: "800",
                                color: "#1e293b",
                              }}
                            >
                              {language === "zh"
                                ? "确认商品已备齐"
                                : "Confirm all items ready"}
                            </span>
                          </label>
                        </div>
                      );
                    }

                    return productItems.map((item: string, index: number) => (
                      <div 
                        key={index}
                        onClick={() => toggleItem(`item-${index}`)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "15px",
                          padding: "1.2rem",
                          background: checkedItems[`item-${index}`]
                            ? "rgba(16, 185, 129, 0.05)"
                            : "#f8fafc",
                          borderRadius: "18px",
                          border: `2px solid ${checkedItems[`item-${index}`] ? "#10b981" : "#f1f5f9"}`,
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                        }}
                      >
                        <div
                          style={{
                            width: "28px",
                            height: "28px",
                            borderRadius: "8px",
                            border: `2px solid ${checkedItems[`item-${index}`] ? "#10b981" : "#cbd5e1"}`,
                            backgroundColor: checkedItems[`item-${index}`]
                              ? "#10b981"
                              : "transparent",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            color: "white",
                            fontSize: "1rem",
                          }}
                        >
                          {checkedItems[`item-${index}`] && "✓"}
                        </div>
                        <span
                          style={{
                            fontSize: "1.1rem",
                            fontWeight: "700",
                            color: checkedItems[`item-${index}`]
                              ? "#64748b"
                              : "#1e293b",
                            textDecoration: checkedItems[`item-${index}`]
                              ? "line-through"
                              : "none",
                            flex: 1,
                          }}
                        >
                          {item}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>

              {/* 订单备注 */}
              {packingOrderData.description &&
                !packingOrderData.description.includes("商品清单") && (
                  <div
                    style={{
                      background: "#fffbeb",
                      padding: "1.5rem",
                      borderRadius: "24px",
                      border: "1px solid #fde68a",
                      marginBottom: "2rem",
                    }}
                  >
                    <h4
                      style={{
                        color: "#92400e",
                        margin: "0 0 0.5rem 0",
                        fontSize: "0.95rem",
                        fontWeight: "900",
                      }}
                    >
                      💡 {language === "zh" ? "客户备注" : "Customer Note"}
                    </h4>
                    <p
                      style={{
                        color: "#b45309",
                        margin: 0,
                        fontSize: "1rem",
                        fontWeight: "600",
                      }}
                    >
                      {packingOrderData.description}
                    </p>
                </div>
              )}
            </div>

            {/* 底部操作栏 */}
            <div
              style={{
                padding: "1.5rem",
                background: "#f8fafc",
                borderTop: "1px solid #f1f5f9",
              }}
            >
              <button
                onClick={handleCompletePacking}
                disabled={
                  loading ||
                  (() => {
                    const productsMatch =
                      packingOrderData.description?.match(
                        /\[商品清单: (.*?)\]/,
                      );
                    const productItems = productsMatch
                      ? productsMatch[1].split(", ")
                      : [];
                    if (productItems.length === 0)
                      return !checkedItems["default"];
                    return productItems.some(
                      (_: any, index: number) => !checkedItems[`item-${index}`],
                    );
                  })()
                }
                style={{
                  width: "100%",
                  padding: "1.2rem",
                  borderRadius: "24px",
                  background:
                    "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                  color: "white",
                  border: "none",
                  fontSize: "1.2rem",
                  fontWeight: "950",
                  cursor: loading ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 25px rgba(16, 185, 129, 0.3)",
                  transition: "all 0.3s ease",
                  opacity: (() => {
                    const productsMatch =
                      packingOrderData.description?.match(
                        /\[商品清单: (.*?)\]/,
                      );
                    const productItems = productsMatch
                      ? productsMatch[1].split(", ")
                      : [];
                    const allChecked =
                      productItems.length === 0
                        ? checkedItems["default"]
                        : !productItems.some(
                            (_: any, index: number) =>
                              !checkedItems[`item-${index}`],
                          );
                    return allChecked && !loading ? 1 : 0.6;
                  })(),
                }}
              >
                {loading ? (
                  <div
                    className="spinner"
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "3px solid rgba(255,255,255,0.3)",
                      borderTop: "3px solid white",
                      borderRadius: "50%",
                      margin: "0 auto",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                ) : language === "zh" ? (
                  "确认打包完成"
                ) : (
                  "Confirm Packing Done"
                )}
              </button>
              <p
                style={{
                  textAlign: "center",
                  color: "#94a3b8",
                  fontSize: "0.85rem",
                  marginTop: "1rem",
                  fontWeight: "600",
                }}
              >
                {language === "zh"
                  ? "请确保所有商品已备齐并打包好"
                  : "Please ensure all items are packed securely"}
              </p>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 新增：店铺评价管理模态框 (ReviewsModal) */}
      {showReviewsModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(15, 23, 42, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          zIndex: 30000,
            backdropFilter: "blur(10px)",
        }}
        onClick={() => setShowReviewsModal(false)}
        >
          <div
            style={{
              background: "rgba(30, 41, 59, 0.95)",
              padding: "2.5rem",
              borderRadius: "32px",
              maxWidth: "800px",
              width: "95%",
              maxHeight: "85vh",
              overflow: "hidden",
              boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              display: "flex",
              flexDirection: "column",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 页眉 */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
                paddingBottom: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}
              >
                <div
                  style={{
                    width: "56px",
                    height: "56px",
                    background:
                      "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                    borderRadius: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.8rem",
                    boxShadow: "0 10px 20px rgba(245, 158, 11, 0.3)",
                  }}
                >
                  ⭐
                </div>
                <div>
                  <h2
                    style={{
                      color: "white",
                      margin: 0,
                      fontSize: "1.75rem",
                      fontWeight: "800",
                    }}
                  >
                    {language === "zh"
                      ? "店铺评价管理"
                      : language === "en"
                        ? "Review Management"
                        : "ဆိုင်မှတ်ချက်များ စီမံခန့်ခွဲမှု"}
                  </h2>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      marginTop: "4px",
                    }}
                  >
                    <span
                      style={{
                        color: "#fbbf24",
                        fontSize: "1.1rem",
                        fontWeight: "900",
                      }}
                    >
                      {reviewStats.average} / 5.0
                    </span>
                    <span
                      style={{
                        color: "rgba(255,255,255,0.4)",
                        fontSize: "0.9rem",
                      }}
                    >
                      • {reviewStats.count}{" "}
                      {language === "zh" ? "条评价" : "Reviews"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowReviewsModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  width: "40px",
                  height: "40px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ overflowY: "auto", flex: 1, paddingRight: "0.5rem" }}>
              {loadingReviews ? (
                <div style={{ textAlign: "center", padding: "5rem" }}>
                  <div
                    className="spinner"
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "4px solid rgba(255,255,255,0.1)",
                      borderTop: "4px solid #fbbf24",
                      borderRadius: "50%",
                      margin: "0 auto",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                </div>
              ) : storeReviews.length > 0 ? (
                storeReviews.map((review) => (
                  <div
                    key={review.id}
                    style={{
                      padding: "1.5rem",
                      marginBottom: "1.5rem",
                      background: "rgba(255, 255, 255, 0.03)",
                      borderRadius: "24px",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      transition: "all 0.3s ease",
                    }}
                  >
                    {/* 用户信息和评分 */}
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        marginBottom: "1rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                        }}
                      >
                        <div
                          style={{
                            width: "40px",
                            height: "40px",
                            borderRadius: "50%",
                            background:
                              "linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: "bold",
                            color: "#475569",
                          }}
                        >
                          {review.is_anonymous
                            ? "匿"
                            : review.user_name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div>
                          <div
                            style={{
                              color: "white",
                              fontWeight: "700",
                              fontSize: "1rem",
                            }}
                          >
                            {review.is_anonymous
                              ? language === "zh"
                                ? "匿名用户"
                                : "Anonymous"
                              : review.user_name}
                          </div>
                          <div
                            style={{ color: "#fbbf24", fontSize: "0.85rem" }}
                          >
                            {"⭐".repeat(review.rating)}
                          </div>
                        </div>
                      </div>
                      <div
                        style={{
                          color: "rgba(255,255,255,0.3)",
                          fontSize: "0.8rem",
                        }}
                      >
                        {review.created_at
                          ? new Date(review.created_at).toLocaleDateString()
                          : ""}
                      </div>
                    </div>

                    {/* 评论内容 */}
                    <div
                      style={{
                        color: "rgba(255,255,255,0.85)",
                        fontSize: "1rem",
                        lineHeight: "1.6",
                        marginBottom: "1.25rem",
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {review.comment}
                    </div>

                    {/* 图片预览 */}
                    {review.images &&
                      Array.isArray(review.images) &&
                      review.images.length > 0 && (
                        <div
                          style={{
                            display: "flex",
                            gap: "10px",
                            flexWrap: "wrap",
                            marginBottom: "1.25rem",
                          }}
                        >
                        {review.images.map((img, idx) => (
                          <img 
                            key={`${review.id}-img-${idx}`} 
                            src={img} 
                            alt={`Review ${idx + 1}`} 
                              style={{
                                width: "80px",
                                height: "80px",
                                borderRadius: "12px",
                                objectFit: "cover",
                                cursor: "zoom-in",
                                border: "1px solid rgba(255,255,255,0.1)",
                              }}
                              onClick={() => window.open(img, "_blank")}
                            onError={(e) => {
                                console.error("图片加载失败:", img);
                                e.currentTarget.style.display = "none"; // 隐藏加载失败的图片
                            }}
                          />
                        ))}
                      </div>
                    )}

                    {/* 商家回复部分 */}
                    {review.reply_text ? (
                      <div
                        style={{
                          background: "rgba(255,255,255,0.05)",
                          padding: "1.25rem",
                          borderRadius: "18px",
                          borderLeft: "4px solid #fbbf24",
                        }}
                      >
                        <div
                          style={{
                            color: "#fbbf24",
                            fontSize: "0.85rem",
                            fontWeight: "800",
                            marginBottom: "6px",
                            display: "flex",
                            justifyContent: "space-between",
                          }}
                        >
                          <span>
                            {language === "zh" ? "商家回复" : "Merchant Reply"}
                          </span>
                          <span
                            style={{
                              color: "rgba(255,255,255,0.3)",
                              fontWeight: "normal",
                            }}
                          >
                            {review.replied_at
                              ? new Date(review.replied_at).toLocaleDateString()
                              : ""}
                          </span>
                        </div>
                        <div
                          style={{
                            color: "rgba(255,255,255,0.7)",
                            fontSize: "0.95rem",
                            lineHeight: "1.5",
                          }}
                        >
                          {review.reply_text}
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: "1rem" }}>
                        {replyingToId === review.id ? (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "10px",
                            }}
                          >
                            <textarea
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                              placeholder={
                                language === "zh"
                                  ? "输入您的回复内容..."
                                  : "Type your reply..."
                              }
                              style={{
                                width: "100%",
                                minHeight: "80px",
                                background: "rgba(255,255,255,0.05)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "14px",
                                padding: "12px",
                                color: "white",
                                fontSize: "0.9rem",
                                outline: "none",
                              }}
                            />
                            <div style={{ display: "flex", gap: "10px" }}>
                              <button
                                onClick={() => setReplyingToId(null)}
                                style={{
                                  flex: 1,
                                  padding: "10px",
                                  background: "rgba(255,255,255,0.1)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "10px",
                                  cursor: "pointer",
                                  fontWeight: "700",
                                }}
                              >
                                {t.close}
                              </button>
                              <button
                                onClick={() => handleReplyReview(review.id)}
                                style={{
                                  flex: 2,
                                  padding: "10px",
                                  background:
                                    "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                                  color: "white",
                                  border: "none",
                                  borderRadius: "10px",
                                  cursor: "pointer",
                                  fontWeight: "800",
                                  boxShadow:
                                    "0 4px 12px rgba(245, 158, 11, 0.2)",
                                }}
                              >
                                {language === "zh"
                                  ? "提交回复"
                                  : "Submit Reply"}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setReplyingToId(review.id);
                              setReplyText("");
                            }}
                            style={{
                              padding: "8px 20px",
                              background: "rgba(251, 191, 36, 0.1)",
                              color: "#fbbf24",
                              border: "1px solid rgba(251, 191, 36, 0.3)",
                              borderRadius: "10px",
                              cursor: "pointer",
                              fontWeight: "700",
                              fontSize: "0.85rem",
                            }}
                          >
                            💬 {language === "zh" ? "回复评价" : "Reply"}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div style={{ padding: "5rem 2rem", textAlign: "center" }}>
                  <div style={{ fontSize: "4rem", marginBottom: "1.5rem" }}>
                    ✨
                  </div>
                  <div
                    style={{
                      color: "rgba(255, 255, 255, 0.4)",
                      fontSize: "1.2rem",
                      fontWeight: "700",
                    }}
                  >
                    {language === "zh" ? "店铺暂无评价" : "No reviews yet"}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: "2rem",
                borderTop: "1px solid rgba(255, 255, 255, 0.1)",
                paddingTop: "1.5rem",
              }}
            >
              <button
                onClick={() => setShowReviewsModal(false)}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "rgba(255, 255, 255, 0.1)",
                  color: "white",
                  border: "none",
                  borderRadius: "16px",
                  fontSize: "1rem",
                  fontWeight: "700",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.15)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background =
                    "rgba(255, 255, 255, 0.1)")
                }
              >
                {t.close}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：客户提交评价模态框 (ReviewSubmitModal) */}
      {showReviewSubmitModal && reviewOrder && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
          zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
        }}
        onClick={() => !isSubmittingReview && setShowReviewSubmitModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "35px",
              width: "100%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 页眉 */}
            <div
              style={{
                background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                padding: "1.5rem",
                textAlign: "center",
                position: "relative",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>⭐</div>
              <h2
                style={{
                  color: "white",
                  fontSize: "1.75rem",
                  fontWeight: "950",
                  margin: 0,
                }}
              >
                {language === "zh" ? "评价您的订单" : "Rate Your Order"}
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "0.9rem",
                  marginTop: "0.5rem",
                }}
              >
                {t.packageId}: {reviewOrder.id}
              </p>
              {!isSubmittingReview && (
                <button 
                  onClick={() => setShowReviewSubmitModal(false)}
                  style={{
                    position: "absolute",
                    top: "20px",
                    right: "20px",
                    background: "rgba(0,0,0,0.1)",
                    border: "none",
                    width: "32px",
                    height: "32px",
                    borderRadius: "50%",
                    color: "white",
                    cursor: "pointer",
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "2rem" }}>
              {/* 星级评分 */}
              <div style={{ textAlign: "center", marginBottom: "2rem" }}>
                <div
                  style={{
                    color: "#475569",
                    fontSize: "1rem",
                    fontWeight: "700",
                    marginBottom: "1rem",
                  }}
                >
                  {language === "zh" ? "总体满意度" : "Overall Satisfaction"}
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: "10px",
                  }}
                >
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span 
                      key={star}
                      onClick={() => setReviewRating(star)}
                      style={{ 
                        fontSize: "1.75rem",
                        cursor: "pointer",
                        color: star <= reviewRating ? "#fbbf24" : "#e2e8f0",
                        transition: "transform 0.2s ease",
                        transform:
                          star <= reviewRating ? "scale(1.1)" : "scale(1)",
                      }}
                    >
                      ★
                    </span>
                  ))}
                </div>
                <div
                  style={{
                    color: "#fbbf24",
                    fontSize: "0.9rem",
                    fontWeight: "800",
                    marginTop: "0.5rem",
                  }}
                >
                  {reviewRating === 5
                    ? language === "zh"
                      ? "非常满意"
                      : "Excellent"
                    : reviewRating === 4
                      ? language === "zh"
                        ? "满意"
                        : "Good"
                      : reviewRating === 3
                        ? language === "zh"
                          ? "一般"
                          : "Average"
                        : reviewRating === 2
                          ? language === "zh"
                            ? "不满意"
                            : "Poor"
                          : language === "zh"
                            ? "非常不满意"
                            : "Very Poor"}
                </div>
              </div>

              {/* 评价文字 */}
              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    color: "#1e293b",
                    fontSize: "1rem",
                    fontWeight: "800",
                    display: "block",
                    marginBottom: "0.75rem",
                  }}
                >
                  {language === "zh" ? "您的评价" : "Your Review"}
                </label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder={
                    language === "zh"
                      ? "写下您的真实评价，帮助我们做得更好..."
                      : "Share your experience..."
                  }
                  style={{ 
                    width: "100%",
                    minHeight: "120px",
                    background: "#f8fafc",
                    border: "2px solid #f1f5f9",
                    borderRadius: "24px",
                    padding: "1rem",
                    color: "#1e293b",
                    fontSize: "1rem",
                    outline: "none",
                    resize: "none",
                  }}
                />
              </div>

              {/* 图片上传 */}
              <div style={{ marginBottom: "1rem" }}>
                <label
                  style={{
                    color: "#1e293b",
                    fontSize: "1rem",
                    fontWeight: "800",
                    display: "block",
                    marginBottom: "0.75rem",
                  }}
                >
                  {language === "zh"
                    ? "上传照片 (选填)"
                    : "Upload Photos (Optional)"}
                </label>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  {reviewImages.map((img, index) => (
                    <div
                      key={index}
                      style={{
                        position: "relative",
                        width: "80px",
                        height: "80px",
                      }}
                    >
                      <img
                        src={img}
                        alt="Preview"
                        style={{
                          width: "100%",
                          height: "100%",
                          borderRadius: "12px",
                          objectFit: "cover",
                        }}
                      />
                      <button 
                        onClick={() => handleRemoveReviewImage(index)}
                        style={{
                          position: "absolute",
                          top: "-5px",
                          right: "-5px",
                          background: "#ef4444",
                          color: "white",
                          border: "none",
                          width: "20px",
                          height: "20px",
                          borderRadius: "50%",
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  {reviewImages.length < 6 && (
                    <div 
                      onClick={() =>
                        !isUploadingReviewImage &&
                        reviewImageInputRef.current?.click()
                      }
                      style={{ 
                        width: "80px",
                        height: "80px",
                        border: "2px dashed #cbd5e1",
                        borderRadius: "12px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        background: "#f8fafc",
                      }}
                    >
                      {isUploadingReviewImage ? (
                        <div
                          className="spinner"
                          style={{
                            width: "20px",
                            height: "20px",
                            border: "2px solid #cbd5e1",
                            borderTop: "2px solid #fbbf24",
                            borderRadius: "50%",
                          }}
                        ></div>
                      ) : (
                        <>
                          <span
                            style={{ fontSize: "1.5rem", color: "#94a3b8" }}
                          >
                            +
                          </span>
                          <span
                            style={{ fontSize: "0.7rem", color: "#94a3b8" }}
                          >
                            照片
                          </span>
                        </>
                      )}
                    </div>
                  )}
                </div>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  ref={reviewImageInputRef} 
                  onChange={handleReviewImageUpload} 
                  style={{ display: "none" }}
                />
              </div>
            </div>

            {/* 底部按钮 */}
            <div style={{ padding: "1.5rem", borderTop: "1px solid #f1f5f9" }}>
              <button
                onClick={handleSubmitReview}
                disabled={isSubmittingReview || !reviewComment.trim()}
                style={{
                  width: "100%",
                  padding: "1.2rem",
                  borderRadius: "24px",
                  background:
                    isSubmittingReview || !reviewComment.trim()
                      ? "#cbd5e1"
                      : "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
                  color: "white",
                  border: "none",
                  fontSize: "1.2rem",
                  fontWeight: "950",
                  cursor:
                    isSubmittingReview || !reviewComment.trim()
                      ? "not-allowed"
                      : "pointer",
                  boxShadow:
                    isSubmittingReview || !reviewComment.trim()
                      ? "none"
                      : "0 10px 25px rgba(245, 158, 11, 0.3)",
                  transition: "all 0.3s ease",
                }}
              >
                {isSubmittingReview ? (
                  <div
                    className="spinner"
                    style={{
                      width: "24px",
                      height: "24px",
                      border: "3px solid rgba(255,255,255,0.3)",
                      borderTop: "3px solid white",
                      borderRadius: "50%",
                      margin: "0 auto",
                      animation: "spin 1s linear infinite",
                    }}
                  ></div>
                ) : language === "zh" ? (
                  "提交评价"
                ) : (
                  "Submit Review"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：休假计划管理模态框 */}
      {showVacationModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              borderRadius: "32px",
              width: "100%",
              maxWidth: "500px",
              padding: "30px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "25px",
              }}
            >
              <h3
                style={{
                  color: "white",
                  fontSize: "1.5rem",
                  fontWeight: "900",
                  margin: 0,
                }}
              >
                📅 {language === "zh" ? "预设休假计划" : "Vacation Planning"}
              </h3>
              <button
                onClick={() => setShowVacationModal(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <p
                style={{
                  color: "rgba(255,255,255,0.6)",
                  fontSize: "0.9rem",
                  marginBottom: "15px",
                }}
              >
                添加休假日期，系统将在这些日期自动设为歇业状态。
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <input 
                  type="date" 
                  value={tempVacationDate}
                  onChange={(e) => setTempVacationDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "12px",
                    borderRadius: "12px",
                    border: "1px solid rgba(255,255,255,0.2)",
                    background: "rgba(0,0,0,0.2)",
                    color: "white",
                    outline: "none",
                  }}
                />
                <button 
                  onClick={handleAddVacationDate}
                  style={{
                    background: "#3b82f6",
                    color: "white",
                    border: "none",
                    padding: "0 20px",
                    borderRadius: "12px",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  添加
                </button>
              </div>
            </div>

            <div
              style={{
                maxHeight: "200px",
                overflowY: "auto",
                marginBottom: "25px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              {businessStatus.vacation_dates.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "rgba(255,255,255,0.2)",
                    border: "1px dashed rgba(255,255,255,0.1)",
                    borderRadius: "15px",
                  }}
                >
                  暂无休假计划
                </div>
              ) : (
                businessStatus.vacation_dates.map((date) => (
                  <div
                    key={date}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "rgba(255,255,255,0.05)",
                      padding: "10px 15px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.05)",
                    }}
                  >
                    <span
                      style={{
                        color: "white",
                        fontWeight: "bold",
                        fontFamily: "monospace",
                      }}
                    >
                      {date}
                    </span>
                    <button
                      onClick={() => handleRemoveVacationDate(date)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#ef4444",
                        fontWeight: "bold",
                        cursor: "pointer",
                      }}
                    >
                      移除
                    </button>
                  </div>
                ))
              )}
            </div>

            <button
              onClick={() => {
                handleUpdateStoreStatus({
                  vacation_dates: businessStatus.vacation_dates,
                });
                setShowVacationModal(false);
              }}
              style={{
                width: "100%",
                padding: "15px",
                borderRadius: "15px",
                background: "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                color: "white",
                border: "none",
                fontWeight: "900",
                fontSize: "1.1rem",
                cursor: "pointer",
                boxShadow: "0 10px 20px rgba(30, 64, 175, 0.3)",
              }}
            >
              保存计划 💾
            </button>
          </div>
        </div>
      )}

      {/* 🚀 新增：编辑个人资料模态框 */}
      {showEditProfileModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 30000,
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              borderRadius: "32px",
              width: "100%",
              maxWidth: "500px",
              padding: "2.5rem",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    background: "rgba(59, 130, 246, 0.2)",
                    borderRadius: "14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.5rem",
                  }}
                >
                  📝
                </div>
                <h3
                  style={{
                    color: "white",
                    fontSize: "1.6rem",
                    fontWeight: "900",
                    margin: 0,
                  }}
                >
                  {language === "zh" ? "编辑个人资料" : "Edit Profile"}
                </h3>
              </div>
              <button 
                onClick={() => setShowEditProfileModal(false)} 
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "none",
                  color: "white",
                  width: "36px",
                  height: "36px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  transition: "all 0.2s",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.2)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
              >
                ✕
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {language === "zh" ? "姓名 / 店名" : "Full Name / Store Name"}
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "12px",
                      fontSize: "1.1rem",
                      opacity: 0.6,
                    }}
                  >
                    👤
                  </span>
                  <input 
                    type="text" 
                    value={editProfileForm.name}
                    onChange={(e) =>
                      setEditProfileForm({
                        ...editProfileForm,
                        name: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 42px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "white",
                      outline: "none",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                    }}
                    placeholder={
                      language === "zh" ? "请输入姓名或店名" : "Enter name"
                    }
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {language === "zh" ? "联系电话" : "Contact Phone"}
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "12px",
                      fontSize: "1.1rem",
                      opacity: 0.6,
                    }}
                  >
                    📞
                  </span>
                  <input 
                    type="text" 
                    value={editProfileForm.phone}
                    onChange={(e) =>
                      setEditProfileForm({
                        ...editProfileForm,
                        phone: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 42px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "white",
                      outline: "none",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                    }}
                    placeholder={
                      language === "zh" ? "请输入联系电话" : "Enter phone"
                    }
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {language === "zh" ? "电子邮箱" : "Email Address"}
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "12px",
                      fontSize: "1.1rem",
                      opacity: 0.6,
                    }}
                  >
                    📧
                  </span>
                  <input 
                    type="email" 
                    value={editProfileForm.email}
                    onChange={(e) =>
                      setEditProfileForm({
                        ...editProfileForm,
                        email: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 42px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "white",
                      outline: "none",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                    }}
                    placeholder={
                      language === "zh" ? "请输入邮箱地址" : "Enter email"
                    }
                  />
                </div>
              </div>
              <div>
                <label
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "0.6rem",
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                  }}
                >
                  {language === "zh" ? "详细地址" : "Full Address"}
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: "14px",
                      top: "12px",
                      fontSize: "1.1rem",
                      opacity: 0.6,
                    }}
                  >
                    📍
                  </span>
                  <textarea 
                    value={editProfileForm.address}
                    onChange={(e) =>
                      setEditProfileForm({
                        ...editProfileForm,
                        address: e.target.value,
                      })
                    }
                    style={{
                      width: "100%",
                      padding: "12px 16px 12px 42px",
                      borderRadius: "14px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "white",
                      outline: "none",
                      minHeight: "100px",
                      resize: "none",
                      fontSize: "1rem",
                      transition: "all 0.3s",
                      fontFamily: "inherit",
                      lineHeight: "1.5",
                    }}
                    placeholder={
                      language === "zh" ? "请输入详细联系地址" : "Enter address"
                    }
                  />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "2.5rem" }}>
              <button
                onClick={() => setShowEditProfileModal(false)}
                style={{
                  flex: 1,
                  padding: "14px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.7)",
                  fontWeight: "800",
                  cursor: "pointer",
                  transition: "all 0.3s ease",
                }}
                onMouseOver={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.1)")
                }
                onMouseOut={(e) =>
                  (e.currentTarget.style.background = "rgba(255,255,255,0.05)")
                }
              >
                {language === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={isSavingProfile}
                style={{
                  flex: 2,
                  padding: "14px",
                  borderRadius: "16px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1e40af 100%)",
                  border: "none",
                  color: "white",
                  fontWeight: "900",
                  fontSize: "1.1rem",
                  cursor: isSavingProfile ? "not-allowed" : "pointer",
                  boxShadow: "0 8px 20px rgba(30, 64, 175, 0.3)",
                  opacity: isSavingProfile ? 0.7 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                }}
              >
                {isSavingProfile ? (
                  <>
                    <div
                      className="spinner"
                      style={{
                        width: "20px",
                        height: "20px",
                        border: "3px solid rgba(255,255,255,0.3)",
                        borderTop: "3px solid white",
                        borderRadius: "50%",
                      }}
                    ></div>
                    <span>
                      {language === "zh" ? "正在保存..." : "Saving..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    <span>
                      {language === "zh" ? "保存资料" : "Save Profile"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：导出对账单模态框 (ExportStatementModal) */}
      {showExportModal && (
        <div
          style={{
            position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
            background: "rgba(0, 0, 0, 0.85)",
            backdropFilter: "blur(10px)",
          zIndex: 30000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1rem",
        }}
        onClick={() => !isExporting && setShowExportModal(false)}
        >
          <div
            style={{
              background: "#1e293b",
              borderRadius: "35px",
              width: "100%",
              maxWidth: "500px",
              overflow: "hidden",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              border: "1px solid rgba(255,255,255,0.1)",
              position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
          >
            {/* 页眉 */}
            <div
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                padding: "1.5rem",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>📊</div>
              <h2
                style={{
                  color: "white",
                  fontSize: "1.75rem",
                  fontWeight: "950",
                  margin: 0,
                }}
              >
                {language === "zh" ? "导出结算对账单" : "Export Statement"}
              </h2>
              <p
                style={{
                  color: "rgba(255,255,255,0.8)",
                  fontSize: "0.9rem",
                  marginTop: "0.5rem",
                }}
              >
                {language === "zh"
                  ? "选择日期范围和导出方式"
                  : "Select date range and method"}
              </p>
            </div>

            <div style={{ padding: "2rem" }}>
              {/* 日期选择 */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "1rem",
                  marginBottom: "2rem",
                }}
              >
                <div>
                  <label
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {language === "zh" ? "开始日期" : "Start Date"}
                  </label>
                  <input 
                    type="date" 
                    value={exportStartDate}
                    onChange={(e) => setExportStartDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>
                <div>
                  <label
                    style={{
                      color: "rgba(255,255,255,0.5)",
                      fontSize: "0.8rem",
                      fontWeight: "700",
                      display: "block",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {language === "zh" ? "结束日期" : "End Date"}
                  </label>
                  <input 
                    type="date" 
                    value={exportEndDate}
                    onChange={(e) => setExportEndDate(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px",
                      borderRadius: "12px",
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(0,0,0,0.2)",
                      color: "white",
                      outline: "none",
                    }}
                  />
                </div>
              </div>

              {/* 格式选择 */}
              <div style={{ marginBottom: "2rem" }}>
                <label
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "1rem",
                  }}
                >
                  {language === "zh" ? "文件格式" : "File Format"}
                </label>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button 
                    onClick={() => setExportFormat("pdf")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background:
                        exportFormat === "pdf"
                          ? "#6366f1"
                          : "rgba(255,255,255,0.05)",
                      color: "white",
                      border: "none",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    PDF
                  </button>
                  <button 
                    onClick={() => setExportFormat("excel")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background:
                        exportFormat === "excel"
                          ? "#6366f1"
                          : "rgba(255,255,255,0.05)",
                      color: "white",
                      border: "none",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    Excel (XLSX)
                  </button>
                </div>
              </div>

              {/* 导出方式 */}
              <div style={{ marginBottom: "2.5rem" }}>
                <label
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "0.8rem",
                    fontWeight: "700",
                    display: "block",
                    marginBottom: "1rem",
                  }}
                >
                  {language === "zh" ? "导出方式" : "Export Method"}
                </label>
                <div style={{ display: "flex", gap: "1rem" }}>
                  <button 
                    onClick={() => setExportMethod("download")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background:
                        exportMethod === "download"
                          ? "#10b981"
                          : "rgba(255,255,255,0.05)",
                      color: "white",
                      border: "none",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    ⬇️ {language === "zh" ? "直接下载" : "Download"}
                  </button>
                  <button 
                    onClick={() => setExportMethod("email")}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "12px",
                      background:
                        exportMethod === "email"
                          ? "#10b981"
                          : "rgba(255,255,255,0.05)",
                      color: "white",
                      border: "none",
                      fontWeight: "700",
                      cursor: "pointer",
                      transition: "all 0.3s",
                    }}
                  >
                    📧 {language === "zh" ? "发送至邮箱" : "Send to Email"}
                  </button>
                </div>
                {exportMethod === "email" && (
                  <p
                    style={{
                      color: "rgba(255,255,255,0.4)",
                      fontSize: "0.8rem",
                      marginTop: "0.8rem",
                      textAlign: "center",
                    }}
                  >
                    {language === "zh"
                      ? `将发送至: ${storeInfo?.email || currentUser?.email}`
                      : `Will send to: ${storeInfo?.email || currentUser?.email}`}
                  </p>
                )}
              </div>

              {/* 提交按钮 */}
              <button
                onClick={handleExportStatement}
                disabled={isExporting}
                style={{
                  width: "100%",
                  padding: "1.25rem",
                  borderRadius: "18px",
                  background:
                    "linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)",
                  color: "white",
                  border: "none",
                  fontSize: "1.1rem",
                  fontWeight: "900",
                  cursor: isExporting ? "not-allowed" : "pointer",
                  boxShadow: "0 10px 25px rgba(79, 70, 229, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px",
                }}
              >
                {isExporting ? (
                  <>
                    <div
                      className="spinner"
                      style={{
                        width: "24px",
                        height: "24px",
                        border: "3px solid rgba(255,255,255,0.3)",
                        borderTop: "3px solid white",
                        borderRadius: "50%",
                        animation: "spin 1s linear infinite",
                      }}
                    ></div>
                    <span>
                      {language === "zh" ? "正在生成..." : "Generating..."}
                    </span>
                  </>
                ) : (
                  <>
                    <span>🚀</span>
                    <span>
                      {language === "zh"
                        ? "立即执行导出"
                        : "Generate & Export Now"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 🚀 新增：立即下单模态框 */}
      <OrderModal
        showOrderForm={showOrderForm}
        setShowOrderForm={setShowOrderForm}
        language={language}
        t={allT}
        currentUser={currentUser}
        senderName={senderName}
        setSenderName={setSenderName}
        senderPhone={senderPhone}
        setSenderPhone={setSenderPhone}
        senderAddressText={senderAddressText}
        setSenderAddressText={setSenderAddressText}
        receiverName={receiverName}
        setReceiverName={setReceiverName}
        receiverPhone={receiverPhone}
        setReceiverPhone={setReceiverPhone}
        receiverAddressText={receiverAddressText}
        setReceiverAddressText={setReceiverAddressText}
        codAmount={codAmount}
        setCodAmount={setCodAmount}
        selectedDeliverySpeed={selectedDeliverySpeed}
        setSelectedDeliverySpeed={setSelectedDeliverySpeed}
        setShowTimePickerModal={setShowTimePickerModal}
        scheduledDeliveryTime={scheduledDeliveryTime}
        showWeightInput={showWeightInput}
        setShowWeightInput={setShowWeightInput}
        isCalculated={isCalculated}
        calculatedPriceDetail={calculatedPriceDetail}
        calculatedDistanceDetail={calculatedDistanceDetail}
        pricingSettings={pricingSettings}
        handleOpenMapModal={handleOpenMapModal}
        calculatePriceEstimate={calculatePriceEstimate}
        handleOrderSubmit={handleOrderSubmit}
        setSelectedSenderLocation={setSelectedSenderLocation}
        setSelectedReceiverLocation={setSelectedReceiverLocation}
        merchantProducts={products}
        selectedProducts={selectedProducts}
        handleProductQuantityChange={handleProductQuantityChange}
        cartTotal={cartTotal}
        hasCOD={hasCOD}
        setHasCOD={setHasCOD}
        description={description}
        setDescription={setDescription}
        paymentMethod={paymentMethod}
        setPaymentMethod={setPaymentMethod}
        merchantStore={storeInfo}
      />

      {/* 🚀 新增：地图选择模态框 */}
      {showMapModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 3000,
            backdropFilter: "blur(10px)",
            padding:
              "max(12px, env(safe-area-inset-top)) max(12px, env(safe-area-inset-right)) max(12px, env(safe-area-inset-bottom)) max(12px, env(safe-area-inset-left))",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <div
            style={{
              background: "white",
              padding: "1.25rem 1.5rem 1rem",
              borderRadius: "20px",
              width: "min(92vw, 800px)",
              maxHeight: "min(92vh, 880px)",
              height: "min(92vh, 880px)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "0.75rem",
                flexShrink: 0,
                marginBottom: "0.75rem",
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontSize: "clamp(1rem, 2.8vw, 1.25rem)",
                  lineHeight: 1.35,
                }}
              >
                {language === "zh"
                  ? `选择${mapSelectionType === "sender" ? "寄件" : "收件"}位置`
                  : `Select ${mapSelectionType === "sender" ? "Sender" : "Receiver"} Location`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowMapModal(false);
                  setMapClickPosition(null);
                  setMapModalPreviewAddress("");
                  setMerchantMapSuggestions([]);
                  setShowMerchantMapSuggestions(false);
                }}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: "1.5rem",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
    </div>
            <div
              style={{
                flex: 1,
                minHeight: 0,
                overflowY: "auto",
                overflowX: "hidden",
                WebkitOverflowScrolling: "touch",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                paddingBottom: "0.5rem",
              }}
            >
              {!googleMapsApiKey || mapLoadError ? (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    minHeight: "240px",
                    background: "linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%)",
                    color: "#334155",
                    padding: "1.25rem",
                    textAlign: "center",
                    fontSize: "0.9rem",
                    lineHeight: 1.5,
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🗺️</div>
                  <strong style={{ marginBottom: "0.5rem" }}>
                    {language === "zh" ? "地图无法加载" : "Map failed to load"}
                  </strong>
                  <span>
                    {language === "zh"
                      ? "请在 Google Cloud 控制台为当前项目启用「Maps JavaScript API」、绑定结算账号，并将 API 密钥的 HTTP 来源限制为："
                      : "Enable Maps JavaScript API and billing in Google Cloud, and add these referrers to your API key:"}
                  </span>
                  <code
                    style={{
                      display: "block",
                      marginTop: "0.75rem",
                      fontSize: "0.75rem",
                      wordBreak: "break-all",
                      background: "rgba(255,255,255,0.8)",
                      padding: "0.5rem",
                      borderRadius: "8px",
                    }}
                  >
                    https://mlexpress-merchants.com/*
                    <br />
                    https://*.netlify.app/*
                  </code>
                  {mapLoadError && (
                    <span style={{ marginTop: "0.75rem", opacity: 0.85, fontSize: "0.8rem" }}>
                      (ApiProjectMapError 通常表示未启用 Maps JavaScript API 或密钥未授权本域名)
                    </span>
                  )}
                </div>
              ) : isMapLoaded ? (
                <>
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      height: "clamp(220px, 38vh, 360px)",
                      flexShrink: 0,
                      borderRadius: "15px",
                      overflow: "hidden",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <GoogleMap
                      mapContainerStyle={{ width: "100%", height: "100%" }}
                      center={
                        mapClickPosition || { lat: 21.95, lng: 96.08 }
                      }
                      zoom={mapClickPosition ? 15 : 13}
                      onClick={onMapClick}
                      onLoad={(map) => {
                        merchantMapRef.current = map;
                        if (window.google?.maps?.places) {
                          merchantAutocompleteServiceRef.current =
                            new window.google.maps.places.AutocompleteService();
                          merchantPlacesServiceRef.current =
                            new window.google.maps.places.PlacesService(map);
                        }
                      }}
                    >
                      {mapClickPosition && window.google?.maps && (
                        <Marker
                          position={mapClickPosition}
                          icon={{
                            url:
                              "data:image/svg+xml;charset=UTF-8," +
                              encodeURIComponent(
                                `<svg width="40" height="40" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="20" cy="20" r="12" fill="#ef4444" stroke="white" stroke-width="3"/><circle cx="20" cy="20" r="5" fill="white"/><circle cx="20" cy="20" r="2" fill="#ef4444"/></svg>`,
                              ),
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 20),
                          }}
                          animation={window.google.maps.Animation?.DROP}
                          zIndex={1000}
                        />
                      )}
                    </GoogleMap>
                    <button
                      type="button"
                      onClick={handleMapModalLocateCurrent}
                      title={allT.order.getMyLocation}
                      style={{
                        position: "absolute",
                        top: "70px",
                        right: "10px",
                        background:
                          "linear-gradient(135deg, #38a169 0%, #48bb78 100%)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: "50px",
                        height: "50px",
                        cursor: "pointer",
                        fontSize: "20px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 15px rgba(56, 161, 105, 0.3)",
                        zIndex: 10,
                      }}
                    >
                      📍
                    </button>
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: "0.85rem",
                        color: "#64748b",
                        marginBottom: "0.35rem",
                      }}
                    >
                      {allT.order.mapTip}
                    </div>
                    <div
                      style={{
                        fontSize: "0.8rem",
                        color: "#94a3b8",
                        marginBottom: "0.5rem",
                      }}
                    >
                      {language === "zh"
                        ? "在搜索框输入店名、地标或地址，从列表中选择；也可点击地图选点。"
                        : language === "en"
                          ? "Search by store name, landmark, or address; or tap the map."
                          : "ဆိုင်အမည်၊ လမ်းညွှန်ချက်ဖြင့် ရှာပြီး ရွေးချယ်ပါ။ မြေပုံကိုနှိပ်ခြင်းလည်း လုပ်နိုင်သည်။"}
                    </div>
                    <div style={{ position: "relative" }}>
                      <input
                        id="merchant-map-address-input"
                        type="text"
                        value={mapModalPreviewAddress}
                        placeholder={allT.order.mapPlaceholder}
                        onChange={(e) =>
                          handleMerchantMapAddressInputChange(e.target.value)
                        }
                        onFocus={(e) => {
                          if (e.currentTarget.value.trim().length >= 2) {
                            performMerchantMapAutocomplete(
                              e.currentTarget.value,
                            );
                          }
                        }}
                        onBlur={() => {
                          setTimeout(
                            () => setShowMerchantMapSuggestions(false),
                            200,
                          );
                        }}
                        autoComplete="off"
                        style={{
                          width: "100%",
                          padding: "0.75rem 1rem",
                          border: "2px solid #e2e8f0",
                          borderRadius: "10px",
                          fontSize: "0.95rem",
                          boxSizing: "border-box",
                          background: "#fff",
                          color: "#0f172a",
                        }}
                      />
                      {isLoadingMerchantMapSuggestions && (
                        <div
                          style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)",
                            fontSize: "0.75rem",
                            color: "#64748b",
                          }}
                        >
                          🔍
                        </div>
                      )}
                      {showMerchantMapSuggestions &&
                        merchantMapSuggestions.length > 0 && (
                          <div
                            style={{
                              position: "absolute",
                              top: "100%",
                              left: 0,
                              right: 0,
                              marginTop: "4px",
                              background: "#fff",
                              borderRadius: "10px",
                              border: "1px solid #e2e8f0",
                              boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                              maxHeight: "280px",
                              overflowY: "auto",
                              zIndex: 20,
                            }}
                          >
                            {merchantMapSuggestions.map((s, index) => (
                              <button
                                key={`${s.place_id}-${index}`}
                                type="button"
                                onMouseDown={(e) => e.preventDefault()}
                                onClick={() =>
                                  handleMerchantMapSelectSuggestion(s)
                                }
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "0.75rem 1rem",
                                  border: "none",
                                  borderBottom:
                                    index < merchantMapSuggestions.length - 1
                                      ? "1px solid #f1f5f9"
                                      : "none",
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: "0.9rem",
                                  color: "#0f172a",
                                }}
                              >
                                <div style={{ fontWeight: 600 }}>
                                  {s.main_text}
                                </div>
                                {s.secondary_text ? (
                                  <div
                                    style={{
                                      fontSize: "0.8rem",
                                      color: "#64748b",
                                      marginTop: "2px",
                                    }}
                                  >
                                    {s.secondary_text}
                                  </div>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        )}
                    </div>
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    height: "100%",
                    minHeight: "240px",
                    background: "#f8fafc",
                  }}
                >
                  <div
                    className="spinner"
                    style={{
                      width: "40px",
                      height: "40px",
                      border: "4px solid rgba(0,0,0,0.1)",
                      borderTop: "4px solid #3b82f6",
                      borderRadius: "50%",
                    }}
                  ></div>
                </div>
              )}
            </div>
            <div
              style={{
                flexShrink: 0,
                marginTop: "auto",
                paddingTop: "1rem",
                paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))",
                borderTop: "1px solid #e2e8f0",
                display: "flex",
                flexWrap: "wrap",
                gap: "0.75rem",
                justifyContent: "flex-end",
                alignItems: "center",
                background: "#fff",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setShowMapModal(false);
                  setMapClickPosition(null);
                  setMapModalPreviewAddress("");
                  setMerchantMapSuggestions([]);
                  setShowMerchantMapSuggestions(false);
                }}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "10px",
                  border: "1px solid #e2e8f0",
                  background: "white",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                {language === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                type="button"
                onClick={confirmMapSelection}
                disabled={!mapClickPosition}
                style={{
                  padding: "0.75rem 1.5rem",
                  borderRadius: "10px",
                  border: "none",
                  background: "#3b82f6",
                  color: "white",
                  fontWeight: "bold",
                  cursor: mapClickPosition ? "pointer" : "not-allowed",
                  opacity: mapClickPosition ? 1 : 0.5,
                }}
              >
                {language === "zh" ? "确认选择" : "Confirm Selection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 新增：订单成功模态框 */}
      {showOrderSuccessModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(10px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1a365d 0%, #2c5282 100%)",
              padding: "2rem",
              borderRadius: "20px",
              width: "90%",
              maxWidth: "500px",
              maxHeight: "90vh",
              overflow: "auto",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                paddingBottom: "1rem",
                borderBottom: "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  color:
                    orderSubmitStatus === "success" ? "#A5C7FF" : "#ff6b6b",
                  fontSize: "1.5rem",
                  fontWeight: "bold",
                }}
              >
                {orderSubmitStatus === "success"
                  ? "🎉 订单创建成功！"
                  : orderSubmitStatus === "failed"
                    ? "❌ 订单创建失败"
                    : "⏳ 正在处理..."}
              </h2>
              <button
                onClick={() => setShowOrderSuccessModal(false)}
                style={{
                  background: "rgba(255, 255, 255, 0.1)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "white",
                  padding: "0.5rem",
                  borderRadius: "50%",
                  cursor: "pointer",
                  fontSize: "1.2rem",
                  width: "40px",
                  height: "40px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>

            {orderSubmitStatus === "success" && (
              <div style={{ textAlign: "center", color: "white" }}>
                <h3 style={{ color: "#A5C7FF", marginBottom: "1rem" }}>
                  {language === "zh" ? "订单号" : "Order ID"}:{" "}
                  {generatedOrderId}
                </h3>
                <div
                  style={{
                    background: "white",
                    padding: "1rem",
                    borderRadius: "15px",
                    display: "inline-block",
                    marginBottom: "1.5rem",
                  }}
                >
                  {qrCodeDataUrlOrder && (
                    <img
                      src={qrCodeDataUrlOrder}
                      alt="QR"
                      style={{ width: "200px", height: "200px" }}
                    />
                  )}
                </div>
                <p style={{ opacity: 0.8, marginBottom: "2rem" }}>
                  {language === "zh"
                    ? "请妥善保管二维码，快递员取件时需扫描"
                    : "Please keep this QR code, courier will scan it on pickup"}
                </p>
                <button
                  onClick={downloadOrderQRCode}
                  style={{
                    width: "100%",
                    padding: "1rem",
                    borderRadius: "12px",
                    background: "#10b981",
                    color: "white",
                    border: "none",
                    fontWeight: "bold",
                    cursor: "pointer",
                  }}
                >
                  📥 {language === "zh" ? "下载二维码" : "Download QR Code"}
                </button>
              </div>
            )}

            {orderSubmitStatus === "failed" && (
              <div style={{ color: "white", textAlign: "center" }}>
                <p style={{ color: "#ff6b6b", fontWeight: "bold" }}>
                  {orderError}
                </p>
                <button
                  onClick={() => setShowOrderSuccessModal(false)}
                  style={{
                    marginTop: "2rem",
                    padding: "0.8rem 2rem",
                    borderRadius: "10px",
                    background: "rgba(255,255,255,0.1)",
                    color: "white",
                    border: "1px solid rgba(255,255,255,0.2)",
                  }}
                >
                  {language === "zh" ? "返回重试" : "Retry"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;
