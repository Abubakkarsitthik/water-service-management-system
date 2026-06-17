import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import customerService from '../services/customerService';
import serviceTypeService from '../services/serviceTypeService';
import Modal from '../components/ui/Modal';
import EmptyState from '../components/ui/EmptyState';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import { Plus, Search, Edit2, Trash2, Eye, Users, ChevronLeft, ChevronRight, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import reminderService from '../services/reminderService';

export default function Customers() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [cityFilter, setCityFilter] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [serviceTypes, setServiceTypes] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '', mobile: '', alternate_mobile: '', email: '',
    street: '', area: '', city: '', state: '', pincode: '',
    installation: { service_type: '', installation_date: '', warranty_expiry: '', purchase_notes: '' },
  });

  useEffect(() => {
    loadServiceTypes();
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [page, search, cityFilter, serviceTypeFilter]);

  const loadServiceTypes = async () => {
    try {
      const data = await serviceTypeService.list({ limit: 50 });
      setServiceTypes(data.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (search) params.search = search;
      if (cityFilter) params.city = cityFilter;
      if (serviceTypeFilter) params.service_type = serviceTypeFilter;
      const data = await customerService.list(params);
      setCustomers(data.data || []);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        installation: formData.installation.service_type ? formData.installation : undefined,
      };
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, payload);
        toast.success('Customer updated');
      } else {
        await customerService.create(payload);
        toast.success('Customer created');
      }
      setShowModal(false);
      resetForm();
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error saving customer');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this customer?')) return;
    try {
      await customerService.delete(id);
      toast.success('Customer deleted');
      loadCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error deleting customer');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setFormData({
      name: customer.name || '',
      mobile: customer.mobile || '',
      alternate_mobile: customer.alternate_mobile || '',
      email: customer.email || '',
      street: customer.street || '',
      area: customer.area || '',
      city: customer.city || '',
      state: customer.state || '',
      pincode: customer.pincode || '',
      installation: customer.installation || { service_type: '', installation_date: '', warranty_expiry: '', purchase_notes: '' },
    });
    setShowModal(true);
  };

  const handleWhatsApp = async (customer) => {
    try {
      const data = await reminderService.generateWhatsAppLink(customer.id);
      window.open(data.whatsapp_url, '_blank');
      toast.success('WhatsApp reminder opened');
    } catch (err) {
      toast.error('Error generating reminder');
    }
  };

  const resetForm = () => {
    setEditingCustomer(null);
    setFormData({
      name: '', mobile: '', alternate_mobile: '', email: '',
      street: '', area: '', city: '', state: '', pincode: '',
      installation: { service_type: '', installation_date: '', warranty_expiry: '', purchase_notes: '' },
    });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadCustomers();
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Customers</h1>
          <p className="text-surface-500 text-sm mt-1">{total} total customers</p>
        </div>
        <button
          id="add-customer-btn"
          onClick={() => { resetForm(); setShowModal(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 shadow-card border border-surface-100">
        <div className="flex flex-col sm:flex-row gap-3">
          <form onSubmit={handleSearchSubmit} className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-surface-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, email..."
              className="input-field pl-10"
            />
          </form>
          <select
            value={serviceTypeFilter}
            onChange={(e) => { setServiceTypeFilter(e.target.value); setPage(1); }}
            className="select-field w-full sm:w-48"
          >
            <option value="">All Service Types</option>
            {serviceTypes.map((st) => (
              <option key={st.id} value={st.name}>{st.name}</option>
            ))}
          </select>
          <input
            type="text"
            value={cityFilter}
            onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
            placeholder="Filter by city"
            className="input-field w-full sm:w-40"
          />
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton type="table" count={5} />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description="Get started by adding your first customer"
          icon={Users}
          action={
            <button onClick={() => { resetForm(); setShowModal(true); }} className="btn-primary flex items-center gap-2">
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">City</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Service Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-surface-50/50 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-white text-xs font-bold">{customer.name?.charAt(0)?.toUpperCase()}</span>
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-surface-800">{customer.name}</p>
                          <p className="text-xs text-surface-400">{customer.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-surface-700">{customer.mobile}</p>
                      {customer.email && <p className="text-xs text-surface-400">{customer.email}</p>}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="text-sm text-surface-700">{customer.city || '-'}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="badge-primary">{customer.installation?.service_type || '-'}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/customers/${customer.id}`)} className="p-1.5 text-surface-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" title="View">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleEdit(customer)} className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Edit">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleWhatsApp(customer)} className="p-1.5 text-surface-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="WhatsApp">
                          <MessageCircle className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(customer.id)} className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors" title="Delete">
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
              <p className="text-sm text-surface-500">
                Page {page} of {totalPages} ({total} results)
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 rounded-lg border border-surface-200 text-surface-500 hover:bg-surface-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); resetForm(); }}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Name *</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Mobile *</label>
              <input type="tel" value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} className="input-field" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Alternate Mobile</label>
              <input type="tel" value={formData.alternate_mobile} onChange={(e) => setFormData({ ...formData, alternate_mobile: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input-field" />
            </div>
          </div>

          <div className="border-t border-surface-100 pt-4">
            <h4 className="text-sm font-semibold text-surface-800 mb-3">Address</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-surface-700 mb-1">Street</label>
                <input type="text" value={formData.street} onChange={(e) => setFormData({ ...formData, street: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Area</label>
                <input type="text" value={formData.area} onChange={(e) => setFormData({ ...formData, area: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">City</label>
                <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">State</label>
                <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Pincode</label>
                <input type="text" value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} className="input-field" />
              </div>
            </div>
          </div>

          <div className="border-t border-surface-100 pt-4">
            <h4 className="text-sm font-semibold text-surface-800 mb-3">Installation Details</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Service Type</label>
                <select value={formData.installation.service_type} onChange={(e) => setFormData({ ...formData, installation: { ...formData.installation, service_type: e.target.value } })} className="select-field">
                  <option value="">Select type</option>
                  {serviceTypes.map((st) => (
                    <option key={st.id} value={st.name}>{st.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Installation Date</label>
                <input type="date" value={formData.installation.installation_date} onChange={(e) => setFormData({ ...formData, installation: { ...formData.installation, installation_date: e.target.value } })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Warranty Expiry</label>
                <input type="date" value={formData.installation.warranty_expiry} onChange={(e) => setFormData({ ...formData, installation: { ...formData.installation, warranty_expiry: e.target.value } })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Purchase Notes</label>
                <input type="text" value={formData.installation.purchase_notes} onChange={(e) => setFormData({ ...formData, installation: { ...formData.installation, purchase_notes: e.target.value } })} className="input-field" />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => { setShowModal(false); resetForm(); }} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingCustomer ? 'Update' : 'Create'} Customer</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
