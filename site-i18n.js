(function () {
  const STORAGE_KEY = 'eggbeater-site-lang';
  const SUPPORTED = ['en', 'es', 'fr'];

  function normalizeLang(lang) {
    if (!lang) return 'en';
    const short = String(lang).toLowerCase().slice(0, 2);
    return SUPPORTED.includes(short) ? short : 'en';
  }

  function getQueryLang() {
    try {
      const params = new URLSearchParams(window.location.search);
      return normalizeLang(params.get('lang'));
    } catch {
      return null;
    }
  }

  function getInitialLang() {
    return getQueryLang()
      || normalizeLang(localStorage.getItem(STORAGE_KEY))
      || normalizeLang(document.documentElement.lang)
      || normalizeLang(navigator.language)
      || 'en';
  }

  function mergeDictionaries() {
    const shared = window.SITE_I18N_SHARED || {};
    const page = window.SITE_PAGE_I18N || {};
    const out = {};
    for (const lang of SUPPORTED) {
      out[lang] = Object.assign({}, shared[lang] || {}, page[lang] || {});
    }
    return out;
  }

  function getValue(dict, lang, key) {
    return dict[lang]?.[key] ?? dict.en?.[key] ?? '';
  }

  function setNodeValue(node, kind, value) {
    if (!node) return;
    if (kind === 'html') node.innerHTML = value;
    else if (kind === 'placeholder') node.setAttribute('placeholder', value);
    else if (kind === 'aria-label') node.setAttribute('aria-label', value);
    else if (kind === 'content') node.setAttribute('content', value);
    else if (kind === 'title') document.title = value;
    else node.textContent = value;
  }

  function applyDataBindings(dict, lang) {
    document.querySelectorAll('[data-i18n]').forEach((node) => {
      setNodeValue(node, 'text', getValue(dict, lang, node.dataset.i18n));
    });
    document.querySelectorAll('[data-i18n-html]').forEach((node) => {
      setNodeValue(node, 'html', getValue(dict, lang, node.dataset.i18nHtml));
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach((node) => {
      setNodeValue(node, 'placeholder', getValue(dict, lang, node.dataset.i18nPlaceholder));
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach((node) => {
      setNodeValue(node, 'aria-label', getValue(dict, lang, node.dataset.i18nAriaLabel));
    });
    document.querySelectorAll('[data-i18n-content]').forEach((node) => {
      setNodeValue(node, 'content', getValue(dict, lang, node.dataset.i18nContent));
    });
    document.querySelectorAll('[data-i18n-title]').forEach((node) => {
      setNodeValue(node, 'title', getValue(dict, lang, node.dataset.i18nTitle));
    });
  }

  function applyExplicitBindings(dict, lang) {
    const bindings = window.SITE_I18N_BINDINGS || [];
    bindings.forEach((binding) => {
      const nodes = document.querySelectorAll(binding.selector);
      const value = getValue(dict, lang, binding.key);
      nodes.forEach((node) => setNodeValue(node, binding.attr || 'text', value));
    });
  }

  function syncPickers(lang) {
    document.querySelectorAll('[data-site-lang-picker]').forEach((picker) => {
      picker.value = lang;
    });
  }

  function setLang(lang) {
    const resolved = normalizeLang(lang);
    const dict = mergeDictionaries();
    localStorage.setItem(STORAGE_KEY, resolved);
    document.documentElement.lang = resolved;
    applyDataBindings(dict, resolved);
    applyExplicitBindings(dict, resolved);
    syncPickers(resolved);
    window.__eggbeaterSiteLang = resolved;
  }

  function boot() {
    const initial = getInitialLang();
    document.querySelectorAll('[data-site-lang-picker]').forEach((picker) => {
      picker.addEventListener('change', (e) => setLang(e.target.value));
    });
    window.setSiteLang = setLang;
    window.siteT = function siteT(key) {
      const dict = mergeDictionaries();
      return getValue(dict, window.__eggbeaterSiteLang || initial, key);
    };
    setLang(initial);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
