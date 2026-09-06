/**
 * Dashboard Page with Empty State and Creation Flow
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import Modal from '../components/Modal';
import { factoryAPI, plantAPI, machineAPI } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Factory creation state
  const [showFactoryModal, setShowFactoryModal] = useState(false);
  const [factoryForm, setFactoryForm] = useState({
    name: '',
    location: '',
    industry: '',
  });
  const [factoryError, setFactoryError] = useState('');
  const [creatingFactory, setCreatingFactory] = useState(false);
  
  // Plant creation state
  const [showPlantModal, setShowPlantModal] = useState(false);
  const [plantForm, setPlantForm] = useState({
    name: '',
    plantType: '',
    location: '',
    capacity: '',
  });
  const [plantError, setPlantError] = useState('');
  const [creatingPlant, setCreatingPlant] = useState(false);
  const [factories, setFactories] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [factoriesRes, plantsRes, machinesRes] = await Promise.all([
        factoryAPI.getAll(),
        plantAPI.getAll(),
        machineAPI.getAll(),
      ]);

      const factoriesData = factoriesRes.data.factories || [];
      const plants = plantsRes.data.plants || [];
      const machines = machinesRes.data.machines || [];

      setFactories(factoriesData);

      // Calculate statistics
      const machinesByStatus = machines.reduce((acc, machine) => {
        const status = machine.status || 'UNKNOWN';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      }, {});

      setStats({
        totalFactories: factoriesData.length,
        totalPlants: plants.length,
        totalMachines: machines.length,
        machinesByStatus,
        recentMachines: machines.slice(0, 5),
        isEmpty: plants.length === 0,
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleCreateFactory = async (e) => {
    e.preventDefault();
    setCreatingFactory(true);
    setFactoryError('');

    try {
      const response = await factoryAPI.create(factoryForm);
      setShowFactoryModal(false);
      setFactoryForm({ name: '', location: '', industry: '' });
      
      // Refresh dashboard
      await fetchDashboardData();
      
      // Show plant creation modal with the new factory
      setSelectedFactory(response.data.factory);
      setShowPlantModal(true);
    } catch (err) {
      setFactoryError(err.response?.data?.message || 'Failed to create factory');
    } finally {
      setCreatingFactory(false);
    }
  };

  const handleCreatePlant = async (e) => {
    e.preventDefault();
    setCreatingPlant(true);
    setPlantError('');

    try {
      // If no factory selected, use the first one or create new
      let factoryId = selectedFactory?._id;
      
      if (!factoryId && factories.length > 0) {
        factoryId = factories[0]._id;
      }
      
      if (!factoryId) {
        setPlantError('Please create a factory first');
        setCreatingPlant(false);
        return;
      }

      await plantAPI.create({
        ...plantForm,
        factoryId,
        capacity: plantForm.capacity ? parseInt(plantForm.capacity) : undefined,
      });
      
      setShowPlantModal(false);
      setPlantForm({ name: '', plantType: '', location: '', capacity: '' });
      setSelectedFactory(null);
      
      // Refresh dashboard
      await fetchDashboardData();
      
      // Navigate to plants page
      navigate('/plants');
    } catch (err) {
      setPlantError(err.response?.data?.message || 'Failed to create plant');
    } finally {
      setCreatingPlant(false);
    }
  };

  const startOnboarding = () => {
    // Check if factory exists
    if (factories.length === 0) {
      setShowFactoryModal(true);
    } else {
      setSelectedFactory(factories[0]);
      setShowPlantModal(true);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Navbar />
      
      <div style={{ padding: '2rem' }}>
        <h1 style={{ marginBottom: '2rem', color: '#2c3e50' }}>Dashboard</h1>

        {loading && <Loading message="Loading dashboard..." />}
        
        {error && <ErrorMessage message={error} onRetry={fetchDashboardData} />}

        {stats && !loading && (
          <>
            {stats.isEmpty ? (
              <EmptyState
                icon="🏭"
                title="Welcome to PlantGuard AI"
                message="Get started by creating your first industrial plant. You'll be able to add machines and monitor their health, detect anomalies, and run what-if simulations."
                actionLabel="Get Started"
                onAction={startOnboarding}
              />
            ) : (
              <>
                {/* Statistics Cards */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '1.5rem',
                    marginBottom: '2rem',
                  }}
                >
                  <Card>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#3498db' }}>
                        {stats.totalFactories}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#7f8c8d' }}>Factories</div>
                    </div>
                  </Card>

                  <Card>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#27ae60' }}>
                        {stats.totalPlants}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#7f8c8d' }}>Plants</div>
                    </div>
                  </Card>

                  <Card>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '3rem', fontWeight: 'bold', color: '#e67e22' }}>
                        {stats.totalMachines}
                      </div>
                      <div style={{ fontSize: '1rem', color: '#7f8c8d' }}>Machines</div>
                    </div>
                  </Card>
                </div>

                {/* Machine Status Distribution */}
                <div style={{ marginBottom: '2rem' }}>
                  <Card title="Machine Status Distribution">
                    {Object.keys(stats.machinesByStatus).length > 0 ? (
                      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
                        {Object.entries(stats.machinesByStatus).map(([status, count]) => (
                          <div key={status}>
                            <StatusBadge status={status} />
                            <span style={{ marginLeft: '0.5rem', fontWeight: 'bold' }}>
                              {count}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p style={{ color: '#7f8c8d' }}>No machines found</p>
                    )}
                  </Card>
                </div>

                {/* Recent Machines */}
                <Card title="Recent Machines" actions={
                  <Link to="/machines" style={{ color: '#3498db', textDecoration: 'none' }}>
                    View All →
                  </Link>
                }>
                  {stats.recentMachines.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {stats.recentMachines.map((machine) => (
                        <div
                          key={machine._id}
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '1rem',
                            backgroundColor: '#f8f9fa',
                            borderRadius: '4px',
                          }}
                        >
                          <div>
                            <Link
                              to={`/machines/${machine._id}`}
                              style={{
                                fontWeight: '600',
                                color: '#2c3e50',
                                textDecoration: 'none',
                              }}
                            >
                              {machine.name}
                            </Link>
                            <div style={{ fontSize: '0.875rem', color: '#7f8c8d' }}>
                              {machine.type} • ID: {machine.machineId}
                            </div>
                          </div>
                          <StatusBadge status={machine.status} />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#7f8c8d' }}>No machines found</p>
                  )}
                </Card>
              </>
            )}
          </>
        )}
      </div>

      {/* Factory Creation Modal */}
      <Modal
        isOpen={showFactoryModal}
        onClose={() => setShowFactoryModal(false)}
        title="Create Factory"
      >
        <form onSubmit={handleCreateFactory}>
          {factoryError && <ErrorMessage message={factoryError} />}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Factory Name *
            </label>
            <input
              type="text"
              value={factoryForm.name}
              onChange={(e) => setFactoryForm({ ...factoryForm, name: e.target.value })}
              required
              placeholder="e.g., Manufacturing Plant 1"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Location *
            </label>
            <input
              type="text"
              value={factoryForm.location}
              onChange={(e) => setFactoryForm({ ...factoryForm, location: e.target.value })}
              required
              placeholder="e.g., San Francisco, CA"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Industry *
            </label>
            <input
              type="text"
              value={factoryForm.industry}
              onChange={(e) => setFactoryForm({ ...factoryForm, industry: e.target.value })}
              required
              placeholder="e.g., Automotive, Electronics"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowFactoryModal(false)}
              disabled={creatingFactory}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#7f8c8d',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: creatingFactory ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingFactory}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: creatingFactory ? '#95a5a6' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: creatingFactory ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              {creatingFactory ? 'Creating...' : 'Create Factory'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Plant Creation Modal */}
      <Modal
        isOpen={showPlantModal}
        onClose={() => setShowPlantModal(false)}
        title="Create Industrial Plant"
      >
        <form onSubmit={handleCreatePlant}>
          {plantError && <ErrorMessage message={plantError} />}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Plant Name *
            </label>
            <input
              type="text"
              value={plantForm.name}
              onChange={(e) => setPlantForm({ ...plantForm, name: e.target.value })}
              required
              placeholder="e.g., Assembly Plant A"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Plant Type *
            </label>
            <select
              value={plantForm.plantType}
              onChange={(e) => setPlantForm({ ...plantForm, plantType: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            >
              <option value="">Select type...</option>
              <option value="ASSEMBLY">Assembly</option>
              <option value="MANUFACTURING">Manufacturing</option>
              <option value="PROCESSING">Processing</option>
              <option value="PACKAGING">Packaging</option>
              <option value="TESTING">Testing</option>
            </select>
          </div>

          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Location *
            </label>
            <input
              type="text"
              value={plantForm.location}
              onChange={(e) => setPlantForm({ ...plantForm, location: e.target.value })}
              required
              placeholder="e.g., Building 3, Floor 2"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Capacity (optional)
            </label>
            <input
              type="number"
              value={plantForm.capacity}
              onChange={(e) => setPlantForm({ ...plantForm, capacity: e.target.value })}
              placeholder="e.g., 1000"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '1px solid #ddd',
                borderRadius: '4px',
                fontSize: '1rem',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setShowPlantModal(false)}
              disabled={creatingPlant}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#7f8c8d',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: creatingPlant ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingPlant}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: creatingPlant ? '#95a5a6' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: creatingPlant ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              {creatingPlant ? 'Creating...' : 'Create Plant'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Dashboard;
