document.addEventListener('DOMContentLoaded', () => {
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

    // Reveal-on-scroll
    const revealEls = document.querySelectorAll('.Min-Sec, .sermon-card, .fb-feed-wrap, .table-3d, .form-section, .pastor-card, .vm-card, .feature-box, .info-card, .form-card, .content-card, .map-wrap');
    const io = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = 1;
                entry.target.style.transform = 'translateY(0)';
                io.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12 });
    revealEls.forEach(el => {
        el.style.opacity = 0;
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
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
