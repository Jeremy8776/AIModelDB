// Loads web fonts after first paint so a slow or offline network never blocks rendering.
// Kept as an external file because the CSP (script-src 'self') forbids inline handlers.
(function () {
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=Patrick+Hand&family=VT323&family=Inter:wght@400;500;600;700&display=swap';
  document.head.appendChild(link);
})();
