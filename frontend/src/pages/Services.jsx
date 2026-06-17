import { useState, useEffect } from 'react';
import serviceService from '../services/serviceService';
import customerService from '../services/customerService';
import serviceTypeService from '../services/serviceTypeService';
import technicianService from '../services/technicianService';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Plus, Search, Edit2, CheckCircle, ClipboardList, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [formData, setFormData] = useState({
    customer_id: '', service_type_id: '', technician_id: '',
    service_date: new Date().toISOString().split('T')[0], notes: '', status: 'pending',
  });

  useEffect(() => { loadDropdowns(); }, []);
  useEffect(() => { loadServices(); }, [page, statusFilter]);

  const loadDropdowns = async () => {
    try {
      const [custData, stData, techData] = await Promise.all([
        customerService.list({ limit: 100 }),
        serviceTypeService.list({ limit: 50 }),
        technicianService.list({ limit: 50 }),
      ]);
      setCustomers(custData.data || []);
      setServiceTypes(stData.data || []);
      setTechnicians(techData.data || []);
    } catch (err) { console.error(err); }
  };

  const loadServices = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await serviceService.list(params);
      setServices(data.data || []);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.technician_id) delete payload.technician_id;
      if (editing) {
        await serviceService.update(editing.id, payload);
        toast.success('Service updated');
      } else {
        await serviceService.create(payload);
        toast.success('Service created');
      }
      setShowModal(false);
      resetForm();
      loadServices();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving');
    }
  };

  const handleComplete = async (id) => {
    try {
      await serviceService.complete(id, {});
      toast.success('Service completed');
      loadServices();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error completing');
    }
  };

  const handleEdit = (svc) => {
    setEditing(svc);
    setFormData({
      customer_id: svc.customer_id, service_type_id: svc.service_type_id,
      technician_id: svc.technician_id || '', service_date: svc.service_date,
      notes: svc.notes || '', status: svc.status,
    });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({
      customer_id: '', service_type_id: '', technician_id: '',
      service_date: new Date().toISOString().split('T')[0], notes: '', status: 'pending',
    });
  };

  const getStatusBadge = (status) => {
    const map = { pending: 'badge-warning', assigned: 'badge-primary', in_progress: 'badge-primary', completed: 'badge-success', cancelled: 'badge-danger' };
    return map[status] || 'badge-neutral';
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Services</h1>
          <p className="text-surface-500 text-sm mt-1">{total} total services</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Create Service
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-card border border-surface-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadServices(); } }}
              placeholder="Search services..." className="input-field pl-10" />
          </div>
          <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} className="select-field w-full sm:w-40">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="assigned">Assigned</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : services.length === 0 ? (
        <EmptyState title="No services found" description="Create your first service record" icon={ClipboardList}
          action={<button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Create Service</button>}
        />
      ) : (
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Service ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Technician</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {services.map((svc) => (
                  <tr key={svc.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-medium text-surface-800">{svc.service_id}</td>
                    <td className="px-5 py-3.5 text-sm text-surface-700">{svc.customer_name || '-'}</td>
                    <td className="px-5 py-3.5"><span className="badge-primary">{svc.service_type_name || '-'}</span></td>
                    <td className="px-5 py-3.5 text-sm text-surface-700">{svc.technician_name || 'Unassigned'}</td>
                    <td className="px-5 py-3.5 text-sm text-surface-700">{svc.service_date}</td>
                    <td className="px-5 py-3.5"><span className={getStatusBadge(svc.status)}>{svc.status}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(svc)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {svc.status !== 'completed' && svc.status !== 'cancelled' && (
                          <button onClick={() => handleComplete(svc.id)} className="p-1.5 text-surface-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Complete">
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
              <p className="text-sm text-surface-500">Page {page} of {totalPages}</p>
              <div className="flex items-center gap-2">
                <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-50">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-50">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Service' : 'Create Service'} size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Customer *</label>
              <select value={formData.customer_id} onChange={(e) => setFormData({ ...formData, customer_id: e.target.value })} className="select-field" required disabled={!!editing}>
                <option value="">Select customer</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.mobile})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Service Type *</label>
              <select value={formData.service_type_id} onChange={(e) => setFormData({ ...formData, service_type_id: e.target.value })} className="select-field" required>
                <option value="">Select type</option>
                {serviceTypes.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Technician</label>
              <select value={formData.technician_id} onChange={(e) => setFormData({ ...formData, technician_id: e.target.value })} className="select-field">
                <option value="">Unassigned</option>
                {technicians.filter(t => t.status === 'active').map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Service Date *</label>
              <input type="date" value={formData.service_date} onChange={(e) => setFormData({ ...formData, service_date: e.target.value })} className="input-field" required />
            </div>
            {editing && (
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
                <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select-field">
                  <option value="pending">Pending</option>
                  <option value="assigned">Assigned</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
            <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input-field" rows={3} />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Create'} Service</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
