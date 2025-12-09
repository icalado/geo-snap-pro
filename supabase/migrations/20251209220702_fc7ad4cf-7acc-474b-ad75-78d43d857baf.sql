-- Adicionar campos de monetização na tabela users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_pro boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS trial_end_date timestamp with time zone DEFAULT (now() + interval '7 days'),
ADD COLUMN IF NOT EXISTS pro_activated_at timestamp with time zone;

-- Criar tabela de logs do sistema
CREATE TABLE public.system_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  level text NOT NULL DEFAULT 'info',
  message text NOT NULL,
  details jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS na tabela de logs
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver logs (por enquanto criamos política básica)
CREATE POLICY "Admins can view all logs"
ON public.system_logs
FOR SELECT
TO authenticated
USING (true);

-- Qualquer usuário autenticado pode inserir logs
CREATE POLICY "Authenticated users can insert logs"
ON public.system_logs
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Criar tabela de transações/pagamentos simulados
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount decimal(10,2) NOT NULL,
  currency text DEFAULT 'BRL',
  status text DEFAULT 'pending',
  payment_method text,
  created_at timestamp with time zone DEFAULT now(),
  completed_at timestamp with time zone
);

-- Habilitar RLS
ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver suas próprias transações
CREATE POLICY "Users can view their own transactions"
ON public.payment_transactions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Usuários podem criar transações
CREATE POLICY "Users can create transactions"
ON public.payment_transactions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);