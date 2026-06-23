import { useState, useEffect } from 'react';
import serviceTypeService from '../services/serviceTypeService';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Plus, Edit2, Trash2, Wrench, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ServiceTypes() {
  const [serviceTypes, setServiceTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', reminder_interval_months: 3, status: 'active' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await serviceTypeService.list({ limit: 100 });
      setServiceTypes(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const toIntervalDays = (months) => Math.round(months * 30);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        default_interval_days: formData.reminder_interval_months * 30,
        reminder_interval_months: formData.reminder_interval_months,
        status: formData.status,
      };
      if (editing) {
        await serviceTypeService.update(editing.id, payload);
        toast.success('Service type updated');
      } else {
        await serviceTypeService.create(payload);
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
    setFormData({
      name: item.name,
      description: item.description || '',
      reminder_interval_months: item.reminder_interval_months || Math.round(item.default_interval_days / 30),
      status: item.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: '', description: '', reminder_interval_months: 3, status: 'active' });
  };

  const SERVICE_TYPE_COLORS = [
    'from-blue-400 to-blue-600',
    'from-violet-400 to-violet-600',
    'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600',
    'from-rose-400 to-rose-600',
    'from-indigo-400 to-indigo-600',
    'from-cyan-400 to-cyan-600',
    'from-orange-400 to-orange-600',
  ];

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Service Types</h1>
          <p className="text-surface-500 text-sm mt-1">
            Manage your recurring service categories and reminder intervals
          </p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2 text-sm">
          <Plus className="w-4 h-4" /> Add Service Type
        </button>
      </div>

      {/* Default examples hint */}
      {serviceTypes.length === 0 && !loading && (
        <div className="bg-primary-50 border border-primary-200 rounded-xl p-4">
          <p className="text-sm text-primary-800 font-medium mb-1">Common service types you can add:</p>
          <div className="flex flex-wrap gap-2 mt-2">
            {['Water Purifier', 'UPS', 'Inverter', 'AC', 'CCTV', 'Solar', 'Generator'].map(name => (
              <button
                key={name}
                onClick={async () => {
                  try {
                    await serviceTypeService.create({ name, default_interval_days: 90, status: 'active' });
                    loadData();
                    toast.success(`${name} added`);
                  } catch { toast.error('Already exists'); }
                }}
                className="px-3 py-1 bg-white border border-primary-300 text-primary-700 rounded-lg text-xs font-medium hover:bg-primary-100 transition-colors"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <LoadingSkeleton type="card" count={6} />
      ) : serviceTypes.length === 0 ? (
        <EmptyState title="No service types" description="Create your first service type to get started" icon={Wrench}
          action={<button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Service Type</button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {serviceTypes.map((st, idx) => {
            const gradColor = SERVICE_TYPE_COLORS[idx % SERVICE_TYPE_COLORS.length];
            const months = st.reminder_interval_months || Math.round(st.default_interval_days / 30);
            return (
              <div key={st.id} className="bg-white rounded-xl p-5 shadow-card border border-surface-100 hover:shadow-card-hover hover:border-surface-200 transition-all duration-200 group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-11 h-11 bg-gradient-to-br ${gradColor} rounded-xl flex items-center justify-center shadow-sm`}>
                    <Wrench className="w-5 h-5 text-white" />
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
                <p className="text-sm text-surface-400 mb-4 line-clamp-2">{st.description || 'No description'}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-surface-500">
                    <Clock className="w-3.5 h-3.5" />
                    Every {months} month{months !== 1 ? 's' : ''}
                  </div>
                  <span className={st.status === 'active' ? 'badge-success' : 'badge-neutral'}>{st.status}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Service Type' : 'Add Service Type'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Service Name *</label>
            <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" placeholder="e.g. Water Purifier" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="input-field" rows={2} placeholder="Brief description..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Reminder Interval (months) *</label>
            <input
              type="number"
              value={formData.reminder_interval_months}
              onChange={e => setFormData({ ...formData, reminder_interval_months: parseInt(e.target.value) || 1 })}
              className="input-field"
              min={1}
              max={60}
            />
            <p className="text-xs text-surface-400 mt-1">
              Reminder will be sent every {formData.reminder_interval_months} month{formData.reminder_interval_months !== 1 ? 's' : ''}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className="select-field">
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
