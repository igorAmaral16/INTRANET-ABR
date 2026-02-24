-- Migration: Add is_private flag to BibliotecaPastas
-- Date: 2026-02-24
-- Purpose: allow folders to be marked as "private" (used only for Meus Documentos)

ALTER TABLE BibliotecaPastas
    ADD COLUMN is_private TINYINT(1) NOT NULL DEFAULT 0 AFTER slug;

-- Index to efficiently query public folders
CREATE INDEX idx_bib_pasta_private ON BibliotecaPastas(is_private);