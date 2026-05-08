// import { BASE_URL } from '../config.js';
import { UserModel } from '../models/UserModel.js';

// Controlador para la página de perfil de usuario
export class ProfileController {
    constructor() {
        this.model = new UserModel();
    }

    async init() {
        const session = this.model.getSession();
        if (!session.loggedIn) {
            this.showAlert('error', 'No hay sesión activa.');
            return;
        }
        await Promise.all([
            this.loadProfile(),
            this.loadHistory()
        ]);
        this.bindEvents();
    }

    // ── Cargar perfil ───────────────────────────────────────
    async loadProfile() {
        try {
            const data = await this.model.getProfile();

            if (data.error) { this.showAlert('error', data.error); return; }

            const u = data.user;

            document.getElementById('profileAvatar').textContent    = u.username[0].toUpperCase();
            document.getElementById('profileUsername').textContent   = u.username;
            document.getElementById('profileRoleBadge').textContent  = u.role === 'admin' ? '👑 Admin' : '🎮 Usuario';
            document.getElementById('statWishlist').textContent      = u.wishlist_count;
            document.getElementById('statSearches').textContent      = u.search_count;

            document.getElementById('editUsername').value = u.username;
            document.getElementById('editEmail').value    = u.email;
            document.getElementById('memberSince').value  = new Date(u.created_at).toLocaleDateString('es-ES');

        } catch {
            this.showAlert('error', 'Error al cargar el perfil.');
        }
    }

    // ── Guardar cambios de perfil ───────────────────────────
    async saveProfile() {
        this.hideAlert();
        try {
            const username = document.getElementById('editUsername').value.trim();
            const email    = document.getElementById('editEmail').value.trim();

            const data = await this.model.updateProfile(username, email);

            if (data.error) { this.showAlert('error', data.error); return; }

            this.showAlert('success', 'Perfil actualizado correctamente.');
            await this.loadProfile();

        } catch {
            this.showAlert('error', 'Error al guardar los cambios.');
        }
    }

    // ── Cambiar contraseña ──────────────────────────────────
    async changePassword() {
        this.hideAlert();
        const currentPass = document.getElementById('currentPass').value;
        const newPass     = document.getElementById('newPass').value;

        if (!currentPass || !newPass) {
            this.showAlert('error', 'Rellena ambos campos de contraseña.');
            return;
        }
        if (newPass.length < 6) {
            this.showAlert('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
            return;
        }

        try {
            const data = await this.model.changePassword(currentPass, newPass);

            if (data.error) { this.showAlert('error', data.error); return; }

            this.showAlert('success', 'Contraseña cambiada correctamente.');
            document.getElementById('currentPass').value = '';
            document.getElementById('newPass').value     = '';

        } catch {
            this.showAlert('error', 'Error al cambiar la contraseña.');
        }
    }

    // ── Historial de búsquedas ──────────────────────────────
    async loadHistory() {
        const loading = document.getElementById('historyLoading');
        const list    = document.getElementById('historyList');
        const empty   = document.getElementById('historyEmpty');

        try {
            const history = await this.model.getSearchHistory();

            loading.hidden = true;

            if (!history.length) {
                empty.hidden = false;
                return;
            }

            list.innerHTML = history.map(h => `
                <li class="history-item">
                    <span class="history-item__query">🔍 ${this.escape(h.query)}</span>
                    <span class="history-item__date">${new Date(h.searched_at).toLocaleString('es-ES')}</span>
                </li>
            `).join('');

            list.hidden = false;

        } catch {
            loading.hidden = true;
            empty.hidden   = false;
        }
    }

    // ── Eventos ─────────────────────────────────────────────
    bindEvents() {
        document.getElementById('saveProfileBtn')
            .addEventListener('click', () => this.saveProfile());
        document.getElementById('changePassBtn')
            .addEventListener('click', () => this.changePassword());
    }

    // ── Helpers UI ──────────────────────────────────────────
    showAlert(type, text) {
        const el = document.getElementById('profileAlert');
        el.className   = `alert alert--${type}`;
        el.textContent = text;
        el.hidden      = false;
    }

    hideAlert() {
        document.getElementById('profileAlert').hidden = true;
    }

    escape(str) {
        return str.replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }
}