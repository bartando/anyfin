// Copyright (C) 2026 half144 and PS5 React contributors
// SPDX-License-Identifier: GPL-3.0-or-later
// Additional attribution term: see LICENSE-ATTRIBUTION.
// Interface sounds for every focus move, press and back, a light buzz at the end of a row, and a tick
// for each step of a touchpad swipe (the D-pad and stick do not tick). The WAVs are derived from Google's Material
// Design sound resources (CC BY 4.0; see assets/sounds/NOTICE.txt).
import {Controller, Sound, useNavigationEvents} from '@react-on-anything/core';
import {getSettings} from './lib/settings.js';
import {edgesQuiet} from './lib/edges.js';
import focus from './assets/sounds/focus.wav';
import confirm from './assets/sounds/confirm.wav';
import back from './assets/sounds/back.wav';
import error from './assets/sounds/error.wav';
import page from './assets/sounds/page.wav';

export {default as notify} from './assets/sounds/notify.wav';

// The page tap leans toward the shoulder that was pressed.
const PAGE_PAN = {l1: -0.4, l2: -0.4, r1: 0.4, r2: 0.4};
// Strength 0..1 and milliseconds: the end-of-row buzz is felt, not a rumble; a swipe's tick is shorter.
const EDGE_BUZZ = [0.35, 60];
const SWIPE_TICK = [0.25, 25];

export function useInterfaceSounds() {
  useNavigationEvents(event => {
    const {sounds, vibration} = getSettings();
    const swiped = event.source === 'touchpad';
    if (event.type === 'blocked') {
      if ((event.direction === 'left' || event.direction === 'right') && edgesQuiet()) {
        // The seek bar seeks with them: each step of a swipe there still ticks.
        if (swiped && vibration) Controller.vibrate(...SWIPE_TICK);
        return;
      }
      if (vibration) Controller.vibrate(...EDGE_BUZZ);
      if (sounds) Sound.play(error);
      return;
    }
    if (event.type === 'move' && swiped && vibration) Controller.vibrate(...SWIPE_TICK);
    if (!sounds) return;
    if (event.type === 'move') Sound.play(focus);
    else if (event.type === 'press') Sound.play(event.handled ? confirm : error);
    else if (event.handled && event.type === 'back') Sound.play(back);
    else if (event.handled && event.action in PAGE_PAN) Sound.play(page, {pan: PAGE_PAN[event.action]});
    else if (event.handled) Sound.play(confirm);
  });
}
