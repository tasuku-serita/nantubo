import { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import type { AppState, PropertyRecord, TatamiStandard, PropertyStatus, ComparePropertyInput } from '../types';
import { Storage } from '../lib/storage';
import { FREE_HISTORY_LIMIT } from '../lib/constants';

const emptyInput = (): ComparePropertyInput => ({ name: '', rent: '', sqm: '', memo: '' });

type AppContextType = AppState & {
  setIsPremium: (v: boolean) => void;
  setTatamiStandard: (v: TatamiStandard) => void;
  addHistory: (r: PropertyRecord) => boolean;
  addHistoryBatch: (records: PropertyRecord[]) => { accepted: number; rejected: number };
  removeHistory: (id: string) => void;
  incrementSaveCount: () => void;
  incrementCompareCount: () => void;
  markReviewed: () => void;
  updatePropertyStatus: (id: string, status: PropertyStatus) => void;
  setCompareProperties: (props: ComparePropertyInput[]) => void;
  addCompareProperty: () => void;
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
  const [history, setHistory] = useState<PropertyRecord[]>(() =>
    Storage.getJson<PropertyRecord[]>('history', [])
  );
  const [usageCount, setUsageCount] = useState<AppState['usageCount']>(() =>
    Storage.getJson('usageCount', { saveCount: 0, compareCount: 0, hasReviewed: false })
  );
  const [compareProperties, setComparePropertiesState] = useState<ComparePropertyInput[]>(() =>
    Storage.getJson<ComparePropertyInput[]>('compareProperties', [emptyInput(), emptyInput()])
  );

  useEffect(() => {
    Storage.set('history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    Storage.set('usageCount', JSON.stringify(usageCount));
  }, [usageCount]);

  // compareProperties は debounce して書き込む（毎キーストローク書き込みを防ぐ）
  const compareDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (compareDebounceRef.current) clearTimeout(compareDebounceRef.current);
    compareDebounceRef.current = setTimeout(() => {
      Storage.set('compareProperties', JSON.stringify(compareProperties));
    }, 500);
    return () => {
      if (compareDebounceRef.current) clearTimeout(compareDebounceRef.current);
    };
  }, [compareProperties]);

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

  const addHistoryBatch = (records: PropertyRecord[]): { accepted: number; rejected: number } => {
    if (isPremium) {
      setHistory(prev => [...records, ...prev]);
      return { accepted: records.length, rejected: 0 };
    }
    const remaining = Math.max(0, FREE_HISTORY_LIMIT - history.length);
    const toAdd = records.slice(0, remaining);
    if (toAdd.length > 0) setHistory(prev => [...toAdd, ...prev]);
    return { accepted: toAdd.length, rejected: records.length - toAdd.length };
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

  const setCompareProperties = (props: ComparePropertyInput[]) => {
    setComparePropertiesState(props);
  };

  const addCompareProperty = () => {
    setComparePropertiesState(prev => [...prev, emptyInput()]);
  };

  return (
    <AppContext.Provider value={{
      isPremium, tatamiStandard, history, usageCount, compareProperties,
      setIsPremium, setTatamiStandard, addHistory, addHistoryBatch, removeHistory,
      incrementSaveCount, incrementCompareCount, markReviewed,
      updatePropertyStatus, setCompareProperties, addCompareProperty,
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
