-- Migration: Add destinatario to BibliotecaDocumentos
-- Date: 2026-02-24
-- Purpose: allow documents to be targeted at a specific collaborator (matrícula)

ALTER TABLE BibliotecaDocumentos
    ADD COLUMN destinatario_matricula VARCHAR(50) NULL AFTER mime_type;

-- index for quick lookup by destinatário
CREATE INDEX idx_bib_doc_destinatario ON BibliotecaDocumentos(destinatario_matricula);
