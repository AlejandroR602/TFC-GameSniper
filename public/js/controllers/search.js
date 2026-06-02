import { GameModel }     from '../models/GameModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

const HEART_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;

export class SearchController {
    constructor() {
        this.model         = new GameModel();
        this.baseUrl       = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.query         = new URLSearchParams(window.location.search).get('q') ?? '';
        this.page          = 1;
        this.order         = '-added';
        this.loggedIn      = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
        this.wishlistModel = this.loggedIn ? new WishlistModel() : null;
        this.wishlistSlugs = new Set();
    }

    init() {
        this._bindUI();
        if (this.query) this._runSearch();
    }

    _bindUI() {
        const input = document.getElementById('searchInput');
        const btn = document.getElementById('searchBtn');

        if (input) input.value = this.query;

        btn?.addEventListener('click', () => this._onSearch());
        input?.addEventListener('keydown', e => { if (e.key === 'Enter') this._onSearch(); });

        document.querySelectorAll('#searchFilters .filter-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('#searchFilters .filter-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.order = b.dataset.order;
                this.page = 1;
                this._runSearch();
            });
        });

        const filterRated = document.getElementById('filterRated');
        filterRated?.addEventListener('change', () => this._runSearch());
    }

    _onSearch() {
        const q = document.getElementById('searchInput')?.value.trim();
        if (!q) return;
        this.query = q;
        this.page = 1;
        history.pushState(null, '', `?q=${encodeURIComponent(q)}`);
        this._runSearch();
    }

    async _runSearch() {
        this._show('loading');
        this._setTitle(this.query);

        try {
            const data = await this.model.search(this.query, this.page, this.order);
            if (data?.error) { this._show('error', data.error); return; }
            if (!data?.results?.length) { this._show('empty'); return; }

            document.getElementById('searchFilters').hidden = false;

            // Ocultar juegos sin imagen
            data.results = data.results.filter(g => g.background_image);

            // FILTRO: solo juegos con valoración real
            const filterRated = document.getElementById('filterRated');
            if (filterRated?.checked) {
                data.results = data.results.filter(g => {
                    const hasRawg = g.rating && g.rating > 0;
                    const hasMeta = g.metacritic && g.metacritic > 0;
                    return hasRawg || hasMeta;
                });
            }

            if (!data.results.length) { this._show('empty'); return; }
            this._renderGames(data.results);
            this._renderPagination(this.page, Math.ceil((data.count ?? data.results.length) / 20));
            this._show('results');
            if (this.loggedIn) this._applyWishlistHearts();
            else this._bindGuestHearts();
        } catch (err) {
            console.error('[GameSniper] Error buscando:', err);
            this._show('error', err.message);
        }
    }

    _setTitle(q) {
        document.getElementById('searchTitle').innerHTML =
            `Resultados para <span class="text-accent">"${this._esc(q)}"</span>`;
        document.getElementById('emptyQuery').textContent = q;
    }

    _metaBadge(score) {
        if (!score) return '';
        const cls = score >= 75 ? 'mc--green' : score >= 50 ? 'mc--yellow' : 'mc--red';
        return `<span class="mc-badge ${cls}">MC ${score}</span>`;
    }

    _renderGames(games) {
        const showMeta = this.order === '-metacritic';
        document.getElementById('gamesGrid').innerHTML = games.map(g => {
            const img    = g.background_image ?? `${this.baseUrl}/img/no-image.svg`;
            const slug   = g.slug ?? '';
            const rating = g.rating ? (g.rating * 20).toFixed(0) : (g.metacritic ?? null);
            const heart  = `<button class="game-card__wishlist-btn" data-slug="${slug}" title="Añadir a wishlist">${HEART_SVG}</button>`;
            const ratingHtml = showMeta
                ? (g.metacritic ? this._metaBadge(g.metacritic) : `<span class="no-rating">Sin valoración</span>`)
                : (rating !== null ? `<span class="star-rating">${rating}/100</span>` : `<span class="no-rating">Sin valoración</span>`);
            return `
            <article class="game-card"
                data-slug="${slug}"
                data-name="${this._esc(g.name)}"
                data-img="${this._esc(img)}"
                data-rating="${rating}"
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
                    <div class="game-card__meta">${ratingHtml}</div>
                    ${g.genres?.length ? `<div class="game-card__tags">${g.genres.slice(0, 2).map(x => `<span class="tag">${this._esc(x.name)}</span>`).join('')}</div>` : ''}
                    <div class="game-card__price" data-loaded="false">
                        <span class="price-label">Desde</span>
                        <span class="price-value">—</span>
                    </div>
                </div>
            </article>`;
        }).join('');
        this._bindPriceHover();
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


    _bindGuestHearts() {
        document.querySelectorAll('.game-card__wishlist-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.location.href = `${this.baseUrl}/login`;
            });
        });
    }

    async _applyWishlistHearts() {
        try {
            const items = await this.wishlistModel.getAll();
            this.wishlistSlugs = new Set(items.map(i => i.game_slug));
        } catch {
            this.wishlistSlugs = new Set();
        }

        document.querySelectorAll('.game-card__wishlist-btn').forEach(btn => {
            const slug = btn.dataset.slug;
            if (this.wishlistSlugs.has(slug)) {
                btn.classList.add('in-wishlist');
            }
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                await this._toggleWishlistFromCard(btn);
            });
        });
    }

    async _toggleWishlistFromCard(btn) {
        const slug    = btn.dataset.slug;
        const article = btn.closest('article');
        const name    = article?.dataset.name ?? '';
        const img     = article?.dataset.img  ?? '';
        const rating  = parseFloat(article?.dataset.rating) || 0;

        btn.disabled = true;
        const inWishlist = this.wishlistSlugs.has(slug);
        const result = inWishlist
            ? await this.wishlistModel.remove(slug)
            : await this.wishlistModel.add(slug, name, img, rating);

        if (result.success) {
            if (inWishlist) {
                this.wishlistSlugs.delete(slug);
                btn.classList.remove('in-wishlist');
            } else {
                this.wishlistSlugs.add(slug);
                btn.classList.add('in-wishlist');
            }
        }
        if (typeof showToast === 'function') showToast(result.message);
        btn.disabled = false;
    }

    _renderPagination(current, total) {
        const pag = document.getElementById('pagination');
        if (total <= 1) { pag.innerHTML = ''; return; }
        const prev = current > 1
            ? `<button class="page-btn" id="prevBtn">← Anterior</button>` : '';
        const next = current < total
            ? `<button class="page-btn" id="nextBtn">Siguiente →</button>` : '';
        pag.innerHTML = `${prev}<span class="page-info">Página ${current} de ${total}</span>${next}`;
        document.getElementById('prevBtn')?.addEventListener('click', () => { this.page--; this._runSearch(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
        document.getElementById('nextBtn')?.addEventListener('click', () => { this.page++; this._runSearch(); window.scrollTo({ top: 0, behavior: 'smooth' }); });
    }

    _show(state, msg = '') {
        const states = { loading: 'searchLoading', empty: 'searchEmpty', error: 'searchError', results: 'gamesGrid' };
        ['searchLoading', 'searchEmpty', 'searchError', 'gamesGrid', 'pagination'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        if (state === 'results') {
            document.getElementById('gamesGrid').hidden = false;
            document.getElementById('pagination').hidden = false;
        } else {
            const el = document.getElementById(states[state]);
            if (el) el.hidden = false;
            if (state === 'error' && msg) {
                const msgEl = document.getElementById('searchErrorMsg');
                if (msgEl) msgEl.textContent = msg;
            }
        }
    }

    _esc(s) {
        return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
}
