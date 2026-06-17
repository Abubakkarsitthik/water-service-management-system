import { useState } from 'react';
import reportService from '../services/reportService';
import { FileText, Users, Wrench, UserCog, AlertTriangle, Download } from 'lucide-react';
import toast from 'react-hot-toast';

const reportTypes = [
  { key: 'customers', label: 'Customer Report', description: 'All customer data with installation details', icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50' },
  { key: 'services', label: 'Service Report', description: 'Service records with status and technician info', icon: Wrench, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50' },
  { key: 'technicians', label: 'Technician Report', description: 'Technician performance and workload data', icon: UserCog, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50' },
  { key: 'due-services', label: 'Due Service Report', description: 'All pending and overdue services', icon: AlertTriangle, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50' },
];

export default function Reports() {
  const [activeReport, setActiveReport] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadReport = async (type) => {
    setActiveReport(type);
    setLoading(true);
    try {
      let data;
      switch (type) {
        case 'customers': data = await reportService.getCustomerReport(); break;
        case 'services': data = await reportService.getServiceReport(); break;
        case 'technicians': data = await reportService.getTechnicianReport(); break;
        case 'due-services': data = await reportService.getDueServiceReport(); break;
        default: return;
      }
      setReportData(data.data || []);
    } catch (err) { toast.error('Error loading report'); }
    finally { setLoading(false); }
  };

  const handleDownload = async (type) => {
    try {
      await reportService.downloadCSV(type);
      toast.success('Report downloaded');
    } catch (err) { toast.error('Error downloading report'); }
  };

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="text-2xl font-bold text-surface-900">Reports</h1>
        <p className="text-surface-500 text-sm mt-1">Generate and export business reports</p>
      </div>

      {/* Report Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {reportTypes.map((report) => {
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
              <div className={`w-10 h-10 ${report.bg} rounded-lg flex items-center justify-center mb-3`}>
                <Icon className="w-5 h-5 text-surface-600" />
              </div>
              <h3 className="text-sm font-semibold text-surface-800 mb-1">{report.label}</h3>
              <p className="text-xs text-surface-400">{report.description}</p>
            </button>
          );
        })}
      </div>

      {/* Report Data */}
      {activeReport && (
        <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-surface-100">
            <h3 className="text-base font-semibold text-surface-900">
              {reportTypes.find(r => r.key === activeReport)?.label}
              <span className="text-surface-400 font-normal ml-2 text-sm">({reportData.length} records)</span>
            </h3>
            <button onClick={() => handleDownload(activeReport)} className="btn-secondary flex items-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Export CSV
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-surface-300 mb-3" />
              <p className="text-sm text-surface-400">No data available for this report</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-50 border-b border-surface-100">
                    {Object.keys(reportData[0]).map((key) => (
                      <th key={key} className="text-left px-5 py-3 text-xs font-semibold text-surface-500 uppercase whitespace-nowrap">
                        {key}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-50">
                  {reportData.slice(0, 50).map((row, i) => (
                    <tr key={i} className="hover:bg-surface-50/50">
                      {Object.values(row).map((val, j) => (
                        <td key={j} className="px-5 py-3 text-sm text-surface-700 whitespace-nowrap">
                          {val || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
