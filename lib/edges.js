// While the focused element makes Left and Right its own (the player's seek bar seeks with them), a
// move blocked sideways is not the end of a row: no error sound, no buzz.
let quiet = false;

export const setQuietEdges = on => { quiet = on; };
export const edgesQuiet = () => quiet;
