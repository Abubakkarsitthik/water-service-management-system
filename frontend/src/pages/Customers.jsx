import { useState, useEffect, useRef } from 'react';
import customerService from '../services/customerService';
import serviceTypeService from '../services/serviceTypeService';
import reminderService from '../services/reminderService';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import * as XLSX from 'xlsx';
import {
  Plus, Search, Edit2, Trash2, Eye, Users,
  ChevronLeft, ChevronRight, MessageCircle,
  Upload, Download, X, Phone, MapPin, Wrench, Calendar, FileText, CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

const EMPTY_FORM = {
  name: '', phone: '', alternate_phone: '', address: '',
  service_type: '', installation_date: '',
  next_reminder_date: '', notes: '',
};

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [serviceTypes, setServiceTypes] = useState([]);

  const [showFormModal, setShowFormModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => { loadServiceTypes(); }, []);
  useEffect(() => { loadCustomers(); }, [page, search, serviceTypeFilter]);

  const loadServiceTypes = async () => {
    try {
      const data = await serviceTypeService.list({ limit: 100 });
      setServiceTypes(data.data || []);
    } catch (err) { console.error(err); }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (serviceTypeFilter) params.service_type = serviceTypeFilter;
      const data = await customerService.list(params);
      setCustomers(data.data || []);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, formData);
        toast.success('Customer updated');
      } else {
        await customerService.create(formData);
        toast.success('Customer added');
      }
      setShowFormModal(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving customer');
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete ${name}? This cannot be undone.`)) return;
    try {
      await customerService.delete(id);
      toast.success('Customer deleted');
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error deleting');
    }
  };

  const handleEdit = (c) => {
    setEditingCustomer(c);
    setFormData({
      name: c.name || '',
      phone: c.phone || '',
      alternate_phone: c.alternate_phone || '',
      address: c.address || '',
      service_type: c.service_type || '',
      installation_date: c.installation_date || '',
      next_reminder_date: c.next_reminder_date || '',
      notes: c.notes || '',
    });
    setShowFormModal(true);
  };

  const handleView = async (c) => {
    try {
      const detail = await customerService.get(c.id);
      setViewingCustomer(detail);
      setShowDetailModal(true);
    } catch {
      setViewingCustomer(c);
      setShowDetailModal(true);
    }
  };

  const handleWhatsApp = async (c) => {
    try {
      const data = await reminderService.generateWhatsAppLink(c.id);
      window.open(data.whatsapp_url, '_blank');
      toast.success('WhatsApp opened');
    } catch (err) {
      toast.error('Error generating reminder');
    }
  };

  const handleCompleteService = async (c) => {
    if (!confirm(`Mark service completed for ${c.name}? Next reminder will be scheduled automatically.`)) return;
    try {
      const res = await customerService.completeService(c.id);
      const nextDate = res.next_reminder_date
        ? new Date(res.next_reminder_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      toast.success(`Done! Next reminder: ${nextDate}`);
      loadCustomers();
      if (viewingCustomer && viewingCustomer.id === c.id) {
        handleView(c);
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error completing service');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImporting(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { cellDates: true });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      // raw:false formats dates as strings; dateNF enforces YYYY-MM-DD format
      const rows = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

      if (rows.length === 0) {
        toast.error('No data found in file');
        return;
      }

      const result = await customerService.importCustomers(rows);
      if (result.errors?.length > 0) {
        toast.error(`${result.inserted} imported, ${result.errors.length} failed. Check console.`);
        console.warn('Import errors:', result.errors);
        // Show first few errors in toast
        result.errors.slice(0, 3).forEach(err => toast.error(err, { duration: 5000 }));
      } else {
        toast.success(result.message);
      }
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error importing file');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      await customerService.exportCustomers(serviceTypeFilter ? { service_type: serviceTypeFilter } : {});
      toast.success('Export downloaded');
    } catch (err) {
      toast.error('Error exporting');
    } finally { setExporting(false); }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData(EMPTY_FORM);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); }
    catch { return d; }
  };

  const getReminderBadge = (date) => {
    if (!date) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (date < today) return <span className="badge-danger">Overdue</span>;
    if (date === today) return <span className="badge-warning">Today</span>;
    return <span className="badge-success">{formatDate(date)}</span>;
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Customers</h1>
          <p className="text-surface-500 text-sm mt-1">{total} total customers</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Import */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={handleImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Upload className="w-4 h-4" />
            {importing ? 'Importing...' : 'Import Excel'}
          </button>
          {/* Export */}
          <button
            onClick={handleExport}
            disabled={exporting}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </button>
          {/* Add */}
          <button
            id="add-customer-btn"
            onClick={() => { resetForm(); setShowFormModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-card border border-surface-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by name, phone, address..."
              className="input-field pl-10"
            />
          </div>
          <select
            value={serviceTypeFilter}
            onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(1); }}
            className="select-field w-full sm:w-52"
          >
            <option value="">All Service Types</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.name}>{st.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Add your first customer or import from Excel"
          icon={Users}
          action={
            <button onClick={() => { resetForm(); setShowFormModal(true); }} className="btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          }
        />
      ) : (
        <div className="table-container">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Phone</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Service Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Next Reminder</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{c.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-800">{c.name}</p>
                          <p className="text-xs text-surface-400">{c.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-surface-700">{c.phone}</p>
                      {c.alternate_phone && <p className="text-xs text-surface-400">{c.alternate_phone}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      {c.service_type
                        ? <span className="badge-primary">{c.service_type}</span>
                        : <span className="text-xs text-surface-400">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5">
                      {getReminderBadge(c.next_reminder_date) || <span className="text-xs text-surface-400">Not set</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleCompleteService(c)} className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors" title="Mark Service Completed">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleView(c)} className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View Details">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(c)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleWhatsApp(c)} className="p-1.5 text-surface-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Send WhatsApp Reminder">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(c.id, c.name)} className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-surface-100">
              <p className="text-sm text-surface-500">Page {page} of {totalPages} ({total} results)</p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        isOpen={showFormModal}
        onClose={() => { setShowFormModal(false); resetForm(); }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Customer Name *</label>
              <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="input-field" required placeholder="e.g. Ravi Kumar" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Phone Number *</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="input-field" required placeholder="e.g. 9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Alternate Number</label>
              <input type="tel" value={formData.alternate_phone} onChange={e => setFormData({ ...formData, alternate_phone: e.target.value })} className="input-field" placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Service Type</label>
              <select value={formData.service_type} onChange={e => setFormData({ ...formData, service_type: e.target.value })} className="select-field">
                <option value="">Select type</option>
                {serviceTypes.map(st => (
                  <option key={st.id} value={st.name}>{st.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
            <textarea
              value={formData.address}
              onChange={e => setFormData({ ...formData, address: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Full address"
            />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Installation Date</label>
              <input type="date" value={formData.installation_date} onChange={e => setFormData({ ...formData, installation_date: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Next Reminder Date</label>
              <input type="date" value={formData.next_reminder_date} onChange={e => setFormData({ ...formData, next_reminder_date: e.target.value })} className="input-field" />
              <p className="text-[10px] text-surface-400 mt-1">Leave empty to auto-calculate from installation date</p>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Any special notes..."
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-surface-100">
            <button type="button" onClick={() => { setShowFormModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingCustomer ? 'Update Customer' : 'Add Customer'}</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => { setShowDetailModal(false); setViewingCustomer(null); }}
        title="Customer Details"
        size="lg"
      >
        {viewingCustomer && (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center gap-4 p-4 bg-surface-50 rounded-xl">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xl font-bold">
                  {viewingCustomer.name?.charAt(0)?.toUpperCase()}
                </span>
              </div>
              <div>
                <h3 className="text-lg font-bold text-surface-900">{viewingCustomer.name}</h3>
                <p className="text-sm text-surface-500">{viewingCustomer.customer_id}</p>
                {viewingCustomer.service_type && (
                  <span className="badge-primary mt-1">{viewingCustomer.service_type}</span>
                )}
              </div>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Phone, label: 'Phone', value: viewingCustomer.phone },
                { icon: Phone, label: 'Alternate Phone', value: viewingCustomer.alternate_phone || '—' },
                { icon: MapPin, label: 'Address', value: viewingCustomer.address || '—' },
                { icon: Wrench, label: 'Service Type', value: viewingCustomer.service_type || '—' },
                { icon: Calendar, label: 'Installation Date', value: formatDate(viewingCustomer.installation_date) },
                { icon: Calendar, label: 'Next Reminder', value: formatDate(viewingCustomer.next_reminder_date) },
                { icon: FileText, label: 'Notes', value: viewingCustomer.notes || '—' },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-surface-100 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-surface-500" />
                  </div>
                  <div>
                    <p className="text-xs text-surface-400">{label}</p>
                    <p className="text-sm font-medium text-surface-800">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Reminder History */}
            {viewingCustomer.reminders?.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-surface-800 mb-3">Reminder History</h4>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {viewingCustomer.reminders.map((r) => (
                    <div key={r.id} className="flex items-center justify-between p-3 bg-surface-50 rounded-lg">
                      <div className="min-w-0">
                        <p className="text-xs text-surface-600 truncate">{r.message?.slice(0, 60)}...</p>
                      </div>
                      <p className="text-xs text-surface-400 flex-shrink-0 ml-3">{r.created_at?.slice(0, 10)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2 border-t border-surface-100">
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleCompleteService(viewingCustomer);
                }}
                className="btn-primary bg-emerald-600 hover:bg-emerald-700 ring-emerald-100 flex items-center justify-center gap-2 text-sm flex-1"
              >
                <CheckCircle className="w-4 h-4" /> Mark Completed
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleWhatsApp(viewingCustomer);
                }}
                className="btn-primary flex items-center justify-center gap-2 text-sm flex-1"
              >
                <MessageCircle className="w-4 h-4" /> Send Reminder
              </button>
              <button
                onClick={() => {
                  setShowDetailModal(false);
                  handleEdit(viewingCustomer);
                }}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
