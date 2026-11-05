(function () {
  const waNumber = '918444911007';
  const projectPrefix = 'Hi, I am interested in SPACIA by Srijan Realty.';
  const whatsappUrl = (message) => `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

  document.querySelectorAll('[data-wa-message]').forEach((link) => {
    link.href = whatsappUrl(link.dataset.waMessage || projectPrefix);
    link.target = '_blank';
    link.rel = 'noopener';
  });

  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const nameInput = form.elements.namedItem('Name');
      const phoneInput = form.elements.namedItem('MobileNumber');
      const emailInput = form.elements.namedItem('Email');
      if (!nameInput || !phoneInput || !emailInput) return;

      nameInput.value = nameInput.value.trim();
      phoneInput.value = phoneInput.value.trim();
      emailInput.value = emailInput.value.trim();
      const phoneDigits = phoneInput.value.replace(/\D/g, '');
      nameInput.setCustomValidity(nameInput.value ? '' : 'Please enter your name.');
      phoneInput.setCustomValidity(phoneDigits.length >= 10 && phoneDigits.length <= 15 ? '' : 'Please enter a valid phone number.');
      emailInput.setCustomValidity(emailInput.value ? '' : 'Please enter your email address.');
      if (!form.reportValidity()) return;

      const message = `Hi, I am ${nameInput.value} (${phoneInput.value}, ${emailInput.value}). I am interested in SPACIA, please call me.`;
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
        if (!image || !image.naturalWidth) return;
        const imageHeight = item.clientWidth * image.naturalHeight / image.naturalWidth;
        item.style.gridRowEnd = `span ${Math.ceil((imageHeight + gap) / (rowHeight + gap))}`;
      });
    };
    masonry.querySelectorAll('img').forEach((image) => image.addEventListener('load', layoutMasonry));
    window.addEventListener('resize', layoutMasonry, { passive: true });
    if ('ResizeObserver' in window) new ResizeObserver(layoutMasonry).observe(masonry);
    layoutMasonry();
  }

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
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) {
            video.play().catch(() => {});
          } else {
            video.pause();
          }
        });
      }, { threshold: [0, 0.55, 1] });
      reelObserver.observe(frame);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  }

  const backToTop = document.getElementById('back-to-top');
  backToTop?.addEventListener('click', (event) => {
    event.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
})();
