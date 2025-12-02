import React, { useState, useEffect } from 'react';
import { AppView, MealLog, UserSettings } from './types.ts';
import TabBar from './components/TabBar.tsx';
import Dashboard from './views/Dashboard.tsx';
import CameraCapture from './views/CameraCapture.tsx';
import Settings from './views/Settings.tsx';
import LogHistory from './views/LogHistory.tsx';
import Stats from './views/Stats.tsx';
import AnalyzingOverlay from './components/AnalyzingOverlay.tsx';
import AuthGate from './components/AuthGate.tsx';
import { healthService } from './services/healthService.ts';
import * as savedMealsService from './services/savedMealsService.ts';

// Type for pending analysis
interface PendingAnalysis {
  id: string;
  imageData: string;
  timestamp: number;
}

// Default Settings
const DEFAULT_SETTINGS: UserSettings = {
  dailyCalorieGoal: 2000,
  dailyProteinGoal: 150,
  dailyCarbGoal: 200,
  dailyFatGoal: 65,
  appleHealthConnected: false,
  aiProvider: 'openai',
};

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const [viewTransition, setViewTransition] = useState<'entering' | 'entered' | 'exiting'>('entered');
  const [savedMealToLoad, setSavedMealToLoad] = useState<savedMealsService.SavedMeal | null>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem('nutrivision_logs');
    const savedSettings = localStorage.getItem('nutrivision_settings');
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedSettings) setSettings(JSON.parse(savedSettings));

    // Check for OpenAI API key (only check localStorage - env vars not secure in production)
    const openaiKey = localStorage.getItem('nutrivision_openai_api_key');
    
    if (!openaiKey) {
      setCurrentView(AppView.SETTINGS);
      setTimeout(() => {
        alert("Welcome! Please enter your OpenAI API Key in the Settings to start using AI features.\n\n🔒 Your key is stored locally and never shared.");
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

  // Handle when user captures an image - starts background analysis
  const handleImageCapture = (imageData: string) => {
    const analysis: PendingAnalysis = {
      id: Date.now().toString(),
      imageData,
      timestamp: Date.now(),
    };
    setPendingAnalysis(analysis);
    setCurrentView(AppView.DASHBOARD); // Return to dashboard while analyzing
  };

  // Handle when analysis is complete and user saves
  const handleAnalysisComplete = async (log: MealLog) => {
    setLogs(prev => [log, ...prev]);
    
    // Sync to HealthKit if enabled
    if (settings.appleHealthConnected) {
      await healthService.saveLog(log);
    }
    
    setPendingAnalysis(null);
  };

  // Handle dismissing the analysis (cancel)
  const handleDismissAnalysis = () => {
    setPendingAnalysis(null);
  };

  // Legacy save handler for manual entry or search results
  const handleSaveLog = async (log: MealLog) => {
    setLogs(prev => [log, ...prev]);
    
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

  // Handle view changes with transition
  const handleViewChange = (view: AppView) => {
    setViewTransition('exiting');
    setTimeout(() => {
      setCurrentView(view);
      setViewTransition('entering');
      setTimeout(() => setViewTransition('entered'), 300);
    }, 150);
  };

  // Handle loading a saved meal from Dashboard
  const handleLoadSavedMeal = (meal: savedMealsService.SavedMeal) => {
    setSavedMealToLoad(meal);
    setCurrentView(AppView.CAMERA);
  };

  useEffect(() => {
    setViewTransition('entering');
    setTimeout(() => setViewTransition('entered'), 300);
  }, [currentView]);

  const renderView = () => {
    switch (currentView) {
      case AppView.DASHBOARD:
        return <Dashboard logs={logs} settings={settings} onAddMeal={handleLoadSavedMeal} onDeleteLog={handleDeleteLog} />;
      case AppView.HISTORY:
        return <LogHistory logs={logs} onDelete={handleDeleteLog} />;
      case AppView.STATS:
        return <Stats logs={logs} settings={settings} />;
      case AppView.SETTINGS:
        return <Settings settings={settings} logs={logs} onUpdateSettings={setSettings} />;
      default:
        return <Dashboard logs={logs} settings={settings} onDeleteLog={handleDeleteLog} />;
    }
  };

  return (
    <AuthGate>
      <div className="flex flex-col h-full w-full bg-[#0a0a0f] overflow-hidden">
        <div 
          className={`flex-1 transition-all duration-300 overflow-hidden ${
            viewTransition === 'entering' 
              ? 'opacity-0 translate-x-4' 
              : viewTransition === 'exiting'
              ? 'opacity-0 -translate-x-4'
              : 'opacity-100 translate-x-0'
          }`}
        >
          {renderView()}
        </div>
        
        {/* Camera is a modal overlay */}
        {currentView === AppView.CAMERA && (
          <CameraCapture 
            onSave={handleSaveLog}
            onImageCapture={handleImageCapture}
            onCancel={() => {
              setCurrentView(AppView.DASHBOARD);
              setSavedMealToLoad(null);
            }}
            aiProvider={settings.aiProvider}
            savedMealToLoad={savedMealToLoad}
          />
        )}

        {/* Background analysis overlay */}
        <AnalyzingOverlay
          pendingAnalysis={pendingAnalysis}
          aiProvider={settings.aiProvider}
          onComplete={handleAnalysisComplete}
          onDismiss={handleDismissAnalysis}
        />

        {/* Tab bar is hidden if camera is active */}
        {currentView !== AppView.CAMERA && (
          <TabBar currentView={currentView} onChangeView={handleViewChange} />
        )}
      </div>
    </AuthGate>
  );
};

export default App;
