(function () {
  const config = window.SPACIA_CONFIG || {};
  const waNumber = config.phoneDigits || '918444911007';
  const projectPrefix = "Hi, I'm interested in SPACIA by Srijan Realty.";
  const whatsappUrl = (message) => `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  // Keep pricing and domain-specific SEO references in one editable config file.
  document.querySelectorAll('[data-spacia-starting-price]').forEach((node) => {
    if (config.startingPrice) node.textContent = config.startingPrice;
  });
  if (config.siteUrl) {
    const siteUrl = new URL(config.siteUrl).href;
    const socialImage = new URL(config.socialImage || 'assets/images/spacia-social-1200x630.webp', siteUrl).href;
    document.querySelector('link[rel="canonical"]')?.setAttribute('href', siteUrl);
    document.querySelector('meta[property="og:url"]')?.setAttribute('content', siteUrl);
    document.querySelector('meta[property="og:image"]')?.setAttribute('content', socialImage);
    document.querySelector('meta[name="twitter:image"]')?.setAttribute('content', socialImage);

    const schemaTag = document.getElementById('spacia-structured-data');
    if (schemaTag) {
      try {
        const schema = JSON.parse(schemaTag.textContent);
        const origin = new URL(siteUrl).origin;
        schema['@graph'] = (schema['@graph'] || []).map((item) => {
          for (const key of ['@id', 'url', 'image', 'thumbnailUrl', 'contentUrl']) {
            if (typeof item[key] === 'string' && item[key].includes('spacia-one.vercel.app')) {
              item[key] = item[key].replace(/https:\/\/spacia-one\.vercel\.app/g, origin);
            }
          }
          if (item['@type'] === 'WebSite' || item['@type'] === 'WebPage') item.url = siteUrl;
          if (item['@type'] === 'ApartmentComplex') item.url = siteUrl;
          return item;
        });
        const questions = [...document.querySelectorAll('.spacia-faq-list details')].map((detail) => ({
          '@type': 'Question',
          name: detail.querySelector('summary')?.textContent.trim() || '',
          acceptedAnswer: { '@type': 'Answer', text: detail.querySelector('p')?.textContent.trim() || '' }
        })).filter((question) => question.name && question.acceptedAnswer.text);
        schema['@graph'] = schema['@graph'].filter((item) => item['@type'] !== 'FAQPage');
        schema['@graph'].push({
          '@type': 'FAQPage',
          '@id': `${siteUrl}#faq`,
          url: siteUrl,
          mainEntity: questions
        });
        schemaTag.textContent = JSON.stringify(schema);
      } catch (error) {
        console.error('SPACIA structured data could not be updated.', error);
      }
    }
  }

  document.querySelectorAll('[data-wa-message]').forEach((link) => {
    link.href = whatsappUrl(link.dataset.waMessage || projectPrefix);
    link.target = '_blank';
    link.rel = 'noopener';
  });

  document.querySelectorAll('form').forEach((form) => {
    const nameInput = form.elements.namedItem('Name');
    const phoneInput = form.elements.namedItem('MobileNumber');
    const emailInput = form.elements.namedItem('Email');
    const unitInput = form.elements.namedItem('UnitType');

    if (nameInput && phoneInput && emailInput) {
      [nameInput, phoneInput, emailInput].forEach((input) => {
        input.addEventListener('input', () => input.setCustomValidity(''));
      });
      unitInput?.addEventListener('change', () => unitInput.setCustomValidity(''));
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!nameInput || !phoneInput || !emailInput) return;

      nameInput.value = nameInput.value.trim();
      phoneInput.value = phoneInput.value.trim();
      emailInput.value = emailInput.value.trim();
      const phoneDigits = phoneInput.value.replace(/\D/g, '');
      nameInput.setCustomValidity(nameInput.value ? '' : 'Please enter your name.');
      phoneInput.setCustomValidity(phoneDigits.length >= 10 && phoneDigits.length <= 15 ? '' : 'Please enter a valid phone number.');
      emailInput.setCustomValidity(emailInput.validity.valid && emailInput.value ? '' : 'Please enter a valid email address.');
      if (unitInput) unitInput.setCustomValidity(unitInput.value ? '' : 'Please select a unit type.');
      if (!form.reportValidity()) return;

      const unitDetails = unitInput ? ` I'm interested in ${unitInput.value}.` : '';
      const message = `${projectPrefix} My name is ${nameInput.value} (${phoneInput.value}, ${emailInput.value}).${unitDetails} Please call me.`;
      window.open(whatsappUrl(message), '_blank', 'noopener,noreferrer');
    });
  });

  const masonry = document.querySelector('.gallery-masonry');
  if (masonry) {
    const layoutMasonry = () => {
      const rowHeight = parseFloat(getComputedStyle(masonry).gridAutoRows) || 8;
      const gap = parseFloat(getComputedStyle(masonry).rowGap) || 18;
      masonry.querySelectorAll('.gallery-masonry-item').forEach((item) => {
        const image = item.querySelector('img');
        const caption = item.querySelector('span');
        if (!image || !image.naturalWidth) return;
        const imageHeight = item.clientWidth * image.naturalHeight / image.naturalWidth;
        const captionHeight = caption ? caption.getBoundingClientRect().height : 0;
        item.style.gridRowEnd = `span ${Math.ceil((imageHeight + captionHeight + gap) / (rowHeight + gap))}`;
      });
    };
    masonry.querySelectorAll('img').forEach((image) => {
      image.addEventListener('load', layoutMasonry);
      if (image.complete) layoutMasonry();
    });
    window.addEventListener('resize', layoutMasonry, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(layoutMasonry).observe(masonry);
    layoutMasonry();

    const lightbox = document.getElementById('spacia-lightbox');
    const lightboxImage = lightbox?.querySelector('img');
    const lightboxCaption = lightbox?.querySelector('figcaption');
    const closeLightbox = () => {
      if (!lightbox) return;
      lightbox.classList.remove('is-open');
      lightbox.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('lightbox-open');
      if (lightboxImage) lightboxImage.src = '';
    };
    masonry.querySelectorAll('.gallery-masonry-item').forEach((item) => {
      item.addEventListener('click', () => {
        const image = item.querySelector('img');
        if (!lightbox || !image || !lightboxImage) return;
        lightboxImage.src = image.currentSrc || image.src;
        lightboxImage.alt = image.alt;
        if (lightboxCaption) lightboxCaption.textContent = item.dataset.lightboxCaption || image.alt;
        lightbox.classList.add('is-open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('lightbox-open');
        lightbox.querySelector('.spacia-lightbox-close')?.focus();
      });
    });
    lightbox?.querySelector('.spacia-lightbox-close')?.addEventListener('click', closeLightbox);
    lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
    document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLightbox(); });
  }

  const activateTabs = (selector, panelAttribute) => {
    document.querySelectorAll(selector).forEach((tab) => {
      tab.addEventListener('click', () => {
        const group = tab.closest('[role="tablist"]');
        const panelId = tab.dataset[panelAttribute];
        if (!group || !panelId) return;
        const scope = group.parentElement;
        group.querySelectorAll(selector).forEach((sibling) => {
          sibling.classList.toggle('is-active', sibling === tab);
          sibling.setAttribute('aria-selected', String(sibling === tab));
        });
        scope.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== panelId; });
      });
    });
  };
  activateTabs('[data-floor-tab]', 'floorTab');
  activateTabs('[data-location-tab]', 'locationTab');

  document.querySelectorAll('.slidecontent-list, .overview-slider, .footer-slick').forEach((slider) => {
    if (!window.jQuery || !jQuery.fn.slick || jQuery(slider).hasClass('slick-initialized')) return;
    const isFeature = slider.classList.contains('slidecontent-list');
    const isFooter = slider.classList.contains('footer-slick');
    jQuery(slider).slick({
      dots: false,
      infinite: !isFooter,
      autoplay: isFeature,
      autoplaySpeed: 4000,
      fade: isFeature,
      cssEase: 'linear',
      arrows: true,
      slidesToShow: isFeature || isFooter ? 1 : 4,
      slidesToScroll: 1,
      responsive: [
        { breakpoint: 992, settings: { slidesToShow: 3 } },
        { breakpoint: 600, settings: { slidesToShow: 1 } }
      ]
    });
  });

  const frame = document.querySelector('.reel-frame');
  const video = frame?.querySelector('.reel-video');
  const playButton = frame?.querySelector('.reel-toggle');
  const soundButton = frame?.querySelector('.reel-sound');
  if (frame && video && playButton && soundButton) {
    const updatePlaybackUi = () => {
      const playing = !video.paused;
      frame.classList.toggle('is-playing', playing);
      playButton.setAttribute('aria-pressed', String(playing));
      playButton.setAttribute('aria-label', playing ? 'Pause reel' : 'Play reel');
      playButton.querySelector('.reel-play-icon').textContent = playing ? 'Ⅱ' : '▶';
    };
    const togglePlayback = () => video.paused ? video.play().catch(() => {}) : video.pause();
    video.addEventListener('click', togglePlayback);
    playButton.addEventListener('click', togglePlayback);
    video.addEventListener('play', updatePlaybackUi);
    video.addEventListener('pause', updatePlaybackUi);
    soundButton.addEventListener('click', () => {
      video.muted = !video.muted;
      soundButton.textContent = video.muted ? 'Sound off' : 'Sound on';
      soundButton.setAttribute('aria-label', video.muted ? 'Turn sound on' : 'Turn sound off');
      soundButton.setAttribute('aria-pressed', String(!video.muted));
      if (!video.muted && video.paused) video.play().catch(() => {});
    });
    if ('IntersectionObserver' in window) {
      const reelObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) video.play().catch(() => {});
          else video.pause();
        });
      }, { threshold: [0, 0.55, 1] });
      reelObserver.observe(frame);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  }

  document.getElementById('back-to-top')?.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
