// @ts-nocheck — 从 DeliveryStoreManagement 原样搬出的表单/弹窗 JSX；类型由父组件工作区承担。
import React from 'react';
import { createPortal } from 'react-dom';
import { GoogleMap, Marker } from '@react-google-maps/api';
import ProductImageEditorModal from '../../components/ProductImageEditorModal';
import ProductVariantsEditor from '../../components/ProductVariantsEditor';
import { feedbackService } from '../../services/FeedbackService';
import { formatVariantsForDisplay } from '../../utils/productVariants';
import {
  ErrorBoundary,
  STORE_TYPES,
  REGIONS,
  OPERATING_HOURS_PRESETS,
  parseOperatingHours,
  getOperatingDurationLabel,
  normalizeProductListingStatus,
  hasPendingProductUpdate,
  adminProductDisplay,
  buildAdminProductChanges,
  listingStatusLabel,
  ADMIN_PRODUCT_FIELD_LABELS,
  formatAdminProductFieldText,
  productNeedsAdminReview,
} from './deliveryStoreShared';
import { useDeliveryStoreWorkspace } from './DeliveryStoreWorkspace';

const DeliveryStoreOverlays: React.FC = () => {
  const {
    adminImageEditorFile,
    adminImageEditorTarget,
    adminProductDetailFileInputRef,
    adminProductError,
    adminProductFileInputRef,
    adminProductForm,
    applyOperatingHoursPreset,
    closeStoreForm,
    confirmMapSelection,
    currentStorageStore,
    currentStoreQR,
    currentTransferPackage,
    currentViewStore,
    downloadQRCode,
    editingStore,
    facilityOptions,
    filteredStoreProducts,
    formData,
    formSubmitError,
    generateTransferQRCode,
    getMapErrorMessage,
    handleAdminImageEditorCancel,
    handleAdminImageEditorConfirm,
    handleAdminProductDetailImagesUpload,
    handleAdminProductImageUpload,
    handleFacilityChange,
    handleForwardPackage,
    handleInputChange,
    handleMapClick,
    handleOperatingHoursPartChange,
    handleRemoveAdminProductDetailImage,
    handleSaveAdminProduct,
    handleSubmit,
    isEditing,
    isMapLoaded,
    isSavingAdminProduct,
    isSubmittingStore,
    isUploadingAdminProductDetailImages,
    isUploadingAdminProductImage,
    language,
    loadingProducts,
    loadingStorage,
    loadingStorePackages,
    mapCenter,
    mapLoadError,
    onMapLoad,
    openMapSelection,
    productListCounts,
    productListFilter,
    productListingActionId,
    qrCodeDataUrl,
    selectedAdminProduct,
    selectedStore,
    setAdminProductForm,
    setCurrentViewStore,
    setFormData,
    setProductListFilter,
    setSelectedAdminProductId,
    setShowAdminProductDetailPanel,
    setShowMapModal,
    setShowPackageModal,
    setShowProductsModal,
    setShowQRModal,
    setShowStorageModal,
    setShowStorePackagesModal,
    setShowStoreTypeDropdown,
    setShowTransferQRModal,
    setStorePackages,
    setSuccessMessage,
    setViewingStoreId,
    showAdminProductDetailPanel,
    showForm,
    showMapModal,
    showPackageModal,
    showProductsModal,
    showQRModal,
    showStorageModal,
    showStorePackagesModal,
    showStoreTypeDropdown,
    showTransferQRModal,
    storagePackages,
    storePackages,
    storeProducts,
    storeTypeDropdownRef,
    transferQRCodeDataUrl,
    updateProductListingStatus,
    viewingStoreName
  } = useDeliveryStoreWorkspace();

  return (
    <>
      {/* 新增表单 */}
      {showForm && createPortal(
        <div
          className="store-form-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeStoreForm();
          }}
        >
          <div className="store-form-modal" role="dialog" aria-modal="true" aria-labelledby="store-form-title">
            <div className="store-form-modal__head">
              <div className="store-form-modal__title-wrap">
                <h2 id="store-form-title" className="store-form-modal__title">
                  {isEditing ? '编辑合伙店铺' : '新增合伙店铺'}
                </h2>
                <p className="store-form-modal__sub">
                  {isEditing
                    ? '修改店铺基本信息、联系方式与位置坐标。'
                    : '填写店铺资料并选择地图位置，店铺代码将随名称与区域自动生成。'}
                </p>
              </div>
              <div className="store-form-modal__head-actions">
                <div className="store-form-modal__region">
                  <label htmlFor="store-form-region">工作区域</label>
                  <select
                    id="store-form-region"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                  >
                    {REGIONS.map(r => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.prefix})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="store-form-modal__close"
                  aria-label="关闭"
                  onClick={closeStoreForm}
                >
                  ×
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="store-form-modal__form">
              <div className="store-form-modal__body">
                {formSubmitError && (
                  <div className="store-form-alert store-form-alert--error" role="alert">
                    {formSubmitError}
                  </div>
                )}
                <section className="store-form-section">
                  <h3 className="store-form-section__title">店铺基本信息</h3>
                  <div className="store-form-grid">
                    <div className="store-form-field">
                      <label>店铺名称 <span>*</span></label>
                      <input
                        type="text"
                        name="store_name"
                        value={formData.store_name}
                        onChange={handleInputChange}
                        placeholder="例: 缅甸中心店"
                        required
                      />
                    </div>
                    <div className="store-form-field store-form-field--readonly">
                      <label>店铺代码 <span>*</span>（自动生成）</label>
                      <input
                        type="text"
                        name="store_code"
                        value={formData.store_code}
                        readOnly
                        placeholder="填写店铺名称后自动生成"
                      />
                    </div>
                    <div className="store-form-field">
                      <label>店铺类型 <span>*</span></label>
                      <div
                        className={`store-form-type ${showStoreTypeDropdown ? 'is-open' : ''}`}
                        ref={storeTypeDropdownRef}
                      >
                        <button
                          type="button"
                          className="store-form-type__trigger"
                          onClick={() => setShowStoreTypeDropdown(!showStoreTypeDropdown)}
                        >
                          <span>{STORE_TYPES.find(t => t.value === formData.store_type)?.label || '选择店铺类型'}</span>
                          <span className="store-form-type__arrow">▼</span>
                        </button>
                        {showStoreTypeDropdown && (
                          <div className="store-form-type__menu">
                            {STORE_TYPES.map((type) => (
                              <div
                                key={type.value}
                                className={`store-form-type__option ${formData.store_type === type.value ? 'is-selected' : ''}`}
                                onClick={() => {
                                  handleInputChange({ target: { name: 'store_type', value: type.value } } as React.ChangeEvent<HTMLSelectElement>);
                                  setShowStoreTypeDropdown(false);
                                }}
                              >
                                {type.label}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="store-form-field">
                      <label>密码 <span>*</span></label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        placeholder="合伙店铺登录密码"
                        required
                      />
                    </div>
                    <div className="store-form-field">
                      <label>详细地址 <span>*</span></label>
                      <input
                        type="text"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        placeholder="详细地址"
                        required
                      />
                    </div>
                    <div className="store-form-field store-form-field--hours">
                      <label>营业时间 <span>*</span></label>
                      {(() => {
                        const { open, close } = parseOperatingHours(formData.operating_hours);
                        const durationLabel = getOperatingDurationLabel(open, close);
                        return (
                          <div className="store-form-hours">
                            <div className="store-form-hours__pickers">
                              <div className="store-form-hours__picker">
                                <span className="store-form-hours__picker-label">开始时间</span>
                                <input
                                  type="time"
                                  value={open}
                                  onChange={(e) => handleOperatingHoursPartChange('open', e.target.value)}
                                  required
                                />
                              </div>
                              <span className="store-form-hours__sep" aria-hidden="true">至</span>
                              <div className="store-form-hours__picker">
                                <span className="store-form-hours__picker-label">结束时间</span>
                                <input
                                  type="time"
                                  value={close}
                                  onChange={(e) => handleOperatingHoursPartChange('close', e.target.value)}
                                  required
                                />
                              </div>
                              {durationLabel ? (
                                <span className="store-form-hours__duration">{durationLabel}</span>
                              ) : null}
                            </div>
                            <div className="store-form-hours__presets" role="group" aria-label="常用营业时间">
                              {OPERATING_HOURS_PRESETS.map((preset) => (
                                <button
                                  key={preset.value}
                                  type="button"
                                  className={`store-form-hours__preset ${formData.operating_hours === preset.value ? 'is-active' : ''}`}
                                  onClick={() => applyOperatingHoursPreset(preset.value)}
                                >
                                  {preset.label}
                                </button>
                              ))}
                            </div>
                            <p className="store-form-hours__hint">
                              保存格式：{formData.operating_hours || DEFAULT_OPERATING_HOURS}（客户端按此时段判断营业状态）
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </section>

                <section className="store-form-section">
                  <h3 className="store-form-section__title">联系与店长</h3>
                  <div className="store-form-grid">
                    <div className="store-form-field">
                      <label>联系电话 <span>*</span></label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        placeholder="09-XXXXXXXXX"
                        required
                      />
                    </div>
                    <div className="store-form-field">
                      <label>邮箱地址</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        placeholder="store@company.com"
                      />
                    </div>
                    <div className="store-form-field">
                      <label>店长姓名 <span>*</span></label>
                      <input
                        type="text"
                        name="manager_name"
                        value={formData.manager_name}
                        onChange={handleInputChange}
                        placeholder="店长姓名"
                        required
                      />
                    </div>
                    <div className="store-form-field">
                      <label>店长电话 <span>*</span></label>
                      <input
                        type="tel"
                        name="manager_phone"
                        value={formData.manager_phone}
                        onChange={handleInputChange}
                        placeholder="09-XXXXXXXXX"
                        required
                      />
                    </div>
                    <div className="store-form-field store-form-field--cod">
                      <label>COD 结清日 <span>*</span></label>
                      <select
                        name="cod_settlement_day"
                        className="store-form-select"
                        value={formData.cod_settlement_day}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="7">7 天</option>
                        <option value="10">10 天</option>
                        <option value="15">15 天</option>
                        <option value="30">1 个月</option>
                      </select>
                    </div>
                    {!isEditing && (
                      <div className="store-form-field store-form-field--muted">
                        <label>创建合伙时间</label>
                        <input
                          type="text"
                          value={new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                          readOnly
                        />
                      </div>
                    )}
                  </div>
                </section>

                <section className="store-form-section">
                  <h3 className="store-form-section__title">位置坐标</h3>
                  <div className="store-form-grid store-form-grid--coords">
                    <div className="store-form-field">
                      <label>纬度 <span>*</span></label>
                      <input
                        type="number"
                        name="latitude"
                        value={formData.latitude}
                        onChange={handleInputChange}
                        placeholder="21.9588"
                        step="0.00000001"
                        required
                      />
                    </div>
                    <div className="store-form-field store-form-field--longitude">
                      <label>经度 <span>*</span></label>
                      <div className="store-form-coords-action">
                        <input
                          type="number"
                          name="longitude"
                          value={formData.longitude}
                          onChange={handleInputChange}
                          placeholder="96.0891"
                          step="0.00000001"
                          required
                        />
                        <button
                          type="button"
                          className="store-form-btn store-form-btn--map store-form-btn--inline"
                          onClick={openMapSelection}
                        >
                          选择地图位置
                        </button>
                      </div>
                    </div>
                  </div>
                  {formData.latitude && formData.longitude && (
                    <p className="store-form-map__status store-form-map__status--below">
                      位置已选择 ({formData.latitude}, {formData.longitude})
                    </p>
                  )}

                  {isEditing && editingStore?.id ? (
                    <div className="store-form-product store-form-product--below">
                        <p className="store-form-product__title">代商家添加商品</p>
                        <p className="store-form-product__sub">
                          商品须单独保存：点击「添加商品并上架」，或在填写完整后点「更新合伙店铺」也会一并上架。保存后在列表点「进入店铺」查看。
                        </p>

                        {adminProductError && (
                          <div className="store-form-alert store-form-alert--error" role="alert">
                            {adminProductError}
                          </div>
                        )}

                        <div className="store-form-product__media">
                          <div
                            className="store-form-product__upload"
                            onClick={() => adminProductFileInputRef.current?.click()}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') adminProductFileInputRef.current?.click();
                            }}
                            role="button"
                            tabIndex={0}
                          >
                            {adminProductForm.image_url ? (
                              <img src={adminProductForm.image_url} alt="" />
                            ) : (
                              <>
                                <span className="store-form-product__upload-icon" aria-hidden>📸</span>
                                <span className="store-form-product__upload-hint">
                                  {isUploadingAdminProductImage ? '上传中…' : '上传图片（可调整规格）'}
                                </span>
                              </>
                            )}
                            <input
                              type="file"
                              ref={adminProductFileInputRef}
                              onChange={handleAdminProductImageUpload}
                              style={{ display: 'none' }}
                              accept="image/*"
                            />
                          </div>

                          <div className="store-form-product__detail-wrap">
                            <button
                              type="button"
                              className="store-form-product__detail-btn"
                              onClick={() => setShowAdminProductDetailPanel((v) => !v)}
                            >
                              <span aria-hidden="true">🖼️</span>
                              详细介绍
                              {adminProductForm.detail_image_urls.length > 0 ? (
                                <span className="store-form-product__detail-btn-count">
                                  {adminProductForm.detail_image_urls.length}
                                </span>
                              ) : null}
                            </button>
                            {showAdminProductDetailPanel ? (
                              <div className="store-form-product__detail-panel">
                                <p className="store-form-product__detail-hint">
                                  上传多张介绍图，顾客在商品详情页可纵向滚动浏览
                                </p>
                                <div className="store-form-product__detail-scroll">
                                  {adminProductForm.detail_image_urls.map((url, idx) => (
                                    <div key={`${url}-${idx}`} className="store-form-product__detail-thumb">
                                      <img src={url} alt="" />
                                      <button
                                        type="button"
                                        className="store-form-product__detail-remove"
                                        onClick={() => handleRemoveAdminProductDetailImage(idx)}
                                        aria-label="删除图片"
                                      >
                                        ×
                                      </button>
                                    </div>
                                  ))}
                                  <button
                                    type="button"
                                    className="store-form-product__detail-add"
                                    onClick={() => adminProductDetailFileInputRef.current?.click()}
                                    disabled={isUploadingAdminProductDetailImages}
                                  >
                                    {isUploadingAdminProductDetailImages ? '上传中…' : '+ 添加图片'}
                                  </button>
                                </div>
                                <input
                                  type="file"
                                  ref={adminProductDetailFileInputRef}
                                  onChange={handleAdminProductDetailImagesUpload}
                                  style={{ display: 'none' }}
                                  accept="image/*"
                                  multiple
                                />
                              </div>
                            ) : null}
                          </div>
                        </div>

                        <div className="store-form-product__fields">
                          <div className="store-form-field">
                            <label>商品名称 <span>*</span></label>
                            <input
                              type="text"
                              value={adminProductForm.name}
                              onChange={(e) => setAdminProductForm((prev) => ({ ...prev, name: e.target.value }))}
                              placeholder="输入商品名称"
                            />
                          </div>

                          <div className="store-form-field--full store-form-variants-slot">
                            <ProductVariantsEditor
                              enabled={adminProductForm.use_variants}
                              onEnabledChange={(use_variants) =>
                                setAdminProductForm((prev) => ({ ...prev, use_variants }))
                              }
                              variants={adminProductForm.variants}
                              onChange={(variants) =>
                                setAdminProductForm((prev) => ({ ...prev, variants }))
                              }
                              language="zh"
                              theme="admin"
                            />
                          </div>

                          {!adminProductForm.use_variants ? (
                            <div className="store-form-field">
                              <label>商品价格 (MMK) <span>*</span></label>
                              <input
                                type="number"
                                min="1"
                                value={adminProductForm.price}
                                onChange={(e) => setAdminProductForm((prev) => ({ ...prev, price: e.target.value }))}
                                placeholder="例: 5000"
                              />
                            </div>
                          ) : null}
                          <div className="store-form-field store-form-field--full">
                            <label>商品描述</label>
                            <textarea
                              value={adminProductForm.description}
                              onChange={(e) => setAdminProductForm((prev) => ({ ...prev, description: e.target.value }))}
                              placeholder="输入商品简介（可选）"
                              rows={2}
                            />
                          </div>
                        </div>

                        <button
                          type="button"
                          className="store-form-btn store-form-btn--primary store-form-product__save"
                          onClick={handleSaveAdminProduct}
                          disabled={
                            isSavingAdminProduct ||
                            isUploadingAdminProductImage ||
                            isUploadingAdminProductDetailImages
                          }
                        >
                          {isSavingAdminProduct ? '添加中…' : '添加商品并上架'}
                        </button>
                      </div>
                    ) : null}
                </section>

                <section className="store-form-section">
                  <h3 className="store-form-section__title">设施与备注</h3>
                  <div className="store-form-facilities" style={{ marginBottom: '0.75rem' }}>
                    {facilityOptions.map(facility => (
                      <label key={facility.key} className="store-form-facility">
                        <input
                          type="checkbox"
                          checked={formData.facilities.includes(facility.key)}
                          onChange={() => handleFacilityChange(facility.key)}
                        />
                        {facility.label}
                      </label>
                    ))}
                  </div>
                  <div className="store-form-field">
                    <label>备注</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="其他备注信息"
                      rows={2}
                    />
                  </div>
                </section>
              </div>

              <div className="store-form-modal__foot">
                <button type="button" className="store-form-btn store-form-btn--ghost" onClick={closeStoreForm}>
                  取消
                </button>
                <button type="submit" className="store-form-btn store-form-btn--primary" disabled={isSubmittingStore}>
                  {isSubmittingStore ? '保存中…' : isEditing ? '更新合伙店铺' : '创建合伙店铺'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
      {/* 店长收件码二维码模态框 */}
      {showQRModal && currentStoreQR && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h2 style={{
                margin: 0,
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                📱 店长收件码
              </h2>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 店铺信息 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                店铺信息
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  店铺名称: {currentStoreQR.store_name}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  店铺代码: {currentStoreQR.store_code}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  地址: {currentStoreQR.address}
                </p>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  店长: {currentStoreQR.manager_name} ({currentStoreQR.manager_phone})
                </p>
              </div>
            </div>

            {/* 二维码显示 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                收件码二维码
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                {qrCodeDataUrl ? (
                  <img 
                    src={qrCodeDataUrl} 
                    alt="店长收件码" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(44, 82, 130, 0.3)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '200px',
                    height: '200px',
                    background: '#f8f9fa',
                    border: '2px dashed #2c5282',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    正在生成二维码...
                  </div>
                )}
              </div>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                骑手送件时必须扫描此二维码<br/>
                确认包裹送达至该店铺<br/>
                请妥善保管此收件码
              </p>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={downloadQRCode}
                disabled={!qrCodeDataUrl}
                style={{
                  background: !qrCodeDataUrl ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: !qrCodeDataUrl ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (qrCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                📥 下载收件码
              </button>
              <button
                onClick={() => setShowQRModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 包裹详情模态框 */}
      {showPackageModal && selectedStore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '1000px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  color: '#A5C7FF',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  📦 {selectedStore.store_name} - 中转站包裹
                </h2>
                <p style={{
                  margin: '0.5rem 0 0 0',
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '0.9rem'
                }}>
                  📍 {selectedStore.address} | 👤 店长: {selectedStore.manager_name}
                </p>
              </div>
              <button
                onClick={() => setShowPackageModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 包裹列表 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '15px',
              padding: '1.5rem',
              maxHeight: '60vh',
              overflow: 'auto'
            }}>
              {false ? ( // loadingPackages 暂时禁用
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏳</div>
                  <p>正在加载包裹列表...</p>
                </div>
              ) : storagePackages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '2rem',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}>
                  <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🏪</div>
                  <p>暂无中转站包裹</p>
                  <p style={{ fontSize: '0.9rem', opacity: 0.7 }}>
                    该店铺还没有收到任何中转包裹
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {storagePackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '12px',
                        padding: '16px',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600, color: '#A5C7FF' }}>
                          📦 {pkg.id}
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: 'rgba(255, 193, 7, 0.3)',
                            fontSize: '0.8rem',
                            color: '#ffc107'
                          }}>
                            🏪 已到达中转站
                          </span>
                          {pkg.sender_code && (
                            <span style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              background: 'rgba(52, 152, 219, 0.3)',
                              fontSize: '0.8rem',
                              color: '#3498db',
                              fontWeight: 'bold'
                            }}>
                              📱 寄件码: {pkg.sender_code}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '8px' }}>
                        <div>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>📤 寄件人:</span> {pkg.sender_name}
                          </p>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>📥 收件人:</span> {pkg.receiver_name}
                          </p>
                        </div>
                        <div>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>📞 电话:</span> {pkg.receiver_phone}
                          </p>
                          <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                            <span style={{ color: '#A5C7FF' }}>🏷️ 类型:</span> {pkg.package_type}
                          </p>
                        </div>
                      </div>
                      
                      <p style={{ margin: '4px 0', opacity: 0.8, fontSize: '0.9rem' }}>
                        <span style={{ color: '#A5C7FF' }}>📍 地址:</span> {pkg.receiver_address}
                      </p>
                      
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                          <span>⚖️ {pkg.weight}kg</span>
                          <span style={{ marginLeft: '12px' }}>💰 ¥{pkg.price}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleForwardPackage(pkg);
                            }}
                            style={{
                              background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                              color: 'white',
                              border: 'none',
                              padding: '6px 12px',
                              borderRadius: '6px',
                              fontSize: '0.8rem',
                              cursor: 'pointer',
                              fontWeight: 'bold',
                              transition: 'all 0.3s ease'
                            }}
                            onMouseOver={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                            onMouseOut={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                          >
                            🚚 转发包裹
                          </button>
                        </div>
                      </div>
                      
                      {pkg.delivery_time && (
                        <div style={{ marginTop: '8px', padding: '8px', background: 'rgba(255, 193, 7, 0.2)', borderRadius: '6px' }}>
                          <p style={{ margin: 0, fontSize: '0.8rem', color: '#ffc107' }}>
                            ⏰ 到达中转站时间: {new Date(pkg.delivery_time).toLocaleString('zh-CN')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 统计信息 */}
            {storagePackages.length > 0 && (
              <div style={{
                marginTop: '1.5rem',
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                borderRadius: '10px',
                display: 'flex',
                justifyContent: 'space-around',
                alignItems: 'center'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#A5C7FF', fontWeight: 'bold' }}>
                    {storagePackages.length}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总包裹数</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#2ecc71', fontWeight: 'bold' }}>
                    {storagePackages.reduce((sum, pkg) => sum + parseFloat(pkg.weight || '0'), 0).toFixed(1)}kg
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总重量</div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '1.5rem', color: '#f39c12', fontWeight: 'bold' }}>
                    ¥{storagePackages.reduce((sum, pkg) => sum + parseFloat(pkg.price || '0'), 0).toFixed(2)}
                  </div>
                  <div style={{ fontSize: '0.8rem', opacity: 0.8 }}>总金额</div>
                </div>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={() => setShowPackageModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 地图选择模态框（挂到 body，确保在新增店铺弹窗之上） */}
      {showMapModal && createPortal(
        <div
          className="store-form-map-overlay"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowMapModal(false);
          }}
        >
          <div
            className="store-form-map-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="store-map-title"
          >
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h2 id="store-map-title" style={{
                margin: 0,
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                🗺️ 选择店铺位置
              </h2>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 地图说明 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1rem',
              borderRadius: '10px',
              marginBottom: '1.5rem'
            }}>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                📍 在地图上点击选择店铺位置<br/>
                🎯 点击后会自动设置经纬度坐标<br/>
                ✅ 选择完成后点击"确认位置"按钮
              </p>
            </div>

            {/* 地图容器 */}
            <div style={{
              width: '100%',
              height: '400px',
              borderRadius: '15px',
              overflow: 'hidden',
              marginBottom: '1.5rem',
              border: '2px solid rgba(255, 255, 255, 0.2)',
              position: 'relative'
            }}>
              {!isMapLoaded ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🗺️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0' }}>正在加载地图...</h3>
                  <p style={{ margin: '0', opacity: 0.8 }}>请稍候，正在连接Google Maps服务</p>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '3px solid rgba(255, 255, 255, 0.3)',
                    borderTop: '3px solid #3498db',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    marginTop: '1rem'
                  }}></div>
                </div>
              ) : mapLoadError ? (
                <div style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(231, 76, 60, 0.1)',
                  color: 'white',
                  textAlign: 'center',
                  padding: '2rem'
                }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
                  <h3 style={{ margin: '0 0 0.5rem 0', color: '#e74c3c' }}>地图加载失败</h3>
                  <p style={{ margin: '0 0 1rem 0', opacity: 0.8 }}>{getMapErrorMessage()}</p>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        // 强制重新加载页面
                        window.location.reload();
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      🔄 重新加载
                    </button>
                    <button
                      onClick={() => {
                        // 手动输入坐标的备用方案
                        const lat = prompt('请输入纬度 (latitude):\n例如: 21.9588');
                        const lng = prompt('请输入经度 (longitude):\n例如: 96.0891');
                        if (lat && lng && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
                          setFormData(prev => ({
                            ...prev,
                            latitude: lat,
                            longitude: lng
                          }));
                          setShowMapModal(false);
                          setSuccessMessage('位置已手动设置');
                        } else if (lat && lng) {
                          feedbackService.notify('请输入有效的数字坐标');
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      📍 手动输入坐标
                    </button>
                    <button
                      onClick={() => {
                        // 使用预设的常用位置
                        const locations = [
                          { name: '曼德勒市中心', lat: '21.9588', lng: '96.0891' },
                          { name: '仰光市中心', lat: '16.8661', lng: '96.1951' },
                          { name: '内比都', lat: '19.7633', lng: '96.0785' }
                        ];
                        
                        const choice = prompt(`请选择预设位置:\n1. 曼德勒市中心\n2. 仰光市中心\n3. 内比都\n\n请输入数字 (1-3):`);
                        const index = parseInt(choice || '0') - 1;
                        
                        if (index >= 0 && index < locations.length) {
                          const location = locations[index];
                          setFormData(prev => ({
                            ...prev,
                            latitude: location.lat,
                            longitude: location.lng
                          }));
                          setShowMapModal(false);
                          setSuccessMessage(`已选择${location.name}位置`);
                        }
                      }}
                      style={{
                        background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        fontWeight: '500'
                      }}
                    >
                      🏙️ 选择预设位置
                    </button>
                  </div>
                </div>
              ) : (
                <ErrorBoundary>
                    <GoogleMap
                      mapContainerStyle={{ width: '100%', height: '100%' }}
                      center={mapCenter}
                      zoom={12}
                      onClick={handleMapClick}
                      onLoad={onMapLoad}
                    >
                    {formData.latitude && formData.longitude && isMapLoaded && window.google && (
                        <Marker
                          position={{
                            lat: Number(formData.latitude),
                            lng: Number(formData.longitude)
                          }}
                          icon={{
                            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                              <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 2C12.27 2 6 8.27 6 16c0 10.5 14 22 14 22s14-11.5 14-22c0-7.73-6.27-14-14-14z" fill="#27ae60" stroke="#229954" stroke-width="2"/>
                                <circle cx="20" cy="16" r="6" fill="white"/>
                                <text x="20" y="20" text-anchor="middle" font-family="Arial" font-size="12" font-weight="bold" fill="#27ae60">新</text>
                              </svg>
                            `),
                            scaledSize: new window.google.maps.Size(40, 40),
                            anchor: new window.google.maps.Point(20, 40)
                          }}
                        />
                      )}
                    </GoogleMap>
                </ErrorBoundary>
              )}
            </div>

            {/* 位置信息 */}
            {formData.latitude && formData.longitude && (
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1.5rem'
              }}>
                <h3 style={{
                  margin: '0 0 0.5rem 0',
                  color: '#A5C7FF',
                  fontSize: '1.1rem'
                }}>
                  已选择位置
                </h3>
                <p style={{
                  margin: 0,
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '0.9rem'
                }}>
                  纬度: {formData.latitude}<br/>
                  经度: {formData.longitude}
                </p>
              </div>
            )}

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={confirmMapSelection}
                disabled={!formData.latitude || !formData.longitude || !isMapLoaded || !!mapLoadError}
                style={{
                  background: (!formData.latitude || !formData.longitude || !isMapLoaded || !!mapLoadError) ? '#94a3b8' : 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: (!formData.latitude || !formData.longitude || !isMapLoaded || !!mapLoadError) ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(39, 174, 96, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (formData.latitude && formData.longitude && isMapLoaded && !mapLoadError) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(39, 174, 96, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (formData.latitude && formData.longitude && isMapLoaded && !mapLoadError) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(39, 174, 96, 0.3)';
                  }
                }}
              >
                {!isMapLoaded ? '⏳ 加载中...' : mapLoadError ? '❌ 加载失败' : '✅ 确认位置'}
              </button>
              <button
                onClick={() => setShowMapModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                取消
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
      {showStorageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            borderRadius: '20px',
            padding: '30px',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '80vh',
            overflow: 'auto',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              color: 'white'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.8rem', fontWeight: 700 }}>
                  📦 {currentStorageStore ? `${currentStorageStore.store_name} - 入库包裹` : '入库包裹管理'}
                </h2>
                <p style={{ margin: '6px 0 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
                  {currentStorageStore ? `骑手送到 ${currentStorageStore.store_name} 的包裹信息` : '骑手送来的包裹信息'}
                </p>
              </div>
              <button
                onClick={() => setShowStorageModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                ✕ 关闭
              </button>
            </div>

            {/* 统计信息 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📦</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {storagePackages.length}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'white' }}>
                  总包裹数
                </div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🚚</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {new Set(storagePackages.map(pkg => pkg.courier).filter(Boolean)).size}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'white' }}>
                  参与骑手
                </div>
              </div>
              <div style={{
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '12px',
                padding: '16px',
                textAlign: 'center',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '8px' }}>🏪</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white' }}>
                  {storagePackages.filter(pkg => pkg.status === '已送达').length}
                </div>
                <div style={{ fontSize: '0.8rem', opacity: 0.8, color: 'white' }}>
                  已到达中转站
                </div>
              </div>
            </div>

            {/* 包裹列表 */}
            {loadingStorage ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'white',
                opacity: 0.8
              }}>
                <div style={{ fontSize: '2rem', marginBottom: '16px' }}>⏳</div>
                <p>加载包裹信息中...</p>
              </div>
            ) : storagePackages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '40px',
                color: 'white',
                opacity: 0.8
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '16px' }}>📦</div>
                <h3 style={{ margin: '0 0 8px 0' }}>暂无入库包裹</h3>
                <p style={{ margin: 0, opacity: 0.7 }}>
                  {currentStorageStore ? `骑手还没有送包裹到 ${currentStorageStore.store_name}` : '骑手还没有送包裹到这家店铺'}
                </p>
              </div>
            ) : (
              <div style={{
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', color: 'white', fontSize: '1.1rem' }}>
                  📋 入库包裹详情
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {storagePackages.map((pkg) => (
                    <div
                      key={pkg.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        padding: '16px',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '1rem', fontWeight: 600 }}>
                            📦 {pkg.id}
                          </h4>
                          <p style={{ margin: '0', fontSize: '0.85rem', opacity: 0.8 }}>
                            {pkg.sender_name} → {pkg.receiver_name}
                          </p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            background: pkg.status === '已送达' ? 'rgba(72, 187, 120, 0.3)' : 
                                       pkg.status === '待派送' ? 'rgba(255, 193, 7, 0.3)' : 'rgba(160, 174, 192, 0.3)',
                            fontSize: '0.75rem',
                            fontWeight: '500',
                            color: pkg.status === '已送达' ? '#48bb78' : 
                                   pkg.status === '待派送' ? '#ffc107' : '#a0aec0'
                          }}>
                            {pkg.status === '已送达' ? '🏪 已到达中转站' : pkg.status}
                          </span>
                          {pkg.transfer_code && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                generateTransferQRCode(pkg);
                              }}
                              style={{
                                background: 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                                color: 'white',
                                border: 'none',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '0.7rem',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                transition: 'all 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '2px',
                                boxShadow: '0 2px 4px rgba(155, 89, 182, 0.3)'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 4px 6px rgba(155, 89, 182, 0.4)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(155, 89, 182, 0.3)';
                              }}
                            >
                              🔄 中转码
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.8rem', opacity: 0.9 }}>
                        <div>
                          <span style={{ color: '#e53e3e' }}>🚚</span> 骑手: {pkg.courier || '未分配'}
                        </div>
                        <div>
                          <span style={{ color: '#805ad5' }}>📅</span> 送达时间: {pkg.delivery_time ? new Date(pkg.delivery_time).toLocaleString() : '未送达'}
                        </div>
                        <div>
                          <span style={{ color: '#38a169' }}>📏</span> 重量: {pkg.weight}kg
                        </div>
                        <div>
                          <span style={{ color: '#d69e2e' }}>💰</span> 费用: ¥{pkg.price}
                        </div>
                        {pkg.transfer_code && (
                          <div style={{ gridColumn: '1 / -1', marginTop: '4px', padding: '4px 8px', background: 'rgba(155, 89, 182, 0.2)', borderRadius: '4px', border: '1px solid rgba(155, 89, 182, 0.3)' }}>
                            <span style={{ color: '#9b59b6' }}>🔄</span> 中转码: {pkg.transfer_code}
                          </div>
                        )}
                      </div>
                      
                      {pkg.description && (
                        <div style={{
                          marginTop: '8px',
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.05)',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          opacity: 0.8
                        }}>
                          <span style={{ color: '#4299e1' }}>📝</span> 备注: {pkg.description}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 中转码二维码模态框 */}
      {showTransferQRModal && currentTransferPackage && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <h2 style={{
                margin: 0,
                color: '#A5C7FF',
                fontSize: '1.5rem',
                fontWeight: 'bold'
              }}>
                🔄 中转码二维码
              </h2>
              <button
                onClick={() => setShowTransferQRModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 包裹信息 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                包裹信息
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                marginBottom: '1rem'
              }}>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  包裹ID: {currentTransferPackage.id}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#2c5282',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}>
                  中转码: {currentTransferPackage.transfer_code}
                </p>
                <p style={{
                  margin: '0 0 0.5rem 0',
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  寄件人: {currentTransferPackage.sender_name}
                </p>
                <p style={{
                  margin: 0,
                  color: '#666',
                  fontSize: '0.9rem'
                }}>
                  收件人: {currentTransferPackage.receiver_name}
                </p>
              </div>
            </div>

            {/* 二维码显示 */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.1)',
              padding: '1.5rem',
              borderRadius: '15px',
              marginBottom: '1.5rem',
              textAlign: 'center'
            }}>
              <h3 style={{
                margin: '0 0 1rem 0',
                color: '#A5C7FF',
                fontSize: '1.2rem'
              }}>
                中转码二维码
              </h3>
              <div style={{
                background: 'white',
                padding: '1rem',
                borderRadius: '10px',
                display: 'inline-block',
                marginBottom: '1rem'
              }}>
                {transferQRCodeDataUrl ? (
                  <img 
                    src={transferQRCodeDataUrl} 
                    alt="中转码二维码" 
                    style={{
                      width: '200px',
                      height: '200px',
                      borderRadius: '8px',
                      boxShadow: '0 4px 12px rgba(155, 89, 182, 0.3)'
                    }}
                  />
                ) : (
                  <div style={{
                    width: '200px',
                    height: '200px',
                    background: '#f8f9fa',
                    border: '2px dashed #9b59b6',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    正在生成二维码...
                  </div>
                )}
              </div>
              <p style={{
                margin: 0,
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '0.9rem',
                lineHeight: '1.5'
              }}>
                骑手扫描此二维码确认包裹中转<br/>
                中转码: {currentTransferPackage.transfer_code}<br/>
                请妥善保管此中转码
              </p>
            </div>

            {/* 操作按钮 */}
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center'
            }}>
              <button
                onClick={() => {
                  if (transferQRCodeDataUrl) {
                    const link = document.createElement('a');
                    link.href = transferQRCodeDataUrl;
                    link.download = `中转码_${currentTransferPackage.id}_${currentTransferPackage.transfer_code}.png`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                  }
                }}
                disabled={!transferQRCodeDataUrl}
                style={{
                  background: !transferQRCodeDataUrl ? '#94a3b8' : 'linear-gradient(135deg, #9b59b6 0%, #8e44ad 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: !transferQRCodeDataUrl ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  boxShadow: '0 4px 15px rgba(155, 89, 182, 0.3)',
                  transition: 'all 0.3s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
                onMouseOver={(e) => {
                  if (transferQRCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(155, 89, 182, 0.4)';
                  }
                }}
                onMouseOut={(e) => {
                  if (transferQRCodeDataUrl) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(155, 89, 182, 0.3)';
                  }
                }}
              >
                📥 保存二维码
              </button>
              <button
                onClick={() => setShowTransferQRModal(false)}
                style={{
                  background: '#e2e8f0',
                  color: '#4a5568',
                  border: 'none',
                  padding: '1rem 2rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#cbd5e0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#e2e8f0'}
              >
                关闭
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 店铺包裹查看模态框 */}
      {showStorePackagesModal && currentViewStore && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1a365d 0%, #2c5282 100%)',
            padding: '2rem',
            borderRadius: '20px',
            width: '90%',
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* 头部 */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.5rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)'
            }}>
              <div>
                <h2 style={{
                  margin: 0,
                  color: '#A5C7FF',
                  fontSize: '1.5rem',
                  fontWeight: 'bold'
                }}>
                  📦 {currentViewStore.store_name} - 包裹列表
                </h2>
                <p style={{
                  margin: '0.5rem 0 0 0',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem'
                }}>
                  {currentViewStore.store_code} | {storePackages.length} 个包裹
                </p>
              </div>
              <button
                onClick={() => {
                  setShowStorePackagesModal(false);
                  setCurrentViewStore(null);
                  setStorePackages([]);
                }}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  padding: '0.5rem',
                  borderRadius: '50%',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s ease'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                ✕
              </button>
            </div>

            {/* 包裹列表 */}
            {loadingStorePackages ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⏳</div>
                <p>加载包裹数据中...</p>
              </div>
            ) : storePackages.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: 'rgba(255, 255, 255, 0.7)'
              }}>
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📭</div>
                <p style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>暂无包裹数据</p>
                <p style={{ fontSize: '0.9rem', opacity: 0.8 }}>
                  该店铺还没有相关的包裹记录
                </p>
              </div>
            ) : (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '1rem',
                maxHeight: '60vh',
                overflowY: 'auto',
                paddingRight: '0.5rem'
              }}>
                {storePackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '12px',
                      padding: '1rem',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      transition: 'all 0.3s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
                      e.currentTarget.style.transform = 'translateX(4px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                      e.currentTarget.style.transform = 'translateX(0)';
                    }}
                  >
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                      marginBottom: '0.75rem'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginBottom: '0.5rem',
                          flexWrap: 'wrap'
                        }}>
                          <h3 style={{
                            margin: 0,
                            color: '#A5C7FF',
                            fontSize: '1.1rem',
                            fontWeight: 'bold'
                          }}>
                            📦 {pkg.id}
                          </h3>
                          <span style={{
                            padding: '0.25rem 0.75rem',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: '600',
                            background: pkg.status === '已送达' ? 'rgba(72, 187, 120, 0.3)' :
                                       pkg.status === '配送中' ? 'rgba(59, 130, 246, 0.3)' :
                                       pkg.status === '待取件' ? 'rgba(251, 191, 36, 0.3)' :
                                       'rgba(156, 163, 175, 0.3)',
                            color: pkg.status === '已送达' ? '#48bb78' :
                                   pkg.status === '配送中' ? '#3b82f6' :
                                   pkg.status === '待取件' ? '#fbbf24' :
                                   '#9ca3af'
                          }}>
                            {pkg.status}
                          </span>
                          {/* 代收款显示 - 只有合伙店铺下单且需要代收款时才显示 */}
                          {pkg.delivery_store_id && (pkg.cod_amount ? parseFloat(pkg.cod_amount.toString()) : 0) > 0 && (
                            <span style={{
                              padding: '0.25rem 0.75rem',
                              borderRadius: '6px',
                              fontSize: '0.75rem',
                              fontWeight: '600',
                              background: 'rgba(239, 68, 68, 0.3)',
                              color: '#ef4444',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              whiteSpace: 'nowrap'
                            }}>
                              {language === 'zh' ? '代收款' : language === 'en' ? 'COD' : 'ငွေကောက်ခံရမည့်ပမာဏ'}: {(() => {
                                const value = parseFloat(pkg.cod_amount?.toString() || '0');
                                return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
                              })()} MMK
                            </span>
                          )}
                        </div>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '0.75rem',
                          fontSize: '0.9rem',
                          color: 'rgba(255, 255, 255, 0.9)',
                          marginBottom: '0.5rem'
                        }}>
                          <div>
                            <span style={{ opacity: 0.7 }}>店铺名称:</span> {currentViewStore.store_name}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>店铺电话:</span> {currentViewStore.phone}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>收件人:</span> {pkg.receiver_name}
                          </div>
                          <div>
                            <span style={{ opacity: 0.7 }}>电话:</span> {pkg.receiver_phone}
                          </div>
                          <div style={{ gridColumn: '1 / -1' }}>
                            <span style={{ opacity: 0.7 }}>地址:</span> {pkg.receiver_address}
                          </div>
                        </div>
                        {/* 代收款金额 - 突出显示 */}
                        <div style={{
                          marginTop: '0.75rem',
                          padding: '0.85rem 1rem',
                          background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3) 0%, rgba(245, 158, 11, 0.3) 100%)',
                          borderRadius: '8px',
                          border: '2px solid rgba(251, 191, 36, 0.5)',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'stretch',
                            gap: '0.75rem',
                            width: '100%',
                            boxSizing: 'border-box',
                            overflow: 'visible'
                          }}>
                            {/* 左侧：总金额 */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.5rem',
                              flex: '0 0 auto',
                              minWidth: '110px',
                              paddingRight: '0.75rem',
                              borderRight: '1px solid rgba(251, 191, 36, 0.3)',
                              boxSizing: 'border-box'
                            }}>
                              <span style={{
                                fontSize: '1.2rem',
                                fontWeight: 'bold',
                                lineHeight: '1',
                                flexShrink: 0
                              }}>💰</span>
                              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                                <div style={{
                                  fontSize: '0.65rem',
                                  color: 'rgba(255, 255, 255, 0.85)',
                                  marginBottom: '0.15rem',
                                  fontWeight: '500',
                                  lineHeight: '1.2',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {language === 'zh' ? '总金额' : language === 'en' ? 'Total Amount' : 'စုစုပေါင်းငွေ'}
                                </div>
                                <div style={{
                                  fontSize: '0.95rem',
                                  fontWeight: 'bold',
                                  color: '#fbbf24',
                                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                                  lineHeight: '1.2',
                                  letterSpacing: '0.1px',
                                  whiteSpace: 'nowrap',
                                  wordBreak: 'keep-all'
                                }}>
                                  {(() => {
                                    const storeFee = parseFloat(pkg.cod_amount?.toString() || '0');
                                    const deliveryFee = parseFloat(pkg.delivery_fee?.toString() || '0');
                                    const priceValue = parseFloat(pkg.price?.toString() || '0');
                                    // 如果 delivery_fee 为 0，使用 price 作为跑腿费
                                    const actualDeliveryFee = deliveryFee > 0 ? deliveryFee : priceValue;
                                    const total = storeFee + actualDeliveryFee;
                                    const displayValue = total > 0 ? total : parseFloat(pkg.price || '0');
                                    return displayValue % 1 === 0 ? displayValue.toString() : displayValue.toFixed(2).replace(/\.?0+$/, '');
                                  })()} MMK
                                </div>
                              </div>
                            </div>
                            
                            {/* 中间：费用明细 - 横向布局 */}
                            <div style={{
                              display: 'flex',
                              flex: '1',
                              gap: '1rem',
                              justifyContent: 'space-between',
                              alignItems: 'stretch',
                              padding: '0 0.75rem',
                              borderRight: '1px solid rgba(251, 191, 36, 0.3)',
                              minWidth: '280px',
                              maxWidth: '400px',
                              boxSizing: 'border-box'
                            }}>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                flex: '1',
                                minWidth: '110px',
                                maxWidth: '150px',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{
                                  fontSize: '0.65rem',
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontWeight: '500',
                                  lineHeight: '1.2',
                                  marginBottom: '0.1rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {language === 'zh' ? '代收款' : language === 'en' ? 'COD Amount' : 'ငွေကောက်ခံရမည့်ပမာဏ'}
                                </div>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: '#fbbf24',
                                  fontWeight: '700',
                                  lineHeight: '1.3',
                                  letterSpacing: '0.2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {(() => {
                                    const value = parseFloat(pkg.cod_amount?.toString() || '0');
                                    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
                                  })()} MMK
                                </div>
                              </div>
                              <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                                gap: '0.3rem',
                                flex: '1',
                                minWidth: '110px',
                                maxWidth: '150px',
                                boxSizing: 'border-box'
                              }}>
                                <div style={{
                                  fontSize: '0.65rem',
                                  color: 'rgba(255, 255, 255, 0.8)',
                                  fontWeight: '500',
                                  lineHeight: '1.2',
                                  marginBottom: '0.1rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {language === 'zh' ? '跑腿费' : language === 'en' ? 'Delivery Fee' : 'ပို့ဆောင်ခ'}
                                </div>
                                <div style={{
                                  fontSize: '0.85rem',
                                  color: '#3b82f6',
                                  fontWeight: '700',
                                  lineHeight: '1.3',
                                  letterSpacing: '0.2px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis'
                                }}>
                                  {(() => {
                                    const deliveryFee = parseFloat(pkg.delivery_fee?.toString() || '0');
                                    const priceValue = parseFloat(pkg.price?.toString() || '0');
                                    // 如果 delivery_fee 为 0，使用 price 作为跑腿费
                                    const value = deliveryFee > 0 ? deliveryFee : priceValue;
                                    return value % 1 === 0 ? value.toString() : value.toFixed(2).replace(/\.?0+$/, '');
                                  })()} MMK
                                </div>
                              </div>
                            </div>
                            
                            {/* 右侧：支付方式 */}
                            <div style={{
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: 'center',
                              alignItems: 'flex-start',
                              flex: '0 0 auto',
                              minWidth: '90px',
                              maxWidth: '140px',
                              paddingLeft: '0.75rem',
                              boxSizing: 'border-box',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                fontSize: '0.65rem',
                                color: 'rgba(255, 255, 255, 0.85)',
                                marginBottom: '0.2rem',
                                fontWeight: '500',
                                lineHeight: '1.2',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                width: '100%'
                              }}>
                                {language === 'zh' ? '支付方式' : language === 'en' ? 'Payment Method' : 'ငွေပေးချေမှုနည်းလမ်း'}
                              </div>
                              <div style={{
                                fontSize: '0.7rem',
                                fontWeight: '600',
                                color: pkg.payment_method === 'qr' ? '#3b82f6' : '#10b981',
                                padding: '0.2rem 0.5rem',
                                background: pkg.payment_method === 'qr' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                                borderRadius: '6px',
                                border: `1px solid ${pkg.payment_method === 'qr' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                                whiteSpace: 'nowrap',
                                lineHeight: '1.3',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                maxWidth: '100%',
                                boxSizing: 'border-box'
                              }}>
                                {pkg.payment_method === 'qr' 
                                  ? (language === 'zh' ? '📱 二维码支付' : language === 'en' ? '📱 QR Payment' : '📱 QR Code ငွေပေးချေမှု')
                                  : pkg.payment_method === 'cash' 
                                  ? (language === 'zh' ? '💵 现金支付' : language === 'en' ? '💵 Cash Payment' : '💵 ငွေသားငွေပေးချေမှု')
                                  : (language === 'zh' ? '未设置' : language === 'en' ? 'Not Set' : 'မသတ်မှတ်ထားပါ')}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div style={{
                        textAlign: 'right',
                        marginLeft: '1rem',
                        minWidth: '120px'
                      }}>
                        <div style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '0.5rem'
                        }}>
                          {pkg.package_type}
                        </div>
                        <div style={{
                          fontSize: '0.8rem',
                          color: 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '0.5rem'
                        }}>
                          {pkg.weight} kg
                        </div>
                        {pkg.create_time && (
                          <div style={{
                            fontSize: '0.75rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            marginTop: '0.5rem'
                          }}>
                            {new Date(pkg.create_time).toLocaleDateString('zh-CN')}
                          </div>
                        )}
                      </div>
                    </div>
                    {pkg.description && (
                      <div style={{
                        marginTop: '0.75rem',
                        padding: '0.5rem',
                        background: 'rgba(0, 0, 0, 0.2)',
                        borderRadius: '6px',
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.8)'
                      }}>
                        <span style={{ opacity: 0.7 }}>备注:</span> {pkg.description}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 🚀 新增：店铺商品详情弹窗 */}
      {showProductsModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 3000,
          backdropFilter: 'blur(8px)'
        }}>
          <div style={{
            width: '90%',
            maxWidth: '800px',
            background: '#1e293b',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            overflow: 'hidden',
            maxHeight: '85vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
          }}>
            <div style={{
              padding: '24px',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
              color: 'white',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.5rem' }}>🛍️ {viewingStoreName} - 商品列表</h2>
                <p style={{ margin: '4px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>
                  共 {productListCounts.all} 件 · 待审 {productListCounts.pending} · 已完成 {productListCounts.approved} · 已取消 {productListCounts.rejected}
                </p>
              </div>
              <button 
                onClick={() => { setShowProductsModal(false); setViewingStoreId(null); setSelectedAdminProductId(null); }}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  color: 'white',
                  width: '40px',
                  height: '40px',
                  borderRadius: '20px',
                  cursor: 'pointer',
                  fontSize: '1.2rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center'
                }}
              >✕</button>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
              {loadingProducts ? (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    border: '4px solid rgba(255,255,255,0.1)',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 16px'
                  }} />
                  <p style={{ color: 'white' }}>正在加载店铺商品...</p>
                </div>
              ) : storeProducts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px', color: 'rgba(255,255,255,0.4)' }}>
                  <div style={{ fontSize: '4rem', marginBottom: '16px' }}>📦</div>
                  <p style={{ fontSize: '1.2rem' }}>该店铺暂未添加任何商品</p>
                </div>
              ) : (
                <>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap',
                  gap: '10px',
                  marginBottom: '20px'
                }}>
                  {([
                    { key: 'all' as const, label: '全部' },
                    { key: 'pending' as const, label: '待审核' },
                    { key: 'approved' as const, label: '已完成' },
                    { key: 'rejected' as const, label: '已取消' },
                  ]).map(({ key, label }) => {
                    const count = key === 'all' ? productListCounts.all : productListCounts[key];
                    const active = productListFilter === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setProductListFilter(key)}
                        style={{
                          padding: '8px 14px',
                          borderRadius: '10px',
                          border: active ? '2px solid #60a5fa' : '1px solid rgba(255,255,255,0.15)',
                          background: active ? 'rgba(37, 99, 235, 0.4)' : 'rgba(255,255,255,0.06)',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.85rem',
                          fontWeight: 600,
                        }}
                      >
                        {label} <span style={{ opacity: 0.75 }}>({count})</span>
                      </button>
                    );
                  })}
                </div>
                {filteredStoreProducts.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px', color: 'rgba(255,255,255,0.45)' }}>
                    <p style={{ fontSize: '1.1rem', margin: 0 }}>该状态下暂无商品</p>
                    <p style={{ fontSize: '0.85rem', marginTop: '8px', opacity: 0.7 }}>请切换上方状态或等待商家提交</p>
                  </div>
                ) : (
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                  gap: '20px'
                }}>
                  {filteredStoreProducts.map((product) => {
                    const display = adminProductDisplay(product) as typeof product;
                    const isEditPending =
                      normalizeProductListingStatus(product) === 'approved' &&
                      hasPendingProductUpdate(product);
                    return (
                    <div
                      key={product.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedAdminProductId(product.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') setSelectedAdminProductId(product.id);
                      }}
                      style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      transition: 'transform 0.3s ease',
                      cursor: 'pointer',
                    }}
                    onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-3px)'; }}
                    onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                    >
                      <div style={{
                        width: '100%',
                        aspectRatio: '1',
                        borderRadius: '12px',
                        background: '#0f172a',
                        marginBottom: '12px',
                        overflow: 'hidden',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {display.image_url ? (
                          <img src={display.image_url} alt={display.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          <span style={{ fontSize: '2rem' }}>🖼️</span>
                        )}
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '1.1rem', color: 'white' }}>{display.name}</h3>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '1.2rem' }}>{display.price.toLocaleString()} MMK</span>
                        <span style={{ 
                          fontSize: '0.8rem', 
                          padding: '2px 8px', 
                          borderRadius: '6px',
                          background: display.is_available ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                          color: display.is_available ? '#10b981' : '#ef4444'
                        }}>
                          {display.is_available ? '在售' : '下架'}
                        </span>
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{
                          padding: '2px 8px',
                          borderRadius: '6px',
                          background:
                            productNeedsAdminReview(product)
                              ? 'rgba(245, 158, 11, 0.25)'
                              : normalizeProductListingStatus(product) === 'rejected'
                                ? 'rgba(239, 68, 68, 0.25)'
                                : 'rgba(16, 185, 129, 0.2)',
                          color:
                            productNeedsAdminReview(product)
                              ? '#fbbf24'
                              : normalizeProductListingStatus(product) === 'rejected'
                                ? '#f87171'
                                : '#34d399',
                        }}>
                          {isEditPending
                            ? '修改待审'
                            : normalizeProductListingStatus(product) === 'pending'
                            ? '待审核'
                            : normalizeProductListingStatus(product) === 'rejected'
                              ? '已取消'
                              : '已完成'}
                        </span>
                      </div>
                      {isEditPending && (
                        <div style={{ marginTop: '6px', fontSize: '0.72rem', color: 'rgba(251, 191, 36, 0.85)' }}>
                          线上仍显示旧内容，通过后更新为客户可见版本
                        </div>
                      )}
                      {productNeedsAdminReview(product) && (
                        <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            disabled={productListingActionId === product.id}
                            onClick={(e) => { e.stopPropagation(); updateProductListingStatus(product.id, 'approved'); }}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: 'none',
                              cursor: productListingActionId === product.id ? 'wait' : 'pointer',
                              background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
                              color: 'white',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            {productListingActionId === product.id ? '…' : '通过上架'}
                          </button>
                          <button
                            type="button"
                            disabled={productListingActionId === product.id}
                            onClick={(e) => { e.stopPropagation(); updateProductListingStatus(product.id, 'rejected'); }}
                            style={{
                              flex: 1,
                              padding: '8px 10px',
                              borderRadius: '10px',
                              border: '1px solid rgba(248, 113, 113, 0.5)',
                              cursor: productListingActionId === product.id ? 'wait' : 'pointer',
                              background: 'rgba(239, 68, 68, 0.15)',
                              color: '#fca5a5',
                              fontWeight: 700,
                              fontSize: '0.85rem',
                            }}
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      <div style={{ marginTop: '8px', fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)' }}>
                        库存: {display.stock === -1 ? '无限' : display.stock}
                      </div>
                      <div style={{ marginTop: '8px', fontSize: '0.72rem', color: 'rgba(148, 163, 184, 0.9)' }}>
                        点击查看完整信息与变更详情
                      </div>
                    </div>
                    );
                  })}
                </div>
                )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {selectedAdminProduct && createPortal(
        (() => {
          const product = selectedAdminProduct;
          const ls = normalizeProductListingStatus(product);
          const isEditPending = ls === 'approved' && hasPendingProductUpdate(product);
          const changes = buildAdminProductChanges(product);
          const changedCount = changes.filter((c) => c.changed).length;
          const pu = product.pending_update as Record<string, unknown> | null | undefined;
          const submittedAt = typeof pu?.submitted_at === 'string' ? pu.submitted_at : null;

          const renderImageValue = (value: unknown) => {
            const url = typeof value === 'string' ? value : '';
            if (!url) return <span className="admin-product-detail__empty">无</span>;
            return (
              <a href={url} target="_blank" rel="noreferrer" className="admin-product-detail__img-link">
                <img src={url} alt="" className="admin-product-detail__thumb" />
              </a>
            );
          };

          const renderDetailImages = (value: unknown) => {
            const urls = Array.isArray(value) ? value.filter((u) => typeof u === 'string') as string[] : [];
            if (!urls.length) return <span className="admin-product-detail__empty">无</span>;
            return (
              <div className="admin-product-detail__detail-scroll">
                {urls.map((url, idx) => (
                  <a key={`${url}-${idx}`} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="" className="admin-product-detail__detail-thumb" />
                  </a>
                ))}
              </div>
            );
          };

          const renderFieldValue = (key: string, value: unknown) => {
            if (key === 'image_url') return renderImageValue(value);
            if (key === 'detail_image_urls') return renderDetailImages(value);
            if (key === 'variants') {
              return <p className="admin-product-detail__desc">{formatVariantsForDisplay(value)}</p>;
            }
            if (key === 'description') {
              return <p className="admin-product-detail__desc">{formatAdminProductFieldText(key, value)}</p>;
            }
            return <span>{formatAdminProductFieldText(key, value)}</span>;
          };

          return (
            <div
              className="admin-product-detail-overlay"
              role="presentation"
              onClick={(e) => {
                if (e.target === e.currentTarget) setSelectedAdminProductId(null);
              }}
            >
              <div className="admin-product-detail" role="dialog" aria-modal="true" aria-labelledby="admin-product-detail-title">
                <div className="admin-product-detail__head">
                  <div>
                    <h2 id="admin-product-detail-title" className="admin-product-detail__title">{product.name || '商品详情'}</h2>
                    <p className="admin-product-detail__sub">
                      {viewingStoreName} · ID: {product.id}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="admin-product-detail__close"
                    onClick={() => setSelectedAdminProductId(null)}
                    aria-label="关闭"
                  >
                    ×
                  </button>
                </div>

                <div className="admin-product-detail__body">
                  <div className="admin-product-detail__badges">
                    <span className={`admin-product-detail__badge admin-product-detail__badge--${ls}`}>
                      {listingStatusLabel(ls, isEditPending)}
                    </span>
                    {product.is_available ? (
                      <span className="admin-product-detail__badge admin-product-detail__badge--live">在售</span>
                    ) : (
                      <span className="admin-product-detail__badge admin-product-detail__badge--off">下架</span>
                    )}
                    {typeof product.sales_count === 'number' && (
                      <span className="admin-product-detail__badge admin-product-detail__badge--muted">销量 {product.sales_count}</span>
                    )}
                  </div>

                  {changes.length > 0 && (
                    <section className="admin-product-detail__section">
                      <h3 className="admin-product-detail__section-title">
                        {isEditPending
                          ? `商家修改申请（${changedCount} 项变更）`
                          : ls === 'pending'
                            ? '新商品待审内容'
                            : '变更记录'}
                      </h3>
                      {submittedAt && (
                        <p className="admin-product-detail__hint">
                          提交时间：{new Date(submittedAt).toLocaleString('zh-CN')}
                        </p>
                      )}
                      <div className={`admin-product-detail__diff-table${changes[0]?.isNewProduct ? ' admin-product-detail__diff-table--new' : ''}`}>
                        <div className="admin-product-detail__diff-row admin-product-detail__diff-row--head">
                          <span>字段</span>
                          {!changes[0]?.isNewProduct && <span>线上现值</span>}
                          <span>{changes[0]?.isNewProduct ? '提交内容' : '商家申请改为'}</span>
                        </div>
                        {changes.map((row) => (
                          <div
                            key={row.key}
                            className={`admin-product-detail__diff-row${row.changed ? ' is-changed' : ''}`}
                          >
                            <span className="admin-product-detail__diff-label">
                              {row.label}
                              {row.changed && <em>已改</em>}
                            </span>
                            {!row.isNewProduct && (
                              <div className="admin-product-detail__diff-cell">{renderFieldValue(row.key, row.before)}</div>
                            )}
                            <div className="admin-product-detail__diff-cell admin-product-detail__diff-cell--after">
                              {renderFieldValue(row.key, row.after)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  )}

                  <section className="admin-product-detail__section">
                    <h3 className="admin-product-detail__section-title">
                      {isEditPending ? '线上当前版本（客户可见）' : '商品完整信息'}
                    </h3>
                    <div className="admin-product-detail__grid">
                      {ADMIN_PRODUCT_DIFF_KEYS.map((key) => (
                        <div key={key} className="admin-product-detail__field">
                          <div className="admin-product-detail__field-label">{ADMIN_PRODUCT_FIELD_LABELS[key]}</div>
                          <div className="admin-product-detail__field-value">{renderFieldValue(key, product[key])}</div>
                        </div>
                      ))}
                      <div className="admin-product-detail__field">
                        <div className="admin-product-detail__field-label">审核状态</div>
                        <div className="admin-product-detail__field-value">{listingStatusLabel(ls, isEditPending)}</div>
                      </div>
                      {product.created_at && (
                        <div className="admin-product-detail__field">
                          <div className="admin-product-detail__field-label">创建时间</div>
                          <div className="admin-product-detail__field-value">
                            {new Date(product.created_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      )}
                      {product.updated_at && (
                        <div className="admin-product-detail__field">
                          <div className="admin-product-detail__field-label">更新时间</div>
                          <div className="admin-product-detail__field-value">
                            {new Date(product.updated_at).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {isEditPending && (
                    <section className="admin-product-detail__section">
                      <h3 className="admin-product-detail__section-title">通过后客户将看到（预览）</h3>
                      <div className="admin-product-detail__grid">
                        {ADMIN_PRODUCT_DIFF_KEYS.map((key) => {
                          const previewVal = pu?.[key] !== undefined ? pu[key] : product[key];
                          return (
                            <div key={`preview-${key}`} className="admin-product-detail__field">
                              <div className="admin-product-detail__field-label">{ADMIN_PRODUCT_FIELD_LABELS[key]}</div>
                              <div className="admin-product-detail__field-value">{renderFieldValue(key, previewVal)}</div>
                            </div>
                          );
                        })}
                      </div>
                    </section>
                  )}
                </div>

                <div className="admin-product-detail__foot">
                  {productNeedsAdminReview(product) && (
                    <>
                      <button
                        type="button"
                        className="admin-product-detail__btn admin-product-detail__btn--approve"
                        disabled={productListingActionId === product.id}
                        onClick={async () => {
                          await updateProductListingStatus(product.id, 'approved');
                        }}
                      >
                        {productListingActionId === product.id ? '处理中…' : '通过'}
                      </button>
                      <button
                        type="button"
                        className="admin-product-detail__btn admin-product-detail__btn--reject"
                        disabled={productListingActionId === product.id}
                        onClick={async () => {
                          await updateProductListingStatus(product.id, 'rejected');
                        }}
                      >
                        拒绝
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className="admin-product-detail__btn admin-product-detail__btn--ghost"
                    onClick={() => setSelectedAdminProductId(null)}
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          );
        })(),
        document.body
      )}

      <ProductImageEditorModal
        file={adminImageEditorFile}
        defaultPresetId={adminImageEditorTarget === 'detail' ? 'portrait' : 'square'}
        language="zh"
        theme="light"
        onCancel={handleAdminImageEditorCancel}
        onConfirm={handleAdminImageEditorConfirm}
      />

    </>
  );
};

export default DeliveryStoreOverlays;
