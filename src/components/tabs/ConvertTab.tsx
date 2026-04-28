import { useState, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { FREE_HISTORY_LIMIT } from '../../lib/constants';
import {
  sqmToTsubo, sqmToTatami,
  tsuboToSqm, tatamiToSqm,
  rentPerTatami,
} from '../../lib/constants';
import { formatYen, formatUnit, safeDiv } from '../../lib/format';
import { TatamiSettingModal } from '../modals/TatamiSettingModal';
import { PremiumModal } from '../modals/PremiumModal';
import type { PropertyRecord } from '../../types';
import styles from './ConvertTab.module.css';
import { usePremium } from '../../hooks/usePremium';

const MAX_VALUE = 99_999_999;

type InputMode = 'sqm' | 'tsubo' | 'tatami';
type LifestyleType = 'single' | 'couple' | 'family';

type AreaJudgment = {
  level: 'tight' | 'ok' | 'good' | 'spacious';
  emoji: string;
  main: string;
  sub: string;
};

function getAreaJudgment(sqm: number, lifestyle: LifestyleType): AreaJudgment {
  if (lifestyle === 'single') {
    if (sqm < 18) return { level: 'tight',   emoji: '😣', main: 'かなり狭い',  sub: '荷物少なめでも厳しめ' };
    if (sqm < 25) return { level: 'ok',      emoji: '🙂', main: '標準的',      sub: '一般的な1人暮らしサイズ' };
    if (sqm < 35) return { level: 'good',    emoji: '😊', main: 'ゆとりあり',  sub: '快適に暮らせる広さ' };
    return               { level: 'spacious', emoji: '🤩', main: 'かなり広め',  sub: '在宅ワークも余裕' };
  }
  if (lifestyle === 'couple') {
    if (sqm < 30) return { level: 'tight',   emoji: '😣', main: 'かなり狭い',  sub: '工夫が必要なサイズ' };
    if (sqm < 40) return { level: 'ok',      emoji: '🙂', main: '標準的',      sub: '2人で暮らせる広さ' };
    if (sqm < 55) return { level: 'good',    emoji: '😊', main: 'ゆとりあり',  sub: '快適な2人暮らし' };
    return               { level: 'spacious', emoji: '🤩', main: 'かなり広め',  sub: '将来の家族増にも対応' };
  }
  // family
  if (sqm < 50) return   { level: 'tight',   emoji: '😣', main: 'かなり狭い',  sub: '家族にはコンパクト' };
  if (sqm < 65) return   { level: 'ok',      emoji: '🙂', main: '標準的',      sub: '家族で暮らせる広さ' };
  if (sqm < 80) return   { level: 'good',    emoji: '😊', main: 'ゆとりあり',  sub: '快適な家族向け' };
  return                 { level: 'spacious', emoji: '🤩', main: 'かなり広め',  sub: '個室も確保しやすい' };
}

function sanitize(raw: string): number {
  const n = parseFloat(raw);
  if (isNaN(n) || n < 0) return 0;
  if (n > MAX_VALUE) return MAX_VALUE;
  return n;
}

const TAB_LABELS: { mode: InputMode; label: string }[] = [
  { mode: 'sqm',    label: '㎡から' },
  { mode: 'tsubo',  label: '坪から' },
  { mode: 'tatami', label: '畳から' },
];

const LIFESTYLE_OPTIONS: { id: LifestyleType; label: string; icon: string }[] = [
  { id: 'single', label: '1人暮らし', icon: '🧍' },
  { id: 'couple', label: '2人暮らし', icon: '👫' },
  { id: 'family', label: '家族暮らし', icon: '👨‍👩‍👧' },
];

const JUDGMENT_CLASS: Record<AreaJudgment['level'], string> = {
  tight:    styles.judgmentTight,
  ok:       styles.judgmentOk,
  good:     styles.judgmentGood,
  spacious: styles.judgmentSpacious,
};

export function ConvertTab() {
  const { tatamiStandard, setTatamiStandard, addHistory, incrementSaveCount, isPremium, history } = useApp();
  const { purchase } = usePremium();

  const [inputMode, setInputMode] = useState<InputMode>('sqm');
  const [lifestyle, setLifestyle] = useState<LifestyleType>('single');
  const [sqmRaw, setSqmRaw] = useState('');
  const [tsuboRaw, setTsuboRaw] = useState('');
  const [tatamiRaw, setTatamiRaw] = useState('');
  const [rentRaw, setRentRaw] = useState('');
  const [nameRaw, setNameRaw] = useState('');
  const [memo, setMemo] = useState('');

  const [showTatamiModal, setShowTatamiModal] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [copyLabel, setCopyLabel] = useState('結果をコピー');
  const [saveMsg, setSaveMsg] = useState('');

  const sqm = sanitize(sqmRaw);
  const rent = sanitize(rentRaw);
  const hasArea = sqm > 0;
  const hasRent = rent > 0 && hasArea;

  const tsubo = sqmToTsubo(sqm);
  const tatami = sqmToTatami(sqm, tatamiStandard);
  const perSqm = safeDiv(rent, sqm);
  const perTsubo = safeDiv(rent, tsubo);
  const perTatami = rentPerTatami(rent, sqm, tatamiStandard);

  const handleSqmChange = useCallback((v: string) => {
    if (v.length > 10) return;
    setSqmRaw(v);
    const n = sanitize(v);
    if (n > 0) {
      setTsuboRaw(sqmToTsubo(n).toFixed(2));
      setTatamiRaw(sqmToTatami(n, tatamiStandard).toFixed(2));
    } else {
      setTsuboRaw('');
      setTatamiRaw('');
    }
  }, [tatamiStandard]);

  const handleTsuboChange = useCallback((v: string) => {
    if (v.length > 10) return;
    setTsuboRaw(v);
    const n = sanitize(v);
    if (n > 0) {
      const s = tsuboToSqm(n);
      setSqmRaw(s.toFixed(2));
      setTatamiRaw(sqmToTatami(s, tatamiStandard).toFixed(2));
    } else {
      setSqmRaw('');
      setTatamiRaw('');
    }
  }, [tatamiStandard]);

  const handleTatamiChange = useCallback((v: string) => {
    if (v.length > 10) return;
    setTatamiRaw(v);
    const n = sanitize(v);
    if (n > 0) {
      const s = tatamiToSqm(n, tatamiStandard);
      setSqmRaw(s.toFixed(2));
      setTsuboRaw(sqmToTsubo(s).toFixed(2));
    } else {
      setSqmRaw('');
      setTsuboRaw('');
    }
  }, [tatamiStandard]);

  const handleSave = () => {
    if (!hasArea) return;
    if (!isPremium && history.length >= FREE_HISTORY_LIMIT) {
      setShowPremiumModal(true);
      return;
    }
    const now = new Date();
    const record: PropertyRecord = {
      id: crypto.randomUUID(),
      name: nameRaw.trim() || `物件 ${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
      rent,
      sqm,
      memo,
      perSqm: safeDiv(rent, sqm),
      perTsubo: safeDiv(rent, sqmToTsubo(sqm)),
      perTatami: safeDiv(rent, sqmToTatami(sqm, tatamiStandard)),
      tatamiStandard,
      savedAt: now.toISOString(),
    };
    const ok = addHistory(record);
    if (!ok) { setShowPremiumModal(true); return; }
    incrementSaveCount();
    setSaveMsg('保存しました');
    setTimeout(() => setSaveMsg(''), 2000);
  };

  const handleCopy = () => {
    if (!hasArea) return;
    const judgment = getAreaJudgment(sqm, lifestyle);
    const lines = [
      `🏠 ${nameRaw.trim() || '物件メモ'}`,
      `広さ：${sqm}㎡（${formatUnit(tatami, '畳')}・${formatUnit(tsubo, '坪')}）`,
    ];
    if (hasRent) {
      lines.push(`家賃：${formatYen(rent)}`);
      lines.push(`㎡単価：${formatYen(perSqm)}`);
    }
    lines.push(`👉 ${judgment.main}（${judgment.sub}）`);
    navigator.clipboard.writeText(lines.join('\n')).catch(() => {});
    setCopyLabel('コピーしました ✓');
    setTimeout(() => setCopyLabel('結果をコピー'), 1500);
  };

  return (
    <div className={styles.container}>

      {/* 1. 入力モード切り替えカード */}
      <div className={styles.inputCard}>
        <div className={styles.modeRow}>
          {TAB_LABELS.map(({ mode, label }) => (
            <button
              key={mode}
              className={`${styles.modeBtn} ${inputMode === mode ? styles.modeBtnActive : ''}`}
              onClick={() => setInputMode(mode)}
            >
              {label}
            </button>
          ))}
        </div>

        {inputMode === 'sqm' && (
          <>
            <p className={styles.inputDescription}>不動産サイトの「専有面積」を入れると、坪・畳がわかります。</p>
            <label className={styles.inputLabel}>広さ（㎡）</label>
            <input
              className={styles.mainInput}
              inputMode="decimal"
              placeholder="例：25.5"
              value={sqmRaw}
              onChange={e => handleSqmChange(e.target.value)}
              autoFocus
            />
          </>
        )}

        {inputMode === 'tsubo' && (
          <>
            <p className={styles.inputDescription}>坪を入れると、㎡・畳がわかります。</p>
            <label className={styles.inputLabel}>広さ（坪）</label>
            <input
              className={styles.mainInput}
              inputMode="decimal"
              placeholder="例：7.7"
              value={tsuboRaw}
              onChange={e => handleTsuboChange(e.target.value)}
              autoFocus
            />
          </>
        )}

        {inputMode === 'tatami' && (
          <>
            <p className={styles.inputDescription}>畳を入れると、㎡・坪がわかります。</p>
            <label className={styles.inputLabel}>広さ（畳）</label>
            <input
              className={styles.mainInput}
              inputMode="decimal"
              placeholder="例：15.5"
              value={tatamiRaw}
              onChange={e => handleTatamiChange(e.target.value)}
              autoFocus
            />
          </>
        )}
      </div>

      {/* 2. 変換結果 + 暮らし方判定 */}
      {hasArea && (
        <>
          <div className={styles.resultCard}>
            {inputMode === 'sqm' && (
              <>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>坪</span>
                  <span className={styles.resultValue}>{formatUnit(tsubo, '坪')}</span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>畳</span>
                  <span className={styles.resultValue}>{formatUnit(tatami, '畳')}</span>
                </div>
              </>
            )}
            {inputMode === 'tsubo' && (
              <>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>㎡</span>
                  <span className={styles.resultValue}>{formatUnit(sqm, '㎡')}</span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>畳</span>
                  <span className={styles.resultValue}>{formatUnit(tatami, '畳')}</span>
                </div>
              </>
            )}
            {inputMode === 'tatami' && (
              <>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>㎡</span>
                  <span className={styles.resultValue}>{formatUnit(sqm, '㎡')}</span>
                </div>
                <div className={styles.resultRow}>
                  <span className={styles.resultLabel}>坪</span>
                  <span className={styles.resultValue}>{formatUnit(tsubo, '坪')}</span>
                </div>
              </>
            )}
            <button className={styles.tatamiHint} onClick={() => setShowTatamiModal(true)}>
              畳の基準：{tatamiStandard}㎡ ›
            </button>
          </div>

          {/* 暮らし方選択 */}
          <div className={styles.lifestyleCard}>
            <p className={styles.lifestyleQuestion}>あなたの暮らし方は？</p>
            <div className={styles.lifestyleRow}>
              {LIFESTYLE_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  className={`${styles.lifestyleBtn} ${lifestyle === opt.id ? styles.lifestyleBtnActive : ''}`}
                  onClick={() => setLifestyle(opt.id)}
                >
                  <span className={styles.lifestyleIcon}>{opt.icon}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 判定バッジ */}
          {(() => {
            const j = getAreaJudgment(sqm, lifestyle);
            return (
              <div className={`${styles.judgmentCard} ${JUDGMENT_CLASS[j.level]}`}>
                <span className={styles.judgmentEmoji}>{j.emoji}</span>
                <div>
                  <p className={styles.judgmentMain}>{j.main}</p>
                  <p className={styles.judgmentSub}>{j.sub}</p>
                </div>
              </div>
            );
          })()}
        </>
      )}

      {/* 3. 家賃入力 */}
      <div className={styles.rentSection}>
        <div className={styles.rentSectionHeader}>
          <p className={styles.rentSectionTitle}>家賃も入れて比較</p>
          <p className={styles.rentSectionText}>広さに見合う家賃かチェック</p>
        </div>
        <div className={styles.rentField}>
          <label className={styles.label}>月額家賃（円）</label>
          <input
            className={styles.rentInput}
            inputMode="decimal"
            placeholder="例：70000"
            value={rentRaw}
            onChange={e => {
              if (e.target.value.length > 10) return;
              setRentRaw(e.target.value);
            }}
          />
        </div>
      </div>

      {hasRent && (
        <div className={styles.resultCard}>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>円/㎡</span>
            <span className={styles.resultValue}>{formatYen(perSqm)}/㎡</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>円/坪</span>
            <span className={styles.resultValue}>{formatYen(perTsubo)}/坪</span>
          </div>
          <div className={styles.resultRow}>
            <span className={styles.resultLabel}>円/畳</span>
            <span className={styles.resultValue}>{formatYen(perTatami)}/畳</span>
          </div>
          <div className={styles.unitGuide}>
            <p className={styles.unitGuideTitle}>㎡単価の見方</p>
            <p className={styles.unitGuideText}>㎡単価は、家賃だけでは分かりにくい「広さに対する家賃感」を見る目安です。同じ家賃なら、㎡単価が低い物件ほど広さにゆとりがあります。駅距離・築年数・設備も合わせて確認しましょう。</p>
          </div>
        </div>
      )}

      {/* 4. 物件名・メモ */}
      <div className={styles.divider} />

      <div className={styles.inputGroup}>
        <label className={styles.label}>物件名（任意）</label>
        <input
          className={styles.input}
          type="text"
          placeholder="例：渋谷のマンション"
          value={nameRaw}
          onChange={e => setNameRaw(e.target.value)}
          maxLength={40}
        />
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>メモ（任意）</label>
        <input
          className={styles.input}
          type="text"
          placeholder="例：駅から5分、ペット可"
          value={memo}
          onChange={e => setMemo(e.target.value)}
          maxLength={100}
        />
      </div>

      {/* 5. 保存・コピー */}
      <button className={styles.saveBtn} onClick={handleSave} disabled={!hasArea}>
        {saveMsg || '履歴に保存'}
      </button>

      {hasArea && (
        <button className={styles.copyBtn} onClick={handleCopy}>
          {copyLabel}
        </button>
      )}

      {showTatamiModal && (
        <TatamiSettingModal
          current={tatamiStandard}
          onSelect={setTatamiStandard}
          onClose={() => setShowTatamiModal(false)}
        />
      )}
      {showPremiumModal && (
        <PremiumModal
          onUpgrade={async () => { await purchase(); setShowPremiumModal(false); }}
          onClose={() => setShowPremiumModal(false)}
        />
      )}
    </div>
  );
}
