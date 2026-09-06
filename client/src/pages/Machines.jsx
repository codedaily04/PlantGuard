/**
 * Machines Page with Empty State
 */

import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { machineAPI } from '../utils/api';

const Machines = () => {
  const navigate = useNavigate();
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchParams] = useSearchParams();
  const plantId = searchParams.get('plantId');

  const fetchMachines = async () => {
    setLoading(true);
    setError('');
    
    try {
      const response = await machineAPI.getAll();
      let allMachines = response.data.machines || [];
      
      // Filter by plantId if provided
      if (plantId) {
        allMachines = allMachines.filter(m => m.plantId === plantId);
      }
      
      setMachines(allMachines);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines();
  }, [plantId]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Navbar />
      
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#2c3e50' }}>
            Machines {plantId && '(Filtered by Plant)'}
          </h1>
          {plantId && (
            <Link
              to="/machines"
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#95a5a6',
                color: 'white',
                textDecoration: 'none',
                borderRadius: '4px',
              }}
            >
              Clear Filter
            </Link>
          )}
        </div>

        {loading && <Loading message="Loading machines..." />}
        
        {error && <ErrorMessage message={error} onRetry={fetchMachines} />}

        {!loading && !error && (
          <>
            {machines.length === 0 ? (
              <EmptyState
                icon="⚙️"
                title="No Machines Found"
                message={plantId 
                  ? "No machines found for this plant. Add machines from the Plants page."
                  : "You haven't added any machines yet. Machines are industrial equipment that operate within plants. Create a plant first, then add machines to monitor their health and performance."
                }
                actionLabel={plantId ? "Go to Plants" : "Go to Dashboard"}
                onAction={() => navigate(plantId ? '/plants' : '/dashboard')}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {machines.map((machine) => (
                  <Card key={machine._id}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#2c3e50' }}>
                        {machine.name}
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d' }}>
                        Type: {machine.type}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d' }}>
                        ID: {machine.machineId}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <StatusBadge status={machine.status} />
                      {machine.healthScore != null && (
                        <span style={{ marginLeft: '0.5rem', color: '#7f8c8d', fontSize: '0.875rem' }}>
                          Health: {machine.healthScore}/100
                        </span>
                      )}
                    </div>

                    {machine.installationDate && (
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '1rem' }}>
                        Installed: {new Date(machine.installationDate).toLocaleDateString()}
                      </div>
                    )}

                    <Link
                      to={`/machines/${machine._id}`}
                      style={{
                        display: 'inline-block',
                        padding: '0.5rem 1rem',
                        backgroundColor: '#3498db',
                        color: 'white',
                        textDecoration: 'none',
                        borderRadius: '4px',
                        fontSize: '0.875rem',
                      }}
                    >
                      View Details →
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Machines;
