// MathJax 3 is served from docs/assets/js/mathjax-3.2.2, a copy of the npm
// package at that exact version, so the site loads no script from a CDN.
// pymdownx.arithmatex wraps each formula in the arithmatex class, and MathJax
// typesets only those elements.
window.MathJax = {
  tex: {
    inlineMath: [["\\(", "\\)"]],
    displayMath: [["\\[", "\\]"]],
    processEscapes: true,
    processEnvironments: true,
  },
  options: {
    ignoreHtmlClass: ".*|",
    processHtmlClass: "arithmatex",
  },
};

// Material replaces the page content on navigation without a reload, so the
// new content is typeset again each time.
document$.subscribe(() => {
  MathJax.startup.output.clearCache();
  MathJax.typesetClear();
  MathJax.texReset();
  MathJax.typesetPromise();
});
