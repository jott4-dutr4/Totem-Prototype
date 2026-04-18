/**
 * 📄 ARQUIVO: supabase-config.js
 * 🧠 PROPÓSITO: Configurar a conexão com o banco de dados (Supabase)
 * 
 * Este arquivo funciona como a "ponte" entre o nosso código no navegador (frontend)
 * e o nosso banco de dados na nuvem. Sem ele, não conseguiríamos salvar ou buscar clientes e pedidos.
 */

// 1️⃣ Credenciais de Acesso
// O URL diz ONDE o banco está, e a KEY é a "chave" que nos dá permissão para acessar.
const SUPABASE_URL = "https://rgdilkzpuwutpaiugujq.supabase.co";
const SUPABASE_KEY = "sb_publishable_OTswuvr-89EcAZ3F6Ya7fg_qKG9PenH";

// 2️⃣ Inicializando a Conexão
// A função createClient "liga" o nosso app ao Supabase usando as credenciais acima.
// Essa variável 'supabaseClient' será usada no app.js para fazer as requisições (buscar e salvar).
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// 💡 DICA: Repare que a chave (KEY) que usamos aqui é pública (publishable). 
// Chaves secretas reais (service keys) nunca devem ficar no código frontend, 
// pois qualquer pessoa pode abrir o Inspecionar Elemento (F12) e vê-las.
