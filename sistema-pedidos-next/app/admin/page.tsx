import Link from 'next/link';

const cards = [
  {
    title: 'Painel de Aprovação',
    description: 'Acompanhe e aprove/reprove pedidos com filtros.',
    href: '/painel'
  },
  {
    title: 'Dashboard',
    description: 'Métricas de pedidos, status e fornecedores frequentes.',
    href: '/dashboard'
  },
  {
    title: 'Solicitar Pedido',
    description: 'Criar novos pedidos com itens e importação de PDF.',
    href: '/solicitar'
  },
  {
    title: 'Comprovantes',
    description: 'Listar e baixar comprovantes enviados.',
    href: '/comprovantes'
  }
];

export default function AdminPage() {
  return (
    <div>
      <h1>Central Administrativa</h1>
      <p style={{ marginBottom: 24 }}>
        Acesse rapidamente as áreas principais do sistema.
      </p>
      <div className="admin-grid">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="admin-card">
            <h3>{card.title}</h3>
            <p>{card.description}</p>
            <span className="admin-card__cta">Ir para {card.title} →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
