const catalogoProdutos = [
  {
    id: 1,
    nome: "Cimento CP II 50kg",
    desc: "Votorantim. Ideal para obras em geral.",
    preco: 34.9,
    img: "https://i.postimg.cc/L6Tg24q5/Cimento.jpg",
  },
  {
    id: 2,
    nome: "Tijolo Baiano 8 Furos",
    desc: "Milheiro (1000 unidades). Medida 9x19x29.",
    preco: 890.0,
    img: "https://i.postimg.cc/L6Tg24qJ/Tijolo8furos.jpg",
  },
  {
    id: 3,
    nome: "Areia Média (m³)",
    desc: "Areia lavada ensacada ou a granel.",
    preco: 115.0,
    img: "https://i.postimg.cc/CLNnSMZ1/90_areia_media_lavada_a_granel_venda_1_2_metro_7955_1_f8b07c7518a55213b19d9b6f529c43e4_jpg.webp",
  },
  {
    id: 4,
    nome: "Brita nº 1 (m³)",
    desc: "Ideal para lajes e vigas estruturais.",
    preco: 108.0,
    img: "https://i.postimg.cc/Pr4vTfLN/brita.jpg",
  },
  {
    id: 5,
    nome: "Argamassa AC-III 20kg",
    desc: "Quartzolit. Uso interno e externo.",
    preco: 41.5,
    img: "https://i.postimg.cc/gJN1GZPH/argamassa.webp",
  },
  {
    id: 6,
    nome: "Vergalhão Nervurado 3/8",
    desc: "Barra de 12 metros. Alta resistência.",
    preco: 78.9,
    img: "https://i.postimg.cc/gJN1GZPq/vergalhao.jpg",
  },
];

let state = {
  cliente: null,
  carrinho: [],
  totalCarrinho: 0,
  metodoPagamentoSelecionado: null,
};

const db = {
  getClientes: () => JSON.parse(localStorage.getItem("clientes")) || [],
  salvarCliente: (cli) => {
    const clientes = db.getClientes();
    clientes.push(cli);
    localStorage.setItem("clientes", JSON.stringify(clientes));
  },
  buscarPorCPF: (cpf) => db.getClientes().find((c) => c.cpf === cpf),
};

function navegarPara(screenId) {
  document
    .querySelectorAll("section")
    .forEach((s) => s.classList.add("hidden"));
  document.getElementById(screenId).classList.remove("hidden");
  lucide.createIcons();
}

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

function verificarCPF() {
  const cpf = document.getElementById("input-cpf-check").value;
  if (cpf.length < 14) return alert("CPF incompleto!");

  const encontrado = db.buscarPorCPF(cpf);
  if (encontrado) {
    state.cliente = encontrado;
    iniciarCompra();
  } else {
    document.getElementById("cad-cpf").value = cpf;
    navegarPara("screen-cadastro");
  }
}

function salvarCadastro() {
  const nome = document.getElementById("cad-nome").value.trim();
  const cpf = document.getElementById("cad-cpf").value.trim();
  const tel = document.getElementById("cad-tel").value.trim();
  const email = document.getElementById("cad-email").value.trim();
  const cep = document.getElementById("cad-cep").value.trim();
  const endereco = document.getElementById("cad-end").value.trim();
  const numero = document.getElementById("cad-num").value.trim();

  if (!nome || !tel || !email || !cep || !endereco || !numero) {
    return alert("Atenção! Todos os dados são obrigatórios.");
  }

  if (!email.includes("@")) {
    return alert("Por favor, insira um e-mail válido!");
  }

  const novo = { nome, cpf, tel, email, cep, endereco, numero };
  db.salvarCliente(novo);
  state.cliente = novo;
  iniciarCompra();
}

function iniciarCompra() {
  document.getElementById("display-cliente-nome").innerText =
    `Olá, ${state.cliente.nome.split(" ")[0]}!`;
  document.getElementById("search-catalogo").value = "";
  renderizarCatalogo();
  navegarPara("screen-produtos");
}

// --- ATUALIZADO: Passamos a receber o 'event' ---
function alterarQuantidade(id, delta, event = null) {
  const index = state.carrinho.findIndex((x) => x.id === id);

  if (index === -1) {
    if (delta > 0) {
      const p = catalogoProdutos.find((x) => x.id === id);
      state.carrinho.push({ ...p, qtd: 1, total: p.preco });

      // DISPARA A ANIMAÇÃO AQUI (Se foi uma adição e temos o evento do clique)
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

      // DISPARA A ANIMAÇÃO AQUI TAMBÉM (Se o cara apertou no "+" de novo)
      if (delta > 0 && event) animarParaCarrinho(id, event);
    }
  }

  atualizarCarrinhoUI();
  renderizarCatalogo(document.getElementById("search-catalogo").value);
}

function renderizarCatalogo(filtro = "") {
  const grid = document.getElementById("grid-catalogo");
  grid.innerHTML = "";

  const filtrados = catalogoProdutos.filter(
    (p) =>
      p.nome.toLowerCase().includes(filtro.toLowerCase()) ||
      p.desc.toLowerCase().includes(filtro.toLowerCase()),
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
          <img src="${p.img}" class="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 mix-blend-multiply">
        </div>
        <div class="p-5">
          <h4 class="font-black text-blue-900 leading-tight mb-1">${p.nome}</h4>
          <p class="text-[10px] text-slate-500 uppercase font-bold mb-4">${p.desc}</p>
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
  let totalQuantidadeItens = 0; // Para contar quantos itens no total

  state.carrinho.forEach((item) => {
    state.totalCarrinho += item.total;
    totalQuantidadeItens += item.qtd;
  });

  // Atualiza o valor monetário lá no topo
  document.getElementById("cart-total-rodape").innerText =
    state.totalCarrinho.toFixed(2);

  // Atualiza a bolinha vermelha (badge)
  const badge = document.getElementById("cart-badge");
  if (totalQuantidadeItens > 0) {
    badge.innerText = totalQuantidadeItens;
    badge.classList.remove("hidden");
  } else {
    badge.classList.add("hidden");
  }
}

function removerItem(idx) {
  state.carrinho.splice(idx, 1);
  atualizarCarrinhoUI();
  renderizarCatalogo(document.getElementById("search-catalogo").value);
}

function irParaPagamento() {
  // Trava de segurança: Verifica se o carrinho está zerado
  if (state.carrinho.length === 0) {
    alert("Atenção! Seu carrinho está vazio. Adicione produtos para continuar.");
    return; 
  }
  
  // Agora ele desenha o resumo e joga o cliente pra tela nova!
  renderizarResumoCompleto(); 
  navegarPara("screen-resumo");
}

function selecionarPagamento(metodo) {
  state.metodoPagamentoSelecionado = metodo;

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
  const totalText = state.totalCarrinho.toFixed(2);
  document.getElementById("pag-texto-total").innerText = `R$ ${totalText}`;
  document.getElementById("resumo-subtotal").innerText = `R$ ${totalText}`;
  document.getElementById("resumo-total-final").innerText = `R$ ${totalText}`;

  const container = document.getElementById("resumo-itens");
  container.innerHTML = "";

  state.carrinho.forEach((item) => {
    container.innerHTML += `
      <div class="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
        <div class="w-12 h-12 bg-white rounded-lg overflow-hidden shrink-0 border border-slate-100">
           <img src="${item.img}" class="w-full h-full object-cover mix-blend-multiply">
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

function finalizarVenda() {
  document.getElementById("nota-cliente").innerText =
    state.cliente.nome.toUpperCase();
  document.getElementById("nota-cpf").innerText = state.cliente.cpf;
  document.getElementById("nota-data").innerText = new Date().toLocaleString();

  const tbody = document.getElementById("nota-itens");
  tbody.innerHTML = "";
  state.carrinho.forEach((item) => {
    tbody.innerHTML += `<tr><td class="py-1 pr-2 text-slate-700">${item.nome} (${item.qtd}x)</td><td class="text-right font-bold whitespace-nowrap text-blue-900">R$ ${item.total.toFixed(2)}</td></tr>`;
  });

  document.getElementById("nota-total").innerText =
    state.totalCarrinho.toFixed(2);

  const formas = document.getElementById("nota-formas-pagamento");
  formas.innerHTML = `<strong>FORMA DE PAGAMENTO:</strong><br>${state.metodoPagamentoSelecionado.toUpperCase()}: R$ ${state.totalCarrinho.toFixed(2)}<br>`;

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

  navegarPara("screen-nota");
}

function reiniciarTotem() {
  state = {
    cliente: null,
    carrinho: [],
    totalCarrinho: 0,
    metodoPagamentoSelecionado: null,
  };
  document.querySelectorAll("input").forEach((i) => (i.value = ""));
  atualizarCarrinhoUI();
  renderizarCatalogo();
  navegarPara("screen-cpf");
}

// Início
navegarPara("screen-cpf");

// --- NOVA FUNÇÃO: Animação do item voando para o carrinho ---
function animarParaCarrinho(id, event) {
  // Se não tiver o evento de clique, não faz a animação
  if (!event) return;

  const produto = catalogoProdutos.find((p) => p.id === id);
  const cartBtn = document.getElementById("btn-carrinho-topo");

  // 1. Cria a imagem "fantasma" que vai voar
  const flyingImg = document.createElement("img");
  flyingImg.src = produto.img;
  // Usamos a classe que criamos lá no CSS
  flyingImg.className =
    "item-voador w-16 h-16 border-2 border-blue-900 bg-white";

  // 2. Ponto de Partida: Onde o usuário clicou (pegamos as coordenadas do mouse)
  flyingImg.style.left = `${event.clientX - 32}px`;
  flyingImg.style.top = `${event.clientY - 32}px`;

  // Joga a imagem na tela
  document.body.appendChild(flyingImg);

  // 3. Destino: Pega a posição exata do botão do carrinho lá no topo
  const rect = cartBtn.getBoundingClientRect();

  // Pequeno delay pro navegador registrar a posição inicial antes de mover
  setTimeout(() => {
    // Calcula o centro do botão do carrinho
    flyingImg.style.left = `${rect.left + rect.width / 2 - 10}px`;
    flyingImg.style.top = `${rect.top + rect.height / 2 - 10}px`;

    // Encolhe a imagem enquanto ela voa
    flyingImg.style.width = "10px";
    flyingImg.style.height = "10px";
    flyingImg.style.opacity = "0.3";
  }, 50);

  // 4. Limpeza: Depois de 800ms (tempo da animação do CSS), apaga a imagem fantasma
  setTimeout(() => {
    flyingImg.remove();
    // Faz o botão do carrinho dar um "pulinho" pra mostrar que recebeu o item
    cartBtn.classList.add("scale-110");
    setTimeout(() => cartBtn.classList.remove("scale-110"), 200);
  }, 800);
}
// --- NOVA FUNÇÃO: Atualiza a quantidade quando o cliente digita o número ---
function alterarQuantidadeManual(id, valor) {
  // Transforma o texto digitado em um número inteiro
  const novaQtd = parseInt(valor, 10);
  const index = state.carrinho.findIndex((x) => x.id === id);

  if (index !== -1) {
    const item = state.carrinho[index];

    // Se o cliente apagar tudo, digitar 0 ou letras, perguntamos se quer excluir
    if (isNaN(novaQtd) || novaQtd <= 0) {
      if (confirm(`Deseja realmente excluir o material "${item.nome}"?`)) {
        state.carrinho.splice(index, 1);
      }
    } else {
      // Se for um número válido, atualiza a quantidade e o total do item
      item.qtd = novaQtd;
      item.total = item.qtd * item.preco;
    }

    // Atualiza a tela com os novos valores
    atualizarCarrinhoUI();
    renderizarCatalogo(document.getElementById("search-catalogo").value);
  }
}
// --- NOVAS FUNÇÕES DO RESUMO DO PEDIDO ---

function renderizarResumoCompleto() {
  const container = document.getElementById("lista-resumo-completo");
  container.innerHTML = "";
  let total = 0;

  state.carrinho.forEach((item, idx) => {
    total += item.total;
    container.innerHTML += `
      <div class="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex items-center gap-4">
        <img src="${item.img}" class="w-20 h-20 object-cover rounded-xl border border-slate-100 mix-blend-multiply">
        
        <div class="flex-1">
          <h4 class="font-bold text-blue-900 leading-tight">${item.nome}</h4>
          <p class="text-sm font-black text-blue-800 mt-1">R$ ${item.total.toFixed(2)}</p>
          
          <div class="flex items-center gap-3 mt-3">
            <div class="flex items-center bg-slate-100 rounded-lg border border-slate-200 overflow-hidden">
              <button onclick="alterarQtdResumo(${item.id}, -1)" class="px-3 py-1 text-blue-900 hover:bg-slate-200"><i data-lucide="minus" class="w-4 h-4"></i></button>
              <span class="px-3 py-1 font-bold text-sm bg-white border-x border-slate-200">${item.qtd}</span>
              <button onclick="alterarQtdResumo(${item.id}, 1)" class="px-3 py-1 text-blue-900 hover:bg-slate-200"><i data-lucide="plus" class="w-4 h-4"></i></button>
            </div>

            <button onclick="removerItemResumo(${idx})" class="ml-auto text-slate-300 hover:text-red-500 transition-colors p-2">
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
  // Reutiliza sua lógica de alterar quantidade e redesenha o resumo
  alterarQuantidade(id, delta);
  renderizarResumoCompleto();
}

function removerItemResumo(idx) {
  const nomeItem = state.carrinho[idx].nome;
  if (confirm(`Deseja realmente remover "${nomeItem}" do seu pedido?`)) {
    state.carrinho.splice(idx, 1);
    if (state.carrinho.length === 0) {
      navegarPara("screen-produtos");
    } else {
      renderizarResumoCompleto();
    }
    atualizarCarrinhoUI();
  }
}

function irParaPagamentoReal() {
  state.metodoPagamentoSelecionado = null;
  document.getElementById("btn-finalizar-venda-novo").disabled = true;
  
  // Limpa os botões de pagamento para não ficarem selecionados do pedido anterior
  document.querySelectorAll(".btn-pagamento").forEach((b) => {
    b.classList.remove("border-blue-900", "bg-blue-50");
    b.classList.add("border-slate-300", "bg-white");
  });
  
  atualizarResumoPedidoUI(); 
  navegarPara("screen-pagamento");
}