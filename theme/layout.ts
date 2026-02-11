import { ViewStyle } from 'react-native';
import Colors from './colors';

export const Layout = {
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  } as ViewStyle,

  cardSmall: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  } as ViewStyle,

  screenPadding: {
    paddingHorizontal: 20,
  } as ViewStyle,

  sectionPadding: {
    paddingHorizontal: 16,
  } as ViewStyle,

  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  } as ViewStyle,

  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  } as ViewStyle,

  modal: {
    overlay: {
      flex: 1,
      backgroundColor: Colors.overlay,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      padding: 30,
    } as ViewStyle,
    card: {
      width: '100%' as const,
      backgroundColor: Colors.surface,
      borderRadius: 20,
      padding: 24,
      alignItems: 'center' as const,
      borderWidth: 1,
      borderColor: Colors.surfaceBorder,
    } as ViewStyle,
  },

  inputWrap: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: Colors.inputBg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
  } as ViewStyle,
};
