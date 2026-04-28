import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { AppState, PropertyRecord, TatamiStandard, PropertyStatus } from '../types';
import { Storage } from '../lib/storage';
import { FREE_HISTORY_LIMIT } from '../lib/constants';

type AppContextType = AppState & {
  setIsPremium: (v: boolean) => void;
  setTatamiStandard: (v: TatamiStandard) => void;
  addHistory: (r: PropertyRecord) => boolean;
  removeHistory: (id: string) => void;
  incrementSaveCount: () => void;
  incrementCompareCount: () => void;
  markReviewed: () => void;
  updatePropertyStatus: (id: string, status: PropertyStatus) => void;
};

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [isPremium, setIsPremiumState] = useState<boolean>(() =>
    Storage.get('isPremium') === 'true'
  );
  const [tatamiStandard, setTatamiStandardState] = useState<TatamiStandard>(() => {
    const v = Storage.get('tatamiStandard');
    return (v as TatamiStandard) || '1.62';
  });
  const [history, setHistory] = useState<PropertyRecord[]>(() => {
    const raw = Storage.get('history');
    return raw ? JSON.parse(raw) : [];
  });
  const [usageCount, setUsageCount] = useState<AppState['usageCount']>(() => {
    const raw = Storage.get('usageCount');
    return raw ? JSON.parse(raw) : { saveCount: 0, compareCount: 0, hasReviewed: false };
  });

  useEffect(() => {
    Storage.set('history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    Storage.set('usageCount', JSON.stringify(usageCount));
  }, [usageCount]);

  const setIsPremium = (v: boolean) => {
    setIsPremiumState(v);
    Storage.set('isPremium', String(v));
  };

  const setTatamiStandard = (v: TatamiStandard) => {
    setTatamiStandardState(v);
    Storage.set('tatamiStandard', v);
  };

  const addHistory = (r: PropertyRecord): boolean => {
    if (!isPremium && history.length >= FREE_HISTORY_LIMIT) return false;
    setHistory(prev => [r, ...prev]);
    return true;
  };

  const removeHistory = (id: string) => {
    setHistory(prev => prev.filter(r => r.id !== id));
  };

  const incrementSaveCount = () =>
    setUsageCount(prev => ({ ...prev, saveCount: prev.saveCount + 1 }));

  const incrementCompareCount = () =>
    setUsageCount(prev => ({ ...prev, compareCount: prev.compareCount + 1 }));

  const markReviewed = () =>
    setUsageCount(prev => ({ ...prev, hasReviewed: true }));

  const updatePropertyStatus = (id: string, status: PropertyStatus) => {
    setHistory(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  return (
    <AppContext.Provider value={{
      isPremium, tatamiStandard, history, usageCount,
      setIsPremium, setTatamiStandard, addHistory, removeHistory,
      incrementSaveCount, incrementCompareCount, markReviewed,
      updatePropertyStatus,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

