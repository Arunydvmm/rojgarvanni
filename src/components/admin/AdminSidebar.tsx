import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Bot,
  Globe,
  DollarSign,
  Settings,
  ShieldCheck,
  LogOut,
  Landmark,
  Layers,
  Activity,
  CheckSquare,
} from 'lucide-react';

interface AdminSidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  pendingDraftCount: number;
  onLogout: () => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  currentTab,
  setCurrentTab,
  pendingDraftCount,
  onLogout,
}) => {
  const menuSections = [
    {
      title: 'OVERVIEW',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'CONTENT MANAGEMENT',
      items: [
        { id: 'content-jobs', label: 'Government Jobs', icon: FileText },
        { id: 'content-results', label: 'Results & Merit', icon: CheckSquare },
        { id: 'verification-queue', label: 'Verification Queue', icon: ShieldCheck, badge: pendingDraftCount },
      ],
    },
    {
      title: 'AI MULTI-AGENT PIPELINE',
      items: [
        { id: 'pipeline-runner', label: 'Run AI Pipeline', icon: Bot },
        { id: 'agent-monitor', label: 'Agent Monitoring & Logs', icon: Activity },
        { id: 'final-qa', label: 'Final QA + Auto-Fix', icon: ShieldCheck },
      ],
    },
    {
      title: 'GOVERNMENT SOURCES',
      items: [
        { id: 'sources', label: 'Source Registry', icon: Globe },
      ],
    },
    {
      title: 'SETTINGS & MONETIZATION',
      items: [
        { id: 'monetization', label: 'Ad Campaigns', icon: DollarSign },
        { id: 'settings', label: 'System Settings', icon: Settings },
      ],
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col justify-between shrink-0 min-h-screen text-slate-300">
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded bg-amber-500 flex items-center justify-center text-slate-950 font-bold">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base font-serif tracking-tight block">RozgarVaani</span>
              <span className="text-[10px] text-amber-400 font-mono font-bold">ADMIN PANEL</span>
            </div>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="p-3 space-y-6">
          {menuSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-3 mb-1">
                {sec.title}
              </h4>
              {sec.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setCurrentTab(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-amber-500 text-slate-950 font-bold shadow-md'
                        : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-slate-950' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span
                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-full ${
                          isActive ? 'bg-slate-950 text-amber-400' : 'bg-amber-500 text-slate-950'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>
      </div>

      {/* Footer / Exit */}
      <div className="p-4 border-t border-slate-800 space-y-2">
        <button
          onClick={() => window.open('/', '_blank')}
          className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-slate-800"
        >
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          Preview Public Website
        </button>

        <button
          onClick={onLogout}
          className="w-full py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors border border-rose-500/20"
        >
          <LogOut className="w-3.5 h-3.5" />
          Log Out Admin Session
        </button>
      </div>
    </aside>
  );
};
