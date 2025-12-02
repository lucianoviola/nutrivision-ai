import React, { useState } from 'react';
import { AppView } from '../types.ts';

interface TabBarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

// SVG Icons - no dependency on FontAwesome
const icons = {
  home: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12.71 2.29a1 1 0 00-1.42 0l-9 9a1 1 0 000 1.42A1 1 0 003 13h1v7a2 2 0 002 2h12a2 2 0 002-2v-7h1a1 1 0 00.71-1.71l-9-9zM12 4.41l7 7V20h-4v-5a1 1 0 00-1-1h-4a1 1 0 00-1 1v5H6v-8.59l6-6zM10 20v-4h4v4h-4z"/>
    </svg>
  ),
  homeOutline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  history: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.2 3.2.8-1.3-4.5-2.7V7z"/>
    </svg>
  ),
  historyOutline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  stats: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z"/>
    </svg>
  ),
  statsOutline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  ),
  settings: (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
    </svg>
  ),
  settingsOutline: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  plus: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  ),
};

interface TabItemProps {
  icon: React.ReactNode;
  activeIcon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  gradient: string;
}

const TabItem: React.FC<TabItemProps> = ({ icon, activeIcon, label, isActive, onClick, gradient }) => {
  const [isPressed, setIsPressed] = useState(false);
  
  return (
    <button 
      onClick={onClick}
      onMouseDown={() => setIsPressed(true)}
      onMouseUp={() => setIsPressed(false)}
      onMouseLeave={() => setIsPressed(false)}
      onTouchStart={() => setIsPressed(true)}
      onTouchEnd={() => setIsPressed(false)}
      className={`flex flex-col items-center justify-center flex-1 py-2 transition-all duration-300 relative ${
        isPressed ? 'scale-90' : ''
      }`}
    >
      <div className={`relative transition-all duration-300 ${isActive ? 'scale-110 -translate-y-1' : 'scale-100'}`}>
        {/* Active glow */}
        {isActive && (
          <div 
            className="absolute inset-0 blur-xl opacity-60 -z-10"
            style={{ 
              background: gradient,
              transform: 'scale(2.5)',
            }}
          />
        )}
        
        <div 
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300`}
          style={isActive ? {
            background: gradient,
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.4)',
          } : {
            background: 'transparent',
          }}
        >
          <div 
            className={`transition-all duration-300 ${isActive ? 'text-white' : 'text-gray-500'}`}
          >
            {isActive ? activeIcon : icon}
          </div>
        </div>
      </div>
      
      <span 
        className={`text-[10px] font-bold mt-1.5 transition-all duration-300 ${
          isActive ? 'opacity-100' : 'opacity-50'
        }`}
        style={isActive ? {
          background: gradient,
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        } : { color: 'rgba(255,255,255,0.5)' }}
      >
        {label}
      </span>
    </button>
  );
};

const TabBar: React.FC<TabBarProps> = ({ currentView, onChangeView }) => {
  const [centerPressed, setCenterPressed] = useState(false);
  
  return (
    <div className="fixed bottom-0 left-0 w-full z-50">
      {/* Glass background */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(10, 10, 15, 0.98), rgba(10, 10, 15, 0.9))',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      />
      
      {/* Tab items */}
      <div className="relative flex items-center justify-around px-2 pt-1 pb-[calc(6px+env(safe-area-inset-bottom))]">
        <TabItem
          icon={icons.homeOutline}
          activeIcon={icons.home}
          label="Home"
          isActive={currentView === AppView.DASHBOARD}
          onClick={() => onChangeView(AppView.DASHBOARD)}
          gradient="linear-gradient(135deg, #14b8a6, #8b5cf6)"
        />
        
        <TabItem
          icon={icons.historyOutline}
          activeIcon={icons.history}
          label="History"
          isActive={currentView === AppView.HISTORY}
          onClick={() => onChangeView(AppView.HISTORY)}
          gradient="linear-gradient(135deg, #14b8a6, #8b5cf6)"
        />
        
        {/* Center FAB */}
        <div className="flex-1 flex justify-center -mt-8">
          <button
            onClick={() => onChangeView(AppView.CAMERA)}
            onMouseDown={() => setCenterPressed(true)}
            onMouseUp={() => setCenterPressed(false)}
            onMouseLeave={() => setCenterPressed(false)}
            onTouchStart={() => setCenterPressed(true)}
            onTouchEnd={() => setCenterPressed(false)}
            className={`relative transition-all duration-300 ${centerPressed ? 'scale-90' : 'hover:scale-105'}`}
          >
            {/* Outer glow ring */}
            <div 
              className="absolute -inset-2 rounded-full opacity-60"
              style={{
                background: 'conic-gradient(from 0deg, #14b8a6, #22d3ee, #8b5cf6, #14b8a6)',
                animation: 'spin 4s linear infinite',
              }}
            />
            <div 
              className="absolute -inset-1.5 rounded-full"
              style={{ background: 'rgba(10, 10, 15, 0.9)' }}
            />
            
            {/* Main button */}
            <div 
              className="relative w-16 h-16 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #14b8a6, #8b5cf6)',
                boxShadow: '0 0 40px rgba(139, 92, 246, 0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
              }}
            >
              <div className="text-white transition-transform duration-300 hover:rotate-90">
                {icons.plus}
              </div>
            </div>
          </button>
        </div>
        
        <TabItem
          icon={icons.statsOutline}
          activeIcon={icons.stats}
          label="Stats"
          isActive={currentView === AppView.STATS}
          onClick={() => onChangeView(AppView.STATS)}
          gradient="linear-gradient(135deg, #14b8a6, #8b5cf6)"
        />
        
        <TabItem
          icon={icons.settingsOutline}
          activeIcon={icons.settings}
          label="Settings"
          isActive={currentView === AppView.SETTINGS}
          onClick={() => onChangeView(AppView.SETTINGS)}
          gradient="linear-gradient(135deg, #14b8a6, #8b5cf6)"
        />
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TabBar;
