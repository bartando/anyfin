// A page over the tabs keeps shoulder and trigger presses to itself; Options (Settings) and Triangle
// (a card's menu) go on to the app.
export const keepPageActions = action => action !== 'options' && action !== 'triangle';
