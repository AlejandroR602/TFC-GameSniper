import { GameModel } from '../models/GameModel.js';

export class HomeController {
    constructor() {
        this.baseUrl = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
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
            const games = await model.fetchTopRated(10);
            console.log('Games recibidos:', games);
            console.log('Total juegos:', games.length);
            this._renderCarouselGames(track, games);
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

    // Reutiliza el mismo markup que _renderGames() perro para el hero
    _renderCarouselGames(track, games) {
        track.innerHTML = games.map(g => {
            const img = g.background_image ?? `${this.baseUrl}/img/no-image.svg`;
            const slug = g.slug ?? '';

            // ⭐ Rating unificado 0–100
            const rating = g.rating ? (g.rating * 20).toFixed(0) : (g.metacritic ?? null);

            return `
            <article class="game-card" onclick="window.location='${this.baseUrl}/game/${slug}'"
                    data-name="${this._esc(g.name)}">
                <div class="game-card__img-wrap">
                    <img src="${img}" alt="${this._esc(g.name)}" loading="lazy"
                        onerror="this.src='${this.baseUrl}/img/no-image.svg'">
                    <div class="game-card__overlay">
                        <a href="${this.baseUrl}/game/${slug}" class="btn btn-primary btn-sm">Ver precios</a>
                    </div>
                </div>
                <div class="game-card__body">
                    <h3 class="game-card__title">${this._esc(g.name)}</h3>
                    <div class="game-card__meta">
                        ${rating !== null 
                            ? `<span class="star-rating">⭐ ${rating}/100</span>` 
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
                    const data = await model.getPrices(card.dataset.name);
                    const deals = data?.deals ?? [];

                    if (!deals.length) {
                        valueEl.textContent = 'Sin datos';
                        priceEl.dataset.loaded = 'true';
                        return;
                    }

                    const best = deals.reduce((min, d) =>
                        d.price.amount < min.price.amount ? d : min
                    );

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
