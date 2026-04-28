import { useApp } from '../context/AppContext';
import { Storage } from '../lib/storage';

export function usePremium() {
  const { isPremium, setIsPremium } = useApp();

  const purchase = async () => {
    // TODO: IAPロジック (RevenueCat / expo-in-app-purchases)
    setIsPremium(true);
    Storage.set('isPremium', 'true');
  };

  return { isPremium, purchase };
}
