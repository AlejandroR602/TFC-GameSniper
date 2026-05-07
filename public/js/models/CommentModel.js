/**
 * MODEL: CommentModel (JavaScript)
 * Gestiona comentarios: lectura pública, escritura autenticada y moderación admin.
 */
export class CommentModel {
    constructor() {
        this.baseUrl = document.querySelector('meta[name="base-url"]')?.content ?? '';
    }

    // Comentarios aprobados de un juego (público)
    async getByGame(slug) {
        const res = await fetch(`${this.baseUrl}/api/comments?slug=${encodeURIComponent(slug)}`);
        if (!res.ok) return [];
        return res.json();
    }

    // Enviar nuevo comentario (requiere login)
    async add(gameSlug, gameName, content) {
        const res = await fetch(`${this.baseUrl}/api/comments/add`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ game_slug: gameSlug, game_name: gameName, content }),
        });
        return res.json();
    }

    // Historial de comentarios del usuario logueado
    async getUserComments() {
        const res = await fetch(`${this.baseUrl}/api/user/comments`);
        if (!res.ok) return [];
        return res.json();
    }

    // ── Admin ────────────────────────────────────────────────────

    async adminGetAll() {
        const res = await fetch(`${this.baseUrl}/api/admin/comments`);
        if (!res.ok) return [];
        return res.json();
    }

    async adminApprove(id) {
        const res = await fetch(`${this.baseUrl}/api/admin/comments/approve`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id }),
        });
        return res.json();
    }

    async adminReject(id, reason) {
        const res = await fetch(`${this.baseUrl}/api/admin/comments/reject`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ id, reason }),
        });
        return res.json();
    }

    async adminDelete(id) {
        const res = await fetch(`${this.baseUrl}/api/admin/comments/${id}`, {
            method: 'DELETE',
        });
        return res.json();
    }
}
