import { getStore } from '@netlify/blobs';
import { blobsStorage, blobsVideoStorage, createNetlifyHandler } from '../../server/netlify.mjs';

/**
 * Serves /api/* and /uploads/* on Netlify. Data lives in Netlify Blobs (no external database needed).
 *
 * Store configuration: Netlify's "automatic" per-invocation Blobs token is short-lived. A warm function
 * container that outlives it starts failing every Blobs call with "BlobsInternalError: Failed to decode
 * token: Token expired" until a fresh cold start. Setting BLOBS_SITE_ID and BLOBS_TOKEN (a Netlify
 * Personal Access Token) switches to "manual configuration" with a long-lived token, which does not
 * expire mid-container and avoids that failure. Falls back to automatic configuration when unset.
 */
const manual = process.env.BLOBS_SITE_ID && process.env.BLOBS_TOKEN
  ? { siteID: process.env.BLOBS_SITE_ID, token: process.env.BLOBS_TOKEN }
  : {};

export default createNetlifyHandler({
  getStorage: () => {
    const rows = getStore({ name: 'presentations', consistency: 'strong', ...manual });
    const images = getStore({ name: 'thumbnails', consistency: 'strong', ...manual });
    return { storage: blobsStorage({ rows, images }), videoStorage: blobsVideoStorage({ rows }) };
  },
});

export const config = { path: ['/api/*', '/uploads/*'] };
