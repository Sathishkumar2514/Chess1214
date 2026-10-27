(function () {
  const AD_CLIENT = 'ca-pub-5103736693920003';

  const formatMap = {
    responsive: 'auto',
    'in-article': 'fluid',
    sidebar: 'rectangle'
  };

  function buildAdSlot(config = {}) {
    const {
      slotId,
      format = 'responsive',
      className = 'ad-slot',
      label = 'Advertisement',
      mobileSticky = false,
      desktopOnly = false
    } = config;

    if (!slotId) {
      return null;
    }

    const wrapper = document.createElement('div');
    wrapper.className = [
      'ad-slot',
      className,
      mobileSticky ? 'ad-slot--mobile-sticky' : '',
      desktopOnly ? 'ad-slot--desktop-only' : ''
    ].filter(Boolean).join(' ');
    wrapper.setAttribute('data-slot-id', slotId);

    const labelEl = document.createElement('div');
    labelEl.className = 'ad-slot__label';
    labelEl.textContent = label;

    const ins = document.createElement('ins');
    ins.className = 'adsbygoogle';
    ins.style.display = 'block';
    ins.style.width = '100%';
    ins.style.minHeight = mobileSticky ? '90px' : '140px';
    ins.setAttribute('data-ad-client', AD_CLIENT);
    ins.setAttribute('data-ad-slot', slotId);
    ins.setAttribute('data-ad-format', formatMap[format] || 'auto');

    if (format === 'in-article') {
      ins.setAttribute('data-ad-layout', 'in-article');
    }

    if (format === 'sidebar') {
      ins.setAttribute('data-ad-format', 'rectangle');
      ins.style.minHeight = '250px';
    }

    wrapper.appendChild(labelEl);
    wrapper.appendChild(ins);
    return wrapper;
  }

  function renderAdSlot(target, config = {}) {
    if (!target) {
      return;
    }

    const node = buildAdSlot(config);
    if (!node) {
      return;
    }

    target.innerHTML = '';
    target.appendChild(node);
    target.dataset.adReady = 'true';

    if (window.adsbygoogle) {
      window.adsbygoogle.push({});
    }
  }

  window.AdSlot = buildAdSlot;
  window.renderAdSlot = renderAdSlot;
})();
