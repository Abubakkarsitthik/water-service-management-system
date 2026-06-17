import { FileX } from 'lucide-react';

export default function EmptyState({ title, description, icon: Icon = FileX, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-surface-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-surface-400" />
      </div>
      <h3 className="text-lg font-semibold text-surface-700 mb-1">{title}</h3>
      <p className="text-sm text-surface-400 text-center max-w-sm mb-6">
        {description}
      </p>
      {action && action}
    </div>
  );
}
