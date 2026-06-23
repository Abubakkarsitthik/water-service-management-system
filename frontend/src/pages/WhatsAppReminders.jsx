import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import reminderService from '../services/reminderService';
import settingsService from '../services/settingsService';
import customerService from '../services/customerService';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import {
  MessageCircle, Phone, Wrench, Calendar, ExternalLink,
  Filter, RefreshCw, CheckCircle, AlertTriangle, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

const FILTERS = [
  { key: 'all', label: 'All Due', icon: Filter },
  { key: 'today', label: 'Due Today', icon: AlertTriangle },
  { key: 'week', label: 'Due This Week', icon: Clock },
  { key: 'month', label: 'Due This Month', icon: Calendar },
];

export default function WhatsAppReminders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [sentSet, setSentSet] = useState(new Set());
  const [activeFilter, setActiveFilter] = useState(searchParams.get('filter') || 'all');
  const [companyName, setCompanyName] = useState('ServiceIQ');

  useEffect(() => {
    loadSettings();
  }, []);

  useEffect(() => {
    loadDueCustomers();
  }, [activeFilter]);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      if (data.company_name) setCompanyName(data.company_name);
    } catch { /* silent */ }
  };

  const loadDueCustomers = async () => {
    setLoading(true);
    try {
      const data = await reminderService.getDueCustomers({ filter: activeFilter, limit: 100 });
      setCustomers(data.data || []);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
      toast.error('Error loading due customers');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (customer) => {
    try {
      const data = await reminderService.generateWhatsAppLink(customer.id);
      window.open(data.whatsapp_url, '_blank');
      setSentSet(prev => new Set([...prev, customer.id]));
      toast.success(`Reminder opened for ${customer.name}`);
    } catch (err) {
      toast.error('Error generating reminder link');
    }
  };

  const handleCompleteService = async (customer) => {
    if (!confirm(`Mark service completed for ${customer.name}? Next reminder will be scheduled automatically.`)) return;
    try {
      const res = await customerService.completeService(customer.id);
      const nextDate = res.next_reminder_date
        ? new Date(res.next_reminder_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
        : '';
      toast.success(`Done! Next reminder: ${nextDate}`);
      loadDueCustomers();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Error completing service');
    }
  };

  const handleFilterChange = (key) => {
    setActiveFilter(key);
    setSearchParams({ filter: key });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getReminderUrgency = (dateStr) => {
    if (!dateStr) return { label: 'No date', cls: 'badge-neutral', row: '' };
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr < today) return { label: 'Overdue', cls: 'badge-danger', row: 'bg-red-50/30' };
    if (dateStr === today) return { label: 'Due Today', cls: 'badge-warning', row: 'bg-amber-50/30' };
    return { label: 'Upcoming', cls: 'badge-success', row: '' };
  };

  const buildWhatsAppMessage = (customer) => {
    const name = customer.name || '';
    const service = customer.service_type || 'service';
    const date = customer.next_reminder_date ? formatDate(customer.next_reminder_date) : '';
    return (
      `Dear ${name},\n\n` +
      `Your ${service} service is due${date ? ` on ${date}` : ''}.\n\n` +
      `Please contact us to schedule your maintenance.\n\n` +
      `Thank you,\n${companyName}`
    );
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">WhatsApp Reminders</h1>
          <p className="text-surface-500 text-sm mt-1">
            {total} customer{total !== 1 ? 's' : ''} due for reminder
          </p>
        </div>
        <button
          onClick={loadDueCustomers}
          className="btn-secondary flex items-center gap-2 text-sm self-start"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 p-1.5 flex gap-1 flex-wrap">
        {FILTERS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => handleFilterChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              activeFilter === key
                ? 'bg-primary-600 text-white shadow-sm'
                : 'text-surface-500 hover:bg-surface-100 hover:text-surface-700'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Info Banner */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-start gap-3">
        <MessageCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-green-800">How it works</p>
          <p className="text-sm text-green-700 mt-0.5">
            Click <strong>Send Reminder</strong> to open WhatsApp Web with a pre-filled message for that customer. No API required — uses WhatsApp Web redirect.
          </p>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingSkeleton type="table" count={6} />
      ) : customers.length === 0 ? (
        <div className="bg-white rounded-xl shadow-card border border-surface-100 flex flex-col items-center justify-center py-16">
          <CheckCircle className="w-14 h-14 text-green-300 mb-4" />
          <h3 className="text-base font-semibold text-surface-700">All caught up!</h3>
          <p className="text-sm text-surface-400 mt-1">No customers due for reminders in this period.</p>
        </div>
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
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-50">
                {customers.map((c) => {
                  const urgency = getReminderUrgency(c.next_reminder_date);
                  const sent = sentSet.has(c.id);
                  return (
                    <tr key={c.id} className={`hover:bg-surface-50/70 transition-colors ${urgency.row}`}>
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
                        <div className="flex items-center gap-1.5 text-sm text-surface-700">
                          <Phone className="w-3.5 h-3.5 text-surface-400" />
                          {c.phone}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {c.service_type
                          ? <div className="flex items-center gap-1.5"><Wrench className="w-3.5 h-3.5 text-surface-400" /><span className="badge-primary">{c.service_type}</span></div>
                          : <span className="text-xs text-surface-400">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1.5 text-sm text-surface-700">
                          <Calendar className="w-3.5 h-3.5 text-surface-400" />
                          {formatDate(c.next_reminder_date)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        {sent
                          ? <span className="badge-success flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Sent</span>
                          : <span className={urgency.cls}>{urgency.label}</span>
                        }
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSendReminder(c)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                              sent
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow'
                            }`}
                            title="Open WhatsApp Web with pre-filled message"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {sent ? 'Resend' : 'Send Reminder'}
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </button>
                          <button
                            onClick={() => handleCompleteService(c)}
                            className="p-1.5 text-surface-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Mark Service Completed"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Preview Panel */}
          {customers.length > 0 && (
            <div className="border-t border-surface-100 px-5 py-4 bg-surface-50">
              <p className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Message Preview</p>
              <pre className="text-xs text-surface-600 whitespace-pre-wrap font-sans bg-white border border-surface-200 p-3 rounded-lg">
                {buildWhatsAppMessage(customers[0])}
              </pre>
              <p className="text-xs text-surface-400 mt-2">* Preview shows first customer's message. Each customer gets a personalized message.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
