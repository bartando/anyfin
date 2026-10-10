import {imagePath} from './api.js';

const KINDS = {Movie: 'movie', Series: 'tv', Episode: 'episode', Season: 'season', BoxSet: 'collection', Person: 'person'};
const TICKS_PER_MINUTE = 600000000;

// What list requests ask for beyond the defaults: enough for a card and the header above a grid.
export const LIST_FIELDS = 'Overview,Genres,OfficialRating,SortName,ChildCount,PrimaryImageAspectRatio';

/** Art for a card or a backdrop, falling back to the series' for episodes and seasons. */
function art(server, dto) {
  const tags = dto.ImageTags ?? {};
  const backdrop = dto.BackdropImageTags?.length ? imagePath(server, dto.Id, 'Backdrop', dto.BackdropImageTags[0], 0)
    : dto.ParentBackdropImageTags?.length ? imagePath(server, dto.ParentBackdropItemId, 'Backdrop', dto.ParentBackdropImageTags[0], 0)
      : imagePath(server, dto.Id, 'Thumb', tags.Thumb);
  const logo = tags.Logo ? imagePath(server, dto.Id, 'Logo', tags.Logo)
    : imagePath(server, dto.ParentLogoItemId, 'Logo', dto.ParentLogoImageTag);
  const primary = imagePath(server, dto.Id, 'Primary', tags.Primary);
  if (dto.Type === 'Episode') {
    // An episode's primary image is a still from it, a 16:9 thumb; its poster is the series'.
    return {backdrop, logo, thumb: primary ?? backdrop,
      poster: imagePath(server, dto.SeriesId, 'Primary', dto.SeriesPrimaryImageTag)};
  }
  const thumb = tags.Thumb ? imagePath(server, dto.Id, 'Thumb', tags.Thumb) : backdrop;
  return {backdrop, logo, thumb, poster: primary};
}

function person(server, dto) {
  return {id: dto.Id, name: dto.Name ?? '', character: dto.Role || '',
    profile: imagePath(server, dto.Id, 'Primary', dto.PrimaryImageTag)};
}

/** A Jellyfin BaseItemDto in the shape the pages draw. */
export function toItem(server, dto) {
  const kind = KINDS[dto.Type] ?? 'other';
  const user = dto.UserData ?? {};
  const people = dto.People ?? [];
  return {
    key: dto.Id, id: dto.Id, kind, type: dto.Type,
    title: dto.Name ?? '',
    sortName: dto.SortName ?? dto.Name ?? '',
    year: dto.ProductionYear ?? null,
    rating: dto.CommunityRating ? Math.round(dto.CommunityRating * 10) / 10 : 0,
    genres: dto.Genres ?? [],
    certification: dto.OfficialRating ?? null,
    runtime: dto.RunTimeTicks ? Math.round(dto.RunTimeTicks / TICKS_PER_MINUTE) : null,
    seasons: kind === 'tv' && dto.ChildCount ? dto.ChildCount : null,
    childCount: dto.ChildCount ?? null,
    tagline: dto.Taglines?.[0] ?? null,
    overview: dto.Overview ?? '',
    ...art(server, dto),
    seriesId: dto.SeriesId ?? null, seriesTitle: dto.SeriesName ?? null, seasonId: dto.SeasonId ?? null,
    season: dto.ParentIndexNumber ?? null, episode: dto.IndexNumber ?? null, index: dto.IndexNumber ?? null,
    cast: people.filter(p => p.Type === 'Actor' || p.Type === 'GuestStar').map(p => person(server, p)),
    crew: people.filter(p => p.Type === 'Director' || p.Type === 'Writer').map(p => ({...person(server, p), character: p.Type})),
    favorite: !!user.IsFavorite,
    played: !!user.Played,
    progress: user.PlayedPercentage ? user.PlayedPercentage / 100 : 0,
    positionMinutes: user.PlaybackPositionTicks ? Math.round(user.PlaybackPositionTicks / TICKS_PER_MINUTE) : 0,
    positionSeconds: user.PlaybackPositionTicks ? user.PlaybackPositionTicks / 10000000 : 0,
    status: dto.Status ?? null,
    endYear: dto.EndDate ? Number(dto.EndDate.slice(0, 4)) : null,
    premiere: dto.PremiereDate ?? null,
    places: dto.ProductionLocations ?? [],
  };
}

/** "S2:E5", or "Special" for season 0. */
export function episodeCode(item) {
  if (item.season === 0) return 'Special';
  if (item.season == null || item.episode == null) return '';
  return `S${item.season}:E${item.episode}`;
}

/** The line under a card: an episode's code and name, otherwise the year. */
export function caption(item) {
  if (item.kind === 'episode') return [episodeCode(item), item.title].filter(Boolean).join(' · ');
  if (item.kind === 'collection') return item.childCount ? `${item.childCount} titles` : '';
  return item.year ? String(item.year) : '';
}

/** The name a card leads with: the series for an episode. */
export const cardTitle = item => (item.kind === 'episode' ? item.seriesTitle ?? item.title : item.title);
