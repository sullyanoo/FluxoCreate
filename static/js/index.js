 // Alterna a exibição da barra lateral de controles
    function toggleSidebar() {
      const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
      const btn = document.getElementById('toggle-sidebar-btn');
      if (btn) {
        btn.textContent = isCollapsed ? '👁️ Mostrar Controles' : '👁️ Ocultar Controles';
      }
    }

    // Adicione esta função ao seu arquivo index.js
function highlightEditorCard(nodeId) {
  // 1. Limpa destaques anteriores (painel lateral e canvas)
  const allCards = document.querySelectorAll('.editor-card');
  allCards.forEach(c => c.classList.remove('card-highlight'));

  const allGlowNodes = document.querySelectorAll('.node-highlight-glow');
  allGlowNodes.forEach(n => n.classList.remove('node-highlight-glow'));

  // 2. Destaca e rola até o card no painel lateral
  const card = document.querySelector(`.editor-card[data-node-id="${nodeId}"]`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    card.classList.add('card-highlight');
    setTimeout(() => {
      card.classList.remove('card-highlight');
    }, 1500); // Remove o destaque após 1.5 segundos
  }

  // 3. Destaca o nó correspondente no Canvas
  const canvasNode = document.querySelector(
    `#flowchart-canvas [data-node-id="${nodeId}"], #flowchart-canvas [data-id="${nodeId}"], #flowchart-canvas #node-${nodeId}`
  );
  if (canvasNode) {
    canvasNode.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    canvasNode.classList.add('node-highlight-glow');
    setTimeout(() => {
      canvasNode.classList.remove('node-highlight-glow');
    }, 2000); // Mantém o brilho no canvas por 2 segundos
  }
}

// Recupera dados automáticos do LocalStorage para não perder as alterações ao atualizar
let flowTree = JSON.parse(localStorage.getItem('colmeia_flow_save')) || [
  {
    id: "node_1",
    type: "start",
    title: "Root",
    text: "Disparo de fluxo de entrada da ColmeIA"
  },
  {
    id: "node_2",
    type: "msg",
    title: "Fraseologia Inicial",
    text: "Olá! Como posso te ajudar hoje?"
  },
  {
    id: "node_3",
    type: "decision",
    title: "Decisão do Usuário",
    text: "O cliente deseja atendimento de vagas?",
    branches: [
      {
        id: "b_sim",
        label: "Sim",
        children: [
          {
            id: "node_3_1",
            type: "api",
            title: "INTEGRAÇÃO API",
            text: "GET /api/v1/vagas-disponiveis"
          },
          {
            id: "node_3_2",
            type: "journey",
            title: "Ir para o Fluxo D",
            text: "Opção buscar mais vagas -> Segue para o trecho D",
            url: "fluxo_vagas.html"
          }
        ]
      },
      {
        id: "b_nao",
        label: "Não",
        children: [
          {
            id: "node_3_3",
            type: "human",
            title: "Atendimento Humano",
            text: "Transferindo para a fila de suporte humano..."
          }
        ]
      }
    ]
  }
];

const treeEditorEl = document.getElementById('tree-editor');
const flowchartCanvasEl = document.getElementById('flowchart-canvas');

// Inicialização da aplicação
function init() {
  renderEditor();
  renderCanvas();
}

// Grava o estado atual no navegador em tempo de execução
function autoSave() {
  localStorage.setItem('colmeia_flow_save', JSON.stringify(flowTree));
}

// RENDERIZAÇÃO DO EDITOR (PAINEL LATERAL)
function renderEditor() {
  autoSave();
  treeEditorEl.innerHTML = '';

  // Trata Estado Vazio (Criar do zero)
  if (!flowTree || flowTree.length === 0) {
    treeEditorEl.innerHTML = `
      <div class="empty-state-editor">
        <span class="empty-icon">🌱</span>
        <h3>Fluxo Vazio</h3>
        <p>Seu fluxo está limpo. Escolha qualquer bloco acima no menu para começar seu projeto do zero!</p>
        <div class="empty-actions">
          <button type="button" class="btn-node btn-start" onclick="addNodeToRoot('start')">Começar com Root</button>
          <button type="button" class="btn-node btn-msg" onclick="addNodeToRoot('msg')">Começar com Fraseologia</button>
        </div>
      </div>
    `;
    return;
  }

  renderEditorNodeList(flowTree, treeEditorEl);
}

function renderEditorNodeList(nodes, containerEl) {
  nodes.forEach((node, index) => {
    const card = document.createElement('div');
    card.className = `editor-card card-${node.type}`;
    card.setAttribute('data-node-id', node.id);

    let displayBadge = node.type === 'start' ? 'ROOT' : node.type.toUpperCase();
    if (node.type === 'journey') displayBadge = 'PRÓXIMA JORNADA';

    // ADIÇÃO DO BLOCO DE ID COPIÁVEL
    const idBadge = `
      <span 
        class="badge" 
        style="background:#F1F5F9; color:#475569; cursor:pointer; font-family:monospace;" 
        title="Clique para copiar o ID deste bloco" 
        onclick="navigator.clipboard.writeText('${node.id}'); alert('ID copiado: ${node.id}')">
        📋 ID: ${node.id}
      </span>`;

    card.innerHTML = `
      <div class="card-header">
        <span class="badge badge-${node.type}">${displayBadge}</span>
        ${idBadge}
        <div class="card-tools">
          ${index > 0 ? `<button type="button" title="Subir" onclick="moveNode('${node.id}', -1)">⬆️</button>` : ''}
          ${index < nodes.length - 1 ? `<button type="button" title="Descer" onclick="moveNode('${node.id}', 1)">⬇️</button>` : ''}
          <button type="button" title="Excluir Bloco" onclick="deleteNode('${node.id}')">🗑️</button>
        </div>
      </div>
      <div class="form-field">
        <label>Título / Rótulo do Botão</label>
        <input type="text" value="${escapeHtml(node.title || '')}" oninput="updateField('${node.id}', 'title', this.value)">
      </div>
      <div class="form-field">
        <label>Subtítulo / Descrição</label>
        <textarea rows="2" oninput="updateField('${node.id}', 'text', this.value)">${escapeHtml(node.text || '')}</textarea>
      </div>
    `;

    if (node.type === 'journey') {
      const urlField = document.createElement('div');
      urlField.className = 'form-field';
      urlField.innerHTML = `
        <label>🔗 Link / URL de Destino do Fluxo</label>
        <input type="text" placeholder="ex: fluxo_vagas.html ou #${node.id}" value="${escapeHtml(node.url || '')}" oninput="updateField('${node.id}', 'url', this.value)">
        <small style="font-size: 11px; color: var(--soft); display: block; margin-top: 3px;">
          Insira um link externo, o nome de outro arquivo HTML ou o ID de um bloco deste fluxo (copie clicando no badge de ID acima).
        </small>
      `;
      card.appendChild(urlField);
    }

    if (node.type === 'decision' && node.branches) {
      const branchesContainer = document.createElement('div');
      branchesContainer.className = 'branches-editor';
      
      const branchesHeader = document.createElement('div');
      branchesHeader.className = 'branches-title';
      branchesHeader.innerHTML = `
        <span>Ramos / Caminhos da Decisão:</span>
        <button type="button" class="btn-xs" onclick="addBranch('${node.id}')">➕ Novo Ramo</button>
      `;
      branchesContainer.appendChild(branchesHeader);

      node.branches.forEach((branch) => {
        const branchBox = document.createElement('div');
        branchBox.className = 'branch-box';
        
        branchBox.innerHTML = `
          <div class="branch-box-header">
            <span class="branch-tag-pill">Caminho:</span>
            <input type="text" value="${escapeHtml(branch.label)}" oninput="updateBranchLabel('${node.id}', '${branch.id}', this.value)">
            ${node.branches.length > 1 ? `<button type="button" class="delete-branch-btn" title="Excluir caminho" onclick="deleteBranch('${node.id}', '${branch.id}')">❌</button>` : ''}
          </div>
          <div class="branch-children" id="branch-container-${branch.id}"></div>
          
          <div class="branch-quick-add">
            <span class="quick-add-sub">Adicionar neste lado:</span>
            <div class="quick-buttons-sm">
                <button type="button" class="btn-sm btn-msg" onclick="addNodeToBranch('${branch.id}', 'msg')">+ Fraseologia</button>
                <button type="button" class="btn-sm btn-api" onclick="addNodeToBranch('${branch.id}', 'api')">+ API</button>
                <button type="button" class="btn-sm btn-decision" onclick="addNodeToBranch('${branch.id}', 'decision')">+ Decisão</button>
                <button type="button" class="btn-sm btn-end" onclick="addNodeToBranch('${branch.id}', 'end')">+ Fim do Bot</button>
                <button type="button" class="btn-sm btn-data" onclick="addNodeToBranch('${branch.id}', 'data')">+ Base Dados</button>
                <button type="button" class="btn-sm btn-function" onclick="addNodeToBranch('${branch.id}', 'function')">+ Função </button>
                <button type="button" class="btn-sm btn-metadado" onclick="addNodeToBranch('${branch.id}', 'metadado')">+ Metadado</button>
                <button type="button" class="btn-sm btn-menu" onclick="addNodeToBranch('${branch.id}', 'menu')">+ Item Menu</button>
                <button type="button" class="btn-sm btn-forms" onclick="addNodeToBranch('${branch.id}', 'forms')">+ ColmeIA Forms</button>
                <button type="button" class="btn-sm btn-validation" onclick="addNodeToBranch('${branch.id}', 'validation')">+ Validação</button>
                <button type="button" class="btn-sm btn-human" onclick="addNodeToBranch('${branch.id}', 'human')">+ Atend. Humano</button>
                <button type="button" class="btn-sm btn-hub" onclick="addNodeToBranch('${branch.id}', 'hub')">+ Decision Hub</button>
                <button type="button" class="btn-sm btn-journey" onclick="addNodeToBranch('${branch.id}', 'journey')">+ Próxima Jornada</button>
            </div>
          </div>
        `;

        branchesContainer.appendChild(branchBox);

        const childrenContainer = branchBox.querySelector(`#branch-container-${branch.id}`);
        renderEditorNodeList(branch.children || [], childrenContainer);
      });

      card.appendChild(branchesContainer);
    }

    containerEl.appendChild(card);
  });
}




    // RENDERIZAÇÃO VISUAL 
    function renderCanvas() {
      autoSave();
      flowchartCanvasEl.innerHTML = '';

      if (!flowTree || flowTree.length === 0) {
        flowchartCanvasEl.innerHTML = `
          <div class="empty-canvas-notice">
            <span class="empty-icon-large">🗺️</span>
            <h3>Seu fluxograma está vazio</h3>
            <p>Adicione blocos através do menu lateral esquerdo para começar a desenhar seu fluxo em tempo real!</p>
          </div>
        `;
        return;
      }

      renderVisualNodeList(flowTree, flowchartCanvasEl);
    }

    function renderVisualNodeList(nodes, containerEl) {
  nodes.forEach((node, idx) => {
    let el;
    const nodeIdAttr = `data-node-id="${node.id}"`;

    if (node.type === 'decision') {
      el = document.createElement('div');
      el.className = 'fork-group-wrapper';
      
      const decisionNode = document.createElement('div');
      decisionNode.className = 'node decision';
      decisionNode.setAttribute('data-node-id', node.id);
      decisionNode.innerHTML = `<strong>${escapeHtml(node.title)}</strong><p>${escapeHtml(node.text)}</p>`;
      
      // Adiciona o listener de clique ao nó principal da decisão
      decisionNode.addEventListener('click', () => highlightEditorCard(node.id));

      el.appendChild(decisionNode);

      if (node.branches && node.branches.length > 0) {
        const link = document.createElement('div');
        link.className = 'link';
        el.appendChild(link);

        const forkEl = document.createElement('div');
        forkEl.className = 'fork';

        const count = node.branches.length;
        const barWidthPercent = count > 1 ? ((count - 1) / count) * 100 : 0;
        forkEl.innerHTML = `<div class="bar-h" style="width: ${barWidthPercent}%;"></div>`;

        const colsEl = document.createElement('div');
        colsEl.className = 'cols';

        node.branches.forEach(branch => {
          const colEl = document.createElement('div');
          colEl.className = 'col';

          const tagEl = document.createElement('div');
          tagEl.className = 'tag';
          tagEl.textContent = branch.label || 'Caminho';
          colEl.appendChild(tagEl);

          const subLink = document.createElement('div');
          subLink.className = 'link';
          colEl.appendChild(subLink);

          if (branch.children && branch.children.length > 0) {
            renderVisualNodeList(branch.children, colEl);
          } else {
            const emptyBranchPlaceholder = document.createElement('div');
            emptyBranchPlaceholder.className = 'empty-branch-placeholder';
            emptyBranchPlaceholder.textContent = 'Caminho vazio.';
            colEl.appendChild(emptyBranchPlaceholder);
          }
          colsEl.appendChild(colEl);
        });

        forkEl.appendChild(colsEl);
        el.appendChild(forkEl);
      }
    } else if (node.type === 'journey') {
      el = document.createElement('a');
      el.className = 'jump';
      
      // Valida se o link aponta para um bloco existente no próprio canvas
      const cleanUrl = (node.url || '#').trim();
      const isInternalNode = document.querySelector(`[data-node-id="${cleanUrl.replace(/^#/, '')}"]`) || flowTree.some(n => n.id === cleanUrl);

      el.href = isInternalNode ? `#${cleanUrl.replace(/^#/, '')}` : cleanUrl;
      el.target = isInternalNode ? '_self' : '_blank';
      el.innerHTML = `<strong>${escapeHtml(node.title)}</strong><span>${escapeHtml(node.text)}</span>`;
      
      el.setAttribute('data-node-id', node.id);
      
      el.addEventListener('click', (event) => {
        const targetId = cleanUrl.replace(/^#/, '');
        const targetNodeEl = document.querySelector(`[data-node-id="${targetId}"]`);
        
        // Se encontrar o bloco correspondente no Canvas, executa a rolagem suave e dá destaque
        if (targetNodeEl) {
          event.preventDefault(); // Evita a navegação de nova página
          
          // Rola suavemente até o elemento centralizado vertical e horizontalmente
          targetNodeEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
          
          // Pisca a borda do nó de destino em evidência
          targetNodeEl.classList.remove('node-highlight-glow');
          void targetNodeEl.offsetWidth; // Força repintura para reiniciar a animação
          targetNodeEl.classList.add('node-highlight-glow');
          
          setTimeout(() => {
            targetNodeEl.classList.remove('node-highlight-glow');
          }, 2000);

          // Rola também a barra lateral de controle até o card de configurações
          highlightEditorCard(targetId);
        } else {
          // Se for um link externo (como fluxo_b.html), executa a navegação padrão
          highlightEditorCard(node.id);
          if (el.href && !el.href.endsWith('#')) {
            window.open(el.href, el.target);
          }
        }
      });
      
    } else {
      el = document.createElement('div');
      el.className = `node ${node.type}`;
      el.setAttribute('data-node-id', node.id);

      if (node.type === 'api') {
        el.innerHTML = `<span class="k">${escapeHtml(node.title)}</span><span class="t">${escapeHtml(node.text)}</span>`;
      } else {
        el.innerHTML = `<strong>${escapeHtml(node.title)}</strong><p>${escapeHtml(node.text)}</p>`;
      }

      el.addEventListener('click', () => highlightEditorCard(node.id));
    }

    containerEl.appendChild(el);

    if (idx < nodes.length - 1 && node.type !== 'decision') {
      const link = document.createElement('div');
      link.className = 'link';
      containerEl.appendChild(link);
    }
  });
}

    // Adiciona bloco na raiz com um clique
    window.addNodeToRoot = function(type) {
      if (!flowTree) flowTree = [];
      const normalizedType = type === 'jorney' ? 'journey' : type;
      flowTree.push(createNodeObject(normalizedType));
      renderEditor();
      renderCanvas();
    };

    // Adiciona bloco em um ramo/lado específico
    window.addNodeToBranch = function(branchId, type) {
      const normalizedType = type === 'jorney' ? 'journey' : type;
      const newNode = createNodeObject(normalizedType);
      findAndMutateBranch(flowTree, branchId, (branch) => {
        if (!branch.children) branch.children = [];
        branch.children.push(newNode);
      });
      renderEditor();
      renderCanvas();
    };

    // Adiciona novo caminho (ramal) na Decisão
    window.addBranch = function(decisionId) {
      findAndMutateNode(flowTree, decisionId, (node) => {
        const nextNum = (node.branches ? node.branches.length : 0) + 1;
        node.branches.push({
          id: 'b_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
          label: `Opção ${nextNum}`,
          children: [createNodeObject('msg', `Ação Opção ${nextNum}`)]
        });
      });
      renderEditor();
      renderCanvas();
    };

    // Excluir ramo de decisão
    window.deleteBranch = function(decisionId, branchId) {
      findAndMutateNode(flowTree, decisionId, (node) => {
        node.branches = node.branches.filter(b => b.id !== branchId);
      });
      renderEditor();
      renderCanvas();
    };

    // Excluir bloco de nó do fluxo
    window.deleteNode = function(nodeId) {
      removeNodeRecursive(flowTree, nodeId);
      renderEditor();
      renderCanvas();
    };

    // Ordenação: subir/descer bloco
    window.moveNode = function(nodeId, dir) {
      moveNodeRecursive(flowTree, nodeId, dir);
      renderEditor();
      renderCanvas();
    };

    // Limpar fluxo completo
    window.clearAllNodes = function() {
      if (confirm("Tem certeza que deseja apagar todos os blocos e começar do zero?")) {
        flowTree = [];
        renderEditor();
        renderCanvas();
      }
    };

    // Atualização de campos de digitação (Inputs)
    window.updateField = function(nodeId, field, value) {
      findAndMutateNode(flowTree, nodeId, (node) => {
        node[field] = value;
      });
      renderCanvas();
    };

    window.updateBranchLabel = function(decisionId, branchId, value) {
      findAndMutateNode(flowTree, decisionId, (node) => {
        const branch = node.branches.find(b => b.id === branchId);
        if (branch) branch.label = value;
      });
      renderCanvas();
    };

    // FÁBRICA DE OBJETOS: MODELOS DE CADA BLOCO
    function createNodeObject(type, customTitle) {
      const defaults = {
        start: { title: "Root", text: "Disparo ou gatilho de entrada do fluxo." },
        msg: { title: "Fraseologia", text: "Insira a mensagem que o robô irá enviar..." },
        decision: { title: "Decisão", text: "Qual critério divide este caminho?" },
        api: { title: "Integração API", text: "GET /api/v1/dados-usuario" },
        end: { title: "Fim do Bot", text: "O bot encerra o atendimento." },
        
        // Novos blocos adicionados
        data: { title: "Base Dados", text: "Tabela: contatos | Ação: Select" },
        function: { title: "Função", text: "formataData(usuario.criado_em)" },
        metadado: { title: "Metadado", text: "chave: canal_origem | valor: whatsapp" },
        menu: { title: "Item de Menu", text: "Opção [1] - Falar com Suporte" },
        forms: { title: "ColmeIA Forms", text: "Formulário: cadastro_estudante" },
        validation: { title: "Validação", text: "Critério: validaCPF(input_usuario)" },
        human: { title: "Atendimento Humano", text: "Fila: Atendimento Geral" },
        hub: { title: "Decision Hub", text: "Direciona tráfego com base em regras" },

        // Suporte ao botão dinâmico de Próxima Jornada
        journey: { title: "Próxima Jornada", text: "Ir para o outro trecho", url: "fluxo_vagas.html" }
      };

      const base = {
        id: 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        type: type === 'jorney' ? 'journey' : type,
        title: customTitle || defaults[type === 'jorney' ? 'journey' : type].title,
        text: defaults[type === 'jorney' ? 'journey' : type].text
      };

      if (base.type === 'journey') {
        base.url = defaults.journey.url;
      }

      // Inicializa caminhos padrão ao criar uma nova ramificação de decisão
      if (type === 'decision') {
        base.branches = [
          {
            id: 'b_' + Date.now() + '_1',
            label: 'Sim',
            children: [{ id: 'sub_' + Date.now() + '_1', type: 'msg', title: 'Fraseologia Sim', text: 'Opção aceita!' }]
          },
          {
            id: 'b_' + Date.now() + '_2',
            label: 'Não',
            children: [{ id: 'sub_' + Date.now() + '_2', type: 'end', title: 'Fim do Bot', text: 'Encerrado.' }]
          }
        ];
      }
      return base;
    }

    // MÉTODOS RECURSIVOS DE NAVEGAÇÃO DA ÁRVORE
    function findAndMutateNode(nodes, id, cb) {
      for (let n of nodes) {
        if (n.id === id) { cb(n); return true; }
        if (n.branches) {
          for (let b of n.branches) {
            if (findAndMutateNode(b.children || [], id, cb)) return true;
          }
        }
      }
      return false;
    }

    function findAndMutateBranch(nodes, branchId, cb) {
      for (let n of nodes) {
        if (n.branches) {
          for (let b of n.branches) {
            if (b.id === branchId) { cb(b); return true; }
            if (findAndMutateBranch(b.children || [], branchId, cb)) return true;
          }
        }
      }
      return false;
    }

    function removeNodeRecursive(nodes, id) {
      const idx = nodes.findIndex(n => n.id === id);
      if (idx !== -1) { nodes.splice(idx, 1); return true; }
      for (let n of nodes) {
        if (n.branches) {
          for (let b of n.branches) {
            if (removeNodeRecursive(b.children || [], id)) return true;
          }
        }
      }
      return false;
    }

    function moveNodeRecursive(nodes, id, dir) {
      const idx = nodes.findIndex(n => n.id === id);
      if (idx !== -1) {
        const target = idx + dir;
        if (target >= 0 && target < nodes.length) {
          const temp = nodes[idx];
          nodes[idx] = nodes[target];
          nodes[target] = temp;
          return true;
        }
      }
      for (let n of nodes) {
        if (n.branches) {
          for (let b of n.branches) {
            if (moveNodeRecursive(b.children || [], id, dir)) return true;
          }
        }
      }
      return false;
    }

    // CÓDIGO CORRIGIDO (Substitua a função acima por esta)
    function escapeHtml(str) {
    const newStr = (str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    return newStr.replace(/\n/g, '<br>');
    }


        // Baixa o HTML estático completo (Pronto para visualização externa)
    document.getElementById('save-html-btn').addEventListener('click', () => {
      if (!flowTree || flowTree.length === 0) {
        alert("Adicione pelo menos um bloco antes de baixar o arquivo HTML!");
        return;
      }

      const canvasHtml = flowchartCanvasEl.innerHTML;
      const staticHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐝</text></svg>">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Fluxograma ColmeIA Exportado</title>
  <style>
    :root{--canvas:#EEF2EC;--paper:#FFFFFF;--ink:#17251B;--soft:#55675A;--line:#B4C4B8;--green:#3C8C50;--deep:#27603A;--mint:#DEEFE1;--dark:#1E2B22;--sky-blue:#0284C7;--gibi-blue:#ECF8FF;--gibi-border:#1E2B22;--color-data:#7C3AED;--color-function:#06B6D4;--color-metadado:#0D9488;--color-menu:#00bbff;--color-forms:#D4A359;--color-validation:#22C55E;--color-human:#2c2a2aad;--color-hub:#6366F1;--node-max-width:380px}
    *{box-sizing:border-box}
    html{scroll-behavior:smooth}
    body{margin:0;background:var(--canvas);color:var(--ink);font-family:system-ui,-apple-system,sans-serif;padding:40px 20px}
    .wrap{max-width:1400px;margin:0 auto}
    .stage{display:flex;flex-direction:column;align-items:center}
    .link{width:0;border-left:2px solid var(--line);height:26px;position:relative;margin:0 auto}
    .link::after{content:"";position:absolute;left:-5px;bottom:-1px;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid var(--line)}
    .fork-group-wrapper{display:flex;flex-direction:column;align-items:center;width:100%}
    .fork{width:100%;display:flex;flex-direction:column;align-items:center}
    .fork .bar-h{height:0;border-top:2px solid var(--line);margin:0 auto}
    .fork .cols{display:flex;gap:34px;align-items:flex-start;justify-content:center;width:100%}
    .fork .cols>.col{flex:1 1 280px;min-width:280px;display:flex;flex-direction:column;align-items:center}
    .fork .cols>.col::before{content:"";width:0;border-left:2px solid var(--line);height:22px;position:relative;margin:0 auto}
    .tag{font-size:12.5px;color:var(--deep);background:var(--mint);border:1px solid rgba(39,96,58,.25);border-radius:999px;padding:3px 12px;margin:6px 0 0;text-align:center;white-space:nowrap}
    .node{width:100%;max-width:var(--node-max-width);border-radius:8px;padding:12px 16px;text-align:center;word-break:break-word;cursor:pointer}
    .node strong{display:block;font-size:14px;margin-bottom:4px}
    .node p{margin:0;font-size:13px;color:var(--soft)}
    .start{background:var(--sky-blue);color:#fff;border-radius:6px;max-width:320px}
    .start p{color:#E0F2FE}
    .end{background:var(--dark);color:#EAF1EB;border-radius:999px;max-width:260px}
    .msg{background:var(--gibi-blue);border:2px solid var(--gibi-border);border-radius:12px;text-align:left;position:relative;margin-left:10px;box-shadow:3px 3px 0px rgba(0,0,0,0.08)}
    .msg::before{content:"";position:absolute;bottom:12px;left:-10px;width:0;height:0;border-style:solid;border-width:8px 10px 8px 0;border-color:transparent var(--gibi-border) transparent transparent}
    .msg::after{content:"";position:absolute;bottom:12px;left:-8px;width:0;height:0;border-style:solid;border-width:8px 10px 8px 0;border-color:transparent var(--gibi-blue) transparent transparent}
    .msg strong,.msg p{color:var(--gibi-border)}
    .api{background:var(--deep);color:#F1F8F2;border-radius:6px;max-width:330px}
    .api .k{display:block;font-size:11px;color:#A8CDB2;font-weight:500;margin-bottom:3px}
    .api .t{font-weight:600}
    .decision{background:var(--paper);border:2px solid var(--green);padding:14px 28px;max-width:330px;clip-path:polygon(20px 0,calc(100% - 20px) 0,100% 50%,calc(100% - 20px) 100%,20px 100%,0 50%)}
    
    /* Botão de Salto Estilizado */
    .jump{display:block;text-decoration:none;border:1.5px solid var(--deep);background:var(--mint);color:var(--deep);border-radius:999px;padding:8px 18px;font-size:13px;font-weight:600;text-align:center;max-width:320px;transition:all 0.15s ease;cursor:pointer}
    .jump:hover{background:var(--deep);color:#fff}
    .jump strong{display:block;font-size:13.5px}
    .jump span{font-size:11.5px;font-weight:normal;opacity:0.9}

    .data{background:var(--paper);border:2px solid var(--color-data);color:var(--ink);height:80px;border-radius:50px/18px;position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:16px 15px 10px}
    .data::before{content:"";position:absolute;top:-1px;left:-2px;right:-2px;height:18px;background-color:#F5F3FF;border:2px solid var(--color-data);border-radius:50%;z-index:2}
    .data::after{content:"";position:absolute;top:18px;left:-2px;right:-2px;height:18px;border-bottom:2px solid var(--color-data);border-radius:50%}
    .data strong{color:var(--color-data);z-index:3;margin-top:8px}
    .data p{z-index:3}
    .function{background:#ECFEFF;border:2px solid var(--color-function);color:var(--ink);padding:16px 20px;max-width:300px;clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)}
    .function strong{color:var(--color-function)}
    .metadado{background:#F0FDFA;border:1px solid var(--color-metadado);border-left:5px solid var(--color-metadado);border-radius:4px;text-align:left;max-width:280px}
    .metadado strong{color:var(--color-metadado)}
    .menu{background:var(--paper);border:1px solid var(--line);border-left:4px solid var(--color-menu);border-radius:8px;text-align:left}
    .menu strong{color:var(--color-menu)}
    .forms{background:#FFFDF5;border:2px dashed var(--color-forms);border-radius:8px;color:var(--ink)}
    .forms strong{color:#8a5710}
    .validation{background:#F0FDF4;border:2px solid var(--color-validation);color:var(--ink);padding:24px 24px;max-width:280px;clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%)}
    .validation strong{color:var(--color-validation)}
    .human{background:linear-gradient(135deg,#FFF1F2 0%,#4b4a4b0f 100%);border:2px solid var(--color-human);border-radius:12px;width:180px;height:180px;display:flex;flex-direction:column;justify-content:center;align-items:center;padding:15px;margin:0 auto}
    .human strong{color:var(--color-human);font-size:13px}
    .human p{font-size:11px}
    .hub{background:#EEF2FF;border:2px solid var(--color-hub);color:var(--ink);border-radius:6px;max-width:320px}
    .hub strong{color:var(--color-hub)}

    /* Animação e classe de evidência para o Canvas exportado */
    @keyframes glow-attention {
      0% {
        transform: scale(1);
        filter: drop-shadow(0 0 0px rgba(60, 140, 80, 0));
      }
      50% {
        transform: scale(1.05);
        filter: drop-shadow(0 0 14px var(--green)) drop-shadow(0 0 5px var(--green));
      }
      100% {
        transform: scale(1);
        filter: drop-shadow(0 0 0px rgba(60, 140, 80, 0));
      }
    }

    .node-highlight-glow {
      animation: glow-attention 1.2s ease-in-out 2;
      z-index: 9999 !important;
      position: relative;
    }

    @media(max-width:860px){.fork .bar-h{display:none}.fork .cols{flex-direction:column;align-items:center}.fork .cols>.col{width:100%}}
  </style>
</head>
<body>
  <div class="wrap">
    <div class="stage">
      ${canvasHtml}
    </div>
  </div>

  <script>
    function triggerGlow(element) {
      if (!element) return;
      element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      element.classList.remove('node-highlight-glow');
      void element.offsetWidth; // Força reinício da animação
      element.classList.add('node-highlight-glow');
      setTimeout(() => {
        element.classList.remove('node-highlight-glow');
      }, 2400);
    }

    // Clique em botão "Próxima Jornada" (saltos internos com #ID)
    document.querySelectorAll('.jump').forEach(link => {
      link.addEventListener('click', (e) => {
        const href = (link.getAttribute('href') || '').trim();
        if (href.startsWith('#')) {
          e.preventDefault();
          const targetId = href.replace(/^#/, '');
          const targetEl = document.querySelector(\`[data-node-id="\${targetId}"]\`);
          if (targetEl) {
            triggerGlow(targetEl);
          }
        }
      });
    });

    // Clique em nós do fluxograma para ativá-los diretamente
    document.querySelectorAll('.node').forEach(node => {
      node.addEventListener('click', () => triggerGlow(node));
    });
  <\/script>
</body>
</html>`;

      const blob = new Blob([staticHtml], { type: 'text/html' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'meu-fluxograma-colmeia.html';
      a.click();
    });

    // Baixa o JSON de Rascunho
    document.getElementById('export-json-btn').addEventListener('click', () => {
      const dataStr = JSON.stringify(flowTree, null, 2);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([dataStr], { type: 'application/json' }));
      a.download = 'colmeia-draft.json';
      a.click();
    });

    // Importa o JSON de Rascunho de volta para a tela
    document.getElementById('import-btn').addEventListener('click', () => {
      document.getElementById('import-file').click();
    });

    document.getElementById('import-file').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          flowTree = JSON.parse(evt.target.result);
          init();
        } catch (err) {
          alert("Erro: Arquivo JSON de rascunho inválido.");
        }
      };
      reader.readAsText(file);
    });

    // Aciona impressão e exportação nativa em PDF
    document.getElementById('print-btn').addEventListener('click', () => {
      window.print();
    });

    // Cria um novo arquivo HTML autônomo com o editor zerado
    async function createNewHtmlFile() {
    let fileName = prompt("Qual o nome do novo arquivo HTML?", "fluxo_secundario");
    if (!fileName) return;

    fileName = fileName.trim();
    if (!fileName.endsWith('.html')) {
        fileName += '.html';
    }

    // Define o título visual e limpa a estrutura inicial para o novo arquivo
    const cleanTitle = fileName.replace('.html', '').replace(/[_-]/g, ' ').toUpperCase();
    const initialSeed = `[
        {
            "id": "node_1",
            "type": "start",
            "title": "Início: ${cleanTitle}",
            "text": "Subfluxo independente iniciado."
        }
        ]`;

    // Clona o HTML atual e substitui o fluxo salvo pelo fluxo zerado
    let editorHtml = document.documentElement.outerHTML;
    editorHtml = editorHtml.replace(
        /let flowTree = JSON\.parse\(localStorage\.getItem\('colmeia_flow_save'\)\) \|\| \[[\s\S]*?\];/m,
        `let flowTree = ${initialSeed};`
    );

    const fullHtmlDocument = `<!DOCTYPE html>\n` + editorHtml;

    //  Tenta salvar na pasta via diálogo nativo do sistema operacional 
    if (window.showSaveFilePicker) {
        try {
        const handle = await window.showSaveFilePicker({
            suggestedName: fileName,
            types: [{
            description: 'Arquivo HTML',
            accept: { 'text/html': ['.html'] }
            }]
        });
        const writable = await handle.createWritable();
        await writable.write(fullHtmlDocument);
        await writable.close();
        alert(`✅ Arquivo "${fileName}" criado com sucesso!\nVocê já pode referenciá-lo no botão de Próxima Jornada.`);
        return;
        } catch (err) {
        if (err.name === 'AbortError') return; // Cancelado pelo usuário
        }
    }

    // Fallback clássico: download direto do arquivo
    const blob = new Blob([fullHtmlDocument], { type: 'text/html;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
    }


    // Inicializa a aplicação
    init();