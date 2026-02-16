-- Migration: Add requer_confirmacao column to Comunicados table
-- Date: 2026-02-16
-- Description: Allows marking comunicados that require read confirmation

ALTER TABLE Comunicados 
ADD COLUMN requer_confirmacao TINYINT(1) NOT NULL DEFAULT 0 
AFTER publicado_por_nome;

-- Create index for performance
CREATE INDEX idx_com_requer_confirmacao ON Comunicados(requer_confirmacao);
