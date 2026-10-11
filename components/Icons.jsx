import {Svg, Path, Circle, Line} from '@ps5-react/core';
import {px} from '../theme.js';

// Svg width/height are render px; `size` is logical like the rest of the layout.
function Icon({size, children, ...paint}) {
  return <Svg width={px(size)} height={px(size)} viewBox="0 0 24 24" {...paint}>{children}</Svg>;
}

export const PlayIcon = ({size = 18, color = '#0b0b12'}) => (
  <Icon size={size}><Path d="M7 4.5v15l12.5-7.5z" fill={color} /></Icon>
);

export const InfoIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Circle cx="12" cy="12" r="9.5" fill="none" stroke={color} strokeWidth="2" />
    <Line x1="12" y1="11" x2="12" y2="17" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Circle cx="12" cy="7.5" r="1.4" fill={color} />
  </Icon>
);

export const StarIcon = ({size = 14, color = '#f5c518'}) => (
  <Icon size={size}>
    <Path d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z" fill={color} />
  </Icon>
);

export const SearchIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke={color} strokeWidth="2.2" />
    <Line x1="15.5" y1="15.5" x2="20.5" y2="20.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </Icon>
);

export const BackspaceIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M9 5h10.5A1.5 1.5 0 0 1 21 6.5v11a1.5 1.5 0 0 1-1.5 1.5H9l-6.5-7z" fill="none" stroke={color}
      strokeWidth="2" strokeLinejoin="round" />
    <Line x1="11.5" y1="9.5" x2="16.5" y2="14.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Line x1="16.5" y1="9.5" x2="11.5" y2="14.5" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
  </Icon>
);

const HEART = 'M12 20.3s-7.6-4.7-7.6-10.2A4.3 4.3 0 0 1 12 7.4a4.3 4.3 0 0 1 7.6 2.7c0 5.5-7.6 10.2-7.6 10.2z';

export const HeartIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}><Path d={HEART} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" /></Icon>
);

export const HeartFilledIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}><Path d={HEART} fill={color} stroke={color} strokeWidth="2" strokeLinejoin="round" /></Icon>
);

// Controller face-button glyphs for shortcut hints.
export const TriangleGlyph = ({size = 12, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M12 4l9 15.5H3z" fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
  </Icon>
);

export const SquareGlyph = ({size = 12, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M5 5h14v14H5z" fill="none" stroke={color} strokeWidth="2.4" strokeLinejoin="round" />
  </Icon>
);

export const BackIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"
      strokeLinejoin="round" />
  </Icon>
);

export const CheckIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round"
      strokeLinejoin="round" />
  </Icon>
);

export const ServerIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M4 5.5A1.5 1.5 0 0 1 5.5 4h13A1.5 1.5 0 0 1 20 5.5v4A1.5 1.5 0 0 1 18.5 11h-13A1.5 1.5 0 0 1 4 9.5zM4 14.5A1.5 1.5 0 0 1 5.5 13h13a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18.5z"
      fill="none" stroke={color} strokeWidth="2" />
    <Circle cx="8" cy="7.5" r="1.3" fill={color} />
    <Circle cx="8" cy="16.5" r="1.3" fill={color} />
  </Icon>
);

export const LockIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Path d="M5.5 10.5h13v9.5h-13z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
  </Icon>
);

export const PauseIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M6.5 4.5h3.5v15H6.5zM14 4.5h3.5v15H14z" fill={color} />
  </Icon>
);

export const SubtitlesIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M3.5 5.5h17v11h-10l-4.5 3.5v-3.5h-2.5z" fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
    <Line x1="7.5" y1="11" x2="11" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="13.5" y1="11" x2="16.5" y2="11" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Icon>
);

export const NextEpisodeIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M5 4.5v15l11-7.5z" fill={color} />
    <Path d="M17 4.5h2.5v15H17z" fill={color} />
  </Icon>
);

// Eight teeth around the hub: each a step out to the tooth radius and back.
const GEAR = (() => {
  const points = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (const [da, r] of [[-0.24, 7], [-0.15, 9.6], [0.15, 9.6], [0.24, 7]])
      points.push(`${(12 + r * Math.cos(a + da)).toFixed(2)} ${(12 + r * Math.sin(a + da)).toFixed(2)}`);
  }
  return `M${points.join('L')}Z`;
})();

export const GearIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d={GEAR} fill="none" stroke={color} strokeWidth="1.9" strokeLinejoin="round" />
    <Circle cx="12" cy="12" r="3" fill="none" stroke={color} strokeWidth="1.9" />
  </Icon>
);

export const RestartIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M5.5 12a6.5 6.5 0 1 0 2-4.7" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" />
    <Path d="M4.5 4.5v4h4" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </Icon>
);

export const CloseIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Line x1="6.5" y1="6.5" x2="17.5" y2="17.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
    <Line x1="17.5" y1="6.5" x2="6.5" y2="17.5" stroke={color} strokeWidth="2.4" strokeLinecap="round" />
  </Icon>
);
