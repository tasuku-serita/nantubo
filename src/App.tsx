import { useState, useRef, useEffect } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { ConvertTab } from './components/tabs/ConvertTab';
import { CompareTab } from './components/tabs/CompareTab';
import { HistoryTab } from './components/tabs/HistoryTab';
import { AdBanner } from './components/common/AdBanner';
import { ReviewModal } from './components/modals/ReviewModal';
import { useReviewPrompt } from './hooks/useReviewPrompt';
import styles from './App.module.css';

type Tab = 'convert' | 'compare' | 'history';

function AppInner() {
  const [activeTab, setActiveTab] = useState<Tab>('convert');
  const [historyBadge, setHistoryBadge] = useState(false);
  const { isPremium, usageCount, markReviewed, history } = useApp();
  const shouldPromptReview = useReviewPrompt(usageCount);
  const [reviewDismissed, setReviewDismissed] = useState(false);

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

  const handleReview = () => {
    markReviewed();
    setReviewDismissed(true);
    window.open('https://apps.apple.com/', '_blank');
  };

  const handleLater = () => {
    markReviewed();
    setReviewDismissed(true);
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.headerTitle}>広さと家賃を整理</span>
        <span className={styles.headerSub}>部屋探しの迷いを10秒で</span>
      </header>

      <main className={styles.main}>
        {activeTab === 'convert' && <ConvertTab />}
        {activeTab === 'compare' && <CompareTab />}
        {activeTab === 'history' && <HistoryTab />}
      </main>

      <AdBanner visible={!isPremium} />

      <nav className={styles.tabBar}>
        {([
          { id: 'convert', label: '変換', icon: '⇄' },
          { id: 'compare', label: '比較', icon: '⚖️' },
          { id: 'history', label: '履歴', icon: '🕐' },
        ] as { id: Tab; label: string; icon: string }[]).map(tab => (
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
