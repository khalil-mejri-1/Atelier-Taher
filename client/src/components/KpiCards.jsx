import React from 'react';
import { Layers, TrendingUp, AlertTriangle, PackageCheck } from 'lucide-react';

export default function KpiCards({ stats, onFilterLowStock, isFilteringLowStock }) {
  const {
    totalStock = 0,
    producedToday = 0,
    lowStockCount = 0,
    deductedToday = 0,
    totalPatterns = 0,
  } = stats || {};

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mb-3 sm:mb-4">
      
      {/* 1. Total Patrons en Stock */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-[#E2E8F0] shadow-2xs relative overflow-hidden transition-all hover:border-slate-300">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">Total en stock</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
            <Layers className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-2xl font-black text-[#0F172A] tracking-tight">
            {totalStock.toLocaleString('fr-FR')}
          </span>
          <span className="text-[10px] text-slate-400">pcs</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
          <span className="truncate">{totalPatterns} modèles</span>
          <span className="font-sku text-[8px] sm:text-[9px] text-slate-400 shrink-0">TOTAL</span>
        </div>
      </div>

      {/* 2. Produits Aujourd'hui */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-[#E2E8F0] shadow-2xs relative overflow-hidden transition-all hover:border-slate-300">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">Produits auj.</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#F0FDF4] flex items-center justify-center text-[#15803D] border border-green-200 shrink-0">
            <TrendingUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-2xl font-black text-[#15803D] tracking-tight">
            +{producedToday.toLocaleString('fr-FR')}
          </span>
          <span className="text-[10px] text-emerald-600 font-medium">coupés</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
          <span className="text-emerald-700 font-medium truncate">Atelier direct</span>
          <span className="font-sku text-[8px] sm:text-[9px] text-slate-400 shrink-0">PROD</span>
        </div>
      </div>

      {/* 3. Stock Faible */}
      <div 
        onClick={onFilterLowStock}
        role="button"
        tabIndex={0}
        title="Cliquer pour filtrer uniquement les modèles en stock faible"
        className={`bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border shadow-2xs relative overflow-hidden cursor-pointer transition-all ${
          isFilteringLowStock 
            ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/20' 
            : 'border-[#E2E8F0] hover:border-amber-300'
        }`}
      >
        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
          <div className="flex items-center gap-1 min-w-0">
            <span className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">Stock faible</span>
            {isFilteringLowStock && (
              <span className="text-[8px] bg-amber-200 text-amber-900 px-1 py-0.2 rounded font-medium shrink-0">Actif</span>
            )}
          </div>
          <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center border shrink-0 ${
            lowStockCount > 0 
              ? 'bg-[#FFFBEB] text-[#B45309] border-amber-200' 
              : 'bg-slate-100 text-slate-400 border-slate-200'
          }`}>
            <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-lg sm:text-2xl font-black tracking-tight ${
            lowStockCount > 0 ? 'text-[#B45309]' : 'text-slate-700'
          }`}>
            {lowStockCount.toLocaleString('fr-FR')}
          </span>
          <span className="text-[10px] text-amber-700 font-medium">alertes</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
          <span className="text-amber-800 truncate">Sécurité</span>
          <span className="font-sku text-[8px] sm:text-[9px] text-slate-400 shrink-0">ALERT</span>
        </div>
      </div>

      {/* 4. Commandes Expédiées Aujourd'hui */}
      <div className="bg-white rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 border border-[#E2E8F0] shadow-2xs relative overflow-hidden transition-all hover:border-slate-300">
        <div className="flex items-center justify-between mb-1 sm:mb-1.5">
          <span className="text-[10px] sm:text-xs font-semibold text-slate-500 truncate">Expédiées auj.</span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FEF2F2] flex items-center justify-center text-[#B91C1C] border border-red-200 shrink-0">
            <PackageCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </div>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-lg sm:text-2xl font-black text-[#B91C1C] tracking-tight">
            -{deductedToday.toLocaleString('fr-FR')}
          </span>
          <span className="text-[10px] text-red-600 font-medium">pièces</span>
        </div>
        <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[9px] sm:text-[10px] text-slate-400">
          <span className="text-slate-600 truncate">Clients</span>
          <span className="font-sku text-[8px] sm:text-[9px] text-slate-400 shrink-0">OUT</span>
        </div>
      </div>

    </div>
  );
}
