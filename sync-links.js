import { readFileSync, writeFileSync } from 'node:fs';
import { renderSiteDirectory } from './site-directory.js';

const index = new URL('./index.html', import.meta.url);
const current = readFileSync(index, 'utf8');
const updated = renderSiteDirectory(current);
if (updated !== current) writeFileSync(index, updated);
