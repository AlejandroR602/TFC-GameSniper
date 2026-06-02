import { GameModel }     from '../models/GameModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

const HEART_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const PAGE_SIZE = 20;

export class ExploreController {
    constructor() {
        this.baseUrl       = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn      = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
        this.wishlistModel = this.loggedIn ? new WishlistModel() : null;
        this.wishlistSlugs = new Set();
        this.gameModel     = new GameModel();
        this.currentOrder  = '-added';
        // Buffer state
        this._buffer   = [];
        this._apiPage  = 0;
        this._apiDone  = false;
        this._history  = [];   // history[i] = array of 20 games for user page i+1
        this._uiPage   = 1;
    }

    init() {
        this._bindFilters();
        this._loadPage(1);
    }

    _resetPager() {
        this._buffer  = [];
        this._apiPage = 0;
        this._apiDone = false;
        this._history = [];
        this._uiPage  = 1;
    }

    _bindFilters() {
        document.querySelectorAll('#exploreFilters .filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('#exploreFilters .filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentOrder = btn.dataset.order;
                this._resetPager();
                this._loadPage(1);
            });
        });

        document.getElementById('exploreFilterRated')?.addEventListener('change', () => {
            // Re-render current page from history with new filter
            const page = this._uiPage;
            const raw  = this._history[page - 1];
            if (raw) this._renderPage(raw, page);
        });
    }

    async _fetchUntilFull() {
        while (this._buffer.length < PAGE_SIZE && !this._apiDone) {
            this._apiPage++;
            const params = new URLSearchParams({
                page:     this._apiPage,
                ordering: this.currentOrder,
            });
            try {
                const r    = await fetch(`${this.baseUrl}/api/genre-games?${params}`);
                const data = await r.json();
                const results = (data?.results ?? []).filter(g => g.background_image);
                this._buffer.push(...results);
                if (!data.next) this._apiDone = true;
            } catch {
                this._apiDone = true;
            }
        }
    }

    async _loadPage(page) {
        this._uiPage = page;
        document.getElementById('exploreLoading').hidden = false;
        document.getElementById('exploreEmpty').hidden   = true;
        document.getElementById('exploreGamesGrid').innerHTML  = '';
        document.getElementById('explorePagination').innerHTML = '';

        // Already have this page cached
        if (this._history[page - 1]) {
            document.getElementById('exploreLoading').hidden = true;
            this._renderPage(this._history[page - 1], page);
            return;
        }

        // Fill pages we haven't built yet up to the requested one
        while (this._history.length < page) {
            await this._fetchUntilFull();
            if (!this._buffer.length) break;
            const slice = this._buffer.splice(0, PAGE_SIZE);
            this._history.push(slice);
        }

        document.getElementById('exploreLoading').hidden = true;

        const games = this._history[page - 1];
        if (!games?.length) {
            document.getElementById('exploreEmpty').hidden = false;
            return;
        }

        this._renderPage(games, page);
    }

    _renderPage(games, page) {
        const onlyRated = document.getElementById('exploreFilterRated')?.checked ?? false;
        const filtered  = onlyRated
            ? games.filter(g => g.rating > 0 || g.metacritic > 0)
            : games;

        if (!filtered.length) {
            document.getElementById('exploreEmpty').hidden        = false;
            document.getElementById('exploreGamesGrid').innerHTML = '';
            document.getElementById('explorePagination').innerHTML = '';
            return;
        }

        document.getElementById('exploreEmpty').hidden = true;
        this._renderGames(filtered);

        const hasNext = !this._apiDone || this._buffer.length >= PAGE_SIZE || this._history.length > page;
        this._renderPagination(page, hasNext);
    }

    _metaBadge(score) {
        if (!score) return '';
        const cls = score >= 75 ? 'mc--green' : score >= 50 ? 'mc--yellow' : 'mc--red';
        return `<span class="mc-badge ${cls}">MC ${score}</span>`;
    }

    _renderGames(games) {
        const showMeta = this.currentOrder === '-metacritic';
        document.getElementById('exploreGamesGrid').innerHTML = games.map(g => {
            const img    = g.background_image ?? `${this.baseUrl}/img/no-image.svg`;
            const slug   = g.slug ?? '';
            const rating = g.rating ? (g.rating * 20).toFixed(0) : (g.metacritic ?? null);
            const heart  = `<button class="game-card__wishlist-btn" data-slug="${slug}" title="Añadir a wishlist">${HEART_SVG}</button>`;
            const meta   = showMeta ? this._metaBadge(g.metacritic) : '';
            return `
            <article class="game-card"
                data-slug="${slug}" data-name="${this._esc(g.name)}"
                data-img="${this._esc(img)}" data-rating="${rating}"
                onclick="window.location='${this.baseUrl}/game/${slug}'">
                <div class="game-card__img-wrap">
                    <img src="${img}" alt="${this._esc(g.name)}" loading="lazy"
                         onerror="this.src='${this.baseUrl}/img/no-image.svg'">
                    <div class="game-card__overlay">
                        <a href="${this.baseUrl}/game/${slug}" class="btn btn-primary btn-sm">Ver precios</a>
                    </div>
                    ${heart}
                </div>
                <div class="game-card__body">
                    <h3 class="game-card__title">${this._esc(g.name)}</h3>
                    <div class="game-card__meta">
                        ${rating !== null
                            ? `<span class="star-rating">${rating}/100</span>`
                            : `<span class="no-rating">Sin valoración</span>`}
                        ${meta}
                    </div>
                    ${g.genres?.length ? `<div class="game-card__tags">${g.genres.slice(0, 2).map(x => `<span class="tag">${this._esc(x.name)}</span>`).join('')}</div>` : ''}
                    <div class="game-card__price" data-loaded="false">
                        <span class="price-label">Desde</span>
                        <span class="price-value">—</span>
                    </div>
                </div>
            </article>`;
        }).join('');

        this._bindPriceHover();
        if (this.loggedIn) this._applyWishlistHearts();
        else               this._bindGuestHearts();
    }

    _renderPagination(page, hasNext) {
        const el   = document.getElementById('explorePagination');
        const prev = page > 1   ? `<button class="page-btn" data-page="${page - 1}">‹ Anterior</button>` : '';
        const next = hasNext    ? `<button class="page-btn" data-page="${page + 1}">Siguiente ›</button>` : '';
        if (!prev && !next) { el.innerHTML = ''; return; }
        el.innerHTML = prev + `<span class="page-info">Página ${page}</span>` + next;
        el.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this._loadPage(parseInt(btn.dataset.page));
            });
        });
    }

    _bindGuestHearts() {
        document.querySelectorAll('.game-card__wishlist-btn').forEach(btn => {
            btn.addEventListener('click', e => { e.stopPropagation(); window.location.href = `${this.baseUrl}/login`; });
        });
    }

    async _applyWishlistHearts() {
        if (!this.wishlistSlugs.size) {
            try {
                const items = await this.wishlistModel.getAll();
                this.wishlistSlugs = new Set(items.map(i => i.game_slug));
            } catch { /* keep empty */ }
        }
        document.querySelectorAll('.game-card__wishlist-btn').forEach(btn => {
            if (this.wishlistSlugs.has(btn.dataset.slug)) btn.classList.add('in-wishlist');
            btn.addEventListener('click', async e => { e.stopPropagation(); await this._toggleWishlist(btn); });
        });
    }

    async _toggleWishlist(btn) {
        const slug = btn.dataset.slug;
        const art  = btn.closest('article');
        btn.disabled = true;
        const inWl   = this.wishlistSlugs.has(slug);
        const result = inWl
            ? await this.wishlistModel.remove(slug)
            : await this.wishlistModel.add(slug, art?.dataset.name ?? '', art?.dataset.img ?? '', parseFloat(art?.dataset.rating) || 0);
        if (result?.success !== false) {
            inWl ? this.wishlistSlugs.delete(slug) : this.wishlistSlugs.add(slug);
            btn.classList.toggle('in-wishlist', !inWl);
        }
        btn.disabled = false;
    }

    _bindPriceHover() {
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('mouseenter', async () => {
                const priceEl = card.querySelector('.game-card__price');
                if (!priceEl || priceEl.dataset.loaded !== 'false') return;
                priceEl.dataset.loaded = 'loading';
                const valueEl = priceEl.querySelector('.price-value');
                valueEl.textContent = '...';
                try {
                    const data  = await this.gameModel.getPrices(card.dataset.name);
                    const deals = data?.deals ?? [];
                    if (!deals.length) { valueEl.textContent = 'Sin datos'; priceEl.dataset.loaded = 'true'; return; }
                    const best  = deals.reduce((min, d) => d.price.amount < min.price.amount ? d : min);
                    valueEl.textContent = `${best.price.amount.toFixed(2)} €`;
                    valueEl.style.color = 'var(--success)';
                } catch { valueEl.textContent = 'Sin datos'; }
                priceEl.dataset.loaded = 'true';
            }, { passive: true });
        });
    }

    _esc(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
}
