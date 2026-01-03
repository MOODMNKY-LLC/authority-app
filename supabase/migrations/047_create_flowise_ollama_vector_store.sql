-- Migration: Create Flowise vector store for Ollama embeddings
-- Based on: https://docs.flowiseai.com/integrations/langchain/vector-stores/supabase
-- 
-- This migration creates:
-- 1. ollama_documents table for storing Ollama embeddings (786 dimensions)
-- 2. match_ollama_documents function for similarity search
--
-- Note: pgvector extension should already be enabled by migration 046

-- Create a table to store Ollama documents
CREATE TABLE IF NOT EXISTS ollama_documents (
  id bigserial PRIMARY KEY,
  content text, -- corresponds to Document.pageContent
  metadata jsonb, -- corresponds to Document.metadata
  embedding vector(786) -- 786 dimensions for Ollama embeddings
);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS ollama_documents_embedding_idx ON ollama_documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to search for Ollama documents
CREATE OR REPLACE FUNCTION match_ollama_documents (
  query_embedding vector(786),
  match_count int DEFAULT NULL,
  filter jsonb DEFAULT '{}'
) 
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
#variable_conflict use_column
BEGIN
  RETURN QUERY
  SELECT
    id,
    content,
    metadata,
    1 - (ollama_documents.embedding <=> query_embedding) AS similarity
  FROM ollama_documents
  WHERE metadata @> filter
  ORDER BY ollama_documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE ollama_documents IS 'Flowise vector store for Ollama embeddings - 786 dimensions';
COMMENT ON FUNCTION match_ollama_documents IS 'Search for similar Ollama documents using cosine similarity with optional metadata filtering';


