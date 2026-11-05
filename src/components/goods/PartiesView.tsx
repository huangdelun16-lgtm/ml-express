import type { GoodsParty } from '../../services/goodsTradeService';
import type { Copy } from './helpers';
import { PartyCard } from './ui';

export function PartiesView({
  t,
  suppliers,
  customers,
  onAdd,
  onEdit,
  onDelete,
}: {
  t: Copy;
  suppliers: GoodsParty[];
  customers: GoodsParty[];
  onAdd: (kind: 'supplier' | 'customer') => void;
  onEdit: (kind: 'supplier' | 'customer', party: GoodsParty) => void;
  onDelete: (kind: 'supplier' | 'customer', party: GoodsParty) => void;
}) {
  return (
    <div className="gd-split" style={{ marginTop: 0 }}>
      <PartyCard
        title={t('供应商', 'Suppliers', 'ပေးသွင်းသူ')}
        hint={t('进货从他们来，也可以把货交给他们代卖。', 'You buy from them, and they can sell for you.', 'သူတို့ထံမှဝယ်ပြီး ပစ္စည်းအပ်နိုင်သည်။')}
        addLabel={t('添加供应商', 'Add supplier', 'ထည့်')}
        editLabel={t('修改', 'Edit', 'ပြင်')}
        deleteLabel={t('删除', 'Delete', 'ဖျက်')}
        searchLabel={t('搜索', 'Search', 'ရှာ')}
        rows={suppliers}
        onAdd={() => onAdd('supplier')}
        onEdit={(party) => onEdit('supplier', party)}
        onDelete={(party) => onDelete('supplier', party)}
      />
      <PartyCard
        title={t('客户', 'Customers', 'ဖောက်သည်')}
        hint={t('买走商品的人。和供应商分开记。', 'Who bought the goods. Separate from suppliers.', 'ဝယ်သူ။ ပေးသွင်းသူနှင့်ခွဲသည်။')}
        addLabel={t('添加客户', 'Add customer', 'ထည့်')}
        editLabel={t('修改', 'Edit', 'ပြင်')}
        deleteLabel={t('删除', 'Delete', 'ဖျက်')}
        searchLabel={t('搜索', 'Search', 'ရှာ')}
        rows={customers}
        onAdd={() => onAdd('customer')}
        onEdit={(party) => onEdit('customer', party)}
        onDelete={(party) => onDelete('customer', party)}
      />
    </div>
  );
}
