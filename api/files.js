/**
 * api/files.js
 * Consolidated File Handler for NAD JARVIS
 *
 * Merges the following original endpoints (no functionality removed):
 *   POST /api/files/upload  -> POST /api/files?action=upload
 *   GET  /api/files/[id]    -> GET  /api/files?id=<uuid>
 *
 * Routing:
 *   POST /api/files          -> upload
 *   POST /api/files?action=upload -> upload
 *   GET  /api/files?id=<id>  -> retrieve by ID (signed URL + metadata)
 *
 * Conforms to Section 2.3 & 2.4
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  // ─── GET /api/files?id=<uuid>  (retrieve by ID) ────────────────────────────
  if (req.method === 'GET') {
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
        document: { ...document, downloadUrl }
      });

    } catch (err) {
      console.error('[Get File Error]:', err);
      return res.status(500).json({ error: 'Failed to retrieve file metadata' });
    }
  }

  // ─── POST /api/files  (upload) ──────────────────────────────────────────────
  if (req.method === 'POST') {
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
        .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false });

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

      return res.status(200).json({ status: 'success', document: docRecord });

    } catch (err) {
      console.error('[File Upload Error]:', err);
      return res.status(500).json({ error: err.message || 'File upload error' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
