import { useApp } from '../context/AppContext';
import { devBillingAdapter } from '../lib/billing';
import { track } from '../lib/analytics';

export function usePremium() {
  const { isPremium, setIsPremium } = useApp();

  const purchase = async () => {
    const state = await devBillingAdapter.purchasePremium();
    setIsPremium(state.isPremium);
    if (state.isPremium) track('purchase_success');
  };

  const restore = async () => {
    const state = await devBillingAdapter.restore();
    setIsPremium(state.isPremium);
    if (state.isPremium) track('purchase_restore');
  };

  return { isPremium, purchase, restore };
}
