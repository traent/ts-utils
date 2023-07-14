export type ColorVariant = 100 | 200 | 300 | 400 | 500 | 600;

export type ColorVariants = Record<ColorVariant, string>;

export type ColorName =
  'grey' |
  'red' |
  'orange' |
  'yellow' |
  'lime' |
  'green' |
  'blue' |
  'indigo' |
  'purple' |
  'violet' |
  'brown' |
  'ottanio';

export type Colors = Record<ColorName, ColorVariants>;

export const colors: Colors = {
  grey: { 100: '#F2F2F2', 200: '#E0E0E0', 300: '#BDBDBD', 400: '#828282', 500: '#4F4F4F', 600: '#333333' },
  orange: { 100: '#FFF1E0', 200: '#FFDCB2', 300: '#FFC580', 400: '#FFA44F', 500: '#FF8E26', 600: '#F17400' },
  red: { 100: '#FFEBEE', 200: '#FFCDD2', 300: '#FFA4A4', 400: '#F08888', 500: '#E57373', 600: '#DA5353' },
  purple: { 100: '#F3E5F5', 200: '#E1BEE7', 300: '#D184DE', 400: '#BA68C8', 500: '#AB47BC', 600: '#9327A6' },
  violet: { 100: '#E4E1FF', 200: '#C5BFF4', 300: '#A98CE8', 400: '#865FDA', 500: '#7037E9', 600: '#541BCF' },
  blue: { 100: '#EBF2FD', 200: '#C3DEFB', 300: '#A0CAF9', 400: '#78B5F6', 500: '#64A5F5', 600: '#3885E4' },
  yellow: { 100: '#FFFBE7', 200: '#FFF2C4', 300: '', 400: '', 500: '#FFCB13', 600: '#F6B100' },
  ottanio: { 100: '#E0F6F8', 200: '#B9EFF2', 300: '#8FDFEA', 400: '#5BCCDB', 500: '#29ACBE', 600: '#0095A9' },
  green: { 100: '#E8F5E9', 200: '#C8E6C9', 300: '#A5D6AA', 400: '#81C790', 500: '#66BB88', 600: '#41A368' },
  lime: { 100: '#EAF4C3', 200: '#D4EE9C', 300: '', 400: '', 500: '#9ACA33', 600: '#7BB108' },
  brown: { 100: '#FFE6CF', 200: '#ECC5A1', 300: '#CE8550', 400: '#C56E30', 500: '#A75418', 600: '#863B04' },
  indigo: { 100: '#E8EAF6', 200: '#C5CAE9', 300: '#9FA8DA', 400: '#7986CB', 500: '#5C6BC0', 600: '#3345AE' },
};

export interface LabelledColor {
  label: ColorName;
  variants: ColorVariants;
}

export const labelledColors: LabelledColor[] = Object.entries(colors).map((entry) => ({
  label: entry[0] as ColorName,
  variants: entry[1],
}));

export const getHexColorFromName = (name: ColorName, variant: ColorVariant): string => colors[name][variant];

export const isAValidColorName = (name: string): name is ColorName => name in colors;
