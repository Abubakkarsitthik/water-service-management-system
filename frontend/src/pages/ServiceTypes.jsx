import { useState, useEffect } from 'react';
import serviceTypeService from '../services/serviceTypeService';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Plus, Edit2, Trash2, Wrench } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', default_interval_days: 90, status: 'active' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await serviceTypeService.list({ limit: 50 });
      setServiceTypes(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await serviceTypeService.update(editing.id, formData);
        toast.success('Service type updated');
      } else {
        await serviceTypeService.create(formData);
        toast.success('Service type created');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this service type?')) return;
    try {
      await serviceTypeService.delete(id);
      toast.success('Deleted');
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error deleting');
    }
  };

  const handleEdit = (item) => {
    setEditing(item);
    setFormData({ name: item.name, description: item.description || '', default_interval_days: item.default_interval_days, status: item.status });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: '', description: '', default_interval_days: 90, status: 'active' });
  };

  const intervalLabel = (days) => {
    if (days >= 365) return `${Math.floor(days / 365)} year${days >= 730 ? 's' : ''}`;
    if (days >= 30) return `${Math.floor(days / 30)} month${days >= 60 ? 's' : ''}`;
    return `${days} days`;
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Service Types</h1>
          <p className="text-surface-500 text-sm mt-1">Manage your service categories</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Service Type
        </button>
      </div>

      {loading ? (
        <LoadingSkeleton type="card" count={6} />
      ) : serviceTypes.length === 0 ? (
        <EmptyState title="No service types" description="Create your first service category" icon={Wrench}
          action={<button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Service Type</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {serviceTypes.map((st) => (
            <div key={st.id} className="bg-white rounded-xl p-5 shadow-card border border-surface-100 hover:shadow-card-hover hover:border-surface-200 transition-all duration-200 group">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => handleEdit(st)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(st.id)} className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="text-base font-semibold text-surface-800 mb-1">{st.name}</h3>
              <p className="text-sm text-surface-400 mb-3 line-clamp-2">{st.description || 'No description'}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-surface-500">Every {intervalLabel(st.default_interval_days)}</span>
                <span className={st.status === 'active' ? 'badge-success' : 'badge-neutral'}>{st.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Service Type' : 'Add Service Type'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="e.g. Water Purifier" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="input-field" rows={3} placeholder="Describe this service type..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Default Service Interval (days) *</label>
            <input type="number" value={formData.default_interval_days} onChange={(e) => setFormData({ ...formData, default_interval_days: parseInt(e.target.value) || 90 })} className="input-field" min={1} max={365} />
            <p className="text-xs text-surface-400 mt-1">Service will be due every {intervalLabel(formData.default_interval_days)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
