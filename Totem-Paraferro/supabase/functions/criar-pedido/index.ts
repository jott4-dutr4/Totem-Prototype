import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Lida com a requisição de preflight CORS (OPTIONS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Configura o cliente usando SERVICE_ROLE_KEY para ignorar RLS na tabela de pedidos
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Recebe os dados do corpo da requisição
    const body = await req.json();
    const { cliente_id, itens_comprados } = body;
    // metodo_pagamento é opcional agora

    // Validação básica de segurança
    if (!cliente_id || !Array.isArray(itens_comprados) || itens_comprados.length === 0) {
      return new Response(
        JSON.stringify({ error: "Dados do pedido incompletos ou inválidos." }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Pega os IDs para buscar os preços reais no banco de dados (ANTIFRAUDE)
    const idsProdutos = itens_comprados.map((item: any) => item.id);
    
    const { data: produtosDb, error: erroProdutos } = await supabaseClient
      .from('produtos')
      .select('id, preco')
      .in('id', idsProdutos);

    if (erroProdutos || !produtosDb) {
      throw new Error("Erro ao buscar preços dos produtos no banco de dados.");
    }

    // Calcula o total real no servidor
    let totalCalculado = 0;
    const itensProcessados = itens_comprados.map((item: any) => {
      const produtoOficial = produtosDb.find((p) => p.id === item.id);
      if (!produtoOficial) {
        throw new Error(`Produto não encontrado no catálogo: ID ${item.id}`);
      }
      
      const totalItem = produtoOficial.preco * item.qtd;
      totalCalculado += totalItem;

      return {
        ...item,
        preco: produtoOficial.preco,
        total: totalItem
      };
    });

    // Prepara o objeto final do pedido
    const pedido = {
      cliente_id,
      total: totalCalculado, // Total seguro calculado pelo servidor
      itens_comprados: itensProcessados,
      status: 'pendente',
      metodo_pagamento: 'Aguardando Pagamento' // Impede o erro de not-null constraint
    };

    // Insere o pedido na tabela do Supabase
    const { data, error } = await supabaseClient
      .from('pedidos')
      .insert([pedido])
      .select()
      .single();

    if (error) {
      throw error;
    }

    // Retorna o sucesso da operação
    return new Response(
      JSON.stringify({ success: true, pedido: data }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error("Erro ao criar pedido:", error);
    // Retornamos 200 com um objeto 'error' para o frontend ler exatamente o que falhou sem estourar exception cega
    return new Response(
      JSON.stringify({ error: error.message || JSON.stringify(error) || 'Erro interno do servidor' }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
