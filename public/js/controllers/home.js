import { GameModel }     from '../models/GameModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

const HEART_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

export class HomeController {
    constructor() {
        this.baseUrl       = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn      = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
        this.wishlistModel = this.loggedIn ? new WishlistModel() : null;
        this.wishlistSlugs = new Set();
    }

    init() {
        this._bindSearch();
        this._bindPopularTags();
        this._setupCta();
        this._Carousel();
    }

    _bindSearch() {
        const input = document.getElementById('heroSearchInput');
        const btn = document.getElementById('heroSearchBtn');

        const go = () => {
            const q = input?.value.trim();
            if (q) window.location.href = `${this.baseUrl}/search?q=${encodeURIComponent(q)}`;
        };

        btn?.addEventListener('click', go);
        input?.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }

    _bindPopularTags() {
        document.querySelectorAll('.hero__tags a[data-search]').forEach(tag => {
            tag.href = `${this.baseUrl}/search?q=${encodeURIComponent(tag.dataset.search)}`;
        });
    }

    _setupCta() {
        const cta = document.getElementById('ctaSection');
        if (this.loggedIn && cta) {
            cta.hidden = true;
            return;
        }
        const reg = document.getElementById('ctaRegister');
        const login = document.getElementById('ctaLogin');
        if (reg) reg.href = `${this.baseUrl}/register`;
        if (login) login.href = `${this.baseUrl}/login`;
    }

    // Carousel
    async _Carousel() {
        const track = document.getElementById('heroCarouselTrack');
        const prevBtn = document.getElementById('carouselPrev');
        const nextBtn = document.getElementById('carouselNext');
        if (!track) return;

        try {
            const model = new GameModel();
            const games = (await model.fetchTopRated(16)).filter(g => g.background_image).slice(0, 10);
            this._renderCarouselGames(track, games);
            await this._applyCarouselHearts(track);
        } catch (e) {
            console.error('Carousel error:', e);
            document.getElementById('heroCarousel').style.display = 'none';
            return;
        }

        const CARD_W = (track.firstElementChild?.offsetWidth ?? 200) + 16;
        const VISIBLE = Math.floor(track.parentElement.offsetWidth / CARD_W);
        let idx = 0;

        const update = () => {
            const maxIdx = track.children.length - VISIBLE;
            track.style.transform = `translateX(-${idx * CARD_W}px)`;
            prevBtn.disabled = idx === 0;
            nextBtn.disabled = idx >= maxIdx;
        };

        prevBtn.addEventListener('click', () => { idx--; update(); });
        nextBtn.addEventListener('click', () => { idx++; update(); });
        update();
    }

    _renderCarouselGames(track, games) {
        track.innerHTML = games.map(g => {
            const img  = g.background_image ?? `${this.baseUrl}/img/no-image.svg`;
            const slug = g.slug ?? '';

            // Rating unificado 0–100
            const rating = g.rating ? (g.rating * 20).toFixed(0) : (g.metacritic ?? null);

            return `
            <article class="game-card"
                    data-slug="${slug}"
                    data-name="${this._esc(g.name)}"
                    data-img="${this._esc(img)}"
                    data-rating="${rating ?? 0}"
                    onclick="window.location='${this.baseUrl}/game/${slug}'">
                <div class="game-card__img-wrap">
                    <img src="${img}" alt="${this._esc(g.name)}" loading="lazy"
                        onerror="this.src='${this.baseUrl}/img/no-image.svg'">
                    <div class="game-card__overlay">
                        <a href="${this.baseUrl}/game/${slug}" class="btn btn-primary btn-sm">Ver precios</a>
                    </div>
                    <button class="game-card__wishlist-btn" data-slug="${slug}" title="Añadir a wishlist">${HEART_SVG}</button>
                </div>
                <div class="game-card__body">
                    <h3 class="game-card__title">${this._esc(g.name)}</h3>
                    <div class="game-card__meta">
                        ${rating !== null
                            ? `<span class="star-rating">${rating}/100</span>`
                            : `<span class="no-rating">Sin valoración</span>`}
                    </div>
                    ${g.genres?.length
                        ? `<div class="game-card__tags">
                            ${g.genres.slice(0, 2).map(x => `<span class="tag">${x.name}</span>`).join('')}
                        </div>`
                        : ''}
                    <div class="game-card__price" data-loaded="false">
                        <span class="price-label">Desde</span>
                        <span class="price-value">—</span>
                    </div>
                </div>
            </article>`;
        }).join('');

        this._bindPriceHover();
    }

    async _applyCarouselHearts(track) {
        if (!this.loggedIn) {
            track.querySelectorAll('.game-card__wishlist-btn').forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    window.location.href = `${this.baseUrl}/login`;
                });
            });
            return;
        }
        try {
            const items = await this.wishlistModel.getAll();
            this.wishlistSlugs = new Set(items.map(i => i.game_slug));
        } catch {
            this.wishlistSlugs = new Set();
        }
        track.querySelectorAll('.game-card__wishlist-btn').forEach(btn => {
            const slug = btn.dataset.slug;
            if (this.wishlistSlugs.has(slug)) btn.classList.add('in-wishlist');
            btn.addEventListener('click', async e => {
                e.stopPropagation();
                const inWishlist = this.wishlistSlugs.has(slug);
                const article = btn.closest('article');
                btn.disabled = true;
                const result = inWishlist
                    ? await this.wishlistModel.remove(slug)
                    : await this.wishlistModel.add(
                        slug,
                        article?.dataset.name ?? '',
                        article?.dataset.img  ?? '',
                        parseFloat(article?.dataset.rating) || 0
                    );
                if (result.success) {
                    if (inWishlist) { this.wishlistSlugs.delete(slug); btn.classList.remove('in-wishlist'); }
                    else            { this.wishlistSlugs.add(slug);    btn.classList.add('in-wishlist');    }
                }
                if (typeof showToast === 'function') showToast(result.message);
                btn.disabled = false;
            });
        });
    }

    _esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    _bindPriceHover() {
        const model = new GameModel();
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('mouseenter', async () => {
                const priceEl = card.querySelector('.game-card__price');
                if (!priceEl || priceEl.dataset.loaded !== 'false') return;
                priceEl.dataset.loaded = 'loading';
                const valueEl = priceEl.querySelector('.price-value');
                valueEl.textContent = '...';
                try {
                    const data  = await model.getPrices(card.dataset.name);
                    const deals = data?.deals ?? [];
                    if (!deals.length) { valueEl.textContent = 'Sin datos'; priceEl.dataset.loaded = 'true'; return; }
                    const best  = deals.reduce((min, d) => d.price.amount < min.price.amount ? d : min);
                    valueEl.textContent = `${best.price.amount.toFixed(2)} €`;
                    valueEl.style.color = 'var(--success)';
                    priceEl.dataset.loaded = 'true';
                } catch {
                    valueEl.textContent = 'Sin datos';
                    priceEl.dataset.loaded = 'true';
                }
            }, { passive: true });
        });
    }
}
