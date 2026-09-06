/**
 * Empty State Component
 */

const EmptyState = ({ title, message, actionLabel, onAction, icon = '📦' }) => {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '4rem 2rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      }}
    >
      <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>{icon}</div>
      <h2 style={{ margin: '0 0 1rem 0', color: '#2c3e50' }}>{title}</h2>
      <p style={{ color: '#7f8c8d', marginBottom: '2rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
        {message}
      </p>
      {onAction && actionLabel && (
        <button
          onClick={onAction}
          style={{
            padding: '0.75rem 2rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            fontSize: '1rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
