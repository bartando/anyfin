import {Text, View} from '@ps5-react/core';
import {buttonName, nintendo} from '../lib/buttons.js';
import {px} from '../theme.js';
import {CircleGlyph, CloseIcon, SquareGlyph, TouchpadGlyph, TriangleGlyph} from './Icons.jsx';

const SHAPES = {cross: CloseIcon, triangle: TriangleGlyph, square: SquareGlyph, circle: CircleGlyph, touchpad: TouchpadGlyph};

/**
 * A face button in a hint: its shape on a DualSense, its letter in a ring on the Switch (lib/buttons.js);
 * nothing where the device has no such button.
 */
export function FaceGlyph({button, size = 12, color = '#ffffff'}) {
  if (!nintendo) {
    const Shape = buttonName(button) && SHAPES[button];
    return Shape ? <Shape size={size} color={color} /> : null;
  }
  const letter = buttonName(button);
  if (!letter) return null;
  return (
    <View className="items-center justify-center"
      style={{width: px(size + 4), height: px(size + 4), borderRadius: px(size), borderWidth: px(1.5), borderColor: color}}>
      <Text className="font-semi text-[10px] leading-[12px]" style={{color}}>{letter}</Text>
    </View>
  );
}
