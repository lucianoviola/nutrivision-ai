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
import SupabaseAuth from './components/SupabaseAuth.tsx';
import { ToastProvider, useToast } from './components/Toast.tsx';
import OfflineIndicator from './components/OfflineIndicator.tsx';
import SplashScreen from './components/SplashScreen.tsx';
import { healthService } from './services/healthService.ts';
import * as savedMealsService from './services/savedMealsService.ts';
import { hapticSuccess, hapticError, hapticTap, hapticImpact } from './utils/haptics.ts';
import { compressImage, needsCompression } from './utils/imageCompression.ts';
import { generateUUID } from './utils/uuid.ts';
import * as supabaseService from './services/supabaseService.ts';
import { User } from '@supabase/supabase-js';

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
const AppContent: React.FC<{ user: User | null }> = ({ user }) => {
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
  const [isLoading, setIsLoading] = useState(true);
  const [hasMigrated, setHasMigrated] = useState(false);
  
  const { showSuccess, showError, showCelebration, showUndo, showToast } = useToast();
  
  const useSupabase = supabaseService.isSupabaseConfigured() && user;

  // Load data - from Supabase if logged in, otherwise localStorage
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      if (useSupabase && user) {
        // Load from Supabase
        try {
          const [cloudLogs, cloudSettings] = await Promise.all([
            supabaseService.getMealLogs(user.id),
            supabaseService.getUserSettings(user.id),
          ]);
          
          if (cloudLogs.length > 0) {
            setLogs(cloudLogs);
          }
          if (cloudSettings) {
            setSettings(cloudSettings);
          }
          
          // Check if we need to migrate local data
          const hasLocalData = localStorage.getItem('nutrivision_logs');
          const hasCloudData = cloudLogs.length > 0;
          
          if (hasLocalData && !hasCloudData && !hasMigrated) {
            const localLogs = JSON.parse(hasLocalData);
            if (localLogs.length > 0) {
              showToast('Migrating your local data to cloud...', 'info');
              const result = await supabaseService.migrateFromLocalStorage(user.id);
              if (result.success) {
                showSuccess(`Migrated ${result.migratedCount} meals to cloud!`);
                // Reload from cloud
                const newLogs = await supabaseService.getMealLogs(user.id);
                setLogs(newLogs);
                // Clear local storage after successful migration
                localStorage.removeItem('nutrivision_logs');
                localStorage.removeItem('nutrivision_settings');
              }
              setHasMigrated(true);
            }
          }
        } catch (err) {
          console.error('Error loading from Supabase:', err);
          // Fallback to localStorage
          const savedLogs = localStorage.getItem('nutrivision_logs');
          const savedSettings = localStorage.getItem('nutrivision_settings');
          if (savedLogs) setLogs(JSON.parse(savedLogs));
          if (savedSettings) setSettings(JSON.parse(savedSettings));
        }
      } else {
        // Load from localStorage
        const savedLogs = localStorage.getItem('nutrivision_logs');
        const savedSettings = localStorage.getItem('nutrivision_settings');
        if (savedLogs) setLogs(JSON.parse(savedLogs));
        if (savedSettings) setSettings(JSON.parse(savedSettings));
      }

      // Check for OpenAI API key - only show reminder once
      const openaiKey = localStorage.getItem('nutrivision_openai_api_key');
      const hasSeenKeyReminder = localStorage.getItem('nutrivision_seen_key_reminder');
      if (!openaiKey && !hasSeenKeyReminder) {
        localStorage.setItem('nutrivision_seen_key_reminder', 'true');
        setCurrentView(AppView.SETTINGS);
        setTimeout(() => {
          showToast("Add your OpenAI API key to analyze food photos.", 'info', { duration: 5000 });
        }, 500);
      }
      
      setIsLoading(false);
    };
    
    loadData();
  }, [user, useSupabase]);

  // Save settings changes
  useEffect(() => {
    // Always save to localStorage as backup
    localStorage.setItem('nutrivision_settings', JSON.stringify(settings));
    
    // Also save to Supabase if logged in
    if (useSupabase && user && !isLoading) {
      supabaseService.updateUserSettings(user.id, settings);
    }
  }, [settings, user, useSupabase, isLoading]);

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
      id: generateUUID(),
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
    // Optimistic update - add to state immediately
    const newLogs = [log, ...logs];
    setLogs(newLogs);
    
    // Save to localStorage as backup
    localStorage.setItem('nutrivision_logs', JSON.stringify(newLogs));
    
    // Save to Supabase if logged in
    if (useSupabase && user) {
      try {
        await supabaseService.createMealLog(user.id, log);
      } catch (err) {
        console.error('Error saving to Supabase:', err);
        showError('Cloud sync failed, saved locally');
      }
    }
    
    showSuccess(`${log.type.charAt(0).toUpperCase() + log.type.slice(1)} saved!`);
    checkGoalCelebration(newLogs);
    
    if (settings.appleHealthConnected) {
      await healthService.saveLog(log);
    }
    
    setCurrentView(AppView.DASHBOARD);
  };

  const handleDeleteLog = async (id: string) => {
    const mealToDelete = logs.find(l => l.id === id);
    if (!mealToDelete) return;
    
    // Haptic feedback for delete
    hapticImpact();
    
    // Store for undo
    setDeletedMeal(mealToDelete);
    
    // Remove immediately (optimistic)
    const newLogs = logs.filter(l => l.id !== id);
    setLogs(newLogs);
    localStorage.setItem('nutrivision_logs', JSON.stringify(newLogs));
    
    // Delete from Supabase
    if (useSupabase && user) {
      supabaseService.deleteMealLog(user.id, id);
    }
    
    // Show undo toast
    showUndo("Meal deleted", async () => {
      // Restore the meal
      hapticSuccess();
      if (mealToDelete) {
        const restoredLogs = [mealToDelete, ...logs].sort((a, b) => 
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setLogs(restoredLogs);
        localStorage.setItem('nutrivision_logs', JSON.stringify(restoredLogs));
        
        // Re-create in Supabase
        if (useSupabase && user) {
          supabaseService.createMealLog(user.id, mealToDelete);
        }
        
        showSuccess("Meal restored!");
      }
    });
  };

  const handleUpdateLog = async (updatedMeal: MealLog) => {
    setLogs(prev => {
      const updated = prev.map(log => log.id === updatedMeal.id ? updatedMeal : log);
      localStorage.setItem('nutrivision_logs', JSON.stringify(updated));
      return updated;
    });
    
    // Update in Supabase
    if (useSupabase && user) {
      try {
        await supabaseService.updateMealLog(user.id, updatedMeal);
      } catch (err) {
        console.error('Error updating in Supabase:', err);
      }
    }
    
    showSuccess("Meal updated!");
    
    // Sync to HealthKit if enabled
    if (settings.appleHealthConnected) {
      healthService.saveLog(updatedMeal);
    }
  };

  const handleDuplicateLog = async (meal: MealLog) => {
    hapticSuccess();
    
    // Create a new meal with new ID and current timestamp
    const duplicatedMeal: MealLog = {
      ...meal,
      id: generateUUID(),
      timestamp: Date.now(),
    };
    
    const newLogs = [duplicatedMeal, ...logs].sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    setLogs(newLogs);
    localStorage.setItem('nutrivision_logs', JSON.stringify(newLogs));
    
    // Save to Supabase
    if (useSupabase && user) {
      try {
        await supabaseService.createMealLog(user.id, duplicatedMeal);
      } catch (err) {
        console.error('Error saving duplicate to Supabase:', err);
      }
    }
    
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
        return <Dashboard 
          logs={logs} 
          settings={settings} 
          onAddMeal={() => setCurrentView(AppView.CAMERA)} 
          onDeleteLog={handleDeleteLog} 
          onUpdateLog={handleUpdateLog}
          pendingAnalysis={pendingAnalysis}
          onExpandAnalysis={() => setAnalysisExpanded(true)}
        />;
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

// Main App wrapper with providers and auth
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  
  useEffect(() => {
    // Check if Supabase is configured
    if (!supabaseService.isSupabaseConfigured()) {
      console.log('Supabase not configured, using local auth');
      // No Supabase - use old password auth
      setAuthLoading(false);
      return;
    }
    
    console.log('Checking Supabase auth...');
    
    // Add timeout to prevent infinite loading (3 seconds)
    const timeout = setTimeout(() => {
      console.warn('Auth check timed out - falling back to local auth');
      setAuthLoading(false);
      setAuthError('Connection timed out');
    }, 3000);
    
    // Get initial user
    supabaseService.getCurrentUser()
      .then(u => {
        console.log('Auth check complete, user:', u?.email || 'none');
        clearTimeout(timeout);
        setUser(u);
        setAuthLoading(false);
      })
      .catch(err => {
        console.error('Auth error:', err);
        clearTimeout(timeout);
        setAuthLoading(false);
        setAuthError(err.message);
      });
    
    // Subscribe to auth changes
    const unsubscribe = supabaseService.onAuthStateChange((u) => {
      setUser(u);
    });
    
    return () => {
      clearTimeout(timeout);
      unsubscribe();
    };
  }, []);
  
  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0D0B1C' }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse"
            style={{ background: 'linear-gradient(135deg, #8B5CF6, #EC4899)' }}>
            <span className="text-3xl">🍽️</span>
          </div>
          <p className="text-white/50">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Show error if auth failed (fallback to local auth)
  if (authError) {
    console.warn('Auth error, falling back to local mode:', authError);
    // Fall through to show app with old auth
  }
  
  // If Supabase is configured but no user (and no error), show auth
  if (supabaseService.isSupabaseConfigured() && !user && !authError) {
    return <SupabaseAuth onSuccess={() => {}} />;
  }
  
  // Otherwise show app (with old AuthGate if no Supabase)
  const content = (
    <ToastProvider>
      <OfflineIndicator />
      <AppContent user={user} />
    </ToastProvider>
  );
  
  // Use old AuthGate only if Supabase is not configured
  if (!supabaseService.isSupabaseConfigured()) {
    return <AuthGate>{content}</AuthGate>;
  }
  
  return content;
};

export default App;
