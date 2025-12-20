import os

file_path = 'ml-express-client/src/screens/PlaceOrderScreen.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

start_index = -1
end_index = -1

for i, line in enumerate(lines):
    if 'return (' in line:
        start_index = i
    if 'const baseStyles = StyleSheet.create({' in line:
        end_index = i
        break

if start_index == -1:
    print("Could not find start index (return ()")
    exit(1)

if end_index == -1:
    # 尝试查找其他结束标记，比如最后的 styles 定义
    # 如果找不到 baseStyles，可能直接找最后的 export default 结束后的 styles
    # 或者直接查找文件末尾的 `const styles = ...`
    for i, line in enumerate(lines):
        if 'const styles = ' in line or 'const baseStyles =' in line:
            end_index = i
            break

if end_index == -1:
    print("Could not find end index (styles definition)")
    exit(1)

# 新的 JSX 内容
new_jsx = """  return (
    <View style={styles.container}>
      <LinearGradient
        colors={['#f8fafc', '#e2e8f0']}
        style={StyleSheet.absoluteFill}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackToHomeButton navigation={navigation} />
          
          <View style={styles.header}>
            <Text style={styles.title}>{currentT.title}</Text>
            <Text style={styles.subtitle}>{currentT.subtitle}</Text>
          </View>

          {/* 寄件人表单 */}
          <SenderForm
            language={language as any}
            styles={styles}
            currentT={currentT}
            senderName={senderName}
            senderPhone={senderPhone}
            senderAddress={senderAddress}
            useMyInfo={useMyInfo}
            senderCoordinates={senderCoordinates}
            errors={errors}
            touched={touched}
            onSenderNameChange={(val) => handleFieldChange('senderName', val)}
            onSenderPhoneChange={(val) => handleFieldChange('senderPhone', val)}
            onSenderAddressChange={(val) => handleFieldChange('senderAddress', val)}
            onUseMyInfoChange={setUseMyInfo}
            onOpenMap={() => openMapSelector('sender')}
            onBlur={handleFieldBlur}
          />

          {/* 收件人表单 */}
          <ReceiverForm
            language={language as any}
            styles={styles}
            currentT={currentT}
            receiverName={receiverName}
            receiverPhone={receiverPhone}
            receiverAddress={receiverAddress}
            receiverCoordinates={receiverCoordinates}
            errors={errors}
            touched={touched}
            onReceiverNameChange={(val) => handleFieldChange('receiverName', val)}
            onReceiverPhoneChange={(val) => handleFieldChange('receiverPhone', val)}
            onReceiverAddressChange={(val) => handleFieldChange('receiverAddress', val)}
            onOpenMap={() => openMapSelector('receiver')}
            onBlur={handleFieldBlur}
          />

          {/* 包裹信息 */}
          <PackageInfo
            language={language as any}
            styles={styles}
            currentT={currentT}
            packageType={packageType}
            weight={weight}
            description={description}
            showWeightInput={showWeightInput}
            packageTypes={packageTypes}
            onPackageTypeChange={setPackageType}
            onWeightChange={setWeight}
            onDescriptionChange={setDescription}
            onPackageTypeInfoClick={(type) => {
              setSelectedPackageTypeInfo(type);
              setShowPackageTypeInfo(true);
            }}
          />

          {/* 配送选项 */}
          <DeliveryOptions
            language={language as any}
            styles={styles}
            currentT={currentT}
            deliverySpeed={deliverySpeed}
            deliverySpeeds={deliverySpeeds}
            onDeliverySpeedChange={setDeliverySpeed}
            onScheduleTimeClick={() => setShowTimePicker(true)}
          />

          {/* 价格计算 */}
          <PriceCalculation
            language={language as any}
            styles={styles}
            currentT={currentT}
            isCalculated={isCalculated}
            calculatedDistance={calculatedDistance}
            calculatedPrice={calculatedPrice}
            packageType={packageType}
            weight={weight}
            deliverySpeed={deliverySpeed}
            deliverySpeeds={deliverySpeeds}
            pricingSettings={pricingSettings as any}
            onCalculate={calculatePrice}
          />

          {/* 提交按钮 */}
          <ScaleInView delay={450}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitOrder}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['#3b82f6', '#2563eb', '#1d4ed8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.gradientButton}
              >
                <DeliveryIcon size={24} color="#ffffff" />
                <Text style={styles.submitButtonText}> {currentT.submitOrder}</Text>
              </LinearGradient>
            </TouchableOpacity>
          </ScaleInView>
          
          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* 模态框 */}
      <MapModal
        visible={showMapModal}
        language={language as any}
        styles={styles}
        currentT={currentT}
        mapType={mapType}
        selectedLocation={selectedLocation}
        selectedPlace={selectedPlace}
        mapAddressInput={mapAddressInput}
        showSuggestions={showSuggestions}
        autocompleteSuggestions={autocompleteSuggestions}
        onClose={() => setShowMapModal(false)}
        onConfirm={confirmMapLocation}
        onAddressInputChange={handleMapAddressInputChange}
        onMapAddressInputChange={setMapAddressInput}
        onUseCurrentLocation={useCurrentLocationInMap}
        onSelectSuggestion={handleSelectSuggestion}
        onSetShowSuggestions={setShowSuggestions}
        onLocationChange={(coords) => setSelectedLocation(coords)}
        onPlaceChange={setSelectedPlace}
      />
      
      {/* 包裹类型说明模态框 */}
      <Modal
        visible={showPackageTypeInfo}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPackageTypeInfo(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{currentT.packageTypeInfo.title}</Text>
            <ScrollView style={{ maxHeight: 300 }}>
              <Text style={styles.modalText}>
                {/* 这里的 getPackageTypeDescription 可能需要从外部获取或者移动到 helper */}
                {selectedPackageTypeInfo}
              </Text>
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowPackageTypeInfo(false)}
            >
              <Text style={styles.modalCloseButtonText}>{currentT.packageTypeInfo.understood}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

"""

# 保留 start_index 之前的内容
# 保留 end_index 之后的内容 (const baseStyles ...)
# 用 new_jsx 替换中间的内容

final_lines = lines[:start_index] + [new_jsx] + lines[end_index:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)

print("PlaceOrderScreen updated successfully")

