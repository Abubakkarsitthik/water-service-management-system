import { useState } from 'react';
import reportService from '../services/reportService';
import { FileText, Users, Calendar, MessageCircle, Download, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const REPORT_TYPES = [
  {
    key: 'customers',
    label: 'Customer Report',
    description: 'All customers with contact info, service type, and reminder dates',
    icon: Users,
    color: 'from-blue-500 to-blue-600',
    bg: 'bg-blue-50',
    text: 'text-blue-600',
  },
  {
    key: 'due-services',
    label: 'Due Service Report',
    description: 'Customers whose service is overdue or coming up in the next 30 days',
    icon: Calendar,
    color: 'from-amber-500 to-amber-600',
    bg: 'bg-amber-50',
    text: 'text-amber-600',
  },
  {
    key: 'reminders',
    label: 'Reminder Report',
    description: 'History of all WhatsApp reminders sent via the system',
    icon: MessageCircle,
    color: 'from-emerald-500 to-emerald-600',
    bg: 'bg-emerald-50',
    text: 'text-emerald-600',
  },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const loadReport = async (type) => {
    setActiveReport(type);
    setLoading(true);
    try {
      let data;
      if (type === 'customers') data = await reportService.getCustomerReport();
      else if (type === 'due-services') data = await reportService.getDueServiceReport();
      else if (type === 'reminders') data = await reportService.getReminderReport();
      setReportData(data.data || []);
    } catch (err) {
      toast.error('Error loading report');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (!activeReport) return;
    setDownloading(true);
    try {
      await reportService.downloadExcel(activeReport);
      toast.success('Excel report downloaded');
    } catch (err) {
      toast.error('Error downloading report');
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const activeInfo = REPORT_TYPES.find(r => r.key === activeReport);

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
        <p className="text-surface-500 text-sm mt-1">Generate and export business reports</p>
      </div>

      {/* Report Type Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {REPORT_TYPES.map((report) => {
          const Icon = report.icon;
          const isActive = activeReport === report.key;
          return (
            <button
              key={report.key}
              onClick={() => loadReport(report.key)}
              className={`text-left bg-white rounded-xl p-5 shadow-card border transition-all duration-200 hover:shadow-card-hover ${
                isActive ? 'border-primary-300 ring-2 ring-primary-100' : 'border-surface-100 hover:border-surface-200'
              }`}
            >
              <div className={`w-11 h-11 ${report.bg} rounded-xl flex items-center justify-center mb-4 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                <Icon className={`w-5 h-5 ${report.text}`} />
              </div>
              <h3 className="text-sm font-semibold text-surface-800 mb-1">{report.label}</h3>
              <p className="text-xs text-surface-400 leading-relaxed">{report.description}</p>
            </button>
          );
        })}
      </div>

      {/* Report Table */}
      {activeReport && (
        <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <div>
              <h3 className="text-base font-semibold text-surface-900">{activeInfo?.label}</h3>
              <p className="text-xs text-surface-400 mt-0.5">{reportData.length} records</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => loadReport(activeReport)}
                className="p-2 text-surface-400 hover:text-surface-600 hover:bg-surface-100 rounded-lg transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={handlePrint}
                className="btn-secondary flex items-center gap-2 text-sm"
              >
                <FileText className="w-4 h-4" />
                Print / PDF
              </button>
              <button
                onClick={handleDownloadExcel}
                disabled={downloading || reportData.length === 0}
                className="btn-primary flex items-center gap-2 text-sm"
              >
                <Download className="w-4 h-4" />
                {downloading ? 'Downloading...' : 'Export Excel'}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14">
              <FileText className="w-12 h-12 text-surface-200 mb-3" />
              <p className="text-sm text-surface-400">No data available for this report</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    {Object.keys(reportData[0]).map((key) => (
                      <th key={key} className="text-left px-4 py-3 text-xs font-semibold text-surface-500 uppercase whitespace-nowrap tracking-wider">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {reportData.slice(0, 100).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50/50 transition-colors">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-4 py-3 text-sm text-surface-700 whitespace-nowrap">
                          {val || '—'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {reportData.length > 100 && (
                <p className="px-5 py-3 text-xs text-surface-400 border-t border-surface-100">
                  Showing first 100 of {reportData.length} records. Export Excel to get full data.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
