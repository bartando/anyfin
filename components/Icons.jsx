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
    <Path d="M8.5 5H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8.5L2.5 12z" fill="none" stroke={color} strokeWidth="2"
      strokeLinejoin="round" />
    <Line x1="11" y1="9" x2="17" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
    <Line x1="17" y1="9" x2="11" y2="15" stroke={color} strokeWidth="2" strokeLinecap="round" />
  </Icon>
);

export const BackIcon = ({size = 18, color = '#ffffff'}) => (
  <Icon size={size}>
    <Path d="M14.5 5.5L8 12l6.5 6.5" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round"
      strokeLinejoin="round" />
  </Icon>
);
