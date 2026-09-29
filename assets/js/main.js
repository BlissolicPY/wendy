/* The Wendy House — site behaviour. No dependencies. */
(function () {
  'use strict';

  /* ---------- Header: add a hairline + shadow once the page scrolls ---------- */
  var header = document.querySelector('[data-header]');
  function onScroll() {
    if (header) header.classList.toggle('is-scrolled', window.scrollY > 8);
  }
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector('.nav-toggle');
  var menu = document.getElementById('mobile-menu');
  if (toggle && menu) {
    var closeBtn = menu.querySelector('[data-menu-close]');
    var openMenu = function () {
      menu.classList.add('is-open');
      menu.removeAttribute('aria-hidden');
      toggle.setAttribute('aria-expanded', 'true');
      document.body.classList.add('no-scroll');
      window.setTimeout(function () { (closeBtn || menu.querySelector('a')).focus(); }, 50);
    };
    var closeMenu = function (returnFocus) {
      menu.classList.remove('is-open');
      menu.setAttribute('aria-hidden', 'true');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.classList.remove('no-scroll');
      if (returnFocus) toggle.focus();
    };
    toggle.addEventListener('click', openMenu);
    if (closeBtn) closeBtn.addEventListener('click', function () { closeMenu(true); });
    menu.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeMenu(true); });
    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (a) {
      a.addEventListener('click', function () { closeMenu(false); });
    });
    var wide = window.matchMedia('(min-width: 1000px)');
    var onWide = function (e) { if (e.matches && menu.classList.contains('is-open')) closeMenu(false); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
  }

  /* ---------- Reveal on scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && reveals.length) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 });
    Array.prototype.forEach.call(reveals, function (el) { io.observe(el); });
  } else {
    Array.prototype.forEach.call(reveals, function (el) { el.classList.add('is-in'); });
  }

  /* ---------- YouTube: click-to-load (no YouTube requests or cookies until a visitor presses play) ----------
     Markup: <div class="video-card__player"><button class="video-card__btn" data-yt="ID" data-title="...">...</button></div>
     Opened from disk (file://) YouTube refuses to embed, so the video opens on YouTube instead. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-yt]'), function (btn) {
    btn.addEventListener('click', function () {
      var id = btn.getAttribute('data-yt');
      var title = btn.getAttribute('data-title') || 'YouTube video';
      if (!/^https?:$/.test(window.location.protocol)) {
        window.open('https://www.youtube.com/watch?v=' + encodeURIComponent(id), '_blank', 'noopener');
        return;
      }
      var iframe = document.createElement('iframe');
      iframe.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0';
      iframe.title = title;
      iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
      iframe.allowFullscreen = true;
      iframe.referrerPolicy = 'strict-origin-when-cross-origin';
      var player = btn.parentNode;
      player.replaceChild(iframe, btn);
      iframe.focus();
    });
  });

  /* ---------- Video modal (self-hosted welcome video) ---------- */
  Array.prototype.forEach.call(document.querySelectorAll('[data-open-video]'), function (trigger) {
    var dialog = document.getElementById(trigger.getAttribute('data-open-video'));
    if (!dialog) return;
    var video = dialog.querySelector('video');
    if (typeof dialog.showModal !== 'function') {
      trigger.addEventListener('click', function () { if (video) window.open(video.currentSrc || video.src, '_blank'); });
      return;
    }
    trigger.addEventListener('click', function () {
      dialog.showModal();
      if (video) { var p = video.play(); if (p && p.catch) p.catch(function () {}); }
    });
    dialog.addEventListener('close', function () { if (video) video.pause(); });
    dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
    Array.prototype.forEach.call(dialog.querySelectorAll('[data-close]'), function (b) {
      b.addEventListener('click', function () { dialog.close(); });
    });
  });

  /* ---------- Contact form ----------
     With data-endpoint="https://..." (e.g. a Formspree form URL) the message is POSTed there.
     Without one, the visitor's email app opens with the message already written. */
  var form = document.querySelector('[data-contact-form]');
  if (form) {
    var statusEl = form.querySelector('[data-form-status]');
    var setStatus = function (msg, kind) {
      if (!statusEl) return;
      statusEl.textContent = msg;
      statusEl.className = 'form-status form-status--' + kind;
    };
    var fields = form.querySelectorAll('input, textarea');
    Array.prototype.forEach.call(fields, function (f) {
      f.addEventListener('input', function () {
        var wrap = f.closest('.field');
        if (wrap && wrap.classList.contains('is-invalid') && f.checkValidity()) wrap.classList.remove('is-invalid');
      });
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var firstBad = null;
      Array.prototype.forEach.call(fields, function (f) {
        var wrap = f.closest('.field');
        var ok = f.checkValidity();
        if (wrap) wrap.classList.toggle('is-invalid', !ok);
        if (!ok && !firstBad) firstBad = f;
      });
      if (firstBad) {
        setStatus('Please check the highlighted fields and try again.', 'error');
        firstBad.focus();
        return;
      }
      var data = new FormData(form);
      var get = function (k) { return String(data.get(k) || '').trim(); };
      var endpoint = form.getAttribute('data-endpoint');
      if (endpoint) {
        var submit = form.querySelector('[type="submit"]');
        if (submit) submit.disabled = true;
        fetch(endpoint, { method: 'POST', body: data, headers: { Accept: 'application/json' } })
          .then(function (r) {
            if (!r.ok) throw new Error('HTTP ' + r.status);
            form.reset();
            setStatus('Thank you, your message has been sent. Wendy will be in touch soon.', 'success');
          })
          .catch(function () {
            setStatus('Sorry, your message could not be sent. Please email thewendyhouse57@gmail.com directly.', 'error');
          })
          .then(function () { if (submit) submit.disabled = false; });
        return;
      }
      var to = form.getAttribute('data-mailto') || 'thewendyhouse57@gmail.com';
      var subject = 'Website enquiry from ' + get('name');
      var body = 'Full Name: ' + get('name') + '\n' +
        'Email: ' + get('email') + '\n' +
        'Mobile: ' + (get('mobile') || '-') + '\n\n' +
        'Message:\n' + get('message') + '\n';
      var mailUrl = 'mailto:' + to + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      (window.__openMail || function (u) { window.location.href = u; })(mailUrl);
      setStatus('Thank you. Your email app should now open with your message ready to send. If nothing happens, email ' + to + ' directly.', 'success');
    });
  }

  /* ---------- Footer year ---------- */
  var year = String(new Date().getFullYear());
  Array.prototype.forEach.call(document.querySelectorAll('[data-year]'), function (el) { el.textContent = year; });
})();
