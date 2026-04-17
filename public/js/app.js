/**
 * GAMESNIPER – app.js
 * JavaScript global: toast, hamburger, scroll, utilidades.
 */

// ----------------------------------------------------------------
// TOAST NOTIFICATIONS
// ----------------------------------------------------------------
function showToast(message, duration = 3000) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className   = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
}

// ----------------------------------------------------------------
// HAMBURGER MENU (móvil)
// ----------------------------------------------------------------
const hamburger = document.getElementById('hamburger');
const navMenu   = document.getElementById('navMenu');
if (hamburger && navMenu) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('open');
    });
    // Cerrar al hacer click fuera
    document.addEventListener('click', (e) => {
        if (!hamburger.contains(e.target) && !navMenu.contains(e.target)) {
            navMenu.classList.remove('open');
        }
    });
}

// ----------------------------------------------------------------
// PROFILE NAV – sección activa al hacer scroll
// ----------------------------------------------------------------
const profileLinks = document.querySelectorAll('.profile-nav__link[href^="#"]');
if (profileLinks.length) {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                profileLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { rootMargin: '-40% 0px -50% 0px' });

    profileLinks.forEach(link => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) observer.observe(target);
    });
}

// ----------------------------------------------------------------
// BÚSQUEDA GLOBAL (navbar) con debounce
// ----------------------------------------------------------------
const navSearch = document.querySelector('.navbar__search input');
if (navSearch) {
    navSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') navSearch.blur();
    });
}

// ----------------------------------------------------------------
// CONFIRMACIONES DE ELIMINACIÓN (admin)
// ----------------------------------------------------------------
document.querySelectorAll('[data-confirm]').forEach(el => {
    el.addEventListener('click', (e) => {
        if (!confirm(el.dataset.confirm)) e.preventDefault();
    });
});

// ----------------------------------------------------------------
// LAZY IMAGES con Intersection Observer
// ----------------------------------------------------------------
if ('IntersectionObserver' in window) {
    const lazyImages = document.querySelectorAll('img[loading="lazy"]');
    const imgObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                imgObserver.unobserve(img);
            }
        });
    });
    lazyImages.forEach(img => imgObserver.observe(img));
}

// ----------------------------------------------------------------
// ACCESIBILIDAD – cerrar dropdown con Escape
// ----------------------------------------------------------------
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.navbar__dropdown').forEach(d => d.style.display = 'none');
        setTimeout(() => {
            document.querySelectorAll('.navbar__dropdown').forEach(d => d.style.removeProperty('display'));
        }, 300);
    }
});
// ----------------------------------------------------------------
// Control del NAVBAR
// ----------------------------------------------------------------
const userMenu = document.querySelector('.navbar__user');

userMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  userMenu.classList.toggle('open');
});

// Cerrar al hacer click fuera
document.addEventListener('click', () => {
  userMenu.classList.remove('open');
});