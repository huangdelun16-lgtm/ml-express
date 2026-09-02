import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SkeletonTable } from '../components/SkeletonLoader';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase, auditLogService, rechargeService } from '../services/supabase';
import '../styles/adminUserManagement.css';
import { feedbackService } from '../services/FeedbackService';
import { toCsvRow } from '../services/adminInsightsService';
import {
  CUSTOMER_EXPORT_MAX,
  CUSTOMER_TYPES,
  DEFAULT_USER_PAGE_SIZE,
  USER_LIST_PAGE_SIZES,
  applyCustomerFilters,
  customerOrder,
  customerPackageOr,
  courierSearchOr,
  isVipUserType,
  pageRange,
  sanitizeIlike,
  type CustomerListFilters,
  type CustomerSort,
  type CustomerTypeFilter,
} from '../utils/adminUserListQuery';

interface User {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  password?: string;
  user_type: 'customer' | 'courier' | 'admin' | 'merchant' | 'vip';
  status: 'active' | 'inactive' | 'suspended';
  registration_date: string;
  last_login: string;
  total_orders: number;
  total_spent: number;
  balance?: number;
  rating: number;
  notes?: string;
  register_region?: string;
  freeze_reason?: string | null;
  frozen_at?: string | null;
  frozen_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

interface Courier {
  id: string;
  accountId?: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  vehicle_type: string;
  license_number: string;
  status: string;
  join_date: string;
  last_active: string;
  total_deliveries: number;
  rating: number;
  notes: string;
  employee_id?: string;
  region?: string;
}

type UserTab = 'customer_list' | 'admin_list' | 'merchant_store' | 'courier_management';

type JumpCounts = { total: number; active: number };

const REGIONS = [
  { id: 'mandalay', name: '曼德勒', prefix: 'MDY' },
  { id: 'maymyo', name: '彬乌伦', prefix: 'POL' },
  { id: 'yangon', name: '仰光', prefix: 'YGN' },
  { id: 'naypyidaw', name: '内比都', prefix: 'NPW' },
  { id: 'taunggyi', name: '东枝', prefix: 'TGI' },
  { id: 'lashio', name: '腊戌', prefix: 'LSO' },
  { id: 'muse', name: '木姐', prefix: 'MUSE' },
];

const USER_TABS: { id: UserTab; label: string }[] = [
  { id: 'customer_list', label: '客户' },
  { id: 'admin_list', label: '管理员' },
  { id: 'merchant_store', label: '商家' },
  { id: 'courier_management', label: '骑手' },
];

const RECHARGE_AMOUNTS = [10000, 50000, 100000, 300000];

const CUSTOMER_COLUMNS_BASE =
  'id, name, phone, email, address, user_type, status, balance, total_orders, total_spent, rating, notes, register_region, created_at, last_login, registration_date';
const CUSTOMER_COLUMNS_FREEZE = ', freeze_reason, frozen_at, frozen_by';

let freezeColumnsAvailable = true;

function customerSelectColumns() {
  return freezeColumnsAvailable ? `${CUSTOMER_COLUMNS_BASE}${CUSTOMER_COLUMNS_FREEZE}` : CUSTOMER_COLUMNS_BASE;
}

function isMissingFreezeColumn(error: { message?: string; code?: string } | null) {
  const msg = `${error?.message || ''} ${error?.code || ''}`;
  return /freeze_reason|frozen_at|frozen_by|PGRST204|42703/i.test(msg);
}

function asUsers(data: unknown): User[] {
  return (Array.isArray(data) ? data : []) as User[];
}

function ledgerStatusLabel(status: string) {
  if (status === 'completed') return '已完成';
  if (status === 'rejected') return '已拒绝';
  if (status === 'pending') return '待审核';
  return status || '—';
}

function formatWhen(value?: string | null) {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? value : d.toLocaleString('zh-CN');
}

const emptyUserForm = {
  name: '',
  phone: '',
  email: '',
  address: '',
  password: '',
  user_type: 'customer' as User['user_type'],
  status: 'active' as User['status'],
  register_region: 'mandalay',
  notes: '',
  freeze_reason: '',
};

function getUserTypeText(user: User) {
  return isVipUserType(user.user_type) ? 'VIP' : '会员';
}

function getUserTypeBadgeClass(user: User) {
  return isVipUserType(user.user_type) ? 'user-mgmt-badge--vip' : 'user-mgmt-badge--member';
}

function regionLabel(id?: string) {
  if (!id) return '—';
  const match = REGIONS.find((region) => region.id === id || region.prefix === id);
  return match ? match.name : id;
}

function vehicleLabel(type: string) {
  const labels: Record<string, string> = {
    motorcycle: '摩托车',
    car: '汽车',
    bicycle: '自行车',
    truck: '货车',
    tricycle: '三轮车',
    small_truck: '小货车',
  };
  return labels[type] || type || '—';
}

function truncateId(id: string) {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

function avatarColor(user: User) {
  return isVipUserType(user.user_type) ? '#d97706' : '#1677ff';
}

function currentOperator() {
  return {
    id: sessionStorage.getItem('currentUser') || 'admin',
    name: sessionStorage.getItem('currentUserName') || '系统管理员',
  };
}

async function copyText(label: string, value: string) {
  try {
    await navigator.clipboard.writeText(value);
    feedbackService.notify(`已复制${label}`);
  } catch {
    feedbackService.notify(value);
  }
}

async function countRows(table: string, column?: string, value?: string): Promise<number> {
  let q = supabase.from(table).select('id', { count: 'exact', head: true });
  if (column && value) q = q.eq(column, value);
  const { count } = await q;
  return count || 0;
}

function StatusSelect({
  value,
  onChange,
  allowSuspended = true,
}: {
  value: string;
  onChange: (status: User['status']) => void;
  allowSuspended?: boolean;
}) {
  return (
    <div className="user-mgmt-card__status-wrap">
      <select
        className="user-mgmt-card__status"
        data-status={value}
        value={value}
        onChange={(e) => onChange(e.target.value as User['status'])}
      >
        <option value="active">活跃</option>
        <option value="inactive">非活跃</option>
        {allowSuspended && <option value="suspended">已暂停</option>}
      </select>
      <span className="user-mgmt-card__status-arrow">▼</span>
    </div>
  );
}

function TablePager({
  page,
  pageSize,
  total,
  onPage,
  onPageSize,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  if (total <= 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safe = Math.min(Math.max(1, page), totalPages);
  return (
    <div className="user-mgmt-pager">
      <span className="user-mgmt-pager__info">
        共 {total} 条 · 第 {safe}/{totalPages} 页
      </span>
      <div className="user-mgmt-pager__controls">
        <label className="user-mgmt-pager__size">
          每页
          <select value={pageSize} onChange={(e) => onPageSize(Number(e.target.value))}>
            {USER_LIST_PAGE_SIZES.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="user-mgmt__btn" disabled={safe <= 1} onClick={() => onPage(safe - 1)}>
          上一页
        </button>
        <button type="button" className="user-mgmt__btn" disabled={safe >= totalPages} onClick={() => onPage(safe + 1)}>
          下一页
        </button>
      </div>
    </div>
  );
}

function UserRow({
  user,
  selected,
  onSelect,
  onOpen,
  onEdit,
  onStatus,
  onDelete,
  onRecharge,
}: {
  user: User;
  selected: boolean;
  onSelect: (id: string) => void;
  onOpen: (user: User) => void;
  onEdit: (user: User) => void;
  onStatus: (user: User, status: User['status']) => void;
  onDelete: (user: User) => void;
  onRecharge: (user: User) => void;
}) {
  return (
    <tr className={selected ? 'is-selected' : undefined}>
      <td className="user-mgmt-table__check">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(user.id)}
          aria-label={`选择 ${user.name}`}
        />
      </td>
      <td>
        <div className="user-mgmt-table__user">
          <div className="user-mgmt-table__avatar" style={{ background: avatarColor(user) }}>
            {(user.name || '?').slice(0, 1)}
          </div>
          <div>
            <button type="button" className="user-mgmt-table__id" style={{ fontWeight: 700, fontSize: '0.84rem', fontFamily: 'inherit' }} onClick={() => onOpen(user)}>
              {user.name || '未命名'}
            </button>
            <div className="user-mgmt-table__sub">{user.phone || '未填电话'}</div>
            <button type="button" className="user-mgmt-table__id" onClick={() => copyText('ID', user.id)}>
              {truncateId(user.id)}
            </button>
          </div>
        </div>
      </td>
      <td>
        <span className={`user-mgmt-badge ${getUserTypeBadgeClass(user)}`}>{getUserTypeText(user)}</span>
      </td>
      <td>
        <span className="user-mgmt-badge user-mgmt-badge--region">{regionLabel(user.register_region)}</span>
      </td>
      <td>
        <span className="user-mgmt-table__money">{(user.balance ?? 0).toLocaleString()} MMK</span>
      </td>
      <td>
        <span className="user-mgmt-table__num">{user.total_orders || 0}</span>
      </td>
      <td>
        <StatusSelect value={user.status} onChange={(status) => onStatus(user, status)} />
        {user.status === 'suspended' && user.freeze_reason ? (
          <div className="user-mgmt-table__sub">{user.freeze_reason}</div>
        ) : null}
      </td>
      <td>
        <div className="user-mgmt-table__actions">
          <button type="button" className="user-mgmt-table__action user-mgmt-table__action--edit" onClick={() => onOpen(user)}>
            详情
          </button>
          <button type="button" className="user-mgmt-table__action user-mgmt-table__action--credit" onClick={() => onRecharge(user)}>
            充值
          </button>
          <button type="button" className="user-mgmt-table__action user-mgmt-table__action--edit" onClick={() => onEdit(user)}>
            编辑
          </button>
          <button type="button" className="user-mgmt-table__action user-mgmt-table__action--delete" onClick={() => onDelete(user)}>
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}

function CourierRow({
  courier,
  onEdit,
  onStatus,
  onDelete,
}: {
  courier: Courier;
  onEdit: (courier: Courier) => void;
  onStatus: (courier: Courier, status: string) => void;
  onDelete: (courier: Courier) => void;
}) {
  return (
    <tr>
      <td>
        <div className="user-mgmt-table__name">{courier.name || '未命名'}</div>
        <div className="user-mgmt-table__sub">#{courier.employee_id || '—'}</div>
      </td>
      <td>{courier.phone || '—'}</td>
      <td>{regionLabel(courier.region)}</td>
      <td>{vehicleLabel(courier.vehicle_type)}</td>
      <td>
        <span className="user-mgmt-table__num">{courier.total_deliveries || 0}</span>
      </td>
      <td>
        <StatusSelect
          value={courier.status === 'active' ? 'active' : 'inactive'}
          onChange={(status) => onStatus(courier, status)}
          allowSuspended={false}
        />
      </td>
      <td>
        <div className="user-mgmt-table__actions">
          <button type="button" className="user-mgmt-table__action user-mgmt-table__action--edit" onClick={() => onEdit(courier)}>
            编辑
          </button>
          <button type="button" className="user-mgmt-table__action user-mgmt-table__action--delete" onClick={() => onDelete(courier)}>
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}

type DetailTab = 'profile' | 'orders' | 'ledger';

function CustomerDrawer({
  user,
  tab,
  onTab,
  onClose,
  onEdit,
  onRecharge,
  onFreeze,
  onUnfreeze,
  loading,
  orders,
  ledger,
}: {
  user: User;
  tab: DetailTab;
  onTab: (tab: DetailTab) => void;
  onClose: () => void;
  onEdit: (user: User) => void;
  onRecharge: (user: User) => void;
  onFreeze: (user: User) => void;
  onUnfreeze: (user: User) => void;
  loading: boolean;
  orders: { id: string; status?: string; price?: string; created_at?: string; sender_name?: string }[];
  ledger: { id: string; amount?: number; status?: string; notes?: string; created_at?: string }[];
}) {
  return (
    <>
      <div className="user-mgmt-drawer-overlay" onClick={onClose} />
      <aside className="user-mgmt-drawer" role="dialog" aria-modal="true" aria-label="客户详情">
        <div className="user-mgmt-drawer__head">
          <div>
            <h2 className="user-mgmt-modal__title">{user.name || '未命名客户'}</h2>
            <p className="user-mgmt-modal__sub">
              {user.phone || '未填电话'} · {getUserTypeText(user)} · {regionLabel(user.register_region)}
            </p>
          </div>
          <button type="button" className="user-mgmt-modal__close" onClick={onClose} aria-label="关闭">
            ✕
          </button>
        </div>
        <div className="user-mgmt-drawer__tabs">
          {([
            ['profile', '资料'],
            ['orders', '订单'],
            ['ledger', '流水'],
          ] as const).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`user-mgmt-drawer__tab${tab === id ? ' is-active' : ''}`}
              onClick={() => onTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="user-mgmt-drawer__body">
          {tab === 'profile' && (
            <>
              <dl className="user-mgmt-kv">
                <dt>ID</dt>
                <dd>{user.id}</dd>
                <dt>邮箱</dt>
                <dd>{user.email || '—'}</dd>
                <dt>地址</dt>
                <dd>{user.address || '—'}</dd>
                <dt>余额</dt>
                <dd>{(user.balance ?? 0).toLocaleString()} MMK</dd>
                <dt>订单数</dt>
                <dd>{user.total_orders || 0}</dd>
                <dt>累计消费</dt>
                <dd>{(user.total_spent ?? 0).toLocaleString()} MMK</dd>
                <dt>状态</dt>
                <dd>{user.status === 'suspended' ? '已暂停' : user.status === 'inactive' ? '非活跃' : '活跃'}</dd>
                <dt>冻结原因</dt>
                <dd>{user.freeze_reason || (user.status === 'suspended' ? '未填写' : '—')}</dd>
                {user.status === 'suspended' ? (
                  <>
                    <dt>冻结时间</dt>
                    <dd>{formatWhen(user.frozen_at)}</dd>
                    <dt>操作人</dt>
                    <dd>{user.frozen_by || '—'}</dd>
                  </>
                ) : null}
                <dt>注册</dt>
                <dd>{formatWhen(user.created_at) !== '—' ? formatWhen(user.created_at) : user.registration_date || '—'}</dd>
                <dt>备注</dt>
                <dd>{user.notes || '—'}</dd>
              </dl>
              <div className="user-mgmt-jump__actions" style={{ marginTop: '1rem' }}>
                <button type="button" className="user-mgmt__btn user-mgmt__btn--primary" onClick={() => onEdit(user)}>
                  编辑资料
                </button>
                <button type="button" className="user-mgmt__btn" onClick={() => onRecharge(user)}>
                  充值
                </button>
                {user.status === 'suspended' ? (
                  <button type="button" className="user-mgmt__btn" onClick={() => onUnfreeze(user)}>
                    解冻
                  </button>
                ) : (
                  <button type="button" className="user-mgmt__btn user-mgmt__btn--danger" onClick={() => onFreeze(user)}>
                    冻结
                  </button>
                )}
              </div>
            </>
          )}
          {tab === 'orders' && (
            <>
              <p className="user-mgmt-drawer__hint">按客户 ID 或寄件电话匹配最近 30 单。</p>
              {loading ? (
                <SkeletonTable rows={4} />
              ) : orders.length === 0 ? (
                <p className="user-mgmt__empty-text">没有找到订单</p>
              ) : (
                <table className="user-mgmt-mini-table">
                  <thead>
                    <tr>
                      <th>单号</th>
                      <th>状态</th>
                      <th>金额</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {row.id}
                          <div className="user-mgmt-table__sub">{formatWhen(row.created_at)}</div>
                        </td>
                        <td>{row.status || '—'}</td>
                        <td>{row.price || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
          {tab === 'ledger' && (
            <>
              <p className="user-mgmt-drawer__hint">来自充值流水表，含后台手动入账。</p>
              {loading ? (
                <SkeletonTable rows={4} />
              ) : ledger.length === 0 ? (
                <p className="user-mgmt__empty-text">没有流水记录</p>
              ) : (
                <table className="user-mgmt-mini-table">
                  <thead>
                    <tr>
                      <th>时间</th>
                      <th>金额</th>
                      <th>状态</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger.map((row) => (
                      <tr key={row.id}>
                        <td>
                          {formatWhen(row.created_at)}
                          {row.notes ? <div className="user-mgmt-table__sub">{row.notes}</div> : null}
                        </td>
                        <td>{Number(row.amount || 0).toLocaleString()} MMK</td>
                        <td>{ledgerStatusLabel(row.status || '')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}

const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState<UserTab>('customer_list');

  const [users, setUsers] = useState<User[]>([]);
  const [userTotal, setUserTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<CustomerTypeFilter>('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterRegion, setFilterRegion] = useState('all');
  const [sortBy, setSortBy] = useState<CustomerSort>('newest');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_USER_PAGE_SIZE);
  const skipUserPageReset = useRef(true);
  const [exporting, setExporting] = useState(false);
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('profile');
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailOrders, setDetailOrders] = useState<{ id: string; status?: string; price?: string; created_at?: string; sender_name?: string }[]>([]);
  const [detailLedger, setDetailLedger] = useState<{ id: string; amount?: number; status?: string; notes?: string; created_at?: string }[]>([]);
  const [freezeUser, setFreezeUser] = useState<User | null>(null);
  const [freezeReason, setFreezeReason] = useState('');
  const [freezeSaving, setFreezeSaving] = useState(false);

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [courierTotal, setCourierTotal] = useState(0);
  const [courierLoading, setCourierLoading] = useState(false);
  const [courierSearchInput, setCourierSearchInput] = useState('');
  const [courierSearchTerm, setCourierSearchTerm] = useState('');
  const [courierStatusFilter, setCourierStatusFilter] = useState('all');
  const [vehicleFilter, setVehicleFilter] = useState('all');
  const [courierPage, setCourierPage] = useState(1);
  const [courierPageSize, setCourierPageSize] = useState(DEFAULT_USER_PAGE_SIZE);
  const skipCourierPageReset = useRef(true);
  const [editingCourier, setEditingCourier] = useState<Courier | null>(null);
  const [showAddCourierForm, setShowAddCourierForm] = useState(false);
  const [courierForm, setCourierForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    vehicle_type: 'motorcycle',
    license_number: '',
    status: 'active',
    notes: '',
    employee_id: '',
    region: 'yangon',
  });

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddUserForm, setShowAddUserForm] = useState(false);
  const [showRechargeModal, setShowRechargeModal] = useState(false);
  const [rechargeUser, setRechargeUser] = useState<User | null>(null);
  const [isRecharging, setIsRecharging] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [isBatchDeleting, setIsBatchDeleting] = useState(false);
  const [userForm, setUserForm] = useState(emptyUserForm);

  const [customerStats, setCustomerStats] = useState({
    total: 0,
    vip: 0,
    active: 0,
    suspended: 0,
  });
  const [courierStats, setCourierStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [adminJump, setAdminJump] = useState<JumpCounts>({ total: 0, active: 0 });
  const [storeJump, setStoreJump] = useState<JumpCounts>({ total: 0, active: 0 });
  const [jumpLoading, setJumpLoading] = useState(false);
  const [courierDeskOpen, setCourierDeskOpen] = useState(false);

  useEffect(() => {
    const q = searchParams.get('q');
    const tab = searchParams.get('tab');
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const sort = searchParams.get('sort');
    const region = searchParams.get('region');
    if (q && tab === 'courier_management') {
      setCourierSearchInput(q);
      setCourierSearchTerm(q);
      setCourierDeskOpen(true);
    } else if (q) {
      setSearchInput(q);
      setSearchTerm(q);
    }
    if (tab && USER_TABS.some((item) => item.id === tab)) {
      setActiveTab(tab as UserTab);
    }
    if (status && ['all', 'active', 'inactive', 'suspended'].includes(status)) {
      setFilterStatus(status);
    }
    if (type && ['all', 'vip', 'member'].includes(type)) {
      setFilterType(type as CustomerTypeFilter);
    }
    if (sort && ['newest', 'balance', 'orders', 'name'].includes(sort)) {
      setSortBy(sort as CustomerSort);
    }
    if (region && (region === 'all' || REGIONS.some((item) => item.id === region))) {
      setFilterRegion(region);
    }
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchTerm(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => setCourierSearchTerm(courierSearchInput), 300);
    return () => window.clearTimeout(timer);
  }, [courierSearchInput]);

  useEffect(() => {
    if (skipUserPageReset.current) {
      skipUserPageReset.current = false;
      return;
    }
    setPage(1);
    setSelectedUsers(new Set());
  }, [searchTerm, filterType, filterStatus, filterRegion, sortBy, pageSize]);

  useEffect(() => {
    if (skipCourierPageReset.current) {
      skipCourierPageReset.current = false;
      return;
    }
    setCourierPage(1);
  }, [courierSearchTerm, courierStatusFilter, vehicleFilter, courierPageSize]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (freezeSaving) return;
      if (freezeUser) {
        setFreezeUser(null);
        return;
      }
      if (showRechargeModal || showAddUserForm || showAddCourierForm) return;
      if (detailUser) setDetailUser(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [freezeUser, freezeSaving, showRechargeModal, showAddUserForm, showAddCourierForm, detailUser]);

  const loadCustomerStats = useCallback(async () => {
    const scoped = () => supabase.from('users').select('id', { count: 'exact', head: true }).in('user_type', [...CUSTOMER_TYPES]);
    const [totalRes, vipRes, activeRes, suspendedRes] = await Promise.all([
      scoped(),
      scoped().eq('user_type', 'vip'),
      scoped().eq('status', 'active'),
      scoped().eq('status', 'suspended'),
    ]);
    setCustomerStats({
      total: totalRes.count || 0,
      vip: vipRes.count || 0,
      active: activeRes.count || 0,
      suspended: suspendedRes.count || 0,
    });
  }, []);

  const loadCourierStats = useCallback(async () => {
    const [total, active, inactive] = await Promise.all([
      countRows('couriers'),
      countRows('couriers', 'status', 'active'),
      countRows('couriers', 'status', 'inactive'),
    ]);
    setCourierStats({ total, active, inactive });
  }, []);

  const listFilters = useMemo<CustomerListFilters>(
    () => ({ filterStatus, filterType, filterRegion, searchTerm }),
    [filterStatus, filterType, filterRegion, searchTerm],
  );

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      const { from, to } = pageRange(page, pageSize);
      const order = customerOrder(sortBy);
      const run = async () => {
        let query = applyCustomerFilters(
          supabase.from('users').select(customerSelectColumns(), { count: 'exact' }),
          listFilters,
        );
        return query.order(order.column, { ascending: order.ascending }).range(from, to);
      };

      let { data, error, count } = await run();
      if (error && freezeColumnsAvailable && isMissingFreezeColumn(error)) {
        freezeColumnsAvailable = false;
        ({ data, error, count } = await run());
      }
      if (error) throw error;

      const total = count || 0;
      if ((data || []).length === 0 && total > 0 && from > 0) {
        setPage(1);
        return;
      }

      setUserTotal(total);
      setUsers(asUsers(data));
    } catch (error) {
      console.error('加载客户失败:', error);
      setUsers([]);
      setUserTotal(0);
      feedbackService.notify('加载客户失败');
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, sortBy, listFilters]);

  const loadCouriers = useCallback(async () => {
    try {
      setCourierLoading(true);
      const { from, to } = pageRange(courierPage, courierPageSize);
      let query = supabase.from('couriers').select('*', { count: 'exact' });
      if (courierStatusFilter !== 'all') query = query.eq('status', courierStatusFilter);
      if (vehicleFilter !== 'all') query = query.eq('vehicle_type', vehicleFilter);
      const like = sanitizeIlike(courierSearchTerm);
      if (like) query = query.or(courierSearchOr(like));

      const { data, error, count } = await query.order('created_at', { ascending: false }).range(from, to);
      if (error) throw error;

      const total = count || 0;
      if ((data || []).length === 0 && total > 0 && from > 0) {
        setCourierPage(1);
        return;
      }

      const rows = data || [];
      const phones = Array.from(new Set(rows.map((row) => String(row.phone || '')).filter(Boolean)));
      const empIds = Array.from(new Set(rows.map((row) => String(row.employee_id || '')).filter(Boolean)));

      const accountMap = new Map<string, { id?: string; phone?: string; employee_id?: string; region?: string; notes?: string }>();
      const ingest = (list: { id?: string; phone?: string; employee_id?: string; region?: string; notes?: string }[]) => {
        for (const acc of list) {
          if (acc.employee_id) accountMap.set(`emp:${acc.employee_id}`, acc);
          if (acc.phone) accountMap.set(`ph:${acc.phone}`, acc);
        }
      };
      if (phones.length) {
        const { data: byPhone } = await supabase
          .from('admin_accounts')
          .select('id, phone, employee_id, region, notes, position')
          .in('phone', phones);
        ingest(byPhone || []);
      }
      if (empIds.length) {
        const { data: byEmp } = await supabase
          .from('admin_accounts')
          .select('id, phone, employee_id, region, notes, position')
          .in('employee_id', empIds);
        ingest(byEmp || []);
      }

      setCourierTotal(total);
      setCouriers(
        rows.map((row) => {
          const acc =
            (row.employee_id && accountMap.get(`emp:${row.employee_id}`)) ||
            (row.phone && accountMap.get(`ph:${row.phone}`)) ||
            undefined;
          return {
            id: String(row.id || ''),
            accountId: acc?.id,
            name: row.name || '',
            phone: row.phone || '',
            email: row.email || '',
            address: row.address || '',
            vehicle_type: row.vehicle_type || 'motorcycle',
            license_number: row.license_number || '',
            status: row.status || 'active',
            join_date: row.created_at ? new Date(row.created_at).toLocaleDateString('zh-CN') : '未知',
            last_active: row.last_active || '从未上线',
            total_deliveries: row.total_deliveries || 0,
            rating: row.rating || 5,
            notes: row.notes || acc?.notes || '',
            employee_id: row.employee_id || acc?.employee_id || '',
            region: row.region || acc?.region || '',
          } as Courier;
        }),
      );
    } catch (error) {
      console.error('加载骑手失败:', error);
      setCouriers([]);
      setCourierTotal(0);
      feedbackService.notify('加载骑手失败');
    } finally {
      setCourierLoading(false);
    }
  }, [courierPage, courierPageSize, courierSearchTerm, courierStatusFilter, vehicleFilter]);

  const loadAdminJump = useCallback(async () => {
    setJumpLoading(true);
    try {
      const [total, active] = await Promise.all([
        countRows('admin_accounts'),
        countRows('admin_accounts', 'status', 'active'),
      ]);
      setAdminJump({ total, active });
    } finally {
      setJumpLoading(false);
    }
  }, []);

  const loadStoreJump = useCallback(async () => {
    setJumpLoading(true);
    try {
      const [total, active] = await Promise.all([
        countRows('delivery_stores'),
        countRows('delivery_stores', 'status', 'active'),
      ]);
      setStoreJump({ total, active });
    } finally {
      setJumpLoading(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'customer_list') void loadCustomers();
  }, [activeTab, loadCustomers]);

  useEffect(() => {
    if (activeTab === 'customer_list') void loadCustomerStats();
  }, [activeTab, loadCustomerStats]);

  useEffect(() => {
    if (activeTab === 'courier_management' && courierDeskOpen) void loadCouriers();
  }, [activeTab, courierDeskOpen, loadCouriers]);

  useEffect(() => {
    if (activeTab === 'courier_management') void loadCourierStats();
  }, [activeTab, loadCourierStats]);

  useEffect(() => {
    if (activeTab === 'admin_list') void loadAdminJump();
    else if (activeTab === 'merchant_store') void loadStoreJump();
  }, [activeTab, loadAdminJump, loadStoreJump]);

  const handleSelectAll = () => {
    if (selectedUsers.size === users.length && users.length > 0) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(users.map((u) => u.id)));
    }
  };

  const handleSelectUser = (userId: string) => {
    const next = new Set(selectedUsers);
    if (next.has(userId)) next.delete(userId);
    else next.add(userId);
    setSelectedUsers(next);
  };

  const handleBatchDelete = async () => {
    if (selectedUsers.size === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedUsers.size} 个客户吗？此操作不可恢复！`)) return;

    try {
      setIsBatchDeleting(true);
      const idList = Array.from(selectedUsers);
      if (detailUser && idList.includes(detailUser.id)) setDetailUser(null);
      let failures = 0;
      const errors: string[] = [];
      for (const id of idList) {
        await supabase.from('recharge_requests').delete().eq('user_id', id);
        const { error, data } = await supabase.from('users').delete().eq('id', id).select('id');
        if (error || !data?.length) {
          failures += 1;
          errors.push(`${id}: ${error?.message || '未找到记录'}`);
        }
      }
      await loadCustomers();
      await loadCustomerStats();
      setSelectedUsers(new Set());
      if (failures > 0) {
        feedbackService.notify(`完成部分删除。失败 ${failures} 条。\n\n${errors.slice(0, 5).join('\n')}`);
      } else {
        feedbackService.notify('批量删除成功');
      }
    } catch {
      feedbackService.notify('操作出错');
    } finally {
      setIsBatchDeleting(false);
    }
  };

  const resetUserFilters = () => {
    setSearchInput('');
    setSearchTerm('');
    setFilterStatus('all');
    setFilterType('all');
    setFilterRegion('all');
    setSortBy('newest');
    setPage(1);
    setSelectedUsers(new Set());
    navigate('/admin/users', { replace: true });
  };

  const closeUserForm = () => {
    setShowAddUserForm(false);
    setEditingUser(null);
    setUserForm(emptyUserForm);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userForm.password.trim()) {
      feedbackService.notify('请设置登录密码');
      return;
    }

    const newUser = {
      id: `USR${String(Date.now()).slice(-6)}`,
      name: userForm.name,
      phone: userForm.phone,
      email: userForm.email.trim() || '',
      address: userForm.address,
      password: userForm.password.trim(),
      user_type: 'customer' as const,
      status: userForm.status === 'inactive' ? 'inactive' : 'active',
      register_region: userForm.register_region,
      notes: userForm.notes,
      registration_date: new Date().toLocaleDateString('zh-CN'),
      last_login: '从未登录',
      total_orders: 0,
      total_spent: 0,
      rating: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase.from('users').insert([newUser]);
      if (error) {
        feedbackService.notify(`创建用户失败: ${error.message}`);
        return;
      }
      setPage(1);
      await loadCustomers();
      await loadCustomerStats();
      feedbackService.notify('客户创建成功');
      closeUserForm();
    } catch (error: unknown) {
      feedbackService.notify(`创建用户异常: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setUserForm({
      name: user.name || '',
      phone: user.phone || '',
      email: user.email || '',
      address: user.address || '',
      password: '',
      user_type: user.user_type === 'vip' ? 'vip' : 'customer',
      status: user.status || 'active',
      register_region: user.register_region || 'mandalay',
      notes: user.notes || '',
      freeze_reason: user.freeze_reason || '',
    });
    setShowAddUserForm(true);
  };

  const handleOpenRecharge = (user: User) => {
    setRechargeUser(user);
    setShowRechargeModal(true);
  };

  const handleRecharge = async (amount: number) => {
    if (!rechargeUser) return;
    if (!window.confirm(`确定要为「${rechargeUser.name}」充值 ${amount.toLocaleString()} MMK 吗？\n将写入充值流水并记录当前操作人。`)) {
      return;
    }

    try {
      setIsRecharging(true);
      const operator = currentOperator();
      const success = await rechargeService.manualAdjustBalance(
        rechargeUser.id,
        amount,
        `后台用户管理手动充值 · 操作人 ${operator.name} (${operator.id})`,
      );
      if (!success) {
        feedbackService.notify('充值失败，请重试');
        return;
      }

      await auditLogService.log({
        user_id: operator.id,
        user_name: operator.name,
        action_type: 'update',
        module: 'finance',
        target_id: rechargeUser.id,
        target_name: rechargeUser.name,
        action_description: `手动充值 ${amount.toLocaleString()} MMK（用户管理）`,
      });

      await loadCustomers();
      await loadCustomerStats();
      if (detailUser?.id === rechargeUser.id) {
        setDetailUser({ ...detailUser, balance: (detailUser.balance || 0) + amount });
      }
      setShowRechargeModal(false);
      setRechargeUser(null);
      feedbackService.notify('充值成功，已写入流水');
    } catch {
      feedbackService.notify('操作出错');
    } finally {
      setIsRecharging(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    if (userForm.status === 'suspended' && editingUser.status !== 'suspended') {
      const reason = userForm.freeze_reason.trim();
      if (!reason) {
        feedbackService.notify('冻结客户须填写原因');
        return;
      }
    }

    const nextType = userForm.user_type === 'vip' ? 'vip' : 'customer';
    const nextStatus = userForm.status;
    const updateData: Record<string, unknown> = {
      name: userForm.name,
      phone: userForm.phone,
      email: userForm.email,
      address: userForm.address,
      user_type: nextType,
      status: nextStatus,
      register_region: userForm.register_region,
      notes: userForm.notes,
      updated_at: new Date().toISOString(),
    };
    if (userForm.password.trim()) updateData.password = userForm.password.trim();
    if (freezeColumnsAvailable) {
      if (nextStatus === 'suspended') {
        const operator = currentOperator();
        updateData.freeze_reason = userForm.freeze_reason.trim();
        if (editingUser.status !== 'suspended') {
          updateData.frozen_at = new Date().toISOString();
          updateData.frozen_by = `${operator.name} (${operator.id})`;
        }
      } else if (editingUser.status === 'suspended') {
        updateData.freeze_reason = null;
        updateData.frozen_at = null;
        updateData.frozen_by = null;
      }
    }

    try {
      const { error } = await supabase.from('users').update(updateData).eq('id', editingUser.id).select();
      let freezeDegraded = false;
      if (error && freezeColumnsAvailable && isMissingFreezeColumn(error)) {
        freezeColumnsAvailable = false;
        freezeDegraded = nextStatus === 'suspended';
        const retryData = { ...updateData };
        delete retryData.freeze_reason;
        delete retryData.frozen_at;
        delete retryData.frozen_by;
        const retry = await supabase.from('users').update(retryData).eq('id', editingUser.id).select();
        if (retry.error) {
          feedbackService.notify(`更新用户失败: ${retry.error.message}`);
          return;
        }
      } else if (error) {
        feedbackService.notify(`更新用户失败: ${error.message}`);
        return;
      }
      await loadCustomers();
      await loadCustomerStats();
      if (detailUser?.id === editingUser.id) {
        setDetailUser({
          ...detailUser,
          name: userForm.name,
          phone: userForm.phone,
          email: userForm.email,
          address: userForm.address,
          user_type: nextType,
          status: nextStatus,
          register_region: userForm.register_region,
          notes: userForm.notes,
          freeze_reason: nextStatus === 'suspended' ? userForm.freeze_reason.trim() : null,
        });
      }
      feedbackService.notify(
        freezeDegraded ? '资料已保存。数据库尚未包含冻结原因字段，请先执行迁移。' : '用户更新成功',
      );
      closeUserForm();
    } catch (error: unknown) {
      feedbackService.notify(`更新用户异常: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (!window.confirm(`确定要删除用户「${user.name}」吗？此操作不可恢复。`)) return;
    try {
      await supabase.from('recharge_requests').delete().eq('user_id', user.id);
      const { error, data } = await supabase.from('users').delete().eq('id', user.id).select('id');
      if (error) {
        feedbackService.notify(`删除失败：${error.message}`);
        return;
      }
      if (!data?.length) {
        feedbackService.notify('未删除任何记录：该用户可能已不存在。');
        return;
      }
      if (detailUser?.id === user.id) setDetailUser(null);
      await loadCustomers();
      await loadCustomerStats();
      feedbackService.notify('删除成功');
    } catch (error: unknown) {
      feedbackService.notify(error instanceof Error ? error.message : '删除异常');
    }
  };

  const updateUserStatus = async (user: User, newStatus: User['status']) => {
    if (newStatus === 'suspended' && user.status !== 'suspended') {
      setFreezeUser(user);
      setFreezeReason(user.freeze_reason || '');
      return;
    }
    try {
      const patch: Record<string, unknown> = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };
      if (user.status === 'suspended' && newStatus !== 'suspended' && freezeColumnsAvailable) {
        patch.freeze_reason = null;
        patch.frozen_at = null;
        patch.frozen_by = null;
      }
      const { error } = await supabase.from('users').update(patch).eq('id', user.id);
      if (error && freezeColumnsAvailable && isMissingFreezeColumn(error)) {
        freezeColumnsAvailable = false;
        const retry = await supabase.from('users').update({ status: newStatus }).eq('id', user.id);
        if (retry.error) {
          feedbackService.notify('更新状态失败：' + retry.error.message);
          return;
        }
      } else if (error) {
        feedbackService.notify('更新状态失败：' + error.message);
        return;
      }
      await loadCustomers();
      await loadCustomerStats();
      if (detailUser?.id === user.id) {
        setDetailUser({
          ...user,
          status: newStatus,
          freeze_reason: newStatus === 'suspended' ? user.freeze_reason : null,
        });
      }
    } catch {
      feedbackService.notify('更新状态异常');
    }
  };

  const submitFreeze = async () => {
    if (!freezeUser) return;
    const reason = freezeReason.trim();
    if (!reason) {
      feedbackService.notify('请填写冻结原因');
      return;
    }
    try {
      setFreezeSaving(true);
      const operator = currentOperator();
      const patch: Record<string, unknown> = {
        status: 'suspended',
        updated_at: new Date().toISOString(),
      };
      if (freezeColumnsAvailable) {
        patch.freeze_reason = reason;
        patch.frozen_at = new Date().toISOString();
        patch.frozen_by = `${operator.name} (${operator.id})`;
      }
      const { error } = await supabase.from('users').update(patch).eq('id', freezeUser.id);
      if (error && freezeColumnsAvailable && isMissingFreezeColumn(error)) {
        freezeColumnsAvailable = false;
        const retry = await supabase.from('users').update({ status: 'suspended' }).eq('id', freezeUser.id);
        if (retry.error) {
          feedbackService.notify('冻结失败：' + retry.error.message);
          return;
        }
        feedbackService.notify('账号已暂停。数据库尚未包含冻结原因字段，请先执行迁移。');
      } else if (error) {
        feedbackService.notify('冻结失败：' + error.message);
        return;
      } else {
        feedbackService.notify('账号已冻结');
      }
      setFreezeUser(null);
      setFreezeReason('');
      await loadCustomers();
      await loadCustomerStats();
      if (detailUser?.id === freezeUser.id) {
        setDetailUser({ ...freezeUser, status: 'suspended', freeze_reason: reason });
      }
    } finally {
      setFreezeSaving(false);
    }
  };

  const exportCustomers = async () => {
    try {
      setExporting(true);
      const order = customerOrder(sortBy);
      const rows: User[] = [];
      const pageSizeExport = 100;
      for (let p = 1; p <= Math.ceil(CUSTOMER_EXPORT_MAX / pageSizeExport); p += 1) {
        const { from, to } = pageRange(p, pageSizeExport);
        const { data, error } = await applyCustomerFilters(
          supabase.from('users').select(customerSelectColumns()),
          listFilters,
        )
          .order(order.column, { ascending: order.ascending })
          .range(from, to);
        if (error) {
          if (freezeColumnsAvailable && isMissingFreezeColumn(error)) {
            freezeColumnsAvailable = false;
            p -= 1;
            continue;
          }
          throw error;
        }
        rows.push(...asUsers(data));
        if (!data || data.length < pageSizeExport) break;
      }
      const truncated = rows.length >= CUSTOMER_EXPORT_MAX;
      const head = toCsvRow([
        'ID',
        '姓名',
        '电话',
        '邮箱',
        '地区',
        '类型',
        '状态',
        '余额',
        '订单',
        '累计消费',
        '冻结原因',
        '注册时间',
      ]);
      const lines = rows.slice(0, CUSTOMER_EXPORT_MAX).map((user) =>
        toCsvRow([
          user.id,
          user.name,
          user.phone,
          user.email,
          regionLabel(user.register_region),
          getUserTypeText(user),
          user.status,
          user.balance ?? 0,
          user.total_orders || 0,
          user.total_spent ?? 0,
          user.freeze_reason || '',
          user.created_at || user.registration_date || '',
        ]),
      );
      const blob = new Blob(['\uFEFF', [head, ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ml-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      feedbackService.notify(truncated ? `已导出前 ${CUSTOMER_EXPORT_MAX} 条，请收窄筛选后再导出` : `已导出 ${rows.length} 条`);
    } catch (error: unknown) {
      feedbackService.notify(`导出失败: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setExporting(false);
    }
  };

  const openDetail = (user: User) => {
    setDetailUser(user);
    setDetailTab('profile');
  };

  useEffect(() => {
    if (!detailUser) {
      setDetailOrders([]);
      setDetailLedger([]);
      return;
    }
    let cancelled = false;
    const load = async () => {
      setDetailLoading(true);
      try {
        const orFilter = customerPackageOr(detailUser.id, detailUser.phone || '');
        const [ordersRes, ledgerRes] = await Promise.all([
          supabase
            .from('packages')
            .select('id, status, price, created_at, sender_name')
            .or(orFilter)
            .order('created_at', { ascending: false })
            .limit(30),
          supabase
            .from('recharge_requests')
            .select('id, amount, status, notes, created_at')
            .eq('user_id', detailUser.id)
            .order('created_at', { ascending: false })
            .limit(50),
        ]);
        if (cancelled) return;
        if (ordersRes.error) {
          setDetailOrders([]);
        } else {
          setDetailOrders(ordersRes.data || []);
        }
        if (ledgerRes.error) {
          setDetailLedger([]);
        } else {
          setDetailLedger(ledgerRes.data || []);
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [detailUser]);

  const handleEditCourier = (courier: Courier) => {
    setEditingCourier(courier);
    setCourierForm({
      name: courier.name || '',
      phone: courier.phone || '',
      email: courier.email || '',
      address: courier.address || '',
      vehicle_type: courier.vehicle_type || 'motorcycle',
      license_number: courier.license_number || '',
      status: courier.status || 'active',
      notes: courier.notes || '',
      employee_id: courier.employee_id || '',
      region: courier.region || 'yangon',
    });
    setShowAddCourierForm(true);
  };

  const handleUpdateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCourier) return;
    try {
      const { error: courierError } = await supabase
        .from('couriers')
        .update({
          name: courierForm.name,
          phone: courierForm.phone,
          email: courierForm.email,
          address: courierForm.address,
          vehicle_type: courierForm.vehicle_type,
          license_number: courierForm.license_number,
          status: courierForm.status,
          notes: courierForm.notes,
          employee_id: courierForm.employee_id,
          region: courierForm.region,
        })
        .eq('id', editingCourier.id);
      if (courierError) throw courierError;

      if (editingCourier.accountId) {
        const { error: adminError } = await supabase
          .from('admin_accounts')
          .update({
            employee_name: courierForm.name,
            phone: courierForm.phone,
            email: courierForm.email,
            address: courierForm.address,
            notes: courierForm.notes,
            employee_id: courierForm.employee_id,
            region: courierForm.region,
            status: courierForm.status,
          })
          .eq('id', editingCourier.accountId);
        if (adminError) {
          feedbackService.notify(`骑手资料已保存，但账号同步失败：${adminError.message}`);
          await loadCouriers();
          return;
        }
      }

      feedbackService.notify('资料更新成功');
      setShowAddCourierForm(false);
      setEditingCourier(null);
      await loadCouriers();
      await loadCourierStats();
    } catch (error: unknown) {
      feedbackService.notify(`更新失败: ${error instanceof Error ? error.message : '未知错误'}`);
    }
  };

  const handleCourierStatusChange = async (courier: Courier, newStatus: string) => {
    try {
      const { error } = await supabase.from('couriers').update({ status: newStatus }).eq('id', courier.id);
      if (error) {
        feedbackService.notify('状态更新失败: ' + error.message);
        return;
      }
      if (courier.accountId) {
        const acc = await supabase.from('admin_accounts').update({ status: newStatus }).eq('id', courier.accountId);
        if (acc.error) {
          feedbackService.notify(`骑手状态已更新，但账号同步失败：${acc.error.message}`);
        }
      }
      await loadCouriers();
      await loadCourierStats();
      feedbackService.notify('状态已更新');
    } catch {
      feedbackService.notify('更新状态异常');
    }
  };

  const handleDeleteCourier = async (courier: Courier) => {
    if (!courier.id) {
      feedbackService.notify('错误：无效的骑手 ID');
      return;
    }
    if (!window.confirm('确定删除这名骑手？将先删除骑手资料，再尝试移除对应后台登录账号。')) return;
    try {
      const { error: courierError, data: courierDeleted } = await supabase
        .from('couriers')
        .delete()
        .eq('id', courier.id)
        .select('id');
      if (courierError || !courierDeleted?.length) {
        feedbackService.notify(`删除骑手资料失败：${courierError?.message || '未找到记录'}`);
        return;
      }

      let accountError: string | null = null;
      if (courier.accountId) {
        const acc = await supabase.from('admin_accounts').delete().eq('id', courier.accountId).select('id');
        if (acc.error) accountError = acc.error.message;
      } else if (courier.employee_id) {
        const acc = await supabase
          .from('admin_accounts')
          .delete()
          .eq('employee_id', courier.employee_id)
          .in('position', ['骑手', '骑手队长'])
          .select('id');
        if (acc.error) accountError = acc.error.message;
      }

      await loadCouriers();
      await loadCourierStats();
      if (accountError) {
        feedbackService.notify(`骑手资料已删除，但后台登录账号删除失败：${accountError}。请到账户管理手动移除。`);
        return;
      }
      if (!courier.accountId && !courier.employee_id) {
        feedbackService.notify('骑手资料已删除。未找到关联后台账号。');
        return;
      }
      feedbackService.notify('已从骑手表删除，并同步处理后台账号');
    } catch {
      feedbackService.notify('删除账号异常');
    }
  };

  const statCards = useMemo(() => {
    if (activeTab === 'customer_list') {
      return [
        { tone: 'blue', value: customerStats.total, label: '客户总数' },
        { tone: 'amber', value: customerStats.vip, label: 'VIP 会员' },
        { tone: 'green', value: customerStats.active, label: '活跃客户' },
        { tone: 'red', value: customerStats.suspended, label: '已暂停' },
      ];
    }
    return [];
  }, [activeTab, customerStats]);

  return (
    <div className="user-mgmt">
      <div className="user-mgmt__glow" aria-hidden />
      <div className="user-mgmt__inner">
        <header className="user-mgmt__head">
          <div className="user-mgmt__eyebrow">ML EXPRESS · ADMIN</div>
          <h1 className="user-mgmt__title">用户管理</h1>
          <p className="user-mgmt__desc">本页维护会员客户。管理员与商家请到对应后台；骑手以骑手表为准，登录账号仍在账户管理。</p>
        </header>

        <nav className="user-mgmt__tabs" aria-label="用户管理分类">
          {USER_TABS.map((tab) => (
            <button
              type="button"
              key={tab.id}
              className={`user-mgmt__tab${activeTab === tab.id ? ' is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {statCards.length > 0 && (
          <div className={`user-mgmt__stats${statCards.length === 3 ? ' user-mgmt__stats--3' : ''}`}>
            {statCards.map((card) => (
              <div key={card.label} className={`user-mgmt__stat user-mgmt__stat--${card.tone}`}>
                <p className="user-mgmt__stat-value">{card.value}</p>
                <p className="user-mgmt__stat-label">{card.label}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'customer_list' && (
          <section className="user-mgmt__panel">
            <div className="user-mgmt__toolbar">
              <div className="user-mgmt__toolbar-top">
                <div>
                  <h2 className="user-mgmt__toolbar-title">客户列表</h2>
                  <div className="user-mgmt__toolbar-meta">
                    <span className="user-mgmt__count">共 {userTotal} 人</span>
                    {selectedUsers.size > 0 && <span className="user-mgmt__count">本页已选 {selectedUsers.size}</span>}
                  </div>
                </div>
                <div className="user-mgmt__actions">
                  <button
                    type="button"
                    className="user-mgmt__btn user-mgmt__btn--primary"
                    onClick={() => {
                      setEditingUser(null);
                      setUserForm(emptyUserForm);
                      setShowAddUserForm(true);
                    }}
                  >
                    新增客户
                  </button>
                  <button type="button" className="user-mgmt__btn" onClick={handleSelectAll}>
                    {selectedUsers.size === users.length && users.length > 0 ? '取消全选' : '全选本页'}
                  </button>
                  <button type="button" className="user-mgmt__btn" onClick={() => void loadCustomers()}>
                    刷新
                  </button>
                  <button type="button" className="user-mgmt__btn" onClick={() => void exportCustomers()} disabled={exporting}>
                    {exporting ? '导出中…' : '导出 CSV'}
                  </button>
                </div>
              </div>
              <div className="user-mgmt__filters">
                <div className="user-mgmt__search">
                  <span className="user-mgmt__search-icon">⌕</span>
                  <input
                    type="search"
                    placeholder="搜索姓名、电话、邮箱、ID…"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                  />
                </div>
                <select value={filterType} onChange={(e) => setFilterType(e.target.value as CustomerTypeFilter)}>
                  <option value="all">全部客户</option>
                  <option value="vip">VIP 会员</option>
                  <option value="member">普通会员</option>
                </select>
                <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                  <option value="all">全部状态</option>
                  <option value="active">活跃</option>
                  <option value="inactive">非活跃</option>
                  <option value="suspended">已暂停</option>
                </select>
                <select value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
                  <option value="all">全部地区</option>
                  {REGIONS.map((region) => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value as CustomerSort)}>
                  <option value="newest">最新注册</option>
                  <option value="balance">余额从高到低</option>
                  <option value="orders">订单从多到少</option>
                  <option value="name">姓名 A-Z</option>
                </select>
              </div>
            </div>

            {selectedUsers.size > 0 && (
              <div className="user-mgmt__bulk">
                <span className="user-mgmt__bulk-text">已选择 {selectedUsers.size} 个客户（仅当前页）</span>
                <div className="user-mgmt__actions">
                  <button type="button" className="user-mgmt__btn user-mgmt__btn--danger" onClick={handleBatchDelete} disabled={isBatchDeleting}>
                    {isBatchDeleting ? '删除中…' : '批量删除'}
                  </button>
                  <button type="button" className="user-mgmt__btn" onClick={() => setSelectedUsers(new Set())}>
                    取消选择
                  </button>
                </div>
              </div>
            )}

            {loading ? (
              <SkeletonTable rows={6} />
            ) : users.length === 0 ? (
              <div className="user-mgmt__empty">
                <p className="user-mgmt__empty-text">没有匹配的客户</p>
                <button type="button" className="user-mgmt__reset" onClick={resetUserFilters}>
                  重置筛选条件
                </button>
              </div>
            ) : (
              <>
                <div className="user-mgmt-table-wrap">
                  <table className="user-mgmt-table">
                    <thead>
                      <tr>
                        <th className="user-mgmt-table__check" aria-label="选择" />
                        <th>客户</th>
                        <th>类型</th>
                        <th>地区</th>
                        <th>余额</th>
                        <th>订单</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          selected={selectedUsers.has(user.id)}
                          onSelect={handleSelectUser}
                          onOpen={openDetail}
                          onEdit={handleEditUser}
                          onStatus={updateUserStatus}
                          onDelete={handleDeleteUser}
                          onRecharge={handleOpenRecharge}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePager
                  page={page}
                  pageSize={pageSize}
                  total={userTotal}
                  onPage={setPage}
                  onPageSize={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            )}
          </section>
        )}

        {activeTab === 'admin_list' && (
          <section className="user-mgmt__panel">
            {jumpLoading ? (
              <SkeletonTable rows={2} />
            ) : (
              <div className="user-mgmt-jump">
                <h2 className="user-mgmt-jump__title">管理员账号</h2>
                <p className="user-mgmt-jump__desc">
                  后台员工的登录、职位和权限在「系统设置 → 账户管理」中维护，这里不再重复一份列表，避免改错数据源。
                </p>
                <div className="user-mgmt-jump__meta">
                  <span className="user-mgmt__count">共 {adminJump.total} 个账号</span>
                  <span className="user-mgmt__count">活跃 {adminJump.active}</span>
                </div>
                <div className="user-mgmt-jump__actions">
                  <button type="button" className="user-mgmt__btn user-mgmt__btn--primary" onClick={() => navigate('/admin/accounts')}>
                    前往账户管理
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'merchant_store' && (
          <section className="user-mgmt__panel">
            {jumpLoading ? (
              <SkeletonTable rows={2} />
            ) : (
              <div className="user-mgmt-jump">
                <h2 className="user-mgmt-jump__title">商家店铺</h2>
                <p className="user-mgmt-jump__desc">
                  开关店、打包时效和店铺资料请到商家管理。本页只提供入口，避免和店铺后台两套操作。
                </p>
                <div className="user-mgmt-jump__meta">
                  <span className="user-mgmt__count">共 {storeJump.total} 家</span>
                  <span className="user-mgmt__count">营业中 {storeJump.active}</span>
                </div>
                <div className="user-mgmt-jump__actions">
                  <button type="button" className="user-mgmt__btn user-mgmt__btn--primary" onClick={() => navigate('/admin/delivery-stores')}>
                    前往商家管理
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {activeTab === 'courier_management' && (
          <section className="user-mgmt__panel">
            <div className="user-mgmt-jump">
              <h2 className="user-mgmt-jump__title">骑手账号</h2>
              <p className="user-mgmt-jump__desc">
                配送员档案以骑手表为准。登录权限在账户管理，绩效在骑手绩效。需要改车型、地区或停用时，点下方进入骑手列表。
              </p>
              <div className="user-mgmt-jump__meta">
                <span className="user-mgmt__count">共 {courierStats.total} 人</span>
                <span className="user-mgmt__count">活跃 {courierStats.active}</span>
                <span className="user-mgmt__count">已停用 {courierStats.inactive}</span>
              </div>
              <div className="user-mgmt-jump__actions">
                <button
                  type="button"
                  className="user-mgmt__btn user-mgmt__btn--primary"
                  onClick={() => setCourierDeskOpen(true)}
                >
                  前往骑手管理
                </button>
                <button type="button" className="user-mgmt__btn" onClick={() => navigate('/admin/accounts')}>
                  前往账户管理
                </button>
                <button type="button" className="user-mgmt__btn" onClick={() => navigate('/admin/courier-performance')}>
                  前往骑手绩效
                </button>
              </div>
            </div>

            {courierDeskOpen && (
            <>
            <div className="user-mgmt__toolbar" id="user-mgmt-courier-desk">
              <div className="user-mgmt__toolbar-top">
                <div>
                  <h2 className="user-mgmt__toolbar-title">骑手列表</h2>
                  <div className="user-mgmt__toolbar-meta">
                    <span className="user-mgmt__count">共 {courierTotal} 人</span>
                  </div>
                </div>
                <div className="user-mgmt__actions">
                  <button type="button" className="user-mgmt__btn" onClick={() => void loadCouriers()}>
                    刷新
                  </button>
                  <button type="button" className="user-mgmt__btn" onClick={() => setCourierDeskOpen(false)}>
                    收起列表
                  </button>
                </div>
              </div>
              <div className="user-mgmt__filters">
                <div className="user-mgmt__search">
                  <span className="user-mgmt__search-icon">⌕</span>
                  <input
                    type="search"
                    placeholder="搜索姓名、电话、工号…"
                    value={courierSearchInput}
                    onChange={(e) => setCourierSearchInput(e.target.value)}
                  />
                </div>
                <select value={courierStatusFilter} onChange={(e) => setCourierStatusFilter(e.target.value)}>
                  <option value="all">全部状态</option>
                  <option value="active">活跃</option>
                  <option value="inactive">停用</option>
                </select>
                <select value={vehicleFilter} onChange={(e) => setVehicleFilter(e.target.value)}>
                  <option value="all">全部车型</option>
                  <option value="motorcycle">摩托车</option>
                  <option value="car">汽车</option>
                  <option value="bicycle">自行车</option>
                  <option value="truck">货车</option>
                </select>
              </div>
            </div>
            {courierLoading ? (
              <SkeletonTable rows={4} />
            ) : couriers.length === 0 ? (
              <div className="user-mgmt__empty">
                <p className="user-mgmt__empty-text">没有匹配的骑手</p>
              </div>
            ) : (
              <>
                <div className="user-mgmt-table-wrap">
                  <table className="user-mgmt-table user-mgmt-table--couriers">
                    <thead>
                      <tr>
                        <th>骑手</th>
                        <th>电话</th>
                        <th>地区</th>
                        <th>车型</th>
                        <th>配送</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {couriers.map((courier) => (
                        <CourierRow
                          key={courier.id}
                          courier={courier}
                          onEdit={handleEditCourier}
                          onStatus={handleCourierStatusChange}
                          onDelete={handleDeleteCourier}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
                <TablePager
                  page={courierPage}
                  pageSize={courierPageSize}
                  total={courierTotal}
                  onPage={setCourierPage}
                  onPageSize={(size) => {
                    setCourierPageSize(size);
                    setCourierPage(1);
                  }}
                />
              </>
            )}
            </>
            )}
          </section>
        )}

        {showAddUserForm && (
          <div className="user-mgmt-modal-overlay" onClick={closeUserForm}>
            <div className="user-mgmt-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="user-mgmt-modal__head">
                <div>
                  <h2 className="user-mgmt-modal__title">{editingUser ? '编辑客户资料' : '新增客户'}</h2>
                  <p className="user-mgmt-modal__sub">仅创建会员客户。管理员与骑手请到系统设置 → 账户管理。</p>
                </div>
                <button type="button" className="user-mgmt-modal__close" onClick={closeUserForm} aria-label="关闭">
                  ✕
                </button>
              </div>
              <form className="user-mgmt-modal__body" onSubmit={editingUser ? handleUpdateUser : handleCreateUser}>
                <div className="user-mgmt-form">
                  <div className="user-mgmt-field user-mgmt-field--full">
                    <label>姓名</label>
                    <input type="text" value={userForm.name} onChange={(e) => setUserForm({ ...userForm, name: e.target.value })} required />
                  </div>
                  <div className="user-mgmt-field">
                    <label>电话</label>
                    <input type="tel" value={userForm.phone} onChange={(e) => setUserForm({ ...userForm, phone: e.target.value })} required />
                  </div>
                  <div className="user-mgmt-field">
                    <label>邮箱</label>
                    <input type="email" value={userForm.email} onChange={(e) => setUserForm({ ...userForm, email: e.target.value })} />
                  </div>
                  <div className="user-mgmt-field">
                    <label>{editingUser ? '登录密码（留空不修改）' : '登录密码'}</label>
                    <input
                      type="password"
                      value={userForm.password}
                      onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                      placeholder={editingUser ? '不修改请留空' : '必填'}
                      required={!editingUser}
                    />
                  </div>
                  <div className="user-mgmt-field">
                    <label>注册领区</label>
                    <select value={userForm.register_region} onChange={(e) => setUserForm({ ...userForm, register_region: e.target.value })}>
                      {REGIONS.map((region) => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {editingUser && (
                    <div className="user-mgmt-field">
                      <label>会员类型</label>
                      <select
                        value={userForm.user_type === 'vip' ? 'vip' : 'customer'}
                        onChange={(e) => setUserForm({ ...userForm, user_type: e.target.value as User['user_type'] })}
                      >
                        <option value="customer">普通会员</option>
                        <option value="vip">VIP 会员</option>
                      </select>
                    </div>
                  )}
                  <div className="user-mgmt-field">
                    <label>账号状态</label>
                    <select value={userForm.status} onChange={(e) => setUserForm({ ...userForm, status: e.target.value as User['status'] })}>
                      <option value="active">活跃</option>
                      <option value="inactive">非活跃</option>
                      {editingUser && <option value="suspended">已暂停</option>}
                    </select>
                  </div>
                  {editingUser && userForm.status === 'suspended' && (
                    <div className="user-mgmt-field user-mgmt-field--full">
                      <label>冻结原因</label>
                      <textarea
                        value={userForm.freeze_reason}
                        onChange={(e) => setUserForm({ ...userForm, freeze_reason: e.target.value })}
                        placeholder="冻结账号必须填写原因"
                        required
                      />
                    </div>
                  )}
                  <div className="user-mgmt-field user-mgmt-field--full">
                    <label>联系地址</label>
                    <textarea value={userForm.address} onChange={(e) => setUserForm({ ...userForm, address: e.target.value })} />
                  </div>
                  <div className="user-mgmt-field user-mgmt-field--full">
                    <label>备注信息</label>
                    <textarea value={userForm.notes} onChange={(e) => setUserForm({ ...userForm, notes: e.target.value })} />
                  </div>
                </div>
                <div className="user-mgmt-modal__foot">
                  <button type="submit" className="user-mgmt__btn user-mgmt__btn--primary">
                    {editingUser ? '保存修改' : '确认创建'}
                  </button>
                  <button type="button" className="user-mgmt__btn" onClick={closeUserForm}>
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showAddCourierForm && (
          <div
            className="user-mgmt-modal-overlay"
            onClick={() => {
              setShowAddCourierForm(false);
              setEditingCourier(null);
            }}
          >
            <div className="user-mgmt-modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="user-mgmt-modal__head">
                <div>
                  <h2 className="user-mgmt-modal__title">编辑骑手资料</h2>
                  <p className="user-mgmt-modal__sub">以骑手表为主；若已关联后台账号，会同步姓名、电话和状态。</p>
                </div>
                <button
                  type="button"
                  className="user-mgmt-modal__close"
                  onClick={() => {
                    setShowAddCourierForm(false);
                    setEditingCourier(null);
                  }}
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
              <form className="user-mgmt-modal__body" onSubmit={handleUpdateCourier}>
                <div className="user-mgmt-form">
                  <div className="user-mgmt-field user-mgmt-field--full">
                    <label>姓名</label>
                    <input type="text" value={courierForm.name} onChange={(e) => setCourierForm({ ...courierForm, name: e.target.value })} required />
                  </div>
                  <div className="user-mgmt-field">
                    <label>电话</label>
                    <input type="tel" value={courierForm.phone} onChange={(e) => setCourierForm({ ...courierForm, phone: e.target.value })} required />
                  </div>
                  <div className="user-mgmt-field">
                    <label>员工编号</label>
                    <input
                      type="text"
                      value={courierForm.employee_id}
                      onChange={(e) => setCourierForm({ ...courierForm, employee_id: e.target.value })}
                    />
                  </div>
                  <div className="user-mgmt-field">
                    <label>车辆类型</label>
                    <select value={courierForm.vehicle_type} onChange={(e) => setCourierForm({ ...courierForm, vehicle_type: e.target.value })}>
                      <option value="motorcycle">摩托车</option>
                      <option value="car">汽车</option>
                      <option value="truck">货车</option>
                    </select>
                  </div>
                  <div className="user-mgmt-field">
                    <label>车牌号</label>
                    <input
                      type="text"
                      value={courierForm.license_number}
                      onChange={(e) => setCourierForm({ ...courierForm, license_number: e.target.value })}
                    />
                  </div>
                  <div className="user-mgmt-field user-mgmt-field--full">
                    <label>注册地址</label>
                    <textarea value={courierForm.address} onChange={(e) => setCourierForm({ ...courierForm, address: e.target.value })} />
                  </div>
                </div>
                <div className="user-mgmt-modal__foot">
                  <button type="submit" className="user-mgmt__btn user-mgmt__btn--primary">
                    保存修改
                  </button>
                  <button
                    type="button"
                    className="user-mgmt__btn"
                    onClick={() => {
                      setShowAddCourierForm(false);
                      setEditingCourier(null);
                    }}
                  >
                    取消
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showRechargeModal && rechargeUser && (
          <div
            className="user-mgmt-modal-overlay"
            onClick={() => {
              if (!isRecharging) {
                setShowRechargeModal(false);
                setRechargeUser(null);
              }
            }}
          >
            <div className="user-mgmt-modal user-mgmt-modal--sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="user-mgmt-modal__head">
                <div>
                  <h2 className="user-mgmt-modal__title">账户充值</h2>
                  <p className="user-mgmt-modal__sub">
                    {rechargeUser.name} · 当前余额 {(rechargeUser.balance ?? 0).toLocaleString()} MMK
                    <br />
                    将写入充值流水，并记录当前登录管理员。
                  </p>
                </div>
                <button
                  type="button"
                  className="user-mgmt-modal__close"
                  onClick={() => {
                    if (!isRecharging) {
                      setShowRechargeModal(false);
                      setRechargeUser(null);
                    }
                  }}
                  aria-label="关闭"
                >
                  ✕
                </button>
              </div>
              <div className="user-mgmt-modal__body">
                {isRecharging && <p className="user-mgmt-modal__busy">正在入账…</p>}
                <div className="user-mgmt-recharge-grid">
                  {RECHARGE_AMOUNTS.map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      className="user-mgmt-recharge-amt"
                      disabled={isRecharging}
                      onClick={() => handleRecharge(amount)}
                    >
                      {amount.toLocaleString()} MMK
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="user-mgmt__btn"
                  style={{ width: '100%' }}
                  disabled={isRecharging}
                  onClick={() => {
                    setShowRechargeModal(false);
                    setRechargeUser(null);
                  }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        )}

        {detailUser && (
          <CustomerDrawer
            user={detailUser}
            tab={detailTab}
            onTab={setDetailTab}
            onClose={() => setDetailUser(null)}
            onEdit={(user) => {
              handleEditUser(user);
            }}
            onRecharge={handleOpenRecharge}
            onFreeze={(user) => {
              setFreezeUser(user);
              setFreezeReason(user.freeze_reason || '');
            }}
            onUnfreeze={(user) => {
              void updateUserStatus(user, 'active');
            }}
            loading={detailLoading}
            orders={detailOrders}
            ledger={detailLedger}
          />
        )}

        {freezeUser && (
          <div
            className="user-mgmt-modal-overlay"
            onClick={() => {
              if (!freezeSaving) setFreezeUser(null);
            }}
          >
            <div className="user-mgmt-modal user-mgmt-modal--sm" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
              <div className="user-mgmt-modal__head">
                <div>
                  <h2 className="user-mgmt-modal__title">冻结客户</h2>
                  <p className="user-mgmt-modal__sub">
                    {freezeUser.name} 将被设为「已暂停」。必须填写原因，解冻时会清空。
                  </p>
                </div>
                <button type="button" className="user-mgmt-modal__close" onClick={() => !freezeSaving && setFreezeUser(null)} aria-label="关闭">
                  ✕
                </button>
              </div>
              <div className="user-mgmt-modal__body">
                <div className="user-mgmt-field user-mgmt-field--full">
                  <label>冻结原因</label>
                  <textarea
                    value={freezeReason}
                    onChange={(e) => setFreezeReason(e.target.value)}
                    placeholder="例如：投诉未处理、异常充值、客户要求停用…"
                    required
                  />
                </div>
                <div className="user-mgmt-modal__foot">
                  <button type="button" className="user-mgmt__btn user-mgmt__btn--danger" onClick={() => void submitFreeze()} disabled={freezeSaving}>
                    {freezeSaving ? '提交中…' : '确认冻结'}
                  </button>
                  <button type="button" className="user-mgmt__btn" disabled={freezeSaving} onClick={() => setFreezeUser(null)}>
                    取消
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserManagement;
