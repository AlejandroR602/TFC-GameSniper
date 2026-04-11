/**
 * MODEL: WishlistModel (JavaScript)
 * Gestiona la lista de deseos del usuario.
 * Se comunica con los endpoints PHP que acceden a MySQL.
 */
 export class WishlistModel {
    constructor() {
        this.baseUrl   = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    }

    // ----------------------------------------------------------------
    // Obtener la wishlist completa del usuario logueado
    // ----------------------------------------------------------------
    async getAll() {
        const res = await fetch(`${this.baseUrl}/api/user/wishlist`);
        if (!res.ok) return [];
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Comprobar si un juego está en la wishlist
    // ----------------------------------------------------------------
    async check(slug) {
        const res = await fetch(`${this.baseUrl}/api/wishlist/check?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) return false;
        const data = await res.json();
        return data.inWishlist === true;
    }

    // ----------------------------------------------------------------
    // Añadir un juego a la wishlist
    // ----------------------------------------------------------------
    async add(slug, name, image, rating = 0) {
        const res = await fetch(`${this.baseUrl}/api/wishlist/add`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ slug, name, image, rating, csrf_token: this.csrfToken }),
        });
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Eliminar un juego de la wishlist
    // ----------------------------------------------------------------
    async remove(slug) {
        const res = await fetch(`${this.baseUrl}/api/wishlist/remove`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ slug, csrf_token: this.csrfToken }),
        });
        return await res.json();
    }
}
