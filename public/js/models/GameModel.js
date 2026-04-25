/**
 * MODEL: GameModel (JavaScript)
 * Gestiona todas las llamadas a las APIs de juegos.
 * Actúa como capa de datos en el cliente (MVC – Modelo).
 * Las peticiones reales a APIs externas se proxyan por PHP
 * para mantener las claves seguras en el servidor.
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
    // RAWG API – Detalle de un juego por slug
    // ----------------------------------------------------------------
    async getDetail(slug) {
        const res = await fetch(`${this.baseUrl}/api/search?q=${encodeURIComponent(slug)}&page=1`);
        if (!res.ok) throw new Error(`Error cargando juego: ${res.status}`);
        const data = await res.json();
        // Intentar encontrar el juego exacto por slug, si no el primero
        return data.results?.find(g => g.slug === slug) ?? data.results?.[0] ?? null;
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
    // Método combinado: carga todo para la página de detalle
    // ----------------------------------------------------------------
    async loadFullGameData(slug) {
        const rawg = await this.getDetail(slug);
        if (!rawg) throw new Error('Juego no encontrado');

        // IGDB y precios en paralelo para mayor velocidad
        const [igdb, prices] = await Promise.allSettled([
            this.getIgdbData(rawg.name),
            this.getPrices(rawg.name),
        ]);

        return {
            rawg,
            igdb: igdb.status === 'fulfilled' ? igdb.value : null,
            prices: prices.status === 'fulfilled' ? prices.value : null,
        };
    }

    async fetchTopRated(limit = 10) {
        const params = new URLSearchParams({
            ordering: '-rating',
            metacritic: '80,100',
            page_size: limit,
            exclude_additions: true,
        });
        const res = await fetch(`${this.baseUrl}/api/search?${params}`);
        if (!res.ok) throw new Error(`RAWG error: ${res.status}`);
        const data = await res.json();
        return data.results ?? [];
    }
}
