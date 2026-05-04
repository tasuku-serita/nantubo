import { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { FREE_HISTORY_LIMIT } from '../../lib/constants';
import { formatYen, formatUnit } from '../../lib/format';
import { sqmToTatami } from '../../lib/constants';
import { PremiumModal } from '../modals/PremiumModal';
import type { PropertyRecord, PropertyStatus } from '../../types';
import type { PremiumModalVariant } from '../modals/PremiumModal';
import styles from './HistoryTab.module.css';
import { usePremium } from '../../hooks/usePremium';

const STATUS_OPTIONS: { value: PropertyStatus; icon: string; label: string }[] = [
  { value: 'favorite',    icon: '🌟', label: '第一候補' },
  { value: 'considering', icon: '💭', label: '検討中' },
  { value: 'visited',     icon: '✅', label: '内見済み' },
  { value: 'rejected',    icon: '❌', label: '見送り' },
  { value: 'none',        icon: '⚪️', label: '未設定' },
];

const FILTER_OPTIONS: { value: PropertyStatus | 'all'; label: string }[] = [
  { value: 'all',         label: 'すべて' },
  { value: 'favorite',    label: '🌟 第一候補' },
  { value: 'considering', label: '💭 検討中' },
  { value: 'visited',     label: '✅ 内見済み' },
  { value: 'rejected',    label: '❌ 見送り' },
];

const SORT_OPTIONS: { value: 'savedAt' | 'sqm' | 'rent' | 'perSqm'; label: string }[] = [
  { value: 'savedAt', label: '保存が新しい順' },
  { value: 'sqm',     label: '広い順' },
  { value: 'rent',    label: '家賃が安い順' },
  { value: 'perSqm',  label: '㎡単価が安い順' },
];

function getStatusDisplay(status?: PropertyStatus) {
  const opt = STATUS_OPTIONS.find(o => o.value === status);
  if (!opt || opt.value === 'none') return null;
  return opt;
}

export function HistoryTab() {
  const { history, removeHistory, isPremium, updatePropertyStatus } = useApp();
  const { purchase } = usePremium();
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [premiumVariant, setPremiumVariant] = useState<PremiumModalVariant>('default');

  const openPremiumModal = (variant: PremiumModalVariant) => {
    setPremiumVariant(variant);
    setShowPremiumModal(true);
  };
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [statusMenuId, setStatusMenuId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<PropertyStatus | 'all'>('all');
  const [sortKey, setSortKey] = useState<'savedAt' | 'sqm' | 'rent' | 'perSqm'>('savedAt');

  const displayedHistory = useMemo(() => {
    let list = [...history];
    if (filterStatus !== 'all') {
      list = list.filter(r => (r.status ?? 'none') === filterStatus);
    }
    switch (sortKey) {
      case 'sqm':    list.sort((a, b) => b.sqm - a.sqm); break;
      case 'rent':   list.sort((a, b) => (a.rent || Infinity) - (b.rent || Infinity)); break;
      case 'perSqm': list.sort((a, b) => (a.perSqm || Infinity) - (b.perSqm || Infinity)); break;
      default:       list.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
    }
    return list;
  }, [history, filterStatus, sortKey]);

  const handleCopy = (r: PropertyRecord) => {
    const date = new Date(r.savedAt);
    const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const tatamiStd = (r.tatamiStandard as '1.62' | '1.65' | '1.824') || '1.62';
    const tatami = sqmToTatami(r.sqm, tatamiStd);
    const lines = [
      `🏠 ${r.name}`,
      `広さ：${r.sqm}㎡（${formatUnit(tatami, '畳')}）`,
    ];
    if (r.rent > 0) {
      lines.push(`家賃：${formatYen(r.rent)}`);
      if (r.perSqm > 0) lines.push(`㎡単価：${formatYen(r.perSqm)}`);
    }
    if (r.memo) lines.push(`📝 ${r.memo}`);
    lines.push(`📅 ${dateStr}保存`);
    const statusOpt = STATUS_OPTIONS.find(o => o.value === r.status);
    if (statusOpt && statusOpt.value !== 'none') {
      lines.push(`${statusOpt.icon} ${statusOpt.label}`);
    }

    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    setCopiedId(r.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const remaining = isPremium ? null : FREE_HISTORY_LIMIT - history.length;

  const handleDelete = (id: string) => {
    if (confirmId === id) {
      removeHistory(id);
      setConfirmId(null);
    } else {
      setConfirmId(id);
      setTimeout(() => setConfirmId(null), 3000);
    }
  };

  const handleStatusClick = (id: string) => {
    if (!isPremium) {
      openPremiumModal('statusLock');
      return;
    }
    setStatusMenuId(statusMenuId === id ? null : id);
  };

  const handleStatusSelect = (id: string, status: PropertyStatus) => {
    updatePropertyStatus(id, status);
    setStatusMenuId(null);
  };

  if (history.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>気になる物件をあとで見返せます</p>
        <p className={styles.emptyHint}>内見候補や迷っている物件を保存しておくと、広さ・家賃・㎡単価をあとから比較し直せます。</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {!isPremium && (
        <div className={remaining === 0 ? styles.limitBannerFull : styles.limitBanner}>
          {remaining === 0
            ? <>残り0件。<button className={styles.upgradeLink} onClick={() => setShowPremiumModal(true)}>プレミアム版で無制限に</button></>
            : `履歴 ${history.length}/${FREE_HISTORY_LIMIT}件`
          }
        </div>
      )}

      {/* フィルタチップ */}
      <div className={styles.filterRow}>
        {FILTER_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`${styles.filterChip} ${filterStatus === opt.value ? styles.filterChipActive : ''}`}
            onClick={() => setFilterStatus(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* ソート + 件数 */}
      <div className={styles.sortRow}>
        <select
          className={styles.sortSelect}
          value={sortKey}
          onChange={e => setSortKey(e.target.value as typeof sortKey)}
        >
          {SORT_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <span className={styles.countLabel}>{displayedHistory.length}件表示</span>
      </div>

      {displayedHistory.map(r => {
        const date = new Date(r.savedAt);
        const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
        const statusDisplay = getStatusDisplay(r.status);

        return (
          <div key={r.id} className={styles.card}>
            <div className={styles.cardTop}>
              <div className={styles.cardTitleArea}>
                <p className={styles.name}>{r.name}</p>
                <p className={styles.date}>{dateStr}</p>
              </div>
              <div className={styles.cardActions}>
                <button className={styles.copyBtn} onClick={() => handleCopy(r)}>
                  {copiedId === r.id ? 'コピーしました ✓' : '📋 コピー'}
                </button>
                <button
                  className={confirmId === r.id ? styles.deleteBtnConfirm : styles.deleteBtn}
                  onClick={() => handleDelete(r.id)}
                >
                  {confirmId === r.id ? '確認：削除' : '削除'}
                </button>
              </div>
            </div>

            <button
              className={statusDisplay ? styles.statusBadge : styles.statusBadgeEmpty}
              onClick={() => handleStatusClick(r.id)}
            >
              {statusDisplay ? (
                <><span>{statusDisplay.icon}</span><span>{statusDisplay.label}</span></>
              ) : (
                <><span>＋</span><span>{isPremium ? 'ステータスを設定' : 'ステータス（プレミアム）'}</span></>
              )}
            </button>

            {statusMenuId === r.id && (
              <div className={styles.statusMenu}>
                {STATUS_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.statusOption} ${r.status === opt.value ? styles.statusOptionActive : ''}`}
                    onClick={() => handleStatusSelect(r.id, opt.value)}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}

            <div className={styles.stats}>
              <span className={styles.stat}>{r.sqm}㎡</span>
              {r.rent > 0 && <span className={styles.stat}>家賃 {formatYen(r.rent)}</span>}
              {r.perSqm > 0 && <span className={styles.stat}>{formatYen(r.perSqm)}/㎡</span>}
            </div>
            {r.memo && <p className={styles.memo}>{r.memo}</p>}
          </div>
        );
      })}

      {showPremiumModal && (
        <PremiumModal
          variant={premiumVariant}
          onUpgrade={async () => { await purchase(); setShowPremiumModal(false); }}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </div>
  );
}
