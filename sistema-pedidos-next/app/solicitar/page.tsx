'use client';

import type { ChangeEvent, FormEvent } from 'react';
import { useEffect, useRef, useState } from 'react';
import { authFetch } from '@/lib/authFetch';
import { importarItensDoPdf } from '@/lib/pdfImportService';
import { emptyItem, mapPdfItensToPedido } from '@/lib/pedidoUtils';
import type { PedidoItemInput, Prioridade } from '@/lib/types';

type FormState = {
  area_setor: string;
  loja_unidade: string;
  tipo_pedido: string;
  descricao_detalhada: string;
  justificativa: string;
  prioridade: Prioridade;
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
    area_setor: '',
    loja_unidade: '',
    tipo_pedido: '',
    descricao_detalhada: '',
    justificativa: '',
    prioridade: 'MEDIA',
    fornecedor_nome: '',
    fornecedor_cnpj: '',
    fornecedor_email: ''
  });

  const fileInput = useRef<HTMLInputElement>(null);

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

  function buildPayload(includeItems: boolean) {
    const payload: any = {
      ...form,
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
    if (pedidoId) return pedidoId;
    const res = await authFetch('/api/pedidos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildPayload(false))
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Erro ao criar pedido');
    setPedidoId(json.id);
    return json.id as string;
  }

  async function onSelectPdf(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setStatus(null);
    try {
      const id = await ensurePedidoCriado();
      const result = await importarItensDoPdf(id, file);
      if (result.itens?.length) {
        setItens(mapPdfItensToPedido(result.itens));
      }
      if (result.fornecedor) {
        updateForm('fornecedor_nome', result.fornecedor.nome || form.fornecedor_nome);
        updateForm('fornecedor_cnpj', result.fornecedor.cnpj || form.fornecedor_cnpj);
        updateForm('fornecedor_email', result.fornecedor.email || form.fornecedor_email);
      }
      setStatus('Itens importados do PDF.');
    } catch (error: any) {
      setStatus(error.message || 'Erro ao importar PDF');
    } finally {
      setImporting(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  return (
    <div>
      <h1>Solicitar Pedido</h1>
      {profile && <p>Solicitante: {profile.nome} ({profile.email})</p>}
      <form onSubmit={handleSalvar}>
        <section>
          <h3>Dados do Pedido</h3>
          <label>Área / Setor</label>
          <input value={form.area_setor} onChange={(e) => updateForm('area_setor', e.target.value)} required />
          <label>Loja / Unidade</label>
          <input value={form.loja_unidade} onChange={(e) => updateForm('loja_unidade', e.target.value)} required />
          <label>Tipo de pedido</label>
          <select value={form.tipo_pedido} onChange={(e) => updateForm('tipo_pedido', e.target.value)} required>
            <option value="">Selecione</option>
            <option value="REQUISICAO">Requisição</option>
            <option value="FATURADO">Faturado</option>
            <option value="COTACAO">Cotação</option>
          </select>
          <label>Descrição detalhada</label>
          <textarea value={form.descricao_detalhada} onChange={(e) => updateForm('descricao_detalhada', e.target.value)} required />
          <label>Justificativa</label>
          <textarea value={form.justificativa} onChange={(e) => updateForm('justificativa', e.target.value)} required />
          <label>Prioridade</label>
          <select value={form.prioridade} onChange={(e) => updateForm('prioridade', e.target.value as Prioridade)} required>
            <option value="BAIXA">Baixa</option>
            <option value="MEDIA">Média</option>
            <option value="ALTA">Alta</option>
            <option value="URGENTE">Urgente</option>
          </select>
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
            </div>
          </div>
          <input ref={fileInput} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={onSelectPdf} />
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
                  <input value={item.unidade} onChange={(e) => updateItem(idx, 'unidade', e.target.value)} />
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
