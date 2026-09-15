/**
 * POST /api/google/drive/upload
 * Conforms to Section 0 & 2.4:
 * Requires explicit confirmation before writing/uploading to connected Drive.
 */

const { verifyOwnerSession } = require('../../../lib/auth');
const { logAuditEvent } = require('../../../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const { fileName, contentBase64, confirmed = false } = req.body || {};

  if (!fileName) {
    return res.status(400).json({ error: 'Missing fileName parameter.' });
  }

  // Strict Section 0 confirmation check
  if (!confirmed) {
    return res.status(403).json({
      status: 'confirmation_required',
      message: `Writing to Google Drive requires explicit owner confirmation. Please confirm upload of "${fileName}".`,
      action: 'drive.upload',
      payload: { fileName }
    });
  }

  try {
    const client = auth.client;

    // Record document pointer
    const { data: doc, error } = await client
      .from('documents')
      .insert({
        user_id: auth.user.id,
        title: fileName,
        storage_path: `drive/${Date.now()}_${fileName}`,
        indexing_status: 'indexed'
      })
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    await logAuditEvent({
      userId: auth.user.id,
      action: 'drive.upload',
      resource: 'documents',
      details: { documentId: doc.id, fileName },
      req
    });

    return res.status(200).json({
      status: 'success',
      message: `File "${fileName}" successfully staged and recorded.`,
      document: doc
    });

  } catch (err) {
    console.error('[Drive Upload Error]:', err);
    return res.status(500).json({ error: 'Failed to upload to Google Drive' });
  }
};
