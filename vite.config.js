import { defineConfig } from 'vite';
import { renderSiteDirectory } from './site-directory.js';

// Use the public homepage URL when absolute social previews are required.
function socialMetadata(publicUrl) {
    const page = new URL(publicUrl);
    if (page.protocol !== 'https:' && page.protocol !== 'http:') {
        throw new Error('NEON_VOID_URL must be an absolute HTTP(S) homepage URL.');
    }

    return {
        name: 'neon-void-social-metadata',
        transformIndexHtml: {
            order: 'post',
            handler: () => [
                { tag: 'link', attrs: { rel: 'canonical', href: page.href }, injectTo: 'head' },
                { tag: 'meta', attrs: { property: 'og:url', content: page.href }, injectTo: 'head' },
            ],
        },
        generateBundle: {
            order: 'post',
            handler(_options, bundle) {
                const index = bundle['index.html'];
                if (index?.type !== 'asset' || typeof index.source !== 'string') return;
                index.source = index.source.replace(/(<meta property="og:image" content=")([^"]+)/,
                    (_, prefix, image) => prefix + new URL(image, page).href);
            },
        },
    };
}

export default defineConfig({
    plugins: [{
        name: 'site-directory',
        transformIndexHtml: renderSiteDirectory,
    }, process.env.NEON_VOID_URL && socialMetadata(process.env.NEON_VOID_URL)],
});
