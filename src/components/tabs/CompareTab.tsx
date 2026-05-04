import { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { useInterstitialAd } from '../../hooks/useInterstitialAd';
import { track } from '../../lib/analytics';
import { sqmToTsubo, sqmToTatami } from '../../lib/constants';
import { formatYen, formatUnit, safeDiv, parseNumericInput } from '../../lib/format';
import { PremiumModal } from '../modals/PremiumModal';
import type { PremiumModalVariant } from '../modals/PremiumModal';
import type { PropertyRecord } from '../../types';
import styles from './CompareTab.module.css';
import { usePremium } from '../../hooks/usePremium';

const sanitize = (v: string) => parseNumericInput(v);

type PropertyInput = { name: string; rent: string; sqm: string; memo: string };

function isValid(p: PropertyInput): boolean {
  return sanitize(p.sqm) > 0;
}

type Computed = { sqm: number; rent: number; perSqm: number; perTsubo: number };

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

// 有効物件のみを {gIdx, c} の形で抽出してグローバル index を返す勝者判定
function winnerGlobal(
  entries: { gIdx: number; c: Computed }[],
  score: (c: Computed) => number,
  higher: boolean,
): number[] {
  if (entries.length === 0) return [];
  const scores = entries.map(e => score(e.c));
  const best = higher
    ? Math.max(...scores)
    : Math.min(...scores.filter(s => s > 0));
  return entries
    .filter((_, i) => scores[i] === best && scores[i] > 0)
    .map(e => e.gIdx);
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
  const { isPremium, tatamiStandard, addHistoryBatch, incrementCompareCount, compareProperties, setCompareProperties, addCompareProperty } = useApp();
  const { purchase } = usePremium();
  const { showInterstitialAdIfNeeded } = useInterstitialAd(isPremium);

  const properties = compareProperties;

  const [premiumVariant, setPremiumVariant] = useState<PremiumModalVariant>('default');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [copyLabel, setCopyLabel] = useState('📋 コピー');

  const openPremiumModal = (variant: PremiumModalVariant) => {
    setPremiumVariant(variant);
    setShowPremiumModal(true);
  };

  const update = (i: number, field: keyof PropertyInput, v: string) => {
    if ((field === 'rent' || field === 'sqm') && v.length > 10) return;
    setCompareProperties(properties.map((p, idx) => idx === i ? { ...p, [field]: v } : p));
  };

  const validProps = properties.filter(isValid);
  const computed = properties.map(p => compute(p));
  const validIndices = properties.map((p, i) => isValid(p) ? i : -1).filter(i => i >= 0);

  // 有効物件を {gIdx, c} の形で抽出
  const validEntries = validIndices.map(i => ({ gIdx: i, c: computed[i] }));

  const widestIdxs        = winnerGlobal(validEntries, e => e.sqm, true);
  const cheapestSqmIdxs   = winnerGlobal(validEntries.filter(e => e.c.perSqm > 0),   e => e.perSqm,   false);
  const cheapestTsuboIdxs = winnerGlobal(validEntries.filter(e => e.c.perTsubo > 0), e => e.perTsubo, false);
  const cheapestRentIdxs  = winnerGlobal(validEntries.filter(e => e.c.rent > 0),     e => e.rent,     false);

  const hasAnyRent = validIndices.some(i => computed[i].rent > 0);
  const diffComment = getDiffComment(properties, computed, validIndices);

  function isWinner(globalIdx: number, winnerGlobalIdxs: number[]): boolean {
    return winnerGlobalIdxs.includes(globalIdx);
  }

  function getLabel(globalIdxs: number[]): string {
    return globalIdxs
      .map(i => properties[i].name.trim() || `物件${String.fromCharCode(65 + i)}`)
      .join(' / ');
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

    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => track('copy_success'))
      .catch(() => track('copy_failed'));
    setCopyLabel('コピーしました ✓');
    setTimeout(() => setCopyLabel('📋 コピー'), 1500);
    showInterstitialAdIfNeeded('copy');
  };

  const handleLineShare = () => {
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
    lines.push('');
    lines.push('── 部屋の広さと家賃をチェック ──');
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
    track('line_share');
  };

  const handleSaveAll = () => {
    if (validProps.length === 0) return;
    track('save_attempt');
    const now = new Date();
    const targets: PropertyRecord[] = validIndices.map(i => {
      const c = computed[i];
      return {
        id: crypto.randomUUID(),
        name: properties[i].name.trim() || `物件${String.fromCharCode(65 + i)} ${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
        rent: c.rent, sqm: c.sqm, memo: properties[i].memo,
        perSqm: c.perSqm, perTsubo: c.perTsubo,
        perTatami: safeDiv(c.rent, sqmToTatami(c.sqm, tatamiStandard)),
        tatamiStandard, savedAt: now.toISOString(),
      };
    });
    const { accepted, rejected } = addHistoryBatch(targets);
    if (accepted === 0) {
      track('save_limit_hit');
      openPremiumModal('saveLimit');
      return;
    }
    if (rejected > 0) {
      track('save_limit_hit');
      openPremiumModal('saveLimit');
    }
    incrementCompareCount();
    track('compare_used');
    setSaveMsg(`${accepted}件候補に追加しました`);
    setTimeout(() => setSaveMsg(''), 2000);
    showInterstitialAdIfNeeded('save');
  };

  return (
    <div className={styles.container}>

      <div className={styles.hintPill}>物件を並べて比較</div>
      <p className={styles.persistHint}>入力内容はタブを切り替えても保持されます</p>

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
        <button className={styles.lockedCard} onClick={() => openPremiumModal('compareLimit')}>
          <span className={styles.lockIcon}>🔒</span>
          <div className={styles.lockTextWrap}>
            <span className={styles.lockMsg}>3件以上を比べるならプレミアム版</span>
            <span className={styles.lockSub}>家賃・広さ・㎡単価をまとめて比較できます。内見前の候補整理に便利です。</span>
          </div>
        </button>
      )}

      {isPremium && properties.length < 3 && (
        <button className={styles.addBtn} onClick={addCompareProperty}>
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
        </>
      )}

      <div className={styles.actionRow}>
        <button
          className={styles.saveBtn}
          onClick={handleSaveAll}
          disabled={validProps.length === 0}
        >
          {saveMsg || '候補リストに追加'}
        </button>
        <button className={styles.copyBtn} onClick={handleCopyCompare}>
          {copyLabel}
        </button>
        <button className={styles.lineBtn} onClick={handleLineShare}>
          LINE
        </button>
      </div>

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
