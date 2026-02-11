import { TextStyle } from 'react-native';
import Colors from './colors';

export const Typography = {
  largeTitle: {
    fontSize: 28,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
  } as TextStyle,

  sectionTitle: {
    fontSize: 18,
    fontFamily: 'DMSans_700Bold',
    color: Colors.text,
    letterSpacing: 0.2,
  } as TextStyle,

  cardTitle: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  } as TextStyle,

  bodyText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: Colors.text,
    lineHeight: 22,
  } as TextStyle,

  secondaryText: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textSecondary,
  } as TextStyle,

  mutedText: {
    fontSize: 12,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  } as TextStyle,

  sectionHeader: {
    fontSize: 11,
    fontFamily: 'DMSans_700Bold',
    color: Colors.textMuted,
    letterSpacing: 1.5,
  } as TextStyle,

  buttonText: {
    fontSize: 16,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.white,
  } as TextStyle,

  chipText: {
    fontSize: 13,
    fontFamily: 'DMSans_500Medium',
    color: Colors.textMuted,
  } as TextStyle,

  chipTextActive: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.white,
  } as TextStyle,

  caption: {
    fontSize: 11,
    fontFamily: 'DMSans_400Regular',
    color: Colors.textMuted,
  } as TextStyle,

  headerTitle: {
    fontSize: 17,
    fontFamily: 'DMSans_600SemiBold',
    color: Colors.text,
  } as TextStyle,
};
