import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { trpc } from '@/lib/trpc';

/**
 * AdminCdks.tsx
 * 管理后台：福利（CDK兑换）页面
 */
export function AdminCdks({ lang = 'zh' }: { lang?: 'zh' | 'en' }) {
  const isZh = lang !== 'en';
  const utils = trpc.useUtils();

  const [page, setPage] = useState(1);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<'all' | 'unused' | 'used' | 'expired' | 'deleted'>('all');
  const [showCreate, setShowCreate] = useState(false);
  const [amount, setAmount] = useState('10');
  const [expireDays, setExpireDays] = useState('1');
  const [quantity, setQuantity] = useState('10');
  const [previewCodes, setPreviewCodes] = useState<string[]>([]);

  const pageSize = 20;
  const listQuery = trpc.admin.cdkList.useQuery({
    page,
    limit: pageSize,
    keyword: keyword || undefined,
    status,
  });

  const createMutation = trpc.admin.createCdks.useMutation({
    onSuccess: (res) => {
      toast.success(isZh ? `成功生成 ${res.quantity} 个 CDK` : `Generated ${res.quantity} CDKs`);
      setPreviewCodes(res.previewCodes || []);
      setShowCreate(false);
      utils.admin.cdkList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const deleteMutation = trpc.admin.deleteCdk.useMutation({
    onSuccess: () => {
      toast.success(isZh ? 'CDK 删除成功' : 'CDK deleted');
      utils.admin.cdkList.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const total = listQuery.data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const labels = useMemo(() => ({
    title: isZh ? '福利（CDK兑换）' : 'Welfare (CDK Redemption)',
    subtitle: isZh ? '管理平台币兑换码，支持批量生成、状态筛选和未使用删除。' : 'Manage platform coin redemption codes with batch generation and status filters.',
    add: isZh ? '添加' : 'Create',
    generate: isZh ? '生成' : 'Generate',
    cancel: isZh ? '取消' : 'Cancel',
    amount: isZh ? '金额' : 'Amount',
    expireDays: isZh ? '有效期（天）' : 'Validity (days)',
    quantity: isZh ? '生成数量' : 'Quantity',
    searchPlaceholder: isZh ? '输入 CDK 或用户pid' : 'Search CDK or user pid',
    search: isZh ? '搜索' : 'Search',
    reset: isZh ? '重置' : 'Reset',
    status: isZh ? '状态' : 'Status',
    statusAll: isZh ? '全部' : 'All',
    statusUnused: isZh ? '未使用' : 'Unused',
    statusUsed: isZh ? '已使用' : 'Used',
    statusExpired: isZh ? '已过期' : 'Expired',
    statusDeleted: isZh ? '已删除' : 'Deleted',
    id: 'ID',
    expireAt: isZh ? '有效期' : 'Expire At',
    code: 'CDKEY',
    userPid: isZh ? '用户pid' : 'User PID',
    actions: isZh ? '操作' : 'Actions',
    delete: isZh ? '删除' : 'Delete',
    noData: isZh ? '暂无数据' : 'No data',
    prev: isZh ? '上一页' : 'Prev',
    next: isZh ? '下一页' : 'Next',
    generatedPreview: isZh ? '最近一次生成的前10个 CDK 预览' : 'Preview of latest generated codes',
    createTitle: isZh ? '新增福利 CDK' : 'Create Welfare CDK',
  }), [isZh]);

  const handleCreate = () => {
    const amountNum = Number(amount);
    const expireDaysNum = Number(expireDays);
    const quantityNum = Number(quantity);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error(isZh ? '请输入正确金额' : 'Invalid amount');
      return;
    }
    if (!Number.isInteger(expireDaysNum) || expireDaysNum <= 0) {
      toast.error(isZh ? '请输入正确有效期' : 'Invalid validity');
      return;
    }
    if (!Number.isInteger(quantityNum) || quantityNum <= 0) {
      toast.error(isZh ? '请输入正确生成数量' : 'Invalid quantity');
      return;
    }
    createMutation.mutate({ amount: amountNum, expireDays: expireDaysNum, quantity: quantityNum });
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{
        background: 'linear-gradient(135deg, rgba(123,47,255,0.18), rgba(6,182,212,0.10))',
        border: '1px solid rgba(120,60,220,0.25)',
        borderRadius: 16,
        padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ color: '#fff', fontSize: 22, fontWeight: 800 }}>{labels.title}</div>
            <div style={{ color: 'rgba(220,220,255,0.72)', fontSize: 13, marginTop: 6 }}>{labels.subtitle}</div>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '10px 18px',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {labels.add}
          </button>
        </div>
      </div>

      <div style={{
        background: 'rgba(15, 23, 42, 0.88)',
        border: '1px solid rgba(120,60,220,0.18)',
        borderRadius: 16,
        padding: 16,
      }}>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            placeholder={labels.searchPlaceholder}
            style={{
              flex: '1 1 240px',
              minWidth: 220,
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              padding: '0 14px',
              outline: 'none',
            }}
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value as typeof status);
              setPage(1);
            }}
            style={{
              height: 40,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.10)',
              background: 'rgba(255,255,255,0.04)',
              color: '#fff',
              padding: '0 12px',
              outline: 'none',
            }}
          >
            <option value="all">{labels.statusAll}</option>
            <option value="unused">{labels.statusUnused}</option>
            <option value="used">{labels.statusUsed}</option>
            <option value="expired">{labels.statusExpired}</option>
            <option value="deleted">{labels.statusDeleted}</option>
          </select>
          <button
            onClick={() => {
              setKeyword(keywordInput.trim());
              setPage(1);
            }}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 10,
              border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
              color: '#fff',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {labels.search}
          </button>
          <button
            onClick={() => {
              setKeywordInput('');
              setKeyword('');
              setStatus('all');
              setPage(1);
            }}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.12)',
              background: 'transparent',
              color: 'rgba(255,255,255,0.82)',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            {labels.reset}
          </button>
        </div>

        <div style={{ marginTop: 16, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 920 }}>
            <thead>
              <tr style={{ background: 'rgba(120,60,220,0.14)' }}>
                {[labels.id, labels.expireAt, labels.code, labels.status, labels.amount, labels.userPid, labels.actions].map((head) => (
                  <th key={head} style={{ padding: '12px 10px', color: '#fff', fontSize: 13, textAlign: 'left', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>{head}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(listQuery.data?.list || []).map((item) => {
                const canDelete = item.rawStatus === 0 && item.status === (isZh ? '未使用' : 'Unused');
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.88)' }}>{item.id}</td>
                    <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.72)' }}>{item.expireAt ? new Date(item.expireAt).toLocaleString() : '-'}</td>
                    <td style={{ padding: '12px 10px', color: '#fff', fontFamily: 'monospace', letterSpacing: 1 }}>{item.code}</td>
                    <td style={{ padding: '12px 10px', color: item.status === '未使用' ? '#34d399' : item.status === '已使用' ? '#fbbf24' : 'rgba(255,255,255,0.65)' }}>{item.status}</td>
                    <td style={{ padding: '12px 10px', color: '#fff' }}>{Number(item.amount).toFixed(2)}</td>
                    <td style={{ padding: '12px 10px', color: 'rgba(255,255,255,0.82)' }}>{item.userPid ?? '-'}</td>
                    <td style={{ padding: '12px 10px' }}>
                      <button
                        disabled={!canDelete || deleteMutation.isPending}
                        onClick={() => deleteMutation.mutate({ id: item.id })}
                        style={{
                          height: 32,
                          padding: '0 12px',
                          borderRadius: 8,
                          border: 'none',
                          background: canDelete ? '#f97316' : 'rgba(255,255,255,0.12)',
                          color: '#fff',
                          cursor: canDelete ? 'pointer' : 'not-allowed',
                        }}
                      >
                        {labels.delete}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!listQuery.isLoading && (listQuery.data?.list || []).length === 0 && (
                <tr>
                  <td colSpan={7} style={{ padding: '24px 10px', textAlign: 'center', color: 'rgba(255,255,255,0.6)' }}>{labels.noData}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
          <div style={{ color: 'rgba(255,255,255,0.68)', fontSize: 13 }}>
            {isZh ? `共 ${total} 条记录` : `Total ${total} records`}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: '#fff',
                cursor: page <= 1 ? 'not-allowed' : 'pointer',
              }}
            >
              {labels.prev}
            </button>
            <div style={{ color: '#fff', fontSize: 13 }}>{page} / {totalPages}</div>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              style={{
                height: 34,
                padding: '0 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'transparent',
                color: '#fff',
                cursor: page >= totalPages ? 'not-allowed' : 'pointer',
              }}
            >
              {labels.next}
            </button>
          </div>
        </div>
      </div>

      {previewCodes.length > 0 && (
        <div style={{
          background: 'rgba(15,23,42,0.88)',
          border: '1px solid rgba(16,185,129,0.22)',
          borderRadius: 16,
          padding: 16,
        }}>
          <div style={{ color: '#fff', fontWeight: 700, marginBottom: 10 }}>{labels.generatedPreview}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
            {previewCodes.map((code) => (
              <div key={code} style={{
                padding: '10px 12px',
                borderRadius: 10,
                background: 'rgba(255,255,255,0.04)',
                color: '#dbeafe',
                fontFamily: 'monospace',
                letterSpacing: 1,
              }}>
                {code}
              </div>
            ))}
          </div>
        </div>
      )}

      {showCreate && (
        <div
          onClick={() => setShowCreate(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.68)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 420,
              background: 'linear-gradient(135deg, #ffffff, #f8fafc)',
              borderRadius: 16,
              padding: 22,
              boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
            }}
          >
            <div style={{ color: '#111827', fontSize: 20, fontWeight: 800, marginBottom: 18 }}>{labels.createTitle}</div>
            <div style={{ display: 'grid', gap: 14 }}>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>{labels.amount}</span>
                <input value={amount} onChange={(e) => setAmount(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', background: '#ffffff', color: '#111827', fontSize: 15, fontWeight: 600 }} />
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>{labels.expireDays}</span>
                <select value={expireDays} onChange={(e) => setExpireDays(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', background: '#ffffff', color: '#111827', fontSize: 15, fontWeight: 600 }}>
                  <option value="1">1</option>
                  <option value="3">3</option>
                  <option value="7">7</option>
                  <option value="15">15</option>
                  <option value="30">30</option>
                  <option value="90">90</option>
                </select>
              </label>
              <label style={{ display: 'grid', gap: 6 }}>
                <span style={{ color: '#374151', fontSize: 13, fontWeight: 600 }}>{labels.quantity}</span>
                <input value={quantity} onChange={(e) => setQuantity(e.target.value)} style={{ height: 40, borderRadius: 10, border: '1px solid #d1d5db', padding: '0 12px', background: '#ffffff', color: '#111827', fontSize: 15, fontWeight: 600 }} />
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
              <button onClick={() => setShowCreate(false)} style={{ height: 40, padding: '0 16px', borderRadius: 10, border: '1px solid #d1d5db', background: '#fff', color: '#111827', cursor: 'pointer' }}>{labels.cancel}</button>
              <button onClick={handleCreate} disabled={createMutation.isPending} style={{ height: 40, padding: '0 18px', borderRadius: 10, border: 'none', background: '#2563eb', color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{labels.generate}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
