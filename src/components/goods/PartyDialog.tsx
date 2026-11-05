import { useEffect, useRef, useState } from 'react';
import type { GoodsParty } from '../../services/goodsTradeService';
import type { Copy } from './helpers';
import { dialogFoot } from './styles';
import { Dialog, Field, useDialogKeys } from './ui';

export function PartyDialog({
  t,
  busy,
  kind,
  party,
  error,
  onClose,
  onSave,
}: {
  t: Copy;
  busy: boolean;
  kind: 'supplier' | 'customer';
  party?: GoodsParty;
  error: string;
  onClose: () => void;
  onSave: (input: { id?: string; name: string; phone: string; note: string }) => Promise<boolean>;
}) {
  const [name, setName] = useState(party?.name || '');
  const [phone, setPhone] = useState(party?.phone || '');
  const [note, setNote] = useState(party?.note || '');
  const [localError, setLocalError] = useState('');
  const nameRef = useRef<HTMLInputElement>(null);
  useDialogKeys(onClose);
  useEffect(() => { nameRef.current?.focus(); }, []);
  const title = kind === 'supplier'
    ? (party ? t('修改供应商', 'Edit supplier', 'ပြင်') : t('添加供应商', 'Add supplier', 'ထည့်'))
    : (party ? t('修改客户', 'Edit customer', 'ပြင်') : t('添加客户', 'Add customer', 'ထည့်'));
  const submit = () => {
    if (!name.trim()) {
      setLocalError(kind === 'supplier' ? t('请填写供应商', 'Enter a supplier', 'အမည်ထည့်ပါ') : t('请填写客户', 'Enter a customer', 'အမည်ထည့်ပါ'));
      return;
    }
    setLocalError('');
    void onSave({ id: party?.id, name, phone, note });
  };
  return (
    <Dialog
      title={title}
      eyebrow={kind === 'supplier' ? 'SUPPLIER' : 'CUSTOMER'}
      onClose={onClose}
      footer={(
        <div style={{ ...dialogFoot, marginTop: 0, borderTop: 0, paddingTop: 0 }}>
          <button type="button" className="gd-ghost" onClick={onClose}>{t('取消', 'Cancel', 'ပယ်')}</button>
          <button type="button" className="gd-primary" disabled={busy || !name.trim()} onClick={submit}>
            {busy ? t('保存中…', 'Saving…', 'သိမ်းနေသည်…') : t('保存', 'Save', 'သိမ်း')}
          </button>
        </div>
      )}
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} style={{ display: 'grid', gap: 12 }}>
        <Field label={t('名称', 'Name', 'အမည်')}><input ref={nameRef} className="gd-field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" /></Field>
        <Field label={t('电话', 'Phone', 'ဖုန်း')}><input className="gd-field" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="off" inputMode="tel" /></Field>
        <Field label={t('备注', 'Note', 'မှတ်ချက်')}><input className="gd-field" value={note} onChange={(e) => setNote(e.target.value)} autoComplete="off" /></Field>
        {localError || error ? <p role="alert" className="gd-form-error" style={{ marginTop: 0 }}>{localError || error}</p> : null}
      </form>
    </Dialog>
  );
}
