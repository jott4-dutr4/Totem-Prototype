import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { numero_pedido, metodo_pagamento } = body;

    if (!numero_pedido || !metodo_pagamento) {
      return new Response(
        JSON.stringify({ error: "numero_pedido e metodo_pagamento são obrigatórios." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Atualiza o status para pago e preenche o método de pagamento
    const { data, error } = await supabaseClient
      .from('pedidos')
      .update({ status: 'pago', metodo_pagamento })
      .eq('numero_pedido', numero_pedido)
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Dá baixa real no estoque dos produtos
    if (data && data.itens_comprados) {
      for (const item of data.itens_comprados) {
        // Busca o estoque atualizado
        const { data: produto, error: errProd } = await supabaseClient
          .from('produtos')
          .select('estoque_atual')
          .eq('id', item.id)
          .single();

        if (!errProd && produto && produto.estoque_atual !== null && produto.estoque_atual !== undefined) {
          const novoEstoque = produto.estoque_atual - item.qtd;
          // Atualiza o estoque no banco
          await supabaseClient
            .from('produtos')
            .update({ estoque_atual: novoEstoque })
            .eq('id', item.id);
        }
      }
    }

    // Verificação de erro removida

    return new Response(
      JSON.stringify({ success: true, pedido: data }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Erro ao confirmar pagamento:", error);
    return new Response(
      JSON.stringify({ error: error.message || JSON.stringify(error) || 'Erro interno do servidor' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
