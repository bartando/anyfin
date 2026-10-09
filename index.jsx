import {useCallback, useEffect, useRef, useState} from 'react';
import {AnimatePresence, AppRegistry, FocusScope, View, motion, transitions, useFocus} from '@ps5-react/core';
import {useInterfaceSounds} from './sounds.js';
import {movies, shows} from './lib/catalog.js';
import {TopBar} from './components/TopBar.jsx';
import {Toast} from './components/Toast.jsx';
import {HomePage} from './pages/Home.jsx';
import {LibraryPage} from './pages/Library.jsx';
import {SearchPage} from './pages/Search.jsx';
import {DetailPage} from './pages/Detail.jsx';

const TABS = [
  {label: 'Home', render: props => <HomePage {...props} />},
  {label: 'Movies', render: props => <LibraryPage title="Movies" list={movies} {...props} />},
  {label: 'TV Shows', render: props => <LibraryPage title="TV Shows" list={shows} {...props} />},
  {label: 'Search', render: props => <SearchPage {...props} />},
];
const LABELS = TABS.map(tab => tab.label);
// Spatially, Down from the Search tab lands in the results; the keyboard is where search starts.
const DOWN_TO = {Search: 'key:A'};
const TOAST_MS = 2200;

// Pages only translate (ANIMATION.md "Page transitions"): fading a full-screen node is the most
// expensive effect on the CPU renderer.
const screen = {
  hidden: {x: 90},
  shown: {x: 0, transition: transitions.screen},
  gone: {x: -60, transition: transitions.exit},
};
const sheet = {
  hidden: {x: 120},
  shown: {x: 0, transition: transitions.screen},
  gone: {x: 120, transition: transitions.exit},
};

function App() {
  useInterfaceSounds();
  const [tab, setTab] = useState(0);
  const [detail, setDetail] = useState(null);
  const [toast, setToast] = useState(null);
  const [homeY, setHomeY] = useState(0);
  const {focus} = useFocus();
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    focus('hero-play');
  }, []);
  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [toast]);

  const open = useCallback(item => setDetail(item), []);
  // Focusing a tab selects it; on Home that also scrolls back so the focused tab is on screen.
  const select = useCallback(index => {
    setTab(index);
    setHomeY(0);
  }, []);
  const play = useCallback(item => setToast({id: Date.now(), text: `Playback isn't wired up in this demo: ${item.title}`}), []);
  const onAction = action => {
    if (action !== 'l1' && action !== 'r1') return false;
    const next = (tab + (action === 'r1' ? 1 : TABS.length - 1)) % TABS.length;
    focus(`tab:${LABELS[next]}`);
    return true;
  };

  return (
    <View className="w-screen h-screen bg-canvas">
      <FocusScope onAction={onAction} inert={!!detail}>
        <View className="absolute inset-0">
          <AnimatePresence mode="wait">
            <motion.View key={tab} className="absolute inset-0"
              variants={screen} initial="hidden" animate="shown" exit="gone">
              <FocusScope focusKey="content" onBack={() => focus('tabs')}>
                {TABS[tab].render({onOpen: open, onPlay: play, scrollY: homeY, onScrollY: setHomeY})}
              </FocusScope>
            </motion.View>
          </AnimatePresence>
          <TopBar labels={LABELS} active={tab} onSelect={select} onEnter={() => focus('content')}
            downTo={DOWN_TO} y={tab === 0 ? homeY : 0} />
        </View>
      </FocusScope>
      <AnimatePresence>
        {detail && (
          <motion.View key={detail.key} className="absolute inset-0"
            variants={sheet} initial="hidden" animate="shown" exit="gone">
            <DetailPage item={detail} onClose={() => setDetail(null)} onPlay={play} />
          </motion.View>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && <Toast key={toast.id} text={toast.text} />}
      </AnimatePresence>
    </View>
  );
}

AppRegistry.registerComponent('jelly5', () => App);
