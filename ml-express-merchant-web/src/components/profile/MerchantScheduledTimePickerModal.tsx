import React, { useMemo, useState } from "react";

type UiCopy = {
  today: string;
  tomorrow: string;
  selectDeliveryTime: string;
  confirmTime: string;
  cancel: string;
};

interface MerchantScheduledTimePickerModalProps {
  open: boolean;
  language: string;
  ui: UiCopy;
  scheduledDeliveryTime: string;
  onClose: () => void;
  onConfirm: (value: string) => void;
  onCancelWithoutTime: () => void;
}

const MerchantScheduledTimePickerModal: React.FC<
  MerchantScheduledTimePickerModalProps
> = ({
  open,
  language,
  ui,
  scheduledDeliveryTime,
  onClose,
  onConfirm,
  onCancelWithoutTime,
}) => {
  const [tempScheduledDate, setTempSelectedDate] = useState<string>("Today");
  const [tempScheduledTime, setTempSelectedTime] = useState<string>("");

  const availableTimeSlots = useMemo(() => {
    const slots: string[] = [];
    const startHour = 8;
    const endHour = 22;

    for (let h = startHour; h < endHour; h++) {
      const hourStr = h.toString().padStart(2, "0");
      slots.push(`${hourStr}:00`);
      slots.push(`${hourStr}:30`);
    }
    slots.push("22:00");

    if (tempScheduledDate === "Today") {
      const now = new Date();
      const myanmarTime = new Date(
        now.toLocaleString("en-US", { timeZone: "Asia/Yangon" }),
      );
      const currentTimeInMinutes =
        myanmarTime.getHours() * 60 + myanmarTime.getMinutes();

      return slots.filter((slot) => {
        const [sh, sm] = slot.split(":").map(Number);
        const slotTimeInMinutes = sh * 60 + sm;
        return slotTimeInMinutes > currentTimeInMinutes + 30;
      });
    }

    return slots;
  }, [tempScheduledDate]);

  if (!open) return null;

  return (
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
        zIndex: 3000,
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(to right top, #b0d3e8, #a2c3d6, #93b4c5, #86a4b4, #7895a3, #6c90a3, #618ca3, #5587a4, #498ab6, #428cc9, #468dda, #558cea)",
          padding: window.innerWidth < 768 ? "1.5rem" : "2rem",
          borderRadius: "20px",
          width: window.innerWidth < 768 ? "90%" : "450px",
          maxHeight: "90vh",
          overflow: "auto",
          boxShadow: "0 25px 80px rgba(0, 0, 0, 0.4)",
          border: "1px solid rgba(255, 255, 255, 0.3)",
          backdropFilter: "blur(15px)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div
            style={{
              fontSize: "3.5rem",
              marginBottom: "0.5rem",
              filter: "drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3))",
            }}
          >
            🕐
          </div>
          <h2
            style={{
              color: "white",
              margin: 0,
              fontSize: "1.5rem",
              fontWeight: "bold",
              textShadow: "0 2px 4px rgba(0, 0, 0, 0.3)",
            }}
          >
            {ui.selectDeliveryTime}
          </h2>
          <p
            style={{
              color: "rgba(255, 255, 255, 0.8)",
              margin: "0.5rem 0 0 0",
              fontSize: "0.9rem",
            }}
          >
            {language === "zh"
              ? "选择您希望的配送时间"
              : language === "en"
                ? "Choose your preferred delivery time"
                : "သင်နှစ်သက်သော ပို့ဆောင်ချိန်ကို ရွေးချယ်ပါ"}
          </p>
        </div>

        <div style={{ marginBottom: "2rem" }}>
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.05)",
              padding: "4px",
              borderRadius: "16px",
              marginBottom: "1.5rem",
            }}
          >
            <button
              type="button"
              onClick={() => setTempSelectedDate("Today")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "12px",
                border: "none",
                fontWeight: "800",
                cursor: "pointer",
                background:
                  tempScheduledDate === "Today" ? "#3b82f6" : "transparent",
                color: "white",
                transition: "all 0.3s",
              }}
            >
              {language === "zh" ? "今日" : "Today"} {ui.today}
            </button>
            <button
              type="button"
              onClick={() => setTempSelectedDate("Tomorrow")}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: "12px",
                border: "none",
                fontWeight: "800",
                cursor: "pointer",
                background:
                  tempScheduledDate === "Tomorrow" ? "#3b82f6" : "transparent",
                color: "white",
                transition: "all 0.3s",
              }}
            >
              {language === "zh" ? "明日" : "Tomorrow"} {ui.tomorrow}
            </button>
          </div>

          <div
            style={{
              maxHeight: "280px",
              overflowY: "auto",
              paddingRight: "8px",
              marginBottom: "1.5rem",
            }}
            className="custom-scrollbar"
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: "10px",
              }}
            >
              {availableTimeSlots.length > 0 ? (
                availableTimeSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setTempSelectedTime(slot)}
                    style={{
                      padding: "12px 5px",
                      borderRadius: "12px",
                      border: "2px solid",
                      borderColor:
                        tempScheduledTime === slot
                          ? "#3b82f6"
                          : "rgba(255,255,255,0.05)",
                      background:
                        tempScheduledTime === slot
                          ? "rgba(59, 130, 246, 0.2)"
                          : "rgba(255,255,255,0.02)",
                      color:
                        tempScheduledTime === slot
                          ? "#fff"
                          : "rgba(255,255,255,0.5)",
                      fontSize: "0.95rem",
                      fontWeight: "800",
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {slot}
                  </button>
                ))
              ) : (
                <div
                  style={{
                    gridColumn: "span 3",
                    textAlign: "center",
                    padding: "40px 20px",
                    color: "rgba(255,255,255,0.4)",
                    fontSize: "0.9rem",
                  }}
                >
                  {language === "zh"
                    ? "今日配送已截止，请选择明日"
                    : language === "en"
                      ? "No slots left today, please choose tomorrow"
                      : "ယနေ့အတွက် အချိန်မကျန်တော့ပါ"}
                </div>
              )}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
          }}
        >
          <button
            type="button"
            onClick={() => {
              if (tempScheduledDate && tempScheduledTime) {
                const dateStr =
                  tempScheduledDate === "Today" ? ui.today : ui.tomorrow;
                onConfirm(`${dateStr} ${tempScheduledTime}`);
                onClose();
              } else {
                alert(
                  language === "zh"
                    ? "请选择时间"
                    : language === "en"
                      ? "Please select a time"
                      : "အချိန်ရွေးချယ်ပါ",
                );
              }
            }}
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)",
              color: "white",
              border: "none",
              padding: "1.1rem",
              borderRadius: "16px",
              cursor: "pointer",
              fontWeight: "900",
              fontSize: "1rem",
              flex: 2,
              boxShadow: "0 8px 20px rgba(59, 130, 246, 0.3)",
            }}
          >
            ✅ {ui.confirmTime}
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              if (!scheduledDeliveryTime) onCancelWithoutTime();
            }}
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "1.1rem",
              borderRadius: "16px",
              cursor: "pointer",
              fontWeight: "800",
              fontSize: "1rem",
              flex: 1,
            }}
          >
            ❌ {ui.cancel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default MerchantScheduledTimePickerModal;
