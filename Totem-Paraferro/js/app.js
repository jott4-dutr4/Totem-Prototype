// Estado global no escopo da página atual
let state = {
  cliente: null,
  carrinho: [],
  totalCarrinho: 0,
  metodoPagamentoSelecionado: null,
  pedidoAtual: null,
};

let catalogoProdutos = [];

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
      .order('nome');

    if (error) {
      console.error(error);
      alert("Erro ao carregar catálogo.");
      return;
    }

    catalogoProdutos = data;

    const loading = document.getElementById('loading-produtos');
    if (loading) loading.classList.add('hidden');

    const grid = document.getElementById('grid-catalogo');
    if (grid) {
      grid.classList.remove('hidden');
      renderizarCatalogo();
    }

  } catch (err) {
    console.error(err);
  }
}

function alterarQuantidade(id, delta, event = null) {
  const index = state.carrinho.findIndex((x) => x.id === id);

  if (index === -1) {
    if (delta > 0) {
      const p = catalogoProdutos.find((x) => x.id === id);
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
      item.qtd = novaQtd;
      item.total = item.qtd * item.preco;
      if (delta > 0 && event) animarParaCarrinho(id, event);
    }
  }

  salvarSessao();
  atualizarCarrinhoUI();
  renderizarCatalogo(document.getElementById("search-catalogo").value);
}

function alterarQuantidadeManual(id, valor) {
  const novaQtd = parseInt(valor, 10);
  const index = state.carrinho.findIndex((x) => x.id === id);

  if (index !== -1) {
    const item = state.carrinho[index];
    if (isNaN(novaQtd) || novaQtd <= 0) {
      if (confirm(`Deseja realmente excluir o material "${item.nome}"?`)) {
        state.carrinho.splice(index, 1);
      }
    } else {
      item.qtd = novaQtd;
      item.total = item.qtd * item.preco;
    }
    salvarSessao();
    atualizarCarrinhoUI();
    renderizarCatalogo(document.getElementById("search-catalogo").value);
  }
}

function renderizarCatalogo(filtro = "") {
  const grid = document.getElementById("grid-catalogo");
  if (!grid) return;
  grid.innerHTML = "";

  const filtrados = catalogoProdutos.filter(
    (p) =>
      p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      (p.descricao && p.descricao.toLowerCase().includes(filtro.toLowerCase())),
  );

  if (filtrados.length === 0) {
    grid.innerHTML = `<div class="col-span-full text-center py-20 text-slate-400">Nenhum produto encontrado.</div>`;
    return;
  }

  filtrados.forEach((p) => {
    const itemNoCarrinho = state.carrinho.find((x) => x.id === p.id);
    let controlesHTML = "";

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
      controlesHTML = `
        <button onclick="alterarQuantidade(${p.id}, 1, event)" class="relative bg-blue-900 text-white p-3 rounded-xl hover:bg-blue-800 transition-all hover:scale-105 shadow-md group">
          <i data-lucide="shopping-cart" class="w-6 h-6"></i>
          <span class="absolute -bottom-1 -right-1 bg-white text-blue-900 rounded-full flex items-center justify-center w-4 h-4 shadow-sm group-hover:bg-blue-100 transition-colors">
            <i data-lucide="plus" class="w-3 h-3 stroke-[3px]"></i>
          </span>
        </button>
      `;
    }

    grid.innerHTML += `
      <div class="product-card bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-200 hover:shadow-lg hover:border-blue-900 transition-all group">
        <div class="h-40 overflow-hidden bg-slate-50 relative cursor-pointer border-b border-slate-100" onclick="alterarQuantidade(${p.id}, 1, event)">
          <img src="${p.imagem_url}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 mix-blend-multiply">
        </div>
        <div class="p-5">
          <h4 class="font-black text-blue-900 leading-tight mb-1">${p.nome}</h4>
          <p class="text-[10px] text-slate-500 uppercase font-bold mb-4">${p.descricao || ''}</p>
          <div class="flex justify-between items-center h-10">
            <span class="text-xl font-black text-blue-900">R$ ${p.preco.toFixed(2)}</span>
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
      badge.classList.remove("hidden");
    } else {
      badge.classList.add("hidden");
    }
  }
}

function animarParaCarrinho(id, event) {
  if (!event) return;
  const produto = catalogoProdutos.find((p) => p.id === id);
  const cartBtn = document.getElementById("btn-carrinho-topo");

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
    itens_comprados: state.carrinho
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