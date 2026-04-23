// Estado global no escopo da página atual
let state = {
  cliente: null,
  carrinho: [],
  totalCarrinho: 0,
  metodoPagamentoSelecionado: null,
  pedidoAtual: null,
};

let catalogoProdutos = [];
let categoriaAtiva = 'todos'; // Controla a categoria selecionada no sidebar

// ==========================================
// FUNÇÕES DE SESSÃO E INICIALIZAÇÃO
// ==========================================

function salvarSessao() {
  sessionStorage.setItem('totemState', JSON.stringify(state));
}

function carregarSessao() {
  const saved = sessionStorage.getItem('totemState');
  if (saved) {
    state = JSON.parse(saved);
  }
}

function verificarSessaoCliente() {
  carregarSessao();
  if (!state.cliente) {
    // Se não tem cliente na sessão, manda pro início
    window.location.href = 'index.html';
  } else {
    const displayNome = document.getElementById("display-cliente-nome");
    if (displayNome) {
      displayNome.innerText = `Olá, ${state.cliente.nome.split(" ")[0]}!`;
    }
  }
}

function carregarCarrinhoDaSessao() {
  atualizarCarrinhoUI();
  if (document.getElementById('grid-catalogo')) {
    renderizarCatalogo();
  }
}

// ==========================================
// MASCARAS E VALIDAÇÕES
// ==========================================

function mascaraCPF(i) {
  let v = i.value.replace(/\D/g, "");
  if (v.length > 11) v = v.slice(0, 11);
  i.value = v.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}

function mascaraCEP(i) {
  let v = i.value.replace(/\D/g, "");
  if (v.length > 8) v = v.slice(0, 8);
  i.value = v.replace(/^(\d{5})(\d)/, "$1-$2");
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
// TELA CPF
// ==========================================

async function verificarCPF() {
  const input = document.getElementById("input-cpf-check");
  const btn = document.querySelector('button[onclick="verificarCPF()"]'); // Seleção corrigida
  const cpfFormatado = input.value;
  const cpfLimpo = cpfFormatado.replace(/\D/g, "");

  if (!isCPFValido(cpfLimpo)) {
    return alert("CPF inválido! Verifique o número digitado.");
  }

  // Loading state
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
      // Cliente novo
      sessionStorage.setItem('cpfEmCadastro', cpfFormatado);
      window.location.href = 'cadastro.html';
    }
  } catch (err) {
    console.error(err);
    alert("Erro detalhado: " + err.message + "\n(Aperte F12 para mais info)");
  } finally {
    btn.innerText = textoOriginal;
    btn.disabled = false;
  }
}

// ==========================================
// TELA CADASTRO
// ==========================================

async function salvarCadastro() {
  const nome = document.getElementById("cad-nome").value.trim();
  const cpfForm = document.getElementById("cad-cpf").value.trim();
  const cpfLimpo = cpfForm.replace(/\D/g, "");
  const tel = document.getElementById("cad-tel").value.trim();
  const email = document.getElementById("cad-email").value.trim();
  const cep = document.getElementById("cad-cep").value.trim();
  const endereco = document.getElementById("cad-end").value.trim();
  const numero = document.getElementById("cad-num").value.trim();

  if (!nome || !tel || !email || !cep || !endereco || !numero) {
    return alert("Atenção! Todos os dados com * são obrigatórios.");
  }

  if (!email.includes("@")) {
    return alert("Por favor, insira um e-mail válido!");
  }

  const btn = document.querySelector('button[onclick="salvarCadastro()"]');
  const span1 = btn.querySelector('span');
  const textoOrig = span1.innerText;
  span1.innerText = "Salvando...";
  btn.disabled = true;

  const novoCliente = {
    nome,
    cpf: cpfLimpo,
    telefone: tel,
    email,
    cep,
    endereco,
    numero
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
    window.location.href = 'produtos.html';

  } catch (err) {
    console.error(err);
    alert("Erro de conexão.");
  } finally {
    span1.innerText = textoOrig;
    btn.disabled = false;
  }
}

// ==========================================
// TELA PRODUTOS
// ==========================================

async function carregarProdutosDoBanco() {
  try {
    const { data, error } = await supabaseClient
      .from('produtos')
      .select('*')
      .eq('ativo', true)
      .order('categoria')
      .order('nome');

    if (error) {
      console.error(error);
      alert("Erro ao carregar catálogo.");
      return;
    }

    // Normaliza categorias (trim para remover espaços extras do banco)
    catalogoProdutos = data.map(p => ({
      ...p,
      categoria: p.categoria ? p.categoria.trim() : null,
      _categoriaKey: p.categoria ? p.categoria.trim().toLowerCase() : null
    }));

    // --- Gera os botões de categoria na sidebar ---
    const nav = document.getElementById('nav-categorias');
    if (nav) {
      // Deduplica por chave lowercase para eliminar "Cimento" vs "Cimentos " etc.
      const categoriasMap = new Map();
      catalogoProdutos.forEach(p => {
        if (p._categoriaKey && !categoriasMap.has(p._categoriaKey)) {
          const label = p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1);
          categoriasMap.set(p._categoriaKey, label);
        }
      });

      [...categoriasMap.entries()].sort((a, b) => a[0].localeCompare(b[0])).forEach(([chave, label]) => {
        const btn = document.createElement('button');
        btn.id = `cat-btn-${chave}`;
        btn.className = 'cat-btn';
        btn.textContent = label;
        btn.onclick = () => filtrarPorCategoria(chave);
        nav.appendChild(btn);
      });
    }
    // --- Fim da geração ---

    const loading = document.getElementById('loading-produtos');
    if (loading) loading.style.display = 'none';

    const grid = document.getElementById('grid-catalogo');
    if (grid) {
      grid.style.display = 'grid';
      renderizarCatalogo();
    }

  } catch (err) {
    console.error(err);
  }
}

function alterarQuantidade(id, delta, event = null) {
  const index = state.carrinho.findIndex((x) => x.id === id);
  const p = catalogoProdutos.find((x) => x.id === id);
  const estoqueAtual = p.estoque_atual !== undefined ? p.estoque_atual : 999;

  if (index === -1) {
    if (delta > 0) {
      if (1 > estoqueAtual) return alert("Produto sem estoque no momento.");
      state.carrinho.push({ ...p, qtd: 1, total: p.preco });
      if (event) animarParaCarrinho(id, event);
    }
  } else {
    const item = state.carrinho[index];
    const novaQtd = item.qtd + delta;

    if (novaQtd === 0) {
      if (confirm(`Deseja realmente excluir o material "${item.nome}"?`)) {
        state.carrinho.splice(index, 1);
      }
    } else {
      if (novaQtd > estoqueAtual) return alert("Quantidade máxima em estoque atingida.");
      item.qtd = novaQtd;
      item.total = item.qtd * item.preco;
      if (delta > 0 && event) animarParaCarrinho(id, event);
    }
  }

  salvarSessao();
  atualizarCarrinhoUI();
  renderizarCatalogo(document.getElementById("search-catalogo")?.value || "");
}

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

function filtrarPorCategoria(cat) {
  categoriaAtiva = cat;

  // Atualiza estilos dos botões da sidebar usando classList (CSS puro)
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.remove('ativo');
  });
  const btnAtivo = document.getElementById(
    cat === 'todos' ? 'cat-btn-todos' : `cat-btn-${cat}`
  );
  if (btnAtivo) btnAtivo.classList.add('ativo');

  // Atualiza título da seção com label formatado
  const titulo = document.getElementById('titulo-categoria');
  if (titulo) {
    if (cat === 'todos') {
      titulo.textContent = 'Todos os Materiais';
    } else {
      // Pega o label exibido no botão ativo
      titulo.textContent = btnAtivo ? btnAtivo.textContent : cat;
    }
  }

  // Limpa o campo de busca e re-renderiza
  const searchInput = document.getElementById('search-catalogo');
  if (searchInput) searchInput.value = '';
  renderizarCatalogo();
}

function renderizarCatalogo(filtro = "") {
  const grid = document.getElementById("grid-catalogo");
  if (!grid) return;
  grid.innerHTML = "";

  // Filtra por categoria ativa (usa _categoriaKey normalizado) e pelo texto de busca
  const filtrados = catalogoProdutos.filter((p) => {
    const matchCategoria = categoriaAtiva === 'todos' || p._categoriaKey === categoriaAtiva;
    const matchBusca =
      p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      (p.descricao && p.descricao.toLowerCase().includes(filtro.toLowerCase()));
    return matchCategoria && matchBusca;
  });

  if (filtrados.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">Nenhum produto encontrado.</div>`;
    return;
  }

  filtrados.forEach((p) => {
    const itemNoCarrinho = state.carrinho.find((x) => x.id === p.id);
    let controlesHTML = "";

    if (itemNoCarrinho) {
      controlesHTML = `
        <div class="qty-controls">
          <button class="qty-btn" onclick="alterarQuantidade(${p.id}, -1, event)">
            <i data-lucide="minus" style="width:14px;height:14px;"></i>
          </button>
          <input
            type="tel"
            class="qty-input"
            value="${itemNoCarrinho.qtd}"
            onchange="alterarQuantidadeManual(${p.id}, this.value)"
            oninput="this.value = this.value.replace(/[^0-9]/g, '')"
          />
          <button class="qty-btn" onclick="alterarQuantidade(${p.id}, 1, event)">
            <i data-lucide="plus" style="width:14px;height:14px;"></i>
          </button>
        </div>
      `;
    } else {
      controlesHTML = `
        <button class="btn-add" onclick="alterarQuantidade(${p.id}, 1, event)" style="position:relative;">
          <i data-lucide="shopping-cart" style="width:20px;height:20px;"></i>
          <span style="
            position:absolute; bottom:-4px; right:-4px;
            background:#fff; color:#1e3a8a;
            border-radius:50%; width:16px; height:16px;
            display:flex; align-items:center; justify-content:center;
            font-size:11px; font-weight:900;
            box-shadow:0 1px 4px rgba(0,0,0,0.2);
          ">+</span>
        </button>
      `;
    }

    const estoqueVal = p.estoque_atual !== undefined ? p.estoque_atual : null;
    const estoqueOk  = estoqueVal === null || estoqueVal > 0;
    const estoqueHTML = estoqueVal !== null
      ? `<p class="product-stock ${estoqueOk ? 'stock-ok' : 'stock-out'}">Estoque: ${estoqueVal}</p>`
      : '';

    grid.innerHTML += `
      <div class="product-card">
        <img src="${p.imagem_url}" class="product-img" onclick="alterarQuantidade(${p.id}, 1, event)">
        <div class="product-info">
          <h4 class="product-name">${p.nome}</h4>
          <p class="product-desc">${p.descricao || ''}</p>
          ${estoqueHTML}
          <div class="product-footer">
            <span class="product-price">R$ ${p.preco.toFixed(2)}</span>
            ${controlesHTML}
          </div>
        </div>
      </div>
    `;
  });
  lucide.createIcons();
}

function filtrarCatalogo(v) {
  renderizarCatalogo(v);
}

function atualizarCarrinhoUI() {
  state.totalCarrinho = 0;
  let totalQuantidadeItens = 0;

  state.carrinho.forEach((item) => {
    state.totalCarrinho += item.total;
    totalQuantidadeItens += item.qtd;
  });

  const rodape = document.getElementById("cart-total-rodape");
  if (rodape) rodape.innerText = state.totalCarrinho.toFixed(2);

  const badge = document.getElementById("cart-badge");
  if (badge) {
    if (totalQuantidadeItens > 0) {
      badge.innerText = totalQuantidadeItens;
      // Suporta tanto hidden class (Tailwind) quanto style inline
      badge.classList.remove("hidden");
      badge.style.display = 'flex';
    } else {
      badge.classList.add("hidden");
      badge.style.display = 'none';
    }
  }
}

function animarParaCarrinho(id, event) {
  if (!event) return;
  const produto = catalogoProdutos.find((p) => p.id === id);
  // Aponta para o botão de carrinho na nova barra inferior
  const cartBtn = document.getElementById("btn-carrinho-topo");
  if (!cartBtn) return;

  const flyingImg = document.createElement("img");
  flyingImg.src = produto.imagem_url;
  flyingImg.className = "item-voador w-16 h-16 border-2 border-blue-900 bg-white";
  flyingImg.style.left = `${event.clientX - 32}px`;
  flyingImg.style.top = `${event.clientY - 32}px`;
  document.body.appendChild(flyingImg);

  const rect = cartBtn.getBoundingClientRect();

  setTimeout(() => {
    flyingImg.style.left = `${rect.left + rect.width / 2 - 10}px`;
    flyingImg.style.top = `${rect.top + rect.height / 2 - 10}px`;
    flyingImg.style.width = "10px";
    flyingImg.style.height = "10px";
    flyingImg.style.opacity = "0.3";
  }, 50);

  setTimeout(() => {
    flyingImg.remove();
    cartBtn.classList.add("scale-110");
    setTimeout(() => cartBtn.classList.remove("scale-110"), 200);
  }, 800);
}

function irParaPagamento() {
  if (state.carrinho.length === 0) {
    alert("Atenção! Seu carrinho está vazio. Adicione produtos para continuar.");
    return;
  }
  salvarSessao();
  window.location.href = "resumo.html";
}

// ==========================================
// TELA RESUMO
// ==========================================

function renderizarResumoCompleto() {
  const container = document.getElementById("lista-resumo-completo");
  if (!container) return;
  container.innerHTML = "";
  let total = 0;

  state.carrinho.forEach((item, idx) => {
    total += item.total;
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
  renderizarResumoCompleto();
}

function removerItemResumo(idx) {
  const nomeItem = state.carrinho[idx].nome;
  if (confirm(`Deseja realmente remover "${nomeItem}" do seu pedido?`)) {
    state.carrinho.splice(idx, 1);
    salvarSessao();
    if (state.carrinho.length === 0) {
      window.location.href = "produtos.html";
    } else {
      renderizarResumoCompleto();
    }
  }
}

async function irParaPagamentoReal() {
  state.metodoPagamentoSelecionado = null;

  const btn = document.querySelector('button[onclick="irParaPagamentoReal()"]');
  const textoOrig = btn ? btn.innerText : "";
  if (btn) {
    btn.disabled = true;
    btn.innerText = "GERANDO PEDIDO...";
  }

  const pedido = {
    cliente_id: state.cliente.id,
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
      if (btn) {
        btn.disabled = false;
        btn.innerText = textoOrig;
      }
      return;
    }

    // Salva o pedido no estado (incluindo o numero_pedido gerado pelo banco)
    state.pedidoAtual = data.pedido;
    salvarSessao();
    window.location.href = "pagamento.html";

  } catch (err) {
    console.error(err);
    alert("Erro de conexão ao gerar pedido.");
    if (btn) {
      btn.disabled = false;
      btn.innerText = textoOrig;
    }
  }
}

// ==========================================
// TELA PAGAMENTO
// ==========================================

function selecionarPagamento(metodo) {
  state.metodoPagamentoSelecionado = metodo;
  salvarSessao();

  document.querySelectorAll(".btn-pagamento").forEach((b) => {
    b.classList.remove("border-blue-900", "bg-blue-50");
    b.classList.add("border-slate-300", "bg-white");
  });

  let idBotao = "";
  if (metodo === "PIX") idBotao = "btn-pag-pix";
  if (metodo === "Cartão de Crédito") idBotao = "btn-pag-credito";
  if (metodo === "Cartão de Débito") idBotao = "btn-pag-debito";

  const btnSelecionado = document.getElementById(idBotao);
  if (btnSelecionado) {
    btnSelecionado.classList.remove("border-slate-300", "bg-white");
    btnSelecionado.classList.add("border-blue-900", "bg-blue-50");
  }

  document.getElementById("btn-finalizar-venda-novo").disabled = false;
}

function atualizarResumoPedidoUI() {
  if (!document.getElementById("pag-texto-total")) return;

  const totalText = state.totalCarrinho.toFixed(2);
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

async function finalizarVenda() {
  const btn = document.getElementById("btn-finalizar-venda-novo");
  const span = document.getElementById("btn-finalizar-texto");
  const textoOrig = span.innerText;
  span.innerText = "PROCESSANDO...";
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
// TELA NOTA
// ==========================================

function gerarNotaVisual() {
  if (!document.getElementById("nota-cliente")) return;

  if (state.pedidoAtual && state.pedidoAtual.numero_pedido) {
    const numFormatado = String(state.pedidoAtual.numero_pedido).padStart(4, '0');
    document.getElementById("nota-numero-pedido").innerText = `#${numFormatado}`;
  }

  document.getElementById("nota-cliente").innerText = state.cliente.nome.toUpperCase();
  document.getElementById("nota-cpf").innerText = state.cliente.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  document.getElementById("nota-data").innerText = new Date().toLocaleString();

  const tbody = document.getElementById("nota-itens");
  tbody.innerHTML = "";
  state.carrinho.forEach((item) => {
    tbody.innerHTML += `<tr><td class="py-1 pr-2 text-slate-700">${item.nome} (${item.qtd}x)</td><td class="text-right font-bold whitespace-nowrap text-blue-900">R$ ${item.total.toFixed(2)}</td></tr>`;
  });

  document.getElementById("nota-total").innerText = state.totalCarrinho.toFixed(2);

  const formas = document.getElementById("nota-formas-pagamento");
  formas.innerHTML = `<strong>FORMA DE PAGAMENTO:</strong><br>${(state.metodoPagamentoSelecionado || "").toUpperCase()}: R$ ${state.totalCarrinho.toFixed(2)}<br>`;

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

function reiniciarTotem() {
  sessionStorage.clear();
  window.location.href = "index.html";
}