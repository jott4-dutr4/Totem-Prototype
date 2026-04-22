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
    // Configura o cliente usando SERVICE_ROLE_KEY para ignorar RLS e buscar o CPF com segurança
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { cpf } = body;

    if (!cpf) {
      return new Response(
        JSON.stringify({ error: "CPF não fornecido." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Busca o cliente pelo CPF
    const { data, error } = await supabaseClient
      .from('clientes')
      .select('*')
      .eq('cpf', cpf)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = 0 rows returned (Cliente Novo)
      throw error;
    }

    // Se retornar data, o cliente existe. Se retornar null/undefined, não existe.
    return new Response(
      JSON.stringify({ success: true, cliente: data || null }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error("Erro ao verificar CPF:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
