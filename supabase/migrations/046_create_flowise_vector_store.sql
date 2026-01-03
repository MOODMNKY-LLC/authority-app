-- Migration: Create Flowise vector store for standard embeddings (OpenAI, etc.)
-- Based on: https://docs.flowiseai.com/integrations/langchain/vector-stores/supabase
-- 
-- This migration creates:
-- 1. pgvector extension (if not exists)
-- 2. documents table for storing embeddings (1536 dimensions for OpenAI)
-- 3. match_documents function for similarity search

-- Enable the pgvector extension to work with embedding vectors
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table to store your documents
CREATE TABLE IF NOT EXISTS documents (
  id bigserial PRIMARY KEY,
  content text, -- corresponds to Document.pageContent
  metadata jsonb, -- corresponds to Document.metadata
  embedding vector(1536) -- 1536 works for OpenAI embeddings, change if needed
);

-- Create index for faster similarity search
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create a function to search for documents
CREATE OR REPLACE FUNCTION match_documents (
  query_embedding vector(1536),
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
    1 - (documents.embedding <=> query_embedding) AS similarity
  FROM documents
  WHERE metadata @> filter
  ORDER BY documents.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add comment for documentation
COMMENT ON TABLE documents IS 'Flowise vector store for standard embeddings (OpenAI, etc.) - 1536 dimensions';
COMMENT ON FUNCTION match_documents IS 'Search for similar documents using cosine similarity with optional metadata filtering';


