import React, { useState, useEffect } from 'react';
import { UserSettings, MealLog, AIProvider } from '../types.ts';
import { healthService } from '../services/healthService.ts';

interface SettingsProps {
  settings: UserSettings;
  logs: MealLog[];
  onUpdateSettings: (s: UserSettings) => void;
}

// Setting row component with focus animation
const SettingRow: React.FC<{
  icon: string;
  gradient: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
}> = ({ icon, gradient, label, value, onChange, suffix = '' }) => {
  const [isFocused, setIsFocused] = useState(false);
  
  return (
    <div 
      className="flex items-center justify-between p-4 transition-all duration-300"
      style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
    >
      <div className="flex items-center space-x-3">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg transition-transform duration-300 hover:scale-110"
          style={{ background: gradient }}
        >
          {icon}
        </div>
        <span className="text-body font-medium text-white">{label}</span>
      </div>
      <div className="flex items-center space-x-1">
        <input 
          type="number" 
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className="text-right outline-none font-bold w-20 text-white rounded-lg px-3 py-1.5 transition-all duration-300"
          style={{ 
            background: isFocused ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.1)',
            border: isFocused ? '1px solid rgba(139, 92, 246, 0.5)' : '1px solid transparent',
            boxShadow: isFocused ? '0 0 0 3px rgba(139, 92, 246, 0.1)' : 'none',
          }}
        />
        {suffix && <span className="text-gray-500 text-caption">{suffix}</span>}
      </div>
    </div>
  );
};

const Settings: React.FC<SettingsProps> = ({ settings, logs, onUpdateSettings }) => {
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [isNativeApp, setIsNativeApp] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(false);

  useEffect(() => {
    const geminiKey = localStorage.getItem('nutrivision_api_key') || '';
    const openaiKey = localStorage.getItem('nutrivision_openai_api_key') || '';
    setGeminiApiKey(geminiKey);
    setOpenaiApiKey(openaiKey);
    setIsNativeApp(healthService.isAvailable());
    const timer = setTimeout(() => setHeaderVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const showToastNotification = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2500);
  };

  const handleSaveKey = () => {
    if (settings.aiProvider === 'gemini') {
      localStorage.setItem('nutrivision_api_key', geminiApiKey);
    } else {
      localStorage.setItem('nutrivision_openai_api_key', openaiApiKey);
    }
    showToastNotification('API Key saved successfully');
    setShowKeyInput(false);
  };

  const handleProviderChange = (provider: AIProvider) => {
    onUpdateSettings({ ...settings, aiProvider: provider });
  };

  const getCurrentApiKey = () => {
    return settings.aiProvider === 'gemini' ? geminiApiKey : openaiApiKey;
  };

  const setCurrentApiKey = (key: string) => {
    if (settings.aiProvider === 'gemini') {
      setGeminiApiKey(key);
    } else {
      setOpenaiApiKey(key);
    }
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
    <div className="flex-1 overflow-y-auto pb-28 min-h-screen relative">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            background: `
              radial-gradient(ellipse at 80% 20%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
              radial-gradient(ellipse at 20% 80%, rgba(99, 102, 241, 0.1) 0%, transparent 50%)
            `,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <div className={`pt-14 px-6 pb-6 transition-all duration-700 ${headerVisible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4'}`}>
          <h1 className="text-title-1-lg font-bold text-white">Settings</h1>
          <p className="text-body text-gray-400 mt-1">Make it yours</p>
        </div>

        <div className="px-6 space-y-6">
          {/* Daily Goals */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{
                  background: 'linear-gradient(135deg, rgba(251, 191, 36, 0.3), rgba(245, 158, 11, 0.1))',
                }}
              >
                🎯
              </div>
              <h3 className="text-body font-bold text-gray-400 uppercase tracking-wider">Daily Goals</h3>
            </div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <SettingRow
                icon="🔥"
                gradient="linear-gradient(135deg, rgba(249, 115, 22, 0.2), rgba(245, 158, 11, 0.1))"
                label="Calories"
                value={settings.dailyCalorieGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyCalorieGoal: v})}
                suffix="kcal"
              />
              <SettingRow
                icon="🥩"
                gradient="linear-gradient(135deg, rgba(52, 211, 153, 0.2), rgba(16, 185, 129, 0.1))"
                label="Protein"
                value={settings.dailyProteinGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyProteinGoal: v})}
                suffix="g"
              />
              <SettingRow
                icon="🍞"
                gradient="linear-gradient(135deg, rgba(34, 211, 238, 0.2), rgba(6, 182, 212, 0.1))"
                label="Carbs"
                value={settings.dailyCarbGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyCarbGoal: v})}
                suffix="g"
              />
              <SettingRow
                icon="🥑"
                gradient="linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(249, 115, 22, 0.1))"
                label="Fat"
                value={settings.dailyFatGoal}
                onChange={(v) => onUpdateSettings({...settings, dailyFatGoal: v})}
                suffix="g"
              />
            </div>
          </div>

          {/* AI Configuration */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(139, 92, 246, 0.1))',
                }}
              >
                🤖
              </div>
              <h3 className="text-body font-bold text-gray-400 uppercase tracking-wider">AI Configuration</h3>
            </div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {/* Provider Selection */}
              <div className="p-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <span className="text-sm font-medium text-gray-400 mb-3 block">AI Provider</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handleProviderChange('gemini')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 active:scale-95 ${
                      settings.aiProvider === 'gemini'
                        ? 'text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={settings.aiProvider === 'gemini' ? {
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                    } : {
                      background: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <span>💎</span>
                    <span>Gemini</span>
                  </button>
                  <button
                    onClick={() => handleProviderChange('openai')}
                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center space-x-2 active:scale-95 ${
                      settings.aiProvider === 'openai'
                        ? 'text-white shadow-lg'
                        : 'text-gray-400 hover:text-white'
                    }`}
                    style={settings.aiProvider === 'openai' ? {
                      background: 'linear-gradient(135deg, #10b981, #14b8a6)',
                      boxShadow: '0 4px 20px rgba(16, 185, 129, 0.3)',
                    } : {
                      background: 'rgba(255,255,255,0.05)',
                    }}
                  >
                    <span>⚡</span>
                    <span>OpenAI</span>
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center space-x-2">
                    <span>🔑</span>
                    <span className="text-sm font-medium text-gray-300">
                      {settings.aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API Key
                    </span>
                  </div>
                  <button 
                    onClick={() => setShowKeyInput(!showKeyInput)} 
                    className="text-sm font-semibold transition-all active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                    }}
                  >
                    {showKeyInput ? 'Hide' : 'Configure'}
                  </button>
                </div>
                
                {!showKeyInput && (
                  <div className="flex items-center space-x-2">
                    {getCurrentApiKey() ? (
                      <div className="flex items-center space-x-2">
                        <div className="relative">
                          <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center">
                            <svg 
                              className="w-3 h-3 text-green-400 animate-checkmark"
                              fill="none" 
                              stroke="currentColor" 
                              viewBox="0 0 24 24"
                            >
                              <path 
                                strokeLinecap="round" 
                                strokeLinejoin="round" 
                                strokeWidth="3" 
                                d="M5 13l4 4L19 7"
                                strokeDasharray="20"
                                strokeDashoffset="20"
                                style={{
                                  animation: 'checkmark 0.6s ease-out forwards',
                                }}
                              />
                            </svg>
                          </div>
                        </div>
                        <span className="text-caption text-green-400 font-medium">Key configured</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 rounded-full bg-gray-600"></div>
                        <span className="text-caption text-gray-500">No key set</span>
                      </div>
                    )}
                  </div>
                )}
                
                {showKeyInput && (
                  <div className="mt-3 space-y-3">
                    <input 
                      type="password"
                      value={getCurrentApiKey()}
                      onChange={(e) => setCurrentApiKey(e.target.value)}
                      placeholder={`Paste your ${settings.aiProvider === 'gemini' ? 'Gemini' : 'OpenAI'} API key`}
                      className="w-full rounded-xl px-4 py-3 text-body outline-none text-white placeholder-gray-500 transition-all duration-300"
                      style={{
                        background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)',
                      }}
                      onFocus={(e) => {
                        e.target.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                        e.target.style.boxShadow = '0 0 0 3px rgba(139, 92, 246, 0.1)';
                        e.target.style.background = 'rgba(255,255,255,0.12)';
                      }}
                      onBlur={(e) => {
                        e.target.style.borderColor = 'rgba(255,255,255,0.1)';
                        e.target.style.boxShadow = 'none';
                        e.target.style.background = 'rgba(255,255,255,0.08)';
                      }}
                    />
                    <button 
                      onClick={handleSaveKey} 
                      className="w-full text-white text-body font-bold py-3 rounded-xl transition-all duration-300 active:scale-95 relative overflow-hidden group"
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                        boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                      }}
                    >
                      <span className="relative z-10 flex items-center justify-center space-x-2">
                        <span>Save Key</span>
                        <svg 
                          className="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </span>
                    </button>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      🔒 Key is stored locally on your device. Get your key from{' '}
                      <a 
                        href={settings.aiProvider === 'gemini' 
                          ? 'https://aistudio.google.com/apikey' 
                          : 'https://platform.openai.com/api-keys'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: '#818cf8' }}
                      >
                        {settings.aiProvider === 'gemini' ? 'Google AI Studio' : 'OpenAI Platform'}
                      </a>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Integrations */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{
                  background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(16, 185, 129, 0.1))',
                }}
              >
                🔌
              </div>
              <h3 className="text-body font-bold text-gray-400 uppercase tracking-wider">Integrations</h3>
            </div>
            <div 
              className="rounded-2xl overflow-hidden"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <button 
                onClick={handleAppleHealth} 
                className="w-full p-4 flex items-center justify-between transition-all active:scale-[0.98]"
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${isNativeApp ? '' : 'opacity-50'}`}
                    style={{ 
                      background: isNativeApp 
                        ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.3), rgba(236, 72, 153, 0.2))' 
                        : 'rgba(255,255,255,0.05)' 
                    }}
                  >
                    ❤️
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-white block">Apple Health</span>
                    {!isNativeApp && <span className="text-[11px] text-gray-500">Native app required</span>}
                  </div>
                </div>
                <div 
                  className="w-12 h-7 rounded-full p-1 transition-all duration-300 relative"
                  style={{ 
                    background: settings.appleHealthConnected 
                      ? 'linear-gradient(135deg, #10b981, #14b8a6)' 
                      : 'rgba(255,255,255,0.1)',
                    boxShadow: settings.appleHealthConnected ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                  }}
                >
                  <div 
                    className="w-5 h-5 bg-white rounded-full shadow-lg transform transition-all duration-300 ease-spring"
                    style={{ 
                      transform: settings.appleHealthConnected ? 'translateX(20px)' : 'translateX(0)',
                      boxShadow: settings.appleHealthConnected ? '0 2px 8px rgba(0,0,0,0.2)' : '0 1px 3px rgba(0,0,0,0.1)',
                    }}
                  ></div>
                </div>
              </button>
              
              <button 
                onClick={handleExport} 
                className="w-full p-4 flex items-center justify-between text-white transition-all active:scale-[0.98] hover:bg-white/5"
              >
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(99, 102, 241, 0.1))' }}
                  >
                    📤
                  </div>
                  <div className="text-left">
                    <span className="font-medium text-white block">Export Data</span>
                    <span className="text-[11px] text-gray-500">Download as CSV file</span>
                  </div>
                </div>
                <i className="fa-solid fa-chevron-right text-gray-600"></i>
              </button>
            </div>
          </div>

          {/* About */}
          <div>
            <div className="flex items-center space-x-3 mb-4 px-1">
              <div 
                className="w-8 h-8 rounded-xl flex items-center justify-center text-base"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.3), rgba(99, 102, 241, 0.1))',
                }}
              >
                ℹ️
              </div>
              <h3 className="text-body font-bold text-gray-400 uppercase tracking-wider">About</h3>
            </div>
            <div 
              className="rounded-2xl p-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center space-x-4">
                <div 
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl"
                  style={{
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    boxShadow: '0 4px 20px rgba(99, 102, 241, 0.3)',
                  }}
                >
                  🍽️
                </div>
                <div>
                  <h4 className="font-bold text-white">NutriVision AI</h4>
                  <p className="text-sm text-gray-400">Version 1.0.0</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Powered by {settings.aiProvider === 'gemini' ? 'Google Gemini' : 'OpenAI GPT-5'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Storage info */}
          <div className="text-center text-xs text-gray-600 py-4">
            💾 Data stored locally on this device
          </div>
        </div>
      </div>

      {/* Toast notification with animation */}
      {showToast && (
        <div 
          className="fixed top-6 left-1/2 transform -translate-x-1/2 px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center space-x-2 animate-spring-up"
          style={{
            background: 'rgba(16, 185, 129, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.2)',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.4)',
          }}
        >
          <div className="relative">
            <svg 
              className="w-5 h-5 text-white animate-checkmark"
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="3" 
                d="M5 13l4 4L19 7"
                strokeDasharray="20"
                strokeDashoffset="20"
                style={{
                  animation: 'checkmark 0.6s ease-out forwards',
                }}
              />
            </svg>
          </div>
          <span className="text-body font-medium text-white">{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default Settings;
