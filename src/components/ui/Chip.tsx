import { StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native';
import { colors, radius } from '../../theme';

export type ChipProps = {
  label: string;
  backgroundColor?: string;
  textColor?: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

/** Small pill label (not react-native-paper `Chip`). */
export function Chip({
  label,
  backgroundColor = `${colors.textSecondary}22`,
  textColor = colors.textSecondary,
  style,
  textStyle,
}: ChipProps) {
  return (
    <View style={[styles.wrap, { backgroundColor }, style]}>
      <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.text, { color: textColor }, textStyle]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.capsule,
    maxWidth: '100%',
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default Chip;
