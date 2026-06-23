import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import dashboardService from '../services/dashboardService';
import {
  Users,
  CalendarClock,
  CalendarDays,
  CalendarCheck2,
  MessageCircle,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (err) {
      console.error('Dashboard load error:', err);
      setStats({
        total_customers: 0,
        due_today: 0,
        due_this_week: 0,
        due_this_month: 0,
        reminders_sent: 0,
        recent_customers: [],
      });
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    {
      key: 'total_customers',
      label: 'Total Customers',
      icon: Users,
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      ring: 'ring-blue-100',
      onClick: () => navigate('/customers'),
    },
    {
      key: 'due_this_month',
      label: 'Due This Month',
      icon: CalendarDays,
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
      ring: 'ring-violet-100',
      onClick: () => navigate('/reminders?filter=month'),
    },
    {
      key: 'due_this_week',
      label: 'Due This Week',
      icon: CalendarCheck2,
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      ring: 'ring-amber-100',
      onClick: () => navigate('/reminders?filter=week'),
    },
    {
      key: 'due_today',
      label: 'Due Today',
      icon: CalendarClock,
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      text: 'text-red-600',
      ring: 'ring-red-100',
      onClick: () => navigate('/reminders?filter=today'),
    },
    {
      key: 'reminders_sent',
      label: 'Reminders Sent',
      icon: MessageCircle,
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
      ring: 'ring-emerald-100',
      onClick: () => navigate('/reminders'),
    },
  ];

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const getReminderStatus = (dateStr) => {
    if (!dateStr) return null;
    const today = new Date().toISOString().slice(0, 10);
    if (dateStr < today) return { label: 'Overdue', cls: 'badge-danger' };
    if (dateStr === today) return { label: 'Today', cls: 'badge-warning' };
    return { label: 'Upcoming', cls: 'badge-success' };
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-in">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="stat-card">
              <div className="h-10 w-10 bg-surface-100 rounded-lg mb-4 animate-pulse" />
              <div className="h-8 w-16 bg-surface-100 rounded mb-2 animate-pulse" />
              <div className="h-4 w-24 bg-surface-100 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">
            Welcome back, {user?.full_name?.split(' ')[0]} 👋
          </h1>
          <p className="text-surface-500 text-sm mt-1">
            Here's your service overview for today.
          </p>
        </div>
        <button
          onClick={() => navigate('/reminders')}
          className="btn-primary flex items-center gap-2 text-sm"
        >
          <MessageCircle className="w-4 h-4" />
          Send Reminders
        </button>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          const value = stats?.[card.key] ?? 0;
          return (
            <button
              key={card.key}
              onClick={card.onClick}
              className="stat-card text-left group cursor-pointer hover:ring-2 hover:ring-offset-1"
              style={{ animationDelay: `${idx * 60}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`w-11 h-11 ${card.bg} rounded-xl flex items-center justify-center transition-transform duration-200 group-hover:scale-110`}>
                  <Icon className={`w-5 h-5 ${card.text}`} />
                </div>
                <TrendingUp className="w-4 h-4 text-surface-200 group-hover:text-surface-400 transition-colors" />
              </div>
              <p className="text-3xl font-bold text-surface-900 tabular-nums">{value}</p>
              <p className="text-sm text-surface-500 mt-1">{card.label}</p>
            </button>
          );
        })}
      </div>

      {/* Recent Customers */}
      <div className="bg-white rounded-xl shadow-card border border-surface-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-100">
          <h3 className="text-sm font-semibold text-surface-900">Recently Added Customers</h3>
          <button
            onClick={() => navigate('/customers')}
            className="text-xs text-primary-600 hover:text-primary-700 font-medium flex items-center gap-1 transition-colors"
          >
            View all <ArrowRight className="w-3 h-3" />
          </button>
        </div>
        <div className="divide-y divide-surface-50">
          {stats?.recent_customers?.length > 0 ? (
            stats.recent_customers.map((c) => {
              const status = getReminderStatus(c.next_reminder_date);
              return (
                <div key={c.id} className="px-5 py-3.5 hover:bg-surface-50/50 transition-colors flex items-center gap-4">
                  <div className="w-9 h-9 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">
                      {c.name?.charAt(0)?.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-surface-800 truncate">{c.name}</p>
                    <p className="text-xs text-surface-400">{c.phone} {c.service_type ? `· ${c.service_type}` : ''}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-surface-400">{formatDate(c.next_reminder_date)}</p>
                    {status && (
                      <span className={`${status.cls} mt-1`}>{status.label}</span>
                    )}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <Users className="w-10 h-10 text-surface-200 mb-3" />
              <p className="text-sm text-surface-400">No customers yet.</p>
              <button
                onClick={() => navigate('/customers')}
                className="mt-3 text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Add your first customer →
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Add Customer', desc: 'Register a new customer', path: '/customers', color: 'text-blue-600 bg-blue-50', icon: Users },
          { label: 'WhatsApp Reminders', desc: 'View & send due reminders', path: '/reminders', color: 'text-green-600 bg-green-50', icon: MessageCircle },
          { label: 'View Reports', desc: 'Generate business reports', path: '/reports', color: 'text-violet-600 bg-violet-50', icon: CalendarDays },
        ].map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-xl p-5 shadow-card border border-surface-100 hover:shadow-card-hover hover:border-surface-200 transition-all duration-200 text-left group"
            >
              <div className={`w-10 h-10 ${action.color} rounded-lg flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-surface-800">{action.label}</p>
              <p className="text-xs text-surface-400 mt-0.5">{action.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
