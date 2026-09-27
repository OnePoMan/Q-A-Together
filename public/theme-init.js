// Runs before the app bundle so the page never flashes the wrong theme.
(function () {
  try {
    var stored = localStorage.getItem('qa-theme');
    var pref = stored ? JSON.parse(stored) : localStorage.getItem('qa-dark-mode') === 'true' ? 'dark' : 'system';
    var dark = pref === 'dark' || (pref !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (dark) document.documentElement.classList.add('dark');
  } catch (e) {
    /* storage unavailable */
  }
})();
