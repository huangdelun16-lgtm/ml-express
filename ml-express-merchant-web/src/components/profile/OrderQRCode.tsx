import React, { useState, useEffect } from "react";
import QRCode from "qrcode";

/** 订单列表内嵌二维码（自 ProfilePage 抽出） */
const OrderQRCode: React.FC<{ orderId: string }> = ({ orderId }) => {
  const [qrUrl, setQrUrl] = useState("");
  useEffect(() => {
    if (orderId) {
      QRCode.toDataURL(orderId).then(setQrUrl);
    }
  }, [orderId]);
  return qrUrl ? (
    <img src={qrUrl} style={{ width: "80px", height: "80px" }} alt="QR" />
  ) : null;
};

export default OrderQRCode;
