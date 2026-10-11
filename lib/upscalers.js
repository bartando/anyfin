// The doublers <Video upscale> offers, as the settings present them. `gpuMs` is the GPU time a 1080p
// picture took on a PS5 (docs/HARDWARE.md in ps5-react); the player splits it over two display frames,
// so up to about 12 ms keeps 60 fps.
export const UPSCALERS = [
  {id: '', name: 'Off', family: '', gpuMs: 0,
    about: 'The picture as the server sends it, scaled to the screen by the GPU.'},
  {id: 'artcnn', name: 'ArtCNN', family: 'ArtCNN C4F16', gpuMs: 12.5, badge: 'Recommended',
    about: 'Trained on anime line art. Sharpens brightness only, so colours stay as encoded. Clean, no halos.'},
  {id: 'anime4k-s', name: 'Anime4K S', family: 'Anime4K Upscale CNN', gpuMs: 3,
    about: 'The lightest Anime4K: crisper lines at almost no cost.'},
  {id: 'anime4k-m', name: 'Anime4K M', family: 'Anime4K Upscale CNN', gpuMs: 4.1,
    about: 'A little more detail than S, still very cheap.'},
  {id: 'anime4k-l', name: 'Anime4K L', family: 'Anime4K Upscale CNN', gpuMs: 6.2, badge: 'Balanced',
    about: 'Sharper edges and gradients; the best Anime4K for its cost.'},
  {id: 'anime4k-vl', name: 'Anime4K VL', family: 'Anime4K Upscale CNN', gpuMs: 12.0,
    about: 'Close to the most the PS5 can do every frame for a 1080p film.'},
  {id: 'anime4k-ul', name: 'Anime4K UL', family: 'Anime4K Upscale CNN', gpuMs: 20.0, badge: 'PS5 Pro',
    about: 'The heaviest. Drops frames on a 1080p film on a PS5; fine for 720p.'},
];

// Above this a model no longer fits in two display frames at 60 Hz with the rest of the screen.
export const SMOOTH_MS = 13;

export const upscalerName = id => UPSCALERS.find(u => u.id === id)?.name ?? 'Off';
