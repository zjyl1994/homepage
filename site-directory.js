import siteConfig from './sites.json' with { type: 'json' };

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = text => text.replace(/[&<>"']/g, char => entities[char]);

const ICONS = {
    blog: '<path d="M5 4h9l5 5v11H5Z"/><path d="M14 4v5h5M8 12h8M8 16h5"/>',
    github: '<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.69-4.57 4.94.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/>',
    projects: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
    email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    link: '<path d="M10 13a5 5 0 0 0 7.07 0l2-2a5 5 0 0 0-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 0 0-7.07 0l-2 2A5 5 0 0 0 12 20.14l1.5-1.5"/>',
    social: '<circle cx="18" cy="5" r="2.5"/><circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="19" r="2.5"/><path d="m8.3 10.8 7.4-4.3M8.3 13.2l7.4 4.3"/>',
};

const ICON_NAMES = new Set(Object.keys(ICONS));
const supportedProtocols = new Set(['http:', 'https:', 'mailto:']);
const linkBlock = /(^[ \t]*<!-- site-links:start -->\r?\n)([\s\S]*?)(^[ \t]*<!-- site-links:end -->)/m;

function fail(message) {
    throw new Error(message);
}

function normalizeSites(config) {
    if (!Array.isArray(config)) fail('sites.json must contain an array of site entries.');

    const ids = new Set();
    return config.map((entry, index) => {
        const position = index + 1;
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            fail(`sites.json entry ${position} must be an object.`);
        }

        const id = typeof entry.id === 'string' ? entry.id.trim() : '';
        if (!id) fail(`sites.json entry ${position} needs a non-empty id.`);
        if (ids.has(id)) fail(`sites.json entry ${position} repeats the id "${id}".`);
        ids.add(id);

        const title = typeof entry.title === 'string' ? entry.title.trim() : '';
        if (!title) fail(`sites.json entry ${position} ("${id}") needs a non-empty title.`);

        if (typeof entry.url !== 'string' || !entry.url.trim()) {
            fail(`sites.json entry ${position} ("${id}") needs a non-empty url.`);
        }
        let url;
        try {
            url = new URL(entry.url.trim());
        } catch {
            fail(`sites.json entry ${position} ("${id}") has an invalid url.`);
        }
        if (!supportedProtocols.has(url.protocol)) {
            fail(`sites.json entry ${position} ("${id}") uses unsupported protocol "${url.protocol}"; use HTTP(S) or mailto.`);
        }
        if (url.protocol === 'mailto:' && !url.pathname.trim()) {
            fail(`sites.json entry ${position} ("${id}") has an empty mailto address.`);
        }

        if (typeof entry.icon !== 'string' || !ICON_NAMES.has(entry.icon)) {
            fail(`sites.json entry ${position} ("${id}") uses unknown icon "${entry.icon}"; use one of: ${[...ICON_NAMES].join(', ')}.`);
        }

        if (typeof entry.order !== 'number' || !Number.isFinite(entry.order)) {
            fail(`sites.json entry ${position} ("${id}") needs a finite numeric order.`);
        }

        if (entry.featured !== undefined && typeof entry.featured !== 'boolean') {
            fail(`sites.json entry ${position} ("${id}") has a non-boolean featured value.`);
        }
        if (entry.enabled !== undefined && typeof entry.enabled !== 'boolean') {
            fail(`sites.json entry ${position} ("${id}") has a non-boolean enabled value.`);
        }
        if (entry.description !== undefined && typeof entry.description !== 'string') {
            fail(`sites.json entry ${position} ("${id}") has a non-string description.`);
        }

        return {
            index,
            id,
            title,
            href: url.href,
            external: url.protocol === 'http:' || url.protocol === 'https:',
            icon: entry.icon,
            description: typeof entry.description === 'string' ? entry.description.trim() : '',
            featured: entry.featured === true,
            order: entry.order,
            enabled: entry.enabled !== false,
        };
    })
        .filter(site => site.enabled)
        .sort((left, right) => left.order - right.order || left.index - right.index);
}

function renderEntry(site, indent) {
    const target = site.external ? ' target="_blank" rel="noopener noreferrer"' : '';
    const description = site.description
        ? `${indent}        <span class="site-link__description">${escapeHtml(site.description)}</span>\n`
        : '';

    return `${indent}<li>
${indent}    <a class="site-link" data-magnet href="${escapeHtml(site.href)}"${target}>
${indent}        <span class="site-link__surface">
${indent}            <svg class="site-link__icon" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[site.icon]}</svg>
${indent}            <span class="site-link__copy">
${indent}                <span class="site-link__title">${escapeHtml(site.title)}</span>
${description}${indent}            </span>
${indent}            <svg class="site-link__arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M7 17 17 7M8 7h9v9"/></svg>
${indent}        </span>
${indent}    </a>
${indent}</li>
`;
}

function renderList(items, indent, modifier = '') {
    const className = modifier ? `site-links ${modifier}` : 'site-links';
    const rows = items.map(site => renderEntry(site, `${indent}    `)).join('');
    return `${indent}<ul class="${className}" data-count="${items.length}">
${rows}${indent}</ul>
`;
}

function pickVisible(sites) {
    if (sites.length <= 6) return { primary: sites, overflow: [] };

    const featured = sites.filter(site => site.featured).slice(0, 4);
    if (featured.length === 0) {
        return { primary: sites.slice(0, 3), overflow: sites.slice(3) };
    }

    const primaryIds = new Set(featured.map(site => site.id));
    return {
        primary: featured,
        overflow: sites.filter(site => !primaryIds.has(site.id)),
    };
}

export function renderSiteDirectory(html) {
    const match = linkBlock.exec(html);
    if (!match) throw new Error('Missing site link markers in index.html.');

    const indent = match[1].match(/^[ \t]*/)[0];
    const sites = normalizeSites(siteConfig);
    const { primary, overflow } = pickVisible(sites);

    let content = renderList(primary, indent);
    if (overflow.length > 0) {
        content += `${indent}<details class="more-links">
${indent}    <summary>More</summary>
${renderList(overflow, `${indent}    `, 'site-links--more')}${indent}</details>
`;
    }

    return html.replace(linkBlock, (_block, begin, _body, end) => begin + content + end);
}
