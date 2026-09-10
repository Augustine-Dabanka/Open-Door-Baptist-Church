document.addEventListener('DOMContentLoaded', () => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // BG-reveal sections: content fades + drifts as the section scrolls past
    const reveals = document.querySelectorAll('.bg-reveal');
    if (reveals.length && !reducedMotion) {
        const updateReveals = () => {
            const vh = window.innerHeight;
            reveals.forEach(sec => {
                const rect = sec.getBoundingClientRect();
                // Section's center distance from viewport center, normalized
                const center = rect.top + rect.height / 2;
                const offset = (center - vh / 2) / vh;        // -1 (above) → 0 (center) → 1 (below)
                const t = Math.min(1, Math.abs(offset));      // 0 at center, 1 at edges
                const opacity = Math.max(0, 1 - t * 1.4);     // fades to 0 as it leaves
                const shift = offset * 60;                    // content drifts up/down 60px
                const scale = 1 - t * 0.05;                   // slight shrink at edges
                const vignette = 0.55 + t * 0.35;             // bg gets darker at edges
                sec.style.setProperty('--reveal-opacity', opacity.toFixed(3));
                sec.style.setProperty('--reveal-shift', `${shift.toFixed(1)}px`);
                sec.style.setProperty('--reveal-scale', scale.toFixed(3));
                sec.style.setProperty('--reveal-vignette', vignette.toFixed(2));
            });
        };
        let revealTicking = false;
        const onScroll = () => {
            if (!revealTicking) {
                window.requestAnimationFrame(() => { updateReveals(); revealTicking = false; });
                revealTicking = true;
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', updateReveals);
        updateReveals();
    }

    // 3D tilt on cards
    document.querySelectorAll('.tilt-card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const rx = ((y - rect.height / 2) / (rect.height / 2)) * -2;
            const ry = ((x - rect.width / 2) / (rect.width / 2)) * 2;
            card.style.transform = `perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-3px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    // Reveal-on-scroll — uses a wrapper class so it doesn't fight with tilt-card transforms
    const revealEls = document.querySelectorAll('.Min-Sec, .sermon-card, .fb-feed-wrap, .table-3d, .form-section, .pastor-card, .vm-card, .feature-box, .info-card, .form-card, .content-card, .map-wrap, .program-card, .project-card, .program-banner, .banner-slot, .video-ph, .video-embed, .countdown-card, .teaser-card, .welcome-media, .visit-card');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-revealed');
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    revealEls.forEach(el => {
        el.classList.add('reveal-on-scroll');
        io.observe(el);
    });

    // Smooth scroll for in-page anchors
    document.querySelectorAll('a[href^="#"]').forEach(a => {
        a.addEventListener('click', (e) => {
            const href = a.getAttribute('href');
            if (href.length > 1 && document.querySelector(href)) {
                e.preventDefault();
                document.querySelector(href).scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Copy-to-clipboard for donation buttons
    document.querySelectorAll('.copy-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const targetId = btn.getAttribute('data-copy');
            const target = document.getElementById(targetId);
            if (!target) return;
            const text = target.textContent.trim();
            try {
                await navigator.clipboard.writeText(text);
            } catch {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                ta.remove();
            }
            const original = btn.innerHTML;
            btn.classList.add('copied');
            btn.innerHTML = '<i class="fas fa-check me-2"></i>Copied!';
            setTimeout(() => {
                btn.classList.remove('copied');
                btn.innerHTML = original;
            }, 1800);
        });
    });

    /* ============================================================
       FORMS — Formspree submission with sanitize + validate + honeypot
       Set each form's action to your Formspree endpoint
       (https://formspree.io/f/XXXXXXXX) — replace YOUR_FORM_ID.
       ============================================================ */
    // Strip dangerous control chars but KEEP tab/newline/CR (legit whitespace)
    const stripControls = (v) => String(v == null ? '' : v).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Single-line fields: collapse all whitespace to single spaces
    const sanitizeLine = (v, max) => stripControls(v).replace(/\s+/g, ' ').trim().slice(0, max || 500);
    // Message field: keep line breaks, tidy spaces, cap blank lines
    const sanitizeMultiline = (v, max) => stripControls(v)
        .replace(/\r\n?/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, max || 2000);
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const telRe = /^[+\d][\d\s()\-]{6,}$/;

    document.querySelectorAll('form.ajax-form').forEach(form => {
        const statusEl = form.querySelector('.form-status');
        const setStatus = (msg, ok) => {
            if (!statusEl) return;
            statusEl.textContent = msg;
            statusEl.className = 'form-status ' + (ok ? 'is-ok' : 'is-err');
            statusEl.hidden = !msg;
        };

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Honeypot: real users never fill this — bots do. Silently drop.
            const hp = form.querySelector('[name="_gotcha"]');
            if (hp && hp.value.trim() !== '') { form.reset(); return; }

            // Sanitize + validate visible fields
            let valid = true;
            form.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
            form.querySelectorAll('input, textarea, select').forEach(field => {
                if (!field.name || field.name === '_gotcha' || field.type === 'hidden') return;
                const max = parseInt(field.getAttribute('maxlength'), 10) || 500;
                if (field.tagName === 'TEXTAREA') { field.value = sanitizeMultiline(field.value, max); }
                else if (field.tagName !== 'SELECT') { field.value = sanitizeLine(field.value, max); }
                const val = field.value;
                const required = field.hasAttribute('required');
                if (required && !val) { field.classList.add('is-invalid'); valid = false; return; }
                if (field.type === 'email' && val && !emailRe.test(val)) { field.classList.add('is-invalid'); valid = false; return; }
                if (field.type === 'tel' && val && !telRe.test(val)) { field.classList.add('is-invalid'); valid = false; return; }
            });
            if (!valid) { setStatus('Please fix the highlighted fields and try again.', false); return; }

            const btn = form.querySelector('button[type="submit"]');
            const original = btn ? btn.innerHTML : '';
            if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending…'; }
            setStatus('', true);

            // Not configured yet — guide the admin instead of failing silently
            if (!form.action || form.action.indexOf('YOUR_FORM_ID') !== -1) {
                console.warn('Formspree not configured: set the form action to your https://formspree.io/f/XXXX endpoint.');
                setStatus('Thanks! This form isn’t connected yet — the site admin needs to add the Formspree ID.', false);
                if (btn) { btn.disabled = false; btn.innerHTML = original; }
                return;
            }

            try {
                const res = await fetch(form.action, {
                    method: 'POST',
                    body: new FormData(form),
                    headers: { 'Accept': 'application/json' }
                });
                if (res.ok) {
                    form.reset();
                    setStatus('Thank you! Your message has been sent. God bless. 🙏', true);
                } else {
                    const data = await res.json().catch(() => ({}));
                    const msg = (data && data.errors && data.errors.length)
                        ? data.errors.map(x => x.message).join(', ')
                        : 'Sorry, something went wrong. Please try again later.';
                    setStatus(msg, false);
                }
            } catch {
                setStatus('Network error — please check your connection and try again.', false);
            } finally {
                if (btn) { btn.disabled = false; btn.innerHTML = original; }
            }
        });
    });

    /* ============================================================
       LIVE COUNTDOWNS
       Two modes on any element with class .countdown:
         1. data-target="2026-12-31T18:00"  → counts to a fixed date
            (edit this attribute in the HTML to point at any event)
         2. data-next-service="0:07:00"     → auto next weekly service
            Format: "<weekday 0=Sun..6=Sat>:<HH>:<MM>". Resets each week.
       Renders four .count-box cells (Days/Hours/Mins/Secs).
       When a fixed target passes, shows the .countdown ended message.
       ============================================================ */
    const pad = (n) => String(n).padStart(2, '0');

    const nextServiceDate = (spec) => {
        // spec: "weekday:HH:MM" e.g. "0:07:00" = Sunday 7:00 AM
        const [wd, hh, mm] = spec.split(':').map(Number);
        const now = new Date();
        const target = new Date(now);
        target.setHours(hh || 0, mm || 0, 0, 0);
        let diff = ((wd - now.getDay()) + 7) % 7;
        // If it's the right weekday but the time already passed, jump to next week
        if (diff === 0 && target.getTime() <= now.getTime()) diff = 7;
        target.setDate(now.getDate() + diff);
        return target;
    };

    const countdowns = document.querySelectorAll('.countdown');
    if (countdowns.length) {
        const render = (el, ms) => {
            if (ms <= 0) return false;
            const s = Math.floor(ms / 1000);
            const d = Math.floor(s / 86400);
            const h = Math.floor((s % 86400) / 3600);
            const m = Math.floor((s % 3600) / 60);
            const sec = s % 60;
            const cells = el.querySelectorAll('.count-num');
            if (cells.length === 4) {
                cells[0].textContent = d;
                cells[1].textContent = pad(h);
                cells[2].textContent = pad(m);
                cells[3].textContent = pad(sec);
            }
            return true;
        };

        const tick = () => {
            const now = Date.now();
            countdowns.forEach(el => {
                let targetMs;
                if (el.dataset.nextService) {
                    targetMs = nextServiceDate(el.dataset.nextService).getTime();
                } else if (el.dataset.target) {
                    targetMs = new Date(el.dataset.target).getTime();
                } else {
                    return;
                }
                const remaining = targetMs - now;
                if (!render(el, remaining) && !el.dataset.nextService) {
                    // Fixed event has passed
                    const ended = el.dataset.endedText || 'This event has begun — join us!';
                    el.innerHTML = '<div class="countdown-ended"><i class="fas fa-star me-2"></i>' + ended + '</div>';
                    el.classList.add('is-ended');
                }
            });
        };
        tick();
        setInterval(tick, 1000);
    }

    /* Animate project progress bars to their data-progress width when revealed */
    const bars = document.querySelectorAll('.progress-fill[data-progress]');
    if (bars.length) {
        const barIO = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const pct = Math.max(0, Math.min(100, parseInt(entry.target.dataset.progress, 10) || 0));
                    entry.target.style.width = pct + '%';
                    barIO.unobserve(entry.target);
                }
            });
        }, { threshold: 0.4 });
        bars.forEach(b => { b.style.width = '0%'; barIO.observe(b); });
    }

    /* ============================================================
       LAZY-LOAD SOCIAL EMBEDS (Facebook + TikTok)
       Their SDK/embed scripts are heavy, so we only load them when the
       socials section scrolls near the viewport — big first-load win.
       ============================================================ */
    const socialTarget = document.querySelector('.fb-feed-wrap, .tiktok-embed, .fb-page');
    if (socialTarget) {
        const needFB = !!document.querySelector('.fb-page, .fb-videos-frame');
        const needTT = !!document.querySelector('.tiktok-embed');
        const loadSocials = () => {
            if (needFB && !document.getElementById('odbc-fb-sdk')) {
                const s = document.createElement('script');
                s.id = 'odbc-fb-sdk'; s.async = true; s.defer = true; s.crossOrigin = 'anonymous';
                s.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v19.0';
                document.body.appendChild(s);
            }
            if (needTT && !document.getElementById('odbc-tt-embed')) {
                const s = document.createElement('script');
                s.id = 'odbc-tt-embed'; s.async = true;
                s.src = 'https://www.tiktok.com/embed.js';
                document.body.appendChild(s);
            }
        };
        if ('IntersectionObserver' in window) {
            const sio = new IntersectionObserver((entries, obs) => {
                if (entries.some(e => e.isIntersecting)) { loadSocials(); obs.disconnect(); }
            }, { rootMargin: '500px' });
            sio.observe(socialTarget);
        } else {
            loadSocials();
        }
    }

    /* ============================================================
       "WE'RE LIVE" TOP BANNER
       Auto-shows during service windows (and EPISKIAZO daily 6 PM).
       Manual override: set LIVE_OVERRIDE to true (always show) or
       false (never show); null = automatic by schedule.
       Edit the fbLive / tiktokLive URLs and the SERVICE_WINDOWS below.
       ============================================================ */
    const LIVE_OVERRIDE = null;
    const fbLive = 'https://www.facebook.com/ODBCKentinkronoKumasiGhana/live_videos';
    const tiktokLive = 'https://www.tiktok.com/@open.door.baptist41/live';
    // day: 0=Sun … 6=Sat, start: "HH:MM" (local), dur: minutes
    const SERVICE_WINDOWS = [
        { day: 0, start: '07:00', dur: 150 },   // Sunday 1st service
        { day: 0, start: '10:00', dur: 150 },   // Sunday 2nd service
        { day: 3, start: '18:30', dur: 90 },    // Wednesday mid-week
        { day: 5, start: '09:00', dur: 120 },   // Friday special
        { day: 6, start: '07:00', dur: 120 },   // Saturday evangelism
    ];
    // Special run: EPISKIAZO daily 6:00 PM, until 27 Sep 2026 (inclusive)
    const EPISKIAZO_UNTIL = new Date('2026-09-28T00:00:00');

    const withinWindow = (now, start, dur) => {
        const [h, m] = start.split(':').map(Number);
        const s = new Date(now); s.setHours(h, m, 0, 0);
        return now >= s && now <= new Date(s.getTime() + dur * 60000);
    };
    const isLiveNow = (now) => {
        if (LIVE_OVERRIDE === true) return true;
        if (LIVE_OVERRIDE === false) return false;
        for (const w of SERVICE_WINDOWS) {
            if (now.getDay() === w.day && withinWindow(now, w.start, w.dur)) return true;
        }
        if (now < EPISKIAZO_UNTIL && withinWindow(now, '18:00', 120)) return true;
        return false;
    };

    let liveDismissed = false;
    try { liveDismissed = sessionStorage.getItem('odbcLiveDismissed') === '1'; } catch { }
    if (!liveDismissed && isLiveNow(new Date()) && !document.querySelector('.live-bar')) {
        const bar = document.createElement('div');
        bar.className = 'live-bar';
        bar.setAttribute('role', 'region');
        bar.setAttribute('aria-label', 'Live service');
        bar.innerHTML =
            '<span class="live-dot"></span>' +
            '<span class="live-text"><strong>We’re live now</strong> — join the service online.</span>' +
            '<a class="live-btn solid" href="' + fbLive + '" target="_blank" rel="noopener"><i class="fab fa-facebook"></i> Watch on Facebook</a>' +
            '<a class="live-btn" href="' + tiktokLive + '" target="_blank" rel="noopener"><i class="fab fa-tiktok"></i> TikTok</a>' +
            '<button class="live-close" type="button" aria-label="Dismiss">×</button>';
        document.body.insertBefore(bar, document.body.firstChild);
        bar.querySelector('.live-close').addEventListener('click', () => {
            bar.remove();
            try { sessionStorage.setItem('odbcLiveDismissed', '1'); } catch { }
        });
    }

    /* ============================================================
       WhatsApp click-to-chat floating button (site-wide)
       EDIT waNumber to the church's WhatsApp number (intl, no +/spaces).
       ============================================================ */
    const waNumber = '233248838079';
    const waMsg = "Hello Open Door Baptist Church, I'd love to know more about your services.";
    if (waNumber && !document.querySelector('.whatsapp-fab')) {
        const wa = document.createElement('a');
        wa.href = 'https://wa.me/' + waNumber + '?text=' + encodeURIComponent(waMsg);
        wa.className = 'whatsapp-fab';
        wa.target = '_blank';
        wa.rel = 'noopener';
        wa.setAttribute('aria-label', 'Chat with us on WhatsApp');
        wa.innerHTML = '<i class="fab fa-whatsapp"></i><span>Chat</span>';
        document.body.appendChild(wa);
    }
});
