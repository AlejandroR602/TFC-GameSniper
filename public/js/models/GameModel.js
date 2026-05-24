/**
 * MODEL: GameModel (JavaScript)
 * Gestiona todas las llamadas a las APIs de juegos.
 * Añadido: cálculo de rating unificado 0–100 combinando RAWG + IGDB + Metacritic.
 */
export class GameModel {
    constructor() {
        this.baseUrl = document.querySelector('meta[name="base-url"]')?.content ?? '';
    }

    // ----------------------------------------------------------------
    // RAWG API – Buscar juegos por título
    // ----------------------------------------------------------------
    async search(query, page = 1, ordering = '-rating') {
        if (!query || query.trim() === '') return null;
        const params = new URLSearchParams({ q: query, page, ordering });
        const res = await fetch(`${this.baseUrl}/api/search?${params}`);
        if (!res.ok) throw new Error(`RAWG error: ${res.status}`);
        return await res.json();
    }

    // ----------------------------------------------------------------
    // RAWG API – Detalle de un juego por slug exacto
    // ----------------------------------------------------------------
    async getDetail(slug) {
        const res = await fetch(`${this.baseUrl}/api/game/${encodeURIComponent(slug)}`);
        if (!res.ok) throw new Error(`Error cargando juego: ${res.status}`);
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        return data;
    }

    // ----------------------------------------------------------------
    // IsThereAnyDeal API – Precios del juego por tienda
    // ----------------------------------------------------------------
    async getPrices(title) {
        const res = await fetch(`${this.baseUrl}/api/prices?title=${encodeURIComponent(title)}`);
        if (!res.ok) throw new Error(`ITAD error: ${res.status}`);
        return await res.json();
    }

    // ----------------------------------------------------------------
    // IGDB API (proxy PHP con OAuth2) – Info detallada del juego
    // ----------------------------------------------------------------
    async getIgdbData(title) {
        const res = await fetch(`${this.baseUrl}/api/igdb?title=${encodeURIComponent(title)}`);
        if (!res.ok) throw new Error(`IGDB error: ${res.status}`);
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Cálculo del rating unificado 0–100
    // ----------------------------------------------------------------
    _computeUnifiedRating(rawg, igdb) {
        // RAWG rating (0–5) → normalizado a 0–100
        const rawgNorm = rawg?.rating ? rawg.rating * 20 : null;

        // IGDB rating (0–100)
        const igdbRating = igdb?.rating ?? null;

        // Metacritic (0–100)
        const meta = rawg?.metacritic ?? null;

        // Si no hay ninguna fuente, devolvemos null
        if (rawgNorm === null && igdbRating === null && meta === null) return null;

        // Media ponderada recomendada para el TFC:
        // RAWG 40% — IGDB 40% — Metacritic 20%
        let final = 0;
        let weightSum = 0;

        if (rawgNorm !== null) { final += rawgNorm * 0.4; weightSum += 0.4; }
        if (igdbRating !== null) { final += igdbRating * 0.4; weightSum += 0.4; }
        if (meta !== null) { final += meta * 0.2; weightSum += 0.2; }

        // Ajuste si faltan fuentes (evita bajar la media injustamente)
        final = final / weightSum;

        return Math.round(final); // entero 0–100
    }

    // ----------------------------------------------------------------
    // Método combinado: carga todo para la página de detalle
    // ----------------------------------------------------------------
    async loadFullGameData(slug) {
        const rawg = await this.getDetail(slug);
        if (!rawg) throw new Error('Juego no encontrado');

        // IGDB y precios en paralelo
        const [igdb, prices] = await Promise.allSettled([
            this.getIgdbData(rawg.name),
            this.getPrices(rawg.name),
        ]);

        const igdbData = igdb.status === 'fulfilled' ? igdb.value : null;
        const pricesData = prices.status === 'fulfilled' ? prices.value : null;

        // Añadimos el rating unificado al objeto RAWG
        rawg.rating_final = this._computeUnifiedRating(rawg, igdbData);

        return {
            rawg,
            igdb: igdbData,
            prices: pricesData,
        };
    }

    async fetchTopRated(limit = 10) {
        const params = new URLSearchParams({
            ordering:  '-added',
            page_size: limit,
        });
        const res = await fetch(`${this.baseUrl}/api/genre-games?${params}`);
        if (!res.ok) throw new Error(`RAWG error: ${res.status}`);
        const data = await res.json();
        return data.results ?? [];
    }
}
