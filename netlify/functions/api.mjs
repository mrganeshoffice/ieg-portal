import { getStore } from '@netlify/blobs';
import { blobsStorage, createNetlifyHandler } from '../../server/netlify.mjs';

/** Serves /api/* and /uploads/* on Netlify. Data lives in Netlify Blobs (no external database needed). */
export default createNetlifyHandler({
  getStorage: () => blobsStorage({
    rows: getStore({ name: 'presentations', consistency: 'strong' }),
    images: getStore({ name: 'thumbnails', consistency: 'strong' }),
  }),
});

export const config = { path: ['/api/*', '/uploads/*'] };
