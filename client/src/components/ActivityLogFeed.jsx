import React, { useState } from 'react';
import { 
  TrendingUp, 
  PackageMinus, 
  Undo2, 
  Search, 
  Clock,
  Layers
} from 'lucide-react';

function formatFrenchRelativeTime(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now - date) / 1000);

  if (diffInSeconds < 30) return "à l'instant";
  if (diffInSeconds < 60) return `il y a ${diffInSeconds}s`;
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes === 1) return 'il y a 1 minute';
  if (diffInMinutes < 60) return `il y a ${diffInMinutes} minutes`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours === 1) return 'il y a 1 heure';
  if (diffInHours < 24) return `il y a ${diffInHours} heures`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays === 1) return 'hier';
  if (diffInDays === 2) return 'il y a 2 jours';
  return `il y a ${diffInDays} jours`;
}

export default function ActivityLogFeed({ logs = [] }) {
  const [filterType, setFilterType] = useState('all');
  const [search, setSearch] = useState('');

  const filteredLogs = logs.filter((log) => {
    if (filterType === 'production') {
      if (!log.action_type?.startsWith('production')) return false;
    } else if (filterType === 'order') {
      if (log.action_type !== 'order_deduct') return false;
    } else if (filterType === 'admin') {
      if (!['pattern_create', 'pattern_update', 'pattern_delete', 'stock_bulk_adjust', 'user_create', 'user_status'].includes(log.action_type)) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = log.pattern_name?.toLowerCase().includes(q);
      const matchSku = log.pattern_sku?.toLowerCase().includes(q);
      const matchUser = log.user_name?.toLowerCase().includes(q);
      const matchNotes = log.notes?.toLowerCase().includes(q);
      return matchName || matchSku || matchUser || matchNotes;
    }
    return true;
  });

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
      
      {/* Header & Controls */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-[#0F172A]">Journal d'activité & Audit en direct</h3>
            <p className="text-[11px] text-slate-400">Suivi chronologique synchronisé de la production et des expéditions</p>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Filter Pills */}
          <div className="flex items-center gap-1 bg-[#F8F9FA] p-1 rounded-xl border border-slate-200 text-xs">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'all' ? 'bg-white text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Tous
            </button>
            <button
              onClick={() => setFilterType('production')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'production' ? 'bg-[#F0FDF4] text-[#15803D] shadow-xs border border-green-200' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Production
            </button>
            <button
              onClick={() => setFilterType('order')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'order' ? 'bg-[#FEF2F2] text-[#B91C1C] shadow-xs border border-red-200' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Commandes
            </button>
            <button
              onClick={() => setFilterType('admin')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                filterType === 'admin' ? 'bg-slate-100 text-[#0F172A] shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Admin
            </button>
          </div>

          {/* Search input */}
          <div className="relative flex-1 sm:flex-initial min-w-[120px]">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="pl-8 pr-3 py-1.5 text-xs border border-[#E2E8F0] rounded-xl bg-white focus:outline-hidden focus:border-slate-800 w-full sm:w-44"
            />
          </div>
        </div>
      </div>

      {/* Log Feed Items */}
      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
        {filteredLogs.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            Aucun enregistrement ne correspond au filtre sélectionné
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isProduction = log.action_type === 'production_increment' || log.action_type === 'production_custom';
            const isOrder = log.action_type === 'order_deduct';
            const isUndo = log.action_type === 'production_undo';

            return (
              <div 
                key={log.id} 
                className={`p-2.5 sm:p-3 hover:bg-[#F8F9FA] transition-colors flex items-start justify-between gap-2.5 ${
                  log.undone ? 'opacity-50 line-through' : ''
                }`}
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  
                  {/* Action Icon Badge */}
                  <div className="shrink-0 mt-0.5">
                    {isProduction && (
                      <div className="w-7 h-7 rounded-lg bg-[#F0FDF4] text-[#15803D] border border-green-200 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isOrder && (
                      <div className="w-7 h-7 rounded-lg bg-[#FEF2F2] text-[#B91C1C] border border-red-200 flex items-center justify-center">
                        <PackageMinus className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {isUndo && (
                      <div className="w-7 h-7 rounded-lg bg-[#FFFBEB] text-[#B45309] border border-amber-200 flex items-center justify-center">
                        <Undo2 className="w-3.5 h-3.5" />
                      </div>
                    )}
                    {(!isProduction && !isOrder && !isUndo) && (
                      <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-700 border border-slate-200 flex items-center justify-center">
                        <Layers className="w-3.5 h-3.5" />
                      </div>
                    )}
                  </div>

                  {/* Log Content Description */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-[#0F172A]">
                        {log.user_name}
                      </span>
                      <span className={`text-[9px] px-1 py-0.2 rounded border ${
                        log.user_role === 'admin'
                          ? 'bg-slate-50 text-slate-700 border-slate-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}>
                        {log.user_role === 'admin' ? 'Admin' : 'Opérateur'}
                      </span>
                      
                      <span className="text-[11px] text-slate-600">
                        {isProduction && `a enregistré une production pour`}
                        {isOrder && `a déduit la commande pour`}
                        {isUndo && `a annulé l’opération pour`}
                        {log.action_type === 'pattern_create' && `a créé le patron`}
                        {log.action_type === 'pattern_update' && `a modifié les détails de`}
                        {log.action_type === 'pattern_delete' && `a supprimé le patron`}
                        {log.action_type === 'stock_bulk_adjust' && `a ajusté le stock groupé de`}
                      </span>

                      {log.pattern_name && (
                        <span className="text-[11px] font-semibold text-[#0F172A]">
                          "{log.pattern_name}"
                        </span>
                      )}

                      {log.pattern_sku && (
                        <span className="text-[9px] font-sku text-slate-400 bg-slate-100 px-1 rounded">
                          {log.pattern_sku}
                        </span>
                      )}
                    </div>

                    {/* Quantity & Stock Details */}
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-500 flex-wrap">
                      {log.notes && (
                        <span className="text-slate-600 text-[10px] bg-slate-50 px-1.5 py-0.2 rounded border border-slate-100">
                          {log.notes}
                        </span>
                      )}

                      {log.previous_stock !== undefined && log.new_stock !== undefined && (
                        <span className="text-[10px] text-slate-400 font-sku">
                          (Stock : {log.previous_stock} → <strong className="text-slate-700">{log.new_stock}</strong>)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right side: Quantity badge + timestamp */}
                <div className="text-right shrink-0 flex flex-col items-end">
                  {log.quantity_changed !== 0 && (
                    <span className={`text-[11px] font-extrabold px-1.5 py-0.2 rounded-md border font-sku ${
                      log.quantity_changed > 0
                        ? 'bg-[#F0FDF4] text-[#15803D] border-green-200'
                        : 'bg-[#FEF2F2] text-[#B91C1C] border-red-200'
                    }`}>
                      {log.quantity_changed > 0 ? `+${log.quantity_changed}` : log.quantity_changed}
                    </span>
                  )}
                  <span className="text-[9px] text-slate-400 mt-0.5 whitespace-nowrap">
                    {formatFrenchRelativeTime(log.created_at)}
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
}
