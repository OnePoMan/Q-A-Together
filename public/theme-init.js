// Runs before the app bundle so the page never flashes the wrong theme.
(function () {
  try {
    var stored = localStorage.getItem('qa-theme');
    var pref = stored ? JSON.parse(stored) : localStorage.getItem('qa-dark-mode') === 'true' ? 'dark' : 'system';
    var dark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');

    // Layout: same rule as hooks/useDisplayMode.ts, applied early to avoid a jump.
    var display = localStorage.getItem('qa-display');
    display = display ? JSON.parse(display) : 'auto';
    var phone =
      display === 'phone' ||
      (display === 'auto' && window.matchMedia('(max-width: 767px), (pointer: coarse) and (max-height: 500px)').matches);
    document.documentElement.dataset.display = phone ? 'phone' : 'desktop';
  } catch (e) {
    /* storage unavailable */
  }
})();
