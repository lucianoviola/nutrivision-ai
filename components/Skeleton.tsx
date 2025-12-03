import React from 'react';

// Base skeleton component with shimmer animation
export const Skeleton: React.FC<{ className?: string; style?: React.CSSProperties }> = ({ 
  className = '', 
  style = {} 
}) => (
  <div 
    className={`animate-pulse rounded-lg ${className}`}
    style={{
      background: 'linear-gradient(90deg, rgba(139, 92, 246, 0.1) 0%, rgba(139, 92, 246, 0.2) 50%, rgba(139, 92, 246, 0.1) 100%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite',
      ...style,
    }}
  />
);

// Meal card skeleton
export const MealCardSkeleton: React.FC<{ index?: number }> = ({ index = 0 }) => (
  <div 
    className="rounded-2xl p-4 flex items-center space-x-4"
    style={{
      background: 'rgba(26, 22, 51, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
      animationDelay: `${index * 100}ms`,
    }}
  >
    {/* Image skeleton */}
    <Skeleton className="w-14 h-14 rounded-xl flex-shrink-0" />
    
    <div className="flex-1 space-y-2">
      {/* Title */}
      <Skeleton className="h-4 w-24 rounded" />
      {/* Subtitle */}
      <Skeleton className="h-3 w-40 rounded" />
      {/* Macros */}
      <div className="flex space-x-2 pt-1">
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
        <Skeleton className="h-5 w-12 rounded-md" />
      </div>
    </div>
    
    {/* Calories */}
    <div className="text-right">
      <Skeleton className="h-6 w-16 rounded" />
    </div>
  </div>
);

// Stat card skeleton
export const StatCardSkeleton: React.FC = () => (
  <div 
    className="rounded-2xl p-4 flex-1"
    style={{
      background: 'rgba(26, 22, 51, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
    }}
  >
    <Skeleton className="w-10 h-10 rounded-xl mb-3" />
    <Skeleton className="h-8 w-16 rounded mb-2" />
    <Skeleton className="h-3 w-20 rounded" />
  </div>
);

// Chart skeleton
export const ChartSkeleton: React.FC = () => (
  <div 
    className="rounded-2xl p-4"
    style={{
      background: 'rgba(26, 22, 51, 0.6)',
      border: '1px solid rgba(139, 92, 246, 0.15)',
    }}
  >
    {/* Chart header */}
    <div className="flex justify-between items-center mb-4">
      <Skeleton className="h-5 w-32 rounded" />
      <Skeleton className="h-4 w-20 rounded" />
    </div>
    
    {/* Chart bars */}
    <div className="flex items-end justify-between h-32 space-x-2">
      {[40, 65, 45, 80, 55, 70, 50].map((height, i) => (
        <Skeleton 
          key={i} 
          className="flex-1 rounded-t"
          style={{ height: `${height}%`, animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
    
    {/* X-axis labels */}
    <div className="flex justify-between mt-2">
      {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((_, i) => (
        <Skeleton key={i} className="h-3 w-6 rounded" />
      ))}
    </div>
  </div>
);

// Calorie ring skeleton
export const CalorieRingSkeleton: React.FC = () => (
  <div className="relative w-[180px] h-[180px] flex items-center justify-center">
    <div 
      className="absolute inset-0 rounded-full animate-pulse"
      style={{
        border: '12px solid rgba(139, 92, 246, 0.15)',
      }}
    />
    <div className="text-center">
      <Skeleton className="h-12 w-16 rounded mx-auto mb-2" />
      <Skeleton className="h-4 w-24 rounded mx-auto" />
    </div>
  </div>
);

// Macro pills skeleton
export const MacroPillsSkeleton: React.FC = () => (
  <div className="flex flex-wrap gap-3 justify-center">
    {[0, 1, 2].map((i) => (
      <div 
        key={i}
        className="flex flex-col items-center px-5 py-3 rounded-2xl"
        style={{
          background: 'rgba(26, 22, 51, 0.7)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          minWidth: '100px',
        }}
      >
        <Skeleton className="h-2 w-12 rounded mb-2" />
        <div className="flex items-center space-x-2">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-6 w-14 rounded" />
        </div>
      </div>
    ))}
  </div>
);

// Full dashboard skeleton
export const DashboardSkeleton: React.FC = () => (
  <div className="p-6 space-y-6">
    {/* Header */}
    <div className="flex justify-between items-start">
      <div>
        <Skeleton className="h-8 w-40 rounded mb-2" />
        <Skeleton className="h-4 w-28 rounded" />
      </div>
      <Skeleton className="h-10 w-16 rounded-full" />
    </div>
    
    {/* Calorie ring */}
    <div className="flex justify-center py-4">
      <CalorieRingSkeleton />
    </div>
    
    {/* Macro pills */}
    <MacroPillsSkeleton />
    
    {/* Today's meals header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-6 w-32 rounded" />
      <Skeleton className="h-5 w-16 rounded-full" />
    </div>
    
    {/* Meal cards */}
    <div className="space-y-3">
      <MealCardSkeleton index={0} />
      <MealCardSkeleton index={1} />
    </div>
  </div>
);

// Add shimmer keyframes to global styles
export const SkeletonStyles = `
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }
`;

export default Skeleton;

