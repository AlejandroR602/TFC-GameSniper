export class HomeController {
    constructor() {
        this.baseUrl  = document.querySelector('meta[name="base-url"]')?.content ?? '';
        this.loggedIn = document.querySelector('meta[name="user-logged-in"]')?.content === 'true';
    }

    init() {
        this._bindSearch();
        this._bindPopularTags();
        this._setupCta();
    }

    _bindSearch() {
        const input = document.getElementById('heroSearchInput');
        const btn   = document.getElementById('heroSearchBtn');

        const go = () => {
            const q = input?.value.trim();
            if (q) window.location.href = `${this.baseUrl}/search?q=${encodeURIComponent(q)}`;
        };

        btn?.addEventListener('click', go);
        input?.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }

    _bindPopularTags() {
        document.querySelectorAll('.hero__tags a[data-search]').forEach(tag => {
            tag.href = `${this.baseUrl}/search?q=${encodeURIComponent(tag.dataset.search)}`;
        });
    }

    _setupCta() {
        const cta = document.getElementById('ctaSection');
        if (this.loggedIn && cta) {
            cta.hidden = true;
            return;
        }
        const reg   = document.getElementById('ctaRegister');
        const login = document.getElementById('ctaLogin');
        if (reg)   reg.href   = `${this.baseUrl}/register`;
        if (login) login.href = `${this.baseUrl}/login`;
    }
}
