import Colors from './colors';

export const Gradients = {
  beigePink: [Colors.beige, Colors.pink] as const,
  emeraldIndigo: [Colors.emerald, Colors.indigo] as const,
  copperBrick: [Colors.copper, Colors.brick] as const,
  softGreenBeige: [Colors.softGreen, Colors.beige] as const,

  warmButton: [Colors.copper, Colors.brick] as const,
  primaryButton: [Colors.emerald, '#2D6054'] as const,
  deepButton: [Colors.indigo, '#3A1D34'] as const,

  headerLight: [Colors.beige, Colors.pink] as const,
  headerDark: [Colors.emerald, Colors.indigo] as const,

  onboarding: ['#F3E8DE', '#EFCABB', '#F9F3EE'] as const,
  auth: ['#254C42', '#4C2744'] as const,

  cardWarm: ['rgba(239, 202, 187, 0.3)', 'rgba(243, 232, 222, 0.5)'] as const,
  cardCool: ['rgba(129, 142, 110, 0.15)', 'rgba(243, 232, 222, 0.3)'] as const,
  cardDeep: ['rgba(37, 76, 66, 0.08)', 'rgba(76, 39, 68, 0.06)'] as const,
};
