/**
 * Status Badge Component
 */

const StatusBadge = ({ status }) => {
  const getStatusColor = (status) => {
    const normalized = status?.toUpperCase();
    switch (normalized) {
      case 'HEALTHY':
      case 'OPERATIONAL':
      case 'LOW':
        return { bg: '#d4edda', text: '#155724', border: '#c3e6cb' };
      case 'WARNING':
      case 'MODERATE':
        return { bg: '#fff3cd', text: '#856404', border: '#ffeaa7' };
      case 'CRITICAL':
      case 'HIGH':
        return { bg: '#f8d7da', text: '#721c24', border: '#f5c6cb' };
      case 'OFFLINE':
        return { bg: '#e2e3e5', text: '#383d41', border: '#d6d8db' };
      default:
        return { bg: '#e7f3ff', text: '#004085', border: '#b8daff' };
    }
  };

  const colors = getStatusColor(status);

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.75rem',
        fontSize: '0.875rem',
        fontWeight: '600',
        borderRadius: '12px',
        backgroundColor: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
      }}
    >
      {status || 'Unknown'}
    </span>
  );
};

export default StatusBadge;
