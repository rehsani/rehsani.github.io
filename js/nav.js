/**
 * Shared top-bar nav behaviour, loaded by every page on the site (root pages as
 * `js/nav.js`, the tax tool as `../js/nav.js`).
 *
 * CSS alone opens the Tools dropdown on :hover, which leaves out keyboard and
 * touch users. This script adds click/tap toggling and Escape-to-close on top of
 * that, driving an `.open` class on the `.dropdown` wrapper.
 *
 * It also marks the document with `html.js-nav`. The stylesheet uses that marker
 * to switch off its no-script `:focus-within` / `:focus-visible` reveal, so that
 * pressing an already-focused toggle closes the menu instead of being fought by
 * the focus rule.
 */
(function () {
  'use strict';

  document.documentElement.classList.add('js-nav');

  /** All Tools-style dropdowns present in the top bar. */
  var dropdowns = [].slice.call(
    document.querySelectorAll('.top-bar .nav-links .dropdown')
  );
  if (!dropdowns.length) return;

  /**
   * Open or close one dropdown.
   * @param {Element} dropdown - the `.dropdown` wrapper element.
   * @param {boolean} open - true to reveal the menu, false to hide it.
   */
  function setOpen(dropdown, open) {
    var toggle = dropdown.querySelector('.dropdown-toggle');
    dropdown.classList.toggle('open', open);
    if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  /**
   * Close every dropdown except an optional one to leave alone.
   * @param {Element} [except] - dropdown to skip.
   */
  function closeAll(except) {
    dropdowns.forEach(function (dropdown) {
      if (dropdown !== except) setOpen(dropdown, false);
    });
  }

  dropdowns.forEach(function (dropdown) {
    var toggle = dropdown.querySelector('.dropdown-toggle');
    if (!toggle) return;

    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-haspopup', 'true');

    toggle.addEventListener('click', function () {
      var willOpen = !dropdown.classList.contains('open');
      closeAll(dropdown);
      setOpen(dropdown, willOpen);
    });

    // Escape closes the menu from anywhere inside it and returns focus to the
    // toggle, so keyboard users do not lose their place in the tab order.
    dropdown.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' && event.key !== 'Esc') return;
      if (!dropdown.classList.contains('open')) return;
      setOpen(dropdown, false);
      toggle.focus();
    });
  });

  // A tap or click anywhere outside an open dropdown dismisses it.
  document.addEventListener('click', function (event) {
    var inside = dropdowns.some(function (dropdown) {
      return dropdown.contains(event.target);
    });
    if (!inside) closeAll();
  });
})();
