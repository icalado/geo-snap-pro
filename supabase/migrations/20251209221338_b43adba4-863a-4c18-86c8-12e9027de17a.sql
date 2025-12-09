-- Criar função para verificar se é admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid()
    AND email = 'ilberto.antonio.calado@gmail.com'
  )
$$;

-- Atualizar política de SELECT na tabela users para permitir admin ver todos
DROP POLICY IF EXISTS "Users can view their own profile" ON public.users;
CREATE POLICY "Users can view profiles"
ON public.users
FOR SELECT
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Atualizar política de UPDATE na tabela users para permitir admin editar todos
DROP POLICY IF EXISTS "Users can update their own profile" ON public.users;
CREATE POLICY "Users can update profiles"
ON public.users
FOR UPDATE
TO authenticated
USING (auth.uid() = id OR public.is_admin());

-- Admin pode ver todas as transações
DROP POLICY IF EXISTS "Admins can view all transactions" ON public.payment_transactions;
CREATE POLICY "Admins can view all transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (public.is_admin());

-- Admin pode ver todos os projetos (para contagem)
DROP POLICY IF EXISTS "Admins can view all projects" ON public.projects;
CREATE POLICY "Admins can view all projects"
ON public.projects
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_admin());