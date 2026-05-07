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
