import { getStore } from '@netlify/blobs';
import { blobsStorage, blobsVideoStorage, createNetlifyHandler } from '../../server/netlify.mjs';

/** Serves /api/* and /uploads/* on Netlify. Data lives in Netlify Blobs (no external database needed). */
export default createNetlifyHandler({
  getStorage: () => {
    const rows = getStore({ name: 'presentations', consistency: 'strong' });
    const images = getStore({ name: 'thumbnails', consistency: 'strong' });
    return { storage: blobsStorage({ rows, images }), videoStorage: blobsVideoStorage({ rows }) };
  },
});

export const config = { path: ['/api/*', '/uploads/*'] };
