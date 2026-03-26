-- ======================================
-- Migração: Adicionar suporte a eventos no Carrossel
-- ======================================

-- Adicionar campos eh_evento e foto_perfil à tabela Carrossel
ALTER TABLE Carrossel 
ADD COLUMN eh_evento BOOLEAN DEFAULT FALSE AFTER status,
ADD COLUMN foto_perfil VARCHAR(500) NULL AFTER eh_evento;

-- Criar índice para buscar eventos rapidamente
CREATE INDEX idx_carrossel_evento ON Carrossel(status, eh_evento);

-- Mensagem de confirmação
SELECT 'Migração concluída com sucesso' as resultado;
