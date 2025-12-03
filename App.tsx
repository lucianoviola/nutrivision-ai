import React, { useState, useEffect, useCallback } from 'react';
import { AppView, MealLog, UserSettings } from './types.ts';
import TabBar from './components/TabBar.tsx';
import Dashboard from './views/Dashboard.tsx';
import CameraCapture from './views/CameraCapture.tsx';
import Settings from './views/Settings.tsx';
import LogHistory from './views/LogHistory.tsx';
import Stats from './views/Stats.tsx';
import AnalyzingOverlay from './components/AnalyzingOverlay.tsx';
import AuthGate from './components/AuthGate.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import OfflineIndicator from './components/OfflineIndicator.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { healthService } from './services/healthService.ts';
import * as savedMealsService from './services/savedMealsService.ts';
import { hapticSuccess, hapticError, hapticTap, hapticImpact } from './utils/haptics.ts';
import { compressImage, needsCompression } from './utils/imageCompression.ts';

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

// Inner app component that can use toast hooks
const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.DASHBOARD);
  const [logs, setLogs] = useState<MealLog[]>([]);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [pendingAnalysis, setPendingAnalysis] = useState<PendingAnalysis | null>(null);
  const [viewTransition, setViewTransition] = useState<'entering' | 'entered' | 'exiting'>('entered');
  const [savedMealToLoad, setSavedMealToLoad] = useState<savedMealsService.SavedMeal | null>(null);
  const [deletedMeal, setDeletedMeal] = useState<MealLog | null>(null);
  const [previousCaloriePercent, setPreviousCaloriePercent] = useState(0);
  const [previousGoals, setPreviousGoals] = useState({ protein: 0, carbs: 0, fat: 0 });
  const [showSplash, setShowSplash] = useState(true);
  
  const { showSuccess, showError, showCelebration, showUndo, showToast } = useToast();

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
        showToast("Welcome! Add your OpenAI API key to get started.", 'info', { duration: 5000 });
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
  const handleImageCapture = async (imageData: string) => {
    // Compress image if needed
    let processedImage = imageData;
    if (needsCompression(imageData)) {
      try {
        processedImage = await compressImage(imageData, 1024, 0.85);
      } catch (err) {
        console.warn('Image compression failed, using original:', err);
      }
    }
    
    const analysis: PendingAnalysis = {
      id: Date.now().toString(),
      imageData: processedImage,
      timestamp: Date.now(),
    };
    setPendingAnalysis(analysis);
    setCurrentView(AppView.DASHBOARD); // Return to dashboard while analyzing
  };

  // Check if goals are reached and celebrate
  const checkGoalCelebration = useCallback((newLogs: MealLog[]) => {
    const today = new Date();
    const todayLogs = newLogs.filter(log => {
      const logDate = new Date(log.timestamp);
      return logDate.getDate() === today.getDate() && 
             logDate.getMonth() === today.getMonth() && 
             logDate.getFullYear() === today.getFullYear();
    });
    
    const totals = todayLogs.reduce((acc, log) => ({
      calories: acc.calories + log.totalMacros.calories,
      protein: acc.protein + log.totalMacros.protein,
      carbs: acc.carbs + log.totalMacros.carbs,
      fat: acc.fat + log.totalMacros.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    const caloriePercent = Math.round((totals.calories / settings.dailyCalorieGoal) * 100);
    const proteinPercent = Math.round((totals.protein / settings.dailyProteinGoal) * 100);
    const carbsPercent = Math.round((totals.carbs / settings.dailyCarbGoal) * 100);
    const fatPercent = Math.round((totals.fat / settings.dailyFatGoal) * 100);
    
    // Check for 100% achievements (celebrate once per goal)
    const achieved: string[] = [];
    
    if (caloriePercent >= 100 && previousCaloriePercent < 100) {
      achieved.push('calories');
    }
    if (proteinPercent >= 100 && previousGoals.protein < 100) {
      achieved.push('protein');
    }
    if (carbsPercent >= 100 && previousGoals.carbs < 100) {
      achieved.push('carbs');
    }
    if (fatPercent >= 100 && previousGoals.fat < 100) {
      achieved.push('fat');
    }
    
    // Show celebration based on achievements
    if (achieved.length === 4) {
      showCelebration("🏆 All daily goals reached! Perfect day!");
    } else if (achieved.length > 1) {
      showCelebration(`🎉 ${achieved.join(' & ')} goals reached!`);
    } else if (achieved.includes('calories')) {
      showCelebration("🎉 Daily calorie goal reached!");
    } else if (achieved.includes('protein')) {
      showSuccess("💪 Protein goal reached!");
    } else if (achieved.includes('carbs')) {
      showSuccess("🍞 Carbs goal reached!");
    } else if (achieved.includes('fat')) {
      showSuccess("🥑 Fat goal reached!");
    }
    
    // Update previous values
    setPreviousCaloriePercent(caloriePercent);
    setPreviousGoals({ protein: proteinPercent, carbs: carbsPercent, fat: fatPercent });
  }, [settings, previousCaloriePercent, previousGoals, showCelebration, showSuccess]);

  // Handle when analysis is complete and user saves
  const handleAnalysisComplete = async (log: MealLog) => {
    const newLogs = [log, ...logs];
    setLogs(newLogs);
    
    // Show success toast
    showSuccess(`${log.type.charAt(0).toUpperCase() + log.type.slice(1)} saved!`);
    
    // Check for goal celebration
    checkGoalCelebration(newLogs);
    
    // Sync to HealthKit if enabled
    if (settings.appleHealthConnected) {
      await healthService.saveLog(log);
    }
    
    // Clear pending analysis and ensure we're on dashboard
    setPendingAnalysis(null);
    setCurrentView(AppView.DASHBOARD);
  };

  // Handle dismissing the analysis (cancel)
  const handleDismissAnalysis = () => {
    setPendingAnalysis(null);
  };

  // Legacy save handler for manual entry or search results
  const handleSaveLog = async (log: MealLog) => {
    const newLogs = [log, ...logs];
    setLogs(newLogs);
    
    showSuccess(`${log.type.charAt(0).toUpperCase() + log.type.slice(1)} saved!`);
    checkGoalCelebration(newLogs);
    
    if (settings.appleHealthConnected) {
      await healthService.saveLog(log);
    }
    
    setCurrentView(AppView.DASHBOARD);
  };

  const handleDeleteLog = (id: string) => {
    const mealToDelete = logs.find(l => l.id === id);
    if (!mealToDelete) return;
    
    // Haptic feedback for delete
    hapticImpact();
    
    // Store for undo
    setDeletedMeal(mealToDelete);
    
    // Remove immediately
    setLogs(prev => prev.filter(l => l.id !== id));
    
    // Show undo toast
    showUndo("Meal deleted", () => {
      // Restore the meal
      hapticSuccess();
      if (mealToDelete) {
        setLogs(prev => [mealToDelete, ...prev].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        ));
        showSuccess("Meal restored!");
      }
    });
  };

  const handleUpdateLog = (updatedMeal: MealLog) => {
    setLogs(prev => {
      const updated = prev.map(log => log.id === updatedMeal.id ? updatedMeal : log);
      localStorage.setItem('nutrivision_logs', JSON.stringify(updated));
      return updated;
    });
    
    showSuccess("Meal updated!");
    
    // Sync to HealthKit if enabled
    if (settings.appleHealthConnected) {
      healthService.saveLog(updatedMeal);
    }
  };

  const handleDuplicateLog = (meal: MealLog) => {
    hapticSuccess();
    
    // Create a new meal with new ID and current timestamp
    const duplicatedMeal: MealLog = {
      ...meal,
      id: Date.now().toString(),
      timestamp: Date.now(),
    };
    
    setLogs(prev => {
      const updated = [duplicatedMeal, ...prev].sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      localStorage.setItem('nutrivision_logs', JSON.stringify(updated));
      return updated;
    });
    
    showSuccess("Meal duplicated!");
    
    // Sync to HealthKit if enabled
    if (settings.appleHealthConnected) {
      healthService.saveLog(duplicatedMeal);
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
        return <Dashboard logs={logs} settings={settings} onAddMeal={() => setCurrentView(AppView.CAMERA)} onDeleteLog={handleDeleteLog} onUpdateLog={handleUpdateLog} />;
      case AppView.HISTORY:
        return <LogHistory logs={logs} onDelete={handleDeleteLog} onUpdateLog={handleUpdateLog} onDuplicateLog={handleDuplicateLog} settings={settings} />;
      case AppView.STATS:
        return <Stats logs={logs} settings={settings} />;
      case AppView.SETTINGS:
        return <Settings settings={settings} logs={logs} onUpdateSettings={setSettings} />;
      default:
        return <Dashboard logs={logs} settings={settings} onDeleteLog={handleDeleteLog} />;
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#0D0B1C' }}>
      {/* Splash Screen */}
      {showSplash && (
        <SplashScreen onComplete={() => setShowSplash(false)} minDuration={1800} />
      )}
      
      <div 
        className={`flex-1 min-h-0 transition-all duration-300 ease-out ${
          viewTransition === 'entering' 
            ? 'opacity-0 scale-[0.98] translate-y-2' 
            : viewTransition === 'exiting'
            ? 'opacity-0 scale-[0.98] -translate-y-2'
            : 'opacity-100 scale-100 translate-y-0'
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
  );
};

// Main App wrapper with providers
const App: React.FC = () => {
  return (
    <AuthGate>
      <ToastProvider>
        <OfflineIndicator />
        <AppContent />
      </ToastProvider>
    </AuthGate>
  );
};

export default App;
