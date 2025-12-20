import os

file_path = 'ml-express-client-web/src/pages/HomePage.tsx'

start_marker = "{/* 订单表单模态窗口 */}"
next_section_marker = "{/* 支付二维码模态窗口 */}"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
replaced = False

for line in lines:
    if start_marker in line:
        skip = True
        new_lines.append("      {/* 订单表单模态窗口 */}\n")
        new_lines.append("      <OrderModal\n")
        new_lines.append("        showOrderForm={showOrderForm}\n")
        new_lines.append("        setShowOrderForm={setShowOrderForm}\n")
        new_lines.append("        language={language}\n")
        new_lines.append("        t={t}\n")
        new_lines.append("        currentUser={currentUser}\n")
        new_lines.append("        senderName={senderName}\n")
        new_lines.append("        setSenderName={setSenderName}\n")
        new_lines.append("        senderPhone={senderPhone}\n")
        new_lines.append("        setSenderPhone={setSenderPhone}\n")
        new_lines.append("        senderAddressText={senderAddressText}\n")
        new_lines.append("        setSenderAddressText={setSenderAddressText}\n")
        new_lines.append("        receiverName={receiverName}\n")
        new_lines.append("        setReceiverName={setReceiverName}\n")
        new_lines.append("        receiverPhone={receiverPhone}\n")
        new_lines.append("        setReceiverPhone={setReceiverPhone}\n")
        new_lines.append("        receiverAddressText={receiverAddressText}\n")
        new_lines.append("        setReceiverAddressText={setReceiverAddressText}\n")
        new_lines.append("        codAmount={codAmount}\n")
        new_lines.append("        setCodAmount={setCodAmount}\n")
        new_lines.append("        selectedDeliverySpeed={selectedDeliverySpeed}\n")
        new_lines.append("        setSelectedDeliverySpeed={setSelectedDeliverySpeed}\n")
        new_lines.append("        setShowTimePickerModal={setShowTimePickerModal}\n")
        new_lines.append("        scheduledDeliveryTime={scheduledDeliveryTime}\n")
        new_lines.append("        showWeightInput={showWeightInput}\n")
        new_lines.append("        setShowWeightInput={setShowWeightInput}\n")
        new_lines.append("        isCalculated={isCalculated}\n")
        new_lines.append("        calculatedPriceDetail={calculatedPriceDetail}\n")
        new_lines.append("        calculatedDistanceDetail={calculatedDistanceDetail}\n")
        new_lines.append("        pricingSettings={pricingSettings}\n")
        new_lines.append("        handleOpenMapModal={handleOpenMapModal}\n")
        new_lines.append("        calculatePriceEstimate={calculatePriceEstimate}\n")
        new_lines.append("        handleOrderSubmit={handleOrderSubmit}\n")
        new_lines.append("      />\n\n")
        replaced = True
        continue
    
    if skip and next_section_marker in line:
        skip = False
        new_lines.append(line)
        continue
    
    if not skip:
        new_lines.append(line)

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f"Replaced: {replaced}")

