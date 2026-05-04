import { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ConvertTab } from './components/tabs/ConvertTab';
import { CompareTab } from './components/tabs/CompareTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { RentCheckTab } from './components/tabs/RentCheckTab';
import { AdBanner } from './components/common/AdBanner';
import { ReviewModal } from './components/modals/ReviewModal';
import { useReviewPrompt, dismissReviewPermanently, snoozeReview } from './hooks/useReviewPrompt';
import { track } from './lib/analytics';
import styles from './App.module.css';

function getPlatform(): 'ios' | 'android' | 'web' {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'web';
}

type Tab = 'convert' | 'compare' | 'history' | 'rentcheck';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'convert',   label: '広さ',    icon: '📐' },
  { id: 'rentcheck', label: '家賃',    icon: '💰' },
  { id: 'compare',   label: '物件比較', icon: '⚖️' },
  { id: 'history',   label: '保存',    icon: '🕐' },
];

function AppInner() {
  const [activeTab, setActiveTab] = useState<Tab>('convert');
  const [historyBadge, setHistoryBadge] = useState(false);
  const { isPremium, usageCount, history } = useApp();
  const shouldPromptReview = useReviewPrompt(usageCount, getPlatform());
  const [reviewDismissed, setReviewDismissed] = useState(false);

  useEffect(() => { track('store_open'); }, []);

  const prevHistoryLen = useRef(history.length);
  useEffect(() => {
    if (history.length > prevHistoryLen.current && activeTab !== 'history') {
      setHistoryBadge(true);
    }
    prevHistoryLen.current = history.length;
  }, [history.length, activeTab]);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    if (tab === 'history') setHistoryBadge(false);
  };

  const showReview = shouldPromptReview && !reviewDismissed;

  useEffect(() => {
    if (showReview) track('review_prompt_shown');
  }, [showReview]);

  // TODO: リリース後に実アプリの App Store URL へ差し替える
  // 例: window.open('https://apps.apple.com/app/idXXXXXXXXXX', '_blank');
  const openReviewPage = () => window.open('https://apps.apple.com/', '_blank');

  const handleReview = () => {
    track('review_clicked');
    dismissReviewPermanently();
    setReviewDismissed(true);
    openReviewPage();
  };

  const handleLater = () => {
    snoozeReview();
    setReviewDismissed(true);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>内見前の物件比較</span>
        <span className={styles.headerSub}>広さ・家賃・㎡単価で判断</span>
      </header>

      <main className={styles.main}>
        {activeTab === 'convert'   && <ConvertTab />}
        {activeTab === 'compare'   && <CompareTab />}
        {activeTab === 'history'   && <HistoryTab />}
        {activeTab === 'rentcheck' && <RentCheckTab />}
      </main>

      <AdBanner visible={!isPremium} />

      <nav className={styles.tabBar}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            <div className={styles.tabIconWrap}>
              <span className={styles.tabIcon}>{tab.icon}</span>
              {tab.id === 'history' && historyBadge && (
                <span className={styles.tabBadge} />
              )}
            </div>
            <span className={styles.tabLabel}>{tab.label}</span>
          </button>
        ))}
      </nav>

      {showReview && (
        <ReviewModal onReview={handleReview} onLater={handleLater} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppInner />
    </AppProvider>
  );
}
