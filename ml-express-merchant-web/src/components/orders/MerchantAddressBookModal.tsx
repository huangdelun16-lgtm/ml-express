import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  addressService,
  type AddressItem,
} from '../../services/addressService';
import { feedbackService } from '../../services/FeedbackService';
import './merchantAddressBookModal.css';

export type AddressBookSide = 'sender' | 'receiver';

export interface AddressBookSeed {
  contact_name?: string;
  contact_phone?: string;
  address_text?: string;
  latitude?: number;
  longitude?: number;
}

interface MerchantAddressBookModalProps {
  open: boolean;
  userId?: string;
  language: string;
  side: AddressBookSide;
  seed?: AddressBookSeed;
  onClose: () => void;
  onSelect: (item: AddressItem) => void;
}

type FormState = {
  label: string;
  contact_name: string;
  contact_phone: string;
  address_text: string;
  latitude?: number;
  longitude?: number;
  is_default: boolean;
};

const EMPTY_FORM: FormState = {
  label: '',
  contact_name: '',
  contact_phone: '',
  address_text: '',
  is_default: false,
};

const LABEL_KEYS = [
  { key: '家', zh: '家', en: 'Home', my: 'အိမ်' },
  { key: '公司', zh: '公司', en: 'Office', my: 'ရုံး' },
  { key: '其它', zh: '其它', en: 'Other', my: 'အခြား' },
] as const;

function copy(language: string) {
  if (language === 'en') {
    return {
      titleSender: 'Saved sender address',
      titleReceiver: 'Saved receiver address',
      hint: 'Same address book as the merchant app',
      add: 'Add address',
      saveCurrent: 'Save current fields',
      emptyTitle: 'No saved addresses',
      emptyBody: 'Add one, or save the fields you already typed.',
      select: 'Use this address',
      edit: 'Edit',
      delete: 'Delete',
      confirmDelete: 'Delete this address?',
      label: 'Label',
      name: 'Contact name',
      phone: 'Phone',
      address: 'Address',
      default: 'Set as default',
      save: 'Save',
      cancel: 'Cancel',
      editTitle: 'Edit address',
      addTitle: 'New address',
      needUser: 'Please sign in first',
      needFields: 'Name, phone and address are required',
      saveOk: 'Address saved',
      deleteOk: 'Address deleted',
      saveFail: 'Could not save address',
      deleteFail: 'Could not delete address',
    };
  }
  if (language === 'my') {
    return {
      titleSender: 'ပို့သူ လိပ်စာစာအုပ်',
      titleReceiver: 'လက်ခံသူ လိပ်စာစာအုပ်',
      hint: 'အက်ပ်နှင့် တူညီသော လိပ်စာစာအုပ်',
      add: 'လိပ်စာထည့်ရန်',
      saveCurrent: 'ယခုဖြည့်ထားသည်ကို သိမ်းရန်',
      emptyTitle: 'သိမ်းထားသော လိပ်စာမရှိပါ',
      emptyBody: 'အသစ်ထည့်ပါ၊ သို့မဟုတ် ယခုဖြည့်ထားသည်ကို သိမ်းပါ။',
      select: 'ဤလိပ်စာကို သုံးရန်',
      edit: 'ပြင်ရန်',
      delete: 'ဖျက်ရန်',
      confirmDelete: 'ဤလိပ်စာကို ဖျက်မလား?',
      label: 'အမည်တပ်ရန်',
      name: 'အမည်',
      phone: 'ဖုန်း',
      address: 'လိပ်စာ',
      default: 'မူလလိပ်စာ',
      save: 'သိမ်းရန်',
      cancel: 'မလုပ်တော့ပါ',
      editTitle: 'လိပ်စာပြင်ရန်',
      addTitle: 'လိပ်စာအသစ်',
      needUser: 'အရင်ဝင်ရောက်ပါ',
      needFields: 'အမည်၊ ဖုန်းနှင့် လိပ်စာ လိုအပ်သည်',
      saveOk: 'သိမ်းပြီးပါပြီ',
      deleteOk: 'ဖျက်ပြီးပါပြီ',
      saveFail: 'သိမ်း၍မရပါ',
      deleteFail: 'ဖျက်၍မရပါ',
    };
  }
  return {
    titleSender: '常用寄件地址',
    titleReceiver: '常用收件地址',
    hint: '与商家 App 共用同一份地址簿',
    add: '添加地址',
    saveCurrent: '保存当前填写',
    emptyTitle: '还没有常用地址',
    emptyBody: '可以新增，或把当前已填的姓名、电话、地址存下来。',
    select: '使用此地址',
    edit: '编辑',
    delete: '删除',
    confirmDelete: '确定删除这个地址？',
    label: '标签',
    name: '联系人',
    phone: '电话',
    address: '详细地址',
    default: '设为默认地址',
    save: '保存',
    cancel: '取消',
    editTitle: '编辑地址',
    addTitle: '新增地址',
    needUser: '请先登录',
    needFields: '请填写姓名、电话和地址',
    saveOk: '地址已保存',
    deleteOk: '地址已删除',
    saveFail: '保存失败',
    deleteFail: '删除失败',
  };
}

const MerchantAddressBookModal: React.FC<MerchantAddressBookModalProps> = ({
  open,
  userId,
  language,
  side,
  seed,
  onClose,
  onSelect,
}) => {
  const t = useMemo(() => copy(language), [language]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addresses, setAddresses] = useState<AddressItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const loadAddresses = useCallback(async () => {
    if (!userId) {
      setAddresses([]);
      return;
    }
    setLoading(true);
    const data = await addressService.getAddresses(userId);
    setAddresses(data);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!open) {
      setShowForm(false);
      setEditingId(null);
      setForm(EMPTY_FORM);
      return;
    }
    void loadAddresses();
  }, [open, loadAddresses]);

  if (!open) return null;

  const openAdd = (fromSeed: boolean) => {
    const next: FormState = {
      label: '',
      contact_name: fromSeed ? seed?.contact_name?.trim() || '' : '',
      contact_phone: fromSeed ? seed?.contact_phone?.trim() || '' : '',
      address_text: fromSeed ? seed?.address_text?.trim() || '' : '',
      latitude: fromSeed ? seed?.latitude : undefined,
      longitude: fromSeed ? seed?.longitude : undefined,
      is_default: addresses.length === 0,
    };
    setEditingId(null);
    setForm(next);
    setShowForm(true);
  };

  const openEdit = (item: AddressItem, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingId(item.id || null);
    setForm({
      label: item.label || '',
      contact_name: item.contact_name || '',
      contact_phone: item.contact_phone || '',
      address_text: item.address_text || '',
      latitude: item.latitude,
      longitude: item.longitude,
      is_default: Boolean(item.is_default),
    });
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!userId) {
      feedbackService.notify(t.needUser);
      return;
    }
    if (!form.contact_name.trim() || !form.contact_phone.trim() || !form.address_text.trim()) {
      feedbackService.notify(t.needFields);
      return;
    }
    setSaving(true);
    const payload: AddressItem = {
      user_id: userId,
      label: form.label.trim() || (language === 'en' ? 'Other' : language === 'my' ? 'အခြား' : '其它'),
      contact_name: form.contact_name.trim(),
      contact_phone: form.contact_phone.trim(),
      address_text: form.address_text.trim(),
      latitude: form.latitude,
      longitude: form.longitude,
      is_default: form.is_default,
    };
    const result = editingId
      ? await addressService.updateAddress(editingId, payload)
      : await addressService.addAddress(payload);
    setSaving(false);
    if (!result.success) {
      feedbackService.notify(t.saveFail);
      return;
    }
    feedbackService.notify(t.saveOk);
    setShowForm(false);
    setEditingId(null);
    await loadAddresses();
  };

  const handleDelete = async (id: string, event: React.MouseEvent) => {
    event.stopPropagation();
    if (!window.confirm(t.confirmDelete)) return;
    const result = await addressService.deleteAddress(id);
    if (!result.success) {
      feedbackService.notify(t.deleteFail);
      return;
    }
    feedbackService.notify(t.deleteOk);
    await loadAddresses();
  };

  const labelText = (key: string) => {
    const found = LABEL_KEYS.find((item) => item.key === key);
    if (!found) return key;
    if (language === 'en') return found.en;
    if (language === 'my') return found.my;
    return found.zh;
  };

  return (
    <div className="mab-overlay" onClick={onClose} role="presentation">
      <div
        className="mab-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mab-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mab-header">
          <div>
            <h2 id="mab-title">
              {side === 'sender' ? t.titleSender : t.titleReceiver}
            </h2>
            <p>{t.hint}</p>
          </div>
          <button type="button" className="mab-close" onClick={onClose} aria-label={t.cancel}>
            ×
          </button>
        </div>
        <div className="mab-body">
          {showForm ? (
            <div className="mab-form">
              <label>{t.label}</label>
              <div className="mab-chips">
                {LABEL_KEYS.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`mab-chip${form.label === item.key ? ' is-on' : ''}`}
                    onClick={() => setForm((prev) => ({ ...prev, label: item.key }))}
                  >
                    {labelText(item.key)}
                  </button>
                ))}
              </div>
              <label htmlFor="mab-name">{t.name} *</label>
              <input
                id="mab-name"
                className="mab-input"
                value={form.contact_name}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_name: e.target.value }))}
              />
              <label htmlFor="mab-phone">{t.phone} *</label>
              <input
                id="mab-phone"
                className="mab-input"
                type="tel"
                value={form.contact_phone}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_phone: e.target.value }))}
              />
              <label htmlFor="mab-addr">{t.address} *</label>
              <textarea
                id="mab-addr"
                className="mab-textarea"
                value={form.address_text}
                onChange={(e) => setForm((prev) => ({ ...prev, address_text: e.target.value }))}
              />
              <label className="mab-check">
                <input
                  type="checkbox"
                  checked={form.is_default}
                  onChange={(e) => setForm((prev) => ({ ...prev, is_default: e.target.checked }))}
                />
                {t.default}
              </label>
              <div className="mab-form-actions">
                <button
                  type="button"
                  className="mab-btn mab-btn-ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                  }}
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  className="mab-btn mab-btn-primary"
                  disabled={saving}
                  onClick={() => void handleSave()}
                >
                  {saving ? '…' : t.save}
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="mab-toolbar">
                <button type="button" className="mab-btn mab-btn-primary" onClick={() => openAdd(false)}>
                  {t.add}
                </button>
                <button type="button" className="mab-btn mab-btn-ghost" onClick={() => openAdd(true)}>
                  {t.saveCurrent}
                </button>
              </div>
              {loading ? (
                <div className="mab-empty">…</div>
              ) : addresses.length === 0 ? (
                <div className="mab-empty">
                  <strong>{t.emptyTitle}</strong>
                  {t.emptyBody}
                </div>
              ) : (
                addresses.map((item) => (
                  <div key={item.id} className="mab-card">
                    <div className="mab-card-top">
                      <span className="mab-label">{labelText(item.label)}</span>
                      {item.is_default ? <span className="mab-default">DEFAULT</span> : null}
                    </div>
                    <p className="mab-meta">
                      {item.contact_name} · {item.contact_phone}
                    </p>
                    <p className="mab-addr">{item.address_text}</p>
                    <div className="mab-card-actions">
                      <button
                        type="button"
                        className="mab-btn mab-btn-primary"
                        onClick={() => onSelect(item)}
                      >
                        {t.select}
                      </button>
                      <button
                        type="button"
                        className="mab-btn mab-btn-ghost"
                        onClick={(event) => openEdit(item, event)}
                      >
                        {t.edit}
                      </button>
                      {item.id ? (
                        <button
                          type="button"
                          className="mab-btn mab-btn-danger"
                          onClick={(event) => void handleDelete(item.id!, event)}
                        >
                          {t.delete}
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MerchantAddressBookModal;
