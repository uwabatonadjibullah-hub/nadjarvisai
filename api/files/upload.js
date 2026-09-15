/**
 * POST /api/files/upload
 * Uploads a document to Supabase Storage bucket 'documents'
 * Records file pointer and metadata in the 'documents' table
 * Conforms to Section 2.3 & 2.4
 */

const { verifyOwnerSession } = require('../../lib/auth');
const { logAuditEvent } = require('../../lib/audit');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const { title, contentBase64, mimeType = 'text/plain', metadata = {} } = req.body || {};

  if (!title || !contentBase64) {
    return res.status(400).json({ error: 'Missing title or contentBase64.' });
  }

  try {
    const userId = auth.user.id;
    const client = auth.client;

    const fileBuffer = Buffer.from(contentBase64, 'base64');
    const safeTitle = title.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `${userId}/${Date.now()}_${safeTitle}`;

    // 1. Upload to Supabase Storage (private documents bucket)
    const { error: uploadErr } = await client.storage
      .from('documents')
      .upload(storagePath, fileBuffer, {
        contentType: mimeType,
        upsert: false
      });

    if (uploadErr) {
      return res.status(500).json({ error: `Storage upload failed: ${uploadErr.message}` });
    }

    // 2. Insert Pointer into Documents Table
    const { data: docRecord, error: docErr } = await client
      .from('documents')
      .insert({
        user_id: userId,
        title,
        storage_path: storagePath,
        mime_type: mimeType,
        size_bytes: fileBuffer.length,
        metadata,
        indexing_status: 'indexed'
      })
      .select('*')
      .single();

    if (docErr) {
      return res.status(500).json({ error: `Document record creation failed: ${docErr.message}` });
    }

    await logAuditEvent({
      userId,
      action: 'files.upload',
      resource: 'documents',
      details: { documentId: docRecord.id, title, sizeBytes: fileBuffer.length },
      req
    });

    return res.status(200).json({
      status: 'success',
      document: docRecord
    });

  } catch (err) {
    console.error('[File Upload Error]:', err);
    return res.status(500).json({ error: err.message || 'File upload error' });
  }
};
