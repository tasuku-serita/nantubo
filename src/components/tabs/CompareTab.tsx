import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { sqmToTsubo, sqmToTatami } from '../../lib/constants';
import { formatYen, formatUnit, safeDiv } from '../../lib/format';
import { PremiumModal } from '../modals/PremiumModal';
import type { PropertyRecord } from '../../types';
import styles from './CompareTab.module.css';
import { usePremium } from '../../hooks/usePremium';

const MAX_VALUE = 99_999_999;

type PropertyInput = {
  name: string;
  rent: string;
  sqm: string;
  memo: string;
};

const emptyInput = (): PropertyInput => ({ name: '', rent: '', sqm: '', memo: '' });

function sanitize(v: string): number {
  const n = parseFloat(v);
  if (isNaN(n) || n < 0) return 0;
  return Math.min(n, MAX_VALUE);
}

function isValid(p: PropertyInput): boolean {
  return sanitize(p.sqm) > 0;
}

type Computed = {
  sqm: number;
  rent: number;
  perSqm: number;
  perTsubo: number;
};

function compute(p: PropertyInput): Computed {
  const sqm = sanitize(p.sqm);
  const rent = sanitize(p.rent);
  return {
    sqm,
    rent,
    perSqm: safeDiv(rent, sqm),
    perTsubo: safeDiv(rent, sqmToTsubo(sqm)),
  };
}

function winner<T>(items: T[], score: (t: T) => number, higher: boolean): number[] {
  const scores = items.map(score);
  const best = higher ? Math.max(...scores) : Math.min(...scores.filter(s => s > 0));
  return scores.map((s, i) => (s === best && s > 0 ? i : -1)).filter(i => i >= 0);
}

function getDiffComment(
  props: PropertyInput[],
  computed: Computed[],
  validIndices: number[],
): string | null {
  if (validIndices.length !== 2) return null;
  const [i0, i1] = validIndices;
  const c0 = computed[i0];
  const c1 = computed[i1];
  const n0 = props[i0].name.trim() || `物件${String.fromCharCode(65 + i0)}`;
  const n1 = props[i1].name.trim() || `物件${String.fromCharCode(65 + i1)}`;

  const sqmDiff = Math.abs(c1.sqm - c0.sqm);
  const widerName  = c1.sqm >= c0.sqm ? n1 : n0;
  const narrowName = c1.sqm >= c0.sqm ? n0 : n1;

  let line1: string;
  if (sqmDiff < 0.05) {
    line1 = `${n0}と${n1}の広さはほぼ同じです。`;
  } else {
    line1 = `${widerName}は${narrowName}より${sqmDiff.toFixed(1)}㎡広いです。`;
  }

  if (c0.rent <= 0 || c1.rent <= 0) return line1;

  const rentDiff = Math.abs(c1.rent - c0.rent);
  if (rentDiff === 0) return `${line1}家賃は同額です。`;

  const pricierName = c1.rent >= c0.rent ? n1 : n0;
  const annual = rentDiff * 12;
  return `${line1}家賃は${pricierName}の方が月${rentDiff.toLocaleString()}円高く、年間では${annual.toLocaleString()}円の差です。`;
}

export function CompareTab() {
  const { isPremium, tatamiStandard, addHistory, incrementCompareCount } = useApp();
  const { purchase } = usePremium();

  const [properties, setProperties] = useState<PropertyInput[]>([emptyInput(), emptyInput()]);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [copyLabel, setCopyLabel] = useState('比較結果をコピー');

  const update = (i: number, field: keyof PropertyInput, v: string) => {
    if ((field === 'rent' || field === 'sqm') && v.length > 10) return;
    setProperties(prev => prev.map((p, idx) => idx === i ? { ...p, [field]: v } : p));
  };

  const validProps = properties.filter(isValid);
  const computed = properties.map(p => compute(p));
  const validIndices = properties.map((p, i) => isValid(p) ? i : -1).filter(i => i >= 0);

  const widestIdxs       = winner(computed.filter((_, i) => isValid(properties[i])), c => c.sqm, true);
  const cheapestSqmIdxs  = winner(computed.filter((_, i) => isValid(properties[i]) && computed[i].perSqm > 0), c => c.perSqm, false);
  const cheapestTsuboIdxs = winner(computed.filter((_, i) => isValid(properties[i]) && computed[i].perTsubo > 0), c => c.perTsubo, false);
  const cheapestRentIdxs = winner(computed.filter((_, i) => isValid(properties[i]) && computed[i].rent > 0), c => c.rent, false);

  const hasAnyRent = validIndices.some(i => computed[i].rent > 0);
  const diffComment = getDiffComment(properties, computed, validIndices);

  function isWinner(globalIdx: number, winnerLocalIdxs: number[]): boolean {
    const localIdx = validIndices.indexOf(globalIdx);
    return localIdx >= 0 && winnerLocalIdxs.includes(localIdx);
  }

  function getLabel(localIdxs: number[]): string {
    return localIdxs.map(i => properties[i].name.trim() || `物件${String.fromCharCode(65 + i)}`).join(' / ');
  }

  const handleCopyCompare = () => {
    const lines = ['🏠 物件比較メモ', ''];
    for (let i = 0; i < properties.length; i++) {
      if (!isValid(properties[i])) continue;
      const c = computed[i];
      const name = properties[i].name.trim() || `物件${String.fromCharCode(65 + i)}`;
      const tatami = sqmToTatami(c.sqm, tatamiStandard);
      lines.push(`▼ ${name}`);
      lines.push(`${c.sqm}㎡（${formatUnit(tatami, '畳')}）`);
      if (c.rent > 0) {
        lines.push(`家賃：${formatYen(c.rent)}　/　㎡単価：${formatYen(c.perSqm)}`);
      }
      lines.push('');
    }
    lines.push('━━━━━━━━━━');
    if (widestIdxs.length > 0) lines.push(`📐 広さで選ぶなら：${getLabel(widestIdxs)}`);
    if (cheapestRentIdxs.length > 0 && hasAnyRent) lines.push(`💴 家賃で選ぶなら：${getLabel(cheapestRentIdxs)}`);
    if (cheapestSqmIdxs.length > 0 && hasAnyRent) lines.push(`⚖️ バランスで選ぶなら：${getLabel(cheapestSqmIdxs)}`);

    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    setCopyLabel('コピーしました ✓');
    setTimeout(() => setCopyLabel('比較結果をコピー'), 1500);
  };

  const handleSaveAll = () => {
    if (validProps.length === 0) return;
    const now = new Date();
    let saved = 0;
    for (let i = 0; i < properties.length; i++) {
      if (!isValid(properties[i])) continue;
      const c = computed[i];
      const record: PropertyRecord = {
        id: crypto.randomUUID(),
        name: properties[i].name.trim() || `物件${String.fromCharCode(65 + i)} ${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
        rent: c.rent,
        sqm: c.sqm,
        memo: properties[i].memo,
        perSqm: c.perSqm,
        perTsubo: c.perTsubo,
        perTatami: safeDiv(c.rent, sqmToTatami(c.sqm, tatamiStandard)),
        tatamiStandard,
        savedAt: now.toISOString(),
      };
      const ok = addHistory(record);
      if (!ok) { setShowPremiumModal(true); break; }
      saved++;
    }
    if (saved > 0) {
      incrementCompareCount();
      setSaveMsg(`${saved}件保存しました`);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  };

  return (
    <div className={styles.container}>

      <div className={styles.hintPill}>物件を並べて比較</div>

      {properties.map((p, i) => (
        <div key={i} className={styles.propertyCard}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>物件 {String.fromCharCode(65 + i)}</span>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>物件名（任意）</label>
              <input className={styles.input} type="text" placeholder="例：渋谷のマンション" value={p.name} onChange={e => update(i, 'name', e.target.value)} maxLength={40} />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>広さ（㎡）</label>
              <input className={styles.input} inputMode="decimal" placeholder="例：25.5" value={p.sqm} onChange={e => update(i, 'sqm', e.target.value)} />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>月額家賃（円）</label>
              <input className={styles.input} inputMode="decimal" placeholder="例：70000" value={p.rent} onChange={e => update(i, 'rent', e.target.value)} />
            </div>
          </div>
          <div className={styles.fieldRow}>
            <div className={styles.field}>
              <label className={styles.label}>メモ（任意）</label>
              <input className={styles.input} type="text" placeholder="例：駅から5分" value={p.memo} onChange={e => update(i, 'memo', e.target.value)} maxLength={100} />
            </div>
          </div>

          {isValid(p) && (
            <div className={styles.resultRow}>
              <span className={styles.resultItem}>
                {formatUnit(computed[i].sqm, '㎡')}
                {isWinner(i, widestIdxs) && <span className={styles.badge}>最広</span>}
              </span>
              {computed[i].perSqm > 0 && (
                <span className={styles.resultItem}>
                  {formatYen(computed[i].perSqm)}/㎡
                  {isWinner(i, cheapestSqmIdxs) && <span className={styles.badge}>㎡安</span>}
                </span>
              )}
              {computed[i].perTsubo > 0 && (
                <span className={styles.resultItem}>
                  {formatYen(computed[i].perTsubo)}/坪
                  {isWinner(i, cheapestTsuboIdxs) && <span className={styles.badge}>坪安</span>}
                </span>
              )}
              {computed[i].rent > 0 && (
                <span className={styles.resultItem}>
                  家賃{formatYen(computed[i].rent)}
                  {isWinner(i, cheapestRentIdxs) && <span className={styles.badge}>家賃安</span>}
                </span>
              )}
            </div>
          )}
        </div>
      ))}

      {!isPremium && properties.length < 3 && (
        <button className={styles.lockedCard} onClick={() => setShowPremiumModal(true)}>
          <span className={styles.lockIcon}>🔒</span>
          <span className={styles.lockMsg}>3件以上の比較はプレミアム版（480円）</span>
        </button>
      )}

      {isPremium && properties.length < 3 && (
        <button className={styles.addBtn} onClick={() => setProperties(prev => [...prev, emptyInput()])}>
          + 物件を追加
        </button>
      )}

      {validProps.length >= 2 && (
        <>
          {diffComment && (
            <div className={styles.diffCard}>
              <p className={styles.diffText}>{diffComment}</p>
            </div>
          )}

          <div className={styles.summaryCard}>
            <p className={styles.summaryTitle}>重視するならこの物件</p>
            {widestIdxs.length > 0 && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>広さ重視</span>
                <span className={styles.summaryVal}>{getLabel(widestIdxs)}</span>
              </div>
            )}
            {cheapestRentIdxs.length > 0 && hasAnyRent && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>家賃の安さ重視</span>
                <span className={styles.summaryVal}>{getLabel(cheapestRentIdxs)}</span>
              </div>
            )}
            {cheapestSqmIdxs.length > 0 && hasAnyRent && (
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>広さと家賃のバランス重視</span>
                <span className={styles.summaryVal}>{getLabel(cheapestSqmIdxs)}</span>
              </div>
            )}
            {!hasAnyRent && (
              <p className={styles.summaryNote}>家賃を入力すると、家賃・バランスの比較も表示されます。</p>
            )}
          </div>
          <button className={styles.copyBtn} onClick={handleCopyCompare}>
            {copyLabel}
          </button>
        </>
      )}

      <button
        className={styles.saveBtn}
        onClick={handleSaveAll}
        disabled={validProps.length === 0}
      >
        {saveMsg || '比較結果をまとめて保存'}
      </button>

      {showPremiumModal && (
        <PremiumModal
          onUpgrade={async () => { await purchase(); setShowPremiumModal(false); }}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </div>
  );
}
