import { GameModel }     from '../models/GameModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

const HEART_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
const PAGE_SIZE = 20;

export class GenresController {
    constructor() {
        this.baseUrl       = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn      = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
        this.wishlistModel = this.loggedIn ? new WishlistModel() : null;
        this.wishlistSlugs = new Set();
        this.gameModel     = new GameModel();
        this.currentGenre  = null;
        this.currentOrder  = '-added';
        // Buffer state
        this._buffer   = [];
        this._apiPage  = 0;
        this._apiDone  = false;
        this._history  = [];
        this._uiPage   = 1;
    }

    init() {
        document.getElementById('backToGenresBtn').addEventListener('click', () => {
            history.pushState(null, '', window.location.pathname);
            this._showGenresView();
        });

        window.addEventListener('popstate', () => {
            const slug = new URLSearchParams(window.location.search).get('genre');
            slug ? this._openGenre(slug) : this._showGenresView();
        });

        const slug = new URLSearchParams(window.location.search).get('genre');
        if (slug) {
            this._loadGenres().then(() => this._openGenre(slug));
        } else {
            this._loadGenres();
        }
    }

    // ── Géneros ───────────────────────────────────────────────────

    async _loadGenres() {
        try {
            const r    = await fetch(`${this.baseUrl}/api/genres`);
            const data = await r.json();
            document.getElementById('genresLoading').hidden = true;
            if (!data?.results?.length) {
                document.getElementById('genresError').hidden = false;
                return;
            }
            this._renderGenres(data.results);
        } catch {
            document.getElementById('genresLoading').hidden = true;
            document.getElementById('genresError').hidden   = false;
        }
    }

    _renderGenres(genres) {
        const grid = document.getElementById('genresGrid');
        grid.innerHTML = genres.map(g => {
            const img = g.image_background ?? `${this.baseUrl}/img/no-image.svg`;
            return `
            <article class="genre-card" data-slug="${g.slug}" data-name="${this._esc(g.name)}"
                     tabindex="0" role="button" aria-label="Ver juegos de ${this._esc(g.name)}">
                <div class="genre-card__img-wrap">
                    <img src="${img}" alt="${this._esc(g.name)}" loading="lazy"
                         onerror="this.src='${this.baseUrl}/img/no-image.svg'">
                    <div class="genre-card__overlay"></div>
                </div>
                <div class="genre-card__body">
                    <h3 class="genre-card__name">${this._esc(g.name)}</h3>
                    <span class="genre-card__count">${g.games_count?.toLocaleString('es-ES') ?? '—'} juegos</span>
                </div>
            </article>`;
        }).join('');

        grid.hidden = false;

        grid.addEventListener('click', e => {
            const card = e.target.closest('.genre-card');
            if (!card) return;
            history.pushState(null, '', `?genre=${encodeURIComponent(card.dataset.slug)}`);
            this._openGenre(card.dataset.slug, card.dataset.name);
        });

        grid.addEventListener('keydown', e => {
            if (e.key === 'Enter' || e.key === ' ') e.target.closest('.genre-card')?.click();
        });
    }

    // ── Detalle de género ─────────────────────────────────────────

    _openGenre(slug, name = '') {
        this.currentGenre = slug;
        this.currentOrder = '-added';
        this._resetPager();

        const displayName = name
            || document.querySelector(`.genre-card[data-slug="${slug}"]`)?.dataset.name
            || slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

        document.getElementById('genreDetailTitle').textContent = displayName;

        document.querySelectorAll('#genreDetailFilters .filter-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });
        const cb = document.getElementById('genreDetailFilterRated');
        if (cb) cb.checked = false;

        this._bindDetailFilters();
        this._showDetailView();
        this._loadPage(1);
    }

    _resetPager() {
        this._buffer  = [];
        this._apiPage = 0;
        this._apiDone = false;
        this._history = [];
        this._uiPage  = 1;
    }

    _bindDetailFilters() {
        document.querySelectorAll('#genreDetailFilters .filter-btn').forEach(btn => {
            const fresh = btn.cloneNode(true);
            btn.replaceWith(fresh);
            fresh.addEventListener('click', () => {
                document.querySelectorAll('#genreDetailFilters .filter-btn').forEach(b => b.classList.remove('active'));
                fresh.classList.add('active');
                this.currentOrder = fresh.dataset.order;
                this._resetPager();
                this._loadPage(1);
            });
        });

        const cb = document.getElementById('genreDetailFilterRated');
        const freshCb = cb.cloneNode(true);
        cb.replaceWith(freshCb);
        freshCb.addEventListener('change', () => {
            const page = this._uiPage;
            const raw  = this._history[page - 1];
            if (raw) this._renderPage(raw, page);
        });
    }

    async _fetchUntilFull() {
        while (this._buffer.length < PAGE_SIZE && !this._apiDone) {
            this._apiPage++;
            const params = new URLSearchParams({
                genre:    this.currentGenre,
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
        document.getElementById('genreDetailLoading').hidden = false;
        document.getElementById('genreDetailEmpty').hidden   = true;
        document.getElementById('genreDetailGrid').innerHTML = '';
        document.getElementById('genreDetailPagination').innerHTML = '';

        if (this._history[page - 1]) {
            document.getElementById('genreDetailLoading').hidden = true;
            this._renderPage(this._history[page - 1], page);
            return;
        }

        while (this._history.length < page) {
            await this._fetchUntilFull();
            if (!this._buffer.length) break;
            const slice = this._buffer.splice(0, PAGE_SIZE);
            this._history.push(slice);
        }

        document.getElementById('genreDetailLoading').hidden = true;

        const games = this._history[page - 1];
        if (!games?.length) {
            document.getElementById('genreDetailEmpty').hidden = false;
            return;
        }

        this._renderPage(games, page);
    }

    _renderPage(games, page) {
        const onlyRated = document.getElementById('genreDetailFilterRated')?.checked ?? false;
        const filtered  = onlyRated
            ? games.filter(g => g.rating > 0 || g.metacritic > 0)
            : games;

        if (!filtered.length) {
            document.getElementById('genreDetailEmpty').hidden        = false;
            document.getElementById('genreDetailGrid').innerHTML      = '';
            document.getElementById('genreDetailPagination').innerHTML = '';
            return;
        }

        document.getElementById('genreDetailEmpty').hidden = true;
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
        document.getElementById('genreDetailGrid').innerHTML = games.map(g => {
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
        const el   = document.getElementById('genreDetailPagination');
        const prev = page > 1  ? `<button class="page-btn" data-page="${page - 1}">‹ Anterior</button>` : '';
        const next = hasNext   ? `<button class="page-btn" data-page="${page + 1}">Siguiente ›</button>` : '';
        if (!prev && !next) { el.innerHTML = ''; return; }
        el.innerHTML = prev + `<span class="page-info">Página ${page}</span>` + next;
        el.querySelectorAll('.page-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                this._loadPage(parseInt(btn.dataset.page));
            });
        });
    }

    // ── UI helpers ────────────────────────────────────────────────

    _showGenresView() {
        document.getElementById('genresView').hidden      = false;
        document.getElementById('genreDetailView').hidden = true;
    }

    _showDetailView() {
        document.getElementById('genresView').hidden      = true;
        document.getElementById('genreDetailView').hidden = false;
    }

    // ── Wishlist ──────────────────────────────────────────────────

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

    // ── Price hover ───────────────────────────────────────────────

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
