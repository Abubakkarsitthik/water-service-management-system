import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import customerService from '../services/customerService';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, Shield, Wrench, MessageCircle } from 'lucide-react';
import reminderService from '../services/reminderService';
import toast from 'react-hot-toast';

export default function CustomerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadCustomer(); }, [id]);

  const loadCustomer = async () => {
    try {
      const data = await customerService.getById(id);
      setCustomer(data);
    } catch (err) {
      toast.error('Customer not found');
      navigate('/customers');
    } finally {
      setLoading(false);
    }
  };

  const handleWhatsApp = async () => {
    try {
      const data = await reminderService.generateWhatsAppLink(id);
      window.open(data.whatsapp_url, '_blank');
    } catch (err) {
      toast.error('Error generating reminder');
    }
  };

  const getStatusBadge = (status) => {
    const map = { pending: 'badge-warning', assigned: 'badge-primary', in_progress: 'badge-primary', completed: 'badge-success', cancelled: 'badge-danger' };
    return map[status] || 'badge-neutral';
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" /></div>;
  }

  if (!customer) return null;

  return (
    <div className="space-y-6 animate-in">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/customers')} className="p-2 hover:bg-surface-100 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5 text-surface-600" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{customer.name}</h1>
          <p className="text-surface-500 text-sm">{customer.customer_id}</p>
        </div>
        <button onClick={handleWhatsApp} className="ml-auto btn-primary flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <MessageCircle className="w-4 h-4" /> Send WhatsApp Reminder
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact Info */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-sm font-semibold text-surface-900 mb-4">Contact Information</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-surface-400" />
              <span className="text-sm text-surface-700">{customer.mobile}</span>
            </div>
            {customer.alternate_mobile && (
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-surface-400" />
                <span className="text-sm text-surface-700">{customer.alternate_mobile}</span>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-surface-400" />
                <span className="text-sm text-surface-700">{customer.email}</span>
              </div>
            )}
            {(customer.street || customer.city) && (
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-surface-400 mt-0.5" />
                <span className="text-sm text-surface-700">
                  {[customer.street, customer.area, customer.city, customer.state, customer.pincode].filter(Boolean).join(', ')}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Installation Info */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-sm font-semibold text-surface-900 mb-4">Installation Details</h3>
          {customer.installation ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Wrench className="w-4 h-4 text-surface-400" />
                <span className="text-sm text-surface-700">{customer.installation.service_type}</span>
              </div>
              {customer.installation.installation_date && (
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-700">Installed: {customer.installation.installation_date}</span>
                </div>
              )}
              {customer.installation.warranty_expiry && (
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-surface-400" />
                  <span className="text-sm text-surface-700">Warranty: {customer.installation.warranty_expiry}</span>
                </div>
              )}
              {customer.installation.purchase_notes && (
                <p className="text-sm text-surface-500 bg-surface-50 p-3 rounded-lg">{customer.installation.purchase_notes}</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-surface-400">No installation details</p>
          )}
        </div>

        {/* Quick Stats */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-sm font-semibold text-surface-900 mb-4">Service Summary</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-500">Total Services</span>
              <span className="text-sm font-semibold text-surface-800">{customer.services?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-500">Completed</span>
              <span className="text-sm font-semibold text-green-600">{customer.services?.filter(s => s.status === 'completed').length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-surface-500">Pending</span>
              <span className="text-sm font-semibold text-amber-600">{customer.services?.filter(s => s.status === 'pending').length || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Service History */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100">
          <h3 className="text-base font-semibold text-surface-900">Service History</h3>
        </div>
        {customer.services?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-surface-50 border-b border-surface-100">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Service ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {customer.services.map((service) => (
                  <tr key={service.id} className="hover:bg-surface-50/50">
                    <td className="px-5 py-3 text-sm text-surface-700">{service.service_id}</td>
                    <td className="px-5 py-3 text-sm text-surface-700">{service.service_date}</td>
                    <td className="px-5 py-3"><span className={getStatusBadge(service.status)}>{service.status}</span></td>
                    <td className="px-5 py-3 text-sm text-surface-500">{service.notes || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-8 text-sm text-surface-400 text-center">No service history</p>
        )}
      </div>
    </div>
  );
}
