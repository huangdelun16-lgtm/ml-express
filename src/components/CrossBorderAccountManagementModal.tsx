import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import CreateCrossBorderAccountModal from './CreateCrossBorderAccountModal';
import {
  type CreateCrossBorderAccountResult,
  type InventoryTransitStore,
  type UpdateCrossBorderAccountResult,
} from '../services/inventoryConsoleService';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  stores: InventoryTransitStore[];
  isEn: boolean;
  onCreated: (result: CreateCrossBorderAccountResult) => void;
  onUpdated?: (result: UpdateCrossBorderAccountResult) => void;
};

function hubLabel(regionId: string | undefined, isEn: boolean): string {
  const hub = CROSS_BORDER_HUBS.find((h) => h.regionId === regionId);
  if (!hub) return regionId || '—';
  return isEn ? hub.nameEn : hub.nameZh;
}

function formatDate(value?: string | null, isEn = false): string {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString(isEn ? 'en-US' : 'zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return value;
  }
}

const CrossBorderAccountManagementModal: React.FC<Props> = ({
  open,
  onClose,
  stores,
  isEn,
  onCreated,
  onUpdated,
}) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editStoreCode, setEditStoreCode] = useState<string | null>(null);

  const accountFormOpen = showCreate || Boolean(editStoreCode);

  if (!open) return null;

  const handleCreated = (result: CreateCrossBorderAccountResult) => {
    onCreated(result);
    setShowCreate(false);
  };

  const handleUpdated = (result: UpdateCrossBorderAccountResult) => {
    onUpdated?.(result);
    setEditStoreCode(null);
  };

  return createPortal(
    <>
      <div
        className="store-form-overlay cbl-account-mgmt-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !accountFormOpen) onClose();
        }}
      >
        <div
          className="store-form-modal cbl-account-mgmt-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cbl-account-mgmt-title"
        >
          <div className="cbl-account-mgmt-modal__head">
            <div>
              <h2 id="cbl-account-mgmt-title" className="cbl-account-mgmt-modal__title">
                {isEn ? 'Cross-border accounts' : '跨境账号管理'}
              </h2>
              <p className="cbl-account-mgmt-modal__sub">
                {isEn
                  ? 'Inventory App login accounts for transit stations.'
                  : '中转站 Inventory App 登录账号，站点人员使用店铺代码 + 密码登录。'}
              </p>
            </div>
            <button
              type="button"
              className="cbl-create-modal__close"
              aria-label={isEn ? 'Close' : '关闭'}
              onClick={onClose}
            >
              ×
            </button>
          </div>

          <div className="cbl-account-mgmt-modal__toolbar">
            <button
              type="button"
              className="cbl-btn cbl-btn--primary"
              onClick={() => setShowCreate(true)}
            >
              {isEn ? '+ Add account' : '+ 添加跨境账号'}
            </button>
            <span className="cbl-account-mgmt-modal__count">
              {isEn
                ? `${stores.length} account(s)`
                : `共 ${stores.length} 个账号`}
            </span>
          </div>

          <div className="cbl-account-mgmt-modal__body">
            {stores.length ? (
              <div className="cbl-table-wrap">
                <table className="cbl-table cbl-table--accounts">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Login code' : '登录代码'}</th>
                      <th>{isEn ? 'Name' : '名称'}</th>
                      <th>{isEn ? 'Region' : '区域'}</th>
                      <th>{isEn ? 'Status' : '状态'}</th>
                      <th>{isEn ? 'Created' : '创建时间'}</th>
                      <th>{isEn ? 'Actions' : '操作'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stores.map((store) => (
                      <tr key={store.id}>
                        <td>
                          <span className="cbl-code">{store.store_code}</span>
                        </td>
                        <td>{store.store_name}</td>
                        <td>{hubLabel(store.region, isEn)}</td>
                        <td>
                          <span
                            className={
                              store.status === 'active'
                                ? 'cbl-badge cbl-badge--green'
                                : 'cbl-badge cbl-badge--gray'
                            }
                          >
                            {store.status === 'active'
                              ? isEn
                                ? 'Active'
                                : '启用'
                              : store.status === 'inactive'
                                ? isEn
                                  ? 'Inactive'
                                  : '停用'
                                : store.status || '—'}
                          </span>
                        </td>
                        <td className="cbl-dim">{formatDate(store.created_at, isEn)}</td>
                        <td>
                          <button
                            type="button"
                            className="cbl-btn cbl-btn--sm cbl-table--accounts__edit"
                            onClick={() => setEditStoreCode(store.store_code)}
                          >
                            {isEn ? 'Edit' : '编辑'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cbl-empty">
                {isEn
                  ? 'No accounts yet. Click「+ Add account」to create one.'
                  : '暂无跨境账号，请点击「+ 添加跨境账号」创建。'}
              </div>
            )}
          </div>
        </div>
      </div>

      <CreateCrossBorderAccountModal
        open={accountFormOpen}
        onClose={() => {
          setShowCreate(false);
          setEditStoreCode(null);
        }}
        existingStores={stores}
        onCreated={handleCreated}
        editStoreCode={showCreate ? null : editStoreCode}
        onUpdated={handleUpdated}
      />
    </>,
    document.body,
  );
};

export default CrossBorderAccountManagementModal;
