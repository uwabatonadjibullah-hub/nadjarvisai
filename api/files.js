/**
 * api/files.js
 * Consolidated File Handler for NAD JARVIS
 *
 * Supports:
 * - GET    /api/files            -> Lists stored document records for the owner
 * - GET    /api/files?id=<id>    -> Retrieves document metadata and creates 15-minute signed URL
 * - POST   /api/files            -> Uploads file to Supabase Storage and records pointer in documents
 * - DELETE /api/files?id=<id>    -> Deletes document record and Supabase Storage object
 *
 * Conforms to Section 2.3, 2.4 & Section 20 (Honest 'pending' indexing status)
 */

const { verifyOwnerSession } = require('../lib/auth');
const { logAuditEvent } = require('../lib/audit');

module.exports = async function handler(req, res) {
  const auth = await verifyOwnerSession(req, res);
  if (!auth) return;

  const client = auth.client;
  const userId = auth.user.id;

  // ─── GET /api/files ─────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    const fileId = req.query.id;

    try {
      // 1. If fileId provided: Retrieve specific file and generate signed download URL
      if (fileId) {
        const { data: document, error } = await client
          .from('documents')
          .select('*')
          .eq('id', fileId)
          .eq('user_id', userId)
          .maybeSingle();

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
      }

      // 2. If no fileId: List all document pointers for the owner
      const { data: documents, error: listErr } = await client
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (listErr) {
        return res.status(500).json({ error: listErr.message });
      }

      return res.status(200).json({
        status: 'success',
        count: documents ? documents.length : 0,
        files: documents || [],
        documents: documents || []
      });

    } catch (err) {
      console.error('[Get File Error]:', err);
      return res.status(500).json({ error: 'Failed to retrieve files' });
    }
  }

  // ─── POST /api/files (Upload) ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const { title, contentBase64, mimeType = 'text/plain', metadata = {} } = req.body || {};

    if (!title || !contentBase64) {
      return res.status(400).json({ error: 'Missing title or contentBase64.' });
    }

    try {
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

      // 2. Insert Pointer into Documents Table with HONEST status ('pending')
      const { data: docRecord, error: docErr } = await client
        .from('documents')
        .insert({
          user_id: userId,
          title: title.trim(),
          storage_path: storagePath,
          mime_type: mimeType,
          size_bytes: fileBuffer.length,
          metadata,
          indexing_status: 'pending' // Honest status — ready for future vector indexing
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

      return res.status(201).json({ status: 'success', document: docRecord });

    } catch (err) {
      console.error('[File Upload Error]:', err);
      return res.status(500).json({ error: err.message || 'File upload error' });
    }
  }

  // ─── DELETE /api/files?id=<id> ──────────────────────────────────────────────
  if (req.method === 'DELETE') {
    const fileId = req.query.id || (req.body && req.body.id);
    if (!fileId) {
      return res.status(400).json({ error: 'Missing file id for deletion.' });
    }

    try {
      const { data: doc } = await client
        .from('documents')
        .select('storage_path')
        .eq('id', fileId)
        .eq('user_id', userId)
        .maybeSingle();

      if (doc && doc.storage_path) {
        await client.storage.from('documents').remove([doc.storage_path]);
      }

      const { error: delErr } = await client
        .from('documents')
        .delete()
        .eq('id', fileId)
        .eq('user_id', userId);

      if (delErr) {
        return res.status(500).json({ error: delErr.message });
      }

      await logAuditEvent({
        userId,
        action: 'files.deleted',
        resource: 'documents',
        details: { fileId },
        req
      });

      return res.status(200).json({ status: 'success', message: 'Document deleted successfully.' });

    } catch (err) {
      console.error('[File Delete Error]:', err);
      return res.status(500).json({ error: 'Failed to delete file' });
    }
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
