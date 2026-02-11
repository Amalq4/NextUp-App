import { ViewStyle, TextStyle } from 'react-native';
import Colors from './colors';

export const Buttons = {
  primary: {
    container: {
      borderRadius: 20,
      overflow: 'hidden' as const,
    } as ViewStyle,
    gradient: ['#6F4D38', '#632024'] as [string, string],
    inner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 10,
      paddingVertical: 16,
      borderRadius: 20,
    } as ViewStyle,
    text: {
      fontSize: 16,
      fontFamily: 'DMSans_600SemiBold',
      color: '#FFFFFF',
    } as TextStyle,
  },

  secondary: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingVertical: 14,
      borderRadius: 20,
      backgroundColor: 'rgba(97,120,145,0.2)',
      borderWidth: 1,
      borderColor: 'rgba(213,184,147,0.25)',
    } as ViewStyle,
    text: {
      fontSize: 15,
      fontFamily: 'DMSans_600SemiBold',
      color: Colors.textSecondary,
    } as TextStyle,
  },

  icon: {
    container: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: Colors.glass,
      borderWidth: 1,
      borderColor: Colors.glassBorder,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
    } as ViewStyle,
  },

  chip: {
    container: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.surfaceBorder,
    } as ViewStyle,
    containerActive: {
      backgroundColor: Colors.accentSoft,
      borderColor: Colors.accentBorder,
    } as ViewStyle,
    text: {
      fontSize: 13,
      fontFamily: 'DMSans_500Medium',
      color: Colors.textMuted,
    } as TextStyle,
    textActive: {
      color: Colors.text,
      fontFamily: 'DMSans_600SemiBold',
    } as TextStyle,
  },

  danger: {
    container: {
      paddingVertical: 14,
      borderRadius: 20,
      backgroundColor: Colors.dangerBg,
      borderWidth: 1,
      borderColor: Colors.dangerBorder,
      alignItems: 'center' as const,
    } as ViewStyle,
    text: {
      fontSize: 15,
      fontFamily: 'DMSans_600SemiBold',
      color: '#FF6B6B',
    } as TextStyle,
  },
};
