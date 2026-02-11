import { ViewStyle, TextStyle } from 'react-native';
import Colors from './colors';

export const Buttons = {
  primary: {
    container: {
      borderRadius: 18,
      overflow: 'hidden' as const,
    } as ViewStyle,
    gradient: [Colors.gold, Colors.gold] as [string, string],
    inner: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 10,
      paddingVertical: 16,
      borderRadius: 18,
      backgroundColor: Colors.gold,
    } as ViewStyle,
    text: {
      fontSize: 16,
      fontFamily: 'DMSans_600SemiBold',
      color: Colors.black,
    } as TextStyle,
  },

  secondary: {
    container: {
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      gap: 8,
      paddingVertical: 14,
      borderRadius: 18,
      backgroundColor: 'transparent',
      borderWidth: 1,
      borderColor: Colors.gold,
    } as ViewStyle,
    text: {
      fontSize: 15,
      fontFamily: 'DMSans_600SemiBold',
      color: Colors.gold,
    } as TextStyle,
  },

  icon: {
    container: {
      width: 40,
      height: 40,
      borderRadius: 14,
      backgroundColor: Colors.surface,
      borderWidth: 1,
      borderColor: Colors.surfaceBorder,
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
      color: Colors.gold,
      fontFamily: 'DMSans_600SemiBold',
    } as TextStyle,
  },

  danger: {
    container: {
      paddingVertical: 14,
      borderRadius: 18,
      backgroundColor: Colors.velvet,
      alignItems: 'center' as const,
    } as ViewStyle,
    text: {
      fontSize: 15,
      fontFamily: 'DMSans_600SemiBold',
      color: Colors.cream,
    } as TextStyle,
  },
};
