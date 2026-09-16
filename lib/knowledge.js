/**
 * lib/knowledge.js
 * Knowledge Engine & System Prompt Orchestrator for NAD JARVIS
 * 
 * Conforms to Master Specification:
 * - Dismisses static hard-coded PERSONAL_KNOWLEDGE_BASE.
 * - Dynamically grounds the AI model using:
 *   1. Verified Owner Profile (from public.profiles)
 *   2. Approved Durable Memories (from public.memory_items)
 *   3. Retrieved Document Context (from public.documents)
 * - Foundation ready for future embedding/vector retrieval without rewriting.
 */

/**
 * Builds the dynamic system prompt for NAD JARVIS conversations.
 * @param {Object} options
 * @param {Object} options.ownerProfile Owner record from profiles table
 * @param {Array} options.memories Array of approved records from memory_items table
 * @param {string} options.ragContext Context retrieved from indexed documents
 * @returns {string} System prompt string
 */
function generateSystemPrompt({ ownerProfile = null, memories = [], ragContext = '' } = {}) {
  const fullName = ownerProfile?.full_name || 'Nadjibullah Uwabato';
  const nickname = ownerProfile?.nickname || 'Nad';

  let prompt = `You are NAD JARVIS, the ultra-capable, loyal, and proactive private personal AI assistant built exclusively for ${fullName} ("${nickname}").

Core Directives:
1. Speak with quiet confidence, concise intelligence, and high respect. Address him warmly as "${nickname}" or "Sir".
2. You are strictly a private, single-owner assistant. Never assume public or multi-user usage.
3. Be direct, clear, actionable, and precise. Never fabricate facts.
4. When planning or scheduling, prioritize high-impact execution and respect established time commitments.`;

  // Inject dynamic approved durable memories
  if (memories && memories.length > 0) {
    prompt += `\n\n--- Active Owner Context & Memories (Approved) ---\n`;
    memories.forEach(m => {
      prompt += `- [${m.category || 'General'}] ${m.key}: ${m.value}\n`;
    });
  }

  // Inject retrieved knowledge documents if provided
  if (ragContext && ragContext.trim()) {
    prompt += `\n\n--- Retrieved Documents & Knowledge References ---\n${ragContext.trim()}\n`;
  }

  return prompt;
}

/**
 * Knowledge Retrieval Foundation
 * Searches stored document records for relevant context to inject into prompt.
 * Structured so vector/embedding similarity can be cleanly dropped in.
 */
async function retrieveKnowledgeContext(client, userId, query) {
  if (!client || !userId || !query) return '';

  try {
    // Query recently stored/indexed document pointers
    const { data: docs } = await client
      .from('documents')
      .select('id, title, storage_path, mime_type, metadata, indexing_status')
      .eq('user_id', userId)
      .neq('indexing_status', 'failed')
      .order('updated_at', { ascending: false })
      .limit(5);

    if (!docs || docs.length === 0) return '';

    // Format available document pointers as grounded reference context
    return docs.map(d => {
      const summary = d.metadata?.summary || d.metadata?.description || `Stored file pointer (${d.mime_type || 'document'})`;
      return `Document: "${d.title}" (Status: ${d.indexing_status})\nSummary: ${summary}`;
    }).join('\n\n');
  } catch (err) {
    console.warn('[Knowledge Retrieval Warning]:', err.message);
    return '';
  }
}

module.exports = {
  generateSystemPrompt,
  retrieveKnowledgeContext
};
