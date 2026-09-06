/**
 * Plants Page with Machine Creation
 */

import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Card from '../components/Card';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import EmptyState from '../components/EmptyState';
import { plantAPI, machineAPI, factoryAPI } from '../utils/api';

const Plants = () => {
  const navigate = useNavigate();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Machine creation state
  const [showMachineModal, setShowMachineModal] = useState(false);
  const [selectedPlant, setSelectedPlant] = useState(null);
  const [machineForm, setMachineForm] = useState({
    name: '',
    machineId: '',
    type: '',
    installationDate: '',
  });
  const [machineError, setMachineError] = useState('');
  const [creatingMachine, setCreatingMachine] = useState(false);
  const [factories, setFactories] = useState([]);

  const fetchPlants = async () => {
    setLoading(true);
    setError('');
    
    try {
      const [plantsRes, factoriesRes] = await Promise.all([
        plantAPI.getAll(),
        factoryAPI.getAll(),
      ]);
      setPlants(plantsRes.data.plants || []);
      setFactories(factoriesRes.data.factories || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load plants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlants();
  }, []);

  const handleAddMachine = (plant) => {
    setSelectedPlant(plant);
    setMachineForm({
      name: '',
      machineId: '',
      type: '',
      installationDate: '',
    });
    setMachineError('');
    setShowMachineModal(true);
  };

  const handleCreateMachine = async (e) => {
    e.preventDefault();
    setCreatingMachine(true);
    setMachineError('');

    try {
      if (!selectedPlant) {
        setMachineError('No plant selected');
        setCreatingMachine(false);
        return;
      }

      const machineData = {
        name: machineForm.name,
        machineId: machineForm.machineId,
        type: machineForm.type,
        plantId: selectedPlant._id,
        factoryId: selectedPlant.factoryId,
        status: 'OPERATIONAL',
        healthScore: 0,
      };

      if (machineForm.installationDate) {
        machineData.installationDate = machineForm.installationDate;
      }

      const response = await machineAPI.create(machineData);
      
      setShowMachineModal(false);
      setSelectedPlant(null);
      setMachineForm({ name: '', machineId: '', type: '', installationDate: '' });
      
      // Navigate to machine detail page
      navigate(`/machines/${response.data.machine._id}`);
    } catch (err) {
      setMachineError(err.response?.data?.message || 'Failed to create machine');
    } finally {
      setCreatingMachine(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f6fa' }}>
      <Navbar />
      
      <div style={{ padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <h1 style={{ margin: 0, color: '#2c3e50' }}>Industrial Plants</h1>
        </div>

        {loading && <Loading message="Loading plants..." />}
        
        {error && <ErrorMessage message={error} onRetry={fetchPlants} />}

        {!loading && !error && (
          <>
            {plants.length === 0 ? (
              <EmptyState
                icon="🏭"
                title="No Plants Found"
                message="You haven't created any industrial plants yet. Plants are facilities within factories where machines operate. Create a plant from the Dashboard to get started."
                actionLabel="Go to Dashboard"
                onAction={() => navigate('/dashboard')}
              />
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                  gap: '1.5rem',
                }}
              >
                {plants.map((plant) => (
                  <Card key={plant._id}>
                    <div style={{ marginBottom: '1rem' }}>
                      <h3 style={{ margin: 0, marginBottom: '0.5rem', color: '#2c3e50' }}>
                        {plant.name}
                      </h3>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d' }}>
                        Type: {plant.plantType}
                      </div>
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <div style={{ fontSize: '0.875rem', color: '#7f8c8d', marginBottom: '0.25rem' }}>
                        📍 {plant.location}
                      </div>
                      {plant.capacity && (
                        <div style={{ fontSize: '0.875rem', color: '#7f8c8d' }}>
                          Capacity: {plant.capacity}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '1rem' }}>
                      <StatusBadge status={plant.status || plant.healthStatus} />
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Link
                        to={`/machines?plantId=${plant._id}`}
                        style={{
                          flex: 1,
                          textAlign: 'center',
                          padding: '0.5rem 1rem',
                          backgroundColor: '#3498db',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                        }}
                      >
                        View Machines
                      </Link>
                      <button
                        onClick={() => handleAddMachine(plant)}
                        style={{
                          flex: 1,
                          padding: '0.5rem 1rem',
                          backgroundColor: '#27ae60',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          fontSize: '0.875rem',
                          cursor: 'pointer',
                          fontWeight: '600',
                        }}
                      >
                        Add Machine
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* Machine Creation Modal */}
      <Modal
        isOpen={showMachineModal}
        onClose={() => setShowMachineModal(false)}
        title={`Add Machine to ${selectedPlant?.name}`}
      >
        <form onSubmit={handleCreateMachine}>
          {machineError && <ErrorMessage message={machineError} />}
          
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Machine Name *
            </label>
            <input
              type="text"
              value={machineForm.name}
              onChange={(e) => setMachineForm({ ...machineForm, name: e.target.value })}
              required
              placeholder="e.g., CNC Machine 01"
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
              Machine ID *
            </label>
            <input
              type="text"
              value={machineForm.machineId}
              onChange={(e) => setMachineForm({ ...machineForm, machineId: e.target.value })}
              required
              placeholder="e.g., MCH-001"
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
              Machine Type *
            </label>
            <select
              value={machineForm.type}
              onChange={(e) => setMachineForm({ ...machineForm, type: e.target.value })}
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
              <option value="CNC">CNC Machine</option>
              <option value="PRESS">Press</option>
              <option value="CONVEYOR">Conveyor</option>
              <option value="ROBOT">Robot</option>
              <option value="PUMP">Pump</option>
              <option value="COMPRESSOR">Compressor</option>
              <option value="MOTOR">Motor</option>
              <option value="TURBINE">Turbine</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '600' }}>
              Installation Date (optional)
            </label>
            <input
              type="date"
              value={machineForm.installationDate}
              onChange={(e) => setMachineForm({ ...machineForm, installationDate: e.target.value })}
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
              onClick={() => setShowMachineModal(false)}
              disabled={creatingMachine}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: 'white',
                color: '#7f8c8d',
                border: '1px solid #ddd',
                borderRadius: '4px',
                cursor: creatingMachine ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creatingMachine}
              style={{
                padding: '0.75rem 1.5rem',
                backgroundColor: creatingMachine ? '#95a5a6' : '#27ae60',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: creatingMachine ? 'not-allowed' : 'pointer',
                fontWeight: '600',
              }}
            >
              {creatingMachine ? 'Creating...' : 'Create Machine'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Plants;
