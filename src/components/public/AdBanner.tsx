import React from 'react';
import { AdCampaign } from '../../types';

interface AdBannerProps {
  adsEnabled: boolean;
  placement: 'HOME_TOP' | 'HOME_MIDDLE' | 'JOB_TOP' | 'JOB_MIDDLE' | 'DESKTOP_SIDEBAR' | 'MOBILE_STICKY';
  ads: AdCampaign[];
}

export const AdBanner: React.FC<AdBannerProps> = ({ adsEnabled, placement, ads }) => {
  if (!adsEnabled) {
    return null;
  }

  const activeAd = ads.find((a) => a.active && a.placement === placement);
  if (!activeAd) {
    return null;
  }

  return (
    <div className="my-6 p-3 bg-slate-100 rounded-xl border border-slate-200 text-center relative overflow-hidden">
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2 px-1">
        <span>Advertisement</span>
        <span>Sponsor: {activeAd.sponsorName}</span>
      </div>
      <a
        href={activeAd.targetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-lg overflow-hidden group hover:opacity-95 transition-opacity"
      >
        <img
          src={activeAd.bannerUrl}
          alt={activeAd.title}
          className="w-full max-h-32 object-cover rounded-lg"
          referrerPolicy="no-referrer"
        />
        <div className="py-2 px-3 bg-white border border-slate-200 rounded-b-lg flex items-center justify-between text-xs font-medium text-slate-700">
          <span className="truncate font-semibold text-slate-900">{activeAd.title}</span>
          <span className="text-[11px] bg-slate-800 text-white px-2 py-0.5 rounded font-bold shrink-0 ml-2">
            Visit Partner Site
          </span>
        </div>
      </a>
    </div>
  );
};
