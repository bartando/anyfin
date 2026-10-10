import {sized} from './jellyfin/api.js';
import {SIZES} from '../theme.js';

// Item art is a server URL without a size; each use asks for the width it is drawn at.
export const backdropUrl = (item, width = SIZES.hero) => sized(item?.backdrop, width);
export const thumbUrl = (item, width = SIZES.card) => sized(item?.thumb ?? item?.backdrop, width);
export const posterUrl = (item, width = SIZES.poster) => sized(item?.poster, width);
export const logoUrl = (item, width = SIZES.logo) => sized(item?.logo, width);
export const profileUrl = (person, width = SIZES.profile) => sized(person?.profile, width);
