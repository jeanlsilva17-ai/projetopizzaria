/**
 * PIZZARIA BELLA MASSA - SISTEMA INTEGRADO
 * Estado reativo compartilhado em tempo real entre todas as telas
 */

// ==================== ESTADO GLOBAL DA APLICAÇÃO ====================
const State = {
    soundEnabled: true,
    
    mesas: Array.from({ length: 10 }, (_, i) => ({
        id: i + 1,
        numero: `Mesa ${String(i + 1).padStart(2, '0')}`,
        status: 'Livre' // Livre, Consumindo, Prato Pronto, Aguardando Conta
    })),

    cardapio: [
        { id: 'p1', nome: 'Calabresa Especial', categoria: 'Pizzas', preco: 48.00, desc: 'Molho, mussarela, calabresa e orégano' },
        { id: 'p2', nome: 'Margherita Napolitana', categoria: 'Pizzas', preco: 52.00, desc: 'Molho San Marzano, búfala e manjericão' },
        { id: 'p3', nome: 'Quatro Queijos', categoria: 'Pizzas', preco: 55.00, desc: 'Mussarela, gorgonzola, provolone e catupiry' },
        { id: 'p4', nome: 'Frango com Catupiry', categoria: 'Pizzas', preco: 50.00, desc: 'Frango desfiado temperado e catupiry' },
        { id: 'b1', nome: 'Refrigerante 2L', categoria: 'Bebidas', preco: 12.00, desc: 'Coca-Cola ou Guaraná' },
        { id: 'b2', nome: 'Cerveja Artesanal Pinda 500ml', categoria: 'Bebidas', preco: 18.00, desc: 'Pilsen Local' },
        { id: 's1', nome: 'Petit Gâteau', categoria: 'Sobremesas', preco: 22.00, desc: 'Bolo quente com sorvete' }
    ],

    // Pedidos ativos no sistema
    pedidos: [
        {
            id: 'PED-101',
            mesaId: 7,
            mesaNumero: 'Mesa 07',
            timestamp: Date.now() - 12 * 60 * 1000, // Há 12 min
            status: 'RECEBIDO', // RECEBIDO, EM_PREPARO, PRONTO, ENTREGUE, PAGO
            itens: [
                { nome: 'Pizza Calabresa Especial', observacao: 'SEM CEBOLA', preco: 48.00, qtd: 1 },
                { nome: 'Refrigerante 2L', observacao: 'Com gelo e limão', preco: 12.00, qtd: 1 }
            ],
            total: 60.00
        }
    ],

    carrinhoCliente: [],
    mesaClienteAtual: 7,
    mesaCaixaAtual: 7,
    formaPagamentoCaixa: 'PIX'
};

// ==================== GERENCIADOR DE ÁUDIO ====================
function playChime() {
    if (!State.soundEnabled) return;
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3); // A5
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
    } catch (e) {
        console.log("Áudio bloqueado pelo navegador.");
    }
}

// ==================== INICIALIZAÇÃO DA APLICAÇÃO ====================
document.addEventListener('DOMContentLoaded', () => {
    initNavigation();
    initClienteView();
    initPizzaioloView();
    initGarcomView();
    initCaixaView();
    
    // Atualização em tempo real (1 segundo)
    setInterval(() => {
        renderKDS();
        renderGarcom();
        renderClienteTracker();
    }, 1000);

    renderAll();
});

// Renderiza todas as telas ativas
function renderAll() {
    renderClienteView();
    renderKDS();
    renderGarcom();
    renderCaixaView();
}

// ==================== NAVEGAÇÃO ENTRE TELAS ====================
function initNavigation() {
    const navBtns = document.querySelectorAll('.nav-btn');
    const viewport = document.getElementById('app-viewport');

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            navBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const target = btn.dataset.target;

            if (target === 'view-overview') {
                viewport.className = 'layout-overview';
                document.querySelectorAll('.screen-panel').forEach(p => p.classList.remove('active-single'));
            } else {
                viewport.className = 'layout-single';
                document.querySelectorAll('.screen-panel').forEach(p => {
                    p.classList.toggle('active-single', p.id === target);
                });
            }
        });
    });
}

// ==================== LÓGICA TELA 1: CLIENTE ====================
function initClienteView() {
    const tableSelect = document.getElementById('client-table-select');
    
    // Popula select de mesas
    tableSelect.innerHTML = State.mesas.map(m => 
        `<option value="${m.id}" ${m.id === State.mesaClienteAtual ? 'selected' : ''}>${m.numero}</option>`
    ).join('');

    tableSelect.addEventListener('change', (e) => {
        State.mesaClienteAtual = parseInt(e.target.value);
        renderClienteView();
    });

    // Filtro por categoria
    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderMenuGrid(btn.dataset.cat);
        });
    });

    // Enviar Pedido
    document.getElementById('btn-submit-order').addEventListener('click', () => {
        if (State.carrinhoCliente.length === 0) return;

        const novoPedido = {
            id: `PED-${Math.floor(100 + Math.random() * 900)}`,
            mesaId: State.mesaClienteAtual,
            mesaNumero: `Mesa ${String(State.mesaClienteAtual).padStart(2, '0')}`,
            timestamp: Date.now(),
            status: 'RECEBIDO',
            itens: [...State.carrinhoCliente],
            total: State.carrinhoCliente.reduce((acc, i) => acc + (i.preco * i.qtd), 0)
        };

        State.pedidos.push(novoPedido);
        
        // Atualiza status da mesa
        const mesa = State.mesas.find(m => m.id === State.mesaClienteAtual);
        if (mesa) mesa.status = 'Consumindo';

        State.carrinhoCliente = [];
        playChime();
        renderAll();
    });

    renderMenuGrid('Pizzas');
}

function renderMenuGrid(categoria) {
    const grid = document.getElementById('menu-grid');
    const itens = State.cardapio.filter(i => i.categoria === categoria);

    grid.innerHTML = itens.map(item => `
        <div class="menu-card">
            <div>
                <h4>${item.nome}</h4>
                <p>${item.desc}</p>
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; margin-top:8px;">
                <span class="price">R$ ${item.preco.toFixed(2)}</span>
                <button class="btn-primary" onclick="adicionarAoCarrinhoDirect('${item.id}')">
                    <i class="fa-solid fa-plus"></i>
                </button>
            </div>
        </div>
    `).join('');
}

window.adicionarAoCarrinhoDirect = function(itemId) {
    const item = State.cardapio.find(i => i.id === itemId);
    if (!item) return;

    State.carrinhoCliente.push({
        nome: item.nome,
        observacao: '',
        preco: item.preco,
        qtd: 1
    });

    renderClienteView();
};

function renderClienteView() {
    // Renderiza itens do carrinho
    const cartContainer = document.getElementById('cart-items');
    const subtotalEl = document.getElementById('cart-subtotal');
    const btnSubmit = document.getElementById('btn-submit-order');

    if (State.carrinhoCliente.length === 0) {
        cartContainer.innerHTML = '<p class="empty-msg">Seu carrinho está vazio.</p>';
        subtotalEl.innerText = 'R$ 0,00';
        btnSubmit.disabled = true;
    } else {
        cartContainer.innerHTML = State.carrinhoCliente.map((item, idx) => `
            <div class="cart-item">
                <div>
                    <strong>${item.nome}</strong>
                    ${item.observacao ? `<span class="obs-tag">${item.observacao}</span>` : ''}
                </div>
                <span>R$ ${item.preco.toFixed(2)}</span>
            </div>
        `).join('');

        const subtotal = State.carrinhoCliente.reduce((acc, i) => acc + i.preco, 0);
        subtotalEl.innerText = `R$ ${subtotal.toFixed(2)}`;
        btnSubmit.disabled = false;
    }

    renderClienteTracker();
}

function renderClienteTracker() {
    const trackerBox = document.getElementById('client-tracker');
    const statusPill = document.getElementById('client-order-status');

    // Busca o último pedido ativo desta mesa
    const pedidoAtivo = State.pedidos
        .filter(p => p.mesaId === State.mesaClienteAtual && p.status !== 'PAGO')
        .slice(-1)[0];

    if (!pedidoAtivo) {
        trackerBox.classList.add('hidden');
        statusPill.innerHTML = '<i class="fa-solid fa-clock"></i> Sem pedido em andamento';
        return;
    }

    trackerBox.classList.remove('hidden');
    statusPill.innerHTML = `<i class="fa-solid fa-spinner fa-spin"></i> Pedido ${pedidoAtivo.id}: ${pedidoAtivo.status}`;

    // Atualiza Stepper
    document.querySelectorAll('.stepper .step').forEach(s => s.classList.remove('active'));
    
    if (pedidoAtivo.status === 'RECEBIDO') document.getElementById('step-recebido').classList.add('active');
    if (pedidoAtivo.status === 'EM_PREPARO') document.getElementById('step-preparo').classList.add('active');
    if (pedidoAtivo.status === 'PRONTO') document.getElementById('step-pronto').classList.add('active');
    if (pedidoAtivo.status === 'ENTREGUE') document.getElementById('step-entregue').classList.add('active');
}

// ==================== LÓGICA TELA 2: PIZZAIOLO (KDS) ====================
function initPizzaioloView() {}

function renderKDS() {
    const container = document.getElementById('kds-cards-container');
    const countEl = document.getElementById('kds-count');

    const pedidosCozinha = State.pedidos.filter(p => p.status === 'RECEBIDO' || p.status === 'EM_PREPARO');
    countEl.innerText = pedidosCozinha.length;

    if (pedidosCozinha.length === 0) {
        container.innerHTML = '<p class="empty-msg" style="color:#9ca3af; grid-column: 1/-1; text-align:center;">Sem pedidos pendentes na cozinha.</p>';
        return;
    }

    const agora = Date.now();

    container.innerHTML = pedidosCozinha.map(p => {
        const decorridoMin = Math.floor((agora - p.timestamp) / 60000);
        const decorridoSeg = Math.floor(((agora - p.timestamp) % 60000) / 1000);
        const timerStr = `${String(decorridoMin).padStart(2, '0')}:${String(decorridoSeg).padStart(2, '0')}`;

        let timerClass = 'timer-green';
        if (decorridoMin >= 10 && decorridoMin < 20) timerClass = 'timer-yellow';
        if (decorridoMin >= 20) timerClass = 'timer-red';

        return `
            <div class="kds-card ${timerClass}">
                <div class="kds-card-header">
                    <span class="kds-card-title">${p.mesaNumero} (${p.id})</span>
                    <span class="kds-timer">${timerStr}</span>
                </div>

                <ul class="kds-items">
                    ${p.itens.map(i => `
                        <li>
                            <strong>${i.qtd}x ${i.nome}</strong>${i.observacao ? `<br><span class="kds-obs">⚠️ ${i.observacao}</span>` : ''}
                        </li>
                    `).join('')}
                </ul>

                <div class="kds-actions">
                    ${p.status === 'RECEBIDO' ? `
                        <button class="btn-secondary btn-block" onclick="alterarStatusPedido('${p.id}', 'EM_PREPARO')">
                            <i class="fa-solid fa-fire"></i> Iniciar Preparo
                        </button>
                    ` : `
                        <button class="btn-success btn-block" onclick="alterarStatusPedido('${p.id}', 'PRONTO')">
                            <i class="fa-solid fa-check"></i> Marcar como Pronto
                        </button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

window.alterarStatusPedido = function(pedidoId, novoStatus) {
    const pedido = State.pedidos.find(p => p.id === pedidoId);
    if (!pedido) return;

    pedido.status = novoStatus;

    if (novoStatus === 'PRONTO') {
        playChime();
        const mesa = State.mesas.find(m => m.id === pedido.mesaId);
        if (mesa) mesa.status = 'Prato Pronto';
    }

    renderAll();
};

// ==================== LÓGICA TELA 3: GARÇOM ====================
function initGarcomView() {
    document.getElementById('btn-sound-toggle').addEventListener('click', (e) => {
        State.soundEnabled = !State.soundEnabled;
        e.currentTarget.innerHTML = State.soundEnabled ? 
            '<i class="fa-solid fa-volume-high"></i> Som Ativo' : 
            '<i class="fa-solid fa-volume-xmark"></i> Mute';
    });
}

function renderGarcom() {
    const alertsList = document.getElementById('waiter-alerts-list');
    const floorGrid = document.getElementById('floor-map-grid');
    const badgeCount = document.getElementById('waiter-badge');

    const pratosProntos = State.pedidos.filter(p => p.status === 'PRONTO');
    
    // Atualiza badge de contagem
    if (pratosProntos.length > 0) {
        badgeCount.classList.remove('hidden');
        badgeCount.innerText = pratosProntos.length;
    } else {
        badgeCount.classList.add('hidden');
    }

    // Alertas de entrega
    if (pratosProntos.length === 0) {
        alertsList.innerHTML = '<p class="empty-msg">Nenhum prato aguardando no balcão.</p>';
    } else {
        alertsList.innerHTML = pratosProntos.map(p => `
            <div class="alert-card">
                <div>
                    <strong>${p.mesaNumero}</strong>
                    <div style="font-size:0.8rem; color:#4b5563;">${p.itens.map(i => i.nome).join(', ')}</div>
                </div>
                <button class="btn-success" onclick="alterarStatusPedido('${p.id}', 'ENTREGUE')">
                    Entregar
                </button>
            </div>
        `).join('');
    }

    // Mapa do Salão
    floorGrid.innerHTML = State.mesas.map(m => {
        let statusClass = 'status-livre';
        if (m.status === 'Consumindo') statusClass = 'status-consumindo';
        if (m.status === 'Prato Pronto') statusClass = 'status-pronto';

        return `
            <div class="table-card ${statusClass}">
                <strong>${m.numero}</strong>
                <div style="font-size:0.75rem; margin-top:4px;">${m.status}</div>
            </div>
        `;
    }).join('');
}

// ==================== LÓGICA TELA 4: CAIXA (PDV) ====================
function initCaixaView() {
    const selectMesa = document.getElementById('caixa-table-select');
    
    selectMesa.innerHTML = State.mesas.map(m => 
        `<option value="${m.id}" ${m.id === State.mesaCaixaAtual ? 'selected' : ''}>${m.numero}</option>`
    ).join('');

    selectMesa.addEventListener('change', (e) => {
        State.mesaCaixaAtual = parseInt(e.target.value);
        renderCaixaView();
    });

    // Taxa de Serviço
    document.getElementById('chk-service-fee').addEventListener('change', renderCaixaView);

    // Seletor de Pessoas
    const rangeSplit = document.getElementById('split-people');
    rangeSplit.addEventListener('input', (e) => {
        document.getElementById('split-count').innerText = e.target.value;
        renderCaixaView();
    });

    // Métodos de Pagamento
    document.querySelectorAll('.pay-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.pay-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            State.formaPagamentoCaixa = btn.dataset.method;
        });
    });

    // Encerrar Mesa
    document.getElementById('btn-process-payment').addEventListener('click', encerrarMesaCaixa);
}

function renderCaixaView() {
    const titleEl = document.getElementById('extrato-mesa-title');
    const itemsEl = document.getElementById('extrato-items');
    const subtotalEl = document.getElementById('caixa-subtotal');
    const feeEl = document.getElementById('caixa-fee');
    const totalEl = document.getElementById('caixa-grand-total');
    const splitValEl = document.getElementById('split-val');
    const btnPay = document.getElementById('btn-process-payment');

    const mesa = State.mesas.find(m => m.id === State.mesaCaixaAtual);
    titleEl.innerText = `${mesa ? mesa.numero : 'Mesa'} - Comanda`;

    // Busca todos os pedidos da mesa que não foram pagos
    const pedidosMesa = State.pedidos.filter(p => p.mesaId === State.mesaCaixaAtual && p.status !== 'PAGO');

    if (pedidosMesa.length === 0) {
        itemsEl.innerHTML = '<p class="empty-msg">Nenhum consumo registrado para esta mesa.</p>';
        subtotalEl.innerText = 'R$ 0,00';
        feeEl.innerText = 'R$ 0,00';
        totalEl.innerText = 'R$ 0,00';
        splitValEl.innerText = 'R$ 0,00';
        btnPay.disabled = true;
        return;
    }

    // Consolida todos os itens
    let todosItens = [];
    pedidosMesa.forEach(p => todosItens.push(...p.itens));

    itemsEl.innerHTML = todosItens.map(i => `
        <div class="extrato-row">
            <span>${i.qtd}x ${i.nome}</span>
            <strong>R$ ${(i.preco * i.qtd).toFixed(2)}</strong>
        </div>
    `).join('');

    const subtotal = todosItens.reduce((acc, i) => acc + (i.preco * i.qtd), 0);
    const includeFee = document.getElementById('chk-service-fee').checked;
    const taxa = includeFee ? subtotal * 0.10 : 0;
    const totalGeral = subtotal + taxa;

    subtotalEl.innerText = `R$ ${subtotal.toFixed(2)}`;
    feeEl.innerText = `R$ ${taxa.toFixed(2)}`;
    totalEl.innerText = `R$ ${totalGeral.toFixed(2)}`;

    const numPessoas = parseInt(document.getElementById('split-people').value) || 1;
    splitValEl.innerText = `R$ ${(totalGeral / numPessoas).toFixed(2)}`;

    btnPay.disabled = false;
}

function encerrarMesaCaixa() {
    const pedidosMesa = State.pedidos.filter(p => p.mesaId === State.mesaCaixaAtual && p.status !== 'PAGO');
    
    // Marca pedidos como pagos
    pedidosMesa.forEach(p => p.status = 'PAGO');

    // Libera mesa
    const mesa = State.mesas.find(m => m.id === State.mesaCaixaAtual);
    if (mesa) mesa.status = 'Livre';

    alert(`Mesa ${State.mesaCaixaAtual} encerrada com sucesso! Comprovante emitido via ${State.formaPagamentoCaixa}.`);

    renderAll();
}