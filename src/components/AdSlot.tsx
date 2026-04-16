import { useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import { useAuth } from '../hooks/useAuth';

interface AdSlotProps {
  slot: 'header' | 'sidebar' | 'footer' | 'jobDetails';
  className?: string;
}

export default function AdSlot({ slot, className = '' }: AdSlotProps) {
  const { settings } = useSettings();
  const { profile } = useAuth();
  const { adsEnabled, adsenseConfig } = settings;

  const slotId = adsenseConfig[`${slot}SlotId` as keyof typeof adsenseConfig];
  const isSubscribed = profile && profile.subscriptionStatus !== 'free';

  useEffect(() => {
    if (adsEnabled && !isSubscribed && adsenseConfig.publisherId && slotId) {
      try {
        // @ts-ignore
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (e) {
        console.error('AdSense error:', e);
      }
    }
  }, [adsEnabled, isSubscribed, adsenseConfig.publisherId, slotId]);

  if (!adsEnabled || isSubscribed || !adsenseConfig.publisherId || !slotId) {
    // Show a subtle placeholder in development/admin view if needed, 
    // or nothing for regular users
    if (profile?.role === 'admin' && !isSubscribed) {
      return (
        <div className={`hidden md:flex items-center justify-center bg-muted/30 border border-dashed rounded-lg text-xs text-muted-foreground min-h-[100px] ${className}`}>
          Ad Slot: {slot} (Disabled or Missing Config)
        </div>
      );
    }
    return null;
  }

  return (
    <div className={`overflow-hidden flex justify-center my-4 ${className}`}>
      <ins
        className="adsbygoogle"
        style={{ display: 'block' }}
        data-ad-client={adsenseConfig.publisherId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
