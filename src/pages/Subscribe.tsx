import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ArrowLeft, Crown, Check, Zap, Shield, Infinity, Loader2 } from 'lucide-react';

const Subscribe = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  const features = [
    { icon: Infinity, text: 'Projetos ilimitados' },
    { icon: Zap, text: 'Exportação de relatórios em PDF e CSV' },
    { icon: Shield, text: 'Backup automático na nuvem' },
    { icon: Check, text: 'Suporte prioritário' },
  ];

  const handleCheckout = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      navigate('/login');
      return;
    }

    setProcessing(true);
    
    try {
      // Simular processamento de pagamento
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Criar registro de transação
      const { error: transactionError } = await supabase
        .from('payment_transactions')
        .insert({
          user_id: user.id,
          amount: 29.90,
          currency: 'BRL',
          status: 'completed',
          payment_method: 'simulated',
          completed_at: new Date().toISOString()
        });

      if (transactionError) throw transactionError;

      // Atualizar status PRO do usuário
      const { error: updateError } = await supabase
        .from('users')
        .update({
          is_pro: true,
          pro_activated_at: new Date().toISOString()
        })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Registrar log
      await supabase.from('system_logs').insert({
        user_id: user.id,
        level: 'info',
        message: 'Assinatura PRO ativada',
        details: { method: 'simulated_checkout', amount: 29.90 }
      });

      toast.success('🎉 Parabéns! Sua assinatura PRO foi ativada!');
      navigate('/home');

    } catch (error: any) {
      console.error('Erro no checkout:', error);
      
      // Registrar erro
      await supabase.from('system_logs').insert({
        user_id: user?.id,
        level: 'error',
        message: 'Falha no checkout',
        details: { error: error.message }
      });

      toast.error('Erro ao processar pagamento. Tente novamente.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/home')}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-xl font-bold text-foreground">Assinar PRO</h1>
        </div>

        {/* Hero Card */}
        <Card className="bg-gradient-to-br from-amber-500/20 via-amber-600/10 to-background border-amber-500/30">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
              <Crown className="w-8 h-8 text-amber-500" />
            </div>
            <Badge className="mx-auto mb-2 bg-amber-500 text-white">MAIS POPULAR</Badge>
            <CardTitle className="text-2xl">Plano PRO</CardTitle>
            <CardDescription>
              Desbloqueie todo o potencial do GeoCam
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Price */}
            <div className="text-center">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-sm text-muted-foreground">R$</span>
                <span className="text-5xl font-bold text-foreground">29</span>
                <span className="text-2xl text-foreground">,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Cancele a qualquer momento
              </p>
            </div>

            {/* Features */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <feature.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-foreground">{feature.text}</span>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button 
              className="w-full h-12 text-lg font-semibold bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleCheckout}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  Assinar Agora
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Pagamento seguro • SSL criptografado
            </p>
          </CardContent>
        </Card>

        {/* Guarantee */}
        <Card className="bg-card border-border">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6 text-green-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Garantia de 7 dias</h3>
              <p className="text-sm text-muted-foreground">
                Não gostou? Devolvemos 100% do seu dinheiro.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Subscribe;
