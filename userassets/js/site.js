(function () {
  'use strict';

  const config = window.SPACIA_CONFIG || {};
  const WA_NUMBER = config.WHATSAPP_NUMBER || '918444911007';
  const PROJECT = config.projectName || 'Srijan Spacia';
  const ATTRIBUTION_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
  const STORAGE_KEY = 'spacia_attribution';
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const whatsappUrl = (message) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(message)}`;
  const safeStorage = {
    get(key) { try { return window.sessionStorage.getItem(key); } catch (error) { return null; } },
    set(key, value) { try { window.sessionStorage.setItem(key, value); } catch (error) { /* storage unavailable */ } }
  };

  /* ---------- Prices from site-config.js ---------- */
  const prices = config.prices || {};
  const startingPrice = prices[config.startingConfiguration];
  document.querySelectorAll('[data-spacia-starting-price]').forEach((node) => {
    if (startingPrice) node.textContent = startingPrice;
  });
  document.querySelectorAll('[data-spacia-config-price]').forEach((node) => {
    const price = prices[node.dataset.spaciaConfigPrice];
    if (price) node.textContent = price;
  });

  /* ---------- Attribution (UTM / click IDs), kept for the session ---------- */
  const attribution = (() => {
    let stored = {};
    try { stored = JSON.parse(safeStorage.get(STORAGE_KEY) || '{}') || {}; } catch (error) { stored = {}; }
    const params = new URLSearchParams(window.location.search);
    const fresh = {};
    ATTRIBUTION_KEYS.forEach((key) => { const value = params.get(key); if (value) fresh[key] = value.slice(0, 200); });
    if (Object.keys(fresh).length) {
      stored = { ...fresh, landing_page: window.location.href.split('#')[0] };
      safeStorage.set(STORAGE_KEY, JSON.stringify(stored));
    }
    return stored;
  })();

  /* ---------- Tracking ----------
   * Google Tag Manager (GTM-WX5GS62L) is hard-coded in the <head> of index.html and 404.html,
   * so it is never injected here (no duplicate container). GA4 is configured inside GTM.
   * Every event is pushed to window.dataLayer for GTM triggers. The direct GA4 / Meta Pixel
   * loaders below run only if GTM_ID is empty and an ID is set (both are empty today). */
  window.dataLayer = window.dataLayer || [];
  const tracking = { ga4: false, pixel: false };
  const loadScript = (src) => {
    const script = document.createElement('script');
    script.async = true;
    script.src = src;
    document.head.appendChild(script);
  };
  if (!config.GTM_ID) {
    if (config.GA4_ID) {
      window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', config.GA4_ID);
      loadScript(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(config.GA4_ID)}`);
      tracking.ga4 = true;
    }
    if (config.META_PIXEL_ID) {
      /* Meta Pixel base code */
      (function (f, b, e, v, n, t, s) {
        if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
        if (!f._fbq) f._fbq = n; n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
        t = b.createElement(e); t.async = true; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
      })(window, document, 'script', 'https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', config.META_PIXEL_ID);
      window.fbq('track', 'PageView');
      tracking.pixel = true;
    }
  }

  const track = (eventName, params = {}) => {
    window.dataLayer.push({ event: eventName, ...params });
    if (tracking.ga4 && window.gtag) window.gtag('event', eventName, params);
    if (tracking.pixel && window.fbq) {
      if (eventName === 'generate_lead') window.fbq('track', 'Lead', { content_name: params.request_item || 'Enquiry' });
      else if (eventName === 'click_whatsapp' || eventName === 'click_call') window.fbq('track', 'Contact', { method: eventName === 'click_call' ? 'phone' : 'whatsapp' });
      else window.fbq('trackCustom', eventName, params);
    }
  };

  /* ---------- Header: shrink after 50px, mobile menu ---------- */
  const header = document.querySelector('.sp-header');
  const menuToggle = document.querySelector('.sp-nav-toggle');
  if (header) {
    // Hysteresis (on above 50px, off below 10px) so the height change can't make the state flicker.
    // classList.add/remove are no-ops when unchanged, so running on every scroll event is cheap.
    const update = () => {
      const y = window.scrollY;
      if (y > 50) header.classList.add('is-scrolled');
      else if (y < 10) header.classList.remove('is-scrolled');
    };
    window.addEventListener('scroll', update, { passive: true });
    update();
  }
  const setMenu = (open) => {
    if (!header || !menuToggle) return;
    header.classList.toggle('is-menu-open', open);
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  menuToggle?.addEventListener('click', () => setMenu(menuToggle.getAttribute('aria-expanded') !== 'true'));
  document.querySelectorAll('.sp-nav a').forEach((link) => link.addEventListener('click', () => setMenu(false)));
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setMenu(false); });
  window.addEventListener('resize', () => { if (window.innerWidth >= 1200) setMenu(false); }, { passive: true });

  /* ---------- WhatsApp + call links ---------- */
  document.querySelectorAll('[data-wa-message]').forEach((link) => {
    link.href = whatsappUrl(link.dataset.waMessage || `Hi, I'm interested in ${PROJECT}.`);
    link.target = '_blank';
    link.rel = 'nofollow noopener noreferrer';
  });
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a');
    if (!link) return;
    const href = link.getAttribute('href') || '';
    const location = link.dataset.trackLocation || link.closest('[data-track-area]')?.dataset.trackArea || 'page';
    if (href.startsWith('tel:')) track('click_call', { link_location: location });
    else if (href.includes('wa.me/')) track('click_whatsapp', { link_location: location });
  });

  /* ---------- Lead submission (shared by every form) ---------- */
  const normaliseIndianMobile = (value) => {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
    if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
    return /^[6-9]\d{9}$/.test(digits) ? digits : '';
  };

  const buildWhatsappMessage = (lead) => {
    const lines = [
      `Hi, I'm interested in ${PROJECT}, Madhyamgram.`,
      `Request: ${lead.requested_item}`,
      `Name: ${lead.name}`,
      `Mobile: +91 ${lead.phone}`
    ];
    if (lead.email) lines.push(`Email: ${lead.email}`);
    if (lead.unit) lines.push(`Unit type: ${lead.unit}`);
    if (lead.timeframe) lines.push(`Timeline: ${lead.timeframe}`);
    const source = [lead.utm_source, lead.utm_medium, lead.utm_campaign].filter(Boolean).join(' / ');
    if (source) lines.push(`Source: ${source}`);
    lines.push(`Page: ${lead.page_url}`);
    return lines.join('\n');
  };

  /**
   * submitLead(details) -> Promise<{ ok, via, whatsappHref }>
   * POSTs JSON to LEAD_ENDPOINT when configured; otherwise opens WhatsApp with
   * every detail prefilled. Must be called from the submit handler so the
   * WhatsApp window is not blocked as a pop-up.
   */
  const submitLead = (details) => {
    const lead = {
      name: details.name || '',
      phone: details.phone || '',
      email: details.email || '',
      unit: details.unit || '',
      timeframe: details.timeframe || '',
      requested_item: details.requested_item || 'Project details',
      page_url: window.location.href.split('#')[0],
      timestamp: new Date().toISOString()
    };
    ATTRIBUTION_KEYS.forEach((key) => { lead[key] = attribution[key] || ''; });
    const whatsappHref = whatsappUrl(buildWhatsappMessage(lead));
    const trackLead = (via) => track('generate_lead', {
      request_item: lead.requested_item,
      unit_type: lead.unit,
      form_id: details.form_id || '',
      timeframe: lead.timeframe,
      lead_channel: via
    });

    if (config.LEAD_ENDPOINT) {
      return fetch(config.LEAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(lead),
        keepalive: true
      }).then((response) => {
        if (!response.ok) throw new Error(`Lead endpoint returned ${response.status}`);
        trackLead('endpoint');
        return { ok: true, via: 'endpoint', whatsappHref };
      }).catch((error) => {
        console.warn('Lead endpoint failed; offering WhatsApp instead.', error);
        return { ok: false, via: 'whatsapp', whatsappHref };
      });
    }

    trackLead('whatsapp'); // pushed before WhatsApp opens
    const opened = window.open(whatsappHref, '_blank', 'noopener,noreferrer');
    return Promise.resolve({ ok: true, via: 'whatsapp', whatsappHref, opened: Boolean(opened) });
  };
  window.submitLead = submitLead;

  const thanksMessage = (item, custom) => {
    if (custom) return custom;
    if (item.toLowerCase() === 'site visit') return 'Thank you! Our team will call you shortly to confirm your site visit.';
    const label = item === 'Project details' ? 'project details' : item;
    return `Thank you! Our team will share the ${label} with you shortly.`;
  };

  const showThanks = (form, result) => {
    const wrap = form.closest('.sp-form-wrap');
    const panel = wrap?.querySelector('.sp-thanks');
    if (!wrap || !panel) return;
    const item = form.elements.namedItem('requested_item')?.value || 'project details';
    const title = panel.querySelector('.sp-thanks__title');
    const text = panel.querySelector('.sp-thanks__text');
    const waLink = panel.querySelector('.sp-thanks__wa');
    if (result.ok) {
      if (title) title.textContent = thanksMessage(item, form.dataset.thanks);
      if (text) text.textContent = result.via === 'whatsapp'
        ? 'We have opened WhatsApp with your details. Please tap send so our team receives them.'
        : 'Your details have reached our sales team. You can also call us on ' + (config.PHONE || '+91 84449 11007') + '.';
    } else {
      if (title) title.textContent = 'We could not send your details just now.';
      if (text) text.textContent = 'Please send them on WhatsApp instead; the message is already filled in.';
    }
    if (waLink) {
      waLink.href = result.whatsappHref;
      waLink.hidden = result.via !== 'whatsapp';
      waLink.textContent = result.ok ? 'WhatsApp did not open? Send on WhatsApp' : 'Send on WhatsApp';
    }
    form.hidden = true;
    panel.hidden = false;
    panel.setAttribute('tabindex', '-1');
    panel.focus({ preventScroll: false });
  };

  const resetForm = (form) => {
    const wrap = form.closest('.sp-form-wrap');
    form.reset();
    form.hidden = false;
    form.classList.remove('was-validated');
    form.querySelectorAll('.sp-field-error').forEach((node) => { node.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach((node) => node.removeAttribute('aria-invalid'));
    const panel = wrap?.querySelector('.sp-thanks');
    if (panel) panel.hidden = true;
    const button = form.querySelector('[type="submit"]');
    if (button) { button.disabled = false; button.textContent = button.dataset.label || button.textContent; }
  };

  const setError = (input, message) => {
    if (!input) return;
    input.setCustomValidity(message);
    input.toggleAttribute('aria-invalid', Boolean(message));
    const error = input.closest('.sp-field, .sp-check')?.querySelector('.sp-field-error');
    if (error) error.textContent = message;
  };

  document.querySelectorAll('form[data-lead-form]').forEach((form) => {
    const field = (name) => form.elements.namedItem(name);
    const button = form.querySelector('[type="submit"]');
    if (button) button.dataset.label = button.textContent.trim();
    ['name', 'phone', 'email', 'consent'].forEach((name) => {
      const input = field(name);
      input?.addEventListener(input.type === 'checkbox' ? 'change' : 'input', () => setError(input, ''));
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const name = field('name');
      const phone = field('phone');
      const email = field('email');
      const consent = field('consent');
      if (name) name.value = name.value.trim().replace(/\s+/g, ' ');
      if (email) email.value = email.value.trim();
      const mobile = normaliseIndianMobile(phone?.value);

      setError(name, name && name.value.length >= 2 ? '' : 'Please enter your name.');
      setError(phone, mobile ? '' : 'Enter a valid 10-digit Indian mobile number.');
      setError(email, !email || !email.value || email.validity.valid ? '' : 'Please enter a valid email address.');
      setError(consent, !consent || consent.checked ? '' : 'Please accept to continue.');
      if (!form.checkValidity()) {
        form.classList.add('was-validated');
        form.querySelector('[aria-invalid]')?.focus();
        return;
      }

      if (button) { button.disabled = true; button.textContent = 'Sending…'; }
      submitLead({
        name: name.value,
        phone: mobile,
        email: email ? email.value : '',
        unit: field('unit')?.value || '',
        timeframe: field('timeframe')?.value || '',
        requested_item: field('requested_item')?.value || 'Project details',
        form_id: form.id
      }).then((result) => {
        if (button) { button.disabled = false; button.textContent = button.dataset.label; }
        showThanks(form, result);
      });
    });

    form.closest('.sp-form-wrap')?.querySelector('.sp-thanks__again')?.addEventListener('click', () => {
      resetForm(form);
      field('name')?.focus();
    });
  });

  /* ---------- Modals (replaces Bootstrap's modal JS) ----------
   * Same markup/classes as Bootstrap 5 (.modal.fade -> .show, .modal-backdrop, body.modal-open)
   * and the same data attributes: data-bs-toggle="modal" + data-bs-target, data-bs-dismiss="modal".
   * Fires 'shown.bs.modal' / 'hidden.bs.modal' events. */
  const FADE_MS = reduceMotion ? 0 : 300;
  const focusableSel = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let openModal = null;
  let backdrop = null;
  const showModal = (el) => {
    if (!el) return;
    if (openModal && openModal !== el) hideModal(openModal, true);
    openModal = el;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    if (scrollbar > 0) document.body.style.paddingRight = `${scrollbar}px`;
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'modal-backdrop fade';
      document.body.appendChild(backdrop);
    }
    el.style.display = 'block';
    el.removeAttribute('aria-hidden');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('role', 'dialog');
    void el.offsetWidth; // reflow so the fade/slide transition runs
    backdrop.classList.add('show');
    el.classList.add('show');
    window.setTimeout(() => {
      if (openModal !== el) return;
      el.dispatchEvent(new Event('shown.bs.modal'));
      if (!el.contains(document.activeElement)) (el.querySelector(focusableSel) || el).focus({ preventScroll: true });
    }, FADE_MS);
  };
  const hideModal = (el, keepBackdrop = false) => {
    if (!el || !el.classList.contains('show')) return;
    el.classList.remove('show');
    if (openModal === el) openModal = null;
    const finish = () => {
      el.style.display = 'none';
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-modal');
      el.removeAttribute('role');
      if (!openModal) {
        backdrop?.remove(); backdrop = null;
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
      }
      el.dispatchEvent(new Event('hidden.bs.modal'));
    };
    if (!keepBackdrop) backdrop?.classList.remove('show');
    if (keepBackdrop || !FADE_MS) finish(); else window.setTimeout(finish, FADE_MS);
  };
  window.SPACIA_MODAL = { show: showModal, hide: hideModal };
  document.addEventListener('click', (event) => {
    const opener = event.target.closest('[data-bs-toggle="modal"]');
    if (opener) {
      event.preventDefault();
      showModal(document.querySelector(opener.getAttribute('data-bs-target') || opener.getAttribute('href')));
      return;
    }
    const closer = event.target.closest('[data-bs-dismiss="modal"]');
    if (closer) { hideModal(closer.closest('.modal')); return; }
    if (openModal && event.target === openModal) hideModal(openModal); // click on the backdrop area
  });
  document.addEventListener('keydown', (event) => {
    if (!openModal) return;
    if (event.key === 'Escape') { hideModal(openModal); return; }
    if (event.key !== 'Tab') return;
    const items = [...openModal.querySelectorAll(focusableSel)].filter((node) => node.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  /* ---------- Reusable enquiry modal ---------- */
  const modalEl = document.getElementById('enquiryModal');
  const modalForm = modalEl?.querySelector('form');
  let lastTrigger = null;
  const modalApi = modalEl ? { show: () => showModal(modalEl), hide: () => hideModal(modalEl) } : null;

  const openEnquiry = (trigger) => {
    if (!modalEl || !modalForm || !modalApi) return;
    resetForm(modalForm);
    const item = trigger.dataset.enquire || 'Project details';
    const title = trigger.dataset.enquireTitle || (item === 'Project details' ? 'Enquire Now' : `Get the ${item}`);
    modalEl.querySelector('.sp-modal__title').textContent = title;
    const intro = modalEl.querySelector('.sp-modal__intro');
    if (intro) intro.textContent = trigger.dataset.enquireIntro || (item === 'Project details'
      ? 'Share your details and the Spacia team will get in touch.'
      : `Share your details and our team will send you the ${item}.`);
    modalForm.elements.namedItem('requested_item').value = item;
    modalForm.dataset.thanks = trigger.dataset.enquireThanks || '';
    const unit = modalForm.elements.namedItem('unit');
    if (unit) unit.value = trigger.dataset.enquireUnit || '';
    const submit = modalForm.querySelector('[type="submit"]');
    if (submit) {
      submit.textContent = trigger.dataset.enquireCta || (item === 'Site Visit' ? 'Book a Site Visit' : item === 'Project details' ? 'Submit Enquiry' : `Get the ${item}`);
      submit.dataset.label = submit.textContent;
    }
    lastTrigger = trigger;
    modalApi.show();
    track('open_enquiry_modal', { request_item: item });
  };
  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-enquire]');
    if (!trigger) return;
    event.preventDefault();
    openEnquiry(trigger);
  });
  modalEl?.addEventListener('shown.bs.modal', () => modalForm?.elements.namedItem('name')?.focus());
  modalEl?.addEventListener('hidden.bs.modal', () => { if (lastTrigger && document.contains(lastTrigger)) lastTrigger.focus(); });

  /* ---------- Tighter lazy loading for below-the-fold grids ----------
   * Native loading="lazy" fetches anything within ~1250px of the viewport, which pulled the whole
   * amenity grid into the first load on desktop. These images carry a 1x1 placeholder src and
   * get their real src/srcset 300px before they scroll into view (<noscript> copy for no-JS). */
  const lazyImages = [...document.querySelectorAll('img[data-lazy-src]')];
  const reveal = (img) => {
    if (img.dataset.lazySrcset) img.srcset = img.dataset.lazySrcset;
    img.src = img.dataset.lazySrc;
    img.removeAttribute('data-lazy-src');
    img.removeAttribute('data-lazy-srcset');
  };
  if ('IntersectionObserver' in window) {
    const lazyObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) { reveal(entry.target); lazyObserver.unobserve(entry.target); } });
    }, { rootMargin: '300px 0px' });
    lazyImages.forEach((img) => lazyObserver.observe(img));
  } else lazyImages.forEach(reveal);

  /* ---------- Hero crossfade ---------- */
  const heroSlides = [...document.querySelectorAll('.sp-hero__slide')];
  if (heroSlides.length > 1) {
    // Later slides carry their image details as data-img-* attributes; the <picture>/<img> is
    // created here so the HTML never contains an <img> without a src, and phones get the
    // portrait crop (data-img-mobile-srcset) instead of the landscape render.
    const hydrate = () => heroSlides.forEach((slide) => {
      const d = slide.dataset;
      if (!d.imgSrc || slide.querySelector('img')) return;
      const picture = document.createElement('picture');
      if (d.imgMobileSrcset) {
        const source = document.createElement('source');
        source.media = '(max-width: 767px)';
        source.srcset = d.imgMobileSrcset;
        source.sizes = '100vw';
        source.width = 750; // portrait crops are 750x1200 / 1080x1700
        source.height = 1200;
        picture.appendChild(source);
      }
      const img = document.createElement('img');
      if (d.imgSrcset) img.srcset = d.imgSrcset;
      if (d.imgSizes) img.sizes = d.imgSizes;
      img.alt = d.imgAlt || '';
      img.width = Number(d.imgWidth) || 1440;
      img.height = Number(d.imgHeight) || 720;
      img.decoding = 'async';
      img.src = d.imgSrc;
      picture.appendChild(img);
      slide.appendChild(picture);
    });
    let index = 0;
    let timer = null;
    const next = () => {
      const target = heroSlides[(index + 1) % heroSlides.length];
      const img = target.querySelector('img');
      if (!img || !img.complete) return; // wait until the next render has loaded
      heroSlides[index].classList.remove('is-active');
      index = (index + 1) % heroSlides.length;
      heroSlides[index].classList.add('is-active');
    };
    let begun = false;
    const start = () => { if (begun && !timer && !reduceMotion) timer = window.setInterval(next, 6500); };
    const stop = () => { window.clearInterval(timer); timer = null; };
    // The other slides are not needed for the first paint: fetch them on the visitor's first
    // interaction (or 8 s after load), keeping the initial page load lean.
    const begin = (event) => {
      // A scroll event fired by scroll restoration on (re)load isn't an interaction.
      if (begun || (event && event.type === 'scroll' && window.scrollY < 40)) return;
      begun = true;
      ['scroll', 'pointerdown', 'touchstart', 'keydown', 'mousemove'].forEach((type) => window.removeEventListener(type, begin));
      hydrate();
      start();
    };
    ['scroll', 'pointerdown', 'touchstart', 'keydown', 'mousemove'].forEach((type) => window.addEventListener(type, begin, { passive: true }));
    const fallback = () => window.setTimeout(() => begin(), 8000);
    if (document.readyState === 'complete') fallback(); else window.addEventListener('load', fallback, { once: true });
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
  }

  /* ---------- Connectivity accordion: one panel open at a time ---------- */
  document.querySelectorAll('.sp-accordion').forEach((accordion) => {
    const items = [...accordion.querySelectorAll('details')];
    items.forEach((item) => item.addEventListener('toggle', () => {
      if (item.open) items.forEach((other) => { if (other !== item) other.open = false; });
    }));
  });

  /* ---------- Gallery masonry + shared lightbox ---------- */
  const lightbox = document.getElementById('spacia-lightbox');
  const lightboxFigure = lightbox?.querySelector('figure');
  const lightboxCaption = lightbox?.querySelector('figcaption');
  let lightboxReturn = null;
  const closeLightbox = () => {
    if (!lightbox || !lightbox.classList.contains('is-open')) return;
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('lightbox-open');
    lightboxFigure?.querySelector('img')?.remove(); // never leave an <img> without a src in the DOM
    lightboxReturn?.focus();
  };
  const openLightbox = (src, alt, caption, trigger) => {
    if (!lightbox || !lightboxFigure) return;
    lightboxFigure.querySelector('img')?.remove();
    const lightboxImage = document.createElement('img');
    lightboxImage.decoding = 'async';
    lightboxImage.src = src;
    lightboxImage.alt = alt || '';
    lightboxFigure.insertBefore(lightboxImage, lightboxCaption);
    if (lightboxCaption) lightboxCaption.textContent = caption || alt || '';
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('lightbox-open');
    lightboxReturn = trigger;
    lightbox.querySelector('.spacia-lightbox-close')?.focus();
  };
  document.querySelectorAll('[data-lightbox-src]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const image = trigger.querySelector('img');
      openLightbox(trigger.dataset.lightboxSrc, image?.alt, trigger.dataset.lightboxCaption, trigger);
    });
  });
  lightbox?.querySelector('.spacia-lightbox-close')?.addEventListener('click', closeLightbox);
  lightbox?.addEventListener('click', (event) => { if (event.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeLightbox(); });

  const masonry = document.querySelector('.gallery-masonry');
  if (masonry) {
    const layoutMasonry = () => {
      const rowHeight = parseFloat(getComputedStyle(masonry).gridAutoRows) || 8;
      const gap = parseFloat(getComputedStyle(masonry).rowGap) || 18;
      masonry.querySelectorAll('.gallery-masonry-item').forEach((item) => {
        const image = item.querySelector('img');
        const caption = item.querySelector('span');
        const ratio = image && image.naturalWidth ? image.naturalHeight / image.naturalWidth
          : (image ? Number(image.getAttribute('height')) / Number(image.getAttribute('width')) : 0.5);
        const imageHeight = item.clientWidth * (ratio || 0.5);
        const captionHeight = caption ? caption.getBoundingClientRect().height : 0;
        item.style.gridRowEnd = `span ${Math.ceil((imageHeight + captionHeight + gap) / (rowHeight + gap))}`;
      });
    };
    masonry.querySelectorAll('img').forEach((image) => image.addEventListener('load', layoutMasonry));
    if ('ResizeObserver' in window) new ResizeObserver(layoutMasonry).observe(masonry);
    else window.addEventListener('resize', layoutMasonry, { passive: true });
    layoutMasonry();
    masonry.querySelectorAll('.gallery-masonry-item').forEach((item) => {
      item.addEventListener('click', () => {
        const image = item.querySelector('img');
        if (image) openLightbox(item.dataset.full || image.currentSrc || image.src, image.alt, item.dataset.lightboxCaption, item);
      });
    });
  }

  /* ---------- Floor plan tabs ---------- */
  document.querySelectorAll('[data-floor-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      const group = tab.closest('[role="tablist"]');
      const panelId = tab.dataset.floorTab;
      if (!group || !panelId) return;
      group.querySelectorAll('[data-floor-tab]').forEach((sibling) => {
        sibling.classList.toggle('is-active', sibling === tab);
        sibling.setAttribute('aria-selected', String(sibling === tab));
        sibling.tabIndex = sibling === tab ? 0 : -1;
      });
      group.parentElement.querySelectorAll('[role="tabpanel"]').forEach((panel) => { panel.hidden = panel.id !== panelId; });
    });
    tab.addEventListener('keydown', (event) => {
      if (!['ArrowRight', 'ArrowLeft'].includes(event.key)) return;
      const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[data-floor-tab]')];
      const nextTab = tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
      nextTab.focus();
      nextTab.click();
    });
  });

  /* ---------- Project reel ---------- */
  const frame = document.querySelector('.reel-frame');
  const video = frame?.querySelector('.reel-video');
  const playButton = frame?.querySelector('.reel-toggle');
  const soundButton = frame?.querySelector('.reel-sound');
  if (video?.dataset.poster) {
    const setPoster = () => { if (!video.poster) video.poster = video.dataset.poster; };
    if ('IntersectionObserver' in window) {
      const posterObserver = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) { setPoster(); posterObserver.disconnect(); }
      }, { rootMargin: '600px 0px' });
      posterObserver.observe(video);
    } else setPoster();
  }
  if (frame && video && playButton && soundButton) {
    const updatePlaybackUi = () => {
      const playing = !video.paused;
      frame.classList.toggle('is-playing', playing);
      playButton.setAttribute('aria-pressed', String(playing));
      playButton.setAttribute('aria-label', playing ? 'Pause reel' : 'Play reel');
      playButton.querySelector('.reel-play-icon').textContent = playing ? 'Ⅱ' : '▶';
    };
    const togglePlayback = () => (video.paused ? video.play().catch(() => {}) : video.pause());
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
    if ('IntersectionObserver' in window && !reduceMotion) {
      new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.55) video.play().catch(() => {});
          else video.pause();
        });
      }, { threshold: [0, 0.55, 1] }).observe(frame);
    }
    document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); });
  }
})();
