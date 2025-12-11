'use client';

import { useEffect, useState } from 'react';
import { InlineLoader } from '@/components/LoadingComponents';
import toast from 'react-hot-toast';

interface DashboardData {
  resumo: {
    total: number;
    pedidosRecentes: number;
    pedidosMes: number;
    taxaAprovacao: number;
  };
  porStatus: {
    PENDENTE_APROVACAO: number;
    APROVADO: number;
    RECUSADO: number;
  };
  porPrioridade: {
    BAIXA: number;
    MEDIA: number;
    ALTA: number;
    URGENTE: number;
  };
  topFornecedores: Array<{
    id: string;
    nome: string;
    count: number;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Erro ao carregar dashboard');
      const json = await res.json();
      setData(json);
    } catch (error) {
      console.error(error);
      toast.error('Erro ao carregar métricas do dashboard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1>📊 Dashboard</h1>
        <InlineLoader text="Carregando métricas..." />
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <h1>📊 Dashboard</h1>
        <div className="alert alert-error">
          Erro ao carregar dados do dashboard
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1>📊 Dashboard</h1>
        <button onClick={loadDashboard} className="secondary">
          🔄 Atualizar
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-2 grid-cols-3" style={{ marginBottom: 32 }}>
        <section>
          <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>Total de Pedidos</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#3b82f6' }}>{data.resumo.total}</p>
        </section>

        <section>
          <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>Últimos 7 dias</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#10b981' }}>{data.resumo.pedidosRecentes}</p>
        </section>

        <section>
          <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>Últimos 30 dias</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b' }}>{data.resumo.pedidosMes}</p>
        </section>

        <section>
          <h3 style={{ fontSize: 14, color: '#9ca3af', marginBottom: 8 }}>Taxa de Aprovação</h3>
          <p style={{ fontSize: 32, fontWeight: 700, color: '#8b5cf6' }}>{data.resumo.taxaAprovacao}%</p>
        </section>
      </div>

      {/* Pedidos por Status */}
      <section>
        <h2>Status dos Pedidos</h2>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Pendente</span>
              <span className="badge badge-pending">{data.porStatus.PENDENTE_APROVACAO}</span>
            </div>
            <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(data.porStatus.PENDENTE_APROVACAO / data.resumo.total) * 100}%`,
                  background: '#f59e0b',
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Aprovado</span>
              <span className="badge badge-approved">{data.porStatus.APROVADO}</span>
            </div>
            <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(data.porStatus.APROVADO / data.resumo.total) * 100}%`,
                  background: '#10b981',
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>

          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span>Recusado</span>
              <span className="badge badge-rejected">{data.porStatus.RECUSADO}</span>
            </div>
            <div style={{ height: 8, background: '#1f2937', borderRadius: 4, overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${(data.porStatus.RECUSADO / data.resumo.total) * 100}%`,
                  background: '#ef4444',
                  transition: 'width 0.3s'
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pedidos por Prioridade */}
      <section>
        <h2>Prioridade dos Pedidos</h2>
        <div className="grid grid-cols-2">
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>🟢 Baixa</span>
              <strong>{data.porPrioridade.BAIXA}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>🟡 Média</span>
              <strong>{data.porPrioridade.MEDIA}</strong>
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>🟠 Alta</span>
              <strong>{data.porPrioridade.ALTA}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0' }}>
              <span>🔴 Urgente</span>
              <strong>{data.porPrioridade.URGENTE}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Top Fornecedores */}
      <section>
        <h2>Top 5 Fornecedores</h2>
        {data.topFornecedores.length === 0 ? (
          <p style={{ color: '#9ca3af' }}>Nenhum fornecedor registrado ainda</p>
        ) : (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Fornecedor</th>
                  <th>Pedidos</th>
                </tr>
              </thead>
              <tbody>
                {data.topFornecedores.map((f, idx) => (
                  <tr key={f.id}>
                    <td>{idx + 1}</td>
                    <td>{f.nome}</td>
                    <td><strong>{f.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div style={{ marginTop: 24 }}>
        <button onClick={() => window.location.href = '/painel'}>
          ← Voltar para Painel
        </button>
      </div>
    </div>
  );
}
