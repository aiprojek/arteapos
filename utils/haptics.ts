
import { Haptics, ImpactStyle } from '@capacitor/haptics';

/**
 * Utility for Haptic Feedback (Vibration)
 */
export const haptics = {
  /**
   * Light impact (success, adding item)
   */
  light: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch (e) {
      // Ignore if not supported (browser)
    }
  },

  /**
   * Medium impact (scan, button press)
   */
  medium: async () => {
    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Success notification (transaction done)
   */
  success: async () => {
    try {
      await Haptics.notification({ type: 'SUCCESS' as any });
    } catch (e) {
      // Ignore
    }
  },

  /**
   * Error notification (scan failed, error alert)
   */
  error: async () => {
    try {
      await Haptics.notification({ type: 'ERROR' as any });
    } catch (e) {
      // Ignore
    }
  }
};
