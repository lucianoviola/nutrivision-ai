import React, { useState, useEffect } from 'react';
import { UserSettings, MealLog } from '../types.ts';
import { healthService } from '../services/healthService.ts';
import * as supabaseService from '../services/supabaseService.ts';

interface SettingsProps {
  settings: UserSettings;
  logs: MealLog[];
  onUpdateSettings: (s: UserSettings) => void;
}

// Opal-style setting row
const SettingRow: React.FC<{
  icon: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}> = ({ icon, label, value, onChange, suffix = '' }) => {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(String(value));
  
  // Sync external value changes (e.g., from "Fix" button)
  useEffect(() => {
    if (!isFocused) {
      setInputValue(String(value));
    }
  }, [value, isFocused]);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    // Allow empty string or valid numbers
    if (newValue === '' || /^\d*$/.test(newValue)) {
      setInputValue(newValue);
      // Only update parent if we have a valid number
      if (newValue !== '' && !isNaN(Number(newValue))) {
        onChange(Number(newValue));
      }
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    // On blur, ensure we have a valid value (default to 0 if empty)
    if (inputValue === '' || isNaN(Number(inputValue))) {
      setInputValue(String(value));
    }
  };
  
  return (
    <div 
      className="flex items-center justify-between p-4 transition-all duration-300"
      style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}
    >
      <div className="flex items-center space-x-3">
        <span className="text-xl">{icon}</span>
        <span className="text-base font-medium text-white">{label}</span>
      </div>
      <div className="flex items-center space-x-2">
        <input 
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
          className="text-right outline-none font-bold w-20 text-white rounded-xl px-3 py-2 transition-all duration-300"
          style={{ 
            background: isFocused ? 'rgba(139, 92, 246, 0.2)' : 'rgba(139, 92, 246, 0.1)',
            border: isFocused ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid rgba(139, 92, 246, 0.2)',
            boxShadow: isFocused ? '0 0 20px rgba(139, 92, 246, 0.2)' : 'none',
          }}
        />
        {suffix && <span className="text-white/40 text-sm">{suffix}</span>}
      </div>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ settings, logs, onUpdateSettings }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);

  useEffect(() => {
    // Load API keys - try Supabase first, fall back to localStorage
    const loadApiKeys = async () => {
      if (supabaseService.isSupabaseConfigured()) {
        const user = await supabaseService.getCurrentUser();
        if (user) {
          const keys = await supabaseService.getApiKeys(user.id);
          if (keys) {
            setOpenaiApiKey(keys.openaiKey || '');
            setGeminiApiKey(keys.geminiKey || '');
            // Also sync to localStorage for the services to use
            if (keys.openaiKey) localStorage.setItem('nutrivision_openai_api_key', keys.openaiKey);
            if (keys.geminiKey) localStorage.setItem('nutrivision_gemini_api_key', keys.geminiKey);
            return;
          }
        }
      }
      // Fallback to localStorage
      setOpenaiApiKey(localStorage.getItem('nutrivision_openai_api_key') || '');
      setGeminiApiKey(localStorage.getItem('nutrivision_gemini_api_key') || '');
    };
    
    loadApiKeys();
    setIsNativeApp(healthService.isAvailable());
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleSaveKey = async () => {
    setIsSavingKey(true);
    
    // Always save to localStorage (services use this)
    localStorage.setItem('nutrivision_openai_api_key', openaiApiKey);
    localStorage.setItem('nutrivision_gemini_api_key', geminiApiKey);
    
    // Also save to Supabase if configured
    if (supabaseService.isSupabaseConfigured()) {
      const user = await supabaseService.getCurrentUser();
      if (user) {
        const success = await supabaseService.saveApiKeys(
          user.id, 
          openaiApiKey || null, 
          geminiApiKey || null,
          settings.aiProvider
        );
        if (success) {
          showToastNotification('API Keys saved & synced to cloud ☁️');
        } else {
          showToastNotification('Saved locally (cloud sync failed)');
        }
      } else {
        showToastNotification('API Key saved locally');
      }
    } else {
      showToastNotification('API Key saved locally');
    }
    
    setIsSavingKey(false);
    setShowKeyInput(false);
  };

  const handleExport = () => {
    const headers = ['Date', 'Time', 'Type', 'Items', 'Calories', 'Protein', 'Carbs', 'Fat'];
    const rows = logs.map(log => {
      const date = new Date(log.timestamp);
      return [
        date.toLocaleDateString(),
        date.toLocaleTimeString(),
        log.type,
        log.items.map(i => i.name).join('; '),
        log.totalMacros.calories,
        log.totalMacros.protein,
        log.totalMacros.carbs,
        log.totalMacros.fat
      ].join(',');
    });
    
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "nutrivision_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToastNotification('Data exported successfully');
  };

  const handleAppleHealth = async () => {
    if (!isNativeApp) {
      alert("To sync with Apple Health, this app must be installed as a Native iOS App via Xcode/Capacitor.");
      return;
    }

    const newStatus = !settings.appleHealthConnected;
    if (newStatus) {
      const granted = await healthService.requestPermissions();
      if (granted) {
        onUpdateSettings({ ...settings, appleHealthConnected: true });
        showToastNotification('Apple Health connected');
      } else {
        alert("Permission not granted via iOS.");
      }
    } else {
      onUpdateSettings({ ...settings, appleHealthConnected: false });
    }
  };

  return (
    <div className="h-full overflow-y-auto pb-28 relative">
      {/* Opal-style background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0" style={{ background: '#0D0B1C' }} />
        <div 
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.12) 0%, transparent 50%),
              radial-gradient(ellipse at 20% 80%, rgba(236, 72, 153, 0.08) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className={`pt-14 px-6 pb-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-base text-white/40 mt-1">Make it yours</p>
        </div>

        <div className="px-6 space-y-6">
          {/* Daily Goals */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <span className="text-xl">🎯</span>
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">Daily Goals</h3>
            </div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(26, 22, 51, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <SettingRow
                icon="🔥"
                label="Calories"
                value={settings.dailyCalorieGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyCalorieGoal: v})}
                suffix="kcal"
              />
              <SettingRow
                icon="🥩"
                label="Protein"
                value={settings.dailyProteinGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyProteinGoal: v})}
                suffix="g"
              />
              <SettingRow
                icon="🍞"
                label="Carbs"
                value={settings.dailyCarbGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyCarbGoal: v})}
                suffix="g"
              />
              <SettingRow
                icon="🥑"
                label="Fat"
                value={settings.dailyFatGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyFatGoal: v})}
                suffix="g"
              />
              
              {/* Calorie calculation from macros */}
              {(() => {
                const calculatedCalories = 
                  (settings.dailyProteinGoal * 4) + 
                  (settings.dailyCarbGoal * 4) + 
                  (settings.dailyFatGoal * 9);
                const difference = calculatedCalories - settings.dailyCalorieGoal;
                const isMatch = Math.abs(difference) <= 50; // Allow 50 cal tolerance
                
                return (
                  <div 
                    className="p-4 flex items-center justify-between"
                    style={{ 
                      background: isMatch 
                        ? 'rgba(16, 185, 129, 0.1)' 
                        : 'rgba(251, 191, 36, 0.1)',
                      borderTop: '1px solid rgba(139, 92, 246, 0.1)',
                    }}
                  >
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{isMatch ? '✓' : '⚠️'}</span>
                      <span className="text-xs text-white/50">
                        Macros = <span className="font-bold text-white/80">{calculatedCalories}</span> kcal
                      </span>
                    </div>
                    {!isMatch && (
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-amber-400">
                          {difference > 0 ? '+' : ''}{difference} kcal
                        </span>
                        <button
                          onClick={() => onUpdateSettings({...settings, dailyCalorieGoal: calculatedCalories})}
                          className="text-xs font-bold px-2 py-1 rounded-lg transition-all active:scale-95"
                          style={{
                            background: 'rgba(139, 92, 246, 0.2)',
                            color: '#A855F7',
                          }}
                        >
                          Fix
                        </button>
                      </div>
                    )}
                    {isMatch && (
                      <span className="text-xs text-green-400 font-medium">Balanced ✓</span>
                    )}
                  </div>
                );
              })()}
            </div>
            
            {/* Macro breakdown hint */}
            <p className="text-[10px] text-white/30 mt-2 px-1">
              Protein & Carbs = 4 cal/g • Fat = 9 cal/g
            </p>
          </div>

          {/* OpenAI API Configuration */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <span className="text-xl">⚡</span>
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">AI API Keys</h3>
            </div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(26, 22, 51, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <span>🔑</span>
                    <span className="text-sm font-medium text-white/70">API Keys</span>
                  </div>
                  <button 
                    onClick={() => setShowKeyInput(!showKeyInput)} 
                    className="text-sm font-bold transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {showKeyInput ? 'Hide' : 'Configure'}
                  </button>
                </div>
                
                {!showKeyInput && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">OpenAI</span>
                      {openaiApiKey ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                            <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-xs text-green-400">Configured</span>
                        </div>
                      ) : (
                        <span className="text-xs text-amber-400">Not set</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-white/50">Gemini</span>
                      {geminiApiKey ? (
                        <div className="flex items-center space-x-1">
                          <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: 'rgba(16, 185, 129, 0.2)' }}>
                            <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                          <span className="text-xs text-green-400">Configured</span>
                        </div>
                      ) : (
                        <span className="text-xs text-white/40">Not set</span>
                      )}
                    </div>
                    {supabaseService.isSupabaseConfigured() && (openaiApiKey || geminiApiKey) && (
                      <div className="flex items-center space-x-1 pt-1">
                        <span className="text-xs text-purple-400">☁️ Synced to cloud</span>
                      </div>
                    )}
                  </div>
                )}
                
                {showKeyInput && (
                  <div className="mt-3 space-y-4">
                    {/* OpenAI Key */}
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">OpenAI API Key</label>
                      <input 
                        type="password"
                        value={openaiApiKey}
                        onChange={(e) => setOpenaiApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full rounded-xl px-4 py-3 text-base outline-none text-white placeholder-white/30 transition-all duration-300"
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}
                      />
                      <a 
                        href="https://platform.openai.com/api-keys"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-1 inline-block"
                        style={{ color: '#A855F7' }}
                      >
                        Get OpenAI key →
                      </a>
                    </div>
                    
                    {/* Gemini Key */}
                    <div>
                      <label className="text-xs text-white/50 mb-1 block">Gemini API Key (optional)</label>
                      <input 
                        type="password"
                        value={geminiApiKey}
                        onChange={(e) => setGeminiApiKey(e.target.value)}
                        placeholder="AIza..."
                        className="w-full rounded-xl px-4 py-3 text-base outline-none text-white placeholder-white/30 transition-all duration-300"
                        style={{
                          background: 'rgba(139, 92, 246, 0.1)',
                          border: '1px solid rgba(139, 92, 246, 0.2)',
                        }}
                      />
                      <a 
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs mt-1 inline-block"
                        style={{ color: '#A855F7' }}
                      >
                        Get Gemini key →
                      </a>
                    </div>
                    
                    <button 
                      onClick={handleSaveKey}
                      disabled={isSavingKey}
                      className="w-full text-white text-base font-bold py-3 rounded-xl transition-all duration-300 active:scale-95 disabled:opacity-50"
                      style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                        boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                      }}
                    >
                      {isSavingKey ? 'Saving...' : 'Save Keys'}
                    </button>
                    <p className="text-xs text-white/30 leading-relaxed">
                      🔒 Keys are {supabaseService.isSupabaseConfigured() ? 'encrypted & synced to your cloud account' : 'stored locally on your device'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <span className="text-xl">🔌</span>
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">Integrations</h3>
            </div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(26, 22, 51, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <button 
                onClick={handleAppleHealth} 
                className="w-full p-4 flex items-center justify-between transition-all active:scale-[0.98]"
                style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)' }}
              >
                <div className="flex items-center space-x-3">
                  <span className={`text-xl ${isNativeApp ? '' : 'opacity-50'}`}>❤️</span>
                  <div className="text-left">
                    <span className="font-medium text-white block">Apple Health</span>
                    {!isNativeApp && <span className="text-xs text-white/30">Native app required</span>}
                  </div>
                </div>
                <div 
                  className="w-12 h-7 rounded-full p-1 transition-all duration-300 relative"
                  style={{ 
                    background: settings.appleHealthConnected 
                      ? 'linear-gradient(135deg, #8B5CF6, #EC4899)' 
                      : 'rgba(139, 92, 246, 0.2)',
                    boxShadow: settings.appleHealthConnected ? '0 0 12px rgba(139, 92, 246, 0.4)' : 'none',
                  }}
                >
                  <div 
                    className="w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300"
                    style={{ 
                      transform: settings.appleHealthConnected ? 'translateX(20px)' : 'translateX(0)',
                    }}
                  ></div>
                </div>
              </button>
              
              <button 
                onClick={handleExport} 
                className="w-full p-4 flex items-center justify-between text-white transition-all active:scale-[0.98] hover:bg-white/5"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">📤</span>
                  <div className="text-left">
                    <span className="font-medium text-white block">Export Data</span>
                    <span className="text-xs text-white/30">Download as CSV file</span>
                  </div>
                </div>
                <span className="text-white/30">→</span>
              </button>
            </div>
          </div>

          {/* About */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <span className="text-xl">ℹ️</span>
              <h3 className="text-sm font-bold text-white/40 uppercase tracking-wider">About</h3>
            </div>
            <div 
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(26, 22, 51, 0.6)',
                border: '1px solid rgba(139, 92, 246, 0.15)',
                backdropFilter: 'blur(20px)',
              }}
            >
              <div className="flex items-center space-x-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #8B5CF6, #EC4899)',
                    boxShadow: '0 4px 20px rgba(139, 92, 246, 0.3)',
                  }}
                >
                  🍽️
                </div>
                <div>
                  <h4 className="font-bold text-white">NutriVision AI</h4>
                  <p className="text-sm text-white/40">Version 1.0.0</p>
                  <p className="text-xs text-white/30 mt-1">
                    Powered by {settings.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI GPT-5'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        
          {/* Storage info */}
          <div className="text-center text-xs text-white/30 py-4">
            💾 Data stored locally on this device
          </div>
        </div>
      </div>

      {/* Toast notification */}
      {showToast && (
        <div 
          className="fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center space-x-2"
          style={{
            background: 'linear-gradient(135deg, #10B981, #14B8A6)',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
          }}
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-base font-medium text-white">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Settings;
