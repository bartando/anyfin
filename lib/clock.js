// The runtime has no Date objects (only Date.now(), built without ER_JS_INTRINSIC_DATE) and no
// timezone API, so local time is UTC plus Central European time with EU summer time.
const DAY = 86400000;

function daysFromCivil(y, m, d) {
  y -= m <= 2 ? 1 : 0;
  const era = Math.floor(y / 400), yoe = y - era * 400;
  const doy = Math.floor((153 * (m + (m > 2 ? -3 : 9)) + 2) / 5) + d - 1;
  return era * 146097 + yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy - 719468;
}

// Last Sunday of a month at 01:00 UTC, in ms (EU switch instant).
function lastSunday(year, month) {
  const lastDay = daysFromCivil(year, month + 1, 1) - 1;
  const weekday = (lastDay + 4) % 7; // 1970-01-01 was a Thursday
  return (lastDay - weekday) * DAY + 3600000;
}

function yearOf(ms) {
  let y = 1970 + Math.floor(ms / (365.2425 * DAY));
  while (daysFromCivil(y + 1, 1, 1) * DAY <= ms) y++;
  while (daysFromCivil(y, 1, 1) * DAY > ms) y--;
  return y;
}

export function localNow(now = Date.now()) {
  const year = yearOf(now);
  const summer = now >= lastSunday(year, 3) && now < lastSunday(year, 10);
  const local = now + (summer ? 2 : 1) * 3600000;
  const minutes = Math.floor((local % DAY) / 60000);
  return {hours: Math.floor(minutes / 60), minutes: minutes % 60, msToNextMinute: 60000 - (local % 60000)};
}
