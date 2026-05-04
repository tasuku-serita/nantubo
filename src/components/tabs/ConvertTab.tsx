import { useState, useCallback, useEffect, useRef } from 'react';
import { useApp } from '../../context/AppContext';
import { FREE_HISTORY_LIMIT } from '../../lib/constants';
import {
  sqmToTsubo, sqmToTatami,
  tsuboToSqm, tatamiToSqm,
  rentPerTatami,
} from '../../lib/constants';
import { formatYen, formatUnit, safeDiv, parseNumericInput } from '../../lib/format';
import { TatamiSettingModal } from '../modals/TatamiSettingModal';
import { PremiumModal } from '../modals/PremiumModal';
import type { PremiumModalVariant } from '../modals/PremiumModal';
import type { PropertyRecord } from '../../types';
import styles from './ConvertTab.module.css';
import { usePremium } from '../../hooks/usePremium';
import { useInterstitialAd } from '../../hooks/useInterstitialAd';
import { track } from '../../lib/analytics';

const SQM_PRESETS: { sqm: number; desc: string }[] = [
  { sqm: 20, desc: 'コンパクトな一人暮らし' },
  { sqm: 25, desc: '一人暮らしの標準' },
  { sqm: 30, desc: 'ゆとりある一人暮らし' },
  { sqm: 40, desc: '二人暮らし候補' },
  { sqm: 50, desc: '1LDK〜2DK目安' },
  { sqm: 60, desc: '2LDK目安' },
];

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
    if (sqm < 18) return { level: 'tight',    emoji: '😣', main: 'かなり狭い',  sub: '荷物少なめでも厳しめ' };
    if (sqm < 25) return { level: 'ok',       emoji: '🙂', main: '標準的',      sub: '一般的な1人暮らしサイズ' };
    if (sqm < 35) return { level: 'good',     emoji: '😊', main: 'ゆとりあり',  sub: '快適に暮らせる広さ' };
    return               { level: 'spacious', emoji: '🤩', main: 'かなり広め',  sub: '在宅ワークも余裕' };
  }
  if (lifestyle === 'couple') {
    if (sqm < 30) return { level: 'tight',    emoji: '😣', main: 'かなり狭い',  sub: '工夫が必要なサイズ' };
    if (sqm < 40) return { level: 'ok',       emoji: '🙂', main: '標準的',      sub: '2人で暮らせる広さ' };
    if (sqm < 55) return { level: 'good',     emoji: '😊', main: 'ゆとりあり',  sub: '快適な2人暮らし' };
    return               { level: 'spacious', emoji: '🤩', main: 'かなり広め',  sub: '将来の家族増にも対応' };
  }
  if (sqm < 50) return   { level: 'tight',    emoji: '😣', main: 'かなり狭い',  sub: '家族にはコンパクト' };
  if (sqm < 65) return   { level: 'ok',       emoji: '🙂', main: '標準的',      sub: '家族で暮らせる広さ' };
  if (sqm < 80) return   { level: 'good',     emoji: '😊', main: 'ゆとりあり',  sub: '快適な家族向け' };
  return                 { level: 'spacious', emoji: '🤩', main: 'かなり広め',  sub: '個室も確保しやすい' };
}

const LIFESTYLE_LABEL: Record<LifestyleType, string> = {
  single: '一人暮らし',
  couple: '二人暮らし',
  family: '家族暮らし',
};

type SummaryResult = {
  areaSummary: string;
  perSqmSummary: string | null;
  burdenSummary: string | null;
  verdict: string;
};

function getPropertySummary(
  sqm: number,
  rent: number,
  perSqm: number,
  lifestyle: LifestyleType,
  income: number,
): SummaryResult {
  const j = getAreaJudgment(sqm, lifestyle);
  const areaGood = j.level === 'good' || j.level === 'spacious';
  const areaTight = j.level === 'tight';
  const areaSummary = `${LIFESTYLE_LABEL[lifestyle]}なら${j.main}`;

  let perSqmSummary: string | null = null;
  let rentOk = true;
  if (perSqm > 0) {
    if (perSqm < 2000)      { perSqmSummary = 'かなりお得な水準';   rentOk = true; }
    else if (perSqm < 3000) { perSqmSummary = '一般的な水準';       rentOk = true; }
    else if (perSqm < 4000) { perSqmSummary = 'やや高め';           rentOk = false; }
    else                    { perSqmSummary = '高め';               rentOk = false; }
  }

  let burdenSummary: string | null = null;
  if (income > 0 && rent > 0) {
    const ratio = (rent / income) * 100;
    const incomeLabel = `手取り${Math.round(income / 10000)}万円`;
    if      (ratio <= 25) { burdenSummary = `${incomeLabel}なら余裕あり（${ratio.toFixed(0)}%）`; rentOk = true; }
    else if (ratio <= 30) { burdenSummary = `${incomeLabel}なら標準的（${ratio.toFixed(0)}%）`; }
    else if (ratio <= 35) { burdenSummary = `${incomeLabel}ならやや高め（${ratio.toFixed(0)}%）`; rentOk = false; }
    else                  { burdenSummary = `${incomeLabel}では重め（${ratio.toFixed(0)}%）`; rentOk = false; }
  }

  let verdict: string;
  if (rent === 0) {
    if (areaGood)      verdict = '広さは良好です。家賃も入力すると、候補として残すか判断しやすくなります。';
    else if (areaTight) verdict = '広さはやや狭め。収納の工夫や間取りを確認してみましょう。';
    else                verdict = '標準的な広さです。家賃も入力して比べてみましょう。';
  } else if (areaGood && rentOk) {
    verdict = '広さ・家賃ともに良好です。積極的に候補に残してよい物件です。';
  } else if (areaGood && !rentOk) {
    verdict = '広さは良いですが、家賃負担はやや重め。駅近・築浅など理由があるなら候補に残してもよい物件です。';
  } else if (areaTight && rentOk) {
    verdict = '広さはやや狭めですが、家賃は抑えられています。収納の工夫で補えるか確認しましょう。';
  } else if (areaTight && !rentOk) {
    verdict = '広さに対して家賃がやや高めです。慎重に比較したい物件です。';
  } else if (rentOk) {
    verdict = '家賃は標準的です。他の候補と広さを比べてみましょう。';
  } else {
    verdict = '他の候補と家賃・広さをしっかり比較してから判断しましょう。';
  }

  return { areaSummary, perSqmSummary, burdenSummary, verdict };
}

const sanitize = (raw: string) => parseNumericInput(raw);

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

const INPUT_META: Record<InputMode, { label: string; placeholder: string; description: string }> = {
  sqm:    { label: '広さ（㎡）',  placeholder: '例：25.5', description: '不動産サイトの「専有面積」を入れると、坪・畳がわかります。' },
  tsubo:  { label: '広さ（坪）',  placeholder: '例：7.7',  description: '坪を入れると、㎡・畳がわかります。' },
  tatami: { label: '広さ（畳）',  placeholder: '例：15.5', description: '畳を入れると、㎡・坪がわかります。' },
};

export function ConvertTab() {
  const { tatamiStandard, setTatamiStandard, addHistory, incrementSaveCount, isPremium, history } = useApp();
  const { purchase } = usePremium();
  const { showInterstitialAdIfNeeded } = useInterstitialAd(isPremium);

  const [inputMode, setInputMode] = useState<InputMode>('sqm');
  const [lifestyle, setLifestyle] = useState<LifestyleType>('single');
  const [sqmRaw, setSqmRaw] = useState('');
  const [tsuboRaw, setTsuboRaw] = useState('');
  const [tatamiRaw, setTatamiRaw] = useState('');
  const [rentRaw, setRentRaw] = useState('');
  const [incomeRaw, setIncomeRaw] = useState('');
  const [nameRaw, setNameRaw] = useState('');
  const [memo, setMemo] = useState('');

  const [showTatamiModal, setShowTatamiModal] = useState(false);
  const [premiumVariant, setPremiumVariant] = useState<PremiumModalVariant>('default');
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [copyLabel, setCopyLabel] = useState('📋 コピー');
  const [saveMsg, setSaveMsg] = useState('');
  const [onboardDismissed, setOnboardDismissed] = useState(
    () => localStorage.getItem('onboard_dismissed') === 'true'
  );
  const firstValueTracked = useRef(false);

  const sqm    = sanitize(sqmRaw);
  const rent   = sanitize(rentRaw);
  const income = sanitize(incomeRaw);
  const hasArea = sqm > 0;
  const hasRent = rent > 0 && hasArea;

  const tsubo    = sqmToTsubo(sqm);
  const tatami   = sqmToTatami(sqm, tatamiStandard);
  const perSqm   = safeDiv(rent, sqm);
  const perTsubo = safeDiv(rent, tsubo);

  useEffect(() => {
    if (sqm > 0 && !firstValueTracked.current) {
      firstValueTracked.current = true;
      track('first_value');
    }
  }, [sqm]);

  const perTatami = rentPerTatami(rent, sqm, tatamiStandard);

  const handleSqmChange = useCallback((v: string) => {
    if (v.length > 10) return;
    setSqmRaw(v);
    const n = sanitize(v);
    if (n > 0) {
      setTsuboRaw(sqmToTsubo(n).toFixed(2));
      setTatamiRaw(sqmToTatami(n, tatamiStandard).toFixed(2));
    } else {
      setTsuboRaw(''); setTatamiRaw('');
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
      setSqmRaw(''); setTatamiRaw('');
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
      setSqmRaw(''); setTsuboRaw('');
    }
  }, [tatamiStandard]);

  const currentInputConfig: Record<InputMode, { value: string; handler: (v: string) => void }> = {
    sqm:    { value: sqmRaw,    handler: handleSqmChange },
    tsubo:  { value: tsuboRaw,  handler: handleTsuboChange },
    tatami: { value: tatamiRaw, handler: handleTatamiChange },
  };

  const openPremiumModal = (variant: PremiumModalVariant) => {
    setPremiumVariant(variant);
    setShowPremiumModal(true);
  };

  const handleSave = () => {
    if (!hasArea) return;
    track('save_attempt');
    if (!isPremium && history.length >= FREE_HISTORY_LIMIT) {
      openPremiumModal('saveLimit');
      return;
    }
    const now = new Date();
    const record: PropertyRecord = {
      id: crypto.randomUUID(),
      name: nameRaw.trim() || `物件 ${now.getFullYear()}/${String(now.getMonth() + 1).padStart(2, '0')}/${String(now.getDate()).padStart(2, '0')}`,
      rent, sqm, memo,
      perSqm:   safeDiv(rent, sqm),
      perTsubo: safeDiv(rent, sqmToTsubo(sqm)),
      perTatami: safeDiv(rent, sqmToTatami(sqm, tatamiStandard)),
      tatamiStandard,
      savedAt: now.toISOString(),
    };
    const ok = addHistory(record);
    if (!ok) { openPremiumModal('saveLimit'); return; }
    incrementSaveCount();
    setSaveMsg('候補に追加しました');
    setTimeout(() => setSaveMsg(''), 2000);
    showInterstitialAdIfNeeded('save');
  };

  const handleCopy = () => {
    if (!hasArea) return;
    const j = getAreaJudgment(sqm, lifestyle);
    const lines = [
      `🏠 ${nameRaw.trim() || '物件メモ'}`,
      `広さ：${sqm}㎡（${formatUnit(tatami, '畳')}・${formatUnit(tsubo, '坪')}）`,
    ];
    if (hasRent) {
      lines.push(`家賃：${formatYen(rent)}`);
      lines.push(`㎡単価：${formatYen(perSqm)}`);
    }
    lines.push(`👉 ${j.main}（${j.sub}）`);
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => track('copy_success'))
      .catch(() => track('copy_failed'));
    setCopyLabel('コピーしました ✓');
    setTimeout(() => setCopyLabel('📋 コピー'), 1500);
    showInterstitialAdIfNeeded('copy');
  };

  const handleLineShare = () => {
    if (!hasArea) return;
    const j = getAreaJudgment(sqm, lifestyle);
    const lines = [
      `🏠 ${nameRaw.trim() || '物件メモ'}`,
      `広さ：${sqm}㎡（${formatUnit(tatami, '畳')}・${formatUnit(tsubo, '坪')}）`,
    ];
    if (hasRent) {
      lines.push(`家賃：${formatYen(rent)}`);
      lines.push(`㎡単価：${formatYen(perSqm)}`);
    }
    lines.push(`👉 ${j.main}（${j.sub}）`);
    lines.push('');
    lines.push('── 部屋の広さと家賃をチェック ──');
    const url = `https://line.me/R/msg/text/?${encodeURIComponent(lines.join('\n'))}`;
    window.open(url, '_blank');
    track('line_share');
  };

  const handleDismissOnboard = () => {
    localStorage.setItem('onboard_dismissed', 'true');
    setOnboardDismissed(true);
  };

  const handlePreset = (presetSqm: number) => {
    setInputMode('sqm');
    setSqmRaw(String(presetSqm));
    setTsuboRaw(sqmToTsubo(presetSqm).toFixed(2));
    setTatamiRaw(sqmToTatami(presetSqm, tatamiStandard).toFixed(2));
  };

  const meta = INPUT_META[inputMode];
  const { value: currentValue, handler: currentHandler } = currentInputConfig[inputMode];
  const summary = hasArea ? getPropertySummary(sqm, rent, perSqm, lifestyle, income) : null;

  return (
    <div className={styles.container}>

      {/* オンボーディングバナー（初回のみ） */}
      {!onboardDismissed && (
        <div className={styles.onboardBanner}>
          <div className={styles.onboardContent}>
            <span className={styles.onboardIcon}>🏠</span>
            <div className={styles.onboardText}>
              <p className={styles.onboardTitle}>この部屋、広さと家賃はちょうどいい？</p>
              <p className={styles.onboardDesc}>㎡・畳・坪を変換しながら、一人暮らし・二人暮らしに合う広さか、家賃が広さに見合うかを確認できます。</p>
            </div>
          </div>
          <button className={styles.onboardClose} onClick={handleDismissOnboard}>✕</button>
        </div>
      )}

      {/* 広さ入力カード */}
      <div className={styles.inputCard}>
        <label className={styles.inputLabel}>{meta.label}</label>
        <input
          className={styles.mainInput}
          inputMode="decimal"
          placeholder={meta.placeholder}
          value={currentValue}
          onChange={e => currentHandler(e.target.value)}
          autoFocus
        />
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
        <p className={styles.inputDescription}>{meta.description}</p>
      </div>

      {/* よく見る広さプリセット */}
      <div className={styles.presetSection}>
        <p className={styles.presetLabel}>よく見る広さから選ぶ</p>
        <div className={styles.presetRow}>
          {SQM_PRESETS.map(p => (
            <button
              key={p.sqm}
              className={`${styles.presetChip} ${sqm === p.sqm && inputMode === 'sqm' ? styles.presetChipActive : ''}`}
              onClick={() => handlePreset(p.sqm)}
            >
              <span className={styles.presetSqm}>{p.sqm}㎡</span>
              <span className={styles.presetDesc}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 変換結果 + 暮らし方判定 */}
      {hasArea && (
        <>
          <div className={styles.resultCard}>
            {inputMode === 'sqm' && (
              <>
                <div className={styles.resultRow}><span className={styles.resultLabel}>坪</span><span className={styles.resultValue}>{formatUnit(tsubo, '坪')}</span></div>
                <div className={styles.resultRow}><span className={styles.resultLabel}>畳</span><span className={styles.resultValue}>{formatUnit(tatami, '畳')}</span></div>
              </>
            )}
            {inputMode === 'tsubo' && (
              <>
                <div className={styles.resultRow}><span className={styles.resultLabel}>㎡</span><span className={styles.resultValue}>{formatUnit(sqm, '㎡')}</span></div>
                <div className={styles.resultRow}><span className={styles.resultLabel}>畳</span><span className={styles.resultValue}>{formatUnit(tatami, '畳')}</span></div>
              </>
            )}
            {inputMode === 'tatami' && (
              <>
                <div className={styles.resultRow}><span className={styles.resultLabel}>㎡</span><span className={styles.resultValue}>{formatUnit(sqm, '㎡')}</span></div>
                <div className={styles.resultRow}><span className={styles.resultLabel}>坪</span><span className={styles.resultValue}>{formatUnit(tsubo, '坪')}</span></div>
              </>
            )}
            <button className={styles.tatamiHint} onClick={() => setShowTatamiModal(true)}>
              畳の基準：{tatamiStandard}㎡ ›
            </button>
          </div>

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

      {/* 家賃・手取り入力（hasAreaのときだけ表示） */}
      {hasArea && (
        <div className={`${styles.rentSection} ${styles.fadeSlideIn}`}>
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
              onChange={e => { if (e.target.value.length > 10) return; setRentRaw(e.target.value); }}
            />
          </div>
          <div className={styles.rentField}>
            <label className={styles.label}>手取り収入（円・任意）</label>
            <input
              className={styles.rentInput}
              inputMode="decimal"
              placeholder="例：220000"
              value={incomeRaw}
              onChange={e => { if (e.target.value.length > 10) return; setIncomeRaw(e.target.value); }}
            />
          </div>
        </div>
      )}

      {hasRent && (
        <div className={styles.resultCard}>
          <div className={styles.resultRow}><span className={styles.resultLabel}>円/㎡</span><span className={styles.resultValue}>{formatYen(perSqm)}/㎡</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>円/坪</span><span className={styles.resultValue}>{formatYen(perTsubo)}/坪</span></div>
          <div className={styles.resultRow}><span className={styles.resultLabel}>円/畳</span><span className={styles.resultValue}>{formatYen(perTatami)}/畳</span></div>
          <div className={styles.unitGuide}>
            <p className={styles.unitGuideTitle}>㎡単価の見方</p>
            <p className={styles.unitGuideText}>㎡単価は、家賃だけでは分かりにくい「広さに対する家賃感」を見る目安です。同じ家賃なら、㎡単価が低い物件ほど広さにゆとりがあります。</p>
          </div>
        </div>
      )}

      {/* この物件のまとめカード */}
      {summary && (
        <div className={styles.summaryCard}>
          <p className={styles.summaryCardTitle}>この物件のまとめ</p>
          <div className={styles.summaryItem}>
            <span className={styles.summaryKey}>広さ</span>
            <span className={styles.summaryVal}>{summary.areaSummary}</span>
          </div>
          {summary.perSqmSummary && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryKey}>㎡単価</span>
              <span className={styles.summaryVal}>{summary.perSqmSummary}（{formatYen(perSqm)}/㎡）</span>
            </div>
          )}
          {summary.burdenSummary && (
            <div className={styles.summaryItem}>
              <span className={styles.summaryKey}>家賃負担</span>
              <span className={styles.summaryVal}>{summary.burdenSummary}</span>
            </div>
          )}
          <div className={styles.summaryVerdict}>
            <p className={styles.summaryVerdictText}>{summary.verdict}</p>
          </div>
        </div>
      )}

      {/* 物件名・メモ */}
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

      {/* 候補に追加・コピー・LINE */}
      <div className={styles.actionRow}>
        <button className={styles.saveBtn} onClick={handleSave} disabled={!hasArea}>
          {saveMsg || '候補に追加'}
        </button>
        {hasArea && (
          <>
            <button className={styles.copyBtn} onClick={handleCopy}>
              {copyLabel}
            </button>
            <button className={styles.lineBtn} onClick={handleLineShare}>
              LINE
            </button>
          </>
        )}
      </div>

      {showTatamiModal && (
        <TatamiSettingModal
          current={tatamiStandard}
          onSelect={setTatamiStandard}
          onClose={() => setShowTatamiModal(false)}
        />
      )}
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
