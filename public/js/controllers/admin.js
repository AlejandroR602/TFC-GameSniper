const BASE_URL      = document.querySelector('meta[name="base-url"]').content;
const MY_ADMIN_LEVEL = parseInt(document.querySelector('meta[name="admin-level"]')?.content ?? '0');

// ID del comentario pendiente de rechazar (estado del modal)
let _pendingRejectId = null;

// ID del usuario al que se le cambia el rol
let _pendingUserChangeId = null;

// ID del usuario al que se va a eliminar
let _pendingUserDeleteId = null;

// ID del comentario pendiente de eliminar
let _pendingDeleteCommentId = null;

//admin controller
export class AdminController {
    async init() {
        this._bindModalEvents();
        await Promise.all([
            this.loadStats(),
            this.loadUsers(),
            this.loadApiStatus(),
            this.loadComments(),
        ]);
    }

    _bindModalEvents() {
        const closeReject = () => { document.getElementById('rejectModal').hidden = true; _pendingRejectId = null; };
        const closeRole = () => { document.getElementById('roleModal').hidden = true; _pendingUserChangeId = null; };
        const closeDelete = () => { document.getElementById('deleteModal').hidden = true; _pendingUserDeleteId = null; };

        document.getElementById('rejectModalClose')?.addEventListener('click', closeReject);
        document.getElementById('rejectModalCancel')?.addEventListener('click', closeReject);
        document.getElementById('rejectModalConfirm')?.addEventListener('click', () => AdminController._confirmReject());

        document.getElementById('roleModalClose')?.addEventListener('click', closeRole);
        document.getElementById('roleModalCancel')?.addEventListener('click', closeRole);
        document.getElementById('roleModalConfirm')?.addEventListener('click', () => AdminController._confirmRoleChange());

        document.getElementById('deleteModalClose')?.addEventListener('click', closeDelete);
        document.getElementById('deleteModalCancel')?.addEventListener('click', closeDelete);
        document.getElementById('deleteModalConfirm')?.addEventListener('click', () => AdminController._confirmDelete());

        document.getElementById('rejectModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeReject(); });
        document.getElementById('roleModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeRole(); });
        document.getElementById('deleteModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeDelete(); });

        const closeDeleteComment = () => {
            document.getElementById('deleteCommentModal').hidden = true;
            _pendingDeleteCommentId = null;
        };
        document.getElementById('deleteCommentModalClose')?.addEventListener('click', closeDeleteComment);
        document.getElementById('deleteCommentModalCancel')?.addEventListener('click', closeDeleteComment);
        document.getElementById('deleteCommentModalConfirm')?.addEventListener('click', () => AdminController._confirmDeleteComment());
        document.getElementById('deleteCommentModal')?.addEventListener('click', e => { if (e.target === e.currentTarget) closeDeleteComment(); });

        // Cerrar con Escape
        document.addEventListener('keydown', e => {
            if (e.key === 'Escape') {
                if (!document.getElementById('rejectModal')?.hidden) closeReject();
                if (!document.getElementById('roleModal')?.hidden) closeRole();
                if (!document.getElementById('deleteModal')?.hidden) closeDelete();
                if (!document.getElementById('deleteCommentModal')?.hidden) closeDeleteComment();
            }
        });
    }

    showAlert(message, type = 'error') {
        const el = document.getElementById('adminAlert');
        if (!el) return;
        el.textContent = message;
        el.className = `alert alert--${type}`;
        el.hidden = false;
    }

    async loadStats() {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/stats`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            document.getElementById('statUsers').textContent = data.total_users;
            document.getElementById('statWishlists').textContent = data.total_wishlist;
            const pendingEl = document.getElementById('statPendingComments');
            if (pendingEl) pendingEl.textContent = data.pending_comments ?? 0;
        } catch (err) {
            this.showAlert('Error al cargar estadísticas.');
            console.error('[AdminController] loadStats:', err);
        }
    }

    async loadUsers() {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/users`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const users = await res.json();

            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = users.map((u, i) => {
                const games = u.wishlist_games ?? [];
                const pillsHtml = games.length
                    ? games.map(g =>
                        `<a href="${BASE_URL}/game/${AdminController._esc(g.slug)}"
                            target="_blank"
                            style="display:inline-block;margin:2px;padding:2px 8px;
                                background:var(--surface3);border:1px solid var(--border);
                                border-radius:20px;font-size:.72rem;color:var(--text-muted)">
                            ${AdminController._esc(g.name)}
                        </a>`).join('')
                    : '<span style="color:var(--text-muted);font-size:.8rem">–</span>';

                const targetLevel = parseInt(u.admin_level ?? 0);
                const canDelete   = MY_ADMIN_LEVEL > targetLevel;
                const levelBadge  = u.role === 'admin'
                    ? (targetLevel >= 2
                        ? `<span class="admin-level-badge admin-level-badge--jefe">Jefe</span>`
                        : `<span class="admin-level-badge admin-level-badge--1">Nv.1</span>`)
                    : '';

                return `
                    <tr>
                        <td>${i + 1}</td>
                        <td>${AdminController._esc(u.username)}</td>
                        <td>${AdminController._esc(u.email)}</td>
                        <td>
                            ${AdminController._esc(u.role)}
                            ${levelBadge}
                        </td>
                        <td>${u.created_at}</td>
                        <td style="max-width:260px">
                            <div style="display:flex;flex-wrap:wrap;gap:2px;align-items:center">
                                <span style="font-size:.8rem;color:var(--accent);font-weight:600;margin-right:4px">
                                    ${games.length}
                                </span>
                                ${pillsHtml}
                            </div>
                        </td>
                        <td>
                            <div style="display:flex;gap:.5rem;align-items:center;">
                                ${canDelete ? `<button class="btn btn-danger btn-sm" onclick="AdminController.deleteUser(${u.id})">Eliminar</button>` : ''}
                                <button class="btn btn-outline btn-sm" onclick="AdminController.changeRole(${u.id})">Rol</button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');

            document.getElementById('usersLoading').hidden = true;
            document.getElementById('usersTable').hidden = false;
        } catch (err) {
            document.getElementById('usersLoading').hidden = true;
            this.showAlert('Error al cargar la lista de usuarios.');
            console.error('[AdminController] loadUsers:', err);
        }
    }

    async loadApiStatus() {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/api-status`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const apis = await res.json();

            document.getElementById('statApis').textContent = apis.filter(a => a.configured).length;
            document.getElementById('apiStatusList').innerHTML = apis.map(api => `
                <div class="api-status-item">
                    <strong>${api.name}</strong> – ${api.description}
                    <span ${api.configured ? 'class="text-success"' : 'class="text-danger"'}>${api.configured ? 'Conectada' : 'Desconectada'}</span>
                </div>
            `).join('');
        } catch (err) {
            this.showAlert('Error al cargar el estado de las APIs.');
            console.error('[AdminController] loadApiStatus:', err);
        }
    }

    // ── Moderación de comentarios ────────────────────────────────

    async loadComments() {
        const loadEl = document.getElementById('commentsLoading');
        const tableEl = document.getElementById('commentsTable');
        const emptyEl = document.getElementById('commentsEmpty');
        if (!loadEl) return;

        try {
            const res = await fetch(`${BASE_URL}/api/admin/comments`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const comments = await res.json();

            loadEl.hidden = true;

            if (!comments.length) {
                if (emptyEl) emptyEl.hidden = false;
                return;
            }

            const tbody = document.getElementById('commentsTableBody');
            tbody.innerHTML = comments.map(c => {
                const statusLabel = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado', deleted: 'Eliminado' }[c.status] ?? c.status;

                let actionBtns;
                if (c.status === 'pending') {
                    actionBtns = `
                        <button class="btn btn-sm btn-primary" onclick="AdminController.approveComment(${c.id})">Aprobar</button>
                        <button class="btn btn-sm btn-outline" onclick="AdminController.rejectComment(${c.id})">Rechazar</button>
                        <button class="btn btn-sm btn-danger"  onclick="AdminController.deleteComment(${c.id})">Eliminar</button>`;
                } else if (c.status === 'approved') {
                    actionBtns = `
                        <button class="btn btn-sm btn-danger" onclick="AdminController.deleteComment(${c.id})">Eliminar</button>`;
                } else if (c.status === 'rejected') {
                    actionBtns = `
                        <button class="btn btn-sm btn-danger" onclick="AdminController.deleteComment(${c.id})">Eliminar</button>`;
                } else {
                    // deleted
                    actionBtns = `
                        <button class="btn btn-sm btn-primary" onclick="AdminController.restoreComment(${c.id})">Republicar</button>
                        <button class="btn btn-sm btn-danger"  onclick="AdminController.purgeComment(${c.id})">Borrar</button>`;
                }

                const hasReason = !!c.rejection_reason;

                return `
                    <tr class="${(c.status === 'rejected' || c.status === 'deleted') ? 'comment-row--rejected' : ''}">
                        <td>${c.id}</td>
                        <td title="${AdminController._esc(c.username)}">${AdminController._esc(c.username)}</td>
                        <td title="${AdminController._esc(c.game_name)}">
                            <a href="${BASE_URL}/game/${AdminController._esc(c.game_slug)}" target="_blank" style="color:inherit">
                                ${AdminController._esc(c.game_name)}
                            </a>
                        </td>
                        <td class="comment-cell${hasReason ? ' comment-cell--has-reason' : ''}"
                            ${hasReason ? `data-reason="${AdminController._esc(c.rejection_reason)}"` : ''}>
                            ${AdminController._esc(c.content)}
                        </td>
                        <td><span class="comment-status-badge comment-status-badge--${c.status}">${statusLabel}</span></td>
                        <td>${new Date(c.created_at).toLocaleDateString('es-ES')}</td>
                        <td class="comment-actions-cell">${actionBtns}</td>
                    </tr>
                `;
            }).join('');

            if (tableEl) tableEl.hidden = false;

            // Popup flotante para ver el motivo de rechazo/eliminación
            if (!document.getElementById('reasonPopup')) {
                const popup = document.createElement('div');
                popup.id = 'reasonPopup';
                popup.className = 'reason-popup';
                popup.hidden = true;
                document.body.appendChild(popup);
                document.addEventListener('click', () => { popup.hidden = true; });
            }
            tbody.addEventListener('click', e => {
                const cell = e.target.closest('.comment-cell--has-reason');
                if (!cell) return;
                e.stopPropagation();
                const popup = document.getElementById('reasonPopup');
                popup.innerHTML = `<span class="reason-popup__label">Motivo</span>${AdminController._esc(cell.dataset.reason)}`;
                popup.hidden = false;
                const r = cell.getBoundingClientRect();
                const pw = 260;
                let left = r.left + window.scrollX;
                if (left + pw > window.innerWidth - 10) left = window.innerWidth - pw - 10;
                popup.style.top  = (r.bottom + window.scrollY + 7) + 'px';
                popup.style.left = Math.max(8, left) + 'px';
            });
        } catch (err) {
            if (loadEl) loadEl.hidden = true;
            this.showAlert('Error al cargar los comentarios.');
            console.error('[AdminController] loadComments:', err);
        }
    }

    static _esc(str) {
        const d = document.createElement('div');
        d.textContent = String(str ?? '');
        return d.innerHTML;
    }

    static async approveComment(id) {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/comments/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message ?? 'No se pudo aprobar el comentario.');
        } catch (err) {
            alert('Error de conexión al aprobar el comentario.');
            console.error('[AdminController] approveComment:', err);
        }
    }

    static rejectComment(id) {
        _pendingRejectId = id;
        const modal = document.getElementById('rejectModal');
        const textarea = document.getElementById('rejectReason');
        const errMsg = document.getElementById('rejectReasonError');
        if (textarea) { textarea.value = ''; textarea.classList.remove('input-error'); }
        if (errMsg) errMsg.style.display = 'none';
        if (modal) modal.hidden = false;
        setTimeout(() => textarea?.focus(), 50);
    }

    static async _confirmReject() {
        const textarea = document.getElementById('rejectReason');
        const errMsg = document.getElementById('rejectReasonError');
        const reason = textarea?.value.trim() ?? '';

        if (!reason) {
            textarea?.classList.add('input-error');
            if (errMsg) errMsg.style.display = 'block';
            textarea?.focus();
            return;
        }

        const id = _pendingRejectId;
        const confirmBtn = document.getElementById('rejectModalConfirm');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Rechazando...'; }

        try {
            const res = await fetch(`${BASE_URL}/api/admin/comments/reject`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, reason }),
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('rejectModal').hidden = true;
                _pendingRejectId = null;
                location.reload();
            } else {
                if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar rechazo'; }
                alert(data.message ?? 'No se pudo rechazar el comentario.');
            }
        } catch (err) {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar rechazo'; }
            alert('Error de conexión al rechazar el comentario.');
            console.error('[AdminController] _confirmReject:', err);
        }
    }

    static deleteComment(id) {
        _pendingDeleteCommentId = id;
        const modal    = document.getElementById('deleteCommentModal');
        const textarea = document.getElementById('deleteCommentReason');
        const errMsg   = document.getElementById('deleteCommentReasonError');
        if (textarea) { textarea.value = ''; textarea.classList.remove('input-error'); }
        if (errMsg)   errMsg.style.display = 'none';
        if (modal)    modal.hidden = false;
        setTimeout(() => textarea?.focus(), 50);
    }

    static async _confirmDeleteComment() {
        const textarea = document.getElementById('deleteCommentReason');
        const errMsg   = document.getElementById('deleteCommentReasonError');
        const reason   = textarea?.value.trim() ?? '';

        if (!reason) {
            textarea?.classList.add('input-error');
            if (errMsg) errMsg.style.display = 'block';
            textarea?.focus();
            return;
        }

        const id = _pendingDeleteCommentId;
        const confirmBtn = document.getElementById('deleteCommentModalConfirm');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Eliminando...'; }

        try {
            const res = await fetch(`${BASE_URL}/api/admin/comments/${id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ reason }),
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('deleteCommentModal').hidden = true;
                _pendingDeleteCommentId = null;
                location.reload();
            } else {
                if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar eliminación'; }
                alert(data.message ?? 'No se pudo eliminar el comentario.');
            }
        } catch (err) {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar eliminación'; }
            alert('Error de conexión al eliminar el comentario.');
            console.error('[AdminController] _confirmDeleteComment:', err);
        }
    }

    // ── Usuarios ─────────────────────────────────────────────────

    // Abrir modal de eliminar usuario
    static deleteUser(id) {
        _pendingUserDeleteId = id;
        const modal = document.getElementById('deleteModal');
        if (modal) modal.hidden = false;
    }

    // Abrir modal de cambio de rol
    static changeRole(id) {
        _pendingUserChangeId = id;
        const modal = document.getElementById('roleModal');
        if (modal) modal.hidden = false;
    }

    // Confirmar eliminación (usando la variable correcta)
    static async _confirmDelete() {
        const id = _pendingUserDeleteId;
        const confirmBtn = document.getElementById('deleteModalConfirm');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Eliminando...'; }

        try {
            const res = await fetch(`${BASE_URL}/api/admin/delete/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('deleteModal').hidden = true;
                _pendingUserDeleteId = null;
                location.reload();
            } else {
                if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar eliminación'; }
                alert(data.message ?? 'No se pudo eliminar el usuario.');
            }
        } catch (err) {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar eliminación'; }
            alert('Error de conexión al eliminar el usuario.');
        }
    }

    static async restoreComment(id) {
        try {
            const res = await fetch(`${BASE_URL}/api/admin/comments/restore`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message ?? 'No se pudo restaurar el comentario.');
        } catch (err) {
            alert('Error de conexión al restaurar el comentario.');
            console.error('[AdminController] restoreComment:', err);
        }
    }

    static async purgeComment(id) {
        if (!confirm('¿Borrar este comentario de forma permanente? Esta acción no se puede deshacer.')) return;
        try {
            const res = await fetch(`${BASE_URL}/api/admin/comments/purge`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id }),
            });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message ?? 'No se pudo borrar el comentario.');
        } catch (err) {
            alert('Error de conexión al borrar el comentario.');
            console.error('[AdminController] purgeComment:', err);
        }
    }

    static async _confirmRoleChange() {
        const id = _pendingUserChangeId;
        const role = document.getElementById('roleModalRole')?.value;

        if (!role) {
            alert('Por favor selecciona un rol.');
            return;
        }

        const confirmBtn = document.getElementById('roleModalConfirm');
        if (confirmBtn) { confirmBtn.disabled = true; confirmBtn.textContent = 'Cambiando rol...'; }

        try {
            const res = await fetch(`${BASE_URL}/api/admin/role/${id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, role }),
            });
            const data = await res.json();
            if (data.success) {
                document.getElementById('roleModal').hidden = true;
                _pendingUserChangeId = null;
                location.reload();
            } else {
                if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar cambio de rol'; }
                alert(data.message ?? 'No se pudo cambiar el rol.');
            }
        } catch (err) {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirmar cambio de rol'; }
            alert('Error de conexión al cambiar el rol.');
            console.error('[AdminController] _confirmRoleChange:', err);
        }
    }
}

window.AdminController = AdminController;
