// Camada de dados + integrações. Usa localStorage no modo "local" e API/PowerAutomate/N8N no modo "api".
// Inclui lógica de fornecedores com matching aproximado e mesclagem.
(function (window) {
  const PEDIDOS_KEY = 'pedidos:v2';
  const FORNEC_KEY = 'fornecedores:v2';

  function mapApiPath(path) {
    return `${window.APP_CONFIG.apiBaseUrl}${typeof path === 'function' ? path() : path}`;
  }

  // -------- Helpers de texto e similaridade --------
  function normalizeName(str = '') {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function levenshtein(a = '', b = '') {
    const m = a.length; const n = b.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;
    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + cost
        );
      }
    }
    return dp[m][n];
  }

  function similarity(a, b) {
    if (!a || !b) return 0;
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 0;
    return 1 - levenshtein(a, b) / maxLen;
  }

  // -------- Persistência Local --------
  function readLocal(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  }

  function writeLocal(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
    return data;
  }

  // -------- Adapters de pedidos --------
  const LocalPedidoAdapter = {
    async list() { return readLocal(PEDIDOS_KEY); },
    async saveAll(pedidos) { return writeLocal(PEDIDOS_KEY, pedidos); },
    async create(pedido) {
      const pedidos = await this.list();
      pedidos.push(pedido);
      await this.saveAll(pedidos);
      return pedido;
    },
    async updateStatus(id, payload) {
      const pedidos = await this.list();
      const idx = pedidos.findIndex(p => p.id === id);
      if (idx === -1) throw new Error('Pedido não encontrado');
      pedidos[idx] = { ...pedidos[idx], ...payload };
      await this.saveAll(pedidos);
      return pedidos[idx];
    }
  };

  const ApiPedidoAdapter = {
    async list(params = {}) {
      const query = new URLSearchParams(params).toString();
      const response = await fetch(`${mapApiPath(window.APP_CONFIG.apiPaths.pedidos)}${query ? '?' + query : ''}`);
      if (!response.ok) throw new Error(`Erro ao listar pedidos: ${response.status}`);
      return response.json();
    },
    async create(pedido) {
      const response = await fetch(mapApiPath(window.APP_CONFIG.apiPaths.pedidos), {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(pedido)
      });
      if (!response.ok) throw new Error(`Erro ao criar pedido: ${response.status}`);
      return response.json();
    },
    async updateStatus(id, payload, action) {
      const path = action === 'aprovar' ? window.APP_CONFIG.apiPaths.aprovacao(id) : window.APP_CONFIG.apiPaths.recusa(id);
      const response = await fetch(mapApiPath(path), {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      if (!response.ok) throw new Error(`Erro ao atualizar status: ${response.status}`);
      return response.json();
    }
  };

  const pedidoAdapter = window.APP_CONFIG.storageMode === 'api' ? ApiPedidoAdapter : LocalPedidoAdapter;

  // -------- Fornecedores (local) --------
  const FornecedorRepository = {
    async listAll() {
      const fornecedores = readLocal(FORNEC_KEY);
      return fornecedores;
    },
    async listAtivos() {
      const fornecedores = await this.listAll();
      return fornecedores.filter(f => !f.mesclado_em);
    },
    async saveAll(fornecedores) {
      return writeLocal(FORNEC_KEY, fornecedores);
    },
    async upsert(fornecedor) {
      const fornecedores = await this.listAll();
      const idx = fornecedores.findIndex(f => f.id_fornecedor === fornecedor.id_fornecedor);
      if (idx === -1) fornecedores.push(fornecedor); else fornecedores[idx] = fornecedor;
      await this.saveAll(fornecedores);
      return fornecedor;
    },
    async merge(primaryId, secondaryId) {
      const fornecedores = await this.listAll();
      const primary = fornecedores.find(f => f.id_fornecedor === primaryId);
      const secondary = fornecedores.find(f => f.id_fornecedor === secondaryId);
      if (!primary || !secondary) throw new Error('Fornecedor não encontrado');
      // Mescla apelidos
      const aliases = new Set([...(primary.apelidos_variantes || []), ...(secondary.apelidos_variantes || [])]);
      primary.apelidos_variantes = Array.from(aliases);
      secondary.mesclado_em = primaryId;
      await this.saveAll(fornecedores);
      // Reaponta pedidos locais
      const pedidos = await LocalPedidoAdapter.list();
      const atualizados = pedidos.map(p => p.id_fornecedor === secondaryId ? { ...p, id_fornecedor: primaryId, fornecedor_detectado: primary.nome_canonico } : p);
      await LocalPedidoAdapter.saveAll(atualizados);
      return { primary, secondary };
    }
  };

  const FornecedorService = {
    async resolve(nomeDigitado, cnpjDigitado) {
      if (window.APP_CONFIG.storageMode === 'api') {
        return { fornecedor: null, matched: false, created: false, motivo: 'delegue_para_api' };
      }
      const nomeOriginal = (nomeDigitado || '').trim();
      const cnpj = (cnpjDigitado || '').replace(/\D/g, '') || null;
      const nomeNorm = normalizeName(nomeOriginal);
      const fornecedores = await FornecedorRepository.listAtivos();
      const cfg = window.APP_CONFIG.matching || { similaridadeAceite: 0.85 };

      // 1) Match direto por CNPJ
      if (cnpj) {
        const byCnpj = fornecedores.find(f => f.cnpj === cnpj);
        if (byCnpj) {
          const atualizado = await this._registrarAlias(byCnpj, nomeOriginal);
          return { fornecedor: atualizado, matched: true, created: false, motivo: 'cnpj' };
        }
      }

      // 2) Similaridade por nome/apelidos
      let melhor = { score: 0, fornecedor: null };
      fornecedores.forEach(f => {
        const candidatos = [f.nome_canonico, ...(f.apelidos_variantes || [])];
        const scoreMax = Math.max(...candidatos.map(c => similarity(nomeNorm, normalizeName(c))));
        if (scoreMax > melhor.score) melhor = { score: scoreMax, fornecedor: f };
      });

      if (melhor.fornecedor && melhor.score >= cfg.similaridadeAceite) {
        const atualizado = await this._registrarAlias(melhor.fornecedor, nomeOriginal);
        return { fornecedor: atualizado, matched: true, created: false, motivo: 'fuzzy', score: melhor.score };
      }

      // 3) Não encontrou, cria
      if (!nomeNorm) return { fornecedor: null, matched: false, created: false };
      const novo = {
        id_fornecedor: `FORN-${Date.now()}`,
        nome_canonico: nomeOriginal,
        nome_canonico_normalizado: nomeNorm,
        cnpj,
        apelidos_variantes: nomeOriginal ? [nomeOriginal] : [],
        data_cadastro: new Date().toISOString()
      };
      await FornecedorRepository.upsert(novo);
      return { fornecedor: novo, matched: false, created: true };
    },

    async _registrarAlias(fornecedor, alias) {
      if (!alias) return fornecedor;
      fornecedor.apelidos_variantes = fornecedor.apelidos_variantes || [];
      if (!fornecedor.apelidos_variantes.includes(alias)) {
        fornecedor.apelidos_variantes.push(alias);
        await FornecedorRepository.upsert(fornecedor);
      }
      return fornecedor;
    },

    async suspeitos() {
      const cfg = window.APP_CONFIG.matching || { similaridadeSuspeita: 0.8 };
      const fornecedores = await FornecedorRepository.listAtivos();
      const pares = [];
      for (let i = 0; i < fornecedores.length; i++) {
        for (let j = i + 1; j < fornecedores.length; j++) {
          const a = fornecedores[i]; const b = fornecedores[j];
          const score = similarity(normalizeName(a.nome_canonico), normalizeName(b.nome_canonico));
          if (score >= (cfg.similaridadeSuspeita || 0.8)) {
            pares.push({ a, b, score });
          }
        }
      }
      return pares;
    },

    async merge(primaryId, secondaryId) {
      if (window.APP_CONFIG.storageMode === 'api') throw new Error('Mesclagem deve ser feita na API/backend');
      return FornecedorRepository.merge(primaryId, secondaryId);
    }
  };

  // -------- Pedidos --------
  const PedidoRepository = {
    async listar(filtros = {}) {
      if (window.APP_CONFIG.storageMode === 'api') {
        return pedidoAdapter.list(filtros);
      }
      const pedidos = await pedidoAdapter.list();
      return pedidos.filter((p) => {
        const byStatus = filtros.status ? p.status === filtros.status : true;
        const bySolicitante = filtros.solicitante ? p.solicitante?.nome?.toLowerCase().includes(filtros.solicitante.toLowerCase()) : true;
        const byArea = filtros.area ? p.area_setor === filtros.area : true;
        const byLoja = filtros.loja ? p.loja_unidade === filtros.loja : true;
        const byFornecedor = filtros.fornecedor ? p.id_fornecedor === filtros.fornecedor : true;
        const byTexto = filtros.busca
          ? [p.descricao_detalhada, p.justificativa, p.id, p.fornecedor_nome_digitado]
              .filter(Boolean)
              .some((t) => t.toLowerCase().includes(filtros.busca.toLowerCase()))
          : true;
        const byData = (() => {
          if (!filtros.dataInicial && !filtros.dataFinal) return true;
          const data = new Date(p.data_criacao);
          if (filtros.dataInicial && data < new Date(filtros.dataInicial)) return false;
          if (filtros.dataFinal) {
            const end = new Date(filtros.dataFinal);
            end.setHours(23, 59, 59, 999);
            if (data > end) return false;
          }
          return true;
        })();
        return byStatus && bySolicitante && byArea && byLoja && byFornecedor && byTexto && byData;
      });
    },

    async criar(pedido) {
      // Resolve fornecedor antes de persistir
      const resolucao = await FornecedorService.resolve(pedido.fornecedor_nome_digitado, pedido.fornecedor_cnpj);
      if (resolucao.fornecedor) {
        pedido.id_fornecedor = resolucao.fornecedor.id_fornecedor;
        pedido.fornecedor_detectado = resolucao.fornecedor.nome_canonico;
      }
      pedido.historicoStatus = pedido.historicoStatus || [];
      pedido.historicoStatus.push({
        status_antigo: null,
        status_novo: pedido.status,
        data_hora: pedido.data_criacao,
        usuario_responsavel: pedido.criado_por,
        observacao: 'Criado via formulário público'
      });
      return pedidoAdapter.create(pedido);
    },

    async atualizarStatus(id, statusPayload, action = 'aprovar') {
      return pedidoAdapter.updateStatus(id, statusPayload, action);
    },

    async obterPorId(id) {
      const pedidos = await this.listar();
      return pedidos.find((p) => p.id === id) || null;
    }
  };

  // -------- Notificações (N8N/Power Automate) --------
  const NotificacaoService = {
    async enviarEvento(tipo, payload) {
      const url = tipo === 'criado' ? window.APP_CONFIG.webhooks.onPedidoCriado : window.APP_CONFIG.webhooks.onStatusAlterado;
      if (!url || url.includes('seu-n8n')) return null; // evita erro em ambiente não configurado
      try {
        await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } catch (error) {
        console.warn('Falha ao enviar webhook:', error);
      }
    }
  };

  window.PedidoRepository = PedidoRepository;
  window.NotificacaoService = NotificacaoService;
  window.FornecedorService = FornecedorService;
  window.FornecedorRepository = FornecedorRepository;
})(window);
