import { GameModel }     from '../models/GameModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

export class GameDetailController {
    constructor() {
        this.gameModel     = new GameModel();
        this.wishlistModel = new WishlistModel();
        this.baseUrl       = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn      = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
        this.slug          = window.location.pathname.split('/').filter(Boolean).pop();
        this.gameData      = null;
        this.inWishlist    = false;
    }

    async init() {
        try {
            const { rawg, igdb, prices } = await this.gameModel.loadFullGameData(this.slug);
            this.gameData = rawg;

            this._renderRawg(rawg);
            if (igdb) this._renderIgdb(igdb);
            this._renderPrices(prices);

            document.getElementById('gameLoading').hidden = true;
            document.getElementById('gameContent').hidden = false;

            // Comprobar wishlist si está logueado
            if (this.loggedIn) {
                this.inWishlist = await this.wishlistModel.check(this.slug);
                this._updateWishlistBtn();
            }
            document.getElementById('wishlistBtn').addEventListener('click', () => this._toggleWishlist());

        } catch {
            document.getElementById('gameLoading').hidden = true;
            document.getElementById('gameError').hidden   = false;
        }
    }

    _renderRawg(g) {
        document.getElementById('gameName').textContent = g.name;
        document.getElementById('gameCover').src        = g.background_image ?? `${this.baseUrl}/img/no-image.svg`;
        document.getElementById('gameCover').alt        = g.name;
        document.getElementById('gameBackdrop').style.backgroundImage = `url('${g.background_image ?? ''}')`;

        if (g.rating) document.getElementById('gameRating').innerHTML = `⭐ <strong>${g.rating.toFixed(1)}</strong>/5`;
        if (g.metacritic) document.getElementById('gameRating').innerHTML += ` &nbsp;<span class="badge badge-meta">${g.metacritic}</span>`;
        if (g.released)   document.getElementById('gameRelease').textContent = `📅 ${new Date(g.released).toLocaleDateString('es-ES')}`;
        if (g.genres?.length) document.getElementById('gameGenres').innerHTML = g.genres.map(x => `<span class="tag">${x.name}</span>`).join('');
        if (g.platforms?.length) document.getElementById('gamePlatforms').innerHTML = g.platforms.slice(0,4).map(p => `<span class="platform-tag">${p.platform.name}</span>`).join('');
    }

    _renderIgdb(igdb) {
        if (igdb.summary) document.getElementById('gameSummary').textContent = igdb.summary;
        if (igdb.involved_companies?.length) {
            const devs = igdb.involved_companies.map(c => c.company?.name).filter(Boolean).join(', ');
            document.getElementById('gameDev').textContent = `🏢 ${devs}`;
        }
        if (igdb.cover?.url) document.getElementById('gameCover').src = igdb.cover.url;
        if (igdb.screenshots?.length) {
            const grid = document.getElementById('screenshotsGrid');
            grid.innerHTML = igdb.screenshots.slice(0,6).map(s => {
                const url = (s.url.startsWith('//') ? 'https:' : '') + s.url.replace('t_thumb','t_screenshot_big');
                return `<a href="${url}" target="_blank"><img src="${url}" alt="Screenshot" loading="lazy"></a>`;
            }).join('');
            document.getElementById('screenshotsSection').hidden = false;
        }
    }

    _renderPrices(data) {
        document.getElementById('pricesLoading').hidden = true;
        const deals = data?.deals ?? [];
        if (!deals.length) { document.getElementById('pricesEmpty').hidden = false; return; }

        deals.sort((a,b) => (a.price?.amount ?? 999) - (b.price?.amount ?? 999));
        document.getElementById('pricesGrid').hidden = false;
        document.getElementById('pricesGrid').innerHTML = deals.map((d, i) => {
            const price = d.price?.amount != null ? `${d.price.amount.toFixed(2)} €` : 'N/D';
            const reg   = d.regular?.amount != null ? `<s>${d.regular.amount.toFixed(2)} €</s>` : '';
            const cut   = d.cut ? `<span class="price-cut">-${d.cut}%</span>` : '';
            return `
            <div class="price-card ${i===0?'price-card--best':''}">
                <div class="price-card__shop">${d.shop?.name ?? 'Tienda'}</div>
                ${i===0 ? '<span class="badge badge-best">💰 Mejor precio</span>' : ''}
                <div class="price-card__price">${price}</div>
                ${reg||cut ? `<div class="price-card__regular">${reg} ${cut}</div>` : ''}
                <a href="${d.url ?? '#'}" target="_blank" rel="noopener" class="btn btn-primary btn-sm">Ir a la tienda →</a>
            </div>`;
        }).join('');
    }

    async _toggleWishlist() {
        if (!this.loggedIn) { window.location.href = `${this.baseUrl}/login`; return; }
        const btn = document.getElementById('wishlistBtn');
        btn.disabled = true;
        const result = this.inWishlist
            ? await this.wishlistModel.remove(this.slug)
            : await this.wishlistModel.add(this.slug, this.gameData?.name ?? '', this.gameData?.background_image ?? '', this.gameData?.rating ?? 0);
        if (result.success) { this.inWishlist = !this.inWishlist; this._updateWishlistBtn(); }
        if (typeof showToast === 'function') showToast(result.message);
        btn.disabled = false;
    }

    _updateWishlistBtn() {
        const btn = document.getElementById('wishlistBtn');
        btn.className   = this.inWishlist ? 'btn btn-outline' : 'btn btn-primary';
        btn.textContent = this.inWishlist ? '❤️ En tu wishlist' : '🤍 Añadir a wishlist';
    }
}
