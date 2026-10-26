import {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {AnimatePresence, AppRegistry, FocusScope, Screen, Screens, View, motion, transitions, useFocusActions,
  usePan} from '@ps5-react/core';
import {useInterfaceSounds} from './sounds.js';
import {useMoveTracking} from './lib/lastMove.js';
import {LaunchIntro} from './components/LaunchIntro.jsx';
import {useSession} from './lib/jellyfin/session.js';
import {LIBRARIES, hideFromResume, loadFavoriteRows, loadHome, loadWatchingRows} from './lib/jellyfin/library.js';
import {useLoad} from './lib/useLoad.js';
import {getFlag, toggleFavorite, togglePlayed, useFavoritesVersion} from './lib/favorites.js';
import {useProgressVersion} from './lib/progress.js';
import {focusedCard} from './lib/focusedCard.js';
import {FAVORITES, TopBar} from './components/TopBar.jsx';
import {Toast} from './components/Toast.jsx';
import {ContextMenu} from './components/ContextMenu.jsx';
import {HomePage} from './pages/Home.jsx';
import {LibraryPage} from './pages/Library.jsx';
import {SearchPage} from './pages/Search.jsx';
import {DetailPage} from './pages/Detail.jsx';
import {PlayerPage} from './pages/Player.jsx';
import {PersonPage} from './pages/Person.jsx';
import {StillsPage} from './pages/Stills.jsx';
import {CollectionPage} from './pages/Collection.jsx';
import {SettingsPage} from './pages/Settings.jsx';
import {ConnectPage} from './pages/Connect.jsx';

const LABELS = ['Home', 'Movies', 'TV Shows', 'Collections', 'Search'];
// L1/R1 order, left to right as on screen: Favorites sits left of the pill.
const TAB_ORDER = [FAVORITES, 0, 1, 2, 3, 4];
const tabKey = tab => (tab === FAVORITES ? 'tab:Favorites' : `tab:${LABELS[tab]}`);
// Spatially, Down from the Search tab lands in the results; the keyboard is where search starts.
// Focusing a tab scrolls Home back to its hero, so Down from it starts there too, not on the card
// Home last had focused further down (that jumped the page back down).
const DOWN_TO = {Home: 'hero-play', Search: 'key:A'};
const TOAST_MS = 2200;
// Home's favorite rows go after these.
const collectionFacts = collection => (collection.childCount ? `${collection.childCount} titles` : '');

// Pages only translate (ANIMATION.md "Page transitions"): fading a full-screen node is the most
// expensive effect on the CPU renderer. Screens keeps each tab mounted once shown, so switching back
// rebuilds nothing.
const screen = {
  hidden: {x: 90},
  shown: {x: 0, transition: transitions.screen},
  gone: {x: -60, transition: transitions.exit},
};
const sheet = {
  hidden: {x: 120},
  shown: {x: 0, transition: transitions.screen},
  gone: {x: 120, transition: transitions.exit},
  // A page leaving from under the top one: nobody sees it go.
  drop: {x: 0, transition: {duration: 0}},
};
// Titles and people open on top of each other; Back walks the stack. Only the top two stay mounted
// (the one under the top shows while it slides away), and the oldest pages are forgotten.
const STACK_MAX = 30;

/** Signed out: the sign-in screen. Signed in: the app, started fresh for each session. */
function App() {
  useInterfaceSounds();
  useMoveTracking();
  const session = useSession();
  const [launched, setLaunched] = useState(false);
  const finishLaunch = useCallback(() => setLaunched(true), []);
  return (
    <View className="w-screen h-screen bg-canvas">
      {/* Mount once so Home and the preloaded library tabs can fetch during the intro.
          Keep their UI out of both painting and navigation until the intro releases it. */}
      <FocusScope inert={!launched}>
        <View className="absolute inset-0" style={{display: launched ? 'flex' : 'none'}}>
          {session ? (
            <Main key={`${session.server}|${session.userId}|${session.token}`} session={session} active={launched} />
          ) : launched ? <ConnectPage /> : null}
        </View>
      </FocusScope>
      {!launched && <View className="absolute inset-0"><LaunchIntro onComplete={finishLaunch} /></View>}
    </View>
  );
}

function Main({session, active}) {
  const [tab, setTab] = useState(0);
  const [stack, setStack] = useState([]);
  const pageId = useRef(0);
  const [toast, setToast] = useState(null);
  const [homeY, setHomeY] = useState(0);
  const homePan = usePan();
  const favoritesVersion = useFavoritesVersion();
  const progressVersion = useProgressVersion();
  const {data: loaded, error: homeError} = useLoad(session.token, loadHome);
  // Reloaded on their own: a toggled favorite, a playback stopped. The rows stay up meanwhile, so the
  // rows under them do not jump.
  const {data: favoriteRows} = useLoad(session.token, loadFavoriteRows, favoritesVersion);
  const {data: watchingReloaded} = useLoad(progressVersion ? session.token : null, loadWatchingRows, progressVersion);
  // Titles taken off Continue Watching leave the row at once; Home loads its rows only once.
  const [unresumed, setUnresumed] = useState(() => new Set());
  const home = useMemo(() => {
    if (!loaded) return loaded;
    const rows = [...watchingReloaded ?? loaded.watching, ...favoriteRows ?? [], ...loaded.rows]
      .map(row => (row.id === 'resume' ? {...row, items: row.items.filter(item => !unresumed.has(item.id))} : row));
    return {hero: loaded.hero, rows: rows.filter(row => row.items.length)};
  }, [loaded, watchingReloaded, favoriteRows, unresumed]);
  const {focus, focusedRect} = useFocusActions();
  const [menu, setMenu] = useState(null);
  const started = useRef(false);

  useEffect(() => {
    if (!active || started.current) return;
    started.current = true;
    focus('hero-play');
  }, [active]);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const push = useCallback(page => setStack(pages => [...pages, {...page, id: ++pageId.current}].slice(-STACK_MAX)), []);
  // An episode (Continue Watching, Next Up) opens its series, at its season.
  const open = useCallback(item => push({type: 'title', item: item.kind === 'episode' ? {
    key: item.seriesId, id: item.seriesId, kind: 'tv', title: item.seriesTitle ?? '', genres: [], cast: [],
    backdrop: item.backdrop, logo: item.logo, poster: item.poster, initialSeasonId: item.seasonId,
  } : item}), []);
  const openPerson = useCallback(person => push({type: 'person', person}), []);
  const openCollection = useCallback(collection => push({type: 'collection', collection}), []);
  const openStills = useCallback((item, index) => push({type: 'stills', item, index}), []);
  const openFavorite = useCallback(item => (item.kind === 'collection' ? openCollection(item) : open(item)), []);
  const back = useCallback(() => setStack(pages => pages.slice(0, -1)), []);
  // Next Episode: the player hands over to a new one in its place.
  const playNext = useCallback(item => setStack(pages => [...pages.slice(0, -1), {type: 'player', item, id: ++pageId.current}]), []);
  // Focusing a tab selects it; on Home that also scrolls back so the focused tab is on screen.
  const select = useCallback(index => {
    setTab(index);
    setHomeY(0);
  }, []);
  const openSettings = useCallback(section => push({type: 'settings', section}), []);
  const play = useCallback(item => {
    if (item.kind === 'tv') {
      setToast({id: Date.now(), text: `Pick an episode of ${item.title} to play`});
      return;
    }
    push({type: 'player', item});
  }, []);
  const say = text => setToast({id: Date.now(), text});
  const pickFromMenu = (id, item) => {
    setMenu(null);
    if (id === 'play') play(item);
    else if (id === 'restart') play({...item, positionSeconds: 0, positionMinutes: 0});
    else if (id === 'info') openFavorite(item);
    else if (id === 'unresume') {
      const keep = on => setUnresumed(was => {
        const next = new Set(was);
        if (on) next.add(item.id);
        else next.delete(item.id);
        return next;
      });
      keep(true);
      say('Progress cleared');
      hideFromResume(item.id).catch(error => {
        keep(false);
        say(`Could not clear the progress: ${error.message}`);
      });
    }
    else if (id === 'watched') {
      say(getFlag(item, 'played') ? 'Marked as unwatched' : 'Marked as watched');
      togglePlayed(item);
    } else if (id === 'favorite') {
      say(getFlag(item, 'favorite') ? 'Removed from Favorites' : 'Added to Favorites');
      toggleFavorite(item);
    }
  };
  // Triangle on a card opens its menu beside it. Options opens Settings over whatever is showing (the
  // player takes both first, for its own uses); pressed again in Settings, it closes them.
  const onOptions = action => {
    if (action === 'triangle') {
      const item = focusedCard(), rect = focusedRect();
      if (!item || item.placeholder || !rect) return false;
      setMenu({item, rect});
      return true;
    }
    if (action !== 'options') return false;
    setStack(pages => (pages.at(-1)?.type === 'settings' ? pages.slice(0, -1)
      : [...pages, {type: 'settings', section: 'playback', id: ++pageId.current}].slice(-STACK_MAX)));
    return true;
  };
  const onAction = action => {
    if (action !== 'l1' && action !== 'r1') return false;
    const at = TAB_ORDER.indexOf(tab);
    focus(tabKey(TAB_ORDER[(at + (action === 'r1' ? 1 : TAB_ORDER.length - 1)) % TAB_ORDER.length]));
    return true;
  };

  return (
    <FocusScope onAction={onOptions}>
      <View className="w-screen h-screen bg-canvas">
        <FocusScope onAction={onAction} inert={stack.length > 0}>
          <View className="absolute inset-0">
            {/* Circle goes to the tab on show: the bar remembers none before one was focused, and its
                first is the Favorites heart, which would switch the page. */}
            <Screens active={tab} variants={screen} focusKey="content" onBack={() => focus(tabKey(tab))} preload>
              <Screen id={0}>
                <HomePage home={home} onOpen={open} onPlay={play} scrollY={homeY} onScrollY={setHomeY} pan={homePan} />
              </Screen>
              <Screen id={1}><LibraryPage title="Movies" params={LIBRARIES.movies} onOpen={open} alphabetical /></Screen>
              <Screen id={2}><LibraryPage title="TV Shows" params={LIBRARIES.shows} onOpen={open} unit="SHOW" alphabetical /></Screen>
              <Screen id={3}>
                <LibraryPage title="Collections" params={LIBRARIES.collections} onOpen={openCollection} facts={collectionFacts}
                  unit="COLLECTION" empty="This server has no collections." />
              </Screen>
              <Screen id={4}><SearchPage onOpen={open} onPlay={play} /></Screen>
              <Screen id={FAVORITES}>
                <LibraryPage title="Favorites" params={LIBRARIES.favorites} version={favoritesVersion} onOpen={openFavorite}
                  empty="Nothing here yet. Open a title and press the heart to keep it here." />
              </Screen>
            </Screens>
            <TopBar labels={LABELS} active={tab} onSelect={select} onEnter={() => focus('content')}
              downTo={DOWN_TO} y={tab === 0 ? homeY : 0} pan={homePan} onAccount={() => openSettings('account')}
              onSettings={() => openSettings('playback')}
              user={{name: session.userName, image: session.userImage}} />
          </View>
        </FocusScope>
        <AnimatePresence>
          {stack.slice(-2).map((page, index, shown) => {
            const top = index === shown.length - 1;
            return (
              <motion.View key={page.id} className="absolute inset-0" variants={sheet}
                initial={top ? 'hidden' : false} animate="shown" exit={top ? 'gone' : 'drop'}>
                {page.type === 'title' ? (
                  <DetailPage item={page.item} active={top} onClose={back} onPlay={play} onOpen={open}
                    onPerson={openPerson} onStills={openStills} />
                ) : page.type === 'person' ? (
                  <PersonPage person={page.person} active={top} onClose={back} onOpen={open} onPerson={openPerson} />
                ) : page.type === 'player' ? (
                  <PlayerPage item={page.item} active={top} onClose={back} onNext={playNext} />
                ) : page.type === 'stills' ? (
                  <StillsPage item={page.item} index={page.index} active={top} onClose={back} />
                ) : page.type === 'settings' ? (
                  <SettingsPage session={session} section={page.section} active={top} onClose={back} />
                ) : (
                  <CollectionPage collection={page.collection} active={top} onClose={back} onOpen={open} />
                )}
              </motion.View>
            );
          })}
        </AnimatePresence>
        {homeError && <Toast key="home-error" text={`Could not load Home: ${homeError.message}`} />}
        <AnimatePresence>
          {toast && <Toast key={toast.id} text={toast.text} />}
        </AnimatePresence>
        {/* No exit animation: a leaving trap would keep focus until it unmounted. */}
        {menu && <ContextMenu item={menu.item} rect={menu.rect} onPick={pickFromMenu} onClose={() => setMenu(null)} />}
      </View>
    </FocusScope>
  );
}

AppRegistry.registerComponent('anyfin', () => App);
