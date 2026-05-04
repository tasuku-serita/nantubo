export type BillingState = {
  isPremium: boolean;
  source: 'receipt' | 'cache' | 'none';
};

export interface BillingAdapter {
  refresh(): Promise<BillingState>;
  purchasePremium(): Promise<BillingState>;
  restore(): Promise<BillingState>;
}

export class DevBillingAdapter implements BillingAdapter {
  private readonly KEY = 'isPremium';

  private read(): boolean {
    try { return localStorage.getItem(this.KEY) === 'true'; }
    catch { return false; }
  }

  private write(v: boolean): void {
    try { localStorage.setItem(this.KEY, String(v)); }
    catch {}
  }

  async refresh(): Promise<BillingState> {
    const isPremium = this.read();
    return { isPremium, source: isPremium ? 'cache' : 'none' };
  }

  async purchasePremium(): Promise<BillingState> {
    /**
     * TODO: リリース後に RevenueCat または StoreKit/Play Billing で置き換える
     *
     * RevenueCat の場合:
     *   const offerings = await Purchases.getOfferings();
     *   const pkg = offerings.current?.availablePackages[0];
     *   if (pkg) await Purchases.purchasePackage(pkg);
     *   const info = await Purchases.getCustomerInfo();
     *   const isPremium = !!info.entitlements.active['premium'];
     *   this.write(isPremium);
     *   return { isPremium, source: 'receipt' };
     *
     * Apple 審査ガイドライン 3.1.1 / Google Play Billing Policy:
     * デジタル機能の解放には各ストアの正式課金 API が必要。
     * 現状の localStorage フラグは開発・デモ用途に限定すること。
     */
    this.write(true);
    return { isPremium: true, source: 'cache' };
  }

  async restore(): Promise<BillingState> {
    /**
     * TODO: RevenueCat の場合:
     *   const info = await Purchases.restorePurchases();
     *   const isPremium = !!info.entitlements.active['premium'];
     *   this.write(isPremium);
     *   return { isPremium, source: isPremium ? 'receipt' : 'none' };
     */
    const isPremium = this.read();
    return { isPremium, source: isPremium ? 'cache' : 'none' };
  }
}

export const devBillingAdapter = new DevBillingAdapter();
