import React from 'react';
import { AppView } from '../types.ts';

interface TabBarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

const TabBar: React.FC<TabBarProps> = ({ currentView, onChangeView }) => {
  const getTabClass = (view: AppView) => {
    const isActive = currentView === view;
    return `flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive ? 'text-ios-blue' : 'text-gray-400'}`;
  };

  // pb-[env(safe-area-inset-bottom)] ensures the bar sits above the iPhone home swipe indicator
  return (
    <div className="fixed bottom-0 left-0 w-full bg-white/90 backdrop-blur-md border-t border-gray-200 flex items-start pt-2 px-4 z-50 pb-[calc(20px+env(safe-area-inset-bottom))]">
      <button onClick={() => onChangeView(AppView.DASHBOARD)} className={getTabClass(AppView.DASHBOARD)}>
        <i className="fa-solid fa-chart-pie text-xl"></i>
        <span className="text-[10px] font-medium">Summary</span>
      </button>
      
      <button onClick={() => onChangeView(AppView.CAMERA)} className={getTabClass(AppView.CAMERA)}>
        <div className="bg-ios-blue text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg -mt-8 mb-1 border-4 border-ios-bg">
            <i className="fa-solid fa-plus text-2xl"></i>
        </div>
      </button>
      
      <button onClick={() => onChangeView(AppView.HISTORY)} className={getTabClass(AppView.HISTORY)}>
        <i className="fa-solid fa-list text-xl"></i>
        <span className="text-[10px] font-medium">Log</span>
      </button>

      <button onClick={() => onChangeView(AppView.SETTINGS)} className={getTabClass(AppView.SETTINGS)}>
        <i className="fa-solid fa-user text-xl"></i>
        <span className="text-[10px] font-medium">Profile</span>
      </button>
    </div>
  );
};

export default TabBar;