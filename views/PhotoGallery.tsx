import React, { useState, useMemo } from 'react';
import { MealLog } from '../types.ts';

interface PhotoGalleryProps {
  logs: MealLog[];
  onClose: () => void;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ logs, onClose }) => {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  
  // Filter logs that have photos
  const photosWithLogs = useMemo(() => {
    return logs
      .filter(log => log.imageUrl)
      .map(log => ({
        imageUrl: log.imageUrl!,
        log,
        date: new Date(log.timestamp),
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [logs]);

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
    }
  };

  const getMealEmoji = (type: string) => {
    switch (type) {
      case 'breakfast': return '🌅';
      case 'lunch': return '🌞';
      case 'dinner': return '🌙';
      case 'snack': return '🍪';
      default: return '🍽️';
    }
  };

  if (photosWithLogs.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
        {/* Header */}
        <div className="pt-14 px-6 pb-4 flex items-center justify-between border-b border-white/10">
          <h1 className="text-title-1-lg font-bold text-white">Photo Gallery</h1>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <i className="fa-solid fa-times text-white"></i>
          </button>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex items-center justify-center px-6">
          <div className="text-center">
            <div 
              className="w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 text-5xl animate-spring-up"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              📷
            </div>
            <h2 className="text-title-2 font-bold text-white mb-2">No photos yet</h2>
            <p className="text-body text-gray-400">Start logging meals with photos to see them here!</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0a0f] flex flex-col">
      {/* Header */}
      <div className="pt-14 px-6 pb-4 flex items-center justify-between border-b border-white/10">
        <div>
          <h1 className="text-title-1-lg font-bold text-white">Photo Gallery</h1>
          <p className="text-caption text-gray-400 mt-0.5">{photosWithLogs.length} {photosWithLogs.length === 1 ? 'photo' : 'photos'}</p>
        </div>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <i className="fa-solid fa-times text-white"></i>
        </button>
      </div>

      {/* Photo Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-3 gap-2">
          {photosWithLogs.map((item, index) => (
            <button
              key={item.log.id}
              onClick={() => setSelectedPhoto(item.imageUrl)}
              className="relative aspect-square rounded-xl overflow-hidden group transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                animationDelay: `${index * 30}ms`,
              }}
            >
              <img 
                src={item.imageUrl} 
                alt="Meal" 
                className="w-full h-full object-cover"
              />
              
              {/* Overlay on hover */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-2">
                <div className="w-full">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-white">{getMealEmoji(item.log.type)}</span>
                    <span className="text-xs font-bold text-white">{Math.round(item.log.totalMacros.calories)} kcal</span>
                  </div>
                  <p className="text-[10px] text-gray-300 truncate">{formatDate(item.date)}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Full Screen Photo Modal */}
      {selectedPhoto && (
        <div 
          className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="relative max-w-4xl w-full">
            <img 
              src={selectedPhoto} 
              alt="Meal" 
              className="w-full h-auto rounded-2xl shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
            
            {/* Close button */}
            <button
              onClick={() => setSelectedPhoto(null)}
              className="absolute top-4 right-4 w-12 h-12 rounded-xl flex items-center justify-center transition-all active:scale-95"
              style={{
                background: 'rgba(255,255,255,0.15)',
                backdropFilter: 'blur(10px)',
              }}
            >
              <i className="fa-solid fa-times text-white text-lg"></i>
            </button>

            {/* Photo info */}
            {photosWithLogs.find(p => p.imageUrl === selectedPhoto) && (() => {
              const photoData = photosWithLogs.find(p => p.imageUrl === selectedPhoto)!;
              return (
                <div 
                  className="absolute bottom-4 left-4 right-4 p-4 rounded-xl"
                  style={{
                    background: 'rgba(0,0,0,0.7)',
                    backdropFilter: 'blur(20px)',
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-xl">{getMealEmoji(photoData.log.type)}</span>
                      <span className="text-white font-bold capitalize">{photoData.log.type}</span>
                    </div>
                    <span className="text-white font-bold">{Math.round(photoData.log.totalMacros.calories)} kcal</span>
                  </div>
                  <p className="text-sm text-gray-300 mb-2">{formatDate(photoData.date)}</p>
                  <div className="flex space-x-2">
                    <span className="text-xs px-2 py-1 rounded font-bold text-emerald-400" style={{ background: 'rgba(52, 211, 153, 0.2)' }}>
                      P {Math.round(photoData.log.totalMacros.protein)}g
                    </span>
                    <span className="text-xs px-2 py-1 rounded font-bold text-cyan-400" style={{ background: 'rgba(34, 211, 238, 0.2)' }}>
                      C {Math.round(photoData.log.totalMacros.carbs)}g
                    </span>
                    <span className="text-xs px-2 py-1 rounded font-bold text-orange-400" style={{ background: 'rgba(251, 146, 60, 0.2)' }}>
                      F {Math.round(photoData.log.totalMacros.fat)}g
                    </span>
                  </div>
                  {photoData.log.note && (
                    <div className="mt-2 pt-2 border-t border-white/10">
                      <p className="text-sm text-gray-300 italic">
                        <i className="fa-solid fa-note-sticky mr-2 text-purple-400"></i>
                        {photoData.log.note}
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhotoGallery;

