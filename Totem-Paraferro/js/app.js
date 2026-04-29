/**
 * 📄 ARQUIVO: app.js
 * 🧠 PROPÓSITO: Arquivo principal de lógica do Totem (Cérebro da aplicação)
 * 
 * É aqui que a mágica acontece. Este arquivo controla o fluxo de dados (Data Flow):
 * Entrada do Usuário (ex: digita CPF) -> Processamento (validação/formatação) -> Ação (salvar no banco/mudar de tela).
 */

// ==========================================
// 📦 VARIÁVEIS GLOBAIS DE ESTADO (State)
// ==========================================
// 'state' é como uma memória temporária do totem. Tudo o que o cliente faz
// fica salvo aqui enquanto ele navega. Se a página recarregar e nós não
// salvarmos isso no 'sessionStorage', a gente perde tudo!
let state = {
  cliente: null,
  carrinho: [],
  totalCarrinho: 0,
  metodoPagamentoSelecionado: null,
  pedidoAtual: null,
};

// Guarda a lista completa de produtos que vem do banco de dados (Supabase)
let catalogoProdutos = [];
let categoriaAtual = 'todos'; // Variável para controlar a aba de categorias

// Armazena dados extras de endereço que o ViaCEP retorna, mas que não 
// precisam aparecer na tela para o usuário (bairro, cidade, estado)
let enderecoExtra = {
  bairro: "",
  cidade: "",
  estado: ""
};

// ==========================================
// 💾 FUNÇÕES DE SESSÃO E INICIALIZAÇÃO
// ==========================================

/**
 * 🔹 salvarSessao()
 * Transforma o nosso objeto 'state' em texto (JSON) e guarda na memória do navegador.
 * Isso permite que, ao mudar de uma tela (ex: de produtos para pagamento),
 * a gente não perca o carrinho e o nome do cliente.
 */
function salvarSessao() {
  sessionStorage.setItem('totemState', JSON.stringify(state));
}

/**
 * 🔹 carregarSessao()
 * Pega o texto (JSON) salvo na memória do navegador e transforma de volta
 * no objeto 'state'. Usado toda vez que uma nova tela carrega.
 */
function carregarSessao() {
  const saved = sessionStorage.getItem('totemState');
  if (saved) {
    state = JSON.parse(saved); // JSON.parse converte texto em objeto JS
  }
}

/**
 * 🔹 verificarSessaoCliente()
 * Carrega a sessão e atualiza a UI com o nome do cliente se disponível.
 * NÃO redireciona — catálogo e outras telas são acessíveis sem login.
 */
function verificarSessaoCliente() {
  carregarSessao();
  const displayNome = document.getElementById("display-cliente-nome");
  if (displayNome) {
    if (state.cliente && state.cliente.nome) {
      displayNome.innerText = `Olá, ${state.cliente.nome.split(" ")[0]}!`;
    } else {
      displayNome.innerText = 'Bem-vindo!';
    }
  }
}

// ==========================================
// ⏱️ SISTEMA DE INATIVIDADE
// ==========================================

let _inativoTimer = null;      // Timer principal (30 segundos)
let _inativoResetTimer = null; // Timer do aviso (15 segundos extras)
let _inativoAtivo = false;     // Flag para evitar múltiplos overlays

/**
 * 🔹 iniciarTimerInatividade()
 * Ativa o sistema de detecção de inatividade para a tela atual.
 * Deve ser chamado no window.onload de cada tela (exceto index e nota).
 */
function iniciarTimerInatividade() {
  const TEMPO_AVISO = 30000;  // 30 segundos sem interação → exibe aviso
  const TEMPO_RESET = 15000; // +15 segundos sem resposta → reseta o totem

  // Eventos que contam como "interação do usuário"
  const eventos = ['click', 'touchstart', 'keydown', 'mousemove'];

  function reiniciarContador() {
    // Se o aviso de inatividade estiver visível, não reinicia ao tocar nele
    if (_inativoAtivo) return;
    clearTimeout(_inativoTimer);
    clearTimeout(_inativoResetTimer);
    _inativoTimer = setTimeout(mostrarAvisoInatividade, TEMPO_AVISO);
  }

  eventos.forEach(ev => document.addEventListener(ev, reiniciarContador, { passive: true }));
  reiniciarContador(); // Inicia o contador assim que a função é chamada
}

/**
 * 🔹 mostrarAvisoInatividade()
 * Exibe overlay perguntando "Deseja continuar?" com countdown de 15s.
 */
function mostrarAvisoInatividade() {
  _inativoAtivo = true;
  let segundos = 15;

  // Cria o overlay de aviso dinamicamente
  const overlay = document.createElement('div');
  overlay.id = 'overlay-inatividade';
  overlay.style.cssText = `
    position: fixed; inset: 0; background: rgba(15,23,42,0.85);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    z-index: 9999; font-family: 'Inter', sans-serif;
    animation: fadeInOverlay 0.3s ease;
  `;
  overlay.innerHTML = `
    <style>
      @keyframes fadeInOverlay { from { opacity: 0; } to { opacity: 1; } }
      @keyframes pulseCircle { 0%,100% { transform: scale(1); } 50% { transform: scale(1.05); } }
    </style>
    <div style="background: white; border-radius: 24px; padding: 48px 40px; text-align: center; max-width: 380px; width: 90%; box-shadow: 0 25px 60px rgba(0,0,0,0.4);">
      <div style="width:80px;height:80px;background:#fef3c7;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 24px;animation:pulseCircle 1.5s ease infinite;">
        <span style="font-size:36px;">⏱️</span>
      </div>
      <h2 style="font-size:22px;font-weight:900;color:#1e3a8a;margin-bottom:8px;">Ainda está aí?</h2>
      <p style="color:#64748b;font-size:14px;margin-bottom:8px;">O sistema será reiniciado em</p>
      <p id="inativo-countdown" style="font-size:52px;font-weight:900;color:#dc2626;margin-bottom:24px;line-height:1;">${segundos}</p>
      <p style="color:#94a3b8;font-size:12px;margin-bottom:24px;">Seu carrinho será perdido.</p>
      <button id="btn-continuar-sessao" style="
        width:100%;background:#1e3a8a;color:white;font-size:16px;font-weight:800;
        padding:16px;border-radius:14px;border:none;cursor:pointer;
        box-shadow:0 4px 15px rgba(30,58,138,0.3);
      ">Sim, continuar</button>
    </div>
  `;
  document.body.appendChild(overlay);

  // Botão "Sim, continuar"
  document.getElementById('btn-continuar-sessao').addEventListener('click', cancelarResetInatividade);

  // Countdown de 15 segundos
  const countdownEl = document.getElementById('inativo-countdown');
  _inativoResetTimer = setInterval(() => {
    segundos--;
    if (countdownEl) countdownEl.innerText = segundos;
    if (segundos <= 0) {
      clearInterval(_inativoResetTimer);
      reiniciarTotem();
    }
  }, 1000);
}

/**
 * 🔹 cancelarResetInatividade()
 * Chamado ao clicar em "Sim, continuar" no overlay de inatividade.
 */
function cancelarResetInatividade() {
  clearTimeout(_inativoTimer);
  clearInterval(_inativoResetTimer);
  _inativoAtivo = false;
  const overlay = document.getElementById('overlay-inatividade');
  if (overlay) overlay.remove();
  iniciarTimerInatividade(); // Reinicia o contador do zero
}

/**
 * 🔹 carregarCarrinhoDaSessao()
 * Atualiza o número de itens no botão do carrinho no topo da tela.
 */
function carregarCarrinhoDaSessao() {
  atualizarCarrinhoUI(); // UI = User Interface (Interface do Usuário)
  if (document.getElementById('grid-catalogo')) {
    renderizarCatalogo();
  }
}

// ==========================================
// 🎭 MASCARAS E VALIDAÇÕES (Formatadores)
// ==========================================
// 💡 DICA: Máscaras pegam o que o usuário digita e colocam num formato bonitinho
// Exemplo: 12345678900 vira 123.456.789-00

function mascaraCPF(i) {
  let v = i.value.replace(/\D/g, ""); // Remove tudo que NÃO for número (letra, espaço)
  if (v.length > 11) v = v.slice(0, 11);
  // Coloca os pontos e o traço na hora certa
  i.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function mascaraCEP(i) {
  let v = i.value.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  i.value = v.replace(/^(\d{5})(\d)/, "$1-$2"); // Formato: 00000-000
  
  // ⚡ INTEGRAÇÃO: Se o CEP tiver 8 números (completo), busca automaticamente!
  if (v.length === 8) {
    buscarCEP(v);
  }
}

/**
 * 🌐 buscarCEP(cep)
 * Integração com a API pública do ViaCEP.
 * Funciona de forma "Assíncrona" (async/await) porque a requisição via internet 
 * pode demorar alguns segundos, e o código precisa "esperar" (await) a resposta.
 */
async function buscarCEP(cep) {
  try {
    // 1. Faz a requisição na internet
    const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    const data = await response.json(); // 2. Converte a resposta em um objeto JS

    // Se o CEP for inventado (ex: 99999-999), a API retorna {erro: true}
    if (data.erro) {
      alert("CEP não encontrado.");
      return;
    }

    // 3. Captura os inputs na tela
    const inputEnd = document.getElementById("cad-end");
    const inputNum = document.getElementById("cad-num");

    if (inputEnd) {
      // Preenche o campo de rua (logradouro) na tela
      inputEnd.value = data.logradouro || "";
      
      // Armazena no "fundo" (background) os dados extras para enviar ao banco depois
      enderecoExtra.bairro = data.bairro || "";
      enderecoExtra.cidade = data.localidade || "";
      enderecoExtra.estado = data.uf || "";
      
      // Move o cursor piscante para o campo de número automaticamente. UX Perfeita!
      if (inputNum) {
        inputNum.focus();
      }
    }
  } catch (error) {
    console.error("Erro ao buscar CEP:", error);
  }
}

function mascaraTel(i) {
  let v = i.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  if (v.length > 10) {
    i.value = v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  } else if (v.length > 6) {
    i.value = v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
  } else if (v.length > 2) {
    i.value = v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
  } else {
    i.value = v;
  }
}

// 🛡️ Validação matemática de CPF (Evita CPFs falsos como 123.456.789-00)
function isCPFValido(cpf) {
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  let soma = 0;
  for (let i = 0; i < 9; i++) soma += parseInt(cpf.charAt(i)) * (10 - i);
  let resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(9))) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) soma += parseInt(cpf.charAt(i)) * (11 - i);
  resto = 11 - (soma % 11);
  if (resto === 10 || resto === 11) resto = 0;
  if (resto !== parseInt(cpf.charAt(10))) return false;
  return true;
}

// ==========================================
// 🏠 TELA 1: CPF (index.html)
// ==========================================

/**
 * 🔹 verificarCPF()
 * O usuário clica em "Continuar" após digitar o CPF.
 * Aqui nós consultamos o banco Supabase para ver se ele já existe.
 */
async function verificarCPF() {
  const input = document.getElementById("input-cpf-check");
  const btn = document.querySelector('button[onclick="verificarCPF()"]'); 
  const cpfFormatado = input.value;
  const cpfLimpo = cpfFormatado.replace(/\D/g, ""); // Tiramos pontos e traços pro banco

  // 1. Valida se o número é real
  if (!isCPFValido(cpfLimpo)) {
    return alert("CPF inválido! Verifique o número digitado.");
  }

  // 2. Efeito visual: Troca o texto do botão para dar feedback visual de carregamento
  const textoOriginal = btn.innerText;
  btn.innerText = "Buscando...";
  btn.disabled = true;

  try {
    // Busca no Supabase via Edge Function (Seguro)
    const { data, error } = await supabaseClient.functions.invoke('verificar-cpf', {
      body: { cpf: cpfLimpo }
    });

    if (error) {
      console.error("Erro na comunicação com a API:", error);
      alert("Erro ao consultar servidor.");
      return;
    }

    if (data.error) {
      console.error(data.error);
      alert("Erro do servidor: " + data.error);
      return;
    }

    if (data.cliente) {
      // Cliente existe
      state.cliente = data.cliente;
      salvarSessao();
      window.location.href = 'produtos.html';
    } else {
      // ❌ RESULTADO B: Cliente não encontrado (é novo).
      // Salva só o CPF temporariamente pra gente não fazer ele digitar de novo na tela de cadastro.
      sessionStorage.setItem('cpfEmCadastro', cpfFormatado);
      window.location.href = 'cadastro.html'; // Redireciona pro cadastro
    }
  } catch (err) {
    console.error(err);
    alert("Erro detalhado: " + err.message + "\n(Aperte F12 para mais info)");
  } finally {
    // Volta o botão ao normal, caso tenha dado algum erro ou alert
    btn.innerText = textoOriginal;
    btn.disabled = false;
  }
}

// ==========================================
// 📝 TELA 2: CADASTRO (cadastro.html)
// ==========================================

/**
 * 🔹 salvarCadastro()
 * Disparado ao clicar em "Confirmar dados".
 * Pega os valores da tela e insere um novo cliente na tabela do Supabase.
 */
async function salvarCadastro() {
  // Coletando todos os valores digitados (.value) e tirando espaços desnecessários (.trim())
  const nome = document.getElementById("cad-nome").value.trim();
  const cpfForm = document.getElementById("cad-cpf").value.trim();
  const cpfLimpo = cpfForm.replace(/\D/g, "");
  const tel = document.getElementById("cad-tel").value.trim();
  const email = document.getElementById("cad-email").value.trim();
  const cep = document.getElementById("cad-cep").value.trim();
  const endereco = document.getElementById("cad-end").value.trim();
  const numero = document.getElementById("cad-num").value.trim();

  // Validação simples: Tem algum vazio?
  if (!nome || !tel || !email || !cep || !endereco || !numero) {
    return alert("Atenção! Todos os dados com * são obrigatórios.");
  }

  // Validação simples de email
  if (!email.includes("@")) {
    return alert("Por favor, insira um e-mail válido!");
  }

  // Feedback visual (desativa botão)
  const btn = document.querySelector('button[onclick="salvarCadastro()"]');
  const span1 = btn.querySelector('span');
  const textoOrig = span1.innerText;
  span1.innerText = "Salvando...";
  btn.disabled = true;

  // Montamos um "Objeto" JSON que será a nova linha lá no banco de dados.
  // IMPORTANTE: As chaves (nome, cpf, email) devem bater com as colunas lá do Supabase.
  const novoCliente = {
    nome,
    cpf: cpfLimpo,
    telefone: tel,
    email,
    cep,
    endereco,
    numero,
    bairro: enderecoExtra.bairro, // Vem da nossa variável global (ViaCEP)
    cidade: enderecoExtra.cidade,
    estado: enderecoExtra.estado
  };

  try {
    const { data, error } = await supabaseClient.functions.invoke('cadastrar-cliente', {
      body: { novoCliente }
    });

    if (error) {
      console.error("Erro na comunicação com a API:", error);
      alert("Erro de conexão com o servidor.");
      return;
    }

    if (data.error) {
      console.error(data.error);
      alert("Erro ao salvar cadastro: " + data.error);
      return;
    }

    state.cliente = data.cliente;
    sessionStorage.removeItem('cpfEmCadastro');
    salvarSessao();
    
    // Antes de ir pro pagamento, precisamos criar o pedido
    const sucesso = await irParaPagamentoReal();
    if (sucesso) return; // Se deu certo, a própria função já redirecionou
    
  } catch (err) {
    console.error(err);
    alert("Erro de conexão.");
  } finally {
    span1.innerText = textoOrig;
    btn.disabled = false;
  }
}

// ==========================================
// 🛒 TELA 3: PRODUTOS (produtos.html)
// ==========================================

/**
 * 🔹 carregarProdutosDoBanco()
 * Chamado assim que a tela de produtos abre. Traz o catálogo vivo do banco.
 */
async function carregarProdutosDoBanco() {
  try {
    // ⚡ BUSCA NO SUPABASE: Puxa todos os produtos onde a coluna 'ativo' é true.
    // E já ordena de A a Z (.order('nome'))
    const { data, error } = await supabaseClient
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('nome');

    if (error) {
      console.error(error);
      alert("Erro ao carregar catálogo.");
      return;
    }

    // Guarda localmente na memória (cache) pra não ter que bater no banco a cada pesquisa
    catalogoProdutos = data;

    // Renderiza a barra lateral com as categorias dinâmicas
    renderizarCategorias();

    // Remove o símbolo de "carregando..." girando da tela
    const loading = document.getElementById('loading-produtos');
    if (loading) loading.classList.add('hidden');

    // Mostra o grid de fato e manda desenhar os produtos
    const grid = document.getElementById('grid-catalogo');
    if (grid) {
      grid.classList.remove('hidden');
      renderizarCatalogo();
    }

  } catch (err) {
    console.error(err);
  }
}

/**
 * 🔹 renderizarCategorias()
 * Lê o catálogo e extrai as categorias únicas.
 */
function renderizarCategorias() {
  const nav = document.getElementById("nav-categorias");
  if (!nav) return;

  const categoriasUnicas = new Set();
  catalogoProdutos.forEach(p => {
    if (p.categoria) categoriasUnicas.add(p.categoria);
  });

  nav.innerHTML = `
    <button class="cat-btn ativo" id="cat-btn-todos" onclick="filtrarPorCategoria('todos')">
      Todos os Materiais
    </button>
  `;

  const categoriasOrdenadas = Array.from(categoriasUnicas).sort();
  categoriasOrdenadas.forEach(cat => {
    const catId = "cat-btn-" + cat.replace(/\s+/g, '-').toLowerCase();
    nav.innerHTML += `
      <button class="cat-btn" id="${catId}" onclick="filtrarPorCategoria('${cat}')">
        ${cat}
      </button>
    `;
  });
}

/**
 * 🔹 filtrarPorCategoria(categoria)
 * Chamado ao clicar num botão da barra lateral.
 */
function filtrarPorCategoria(categoria) {
  categoriaAtual = categoria;
  
  const nav = document.getElementById("nav-categorias");
  if (nav) {
    const botoes = nav.querySelectorAll('.cat-btn');
    botoes.forEach(btn => btn.classList.remove('ativo'));
    
    let btnAtivoId = categoria === 'todos' ? 'cat-btn-todos' : "cat-btn-" + categoria.replace(/\s+/g, '-').toLowerCase();
    const btnAtivo = document.getElementById(btnAtivoId);
    if (btnAtivo) btnAtivo.classList.add('ativo');
  }

  const titulo = document.getElementById("titulo-categoria");
  if (titulo) {
    titulo.innerText = categoria === 'todos' ? 'Todos os Materiais' : categoria;
  }

  renderizarCatalogo(document.getElementById("search-catalogo")?.value || "");
}

/**
 * 🔹 alterarQuantidade(id, delta, event)
 * Função central do carrinho. Chamada ao clicar em [+] ou [-].
 * 'delta' é quanto altera: +1 para somar, -1 para subtrair.
 */
function alterarQuantidade(id, delta, event = null) {
  // Verifica se o produto já está na lista do carrinho
  const index = state.carrinho.findIndex((x) => x.id === id);
  const p = catalogoProdutos.find((x) => x.id === id);
  const estoqueAtual = p.estoque_atual !== undefined ? p.estoque_atual : 999;

  if (index === -1) {
    // Produto não está no carrinho
    if (delta > 0) {
      if (1 > estoqueAtual) return alert("Produto sem estoque no momento.");
      state.carrinho.push({ ...p, qtd: 1, total: p.preco });
      
      if (event) animarParaCarrinho(id, event); // Faz a imagem voar
    }
  } else {
    // Produto já está no carrinho, então só vamos alterar a quantidade
    const item = state.carrinho[index];
    const novaQtd = item.qtd + delta;

    if (novaQtd === 0) {
      // Se chegou a zero, pergunta se quer excluir
      if (confirm(`Deseja realmente excluir o material "${item.nome}"?`)) {
        state.carrinho.splice(index, 1); // Splice: arranca 1 elemento na posição 'index'
      }
    } else {
      if (novaQtd > estoqueAtual) return alert("Quantidade máxima em estoque atingida.");
      item.qtd = novaQtd;
      item.total = item.qtd * item.preco;
      if (delta > 0 && event) animarParaCarrinho(id, event);
    }
  }

  // Toda alteração precisa ser salva na sessão para não perdermos!
  salvarSessao();
  atualizarCarrinhoUI();
  renderizarCatalogo(document.getElementById("search-catalogo")?.value || "");
}

// Quando o cara quer digitar "100" para não ter que apertar "+" 100 vezes.
function alterarQuantidadeManual(id, valor) {
  const novaQtd = parseInt(valor, 10);
  const index = state.carrinho.findIndex((x) => x.id === id);
  const p = catalogoProdutos.find((x) => x.id === id);
  const estoqueAtual = p.estoque_atual !== undefined ? p.estoque_atual : 999;

  if (index !== -1) {
    const item = state.carrinho[index];
    if (isNaN(novaQtd) || novaQtd <= 0) {
      if (confirm(`Deseja realmente excluir o material "${item.nome}"?`)) {
        state.carrinho.splice(index, 1);
      }
    } else {
      if (novaQtd > estoqueAtual) {
        alert("Quantidade máxima em estoque atingida.");
        item.qtd = estoqueAtual;
      } else {
        item.qtd = novaQtd;
      }
      item.total = item.qtd * item.preco;
    }
    salvarSessao();
    atualizarCarrinhoUI();
    renderizarCatalogo(document.getElementById("search-catalogo")?.value || "");
  }
}

/**
 * 🔹 renderizarCatalogo(filtro)
 * Acessa o HTML e "injeta" os produtos (DOM Manipulation).
 * Essa função roda toda vez que abrimos a tela, digitamos na busca ou mudamos uma quantidade.
 */
function renderizarCatalogo(filtro = "") {
  const grid = document.getElementById("grid-catalogo");
  if (!grid) return;
  grid.innerHTML = ""; // Limpa tudo antes de desenhar de novo

  // Aplica o filtro de busca no texto e no nome, e respeita a categoria selecionada
  const filtrados = catalogoProdutos.filter(
    (p) => {
      const textoBate = p.nome.toLowerCase().includes(filtro.toLowerCase()) || 
                        (p.descricao && p.descricao.toLowerCase().includes(filtro.toLowerCase()));
      const categoriaBate = categoriaAtual === 'todos' || p.categoria === categoriaAtual;
      return textoBate && categoriaBate;
    }
  );

  if (filtrados.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">Nenhum produto encontrado.</div>`;
    return;
  }

  // Passa item por item desenhando o HTML dele (Componentização manual)
  filtrados.forEach((p) => {
    // Primeiro verificamos: esse produto já está no carrinho?
    const itemNoCarrinho = state.carrinho.find((x) => x.id === p.id);
    let controlesHTML = "";

    // Se estiver, desenhamos um controle com [-] [numero] [+]
    if (itemNoCarrinho) {
      controlesHTML = `
        <div class="flex items-center bg-slate-100 border border-slate-300 rounded-xl overflow-hidden shadow-inner">
          <button onclick="alterarQuantidade(${p.id}, -1, event)" class="px-3 py-2 text-blue-900 hover:bg-slate-200 transition-colors active:bg-slate-300">
            <i data-lucide="minus" class="w-4 h-4"></i>
          </button>
          
          <input 
            type="tel" 
            value="${itemNoCarrinho.qtd}" 
            onchange="alterarQuantidadeManual(${p.id}, this.value)"
            oninput="this.value = this.value.replace(/[^0-9]/g, '')"
            class="w-12 py-2 bg-white font-black text-blue-900 text-sm text-center border-x border-slate-300 focus:outline-none focus:bg-blue-50"
          />

          <button onclick="alterarQuantidade(${p.id}, 1, event)" class="px-3 py-2 text-blue-900 hover:bg-slate-200 transition-colors active:bg-slate-300">
            <i data-lucide="plus" class="w-4 h-4"></i>
          </button>
        </div>
      `;
    } else {
      // Se não, desenhamos o botão padrão de "Adicionar" com ícone de carrinho
      controlesHTML = `
        <button onclick="alterarQuantidade(${p.id}, 1, event)" class="relative bg-blue-900 text-white p-3 rounded-xl hover:bg-blue-800 transition-all hover:scale-105 shadow-md group">
          <i data-lucide="shopping-cart" class="w-6 h-6"></i>
          <span class="absolute -bottom-1 -right-1 bg-white text-blue-900 rounded-full flex items-center justify-center w-4 h-4 shadow-sm group-hover:bg-blue-100 transition-colors">
            <i data-lucide="plus" class="w-3 h-3 stroke-[3px]"></i>
          </span>
        </button>
      `;
    }

    // Por fim, injetamos (innerHTML) o HTML completo do Card (Caixinha do produto)
    grid.innerHTML += `
      <div class="product-card bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-900 transition-all group">
        <div class="h-40 overflow-hidden bg-slate-50 relative cursor-pointer border-b border-slate-100" onclick="alterarQuantidade(${p.id}, 1, event)">
          <img src="${p.imagem_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 mix-blend-multiply">
        </div>
        <div class="p-5">
          <h4 class="font-black text-blue-900 leading-tight mb-1">${p.nome}</h4>
          <p class="text-[10px] text-slate-500 uppercase font-bold mb-1">${p.descricao || ''}</p>
          <p class="text-[11px] font-bold mb-2 ${p.estoque_atual > 0 ? 'text-green-600' : 'text-red-500'}">Estoque: ${p.estoque_atual !== undefined ? p.estoque_atual : '?'}</p>
          <div class="flex justify-between items-center h-10 mt-3">
            <span class="text-xl font-black text-blue-900">R$ ${p.preco.toFixed(2)}</span>
            ${controlesHTML}
          </div>
        </div>
      </div>
    `;
  });
  lucide.createIcons(); // Recarrega os ícones da biblioteca Lucide para aparecerem nos botões novos
}

// Disparado quando digita algo na barra de pesquisa superior
function filtrarCatalogo(v) {
  renderizarCatalogo(v);
}

// Atualiza o rodape (Total) e a bolinha vermelha no ícone de carrinho lá em cima
function atualizarCarrinhoUI() {
  state.totalCarrinho = 0;
  let totalQuantidadeItens = 0;

  // Varre o carrinho somando tudo
  state.carrinho.forEach((item) => {
    state.totalCarrinho += item.total;
    totalQuantidadeItens += item.qtd;
  });

  const rodape = document.getElementById("cart-total-rodape");
  if (rodape) rodape.innerText = state.totalCarrinho.toFixed(2); // .toFixed(2) garante 2 casas decimais

  const badge = document.getElementById("cart-badge-rodape");
  if (badge) {
    if (totalQuantidadeItens > 0) {
      badge.innerText = totalQuantidadeItens;
      badge.classList.remove("hidden"); // Mostra a bolinha
    } else {
      badge.classList.add("hidden"); // Esconde a bolinha
    }
  }
}

// 🪄 Efeito Visual: Quando o cliente clica para adicionar, a foto "voa" para o carrinho!
function animarParaCarrinho(id, event) {
  if (!event) return;
  const produto = catalogoProdutos.find((p) => p.id === id);
  const cartBtn = document.getElementById("icone-carrinho-rodape");

  // Cria um elemento <img> fantasma só para voar pela tela
  const flyingImg = document.createElement("img");
  flyingImg.src = produto.imagem_url;
  flyingImg.className = "item-voador w-16 h-16 border-2 border-blue-900 bg-white";
  flyingImg.style.left = `${event.clientX - 32}px`; // Pega a posição do clique (X/Y do mouse)
  flyingImg.style.top = `${event.clientY - 32}px`;
  document.body.appendChild(flyingImg);

  const rect = cartBtn.getBoundingClientRect(); // Pega as coordenadas X e Y de onde está o carrinho

  // Depois de um piscar de olhos, muda a posição da imagem fantasma para o carrinho
  // Como o CSS tem 'transition', ela vai voando e encolhendo suavemente
  setTimeout(() => {
    flyingImg.style.left = `${rect.left + rect.width / 2 - 10}px`;
    flyingImg.style.top = `${rect.top + rect.height / 2 - 10}px`;
    flyingImg.style.width = "10px";
    flyingImg.style.height = "10px";
    flyingImg.style.opacity = "0.3";
  }, 50);

  // Remove o fantasma depois que a viagem termina
  setTimeout(() => {
    flyingImg.remove();
    // Faz o botão do carrinho "pulsar" quando a imagem chega
    cartBtn.classList.add("scale-110");
    setTimeout(() => cartBtn.classList.remove("scale-110"), 200);
  }, 800);
}

// Clique no botão verde de ir pro pagamento
function irParaPagamento() {
  if (state.carrinho.length === 0) {
    alert("Atenção! Seu carrinho está vazio. Adicione produtos para continuar.");
    return;
  }
  salvarSessao();
  window.location.href = "resumo.html";
}

// ==========================================
// 📋 TELA 4: RESUMO (resumo.html)
// ==========================================

// Quase idêntica a renderizarCatalogo, mas foca num layout de "Lista" ao invés de "Grade (Grid)"
function renderizarResumoCompleto() {
  const container = document.getElementById("lista-resumo-completo");
  if (!container) return;
  container.innerHTML = "";
  let total = 0;

  state.carrinho.forEach((item, idx) => {
    total += item.total;
    // Interpolação de Strings (Template literals com a crase ` `) permite colocar variáveis ${} no meio do HTML
    container.innerHTML += `
      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
        <img src="${item.imagem_url}" class="w-20 h-20 object-cover rounded-xl border border-slate-100 mix-blend-multiply">
        
        <div class="flex-1">
          <h4 class="font-bold text-blue-900 leading-tight">${item.nome}</h4>
          <p class="text-sm font-black text-blue-800 mt-1">R$ ${item.total.toFixed(2)}</p>
          <p class="text-[11px] font-bold mt-1 ${item.estoque_atual > 0 ? 'text-green-600' : 'text-red-500'}">Estoque disponível: ${item.estoque_atual !== undefined ? item.estoque_atual : '?'}</p>
          
          <div class="flex items-center gap-3 mt-3">
            <div class="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              <button onclick="alterarQtdResumo(${item.id}, -1)" class="px-3 py-1 text-blue-900 hover:bg-slate-200 active:bg-slate-300"><i data-lucide="minus" class="w-4 h-4"></i></button>
              <span class="px-3 py-1 font-bold text-sm bg-white border-x border-slate-200">${item.qtd}</span>
              <button onclick="alterarQtdResumo(${item.id}, 1)" class="px-3 py-1 text-blue-900 hover:bg-slate-200 active:bg-slate-300"><i data-lucide="plus" class="w-4 h-4"></i></button>
            </div>

            <button onclick="removerItemResumo(${idx})" class="ml-auto text-blue-900 hover:text-red-600 active:scale-90 transition-all p-2">
              <i data-lucide="trash-2" class="w-5 h-5"></i>
            </button>
          </div>
        </div>
      </div>
    `;
  });

  document.getElementById("total-resumo-tela").innerText = total.toFixed(2);
  lucide.createIcons();
}

// Alteração direta na tela de resumo
function alterarQtdResumo(id, delta) {
  const index = state.carrinho.findIndex((x) => x.id === id);
  if (index !== -1) {
    const item = state.carrinho[index];
    const novaQtd = item.qtd + delta;
    if (novaQtd === 0) {
      if (confirm(`Deseja realmente excluir o material "${item.nome}"?`)) {
        state.carrinho.splice(index, 1);
      }
    } else {
      item.qtd = novaQtd;
      item.total = item.qtd * item.preco;
    }
  }
  salvarSessao();
  renderizarResumoCompleto(); // Atualiza a tela de resumo inteira na hora
}

// Quando o cara clica na lixeirinha
function removerItemResumo(idx) {
  const nomeItem = state.carrinho[idx].nome;
  if (confirm(`Deseja realmente remover "${nomeItem}" do seu pedido?`)) {
    state.carrinho.splice(idx, 1); // Remove
    salvarSessao();
    if (state.carrinho.length === 0) {
      window.location.href = "produtos.html"; // Se ficou vazio, volta pra comprar mais
    } else {
      renderizarResumoCompleto(); // Senão, apenas redesenha sem o item
    }
  }
}

async function irParaPagamentoReal() {
  state.metodoPagamentoSelecionado = null;

  // Garantir que existe um cliente (mesmo que seja Consumidor Final)
  if (!state.cliente) {
    state.cliente = { nome: 'Consumidor Final', cpf: '99999999999', id: 'cf999999-9999-4999-8999-999999999999' };
    salvarSessao();
  }

  const pedido = {
    cliente_id: state.cliente.id || null, // null para Consumidor Final
    itens_comprados: state.carrinho,
    numero_pedido: state.pedidoAtual ? state.pedidoAtual.numero_pedido : undefined
  };

  try {
    const { data, error } = await supabaseClient.functions.invoke('criar-pedido', {
      body: pedido
    });

    if (error || (data && data.error)) {
      console.error(error || data.error);
      alert("Erro ao criar pedido: " + (data?.error || ""));
      return false;
    }

    // Salva o pedido no estado (incluindo o numero_pedido gerado pelo banco)
    state.pedidoAtual = data.pedido;
    salvarSessao();
    window.location.href = "pagamento.html";
    return true;

  } catch (err) {
    console.error(err);
    alert("Erro de conexão ao gerar pedido.");
    return false;
  }
}

// ==========================================
// 🪪 TELA DE IDENTIFICAÇÃO (identificacao.html)
// ==========================================

/**
 * 🔹 irParaIdentificacao()
 * Chamado ao clicar em "Gerar Pedido" na tela de resumo.
 * Salva o carrinho e navega para a tela de identificação.
 */
function irParaIdentificacao() {
  if (state.carrinho.length === 0) {
    alert('Atenção! Seu carrinho está vazio. Adicione produtos para continuar.');
    return;
  }
  salvarSessao();
  window.location.href = 'identificacao.html';
}

/**
 * 🔹 verificarCPFIdentificacao()
 * Chamado ao clicar em "Continuar" na tela de identificação.
 * Busca o CPF no banco:
 *   - Encontrado → salva cliente e vai para pagamento
 *   - Não encontrado → salva CPF temporário e vai para cadastro
 */
async function verificarCPFIdentificacao() {
  const input = document.getElementById('input-cpf-identificacao');
  const btn = document.getElementById('btn-continuar-identificacao');
  const cpfFormatado = input ? input.value : '';
  const cpfLimpo = cpfFormatado.replace(/\D/g, '');

  if (!isCPFValido(cpfLimpo)) {
    return alert('CPF inválido! Verifique o número digitado.');
  }

  // Feedback visual
  const textoOrig = btn ? btn.innerText : '';
  if (btn) { btn.disabled = true; btn.innerText = 'Buscando...'; }

  try {
    const { data, error } = await supabaseClient.functions.invoke('verificar-cpf', {
      body: { cpf: cpfLimpo }
    });

    if (error || (data && data.error)) {
      alert('Erro ao consultar servidor.');
      return;
    }

    if (data.cliente) {
      // ✅ CPF encontrado → salva cliente e cria pedido
      state.cliente = data.cliente;
      salvarSessao();
      const sucesso = await irParaPagamentoReal();
      if (sucesso) return; // Redirecionou
    } else {
      // ❌ CPF não encontrado → cadastro
      sessionStorage.setItem('cpfEmCadastro', cpfFormatado);
      window.location.href = 'cadastro.html';
    }
  } catch (err) {
    console.error(err);
    alert('Erro de conexão.');
  } finally {
    if (btn) { btn.disabled = false; btn.innerText = textoOrig; }
  }
}

/**
 * 🔹 continuarSemCPF()
 * Chamado ao clicar em "Continuar sem CPF".
 * Define o cliente como "Consumidor Final" e gera o pedido.
 */
async function continuarSemCPF() {
  const btn = document.getElementById('btn-sem-cpf');
  const txtOrig = btn ? btn.innerHTML : '';
  if (btn) { btn.disabled = true; btn.innerHTML = 'Gerando Pedido...'; }

  state.cliente = { nome: 'Consumidor Final', cpf: '99999999999', id: 'cf999999-9999-4999-8999-999999999999' };
  salvarSessao();
  
  const sucesso = await irParaPagamentoReal();
  if (!sucesso && btn) {
    btn.disabled = false;
    btn.innerHTML = txtOrig;
  }
}

// ==========================================
// 💳 TELA 5: PAGAMENTO (pagamento.html)
// ==========================================

/**
 * 🔹 selecionarPagamento(metodo)
 * O usuário escolheu PIX ou Débito, etc.
 * Isso só seleciona visualmente. A compra ainda não foi finalizada.
 */
function selecionarPagamento(metodo) {
  state.metodoPagamentoSelecionado = metodo;
  salvarSessao();

  // Limpa todos os botões (Remove a classe azul que indica seleção)
  document.querySelectorAll(".btn-pagamento").forEach((b) => {
    b.classList.remove("border-blue-900", "bg-blue-50");
    b.classList.add("border-slate-300", "bg-white");
  });

  // Identifica quem foi o clicado pra pintar de azul de novo
  let idBotao = "";
  if (metodo === "PIX") idBotao = "btn-pag-pix";
  if (metodo === "Cartão de Crédito") idBotao = "btn-pag-credito";
  if (metodo === "Cartão de Débito") idBotao = "btn-pag-debito";

  const btnSelecionado = document.getElementById(idBotao);
  if (btnSelecionado) {
    btnSelecionado.classList.remove("border-slate-300", "bg-white");
    btnSelecionado.classList.add("border-blue-900", "bg-blue-50");
  }

  // Libera o botão gigante "CONCLUIR COMPRA" que estava cinza/desabilitado
  document.getElementById("btn-finalizar-venda-novo").disabled = false;
}

// Exibe aquele resuminho lateral na tela de pagamento
function atualizarResumoPedidoUI() {
  if (!document.getElementById("pag-texto-total")) return;

  const totalText = state.totalCarrinho.toFixed(2);
  
  // DOM Manipulation simples em várias partes
  document.getElementById("pag-texto-total").innerText = `R$ ${totalText}`;
  document.getElementById("resumo-subtotal").innerText = `R$ ${totalText}`;
  document.getElementById("resumo-total-final").innerText = `R$ ${totalText}`;

  // Mostra o número do pedido no topo se ele existir
  const headerElem = document.getElementById("header-pagamento");
  if (headerElem && state.pedidoAtual && state.pedidoAtual.numero_pedido) {
    // Formata com zeros à esquerda (ex: 0001)
    const numFormatado = String(state.pedidoAtual.numero_pedido).padStart(4, '0');
    headerElem.innerHTML = `Pagamento do Pedido <span class="text-blue-600">#${numFormatado}</span>`;
  }

  const container = document.getElementById("resumo-itens");
  container.innerHTML = "";

  state.carrinho.forEach((item) => {
    container.innerHTML += `
      <div class="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div class="w-12 h-12 bg-white rounded-lg overflow-hidden shrink-0 border border-slate-100">
           <img src="${item.imagem_url}" class="w-full h-full object-cover mix-blend-multiply">
        </div>
        <div class="flex-1">
          <p class="text-sm font-bold text-blue-900 leading-tight mb-1">${item.qtd}x ${item.nome}</p>
          <p class="text-[10px] text-slate-500">Vendido por <span class="font-bold text-slate-600">Paraferro</span></p>
        </div>
        <span class="font-black text-blue-900 text-sm whitespace-nowrap">R$ ${item.total.toFixed(2)}</span>
      </div>
    `;
  });
}

/**
 * 🔹 finalizarVenda()
 * MOMENTO CRUCIAL DA APLICAÇÃO: O cliente aperta CONCLUIR COMPRA.
 * Pegamos todo aquele carrinho pesado e mandamos pro banco de dados pra gerar O PEDIDO REAL!
 */
async function finalizarVenda() {
  const btn = document.getElementById("btn-finalizar-venda-novo");
  const span = document.getElementById("btn-finalizar-texto");
  const textoOrig = span.innerText;
  span.innerText = "PROCESSANDO..."; // UX de loading
  btn.disabled = true;

  try {
    // Agora só confirmamos o pagamento
    const { data, error } = await supabaseClient.functions.invoke('confirmar-pagamento', {
      body: {
        numero_pedido: state.pedidoAtual.numero_pedido,
        metodo_pagamento: state.metodoPagamentoSelecionado
      }
    });

    if (error || (data && data.error)) {
      console.error(error || data.error);
      alert("Erro ao registrar pagamento: " + (data?.error || ""));
      btn.disabled = false;
      span.innerText = textoOrig;
      return;
    }

    // Pagamento confirmado com sucesso, atualiza o pedido local e vai pra nota
    state.pedidoAtual = data.pedido;
    window.location.href = "nota.html";

  } catch (err) {
    console.error(err);
    alert("Erro detalhado: " + err.message);
    btn.disabled = false;
    span.innerText = textoOrig;
  }
}

// ==========================================
// 🧾 TELA 6: NOTA (nota.html)
// ==========================================

/**
 * 🔹 gerarNotaVisual()
 * Gera aquele recibinho de supermercado na tela usando os dados que ainda
 * estavam na nossa memória (sessionStorage) do totem.
 */
function gerarNotaVisual() {
  if (!document.getElementById("nota-cliente")) return;

  if (state.pedidoAtual && state.pedidoAtual.numero_pedido) {
    const numFormatado = String(state.pedidoAtual.numero_pedido).padStart(4, '0');
    document.getElementById("nota-numero-pedido").innerText = `#${numFormatado}`;
  }

  // Suporte a "Consumidor Final" (cliente sem CPF)
  const clienteNome = (state.cliente && state.cliente.nome) ? state.cliente.nome.toUpperCase() : 'CONSUMIDOR FINAL';
  const clienteCpf = (state.cliente && state.cliente.cpf)
    ? state.cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4")
    : '--';

  document.getElementById("nota-cliente").innerText = clienteNome;
  document.getElementById("nota-cpf").innerText = clienteCpf;
  document.getElementById("nota-data").innerText = new Date().toLocaleString();

  const tbody = document.getElementById("nota-itens");
  tbody.innerHTML = "";
  
  // Preenche a listinha de produtos estilo cupom fiscal
  state.carrinho.forEach((item) => {
    tbody.innerHTML += `<tr><td class="py-1 pr-2 text-slate-700">${item.nome} (${item.qtd}x)</td><td class="text-right font-bold whitespace-nowrap text-blue-900">R$ ${item.total.toFixed(2)}</td></tr>`;
  });

  document.getElementById("nota-total").innerText = state.totalCarrinho.toFixed(2);

  const formas = document.getElementById("nota-formas-pagamento");
  formas.innerHTML = `<strong>FORMA DE PAGAMENTO:</strong><br>${(state.metodoPagamentoSelecionado || "").toUpperCase()}: R$ ${state.totalCarrinho.toFixed(2)}<br>`;

  // 💡 LÓGICA CONDICIONAL DE PIX
  const areaPix = document.getElementById("area-pix-final");
  if (state.metodoPagamentoSelecionado === "PIX") {
    areaPix.classList.remove("hidden");
    document.getElementById("qrcode").innerHTML = "";
    new QRCode(document.getElementById("qrcode"), {
      text: "PIX-PAYLOAD-SIMULADO-PARA-O-JOTTA",
      width: 140,
      height: 140,
      colorDark: "#1e3a8a",
      colorLight: "#f8fafc",
    });
  } else {
    areaPix.classList.add("hidden");
  }

  // Limpar o carrinho, método de pagamento e pedido atual (a venda já ocorreu)
  state.carrinho = [];
  state.totalCarrinho = 0;
  state.metodoPagamentoSelecionado = null;
  state.pedidoAtual = null;
  salvarSessao();
}

/**
 * 🔹 reiniciarTotem()
 * Função do botão "Sair / Nova Venda" que fica lá no menu superior.
 * Isso mata o estado inteiro do totem (cliente, tudo) e devolve ele pra estaca zero.
 */
function reiniciarTotem() {
  sessionStorage.clear(); // Apaga toda a memória do navegador 🧨
  window.location.href = "index.html";
}