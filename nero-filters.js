(function () {
  'use strict';

  var DATA_URL = 'https://decantsnero.github.io/quiz/nero-filter-data.json';
  var GENDER_LABELS = { masculino: 'Masculino', feminino: 'Feminino', compartilhavel: 'Compartilhável' };

  function ready(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(init);

  function init() {
    var groups = document.querySelectorAll('.nero-tag-filter-group');
    if (!groups.length) return; // not a category/search page with this widget

    var famGroup = groups[0];
    var genderGroup = groups[1] || null;

    fetch(DATA_URL).then(function (r) { return r.json(); }).then(function (data) {
      injectStyle();
      var state = { fam: new Set(), g: new Set(), oc: new Set(), cl: new Set() };

      convertGroupToToggles(famGroup, 'fam', state, applyFilters);
      if (genderGroup) convertGroupToToggles(genderGroup, 'g', state, applyFilters);

      var occEntries = Object.keys(data.occGroups).map(function (k) { return [k, data.occGroups[k]]; });
      var climaEntries = Object.keys(data.climaGroups).map(function (k) { return [k, data.climaGroups[k]]; });

      var occGroupEl = buildGroup('Ocasião', 'oc', occEntries, state, applyFilters);
      var climaGroupEl = buildGroup('Clima', 'cl', climaEntries, state, applyFilters);

      var anchor = genderGroup || famGroup;
      anchor.insertAdjacentElement('afterend', climaGroupEl);
      anchor.insertAdjacentElement('afterend', occGroupEl);

      function applyFilters() {
        filterVisibleCards(data.handles, state);
      }

      observeGrid(function () { applyFilters(); });
      applyFilters();
    }).catch(function (e) {
      console.warn('[nero-filters] falha ao carregar dados', e);
    });
  }

  function injectStyle() {
    if (document.getElementById('nero-filters-style')) return;
    var s = document.createElement('style');
    s.id = 'nero-filters-style';
    s.textContent =
      '.nero-tag-filter.is-active{background:#111;color:#fff;border-color:#111;}' +
      '.nero-tag-filter{cursor:pointer;}';
    document.head.appendChild(s);
  }

  function convertGroupToToggles(groupEl, dim, state, onChange) {
    var links = Array.from(groupEl.querySelectorAll('a.nero-tag-filter'));
    links.forEach(function (a) {
      var key = extractKeyFromHref(a.getAttribute('href'), dim);
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = a.className;
      btn.textContent = a.textContent;
      btn.dataset.key = key;
      btn.addEventListener('click', function () {
        toggle(state[dim], key, btn);
        onChange();
      });
      a.replaceWith(btn);
    });
  }

  function extractKeyFromHref(href, dim) {
    try {
      var url = new URL(href, location.origin);
      var q = url.searchParams.get('q') || '';
      if (dim === 'g') {
        if (/masculino/i.test(q)) return 'masculino';
        if (/feminino/i.test(q)) return 'feminino';
        return 'compartilhavel';
      }
      return normalize(q);
    } catch (e) { return normalize(href); }
  }

  function normalize(s) {
    return (s || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function buildGroup(label, dim, entries, state, onChange) {
    var wrap = document.createElement('div');
    wrap.className = 'container-with-border full-width-container nero-tag-filter-group';
    var title = document.createElement('p');
    title.className = 'font-medium m-bottom';
    title.textContent = label;
    wrap.appendChild(title);
    entries.forEach(function (entry) {
      var key = entry[0], text = entry[1];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nero-tag-filter';
      btn.textContent = text;
      btn.dataset.key = key;
      btn.addEventListener('click', function () {
        toggle(state[dim], key, btn);
        onChange();
      });
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function toggle(set, key, btn) {
    if (set.has(key)) { set.delete(key); btn.classList.remove('is-active'); }
    else { set.add(key); btn.classList.add('is-active'); }
  }

  function getHandle(cardEl) {
    var a = cardEl.querySelector('a[href*="/produtos/"]');
    if (!a) return null;
    var m = a.getAttribute('href').match(/\/produtos\/([^\/]+)\//);
    return m ? m[1] : null;
  }

  function matches(tagsForProduct, state) {
    if (!tagsForProduct) return false;
    var dims = [
      ['fam', tagsForProduct.fam],
      ['g', tagsForProduct.g],
      ['oc', tagsForProduct.oc],
      ['cl', tagsForProduct.cl],
    ];
    for (var i = 0; i < dims.length; i++) {
      var dim = dims[i][0], field = dims[i][1] || [];
      var active = state[dim];
      if (active.size === 0) continue;
      var fieldNorm = field.map(normalize);
      var any = false;
      active.forEach(function (v) { if (fieldNorm.indexOf(normalize(v)) !== -1) any = true; });
      if (!any) return false;
    }
    return true;
  }

  function filterVisibleCards(handles, state) {
    var anyActive = ['fam', 'g', 'oc', 'cl'].some(function (d) { return state[d].size > 0; });
    var cards = document.querySelectorAll('.js-item-product');
    cards.forEach(function (card) {
      if (!anyActive) { card.style.display = ''; return; }
      var handle = getHandle(card);
      var data = handle ? handles[handle] : null;
      card.style.display = matches(data, state) ? '' : 'none';
    });
  }

  function observeGrid(cb) {
    var sample = document.querySelector('.js-item-product');
    var container = sample ? sample.parentElement : null;
    if (!container) return;
    var obs = new MutationObserver(function () { cb(); });
    obs.observe(container, { childList: true });
  }
})();
