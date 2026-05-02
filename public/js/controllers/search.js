import { GameModel }     from '../models/GameModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

export class SearchController {
    constructor() {
        this.model         = new GameModel();
        this.baseUrl       = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.query         = new URLSearchParams(window.location.search).get('q') ?? '';
        this.page          = 1;
        this.order         = '-rating';
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
        const btn   = document.getElementById('searchBtn');

        if (input) input.value = this.query;

        btn?.addEventListener('click', () => this._onSearch());
        input?.addEventListener('keydown', e => { if (e.key === 'Enter') this._onSearch(); });

        document.querySelectorAll('.filter-btn').forEach(b => {
            b.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                this.order = b.dataset.order;
                this.page  = 1;
                this._runSearch();
            });
        });
    }

    _onSearch() {
        const q = document.getElementById('searchInput')?.value.trim();
        if (!q) return;
        this.query = q;
        this.page  = 1;
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

    _renderGames(games) {
        document.getElementById('gamesGrid').innerHTML = games.map(g => {
            const img    = g.background_image ?? `${this.baseUrl}/img/no-image.svg`;
            const slug   = g.slug ?? '';
            const rating = g.rating ?? 0;
            const heart = `<button class="game-card__wishlist-btn" data-slug="${slug}" title="Añadir a wishlist">🤍</button>`;
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
                    <div class="game-card__meta">
                        ${g.rating ? `<span>⭐ ${g.rating.toFixed(1)}</span>` : ''}
                        ${g.metacritic ? `<span class="badge badge-meta">${g.metacritic}</span>` : ''}
                    </div>
                    ${g.genres?.length ? `<div class="game-card__tags">${g.genres.slice(0,2).map(x => `<span class="tag">${x.name}</span>`).join('')}</div>` : ''}
                </div>
            </article>`;
        }).join('');
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
                btn.textContent = '❤️';
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
        const article = btn.closest('[data-slug]');
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
                btn.textContent = '🤍';
                btn.classList.remove('in-wishlist');
            } else {
                this.wishlistSlugs.add(slug);
                btn.textContent = '❤️';
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
        document.getElementById('prevBtn')?.addEventListener('click', () => { this.page--; this._runSearch(); window.scrollTo({top:0,behavior:'smooth'}); });
        document.getElementById('nextBtn')?.addEventListener('click', () => { this.page++; this._runSearch(); window.scrollTo({top:0,behavior:'smooth'}); });
    }

    _show(state, msg = '') {
        const states = { loading: 'searchLoading', empty: 'searchEmpty', error: 'searchError', results: 'gamesGrid' };
        ['searchLoading','searchEmpty','searchError','gamesGrid','pagination'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.hidden = true;
        });
        if (state === 'results') {
            document.getElementById('gamesGrid').hidden    = false;
            document.getElementById('pagination').hidden   = false;
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
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
}
