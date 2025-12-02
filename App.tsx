import React, { useState, useEffect } from 'react';
import { AppView, MealLog, UserSettings } from './types.ts';
import TabBar from './components/TabBar.tsx';
import Dashboard from './views/Dashboard.tsx';
import CameraCapture from './views/CameraCapture.tsx';
import Settings from './views/Settings.tsx';
import LogHistory from './views/LogHistory.tsx';
import { healthService } from './services/healthService.ts';

// Default Settings
const DEFAULT_SETTINGS: UserSettings = {
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,
  dailyCarbGoal: 200,
  dailyFatGoal: 65,
  appleHealthConnected: false,
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  // Load from local storage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('nutrivision_logs');
    const savedSettings = localStorage.getItem('nutrivision_settings');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    // Check for API key
    const apiKey = localStorage.getItem('nutrivision_api_key') || (typeof process !== 'undefined' ? process.env.API_KEY : '');
    if (!apiKey) {
        // If no key found, redirect to settings to input it
        setCurrentView(AppView.SETTINGS);
        // Delay alert slightly to allow render
        setTimeout(() => {
            alert("Welcome! Please enter your Gemini API Key in the settings to start using the AI features.");
        }, 500);
    }
  }, []);

  // Save changes to local storage
  useEffect(() => {
    localStorage.setItem('nutrivision_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('nutrivision_settings', JSON.stringify(settings));
  }, [settings]);

  const handleSaveLog = async (log: MealLog) => {
    setLogs(prev => [log, ...prev]);
    
    // Sync to HealthKit if enabled and available
    if (settings.appleHealthConnected) {
       await healthService.saveLog(log);
    }
    
    setCurrentView(AppView.DASHBOARD);
  };

  const handleDeleteLog = (id: string) => {
    if (window.confirm("Are you sure you want to delete this log?")) {
        setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard logs={logs} settings={settings} />;
      case AppView.HISTORY:
        return <LogHistory logs={logs} onDelete={handleDeleteLog} />;
      case AppView.SETTINGS:
        return <Settings settings={settings} logs={logs} onUpdateSettings={setSettings} />;
      default:
        return <Dashboard logs={logs} settings={settings} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full bg-ios-bg">
      {renderView()}
      
      {/* Camera is a modal overlay, rendered conditionally */}
      {currentView === AppView.CAMERA && (
        <CameraCapture 
            onSave={handleSaveLog} 
            onCancel={() => setCurrentView(AppView.DASHBOARD)} 
        />
      )}

      {/* Tab bar is hidden if camera is active */}
      {currentView !== AppView.CAMERA && (
        <TabBar currentView={currentView} onChangeView={setCurrentView} />
      )}
    </div>
  );
};

export default App;