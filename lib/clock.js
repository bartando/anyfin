import {DeviceInfo} from '@ps5-react/core';

// The runtime has no Date objects (only Date.now()); the host gives the system time zone's offset.
const DAY = 86400000;

export function localNow(now = Date.now()) {
  const local = now + DeviceInfo.utcOffset(now) * 60000;
  const ms = ((local % DAY) + DAY) % DAY;
  const minutes = Math.floor(ms / 60000);
  return {hours: Math.floor(minutes / 60), minutes: minutes % 60, msToNextMinute: 60000 - (ms % 60000)};
}

/** "21:05", or "9:05 PM" without the 24-hour clock. */
export function formatTime({hours, minutes}, clock24) {
  const mm = String(minutes).padStart(2, '0');
  if (clock24) return `${String(hours).padStart(2, '0')}:${mm}`;
  return `${hours % 12 || 12}:${mm} ${hours < 12 ? 'AM' : 'PM'}`;
}
