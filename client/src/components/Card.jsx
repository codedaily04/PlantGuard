/**
 * Card Component
 */

const Card = ({ children, title, actions, style = {} }) => {
  return (
    <div
      style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        overflow: 'hidden',
        ...style,
      }}
    >
      {title && (
        <div
          style={{
            padding: '1rem 1.5rem',
            borderBottom: '1px solid #e0e0e0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
            {title}
          </h3>
          {actions && <div>{actions}</div>}
        </div>
      )}
      <div style={{ padding: '1.5rem' }}>{children}</div>
    </div>
  );
};

export default Card;
