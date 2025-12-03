/**
 * Haptic feedback utilities for mobile devices
 */

type HapticType = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

/**
 * Trigger haptic feedback if available
 */
export function haptic(type: HapticType = 'light'): void {
  // Check if vibration API is available
  if (!navigator.vibrate) return;
  
  // Different vibration patterns for different feedback types
  const patterns: Record<HapticType, number | number[]> = {
    light: 10,
    medium: 20,
    heavy: 30,
    success: [10, 50, 20],      // Short-pause-longer
    warning: [20, 30, 20],       // Medium-pause-medium
    error: [30, 50, 30, 50, 30], // Triple buzz
    selection: 5,                // Very light tap
  };
  
  const pattern = patterns[type];
  
  try {
    navigator.vibrate(pattern);
  } catch (e) {
    // Silently fail - haptics are optional
  }
}

/**
 * Button press feedback
 */
export function hapticTap(): void {
  haptic('light');
}

/**
 * Success action feedback (save, complete, etc.)
 */
export function hapticSuccess(): void {
  haptic('success');
}

/**
 * Error/failure feedback
 */
export function hapticError(): void {
  haptic('error');
}

/**
 * Warning feedback
 */
export function hapticWarning(): void {
  haptic('warning');
}

/**
 * Selection change feedback (toggle, switch)
 */
export function hapticSelection(): void {
  haptic('selection');
}

/**
 * Heavy impact feedback (delete, important action)
 */
export function hapticImpact(): void {
  haptic('heavy');
}

