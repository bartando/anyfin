import {getSession} from './session.js';
import {api, invalidate} from './api.js';
import {LIST_FIELDS, toItem} from './items.js';

const ROW_MAX = 16;
const HERO_MAX = 8;
const SIMILAR_MAX = 16;
const CREDITS_MAX = 36;
const COSTAR_TITLES = 8;
const COSTARS_MAX = 12;
const SEARCH_MAX = 60;
const PICKS_MAX = 30;
const PICKS_RATING = 6.5;

const server = () => getSession().server;
const userId = () => getSession().userId;
const items = list => (list ?? []).map(dto => toItem(server(), dto));

// Query params for each library tab, sorted the way the A–Z bar indexes them.
const ALPHABETICAL = {Recursive: true, SortBy: 'SortName', SortOrder: 'Ascending', Fields: LIST_FIELDS};
export const LIBRARIES = {
  movies: {...ALPHABETICAL, IncludeItemTypes: 'Movie'},
  shows: {...ALPHABETICAL, IncludeItemTypes: 'Series'},
  collections: {...ALPHABETICAL, IncludeItemTypes: 'BoxSet'},
  favorites: {...ALPHABETICAL, IncludeItemTypes: 'Movie,Series,BoxSet', Filters: 'IsFavorite'},
};

/** One page of a library query: {total, items}. Pages are not cached; the grid keeps them. */
export async function loadPage(params, start, limit) {
  const reply = await api('Items', {...params, userId: userId(), StartIndex: start, Limit: limit}, {fresh: true});
  return {total: reply.TotalRecordCount ?? 0, items: items(reply.Items)};
}

/**
 * Where each letter starts in an alphabetical query: how many titles sort before it. Jellyfin sort
 * names are lower case, so the bounds are too. `#` (digits and symbols) starts at 0.
 */
export async function loadLetterOffsets(params, letters) {
  const counts = await Promise.all(letters.map(letter => (letter === '#' ? Promise.resolve(0)
    : api('Items', {...params, userId: userId(), NameLessThan: letter.toLowerCase(), Limit: 0, Fields: null},
      {fresh: true, background: true}).then(reply => reply.TotalRecordCount ?? 0))));
  return new Map(letters.map((letter, index) => [letter, counts[index]]));
}

const hasArt = item => item.backdrop;
const HOME_FIELDS = {Fields: LIST_FIELDS, EnableImageTypes: 'Primary,Backdrop,Thumb,Logo'};

/** Home: the hero's titles and the rows under it, Jellyfin's own home sections. */
/**
 * Home: the hero's titles, Continue Watching and Next Up (`watching`) and the rows of what was added
 * lately. Rows with nothing in them are left out.
 */
export async function loadHome() {
  const user = userId();
  const [views, watching] = await Promise.all([api('UserViews', {userId: user}), loadWatchingRows()]);
  const libraries = (views.Items ?? []).filter(view => view.CollectionType === 'movies' || view.CollectionType === 'tvshows');
  const latest = await Promise.all(libraries.map(view =>
    api('Items/Latest', {userId: user, ParentId: view.Id, Limit: ROW_MAX, ...HOME_FIELDS}, {fresh: true})));
  const rows = libraries.map((view, index) => ({id: `latest-${view.Id}`, title: `Recently Added in ${view.Name}`,
    items: items(latest[index])})).filter(row => row.items.length);
  const latestMovies = libraries.flatMap((view, index) => (view.CollectionType === 'movies' ? items(latest[index]) : []));
  const pool = [...latestMovies, ...[...watching, ...rows].flatMap(row => row.items)]
    .filter(item => hasArt(item) && item.kind !== 'episode');
  const seen = new Set();
  const hero = pool.filter(item => !seen.has(item.key) && seen.add(item.key)).slice(0, HERO_MAX);
  return {hero, watching, rows};
}

/** Continue Watching and Next Up, apart from loadHome so a playback stopped reloads only them. */
export async function loadWatchingRows() {
  const user = userId();
  const [resume, nextUp] = await Promise.all([
    api('UserItems/Resume', {userId: user, Limit: ROW_MAX, MediaTypes: 'Video', ...HOME_FIELDS}, {fresh: true}),
    api('Shows/NextUp', {userId: user, Limit: ROW_MAX, ...HOME_FIELDS}, {fresh: true}),
  ]);
  return [
    {id: 'resume', title: 'Continue Watching', items: items(resume.Items)},
    {id: 'next-up', title: 'Next Up', items: items(nextUp.Items)},
  ].filter(row => row.items.length);
}

const FAVORITE_ROWS = [
  {id: 'favorite-movies', title: 'Favorite Movies', type: 'Movie'},
  {id: 'favorite-shows', title: 'Favorite TV Shows', type: 'Series'},
];

/** Home's rows of favorite movies and shows, apart from loadHome so a favorite toggled reloads only them. */
export async function loadFavoriteRows() {
  const replies = await Promise.all(FAVORITE_ROWS.map(row => api('Items', {userId: userId(), Recursive: true,
    IncludeItemTypes: row.type, Filters: 'IsFavorite', SortBy: 'SortName', Limit: ROW_MAX, ...HOME_FIELDS}, {fresh: true})));
  return FAVORITE_ROWS.map(({type, ...row}, index) => ({...row, items: items(replies[index].Items)}));
}

/** A title with everything its detail page shows: overview, cast and crew, user data. */
export async function loadItem(id) {
  return toItem(server(), await api(`Items/${id}`, {userId: userId()}, {fresh: true}));
}

export async function loadSimilar(id) {
  const reply = await api(`Items/${id}/Similar`, {userId: userId(), Limit: SIMILAR_MAX, Fields: LIST_FIELDS});
  return items(reply.Items).filter(item => item.poster);
}

export async function loadSeasons(seriesId) {
  const reply = await api(`Shows/${seriesId}/Seasons`, {userId: userId(), Fields: 'ChildCount'}, {fresh: true});
  const seasons = items(reply.Items);
  // Specials last: they are rarely where anyone starts.
  return [...seasons.filter(season => season.index !== 0), ...seasons.filter(season => season.index === 0)];
}

export async function loadEpisodes(seriesId, seasonId) {
  const reply = await api(`Shows/${seriesId}/Episodes`, {userId: userId(), seasonId, Fields: 'Overview'}, {fresh: true});
  return items(reply.Items);
}

/** The episode to continue a series with, or null. */
export async function loadNextEpisode(seriesId) {
  const reply = await api('Shows/NextUp', {userId: userId(), SeriesId: seriesId, Limit: 1}, {fresh: true});
  return items(reply.Items)[0] ?? null;
}

/** The episode after `episode` in its series, or null after the last one. */
export async function loadEpisodeAfter(episode) {
  if (!episode.seriesId) return null;
  const reply = await api(`Shows/${episode.seriesId}/Episodes`, {userId: userId(), startItemId: episode.id, Limit: 2},
    {fresh: true});
  return items(reply.Items).find(next => next.id !== episode.id) ?? null;
}

/** A box set's titles in release order. */
export async function loadCollection(id) {
  const reply = await api('Items', {userId: userId(), ParentId: id, SortBy: 'PremiereDate,ProductionYear,SortName',
    SortOrder: 'Ascending', Fields: LIST_FIELDS});
  return items(reply.Items);
}

/**
 * A person, the titles of theirs in this library (best rated first) and the people who appear most
 * often beside them there: Jellyfin has no related people, so co-stars stand in.
 */
export async function loadPerson(id) {
  const [detail, credits] = await Promise.all([
    api(`Items/${id}`, {userId: userId()}),
    api('Items', {userId: userId(), PersonIds: id, Recursive: true, IncludeItemTypes: 'Movie,Series',
      SortBy: 'CommunityRating,ProductionYear', SortOrder: 'Descending', Limit: CREDITS_MAX,
      Fields: `${LIST_FIELDS},People`}),
  ]);
  const person = toItem(server(), detail);
  const titles = items(credits.Items);
  const counts = new Map();
  for (const title of titles.slice(0, COSTAR_TITLES)) {
    for (const member of title.cast.slice(0, 15)) {
      if (member.id === id) continue;
      const entry = counts.get(member.id) ?? {...member, together: 0};
      entry.together += 1;
      counts.set(member.id, entry);
    }
  }
  const costars = [...counts.values()].filter(member => member.profile)
    .sort((a, b) => b.together - a.together).slice(0, COSTARS_MAX)
    .map(({together, ...member}) => ({...member, character: together > 1 ? `${together} titles together` : ''}));
  return {...person, credits: titles, costars};
}

/** Search's grid before anything is typed: random movies with art, rated well enough to be worth a look. */
export async function loadPicks() {
  const reply = await api('Items', {userId: userId(), Recursive: true, IncludeItemTypes: 'Movie', SortBy: 'Random',
    ImageTypes: 'Backdrop', MinCommunityRating: PICKS_RATING, Limit: PICKS_MAX, Fields: LIST_FIELDS}, {fresh: true});
  return items(reply.Items);
}

/** The best SEARCH_MAX matches for `text`, and how many there are in all: {total, items}. */
export async function searchItems(text) {
  const reply = await api('Items', {userId: userId(), searchTerm: text, Recursive: true,
    IncludeItemTypes: 'Movie,Series,BoxSet', Limit: SEARCH_MAX, Fields: LIST_FIELDS});
  const found = items(reply.Items);
  return {total: Math.max(reply.TotalRecordCount ?? 0, found.length), items: found};
}

export const setFavorite = (id, on) => api(`UserFavoriteItems/${id}`, {userId: userId()}, {method: on ? 'POST' : 'DELETE'});
// Jellyfin has no "hide from Continue Watching" (jellyfin-meta discussion #50); the row lists what has
// a position and is not watched, so forgetting the position takes a title off it.
export async function hideFromResume(id) {
  await api(`UserItems/${id}/UserData`, {userId: userId()}, {method: 'POST', body: {PlaybackPositionTicks: 0}});
  invalidate('UserItems/Resume');
}
export const setPlayed = (id, on) => api(`UserPlayedItems/${id}`, {userId: userId()}, {method: on ? 'POST' : 'DELETE'});
