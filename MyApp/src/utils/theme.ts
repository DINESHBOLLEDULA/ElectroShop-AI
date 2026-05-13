// ElectroShop Theme Constants — Dark & Light

export interface ThemeColors {
  bg: string;
  bgSecondary: string;
  card: string;
  cardLight: string;
  input: string;

  primary: string;
  primaryLight: string;
  primaryDark: string;
  primaryGlow: string;

  accent: string;
  accentGlow: string;
  accentPink: string;

  success: string;
  successBg: string;
  warning: string;
  warningBg: string;
  error: string;
  errorBg: string;

  text: string;
  textSecondary: string;
  textMuted: string;

  border: string;
  borderLight: string;

  star: string;
  starBg: string;

  overlay: string;
  tabBar: string;
  tabBarBorder: string;
}

export const DARK_COLORS: ThemeColors = {
  bg: '#0D0D1F',
  bgSecondary: '#141430',
  card: '#1C1C48',
  cardLight: '#242460',
  input: '#171740',

  primary: '#8B6FFF',
  primaryLight: '#A694FF',
  primaryDark: '#6B4FDF',
  primaryGlow: 'rgba(139, 111, 255, 0.14)',

  accent: '#00D4F0',
  accentGlow: 'rgba(0, 212, 240, 0.12)',
  accentPink: '#FF6B9D',

  success: '#2EE89A',
  successBg: 'rgba(46, 232, 154, 0.12)',
  warning: '#FFB74D',
  warningBg: 'rgba(255, 183, 77, 0.12)',
  error: '#FF5C6C',
  errorBg: 'rgba(255, 92, 108, 0.12)',

  text: '#F0F0FF',
  textSecondary: '#B0B0D0',
  textMuted: '#707090',

  border: '#2A2A58',
  borderLight: '#353570',

  star: '#FFD740',
  starBg: 'rgba(255, 215, 64, 0.14)',

  overlay: 'rgba(0,0,0,0.55)',
  tabBar: '#0F0F28',
  tabBarBorder: '#1E1E48',
};

export const LIGHT_COLORS: ThemeColors = {
  bg: '#F5F5FA',
  bgSecondary: '#FFFFFF',
  card: '#FFFFFF',
  cardLight: '#F0EEFF',
  input: '#EDE9FE',

  primary: '#6C4FE0',
  primaryLight: '#8B72FF',
  primaryDark: '#5338C0',
  primaryGlow: 'rgba(108, 79, 224, 0.10)',

  accent: '#0097A7',
  accentGlow: 'rgba(0, 151, 167, 0.08)',
  accentPink: '#E9446A',

  success: '#00C853',
  successBg: 'rgba(0, 200, 83, 0.10)',
  warning: '#FF9100',
  warningBg: 'rgba(255, 145, 0, 0.10)',
  error: '#E53935',
  errorBg: 'rgba(229, 57, 53, 0.08)',

  text: '#1A1A2E',
  textSecondary: '#6B6B8D',
  textMuted: '#9E9EBC',

  border: '#E0E0F0',
  borderLight: '#EAEAFF',

  star: '#F9A825',
  starBg: 'rgba(249, 168, 37, 0.12)',

  overlay: 'rgba(0,0,0,0.3)',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E8E8F0',
};

// Default export for backward compatibility (will be overridden by context)
export const COLORS = DARK_COLORS;
