-- Script de Migração: Adicionar coluna ano_feriado à tabela CalendarioFeriados
-- Use este script se você já tinha a tabela CalendarioFeriados criada

-- 1. Adicionar coluna ano_feriado
ALTER TABLE CalendarioFeriados 
ADD COLUMN ano_feriado YEAR NOT NULL DEFAULT 2026 AFTER id;

-- 2. Atualizar valores existentes baseado na data
UPDATE CalendarioFeriados 
SET ano_feriado = YEAR(data);

-- 3. Adicionar índice para ano_feriado
ALTER TABLE CalendarioFeriados 
ADD KEY idx_feriado_ano (ano_feriado);

-- 4. Adicionar índice composto para ano_feriado e tipo
ALTER TABLE CalendarioFeriados 
ADD KEY idx_feriado_ano_tipo (ano_feriado, tipo);

-- 5. Modificar UNIQUE constraint: remover a antiga e adicionar a nova
ALTER TABLE CalendarioFeriados 
DROP KEY uq_feriado_data,
ADD UNIQUE KEY uq_feriado_ano_data (ano_feriado, data);

-- Verificar se a migração foi bem-sucedida
SELECT 
    id, 
    ano_feriado, 
    data, 
    nome, 
    tipo 
FROM CalendarioFeriados 
LIMIT 5;
