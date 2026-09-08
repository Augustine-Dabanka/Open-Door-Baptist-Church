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
    const revealEls = document.querySelectorAll('.Min-Sec, .sermon-card, .fb-feed-wrap, .table-3d, .form-section, .pastor-card, .vm-card, .feature-box, .info-card, .form-card, .content-card, .map-wrap, .program-card, .project-card, .program-banner, .banner-slot, .video-ph, .video-embed, .countdown-card, .teaser-card');
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

    // Forms
    document.querySelectorAll('form.ajax-form').forEach(form => {
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            if (!btn) return;
            const original = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check"></i> Message Received — God Bless!';
            btn.disabled = true;
            form.reset();
            setTimeout(() => { btn.innerHTML = original; btn.disabled = false; }, 4000);
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
});
