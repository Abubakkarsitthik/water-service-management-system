import { useState, useEffect } from 'react';
import technicianService from '../services/technicianService';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Plus, Edit2, Trash2, UserCog, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Technicians() {
  const [technicians, setTechnicians] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ name: '', phone: '', email: '', address: '', status: 'active' });

  useEffect(() => { loadData(); }, [page]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      const data = await technicianService.list(params);
      setTechnicians(data.data || []);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) {
        await technicianService.update(editing.id, formData);
        toast.success('Technician updated');
      } else {
        await technicianService.create(formData);
        toast.success('Technician added');
      }
      setShowModal(false);
      resetForm();
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error saving'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this technician?')) return;
    try {
      await technicianService.delete(id);
      toast.success('Deleted');
      loadData();
    } catch (err) { toast.error(err.response?.data?.detail || 'Error deleting'); }
  };

  const handleEdit = (tech) => {
    setEditing(tech);
    setFormData({ name: tech.name, phone: tech.phone, email: tech.email || '', address: tech.address || '', status: tech.status });
    setShowModal(true);
  };

  const resetForm = () => {
    setEditing(null);
    setFormData({ name: '', phone: '', email: '', address: '', status: 'active' });
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Technicians</h1>
          <p className="text-surface-500 text-sm mt-1">{total} total technicians</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Technician
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-card border border-surface-100">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { setPage(1); loadData(); } }}
            placeholder="Search technicians..." className="input-field pl-10" />
        </div>
      </div>

      {loading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : technicians.length === 0 ? (
        <EmptyState title="No technicians found" description="Add your first technician" icon={UserCog}
          action={<button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2"><Plus className="w-4 h-4" /> Add Technician</button>}
        />
      ) : (
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Technician</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Active Jobs</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Completed</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {technicians.map((tech) => (
                  <tr key={tech.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{tech.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <p className="text-sm font-semibold text-surface-800">{tech.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-surface-700">{tech.phone}</p>
                      {tech.email && <p className="text-xs text-surface-400">{tech.email}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={tech.status === 'active' ? 'badge-success' : 'badge-neutral'}>{tech.status}</span>
                    </td>
                    <td className="px-5 py-3.5 text-sm font-medium text-primary-600">{tech.active_services || 0}</td>
                    <td className="px-5 py-3.5 text-sm font-medium text-green-600">{tech.completed_services || 0}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(tech)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(tech.id)} className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
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

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); resetForm(); }} title={editing ? 'Edit Technician' : 'Add Technician'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
            <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Phone *</label>
            <input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
            <textarea value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input-field" rows={2} /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Status</label>
            <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="select-field">
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editing ? 'Update' : 'Add'} Technician</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
