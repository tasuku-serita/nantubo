import { useState } from 'react';
import styles from './RentCheckTab.module.css';
import { parseNumericInput } from '../../lib/format';

const INCOME_PRESETS = [
  { label: '手取り18万', value: 180000 },
  { label: '手取り20万', value: 200000 },
  { label: '手取り22万', value: 220000 },
  { label: '手取り25万', value: 250000 },
  { label: '手取り30万', value: 300000 },
];

const FLOOR_PLANS = [
  { name: 'ワンルーム', min: 18, max: 30,  desc: '単身・荷物少な目向け' },
  { name: '1K',        min: 20, max: 35,  desc: 'キッチン独立、単身向け' },
  { name: '1DK',       min: 25, max: 45,  desc: 'ダイニング付き、単身〜カップル' },
  { name: '1LDK',      min: 35, max: 60,  desc: '広いリビング、カップル向け' },
  { name: '2K',        min: 30, max: 50,  desc: '部屋2つ、カップル〜2人向け' },
  { name: '2DK',       min: 35, max: 60,  desc: '2部屋＋DK、2〜3人向け' },
  { name: '2LDK',      min: 50, max: 80,  desc: '2部屋＋広いLDK、家族向け' },
  { name: '3LDK',      min: 65, max: 100, desc: '3部屋＋LDK、ファミリー向け' },
  { name: '4LDK',      min: 80, max: 130, desc: '4部屋、大家族・ゆとり重視' },
];

const MAX_SQM = 130;

function getRentComment(ratio: number): string {
  if (ratio <= 25) return '理想的な負担率です。生活費・貯蓄にゆとりが生まれます。';
  if (ratio <= 30) return '一般的に推奨される範囲内です。無理なく暮らせます。';
  if (ratio <= 35) return 'やや高めですが、生活スタイルによっては問題ありません。食費や外食費を調整して。';
  if (ratio <= 40) return '家賃の比率が高めです。固定費を圧迫しないか全体の家計を確認しましょう。';
  return '家賃負担がかなり重い水準です。他の固定費（通信費・保険など）の見直しを検討してください。';
}

function getRatioColor(ratio: number): string {
  if (ratio <= 25) return '#5A8C55';
  if (ratio <= 30) return '#7A9C55';
  if (ratio <= 35) return '#C49A3A';
  if (ratio <= 40) return '#C4714A';
  return '#C0392B';
}

const sanitize = (v: string) => parseNumericInput(v);

export function RentCheckTab() {
  const [incomeRaw, setIncomeRaw] = useState('');
  const [rentRaw, setRentRaw] = useState('');

  const income = sanitize(incomeRaw);
  const rent = sanitize(rentRaw);
  const hasIncome = income > 0;
  const hasRent = rent > 0;

  const idealMin = income * 0.2;
  const idealMax = income * 0.3;
  const comfortable = income * 0.25;
  const ratio = hasIncome && hasRent ? (rent / income) * 100 : 0;
  const barPct = Math.min(ratio / 50 * 100, 100);

  return (
    <div className={styles.container}>

      {/* 家賃負担率チェッカー */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>家賃負担率チェッカー</p>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>毎月の手取り収入（円）</label>
          <input
            className={styles.input}
            inputMode="decimal"
            placeholder="例：250000"
            value={incomeRaw}
            onChange={e => { if (e.target.value.length <= 10) setIncomeRaw(e.target.value); }}
          />
        </div>

        <div className={styles.presetGroup}>
          <p className={styles.presetLabel}>手取りから選ぶ</p>
          <div className={styles.presetRow}>
            {INCOME_PRESETS.map(p => (
              <button
                key={p.value}
                className={`${styles.presetChip} ${incomeRaw === String(p.value) ? styles.presetChipActive : ''}`}
                onClick={() => setIncomeRaw(String(p.value))}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.fieldGroup}>
          <label className={styles.label}>検討中の月額家賃（円・任意）</label>
          <input
            className={styles.input}
            inputMode="decimal"
            placeholder="例：70000"
            value={rentRaw}
            onChange={e => { if (e.target.value.length <= 10) setRentRaw(e.target.value); }}
          />
        </div>

        {hasIncome && (
          <div className={styles.resultBox}>
            <div className={styles.rangeRow}>
              <div className={styles.rangeItem}>
                <span className={styles.rangeLabel}>理想の範囲</span>
                <span className={styles.rangeValue}>
                  {Math.round(idealMin).toLocaleString()}円〜{Math.round(idealMax).toLocaleString()}円
                </span>
              </div>
              <div className={styles.rangeItem}>
                <span className={styles.rangeLabel}>余裕を持つなら</span>
                <span className={styles.rangeValue}>{Math.round(comfortable).toLocaleString()}円以内</span>
              </div>
            </div>

            {hasRent && (
              <>
                <div className={styles.ratioRow}>
                  <span className={styles.ratioLabel}>現在の負担率</span>
                  <span className={styles.ratioValue} style={{ color: getRatioColor(ratio) }}>
                    {ratio.toFixed(1)}%
                  </span>
                </div>

                <div className={styles.barTrack}>
                  <div
                    className={styles.barFill}
                    style={{ width: `${barPct}%`, background: getRatioColor(ratio) }}
                  />
                  <div className={styles.barMarker} style={{ left: '60%' }} title="30%" />
                </div>
                <div className={styles.barLabels}>
                  <span>0%</span>
                  <span className={styles.barMarkerLabel}>30%</span>
                  <span>50%+</span>
                </div>

                <p className={styles.ratioComment}>{getRentComment(ratio)}</p>
              </>
            )}
          </div>
        )}
      </div>

      {/* 間取り早見表 */}
      <div className={styles.section}>
        <p className={styles.sectionTitle}>間取り早見表</p>

        <div className={styles.floorPlanList}>
          {FLOOR_PLANS.map(fp => {
            const typical = (fp.min + fp.max) / 2;
            const barWidth = (typical / MAX_SQM) * 100;
            return (
              <div key={fp.name} className={styles.floorPlanRow}>
                <span className={styles.floorName}>{fp.name}</span>
                <div className={styles.floorBarWrap}>
                  <div className={styles.floorBar} style={{ width: `${barWidth}%` }} />
                </div>
                <span className={styles.floorRange}>{fp.min}〜{fp.max}㎡</span>
                <span className={styles.floorDesc}>{fp.desc}</span>
              </div>
            );
          })}
        </div>

        <p className={styles.floorNote}>※面積は専有面積の一般的な目安です。物件・地域によって異なります。</p>
      </div>
    </div>
  );
}
