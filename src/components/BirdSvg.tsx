import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle, Ellipse, Polygon, Path, G, Line, Rect } from 'react-native-svg';
import { BirdTraits, BodyShape } from '../types';
import { getCosmeticById } from '../constants/cosmetics';

interface ShapeMetrics {
  bodyCx: number; bodyCy: number; bodyRx: number; bodyRy: number;
  headCx: number; headCy: number; headR: number;
  bellyCx: number; bellyCy: number; bellyRx: number; bellyRy: number;
  eyeY: number; eyeLX: number; eyeRX: number;
  beakY: number; beakTipY: number; beakHW: number;
  tailY: number;
  footY: number;
  crestBaseY: number;
}

function getMetrics(bodyShape: BodyShape): ShapeMetrics {
  switch (bodyShape) {
    case 'tall':
      return {
        bodyCx: 80, bodyCy: 120, bodyRx: 43, bodyRy: 58,
        headCx: 80, headCy: 58, headR: 31,
        bellyCx: 80, bellyCy: 128, bellyRx: 22, bellyRy: 42,
        eyeY: 53, eyeLX: 67, eyeRX: 93,
        beakY: 69, beakTipY: 85, beakHW: 8,
        tailY: 174, footY: 175, crestBaseY: 26,
      };
    case 'chubby':
      return {
        bodyCx: 80, bodyCy: 122, bodyRx: 58, bodyRy: 46,
        headCx: 80, headCy: 69, headR: 36,
        bellyCx: 80, bellyCy: 128, bellyRx: 34, bellyRy: 32,
        eyeY: 64, eyeLX: 63, eyeRX: 97,
        beakY: 82, beakTipY: 98, beakHW: 10,
        tailY: 164, footY: 165, crestBaseY: 32,
      };
    default: // round
      return {
        bodyCx: 80, bodyCy: 118, bodyRx: 50, bodyRy: 50,
        headCx: 80, headCy: 63, headR: 34,
        bellyCx: 80, bellyCy: 126, bellyRx: 28, bellyRy: 36,
        eyeY: 58, eyeLX: 65, eyeRX: 95,
        beakY: 76, beakTipY: 92, beakHW: 9,
        tailY: 165, footY: 164, crestBaseY: 28,
      };
  }
}

interface EyeProps {
  cx: number; cy: number; eyeStyle: BirdTraits['eyeStyle'];
  eyeColour: string; headColor: string;
}

function Eye({ cx, cy, eyeStyle, eyeColour, headColor }: EyeProps) {
  const outerR = eyeStyle === 'wide' ? 11 : 9;
  const irisR = eyeStyle === 'wide' ? 7.5 : 6;
  const pupilR = eyeStyle === 'wide' ? 5 : 3.5;
  return (
    <G>
      <Circle cx={cx} cy={cy} r={outerR} fill="white" />
      <Circle cx={cx} cy={cy} r={irisR} fill={eyeColour} />
      <Circle cx={cx} cy={cy} r={pupilR} fill="#1a1a1a" />
      <Circle cx={cx + 2.5} cy={cy - 2.5} r={1.8} fill="white" />
      {eyeStyle === 'sleepy' && (
        <Path
          d={`M ${cx - outerR},${cy} A ${outerR},${outerR} 0 0,1 ${cx + outerR},${cy} Z`}
          fill={headColor}
        />
      )}
    </G>
  );
}

interface CrestProps {
  m: ShapeMetrics; crestStyle: BirdTraits['crestStyle'];
  bodyColour: string; wingColour: string;
}

function Crest({ m, crestStyle, bodyColour, wingColour }: CrestProps) {
  const baseY = m.crestBaseY;
  const cx = m.headCx;
  if (crestStyle === 'none') return null;
  if (crestStyle === 'small') {
    return (
      <Ellipse
        cx={cx} cy={baseY} rx={5} ry={14}
        fill={wingColour} rotation={0} originX={cx} originY={baseY}
      />
    );
  }
  if (crestStyle === 'large') {
    return (
      <G>
        <Ellipse cx={cx - 14} cy={baseY + 6} rx={4} ry={12} fill={wingColour} rotation={-20} originX={cx - 14} originY={baseY + 6} />
        <Ellipse cx={cx} cy={baseY} rx={5} ry={14} fill={wingColour} />
        <Ellipse cx={cx + 14} cy={baseY + 6} rx={4} ry={12} fill={wingColour} rotation={20} originX={cx + 14} originY={baseY + 6} />
      </G>
    );
  }
  // curl
  return (
    <Path
      d={`M ${cx},${baseY + 5} C ${cx + 5},${baseY - 5} ${cx + 18},${baseY - 12} ${cx + 14},${baseY - 22} C ${cx + 10},${baseY - 32} ${cx - 2},${baseY - 28} ${cx},${baseY + 2}`}
      fill={wingColour}
    />
  );
}

interface TailProps {
  m: ShapeMetrics; tailStyle: BirdTraits['tailStyle'];
  wingColour: string;
}

function Tail({ m, tailStyle, wingColour }: TailProps) {
  const y = m.tailY;
  const cx = m.bodyCx;
  if (tailStyle === 'short') {
    return <Polygon points={`${cx - 12},${y} ${cx},${y + 16} ${cx + 12},${y}`} fill={wingColour} />;
  }
  if (tailStyle === 'long') {
    return <Polygon points={`${cx - 14},${y} ${cx},${y + 28} ${cx + 14},${y}`} fill={wingColour} />;
  }
  if (tailStyle === 'fan') {
    return (
      <G>
        <Polygon points={`${cx - 22},${y + 2} ${cx - 8},${y + 22} ${cx},${y}`} fill={wingColour} />
        <Polygon points={`${cx - 10},${y} ${cx},${y + 24} ${cx + 10},${y}`} fill={wingColour} />
        <Polygon points={`${cx},${y} ${cx + 8},${y + 22} ${cx + 22},${y + 2}`} fill={wingColour} />
      </G>
    );
  }
  // forked
  return (
    <Polygon
      points={`${cx - 14},${y} ${cx - 6},${y + 22} ${cx},${y + 8} ${cx + 6},${y + 22} ${cx + 14},${y}`}
      fill={wingColour}
    />
  );
}

interface Props {
  traits: BirdTraits;
  equippedHat?: string | null;
  equippedAccessory?: string | null;
  health?: number;
  size?: number;
}

export default function BirdSvg({ traits, equippedHat, equippedAccessory, health = 100, size = 160 }: Props) {
  const m = getMetrics(traits.bodyShape);
  const scale = size / 160;
  const height = size * 1.25;

  const hat = equippedHat ? getCosmeticById(equippedHat) : null;
  const accessory = equippedAccessory ? getCosmeticById(equippedAccessory) : null;

  const greyOpacity = health < 70 ? ((70 - health) / 100) * 0.55 : 0;

  const hatFontSize = size * 0.22;
  const accessoryFontSize = size * 0.17;
  const hatTop = (m.crestBaseY - 16) * scale - hatFontSize * 0.3;
  const accessoryTop = (m.headCy + m.headR + 2) * scale;

  return (
    <View style={{ width: size, height }}>
      <Svg width={size} height={height} viewBox="0 0 160 200">
        {/* Tail behind body */}
        <Tail m={m} tailStyle={traits.tailStyle} wingColour={traits.wingColour} />

        {/* Wings behind body */}
        <Ellipse
          cx={m.bodyCx - m.bodyRx + 5} cy={m.bodyCy - 5}
          rx={18} ry={32}
          fill={traits.wingColour}
          rotation={-22}
          originX={m.bodyCx - m.bodyRx + 5}
          originY={m.bodyCy - 5}
        />
        <Ellipse
          cx={m.bodyCx + m.bodyRx - 5} cy={m.bodyCy - 5}
          rx={18} ry={32}
          fill={traits.wingColour}
          rotation={22}
          originX={m.bodyCx + m.bodyRx - 5}
          originY={m.bodyCy - 5}
        />

        {/* Body */}
        <Ellipse
          cx={m.bodyCx} cy={m.bodyCy}
          rx={m.bodyRx} ry={m.bodyRy}
          fill={traits.bodyColour}
        />

        {/* Belly */}
        <Ellipse
          cx={m.bellyCx} cy={m.bellyCy}
          rx={m.bellyRx} ry={m.bellyRy}
          fill={traits.bellyColour}
        />

        {/* Head */}
        <Circle cx={m.headCx} cy={m.headCy} r={m.headR} fill={traits.bodyColour} />

        {/* Crest on top of head */}
        <Crest m={m} crestStyle={traits.crestStyle} bodyColour={traits.bodyColour} wingColour={traits.wingColour} />

        {/* Beak */}
        <Polygon
          points={`${m.headCx - m.beakHW},${m.beakY} ${m.headCx + m.beakHW},${m.beakY} ${m.headCx},${m.beakTipY}`}
          fill={traits.beakColour}
        />

        {/* Eyes */}
        <Eye cx={m.eyeLX} cy={m.eyeY} eyeStyle={traits.eyeStyle} eyeColour={traits.eyeColour} headColor={traits.bodyColour} />
        <Eye cx={m.eyeRX} cy={m.eyeY} eyeStyle={traits.eyeStyle} eyeColour={traits.eyeColour} headColor={traits.bodyColour} />

        {/* Feet */}
        <Line x1={m.bodyCx - 16} y1={m.footY} x2={m.bodyCx - 23} y2={m.footY + 14} stroke={traits.beakColour} strokeWidth={3} strokeLinecap="round" />
        <Line x1={m.bodyCx - 16} y1={m.footY} x2={m.bodyCx - 16} y2={m.footY + 16} stroke={traits.beakColour} strokeWidth={3} strokeLinecap="round" />
        <Line x1={m.bodyCx - 16} y1={m.footY} x2={m.bodyCx - 9} y2={m.footY + 14} stroke={traits.beakColour} strokeWidth={3} strokeLinecap="round" />
        <Line x1={m.bodyCx + 16} y1={m.footY} x2={m.bodyCx + 9} y2={m.footY + 14} stroke={traits.beakColour} strokeWidth={3} strokeLinecap="round" />
        <Line x1={m.bodyCx + 16} y1={m.footY} x2={m.bodyCx + 16} y2={m.footY + 16} stroke={traits.beakColour} strokeWidth={3} strokeLinecap="round" />
        <Line x1={m.bodyCx + 16} y1={m.footY} x2={m.bodyCx + 23} y2={m.footY + 14} stroke={traits.beakColour} strokeWidth={3} strokeLinecap="round" />

        {/* Health grey overlay */}
        {greyOpacity > 0 && (
          <Rect x={0} y={0} width={160} height={200} fill="#888" opacity={greyOpacity} />
        )}
      </Svg>

      {/* Emoji cosmetics as overlay */}
      {hat && (
        <Text style={[styles.cosmeticText, { fontSize: hatFontSize, top: hatTop, left: 0, right: 0 }]}>
          {hat.emoji}
        </Text>
      )}
      {accessory && (
        <Text style={[styles.cosmeticText, { fontSize: accessoryFontSize, top: accessoryTop, left: 0, right: 0 }]}>
          {accessory.emoji}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  cosmeticText: {
    position: 'absolute',
    textAlign: 'center',
  },
});
