/**
 * MODEL: UserModel (JavaScript)
 * Gestiona autenticación, perfil e historial de búsquedas.
 * Se comunica con los endpoints JSON del controlador PHP.
 */
 export class UserModel {
    constructor() {
        this.baseUrl   = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.csrfToken = document.querySelector('meta[name="csrf-token"]')?.content ?? '';
    }

    // ----------------------------------------------------------------
    // Estado de sesión (leído desde las meta tags del header PHP)
    // ----------------------------------------------------------------
    getSession() {
        return {
            loggedIn: document.querySelector('meta[name="user-logged-in"]')?.content === 'true',
            username: document.querySelector('meta[name="username"]')?.content ?? '',
            role:     document.querySelector('meta[name="user-role"]')?.content ?? '',
        };
    }

    // ----------------------------------------------------------------
    // Login vía AJAX
    // ----------------------------------------------------------------
    async login(email, password) {
        const res = await fetch(`${this.baseUrl}/api/auth/login`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ email, password, csrf_token: this.csrfToken }),
        });
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Registro vía AJAX
    // ----------------------------------------------------------------
    async register(username, email, password) {
        const res = await fetch(`${this.baseUrl}/api/auth/register`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, email, password, csrf_token: this.csrfToken }),
        });
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Logout
    // ----------------------------------------------------------------
    async logout() {
        await fetch(`${this.baseUrl}/api/auth/logout`, { method: 'POST' });
        window.location.href = `${this.baseUrl}/`;
    }

    // ----------------------------------------------------------------
    // Obtener datos del perfil del usuario actual
    // ----------------------------------------------------------------
    async getProfile() {
        const res = await fetch(`${this.baseUrl}/api/user/profile`);
        if (!res.ok) throw new Error('No autenticado');
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Actualizar nombre de usuario y email
    // ----------------------------------------------------------------
    async updateProfile(username, email) {
        const res = await fetch(`${this.baseUrl}/api/user/update`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ username, email, csrf_token: this.csrfToken }),
        });
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Cambiar contraseña
    // ----------------------------------------------------------------
    async changePassword(currentPassword, newPassword) {
        const res = await fetch(`${this.baseUrl}/api/user/password`, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({
                current_password: currentPassword,
                new_password:     newPassword,
                csrf_token:       this.csrfToken,
            }),
        });
        return await res.json();
    }

    // ----------------------------------------------------------------
    // Historial de búsquedas del usuario
    // ----------------------------------------------------------------
    async getSearchHistory() {
        const res = await fetch(`${this.baseUrl}/api/user/history`);
        if (!res.ok) return [];
        return await res.json();
    }
}
