'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { authFetch } from '@/lib/authFetch';
import { importarItensDoPdf } from '@/lib/pdfImportService';
import { emptyItem, mergeItensPedido } from '@/lib/pedidoUtils';
import type { PedidoItemInput, Prioridade } from '@/lib/types';

type FormState = {
  area_setor: string;
  loja_unidade: string;
  tipo_pedido: string;
  descricao_detalhada: string;
  justificativa: string;
  prioridade: Prioridade;
  colaborador_nome: string;
  fornecedor_nome: string;
  fornecedor_cnpj: string;
  fornecedor_email: string;
};

export default function SolicitarPage() {
  const [status, setStatus] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [itens, setItens] = useState<PedidoItemInput[]>([emptyItem]);
  const [form, setForm] = useState<FormState>({
    area_setor: 'GERAL',
    loja_unidade: '',
    tipo_pedido: '',
    descricao_detalhada: '',
    justificativa: '',
    prioridade: 'MEDIA',
    colaborador_nome: '',
    fornecedor_nome: '',
    fornecedor_cnpj: '',
    fornecedor_email: ''
  });

  const fileInput = useRef<HTMLInputElement>(null);
  const unidadesMedida = [
    'UN',
    'KG',
    'G',
    'MG',
    'M',
    'CM',
    'MM',
    'M2',
    'M3',
    'L',
    'ML',
    'CX',
    'PC',
    'PCT',
    'PAR',
    'ROLO',
    'FD',
    'SC',
    'KIT'
  ];

  useEffect(() => {
    // Recupera perfil do usuário autenticado para exibir info no cabeçalho.
    authFetch('/api/me').then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setProfile(data.profile);
      }
    });
  }, []);

  function updateForm(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function updateItem(idx: number, field: keyof PedidoItemInput, value: any) {
    setItens((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  }

  function addItem() {
    setItens((prev) => [...prev, { ...emptyItem }]);
  }

  function removeItem(idx: number) {
    setItens((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSalvar(e?: FormEvent) {
    e?.preventDefault();
    setStatus(null);
    setSaving(true);
    try {
      const payload = buildPayload(true);
      const res = await authFetch(pedidoId ? `/api/pedidos/${pedidoId}` : '/api/pedidos', {
        method: pedidoId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erro ao salvar');
      setPedidoId(json.id || pedidoId);
      setStatus('Pedido salvo com sucesso.');
    } catch (error: any) {
      setStatus(error.message || 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  }

  function buildPayload(includeItems: boolean, withFallbacks = false) {
    const fallback = {
      area_setor: 'GERAL',
      loja_unidade: 'PENDENTE',
      tipo_pedido: 'IMPORTACAO',
      descricao_detalhada: 'Importacao via PDF',
      justificativa: 'Importacao de itens via PDF',
      colaborador_nome: 'Desconhecido'
    };

    const colaboradorNome = form.colaborador_nome.trim();
    const fornecedorNome = form.fornecedor_nome.trim();
    const fornecedorCnpj = form.fornecedor_cnpj.trim();
    const fornecedorEmail = form.fornecedor_email.trim();

    const payload: any = {
      ...form,
      area_setor: withFallbacks && !form.area_setor ? fallback.area_setor : form.area_setor,
      loja_unidade: withFallbacks && !form.loja_unidade ? fallback.loja_unidade : form.loja_unidade,
      tipo_pedido: withFallbacks && !form.tipo_pedido ? fallback.tipo_pedido : form.tipo_pedido,
      descricao_detalhada: withFallbacks && !form.descricao_detalhada ? fallback.descricao_detalhada : form.descricao_detalhada,
      justificativa: withFallbacks && !form.justificativa ? fallback.justificativa : form.justificativa,
      colaborador_nome: colaboradorNome || (withFallbacks ? fallback.colaborador_nome : undefined),
      fornecedor_nome: fornecedorNome || undefined,
      fornecedor_cnpj: fornecedorCnpj || null,
      fornecedor_email: fornecedorEmail || null,
      prioridade: form.prioridade,
      itens: includeItems
        ? itens
            .filter((i) => i.descricao_item.trim())
            .map((i) => ({
              ...i,
              quantidade: Number(i.quantidade) || 0,
              preco_unitario_estimado: i.preco_unitario_estimado === null || i.preco_unitario_estimado === undefined ? null : Number(i.preco_unitario_estimado)
            }))
        : []
    };
    return payload;
  }

  async function ensurePedidoCriado() {
    // ✅ Se já tem ID real (não temporário), retornar
    if (pedidoId && !pedidoId.startsWith('temp-')) {
      return pedidoId;
    }

    try {
      // Tentar criar pedido com dados mínimos obrigatórios
      const payload = buildPayload(false, true); // com fallbacks

      const res = await authFetch('/api/pedidos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json();

      if (!res.ok) {
        // Mostrar erro específico ao usuário
        const errorMsg = json.error || 'Erro ao criar pedido';
        toast.error(`Preencha os campos obrigatórios: ${errorMsg}`);
        throw new Error(errorMsg);
      }

      setPedidoId(json.id);
      toast.success('Pedido criado com sucesso');
      return json.id as string;

    } catch (err: any) {
      // ❌ REMOVIDO: não criar ID temporário
      // ✅ NOVO: bloquear importação até preencher formulário
      setStatus(`Erro: ${err.message}. Preencha os campos obrigatórios antes de importar PDF.`);
      throw err; // Propagar erro para bloquear importação
    }
  }

  async function onSelectPdf(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus(null);
    try {
      const id = await ensurePedidoCriado();
      const result = await importarItensDoPdf(id, file);

      const itensImportados: PedidoItemInput[] = result.itens || [];
      const existeItens = itens.some((i) => i.descricao_item.trim());

      if (!itensImportados.length) {
        toast('Não encontrei itens no PDF');
      } else if (existeItens) {
        const substituir = window.confirm('Já existem itens no pedido.\nOK para substituir, Cancelar para mesclar.');
        if (substituir) {
          setItens(itensImportados);
        } else {
          setItens(mergeItensPedido(itens, itensImportados));
        }
      } else {
        setItens(itensImportados);
      }

      if (result.fornecedor) {
        updateForm('fornecedor_nome', result.fornecedor.nome || form.fornecedor_nome);
        updateForm('fornecedor_cnpj', result.fornecedor.cnpj || form.fornecedor_cnpj);
        updateForm('fornecedor_email', result.fornecedor.email || form.fornecedor_email);
      }

      if (result.loja_unidade && !form.loja_unidade) {
        updateForm('loja_unidade', result.loja_unidade);
      }

      setStatus(`Itens importados do PDF: ${itensImportados.length || 0} itens encontrados.`);
      toast.success('PDF importado. Itens preenchidos.');
    } catch (error: any) {
      console.error('❌ Erro ao importar PDF:', error);
      setStatus(error.message || 'Erro ao importar PDF');
      toast.error(error.message || 'Erro ao importar PDF');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function salvarItensImportados() {
    try {
      const id = await ensurePedidoCriado();
      const payload = buildPayload(true);
      const res = await authFetch(`/api/pedidos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar itens');
      toast.success('Itens importados salvos no pedido');
      setPedidoId(id);
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar itens');
    }
  }

  return (
    <div>
      <h1>Solicitar Pedido</h1>
      {profile && <p>Solicitante: {profile.nome} ({profile.email})</p>}
      <form onSubmit={handleSalvar}>
        <section>
          <h3>Dados do Pedido</h3>
          {/* Área/Setor fixo; retirado do formulário visível */}
          <label>Loja / Unidade</label>
          <input value={form.loja_unidade} onChange={(e) => updateForm('loja_unidade', e.target.value)} required />
          <label>Nome do colaborador</label>
          <input value={form.colaborador_nome} onChange={(e) => updateForm('colaborador_nome', e.target.value)} placeholder="Digite o nome do colaborador" />
          <label>Tipo de pedido</label>
          <select value={form.tipo_pedido} onChange={(e) => updateForm('tipo_pedido', e.target.value)} required>
            <option value="">Selecione</option>
            <option value="REQUISICAO">Requisição</option>
            <option value="FATURADO">Faturado</option>
            <option value="COTACAO">Cotação</option>
          </select>
          <label>Ordem de Serviço</label>
          <textarea value={form.descricao_detalhada} onChange={(e) => updateForm('descricao_detalhada', e.target.value)} />
          <label>Justificativa</label>
          <textarea value={form.justificativa} onChange={(e) => updateForm('justificativa', e.target.value)} required />
        </section>

        <section>
          <h3>Fornecedor (opcional)</h3>
          <label>Nome do fornecedor</label>
          <input value={form.fornecedor_nome} onChange={(e) => updateForm('fornecedor_nome', e.target.value)} placeholder="Nome conforme nota/orçamento" />
          <label>CNPJ</label>
          <input value={form.fornecedor_cnpj} onChange={(e) => updateForm('fornecedor_cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
          <label>E-mail do fornecedor</label>
          <input value={form.fornecedor_email} onChange={(e) => updateForm('fornecedor_email', e.target.value)} type="email" placeholder="contato@fornecedor.com" />
        </section>

        <section>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3>Itens do Pedido</h3>
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => fileInput.current?.click()} disabled={importing || saving}>
                {importing ? 'Importando...' : 'Importar itens do PDF'}
              </button>
              <button type="button" onClick={addItem} disabled={saving}>Adicionar item</button>
              <button type="button" onClick={salvarItensImportados} disabled={saving || importing || !itens.length}>
                Salvar itens importados
              </button>
            </div>
          </div>
          <input ref={fileInput} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onSelectPdf} />
          <datalist id="unidades-medida">
            {unidadesMedida.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          {itens.map((item, idx) => (
            <div key={idx} style={{ border: '1px solid #1f2937', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ flex: 2 }}>
                  <label>Material / Serviço</label>
                  <input value={item.descricao_item} onChange={(e) => updateItem(idx, 'descricao_item', e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Quantidade</label>
                  <input type="number" min={0} value={item.quantidade} onChange={(e) => updateItem(idx, 'quantidade', Number(e.target.value))} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Unidade</label>
                  <input
                    list="unidades-medida"
                    value={item.unidade}
                    onChange={(e) => updateItem(idx, 'unidade', e.target.value)}
                    placeholder="Selecione ou digite"
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <div style={{ flex: 1 }}>
                  <label>Fornecedor (item)</label>
                  <input value={item.fornecedor_item || ''} onChange={(e) => updateItem(idx, 'fornecedor_item', e.target.value)} />
                </div>
                <div style={{ flex: 1 }}>
                  <label>Preço unit. estimado</label>
                  <input
                    type="number"
                    min={0}
                    value={item.preco_unitario_estimado ?? ''}
                    onChange={(e) => updateItem(idx, 'preco_unitario_estimado', e.target.value === '' ? null : Number(e.target.value))}
                  />
                </div>
              </div>
              <label style={{ marginTop: 8 }}>Observação</label>
              <textarea value={item.observacao || ''} onChange={(e) => updateItem(idx, 'observacao', e.target.value)} />
              <div style={{ textAlign: 'right', marginTop: 8 }}>
                <button type="button" onClick={() => removeItem(idx)} disabled={itens.length === 1 || saving}>
                  Remover
                </button>
              </div>
            </div>
          ))}
        </section>

        <div style={{ display: 'flex', gap: 12 }}>
          <button type="submit" disabled={saving}>
            {saving ? 'Salvando...' : 'Salvar pedido'}
          </button>
          {pedidoId && <span>ID: {pedidoId}</span>}
        </div>
      </form>
      {status && <p style={{ marginTop: 12 }}>{status}</p>}
    </div>
  );
}
