// // import { BASE_URL } from '../config.js';
// import { UserModel } from '../models/UserModel.js';

// // Controlador para la página de perfil de usuario
// export class ProfileController {
//     constructor() {
//         this.model = new UserModel();
//     }

//     async init() {
//         const session = this.model.getSession();
//         if (!session.loggedIn) {
//             this.showAlert('error', 'No hay sesión activa.');
//             return;
//         }
//         await Promise.all([
//             this.loadProfile(),
//             this.loadHistory()
//         ]);
//         this.bindEvents();
//     }

//     // ── Cargar perfil ───────────────────────────────────────
//     async loadProfile() {
//         try {
//             const data = await this.model.getProfile();

//             if (data.error) { this.showAlert('error', data.error); return; }

//             const u = data.user;

//             document.getElementById('profileAvatar').textContent    = u.username[0].toUpperCase();
//             document.getElementById('profileUsername').textContent   = u.username;
//             document.getElementById('profileRoleBadge').textContent  = u.role === 'admin' ? '👑 Admin' : '🎮 Usuario';
//             document.getElementById('statWishlist').textContent      = u.wishlist_count;
//             document.getElementById('statSearches').textContent      = u.search_count;

//             document.getElementById('editUsername').value = u.username;
//             document.getElementById('editEmail').value    = u.email;
//             document.getElementById('memberSince').value  = new Date(u.created_at).toLocaleDateString('es-ES');

//         } catch {
//             this.showAlert('error', 'Error al cargar el perfil.');
//         }
//     }

//     // ── Guardar cambios de perfil ───────────────────────────
//     async saveProfile() {
//         this.hideAlert();
//         try {
//             const username = document.getElementById('editUsername').value.trim();
//             const email    = document.getElementById('editEmail').value.trim();

//             const data = await this.model.updateProfile(username, email);

//             if (data.error) { this.showAlert('error', data.error); return; }

//             this.showAlert('success', 'Perfil actualizado correctamente.');
//             await this.loadProfile();

//         } catch {
//             this.showAlert('error', 'Error al guardar los cambios.');
//         }
//     }

//     // ── Cambiar contraseña ──────────────────────────────────
//     async changePassword() {
//         this.hideAlert();
//         const currentPass = document.getElementById('currentPass').value;
//         const newPass     = document.getElementById('newPass').value;

//         if (!currentPass || !newPass) {
//             this.showAlert('error', 'Rellena ambos campos de contraseña.');
//             return;
//         }
//         if (newPass.length < 6) {
//             this.showAlert('error', 'La nueva contraseña debe tener al menos 6 caracteres.');
//             return;
//         }

//         try {
//             const data = await this.model.changePassword(currentPass, newPass);

//             if (data.error) { this.showAlert('error', data.error); return; }

//             this.showAlert('success', 'Contraseña cambiada correctamente.');
//             document.getElementById('currentPass').value = '';
//             document.getElementById('newPass').value     = '';

//         } catch {
//             this.showAlert('error', 'Error al cambiar la contraseña.');
//         }
//     }

//     // ── Historial de búsquedas ──────────────────────────────
//     async loadHistory() {
//         const loading = document.getElementById('historyLoading');
//         const list    = document.getElementById('historyList');
//         const empty   = document.getElementById('historyEmpty');

//         try {
//             const history = await this.model.getSearchHistory();

//             loading.hidden = true;

//             if (!history.length) {
//                 empty.hidden = false;
//                 return;
//             }

//             list.innerHTML = history.map(h => `
//                 <li class="history-item">
//                     <span class="history-item__query">🔍 ${this.escape(h.query)}</span>
//                     <span class="history-item__date">${new Date(h.searched_at).toLocaleString('es-ES')}</span>
//                 </li>
//             `).join('');

//             list.hidden = false;

//         } catch {
//             loading.hidden = true;
//             empty.hidden   = false;
//         }
//     }

//     // ── Eventos ─────────────────────────────────────────────
//     bindEvents() {
//         document.getElementById('saveProfileBtn')
//             .addEventListener('click', () => this.saveProfile());
//         document.getElementById('changePassBtn')
//             .addEventListener('click', () => this.changePassword());
//     }

//     // ── Helpers UI ──────────────────────────────────────────
//     showAlert(type, text) {
//         const el = document.getElementById('profileAlert');
//         el.className   = `alert alert--${type}`;
//         el.textContent = text;
//         el.hidden      = false;
//     }

//     hideAlert() {
//         document.getElementById('profileAlert').hidden = true;
//     }

//     escape(str) {
//         return str.replace(/[&<>"']/g, c => ({
//             '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
//         }[c]));
//     }
// }

import { UserModel }     from '../models/UserModel.js';
import { WishlistModel }  from '../models/WishlistModel.js';
import { CommentModel }   from '../models/CommentModel.js';

export class ProfileController {
    constructor() {
        this.userModel     = new UserModel();
        this.wishlistModel = new WishlistModel();
        this.commentModel  = new CommentModel();
    }

    async init() {
        await Promise.all([
            this.loadProfile(),
            this.loadHistory(),
            this.loadWishlistCount(),
            this.loadComments(),
        ]);
        this._bindEvents();
    }

    async loadProfile() {
        try {
            const user = await this.userModel.getProfile();
            document.getElementById('editUsername').value = user.username ?? '';
            document.getElementById('editEmail').value    = user.email    ?? '';
            document.getElementById('memberSince').value  =
                user.created_at ? new Date(user.created_at).toLocaleDateString('es-ES') : '';

            document.getElementById('profileUsername').textContent =
                user.username ?? '';
            document.getElementById('profileAvatar').textContent =
                (user.username ?? '?')[0].toUpperCase();

            const roleBadge = document.getElementById('profileRoleBadge');
            roleBadge.textContent = user.role === 'admin' ? 'Administrador' : 'Usuario';
            roleBadge.className   = `role-badge role-badge--${user.role ?? 'user'}`;
        } catch (err) {
            console.error('[ProfileController] loadProfile:', err);
        }
    }

    async loadHistory() {
        const listEl  = document.getElementById('historyList');
        const loadEl  = document.getElementById('historyLoading');
        const emptyEl = document.getElementById('historyEmpty');

        try {
            const history = await this.userModel.getSearchHistory();
            if (loadEl) loadEl.hidden = true;

            document.getElementById('statSearches').textContent = history.length;

            if (!history.length) {
                if (emptyEl) emptyEl.hidden = false;
                return;
            }

            listEl.innerHTML = history.slice(0, 20).map(h => `
                <li class="history-item">
                    <a href="${this.userModel.baseUrl}/search?q=${encodeURIComponent(h.query)}">${this._esc(h.query)}</a>
                    <span class="history-item__date">${new Date(h.searched_at).toLocaleDateString('es-ES')}</span>
                </li>
            `).join('');
            listEl.hidden = false;
        } catch (err) {
            if (loadEl)  loadEl.hidden  = true;
            if (emptyEl) emptyEl.hidden = false;
            console.error('[ProfileController] loadHistory:', err);
        }
    }

    async loadWishlistCount() {
        try {
            const wl = await this.wishlistModel.getAll();
            document.getElementById('statWishlist').textContent = Array.isArray(wl) ? wl.length : 0;
            const navWishlist = document.getElementById('navWishlist');
            if (navWishlist) navWishlist.href = `${this.userModel.baseUrl}/wishlist`;
        } catch {
            document.getElementById('statWishlist').textContent = '0';
        }
    }

    async loadComments() {
        const listEl  = document.getElementById('commentsList');
        const loadEl  = document.getElementById('commentsLoading');
        const emptyEl = document.getElementById('commentsEmpty');
        if (!listEl) return;

        try {
            const comments = await this.commentModel.getUserComments();
            if (loadEl) loadEl.hidden = true;

            if (!Array.isArray(comments) || !comments.length) {
                if (emptyEl) emptyEl.hidden = false;
                return;
            }

            // Notificación: badge en el nav si hay comentarios rechazados
            const rejectedCount = comments.filter(c => c.status === 'rejected').length;
            if (rejectedCount > 0) {
                const badge = document.getElementById('commentsBadge');
                if (badge) { badge.textContent = rejectedCount; badge.hidden = false; }
            }

            listEl.innerHTML = comments.map(c => this._renderUserComment(c)).join('');
            listEl.hidden = false;
        } catch (err) {
            if (loadEl)  loadEl.hidden  = true;
            if (emptyEl) emptyEl.hidden = false;
            console.error('[ProfileController] loadComments:', err);
        }
    }

    _renderUserComment(c) {
        const statusMap = {
            pending:  { label: 'Pendiente de revisión', cls: 'comment-status--pending'  },
            approved: { label: 'Publicado',             cls: 'comment-status--approved' },
            rejected: { label: 'Rechazado',             cls: 'comment-status--rejected' },
        };
        const st = statusMap[c.status] ?? statusMap.pending;

        const rejectionHtml = (c.status === 'rejected' && c.rejection_reason)
            ? `<div class="comment-rejection">
                   <strong>Motivo del rechazo:</strong> ${this._esc(c.rejection_reason)}
               </div>`
            : '';

        return `
            <div class="my-comment-item ${c.status === 'rejected' ? 'my-comment-item--rejected' : ''}">
                <div class="my-comment-item__header">
                    <a href="${this.userModel.baseUrl}/game/${this._esc(c.game_slug)}"
                       class="my-comment-item__game">🎮 ${this._esc(c.game_name)}</a>
                    <span class="comment-status ${st.cls}">${st.label}</span>
                </div>
                <p class="my-comment-item__content">${this._esc(c.content)}</p>
                ${rejectionHtml}
                <span class="my-comment-item__date">
                    ${new Date(c.created_at).toLocaleDateString('es-ES')}
                </span>
            </div>
        `;
    }

    _esc(str) {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    }

    _bindEvents() {
        document.getElementById('saveProfileBtn')
            ?.addEventListener('click', () => this._saveProfile());
        document.getElementById('changePassBtn')
            ?.addEventListener('click', () => this._changePassword());
    }

    async _saveProfile() {
        const btn      = document.getElementById('saveProfileBtn');
        const username = document.getElementById('editUsername').value.trim();
        const email    = document.getElementById('editEmail').value.trim();
        btn.disabled   = true;
        try {
            const result = await this.userModel.updateProfile(username, email);
            if (typeof showToast === 'function')
                showToast(result.message ?? (result.success ? 'Perfil actualizado.' : 'Error al guardar.'));
            if (result.success) {
                document.getElementById('profileUsername').textContent = username;
                document.getElementById('profileAvatar').textContent   = username[0].toUpperCase();
            }
        } finally {
            btn.disabled = false;
        }
    }

    async _changePassword() {
        const btn     = document.getElementById('changePassBtn');
        const current = document.getElementById('currentPass').value;
        const newPass = document.getElementById('newPass').value;
        if (newPass.length < 6) {
            if (typeof showToast === 'function') showToast('La contraseña debe tener al menos 6 caracteres.');
            return;
        }
        btn.disabled = true;
        try {
            const result = await this.userModel.changePassword(current, newPass);
            if (typeof showToast === 'function')
                showToast(result.message ?? (result.success ? 'Contraseña cambiada.' : 'Error al cambiar.'));
            if (result.success) {
                document.getElementById('currentPass').value = '';
                document.getElementById('newPass').value     = '';
            }
        } finally {
            btn.disabled = false;
        }
    }
}