// The title on the card that has focus, for Triangle's menu: cards report it, the app reads it on the
// press. A module value rather than state, so focus moves re-render nothing.
let current = null;

export const cardFocused = item => { current = item; };
export const cardBlurred = item => { if (current?.key === item?.key) current = null; };
export const focusedCard = () => current;
