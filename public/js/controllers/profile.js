// imports
import { UserModel }     from '../models/UserModel.js';
import { WishlistModel }  from '../models/WishlistModel.js';
import { CommentModel }   from '../models/CommentModel.js';

// Controller para la página de perfil de usuario
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
        this._initAvatarUpload();
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
            const initial = (user.username ?? '?')[0].toUpperCase();
        document.getElementById('profileAvatarInitial').textContent = initial;

        if (user.avatar) {
            const img = document.getElementById('profileAvatarImg');
            img.src    = user.avatar;
            img.hidden = false;
            document.getElementById('profileAvatarInitial').hidden = true;
            const removeBtn = document.getElementById('removeAvatarBtn');
            if (removeBtn) removeBtn.hidden = false;
        }

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

            listEl.innerHTML = comments.map(c => this._renderUserComment(c)).join('');
            listEl.hidden = false;

            // Badge: comentarios con estado no visto aún
            const unseenCount = comments.filter(c => c.status_seen == 0).length;
            if (unseenCount > 0) {
                const navBadge  = document.getElementById('commentsBadge');
                const cardBadge = document.getElementById('commentsBadgeCard');
                if (navBadge)  { navBadge.textContent  = unseenCount; navBadge.hidden  = false; }
                if (cardBadge) { cardBadge.textContent = unseenCount; cardBadge.hidden = false; }
            }

            // Marcar como vistos y eliminar punto del navbar
            fetch(`${this.userModel.baseUrl}/api/user/comment-seen`, { method: 'POST' })
                .then(() => {
                    const dot = document.getElementById('navbarNotifDot');
                    if (dot) dot.hidden = true;
                })
                .catch(() => {});
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
            deleted:  { label: 'Eliminado',             cls: 'comment-status--deleted'  },
        };
        const st = statusMap[c.status] ?? statusMap.pending;

        let reasonHtml = '';
        if (c.status === 'rejected' && c.rejection_reason) {
            reasonHtml = `<div class="comment-rejection">
                   <strong>Motivo del rechazo:</strong> ${this._esc(c.rejection_reason)}
               </div>`;
        } else if (c.status === 'deleted' && c.rejection_reason) {
            reasonHtml = `<div class="comment-rejection comment-rejection--deleted">
                   <strong>Motivo de la eliminación:</strong> ${this._esc(c.rejection_reason)}
               </div>`;
        }

        const isDimmed = c.status === 'rejected' || c.status === 'deleted';
        return `
            <div class="my-comment-item ${isDimmed ? 'my-comment-item--rejected' : ''}">
                <div class="my-comment-item__header">
                    <a href="${this.userModel.baseUrl}/game/${this._esc(c.game_slug)}"
                       class="my-comment-item__game">${this._esc(c.game_name)}</a>
                    <span class="comment-status ${st.cls}">${st.label}</span>
                </div>
                <p class="my-comment-item__content">${this._esc(c.content)}</p>
                ${reasonHtml}
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

    _initAvatarUpload() {
        const avatarDiv  = document.getElementById('profileAvatar');
        const fileInput  = document.getElementById('avatarInput');
        const removeBtn  = document.getElementById('removeAvatarBtn');
        if (!avatarDiv || !fileInput) return;

        avatarDiv.addEventListener('click', () => fileInput.click());

        removeBtn?.addEventListener('click', async (e) => {
            e.stopPropagation();
            removeBtn.disabled = true;
            try {
                const res  = await fetch(`${this.userModel.baseUrl}/api/user/avatar/delete`, { method: 'POST' });
                const data = await res.json();
                if (data.success) {
                    document.getElementById('profileAvatarImg').hidden = true;
                    document.getElementById('profileAvatarImg').src    = '';
                    document.getElementById('profileAvatarInitial').hidden = false;
                    removeBtn.hidden = true;
                    if (typeof showToast === 'function') showToast('Foto de perfil eliminada.');
                }
            } catch {
                if (typeof showToast === 'function') showToast('Error al eliminar la foto.');
            } finally {
                removeBtn.disabled = false;
            }
        });

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files?.[0];
            if (!file) return;

            const formData = new FormData();
            formData.append('avatar', file);

            try {
                const res  = await fetch(`${this.userModel.baseUrl}/api/user/avatar`, { method: 'POST', body: formData });
                const data = await res.json();
                if (data.success) {
                    const img = document.getElementById('profileAvatarImg');
                    img.src    = data.avatar + '?t=' + Date.now();
                    img.hidden = false;
                    document.getElementById('profileAvatarInitial').hidden = true;
                    if (typeof showToast === 'function') showToast('Foto de perfil actualizada.');
                } else {
                    if (typeof showToast === 'function') showToast(data.message ?? 'Error al subir la foto.');
                }
            } catch {
                if (typeof showToast === 'function') showToast('Error de conexión al subir la foto.');
            } finally {
                fileInput.value = '';
            }
        });
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