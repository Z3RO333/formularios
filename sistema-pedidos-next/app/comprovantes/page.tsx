'use client';

import { useEffect, useState } from 'react';

export default function ComprovantesPage() {
  const [competencia, setCompetencia] = useState('');
  const [fornecedorId, setFornecedorId] = useState('');
  const [comprovantes, setComprovantes] = useState<any[]>([]);

  async function carregar() {
    const params = new URLSearchParams();
    if (competencia) params.append('competencia', competencia);
    if (fornecedorId) params.append('fornecedorId', fornecedorId);
    const res = await fetch(`/api/comprovantes?${params.toString()}`);
    const data = await res.json();
    setComprovantes(data || []);
  }

  useEffect(() => { carregar(); }, []);

  async function download(id: string) {
    const res = await fetch(`/api/comprovantes/${id}/download`);
    const data = await res.json();
    if (data.url) window.open(data.url, '_blank');
  }

  return (
    <div>
      <h1>Central de Comprovantes</h1>
      <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
        <input placeholder="Competência AAAA-MM" value={competencia} onChange={e => setCompetencia(e.target.value)} />
        <input placeholder="Fornecedor ID" value={fornecedorId} onChange={e => setFornecedorId(e.target.value)} />
        <button onClick={carregar}>Filtrar</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr><th>Pedido</th><th>Fornecedor</th><th>Tipo</th><th>Arquivo</th><th></th></tr></thead>
        <tbody>
          {comprovantes.map(c => (
            <tr key={c.id}>
              <td>{c.pedido_id}</td>
              <td>{c.fornecedor_id}</td>
              <td>{c.tipo_documento}</td>
              <td>{c.nome_arquivo_original}</td>
              <td><button onClick={() => download(c.id)}>Download</button></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
