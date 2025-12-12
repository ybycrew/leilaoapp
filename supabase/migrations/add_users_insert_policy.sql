-- Adicionar política de INSERT para tabela users
-- Permite que usuários criem seu próprio registro na tabela users
CREATE POLICY "Users can insert own data" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);

