'use client';

import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/authFetch';

type Filtros = {
  status: string;
  dataInicio: string;
  dataFim: string;
  loja: string;
  fornecedorId: string;
  page?: number;
};

export default function PainelPage() {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [selecionado, setSelecionado] = useState<any | null>(null);
  const [loadingLista, setLoadingLista] = useState(false);
  const [loadingDetalhe, setLoadingDetalhe] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ status: '', dataInicio: '', dataFim: '', loja: '', fornecedorId: '' });
  const [paginacao, setPaginacao] = useState<{
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null>(null);

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function carregar() {
    setLoadingLista(true);
    setMensagem(null);
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => v && params.append(k, v));
    try {
      const res = await authFetch(`/api/pedidos?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao listar');

      // ✅ CORRIGIDO: API retorna { data: [], pagination: {} }
      // Aceitar ambos formatos para compatibilidade
      const pedidosArray = Array.isArray(json) ? json : (json.data || []);
      setPedidos(pedidosArray);

      // ✅ Guardar metadados de paginação
      if (json.pagination) {
        setPaginacao(json.pagination);
      }

      if (selecionado && pedidosArray.every((p: any) => p.id !== selecionado.id)) {
        setSelecionado(null);
      }
    } catch (error: any) {
      setMensagem(error.message || 'Erro ao carregar pedidos');
    } finally {
      setLoadingLista(false);
    }
  }

  async function abrirPedido(id: string) {
    setLoadingDetalhe(true);
    setMensagem(null);
    try {
      const res = await authFetch(`/api/pedidos/${id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao carregar pedido');
      setSelecionado(data);
    } catch (error: any) {
      setMensagem(error.message || 'Erro ao carregar detalhes');
    } finally {
      setLoadingDetalhe(false);
    }
  }

  async function aprovar(id: string) {
    const res = await authFetch(`/api/pedidos/${id}/aprovar`, { method: 'PATCH' });
    const data = await res.json();
    if (!res.ok) return setMensagem(data.error || 'Erro ao aprovar');
    setMensagem('Pedido aprovado.');
    await carregar();
    await abrirPedido(id);
  }

  async function recusar(id: string) {
    const justificativa = window.prompt('Justificativa da recusa:');
    if (!justificativa) return;
    const res = await authFetch(`/api/pedidos/${id}/recusar`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ justificativa_recusa: justificativa })
    });
    const data = await res.json();
    if (!res.ok) return setMensagem(data.error || 'Erro ao recusar');
    setMensagem('Pedido recusado.');
    await carregar();
    await abrirPedido(id);
  }

  function filtroInput(label: string, field: keyof Filtros, type = 'text') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <label>{label}</label>
        <input
          type={type}
          value={(filtros as any)[field]}
          onChange={(e) => setFiltros((prev) => ({ ...prev, [field]: e.target.value }))}
          placeholder={label}
          style={{ minWidth: 120 }}
        />
      </div>
    );
  }

  return (
    <div>
      <h1>Painel de Controle / Aprovação</h1>
      <section>
        <h3>Filtros</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label>Status</label>
            <select value={filtros.status} onChange={(e) => setFiltros((prev) => ({ ...prev, status: e.target.value }))}>
              <option value="">Todos</option>
              <option value="PENDENTE_APROVACAO">Pendente</option>
              <option value="APROVADO">Aprovado</option>
              <option value="RECUSADO">Recusado</option>
            </select>
          </div>
          {filtroInput('Data início', 'dataInicio', 'date')}
          {filtroInput('Data fim', 'dataFim', 'date')}
          {filtroInput('Loja', 'loja')}
          {filtroInput('Fornecedor ID', 'fornecedorId')}
          <button type="button" onClick={carregar} disabled={loadingLista}>
            {loadingLista ? 'Filtrando...' : 'Aplicar filtros'}
          </button>
        </div>

        {/* ✅ UI de Paginação */}
        {paginacao && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, padding: '8px 0', borderTop: '1px solid #ddd' }}>
            <button
              type="button"
              onClick={() => {
                const newPage = paginacao.page - 1;
                setFiltros(prev => ({ ...prev, page: newPage } as any));
                setTimeout(carregar, 100);
              }}
              disabled={paginacao.page <= 1 || loadingLista}
              style={{ padding: '4px 12px' }}
            >
              ← Anterior
            </button>
            <span style={{ padding: '0 12px', fontSize: '14px' }}>
              Página <strong>{paginacao.page}</strong> de <strong>{paginacao.totalPages}</strong> ({paginacao.total} pedidos)
            </span>
            <button
              type="button"
              onClick={() => {
                const newPage = paginacao.page + 1;
                setFiltros(prev => ({ ...prev, page: newPage } as any));
                setTimeout(carregar, 100);
              }}
              disabled={!paginacao.hasMore || loadingLista}
              style={{ padding: '4px 12px' }}
            >
              Próxima →
            </button>
          </div>
        )}
      </section>

      {mensagem && <p style={{ marginTop: 8 }}>{mensagem}</p>}

      <section>
        <h3>Pedidos</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>Nome do colaborador</th>
              <th>ID</th>
              <th>Data</th>
              <th>Loja</th>
              <th>Tipo</th>
              <th>Fornecedor</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {pedidos.map((p) => (
              <tr key={p.id} style={{ cursor: 'pointer' }} onClick={() => abrirPedido(p.id)}>
                <td>{p.usuarios?.nome || p.solicitante_nome || '-'}</td>
                <td>{p.id}</td>
                <td>{p.data_criacao ? new Date(p.data_criacao).toLocaleDateString() : '-'}</td>
                <td>{p.loja_unidade}</td>
                <td>{p.tipo_pedido}</td>
                <td>{p.fornecedores?.nome_canonico || p.fornecedor_nome_digitado || '-'}</td>
                <td>{p.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {selecionado && (
        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Detalhes do Pedido</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => aprovar(selecionado.id)} disabled={loadingDetalhe}>
                Aprovar
              </button>
              <button type="button" onClick={() => recusar(selecionado.id)} disabled={loadingDetalhe}>
                Recusar
              </button>
            </div>
          </div>
          {loadingDetalhe ? (
            <p>Carregando...</p>
          ) : (
            <>
              <p><strong>Colaborador:</strong> {selecionado.usuarios?.nome || selecionado.solicitante_nome || '-'}</p>
              <p><strong>ID do Pedido:</strong> {selecionado.id}</p>
              <p><strong>Loja / Unidade:</strong> {selecionado.loja_unidade}</p>
              <p><strong>Tipo:</strong> {selecionado.tipo_pedido}</p>
              <p><strong>Ordem de Serviço:</strong> {selecionado.descricao_detalhada}</p>
              <p><strong>Justificativa:</strong> {selecionado.justificativa}</p>
              <p><strong>Fornecedor:</strong> {selecionado.fornecedores?.nome_canonico || selecionado.fornecedor_nome_digitado || '-'}</p>
              <h4>Itens</h4>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th>Descrição</th><th>Qtd</th><th>Un</th><th>Preço estimado</th><th>Obs</th></tr></thead>
                <tbody>
                  {(selecionado.itens_pedido || []).map((i: any) => (
                    <tr key={i.id}>
                      <td>{i.descricao_item}</td>
                      <td>{i.quantidade}</td>
                      <td>{i.unidade}</td>
                      <td>{i.preco_unitario_estimado ?? '-'}</td>
                      <td>{i.observacao || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4>Anexos</h4>
              {(selecionado.arquivos_comprovantes || []).map((a: any) => (
                <div key={a.id}>
                  <span>{a.nome_arquivo_original}</span> — <span>{a.tipo_documento}</span>
                </div>
              ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}
