import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import CreateCrossBorderAccountModal from './CreateCrossBorderAccountModal';
import CreateSalespersonModal from './CreateSalespersonModal';
import {
  deleteCrossBorderAccount,
  deleteCrossBorderSalesperson,
  fetchCrossBorderSalespersons,
  type CreateCrossBorderAccountResult,
  type CrossBorderSalesperson,
  type DeleteCrossBorderAccountResult,
  type InventoryTransitStore,
  type UpdateCrossBorderAccountResult,
} from '../services/inventoryConsoleService';
import { CROSS_BORDER_HUBS } from '../utils/crossBorderHubs';
import {
  compareSalespersonEmployeeCodes,
  formatSalespersonEmployeeCodeDisplay,
} from '../utils/crossBorderSalespersons';
import '../styles/crossBorderLogistics.css';

type Props = {
  open: boolean;
  onClose: () => void;
  stores: InventoryTransitStore[];
  isEn: boolean;
  onCreated: (result: CreateCrossBorderAccountResult) => void;
  onUpdated?: (result: UpdateCrossBorderAccountResult) => void;
  onDeleted?: (result: DeleteCrossBorderAccountResult) => void;
};

type TabId = 'accounts' | 'salespersons';

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
  onDeleted,
}) => {
  const [activeTab, setActiveTab] = useState<TabId>('accounts');
  const [showCreate, setShowCreate] = useState(false);
  const [editStoreCode, setEditStoreCode] = useState<string | null>(null);
  const [deletingCode, setDeletingCode] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [salespersons, setSalespersons] = useState<CrossBorderSalesperson[]>([]);
  const [salespersonsLoading, setSalespersonsLoading] = useState(false);
  const [showCreateSalesperson, setShowCreateSalesperson] = useState(false);
  const [editSalespersonId, setEditSalespersonId] = useState<string | null>(null);
  const [deletingSalespersonId, setDeletingSalespersonId] = useState<string | null>(null);

  const accountFormOpen = showCreate || Boolean(editStoreCode);
  const salespersonFormOpen = showCreateSalesperson || Boolean(editSalespersonId);
  const nestedFormOpen = accountFormOpen || salespersonFormOpen;

  const loadSalespersons = useCallback(async () => {
    setSalespersonsLoading(true);
    try {
      const rows = await fetchCrossBorderSalespersons();
      setSalespersons(rows);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : isEn ? 'Load failed' : '加载失败');
    } finally {
      setSalespersonsLoading(false);
    }
  }, [isEn]);

  useEffect(() => {
    if (!open) return;
    setActiveTab('accounts');
    setActionError(null);
    void loadSalespersons();
  }, [open, loadSalespersons]);

  if (!open) return null;

  const handleCreated = (result: CreateCrossBorderAccountResult) => {
    onCreated(result);
    setShowCreate(false);
  };

  const handleUpdated = (result: UpdateCrossBorderAccountResult) => {
    onUpdated?.(result);
    setEditStoreCode(null);
  };

  const handleDelete = async (store: InventoryTransitStore) => {
    const confirmMessage = isEn
      ? `Confirm delete account "${store.store_name}" (${store.store_code})?\n\nThis cannot be undone. The transit station and Inventory App login will be removed.`
      : `确认删除账号「${store.store_name}」（${store.store_code}）吗？\n\n此操作不可撤销，将删除该中转站及 Inventory App 登录权限。`;
    if (!window.confirm(confirmMessage)) return;

    setActionError(null);
    setDeletingCode(store.store_code);
    try {
      const result = await deleteCrossBorderAccount(store.store_code);
      if (editStoreCode === store.store_code) {
        setEditStoreCode(null);
      }
      onDeleted?.(result);
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : isEn ? 'Delete failed' : '删除失败');
    } finally {
      setDeletingCode(null);
    }
  };

  const handleSalespersonCreated = (row: CrossBorderSalesperson) => {
    setSalespersons((prev) =>
      [...prev, row].sort((a, b) => compareSalespersonEmployeeCodes(a.employee_code, b.employee_code)),
    );
    setShowCreateSalesperson(false);
  };

  const handleSalespersonUpdated = (row: CrossBorderSalesperson) => {
    setSalespersons((prev) => prev.map((item) => (item.id === row.id ? row : item)));
    setEditSalespersonId(null);
  };

  const handleDeleteSalesperson = async (row: CrossBorderSalesperson) => {
    const confirmMessage = isEn
      ? `Confirm delete salesperson "${row.name}" (${formatSalespersonEmployeeCodeDisplay(row.employee_code)})?\n\nThis cannot be undone.`
      : `确认删除推销员「${row.name}」（${formatSalespersonEmployeeCodeDisplay(row.employee_code)}）吗？\n\n此操作不可撤销。`;
    if (!window.confirm(confirmMessage)) return;

    setActionError(null);
    setDeletingSalespersonId(row.id);
    try {
      await deleteCrossBorderSalesperson(row.id);
      if (editSalespersonId === row.id) {
        setEditSalespersonId(null);
      }
      setSalespersons((prev) => prev.filter((item) => item.id !== row.id));
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : isEn ? 'Delete failed' : '删除失败');
    } finally {
      setDeletingSalespersonId(null);
    }
  };

  return createPortal(
    <>
      <div
        className="store-form-overlay cbl-account-mgmt-overlay"
        role="presentation"
        onClick={(e) => {
          if (e.target === e.currentTarget && !nestedFormOpen) onClose();
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
                  ? 'Transit station accounts and company salesperson records.'
                  : '中转站 Inventory App 登录账号与公司推销员档案。'}
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

          <div className="cbl-account-mgmt-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'accounts'}
              className={`cbl-account-mgmt-tabs__btn${activeTab === 'accounts' ? ' cbl-account-mgmt-tabs__btn--on' : ''}`}
              onClick={() => setActiveTab('accounts')}
            >
              {isEn ? 'Transit accounts' : '跨境账号'}
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'salespersons'}
              className={`cbl-account-mgmt-tabs__btn${activeTab === 'salespersons' ? ' cbl-account-mgmt-tabs__btn--on' : ''}`}
              onClick={() => setActiveTab('salespersons')}
            >
              {isEn ? 'Salespersons' : '推销员'}
            </button>
          </div>

          <div className="cbl-account-mgmt-modal__toolbar">
            {activeTab === 'accounts' ? (
              <>
                <button
                  type="button"
                  className="cbl-btn cbl-btn--primary"
                  onClick={() => setShowCreate(true)}
                >
                  {isEn ? '+ Add account' : '+ 添加跨境账号'}
                </button>
                <span className="cbl-account-mgmt-modal__count">
                  {isEn ? `${stores.length} account(s)` : `共 ${stores.length} 个账号`}
                </span>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="cbl-btn cbl-btn--primary"
                  onClick={() => setShowCreateSalesperson(true)}
                >
                  {isEn ? '+ Create salesperson' : '+ 创建推销员'}
                </button>
                <span className="cbl-account-mgmt-modal__count">
                  {isEn ? `${salespersons.length} salesperson(s)` : `共 ${salespersons.length} 位推销员`}
                </span>
              </>
            )}
          </div>

          {actionError ? (
            <div className="cbl-alert cbl-alert--error cbl-account-mgmt-modal__alert">
              {actionError}
            </div>
          ) : null}

          <div className="cbl-account-mgmt-modal__body">
            {activeTab === 'accounts' ? (
              stores.length ? (
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
                            <div className="cbl-table--accounts__actions">
                              <button
                                type="button"
                                className="cbl-btn cbl-btn--sm cbl-table--accounts__edit"
                                onClick={() => setEditStoreCode(store.store_code)}
                                disabled={Boolean(deletingCode)}
                              >
                                {isEn ? 'Edit' : '编辑'}
                              </button>
                              <button
                                type="button"
                                className="cbl-btn cbl-btn--sm cbl-table--accounts__delete"
                                onClick={() => void handleDelete(store)}
                                disabled={deletingCode === store.store_code}
                              >
                                {deletingCode === store.store_code
                                  ? isEn
                                    ? 'Deleting…'
                                    : '删除中…'
                                  : isEn
                                    ? 'Delete'
                                    : '删除'}
                              </button>
                            </div>
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
              )
            ) : salespersonsLoading ? (
              <div className="cbl-empty">{isEn ? 'Loading…' : '加载中…'}</div>
            ) : salespersons.length ? (
              <div className="cbl-table-wrap">
                <table className="cbl-table cbl-table--accounts">
                  <thead>
                    <tr>
                      <th>{isEn ? 'Employee code' : '员工编码'}</th>
                      <th>{isEn ? 'Name' : '名称'}</th>
                      <th>{isEn ? 'Work area' : '工作区域'}</th>
                      <th>{isEn ? 'Phone' : '手机'}</th>
                      <th>{isEn ? 'Join date' : '入职日期'}</th>
                      <th>{isEn ? 'Status' : '状态'}</th>
                      <th>{isEn ? 'Actions' : '操作'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salespersons.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <span className="cbl-code">{formatSalespersonEmployeeCodeDisplay(row.employee_code)}</span>
                        </td>
                        <td>{row.name}</td>
                        <td>
                          {hubLabel(row.region_id, isEn)}
                          <span className="cbl-dim"> · {row.work_area_code}</span>
                        </td>
                        <td>{row.phone || '—'}</td>
                        <td className="cbl-dim">{formatDate(row.join_date, isEn)}</td>
                        <td>
                          <span
                            className={
                              row.status === 'active'
                                ? 'cbl-badge cbl-badge--green'
                                : 'cbl-badge cbl-badge--gray'
                            }
                          >
                            {row.status === 'active'
                              ? isEn
                                ? 'Active'
                                : '在职'
                              : isEn
                                ? 'Inactive'
                                : '离职'}
                          </span>
                        </td>
                        <td>
                          <div className="cbl-table--accounts__actions">
                            <button
                              type="button"
                              className="cbl-btn cbl-btn--sm cbl-table--accounts__edit"
                              onClick={() => setEditSalespersonId(row.id)}
                              disabled={Boolean(deletingSalespersonId)}
                            >
                              {isEn ? 'Edit' : '编辑'}
                            </button>
                            <button
                              type="button"
                              className="cbl-btn cbl-btn--sm cbl-table--accounts__delete"
                              onClick={() => void handleDeleteSalesperson(row)}
                              disabled={deletingSalespersonId === row.id}
                            >
                              {deletingSalespersonId === row.id
                                ? isEn
                                  ? 'Deleting…'
                                  : '删除中…'
                                : isEn
                                  ? 'Delete'
                                  : '删除'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="cbl-empty">
                {isEn
                  ? 'No salespersons yet. Click「+ Create salesperson」to add one.'
                  : '暂无推销员，请点击「+ 创建推销员」添加。'}
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

      <CreateSalespersonModal
        open={salespersonFormOpen}
        onClose={() => {
          setShowCreateSalesperson(false);
          setEditSalespersonId(null);
        }}
        existingSalespersons={salespersons}
        onCreated={handleSalespersonCreated}
        editId={showCreateSalesperson ? null : editSalespersonId}
        onUpdated={handleSalespersonUpdated}
      />
    </>,
    document.body,
  );
};

export default CrossBorderAccountManagementModal;
