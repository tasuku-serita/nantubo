export type Lifestyle = 'solo' | 'couple' | 'child1' | 'child2';

export const LIFESTYLE_LABELS: Record<Lifestyle, string> = {
  solo:   '一人暮らし',
  couple: '二人暮らし',
  child1: '子ども1人',
  child2: '子ども2人',
};

export const ALL_LIFESTYLES: Lifestyle[] = ['solo', 'couple', 'child1', 'child2'];

export type RatingLevel = 'good' | 'ok' | 'marginal' | 'tight';

export type Rating = { level: RatingLevel; label: string };

const RATING_LABELS: Record<RatingLevel, string> = {
  good:     'ゆとりあり',
  ok:       '快適',
  marginal: '条件次第',
  tight:    '手狭になりやすい',
};

function ratingLevel(sqm: number, ls: Lifestyle): RatingLevel {
  if (ls === 'solo')   return sqm >= 35 ? 'good' : sqm >= 23 ? 'ok' : sqm >= 16 ? 'marginal' : 'tight';
  if (ls === 'couple') return sqm >= 55 ? 'good' : sqm >= 38 ? 'ok' : sqm >= 26 ? 'marginal' : 'tight';
  if (ls === 'child1') return sqm >= 65 ? 'good' : sqm >= 48 ? 'ok' : sqm >= 33 ? 'marginal' : 'tight';
  /* child2 */         return sqm >= 80 ? 'good' : sqm >= 60 ? 'ok' : sqm >= 43 ? 'marginal' : 'tight';
}

export function getLifestyleRating(sqm: number, ls: Lifestyle): Rating {
  const level = ratingLevel(sqm, ls);
  return { level, label: RATING_LABELS[level] };
}

export function getLifestyleComment(sqm: number, ls: Lifestyle): string {
  if (ls === 'solo') {
    if (sqm < 15) return '一人暮らしでもかなり手狭な広さです。収納と生活動線を十分に確認しましょう。';
    if (sqm < 20) return 'コンパクトな一人暮らし向きの広さです。荷物が少なければ快適に過ごせます。';
    if (sqm < 25) return '一人暮らしとして標準的な広さです。日々の生活に必要なスペースは確保できます。';
    if (sqm < 30) return '一人暮らしとしてゆとりを感じやすい広さです。収納や在宅ワークも検討しやすいです。';
    if (sqm < 40) return '一人暮らしとして広めの部屋です。趣味や仕事スペースも確保しやすいです。';
    return '一人暮らしとしてかなり広い部屋です。生活スタイルによっては持て余すこともあります。';
  }
  if (ls === 'couple') {
    if (sqm < 25) return '二人暮らしにはかなり手狭な広さです。生活時間がずれる場合のみ検討できる範囲です。';
    if (sqm < 35) return '二人暮らしとしてコンパクトな広さです。お互いの荷物量をよく確認しましょう。';
    if (sqm < 45) return '二人暮らしとして標準的な広さです。お互いのライフスタイルに合うか確認しましょう。';
    if (sqm < 55) return '二人暮らしとして快適に過ごしやすい広さです。それぞれのスペースも確保しやすいです。';
    if (sqm < 70) return '二人暮らしとしてゆとりのある広さです。在宅ワークや来客にも対応しやすいです。';
    return '二人暮らしとしてかなりゆとりのある広さです。';
  }
  if (ls === 'child1') {
    if (sqm < 30) return '子ども1人の世帯にはかなり手狭な広さです。寝る場所と収納の確保を優先しましょう。';
    if (sqm < 40) return '子ども1人の世帯としてコンパクトな広さです。子どもが小さいうちなら生活できます。';
    if (sqm < 50) return '子ども1人の世帯として最低限の広さです。子どもの成長に合わせた使い方を考えましょう。';
    if (sqm < 60) return '子ども1人の世帯として標準的な広さです。日常生活はゆとりを持って送れます。';
    if (sqm < 70) return '子ども1人の世帯としてゆとりのある広さです。子ども部屋の確保も検討できます。';
    return '子ども1人の世帯としてかなりゆとりがある広さです。';
  }
  /* child2 */
  if (sqm < 40) return '子ども2人の世帯にはかなり手狭な広さです。長期的な生活を見据えて慎重に確認しましょう。';
  if (sqm < 50) return '子ども2人の世帯としてコンパクトな広さです。収納と寝る場所の確保を優先しましょう。';
  if (sqm < 60) return '子ども2人の世帯としてやや手狭です。将来の成長も考えた動線を確認しましょう。';
  if (sqm < 70) return '子ども2人の世帯として標準的な広さです。子ども部屋の将来的な確保も考えましょう。';
  if (sqm < 85) return '子ども2人の世帯として快適に過ごしやすい広さです。';
  return '子ども2人の世帯としてゆとりのある広さです。';
}
