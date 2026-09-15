/**
 * GET /api/files/[id]
 * Retrieves document metadata and creates a temporary signed URL pointer
 * Conforms to Section 2.3 & 2.4: Never exposes full content directly in database
 */

const { verifyOwnerSession } = require('../../lib/auth');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const fileId = req.query.id;
  if (!fileId) {
    return res.status(400).json({ error: 'Missing file id' });
  }

  try {
    const client = auth.client;

    const { data: document, error } = await client
      .from('documents')
      .select('*')
      .eq('id', fileId)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Generate signed download URL (valid for 15 minutes)
    let downloadUrl = null;
    if (document.storage_path) {
      const { data: signedData } = await client.storage
        .from('documents')
        .createSignedUrl(document.storage_path, 900);

      downloadUrl = signedData?.signedUrl || null;
    }

    return res.status(200).json({
      status: 'success',
      document: {
        ...document,
        downloadUrl
      }
    });

  } catch (err) {
    console.error('[Get File Error]:', err);
    return res.status(500).json({ error: 'Failed to retrieve file metadata' });
  }
};
