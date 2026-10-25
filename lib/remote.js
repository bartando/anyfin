import {Platform} from '@ps5-react/core';

// Android TV is driven by a remote: no face buttons, shoulders or touchpad to show in hints. Its menu
// key, or OK held, does what Triangle does.
export const remote = Platform.OS === 'android';
