import {Image} from '@react-on-anything/core';
import wordmark from '../assets/brand/wordmark.png';
import {px} from '../theme.js';

/** The outlined Outfit wordmark, baked from the editable brand SVG. */
export function Brand({width = 118}) {
  return <Image source={wordmark} resizeMode="contain" style={{width: px(width), height: px(width * 188 / 560)}} />;
}
