import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dashboardService from '../services/dashboardService';
import LoadingSkeleton from '../components/ui/LoadingSkeleton';
import {
  Users,
  UserCheck,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  UserCog,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale, LinearScale, BarElement, LineElement,
  PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

const statCards = [
  { key: 'total_customers', label: 'Total Customers', icon: Users, color: 'from-blue-500 to-blue-600', bg: 'bg-blue-50', text: 'text-blue-600' },
  { key: 'active_customers', label: 'Active Customers', icon: UserCheck, color: 'from-emerald-500 to-emerald-600', bg: 'bg-emerald-50', text: 'text-emerald-600' },
  { key: 'due_today', label: 'Due Today', icon: CalendarClock, color: 'from-amber-500 to-amber-600', bg: 'bg-amber-50', text: 'text-amber-600' },
  { key: 'due_this_week', label: 'Due This Week', icon: CalendarDays, color: 'from-violet-500 to-violet-600', bg: 'bg-violet-50', text: 'text-violet-600' },
  { key: 'completed_services', label: 'Completed', icon: CheckCircle2, color: 'from-green-500 to-green-600', bg: 'bg-green-50', text: 'text-green-600' },
  { key: 'total_technicians', label: 'Technicians', icon: UserCog, color: 'from-indigo-500 to-indigo-600', bg: 'bg-indigo-50', text: 'text-indigo-600' },
  { key: 'pending_services', label: 'Pending', icon: Clock, color: 'from-orange-500 to-orange-600', bg: 'bg-orange-50', text: 'text-orange-600' },
  { key: 'overdue_services', label: 'Overdue', icon: AlertTriangle, color: 'from-red-500 to-red-600', bg: 'bg-red-50', text: 'text-red-600' },
];

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [charts, setCharts] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const [statsData, chartsData] = await Promise.all([
        dashboardService.getStats(),
        dashboardService.getCharts(),
      ]);
      setStats(statsData);
      setCharts(chartsData);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: 'badge-warning',
      assigned: 'badge-primary',
      in_progress: 'badge-primary',
      completed: 'badge-success',
      cancelled: 'badge-danger',
    };
    return map[status] || 'badge-neutral';
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">Dashboard</h1>
          <p className="text-surface-500 text-sm mt-1">Loading your overview...</p>
        </div>
        <LoadingSkeleton type="card" count={8} />
        <LoadingSkeleton type="table" count={5} />
      </div>
    );
  }

  // Chart data
  const monthlyServicesData = {
    labels: charts?.monthly_services?.map((m) => m._id || '') || [],
    datasets: [
      {
        label: 'Services',
        data: charts?.monthly_services?.map((m) => m.count) || [],
        backgroundColor: 'rgba(99, 102, 241, 0.8)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 6,
        borderSkipped: false,
      },
    ],
  };

  const serviceTypeData = {
    labels: charts?.service_type_distribution?.map((t) => t.name || 'Unknown') || [],
    datasets: [
      {
        data: charts?.service_type_distribution?.map((t) => t.count) || [],
        backgroundColor: [
          '#6366f1', '#8b5cf6', '#a855f7', '#d946ef',
          '#ec4899', '#f43f5e', '#f97316', '#eab308',
          '#22c55e', '#14b8a6',
        ],
        borderWidth: 0,
        hoverOffset: 4,
      },
    ],
  };

  const customerGrowthData = {
    labels: charts?.customer_growth?.map((c) => c._id || '') || [],
    datasets: [
      {
        label: 'New Customers',
        data: charts?.customer_growth?.map((c) => c.count) || [],
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
        pointBackgroundColor: '#22c55e',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
      },
    ],
  };

  const statusData = {
    labels: charts?.status_distribution?.map((s) => s._id || '') || [],
    datasets: [
      {
        data: charts?.status_distribution?.map((s) => s.count) || [],
        backgroundColor: ['#f59e0b', '#6366f1', '#3b82f6', '#22c55e', '#ef4444'],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#334155',
        borderWidth: 1,
        cornerRadius: 8,
        padding: 12,
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
      y: {
        grid: { color: '#f1f5f9' },
        ticks: { color: '#94a3b8', font: { size: 11 } },
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: { padding: 16, usePointStyle: true, pointStyle: 'circle', font: { size: 11 } },
      },
    },
  };

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-surface-900">
          Welcome back, {user?.full_name?.split(' ')[0]} 👋
        </h1>
        <p className="text-surface-500 text-sm mt-1">
          Here's what's happening with your services today.
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          return (
            <div
              key={card.key}
              className="stat-card group"
              style={{ animationDelay: `${idx * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
                <ArrowUpRight className="w-4 h-4 text-surface-300 group-hover:text-surface-500 transition-colors" />
              </div>
              <p className="text-2xl font-bold text-surface-900">{value}</p>
              <p className="text-sm text-surface-500 mt-0.5">{card.label}</p>
            </div>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Services */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-base font-semibold text-surface-900 mb-4">Monthly Service Trend</h3>
          <div className="h-64">
            <Bar data={monthlyServicesData} options={chartOptions} />
          </div>
        </div>

        {/* Service Type Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-base font-semibold text-surface-900 mb-4">Service Type Distribution</h3>
          <div className="h-64">
            <Doughnut data={serviceTypeData} options={doughnutOptions} />
          </div>
        </div>

        {/* Customer Growth */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-base font-semibold text-surface-900 mb-4">Customer Growth</h3>
          <div className="h-64">
            <Line data={customerGrowthData} options={chartOptions} />
          </div>
        </div>

        {/* Status Distribution */}
        <div className="bg-white rounded-xl p-6 shadow-card border border-surface-100">
          <h3 className="text-base font-semibold text-surface-900 mb-4">Completed vs Pending</h3>
          <div className="h-64">
            <Doughnut data={statusData} options={doughnutOptions} />
          </div>
        </div>
      </div>

      {/* Recent Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Customers */}
        <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Recent Customers</h3>
            <button
              onClick={() => navigate('/customers')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-surface-50">
            {charts?.recent_customers?.length > 0 ? (
              charts.recent_customers.map((c) => (
                <div key={c.id} className="px-5 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-bold text-primary-600">
                        {c.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">{c.name}</p>
                      <p className="text-xs text-surface-400">{c.mobile} · {c.city}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-surface-400 text-center">No customers yet</p>
            )}
          </div>
        </div>

        {/* Recent Services */}
        <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Recent Services</h3>
            <button
              onClick={() => navigate('/services')}
              className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>
          <div className="divide-y divide-surface-50">
            {charts?.recent_services?.length > 0 ? (
              charts.recent_services.map((s) => (
                <div key={s.id} className="px-5 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">
                        {s.customer_name || s.service_id}
                      </p>
                      <p className="text-xs text-surface-400">{s.service_date}</p>
                    </div>
                    <span className={getStatusBadge(s.status)}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-surface-400 text-center">No services yet</p>
            )}
          </div>
        </div>

        {/* Upcoming Services */}
        <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
            <h3 className="text-sm font-semibold text-surface-900">Upcoming Services</h3>
          </div>
          <div className="divide-y divide-surface-50">
            {charts?.upcoming_services?.length > 0 ? (
              charts.upcoming_services.map((s) => (
                <div key={s.id} className="px-5 py-3 hover:bg-surface-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-surface-800 truncate">
                        {s.customer_name || s.service_id}
                      </p>
                      <p className="text-xs text-surface-400">{s.service_date}</p>
                    </div>
                    <span className={getStatusBadge(s.status)}>
                      {s.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-8 text-sm text-surface-400 text-center">No upcoming services</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
