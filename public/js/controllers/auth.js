import { UserModel }     from '../models/UserModel.js';
import { WishlistModel } from '../models/WishlistModel.js';

const BASE_URL = document.querySelector('meta[name="base-url"]')?.content ?? '';

// ================================================================
// AUTH CONTROLLER (login + register)
// ================================================================
export class AuthController {
    constructor(mode) {
        this.mode  = mode; // 'login' | 'register'
        this.model = new UserModel();
    }

    init() {
        const base = BASE_URL;
        // Actualizar enlaces
        document.getElementById('loginLink')?.setAttribute('href', `${base}/login`);
        document.getElementById('registerLink')?.setAttribute('href', `${base}/register`);

        if (this.mode === 'login') this._initLogin();
        else                       this._initRegister();
    }

    _initLogin() {
        document.getElementById('toggleLoginPass')?.addEventListener('click', () => this._togglePass('password'));
        document.getElementById('loginBtn')?.addEventListener('click', () => this._doLogin());
        document.getElementById('password')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._doLogin(); });
    }

    async _doLogin() {
        const email    = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;
        if (!email || !password) { this._alert('Rellena todos los campos.', 'error'); return; }

        const btn = document.getElementById('loginBtn');
        btn.disabled = true; btn.textContent = 'Entrando...';

        try {
            const res = await this.model.login(email, password);
            if (res.success) {
                this._alert('¡Bienvenido! Redirigiendo...', 'success');
                setTimeout(() => window.location.href = `${BASE_URL}/`, 800);
            } else {
                this._alert(res.message ?? 'Error al iniciar sesión.', 'error');
                btn.disabled = false; btn.textContent = 'Iniciar sesión';
            }
        } catch {
            this._alert('Error de red. Inténtalo de nuevo.', 'error');
            btn.disabled = false; btn.textContent = 'Iniciar sesión';
        }
    }

    _initRegister() {
        document.getElementById('toggleRegPass')?.addEventListener('click', () => this._togglePass('password'));
        document.getElementById('registerBtn')?.addEventListener('click', () => this._doRegister());
        document.getElementById('password')?.addEventListener('input', e => this._strengthMeter(e.target.value));
    }

    async _doRegister() {
        const username = document.getElementById('username')?.value.trim();
        const email    = document.getElementById('email')?.value.trim();
        const password = document.getElementById('password')?.value;

        if (username.length < 3) { this._alert('El usuario debe tener al menos 3 caracteres.', 'error'); return; }
        if (!email)               { this._alert('Introduce un email válido.', 'error'); return; }
        if (password.length < 6)  { this._alert('La contraseña debe tener al menos 6 caracteres.', 'error'); return; }

        const btn = document.getElementById('registerBtn');
        btn.disabled = true; btn.textContent = 'Creando cuenta...';

        try {
            const res = await this.model.register(username, email, password);
            if (res.success) {
                this._alert(`✅ ${res.message} <a href="${BASE_URL}/login">→ Iniciar sesión</a>`, 'success');
                btn.disabled = false; btn.textContent = 'Crear cuenta';
            } else {
                this._alert(res.message ?? 'Error al registrarse.', 'error');
                btn.disabled = false; btn.textContent = 'Crear cuenta';
            }
        } catch {
            this._alert('Error de red. Inténtalo de nuevo.', 'error');
            btn.disabled = false; btn.textContent = 'Crear cuenta';
        }
    }

    _strengthMeter(val) {
        let score = 0;
        if (val.length >= 6)           score++;
        if (val.length >= 10)          score++;
        if (/[A-Z]/.test(val))         score++;
        if (/[0-9]/.test(val))         score++;
        if (/[^A-Za-z0-9]/.test(val))  score++;
        const colors = ['','#ef4444','#f97316','#eab308','#22c55e','#16a34a'];
        const labels = ['','Muy débil','Débil','Media','Fuerte','Muy fuerte'];
        const bar  = document.getElementById('passBar');
        const hint = document.getElementById('passHint');
        if (bar)  { bar.style.width = `${(score/5)*100}%`; bar.style.background = colors[score] ?? '#ef4444'; }
        if (hint) hint.textContent = val.length ? (labels[score] ?? 'Muy débil') : 'Introduce una contraseña';
    }

    _togglePass(id) {
        const inp = document.getElementById(id);
        if (inp) inp.type = inp.type === 'password' ? 'text' : 'password';
    }

    _alert(msg, type) {
        const id   = this.mode === 'login' ? 'loginAlert' : 'registerAlert';
        const el   = document.getElementById(id);
        if (!el) return;
        el.className = `alert alert-${type}`;
        el.innerHTML = msg;
        el.hidden    = false;
    }
}

// ================================================================
// HOME CONTROLLER
// ================================================================
export class HomeController {
    init() {
        const base = BASE_URL;
        document.getElementById('ctaRegister')?.setAttribute('href', `${base}/register`);
        document.getElementById('ctaLogin')?.setAttribute('href', `${base}/login`);

        const session = { loggedIn: document.querySelector('meta[name="user-logged-in"]')?.content === 'true' };
        if (session.loggedIn) document.getElementById('ctaSection')?.remove();

        const searchInput = document.getElementById('heroSearchInput');
        const searchBtn   = document.getElementById('heroSearchBtn');

        searchBtn?.addEventListener('click', () => {
            const q = searchInput?.value.trim();
            if (q) window.location.href = `${base}/search?q=${encodeURIComponent(q)}`;
        });
        searchInput?.addEventListener('keydown', e => {
            if (e.key === 'Enter') searchBtn?.click();
        });

        document.querySelectorAll('[data-search]').forEach(el => {
            el.addEventListener('click', e => {
                e.preventDefault();
                window.location.href = `${base}/search?q=${encodeURIComponent(el.dataset.search)}`;
            });
        });
    }
}

// ================================================================
// PROFILE CONTROLLER
// ================================================================
export class ProfileController {
    constructor() {
        this.userModel     = new UserModel();
        this.wishlistModel = new WishlistModel();
    }

    async init() {
        const base = BASE_URL;
        document.getElementById('navWishlist')?.setAttribute('href', `${base}/wishlist`);

        const [profile, history, wishlist] = await Promise.allSettled([
            this.userModel.getProfile(),
            this.userModel.getSearchHistory(),
            this.wishlistModel.getAll(),
        ]);

        if (profile.status === 'fulfilled') {
            const u = profile.value;
            const initial = u.username?.[0]?.toUpperCase() ?? '?';
            document.getElementById('profileAvatar').textContent      = initial;
            document.getElementById('profileUsername').textContent     = u.username ?? '';
            document.getElementById('editUsername').value              = u.username ?? '';
            document.getElementById('editEmail').value                 = u.email ?? '';
            document.getElementById('memberSince').value               = u.created_at ? new Date(u.created_at).toLocaleDateString('es-ES') : '';
            const rb = document.getElementById('profileRoleBadge');
            if (rb) { rb.textContent = u.role === 'admin' ? '🛡 Admin' : '👤 Usuario'; rb.className = `role-badge role-badge--${u.role}`; }
        }

        if (wishlist.status === 'fulfilled') document.getElementById('statWishlist').textContent = wishlist.value.length;

        if (history.status === 'fulfilled') {
            document.getElementById('historyLoading').hidden = true;
            const h = history.value;
            document.getElementById('statSearches').textContent = h.length;
            if (h.length) {
                const ul = document.getElementById('historyList');
                ul.innerHTML = h.map(item => `
                    <li class="history-item">
                        <a href="${BASE_URL}/search?q=${encodeURIComponent(item.query)}">🔍 ${item.query}</a>
                        <span class="history-item__date">${new Date(item.searched_at).toLocaleString('es-ES')}</span>
                    </li>`).join('');
                ul.hidden = false;
            } else {
                document.getElementById('historyEmpty').hidden = false;
            }
        }

        document.getElementById('saveProfileBtn')?.addEventListener('click', async () => {
            const u = document.getElementById('editUsername').value.trim();
            const e = document.getElementById('editEmail').value.trim();
            const res = await this.userModel.updateProfile(u, e);
            if (typeof showToast === 'function') showToast(res.message ?? (res.success ? 'Guardado' : 'Error'));
        });

        document.getElementById('changePassBtn')?.addEventListener('click', async () => {
            const cur = document.getElementById('currentPass').value;
            const nw  = document.getElementById('newPass').value;
            const res = await this.userModel.changePassword(cur, nw);
            if (typeof showToast === 'function') showToast(res.message ?? (res.success ? 'Cambiado' : 'Error'));
        });
    }
}

// ================================================================
// WISHLIST CONTROLLER
// ================================================================
export class WishlistController {
    constructor() {
        this.model   = new WishlistModel();
        this.baseUrl = BASE_URL;
    }

    async init() {
        document.getElementById('exploreBtn')?.setAttribute('href', `${this.baseUrl}/search`);
        try {
            const items = await this.model.getAll();
            document.getElementById('wishlistLoading').hidden = true;
            document.getElementById('wishlistCount').textContent =
                `${items.length} juego${items.length !== 1 ? 's' : ''} guardado${items.length !== 1 ? 's' : ''}`;

            if (!items.length) { document.getElementById('wishlistEmpty').hidden = false; return; }

            document.getElementById('wishlistGrid').hidden = false;
            document.getElementById('wishlistGrid').innerHTML = items.map(item => `
                <article class="game-card" id="wl-${item.game_slug}">
                    <div class="game-card__img-wrap">
                        <img src="${item.game_image || `${this.baseUrl}/img/no-image.svg`}" alt="${item.game_name}" loading="lazy"
                             onerror="this.src='${this.baseUrl}/img/no-image.svg'">
                        <div class="game-card__overlay">
                            <a href="${this.baseUrl}/game/${item.game_slug}" class="btn btn-primary btn-sm">Ver precios</a>
                        </div>
                    </div>
                    <div class="game-card__body">
                        <h3 class="game-card__title">${item.game_name}</h3>
                        <div class="game-card__meta">
                            ${item.game_rating ? `<span>⭐ ${parseFloat(item.game_rating).toFixed(1)}</span>` : ''}
                            <span class="text-muted">${new Date(item.added_at).toLocaleDateString('es-ES')}</span>
                        </div>
                        <button class="btn btn-outline btn-sm btn-remove" data-slug="${item.game_slug}">🗑 Eliminar</button>
                    </div>
                </article>`).join('');

            document.getElementById('wishlistGrid').addEventListener('click', e => {
                const btn = e.target.closest('.btn-remove');
                if (btn) this._remove(btn.dataset.slug, btn);
            });
        } catch {
            document.getElementById('wishlistLoading').hidden = true;
            document.getElementById('wishlistEmpty').hidden   = false;
        }
    }

    async _remove(slug, btn) {
        if (!confirm('¿Eliminar este juego de tu wishlist?')) return;
        btn.disabled = true;
        const res = await this.model.remove(slug);
        if (res.success) {
            const card = document.getElementById(`wl-${slug}`);
            card.style.transition = 'opacity .3s, transform .3s';
            card.style.opacity    = '0';
            card.style.transform  = 'scale(.9)';
            setTimeout(() => card.remove(), 300);
            if (typeof showToast === 'function') showToast('Juego eliminado de tu wishlist.');
        } else {
            btn.disabled = false;
        }
    }
}

// ================================================================
// ADMIN CONTROLLER
// ================================================================
export class AdminController {
    constructor() { this.baseUrl = BASE_URL; }

    async init() {
        try {
            const [statsRes, usersRes, apisRes] = await Promise.all([
                fetch(`${this.baseUrl}/api/admin/stats`),
                fetch(`${this.baseUrl}/api/admin/users`),
                fetch(`${this.baseUrl}/api/admin/api-status`),
            ]);
            const stats = await statsRes.json();
            const users = await usersRes.json();
            const apis  = await apisRes.json();

            document.getElementById('statUsers').textContent     = stats.total_users     ?? '–';
            document.getElementById('statWishlists').textContent = stats.total_wishlist  ?? '–';

            this._renderUsers(users);
            this._renderApiStatus(apis);
        } catch (e) {
            const el = document.getElementById('adminAlert');
            if (el) { el.className = 'alert alert-error'; el.textContent = 'Error cargando datos del panel.'; el.hidden = false; }
        }
    }

    _renderUsers(users) {
        document.getElementById('usersLoading').hidden = true;
        document.getElementById('usersTable').hidden   = false;
        const tbody = document.getElementById('usersTableBody');
        const me    = document.querySelector('meta[name="username"]')?.content;

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><div class="table-user"><span class="table-avatar">${u.username[0].toUpperCase()}</span>${u.username}</div></td>
                <td>${u.email}</td>
                <td><span class="role-badge role-badge--${u.role}">${u.role === 'admin' ? '🛡 Admin' : '👤 User'}</span></td>
                <td>${new Date(u.created_at).toLocaleDateString('es-ES')}</td>
                <td class="table-actions">
                    ${u.username !== me ? `
                        <select class="select-sm" data-user-id="${u.id}" onchange="window._adminChangeRole(this)">
                            <option value="user"  ${u.role==='user'?'selected':''}>User</option>
                            <option value="admin" ${u.role==='admin'?'selected':''}>Admin</option>
                        </select>
                        <button class="btn btn-danger btn-sm" onclick="window._adminDeleteUser(${u.id},'${u.username}')">🗑</button>
                    ` : '<span class="text-muted">(Tú)</span>'}
                </td>
            </tr>`).join('');

        window._adminDeleteUser = async (id, username) => {
            if (!confirm(`¿Eliminar a ${username}? Esta acción es irreversible.`)) return;
            await fetch(`${this.baseUrl}/api/admin/delete/${id}`, { method:'POST' });
            this.init();
        };
        window._adminChangeRole = async (sel) => {
            await fetch(`${this.baseUrl}/api/admin/role/${sel.dataset.userId}`, {
                method:'POST', headers:{'Content-Type':'application/json'},
                body: JSON.stringify({ role: sel.value }),
            });
            if (typeof showToast === 'function') showToast('Rol actualizado.');
        };
    }

    _renderApiStatus(apis) {
        document.getElementById('apiStatusList').innerHTML = apis.map(api => `
            <div class="api-status-item">
                <div><strong>${api.name}</strong> <span class="text-muted">– ${api.description}</span></div>
                <span class="status-badge status-badge--${api.configured ? 'ok' : 'warn'}">
                    ${api.configured ? '✅ Configurada' : '⚠️ Sin configurar'}
                </span>
            </div>`).join('');
    }
}
