import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import settingsService from '../services/settingsService';
import reminderService from '../services/reminderService';
import Modal from '../components/ui/Modal';
import { Building2, Save, Plus, Edit2, Trash2, MessageSquare } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({ company_name: '', contact_number: '', email: '', address: '' });
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
        contact_number: data.contact_number || '',
        email: data.email || '',
        address: data.address || '',
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
        <p className="text-surface-500 text-sm mt-1">Manage your company and app settings</p>
      </div>

      {/* Company Settings */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center gap-3">
          <Building2 className="w-5 h-5 text-primary-600" />
          <h3 className="text-base font-semibold text-surface-900">Company Information</h3>
        </div>
        <form onSubmit={handleSaveSettings} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Company Name</label>
              <input type="text" value={settings.company_name} onChange={(e) => setSettings({ ...settings, company_name: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Contact Number</label>
              <input type="tel" value={settings.contact_number} onChange={(e) => setSettings({ ...settings, contact_number: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Email</label>
              <input type="email" value={settings.email} onChange={(e) => setSettings({ ...settings, email: e.target.value })} className="input-field" />
            </div>
            <div>
              <label className="block text-sm font-medium text-surface-700 mb-1">Address</label>
              <input type="text" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} className="input-field" />
            </div>
          </div>
          <div className="flex justify-end pt-4 border-t border-surface-100">
            <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
              <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Reminder Templates */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MessageSquare className="w-5 h-5 text-primary-600" />
            <h3 className="text-base font-semibold text-surface-900">WhatsApp Reminder Templates</h3>
          </div>
          <button onClick={() => { setEditingTemplate(null); setTemplateForm({ name: '', template: '', description: '' }); setShowTemplateModal(true); }}
            className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" /> Add Template
          </button>
        </div>
        <div className="p-6">
          <p className="text-sm text-surface-500 mb-4">
            Use variables: <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs">{'{{customer_name}}'}</code>,{' '}
            <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs">{'{{service_type}}'}</code>,{' '}
            <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs">{'{{due_date}}'}</code>,{' '}
            <code className="bg-surface-100 px-1.5 py-0.5 rounded text-xs">{'{{company_name}}'}</code>
          </p>
          {templates.length === 0 ? (
            <p className="text-sm text-surface-400 text-center py-8">No templates yet. Create your first template above.</p>
          ) : (
            <div className="space-y-3">
              {templates.map((tmpl) => (
                <div key={tmpl.id} className="border border-surface-200 rounded-lg p-4 hover:border-surface-300 transition-colors group">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-semibold text-surface-800">{tmpl.name}</h4>
                      {tmpl.description && <p className="text-xs text-surface-400 mt-0.5">{tmpl.description}</p>}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingTemplate(tmpl); setTemplateForm({ name: tmpl.name, template: tmpl.template, description: tmpl.description || '' }); setShowTemplateModal(true); }}
                        className="p-1.5 text-surface-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDeleteTemplate(tmpl.id)}
                        className="p-1.5 text-surface-400 hover:text-danger-600 hover:bg-danger-50 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <pre className="mt-2 text-xs text-surface-600 bg-surface-50 p-3 rounded-lg whitespace-pre-wrap font-sans">{tmpl.template}</pre>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Profile */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 p-6">
        <h3 className="text-base font-semibold text-surface-900 mb-4">Profile</h3>
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
            <label className="block text-xs text-surface-400 mb-1">Mobile</label>
            <p className="text-sm font-medium text-surface-800">{user?.mobile}</p>
          </div>
          <div>
            <label className="block text-xs text-surface-400 mb-1">Role</label>
            <span className="badge-primary capitalize">{user?.role}</span>
          </div>
        </div>
      </div>

      <Modal isOpen={showTemplateModal} onClose={() => setShowTemplateModal(false)} title={editingTemplate ? 'Edit Template' : 'Add Template'}>
        <form onSubmit={handleSubmitTemplate} className="space-y-4">
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Template Name *</label>
            <input type="text" value={templateForm.name} onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })} className="input-field" required /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Description</label>
            <input type="text" value={templateForm.description} onChange={(e) => setTemplateForm({ ...templateForm, description: e.target.value })} className="input-field" /></div>
          <div><label className="block text-sm font-medium text-surface-700 mb-1">Template Message *</label>
            <textarea value={templateForm.template} onChange={(e) => setTemplateForm({ ...templateForm, template: e.target.value })} className="input-field" rows={5} required
              placeholder={'Dear {{customer_name}},\n\nYour {{service_type}} service is due on {{due_date}}.\n\nPlease contact us.\n\nThank you,\n{{company_name}}'} /></div>
          <div className="flex justify-end gap-3 pt-4 border-t border-surface-100">
            <button type="button" onClick={() => setShowTemplateModal(false)} className="btn-secondary">Cancel</button>
            <button type="submit" className="btn-primary">{editingTemplate ? 'Update' : 'Create'} Template</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
