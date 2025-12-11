export function Spinner({ size = 40 }: { size?: number }) {
  return (
    <div
      className="spinner"
      style={{
        width: size,
        height: size,
        borderWidth: Math.max(2, size / 13)
      }}
    />
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton skeleton-text" />
      ))}
    </div>
  );
}

export function SkeletonCard() {
  return <div className="skeleton skeleton-card" />;
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th><div className="skeleton" style={{ height: 16 }} /></th>
            <th><div className="skeleton" style={{ height: 16 }} /></th>
            <th><div className="skeleton" style={{ height: 16 }} /></th>
            <th><div className="skeleton" style={{ height: 16 }} /></th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <tr key={i}>
              <td><div className="skeleton" style={{ height: 16 }} /></td>
              <td><div className="skeleton" style={{ height: 16 }} /></td>
              <td><div className="skeleton" style={{ height: 16 }} /></td>
              <td><div className="skeleton" style={{ height: 16 }} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LoadingOverlay({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(11, 18, 33, 0.8)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <Spinner size={60} />
      <p style={{ marginTop: 16, color: '#e2e8f0' }}>{message}</p>
    </div>
  );
}

export function InlineLoader({ text = 'Carregando...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '20px 0' }}>
      <Spinner size={24} />
      <span>{text}</span>
    </div>
  );
}
