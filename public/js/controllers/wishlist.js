import { WishlistModel } from '../models/WishlistModel.js';

export class WishlistController {
    constructor() {
        this.model    = new WishlistModel();
        this.baseUrl  = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
    }

    async init() {
        if (!this.loggedIn) {
            window.location.href = `${this.baseUrl}/login`;
            return;
        }

        const exploreBtn = document.getElementById('exploreBtn');
        if (exploreBtn) exploreBtn.href = `${this.baseUrl}/search`;

        try {
            const items = await this.model.getAll();
            document.getElementById('wishlistLoading').hidden = true;

            if (!items.length) {
                document.getElementById('wishlistEmpty').hidden = false;
                document.getElementById('wishlistCount').textContent = '0 juegos';
                return;
            }

            this._updateCount(items.length);
            this._renderItems(items);
            document.getElementById('wishlistGrid').hidden = false;
            this._repairMissingImages(items);
        } catch {
            document.getElementById('wishlistLoading').hidden = true;
            document.getElementById('wishlistEmpty').hidden   = false;
            document.getElementById('wishlistCount').textContent = '0 juegos';
        }
    }

    _renderItems(items) {
        const grid = document.getElementById('wishlistGrid');
        grid.innerHTML = items.map(g => {
            const img    = g.game_image || `${this.baseUrl}/img/no-image.svg`;
            const slug   = this._esc(g.game_slug);
            const name   = this._esc(g.game_name);
            const rating = parseFloat(g.game_rating) || 0;
            return `
            <article class="game-card" data-slug="${slug}" data-href="${this.baseUrl}/game/${slug}">
                <div class="game-card__img-wrap">
                    <img src="${img}" alt="${name}" loading="lazy"
                         onerror="this.src='${this.baseUrl}/img/no-image.svg'">
                    <div class="game-card__overlay">
                        <a href="${this.baseUrl}/game/${slug}" class="btn btn-primary btn-sm">Ver precios</a>
                    </div>
                </div>
                <div class="game-card__body">
                    <h3 class="game-card__title">${name}</h3>
                    <div class="game-card__meta">
                        ${rating ? `<span>${rating.toFixed(1)}</span>` : ''}
                    </div>
                    <button class="btn btn-outline btn-sm wishlist-remove" data-slug="${g.game_slug}" style="margin-top:.5rem">
                        Quitar
                    </button>
                </div>
            </article>`;
        }).join('');

        grid.addEventListener('click', async (e) => {
            const removeBtn = e.target.closest('.wishlist-remove');
            if (removeBtn) {
                e.stopPropagation();
                removeBtn.disabled = true;
                const result = await this.model.remove(removeBtn.dataset.slug);
                if (result.success) {
                    removeBtn.closest('article').remove();
                    const remaining = grid.querySelectorAll('article').length;
                    if (!remaining) {
                        grid.hidden = true;
                        document.getElementById('wishlistEmpty').hidden = false;
                    }
                    this._updateCount(remaining);
                } else {
                    removeBtn.disabled = false;
                }
                if (typeof showToast === 'function') showToast(result.message);
                return;
            }
            const card = e.target.closest('.game-card[data-href]');
            if (card && !e.target.closest('a')) window.location.href = card.dataset.href;
        });
    }

    async _repairMissingImages(items) {
        const missing = items.filter(g => !g.game_image);
        if (!missing.length) return;
        await Promise.all(missing.map(async g => {
            try {
                const res  = await fetch(`${this.baseUrl}/api/game/${encodeURIComponent(g.game_slug)}`);
                const game = await res.json();
                const url  = game.background_image;
                if (!url) return;
                const imgEl = document.querySelector(`.game-card[data-slug="${g.game_slug}"] img`);
                if (imgEl) imgEl.src = url;
                await this.model.updateImage(g.game_slug, url);
            } catch { /* silent */ }
        }));
    }

    _updateCount(n) {
        document.getElementById('wishlistCount').textContent = `${n} juego${n !== 1 ? 's' : ''}`;
    }

    _esc(s) {
        return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }
}
