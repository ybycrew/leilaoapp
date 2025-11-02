-- Script auxiliar: Verificar estrutura atual da tabela vehicles
-- Execute este script PRIMEIRO para ver quais colunas existem

SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;


