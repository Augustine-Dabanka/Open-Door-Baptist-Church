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
            const rx = ((y - rect.height / 2) / (rect.height / 2)) * -6;
            const ry = ((x - rect.width / 2) / (rect.width / 2)) * 6;
            card.style.transform = `perspective(1000px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        });
        card.addEventListener('mouseleave', () => { card.style.transform = ''; });
    });

    // Reveal-on-scroll — uses a wrapper class so it doesn't fight with tilt-card transforms
    const revealEls = document.querySelectorAll('.Min-Sec, .sermon-card, .fb-feed-wrap, .table-3d, .form-section, .pastor-card, .vm-card, .feature-box, .info-card, .form-card, .content-card, .map-wrap');
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
});
