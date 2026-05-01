// imports
const BASE_URL = document.querySelector('meta[name="base-url"]').content;

//admin controller
export class AdminController {
    async init() {
        await Promise.all([
            this.loadStats(),
            this.loadUsers(),
            this.loadApiStatus()
        ]);
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
            document.getElementById('statUsers').textContent     = data.total_users;
            document.getElementById('statWishlists').textContent = data.total_wishlist;
        } catch (err) {
            this.showAlert('Error al cargar estadísticas.');
            console.error('[AdminController] loadStats:', err);
        }
    }

    async loadUsers() {
        try {
            const res   = await fetch(`${BASE_URL}/api/admin/users`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const users = await res.json();

            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = users.map((u, i) => `
                <tr>
                    <td>${i + 1}</td>
                    <td>${u.username}</td>
                    <td>${u.email}</td>
                    <td>${u.role}</td>
                    <td>${u.created_at}</td>
                    <td>
                        <button class="btn btn-danger" onclick="AdminController.deleteUser(${u.id})">🗑 Eliminar</button>
                        <button class="btn btn-outline" onclick="AdminController.changeRole(${u.id})">🔄 Rol</button>
                    </td>
                </tr>
            `).join('');

            document.getElementById('usersLoading').hidden = true;
            document.getElementById('usersTable').hidden   = false;
        } catch (err) {
            document.getElementById('usersLoading').hidden = true;
            this.showAlert('Error al cargar la lista de usuarios.');
            console.error('[AdminController] loadUsers:', err);
        }
    }

    async loadApiStatus() {
        try {
            const res  = await fetch(`${BASE_URL}/api/admin/api-status`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const apis = await res.json();

            document.getElementById('statApis').textContent = apis.filter(a => a.configured).length;
            document.getElementById('apiStatusList').innerHTML = apis.map(api => `
                <div class="api-status-item">
                    <strong>${api.name}</strong> – ${api.description}
                    <span>${api.configured ? '✅ Configurada' : '❌ Sin configurar'}</span>
                </div>
            `).join('');
        } catch (err) {
            this.showAlert('Error al cargar el estado de las APIs.');
            console.error('[AdminController] loadApiStatus:', err);
        }
    }

    static async deleteUser(id) {
        if (!confirm('¿Eliminar este usuario?')) return;
        try {
            const res  = await fetch(`${BASE_URL}/api/admin/delete/${id}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message ?? 'No se pudo eliminar el usuario.');
        } catch (err) {
            alert('Error de conexión al eliminar el usuario.');
            console.error('[AdminController] deleteUser:', err);
        }
    }

    static async changeRole(id) {
        const role = prompt('Nuevo rol (user / admin):');
        if (!role) return;
        try {
            const res  = await fetch(`${BASE_URL}/api/admin/role/${id}`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({ role })
            });
            const data = await res.json();
            if (data.success) location.reload();
            else alert(data.message ?? 'No se pudo cambiar el rol.');
        } catch (err) {
            alert('Error de conexión al cambiar el rol.');
            console.error('[AdminController] changeRole:', err);
        }
    }
}

window.AdminController = AdminController;