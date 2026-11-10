(() => {
  const cards = Array.from(document.querySelectorAll('.work-card'));
  if (!cards.length) return;

  const filters = Array.from(document.querySelectorAll('[data-filter]'));
  const status = document.querySelector('#results-status');
  const feature = document.querySelector('#feature-open');
  const featureImage = document.querySelector('#feature-image');
  const featureTitle = document.querySelector('#feature-title');
  const featurePosition = document.querySelector('#feature-pos');
  const viewer = document.querySelector('#viewer');
  const canView = typeof viewer?.showModal === 'function';
  const viewerImage = document.querySelector('#viewer-image');
  const closeButton = viewer?.querySelector('[data-action="close"]');
  const previousButton = viewer?.querySelector('[data-action="previous"]');
  const nextButton = viewer?.querySelector('[data-action="next"]');
  const stateKey = 'yeonwooGallery';

  let activeFilter = 'all';
  let featuredIndex = 0;
  let selectedCard = null;
  let returnEntry = null;
  let closing = false;
  let previousOverflow = '';

  function titleOf(card) {
    return card.querySelector('.work-title').textContent.trim();
  }

  function countLabel(index, total) {
    return [index + 1, total].map(number => String(number).padStart(2, '0')).join(' / ');
  }

  function cardsIn(filter) {
    return filter === 'all' ? cards : cards.filter(card => card.dataset.category === filter);
  }

  function applyFilter(filter) {
    activeFilter = filter;
    const visible = cardsIn(filter);
    for (const card of cards) card.hidden = !visible.includes(card);
    for (const button of filters) {
      const pressed = button.dataset.filter === filter;
      button.setAttribute('aria-pressed', String(pressed));
      button.classList.toggle('active', pressed);
    }
    if (status) status.textContent = '작품 ' + visible.length + '점';
  }

  for (const button of filters) {
    button.addEventListener('click', () => applyFilter(button.dataset.filter));
  }

  function setFeatured(index) {
    featuredIndex = (index + cards.length) % cards.length;
    const card = cards[featuredIndex];
    const title = titleOf(card);
    feature.href = card.href;
    feature.setAttribute('aria-label', title + ' 작품 상세 보기');
    featureImage.removeAttribute('srcset');
    featureImage.src = card.getAttribute('href').replace(/\.webp$/i, '-640.webp');
    featureImage.alt = card.querySelector('img').alt;
    featureTitle.textContent = title;
    featurePosition.textContent = countLabel(featuredIndex, cards.length);
  }

  if (feature && featureImage && featureTitle && featurePosition) {
    for (const button of document.querySelectorAll('[data-hero-step]')) {
      button.addEventListener('click', () => setFeatured(featuredIndex + Number(button.dataset.heroStep)));
    }
    setFeatured(0);
  }

  function hashFor(card) {
    return '#work-' + card.id.slice('card-'.length);
  }

  function openFromLink(event, card, filter) {
    if (!canView || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const entry = {
      opener: event.currentTarget.id,
      filter,
      scrollX: window.scrollX,
      scrollY: window.scrollY
    };
    history.pushState({ ...history.state, [stateKey]: entry }, '', hashFor(card));
    event.preventDefault();
    syncViewer();
  }

  for (const card of cards) {
    card.addEventListener('click', event => openFromLink(event, card, activeFilter));
  }
  feature?.addEventListener('click', event => openFromLink(event, cards[featuredIndex], 'all'));

  function showCard(card, entry) {
    selectedCard = card;
    returnEntry = entry;
    const sequence = cardsIn(entry.filter);
    viewerImage.src = card.href;
    viewerImage.alt = card.querySelector('img').alt;
    document.querySelector('#viewer-type').textContent = card.dataset.type;
    document.querySelector('#viewer-title').textContent = titleOf(card);
    document.querySelector('#viewer-description').textContent = card.dataset.description;
    document.querySelector('#viewer-count').textContent = countLabel(sequence.indexOf(card), sequence.length);
    previousButton.disabled = nextButton.disabled = sequence.length < 2;

    if (!viewer.open) {
      previousOverflow = document.documentElement.style.overflow;
      document.documentElement.style.overflow = 'hidden';
      viewer.showModal();
      closeButton.focus({ preventScroll: true });
    }
    viewer.scrollTop = 0;
  }

  function dismissViewer() {
    closing = false;
    if (!viewer.open) return;

    viewer.close();
    document.documentElement.style.overflow = previousOverflow;
    const entry = returnEntry;
    returnEntry = null;
    selectedCard = null;
    const opener = document.getElementById(entry.opener);
    const focusTarget = opener && !opener.hidden ? opener : filters.find(button => button.dataset.filter === activeFilter);
    requestAnimationFrame(() => {
      if (viewer.open) return;
      if (entry.direct) {
        focusTarget?.scrollIntoView({ block: 'center', behavior: 'instant' });
      } else {
        window.scrollTo({ left: entry.scrollX, top: entry.scrollY, behavior: 'instant' });
      }
      focusTarget?.focus({ preventScroll: true });
    });
  }

  function syncViewer() {
    const card = cards.find(item => hashFor(item) === location.hash);
    if (!card) {
      dismissViewer();
      return;
    }
    if (selectedCard === card && viewer.open) return;

    let entry = history.state?.[stateKey];
    if (!entry) {
      // Give visitors following a shared artwork link a gallery entry to return to.
      entry = { opener: card.id, filter: 'all', direct: true };
      history.replaceState(history.state, '', '#works');
      history.pushState({ ...history.state, [stateKey]: entry }, '', hashFor(card));
    }
    showCard(card, entry);
  }

  function stepViewer(direction) {
    const sequence = cardsIn(returnEntry.filter);
    const nextIndex = (sequence.indexOf(selectedCard) + direction + sequence.length) % sequence.length;
    const card = sequence[nextIndex];
    history.replaceState(history.state, '', hashFor(card));
    showCard(card, returnEntry);
  }

  function requestClose() {
    if (closing) return;
    closing = true;
    history.back();
  }

  if (canView) {
    previousButton.addEventListener('click', () => stepViewer(-1));
    nextButton.addEventListener('click', () => stepViewer(1));
    closeButton.addEventListener('click', requestClose);
    viewer.addEventListener('cancel', event => {
      event.preventDefault();
      requestClose();
    });
    viewer.addEventListener('click', event => {
      if (event.target !== viewer) return;
      const bounds = viewer.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX >= bounds.right ||
          event.clientY < bounds.top || event.clientY >= bounds.bottom) requestClose();
    });
    window.addEventListener('popstate', syncViewer);
    window.addEventListener('hashchange', syncViewer);
    syncViewer();
  }
  document.documentElement.classList.add('js');
})();
