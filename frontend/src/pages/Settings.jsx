import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import settingsService from '../services/settingsService';
import reminderService from '../services/reminderService';
import Modal from '../components/ui/Modal';
import { Building2, Save, Plus, Edit2, Trash2, MessageSquare, Phone, Mail, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    company_name: '',
    phone_number: '',
    whatsapp_number: '',
    email: '',
  });
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateForm, setTemplateForm] = useState({ name: '', template: '', description: '' });

  useEffect(() => { loadSettings(); loadTemplates(); }, []);

  const loadSettings = async () => {
    try {
      const data = await settingsService.get();
      setSettings({
        company_name: data.company_name || '',
        phone_number: data.phone_number || data.contact_number || '',
        whatsapp_number: data.whatsapp_number || '',
        email: data.email || '',
      });
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const loadTemplates = async () => {
    try {
      const data = await reminderService.getTemplates();
      setTemplates(data.data || []);
    } catch (err) { console.error(err); }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsService.update(settings);
      toast.success('Settings saved');
    } catch (err) { toast.error('Error saving settings'); }
    finally { setSaving(false); }
  };

  const handleSubmitTemplate = async (e) => {
    e.preventDefault();
    try {
      if (editingTemplate) {
        await reminderService.updateTemplate(editingTemplate.id, templateForm);
        toast.success('Template updated');
      } else {
        await reminderService.createTemplate(templateForm);
        toast.success('Template created');
      }
      setShowTemplateModal(false);
      setEditingTemplate(null);
      setTemplateForm({ name: '', template: '', description: '' });
      loadTemplates();
    } catch (err) { toast.error('Error saving template'); }
  };

  const handleDeleteTemplate = async (id) => {
    if (!confirm('Delete this template?')) return;
    try {
      await reminderService.deleteTemplate(id);
      toast.success('Template deleted');
      loadTemplates();
    } catch (err) { toast.error('Error deleting template'); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Settings</h1>
        <p className="text-surface-500 text-sm mt-1">Manage your company info and reminder templates</p>
      </div>

      {/* Company Settings */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-50 rounded-lg flex items-center justify-center">
            <Building2 className="w-4 h-4 text-primary-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-surface-900">Company Information</h3>
            <p className="text-xs text-surface-400">Used in WhatsApp messages and reports</p>
          </div>
        </div>
        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                <Building2 className="w-3.5 h-3.5 inline mr-1" />
                Company Name
              </label>
              <input type="text" value={settings.company_name} onChange={e => setSettings({ ...settings, company_name: e.target.value })} className="input-field" placeholder="Your Company Name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                <Phone className="w-3.5 h-3.5 inline mr-1" />
                Phone Number
              </label>
              <input type="tel" value={settings.phone_number} onChange={e => setSettings({ ...settings, phone_number: e.target.value })} className="input-field" placeholder="e.g. 9876543210" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                <Smartphone className="w-3.5 h-3.5 inline mr-1" />
                WhatsApp Number
              </label>
              <input type="tel" value={settings.whatsapp_number} onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })} className="input-field" placeholder="e.g. 9876543210 (with country code)" />
              <p className="text-xs text-surface-400 mt-1">Used as sender context in messages</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">
                <Mail className="w-3.5 h-3.5 inline mr-1" />
                Email
              </label>
              <input type="email" value={settings.email} onChange={e => setSettings({ ...settings, email: e.target.value })} className="input-field" placeholder="company@email.com" />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-surface-100">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Reminder Templates */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-surface-900">WhatsApp Reminder Templates</h3>
              <p className="text-xs text-surface-400">Customise messages sent to customers</p>
            </div>
          </div>
          <button
            onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', template: '', description: '' }); setShowTemplateModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" /> Add Template
          </button>
        </div>
        <div className="p-6">
          <div className="bg-surface-50 rounded-lg p-3 mb-4 text-sm text-surface-600">
            Available variables: &nbsp;
            {['{{customer_name}}', '{{service_type}}', '{{due_date}}', '{{company_name}}'].map(v => (
              <code key={v} className="bg-white border border-surface-200 px-1.5 py-0.5 rounded text-xs mx-0.5">{v}</code>
            ))}
          </div>
          {templates.length === 0 ? (
            <div className="text-center py-10">
              <MessageSquare className="w-10 h-10 text-surface-200 mx-auto mb-3" />
              <p className="text-sm text-surface-400">No templates yet. The default message will be used.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="border border-surface-200 rounded-xl p-4 hover:border-surface-300 transition-colors group">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-sm font-semibold text-surface-800">{tmpl.name}</h4>
                      {tmpl.description && <p className="text-xs text-surface-400 mt-0.5">{tmpl.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => { setEditingTemplate(tmpl); setTemplateForm({ name: tmpl.name, template: tmpl.template, description: tmpl.description || '' }); setShowTemplateModal(true); }}
                        className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <pre className="text-xs text-surface-600 bg-surface-50 p-3 rounded-lg whitespace-pre-wrap font-sans border border-surface-100">{tmpl.template}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 p-6">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Admin Profile</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-surface-400 mb-1">Name</label>
            <p className="text-sm font-medium text-surface-800">{user?.full_name}</p>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Email</label>
            <p className="text-sm font-medium text-surface-800">{user?.email}</p>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Role</label>
            <span className="badge-primary capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      {/* Default Admin Credentials Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-1">Default Login Credentials</p>
        <p className="text-sm text-blue-700">Email: <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-blue-200">admin@serviceiq.com</code></p>
        <p className="text-sm text-blue-700 mt-1">Password: <code className="bg-white px-1.5 py-0.5 rounded text-xs border border-blue-200">Admin@123</code></p>
      </div>

      {/* Template Modal */}
      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={editingTemplate ? 'Edit Template' : 'Add Template'}>
        <form onSubmit={handleSubmitTemplate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Template Name *</label>
            <input type="text" value={templateForm.name} onChange={e => setTemplateForm({ ...templateForm, name: e.target.value })} className="input-field" required placeholder="e.g. Standard Service Reminder" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <input type="text" value={templateForm.description} onChange={e => setTemplateForm({ ...templateForm, description: e.target.value })} className="input-field" placeholder="Brief description" />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Message Template *</label>
            <textarea
              value={templateForm.template}
              onChange={e => setTemplateForm({ ...templateForm, template: e.target.value })}
              className="input-field"
              rows={6}
              required
              placeholder={'Dear {{customer_name}},\n\nYour {{service_type}} service is due on {{due_date}}.\n\nPlease contact us to schedule your maintenance.\n\nThank you,\n{{company_name}}'}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setShowTemplateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingTemplate ? 'Update' : 'Create'} Template</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
