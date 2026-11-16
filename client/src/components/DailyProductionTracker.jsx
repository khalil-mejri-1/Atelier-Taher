import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Coins, 
  Package, 
  Users, 
  Clock, 
  RefreshCw, 
  AlertCircle,
  Layers,
  CheckCircle2,
  TrendingUp,
  Image as ImageIcon
} from 'lucide-react';
import { logsApi } from '../api';

export default function DailyProductionTracker({ onPreviewImage }) {
  // Format today's date YYYY-MM-DD
  const getTodayString = () => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [selectedWorkerId, setSelectedWorkerId] = useState('all');
  const [data, setData] = useState({
    date: getTodayString(),
    totalQuantity: 0,
    totalEarnings: 0,
    activeWorkersCount: 0,
    workersSummary: [],
    allWorkers: [],
    logs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadDailyReport = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await logsApi.getDailyProduction(selectedDate, selectedWorkerId);
      setData(res);
    } catch (err) {
      console.error('Erreur chargement rapport journalier :', err);
      setError('Impossible de charger les données pour cette date');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDailyReport();
  }, [selectedDate, selectedWorkerId]);

  // Navigate Days (-1, +1, or Today)
  const shiftDate = (days) => {
    const parts = selectedDate.split('-');
    const current = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    current.setDate(current.getDate() + days);
    const yyyy = current.getFullYear();
    const mm = String(current.getMonth() + 1).padStart(2, '0');
    const dd = String(current.getDate()).padStart(2, '0');
    setSelectedDate(`${yyyy}-${mm}-${dd}`);
  };

  // Human readable date in French
  const getFormattedDateLabel = (dateStr) => {
    try {
      const parts = dateStr.split('-');
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const isToday = selectedDate === getTodayString();

  return (
    <div className="space-y-4">
      {/* Date & Filter Control Bar */}
      <div className="bg-white rounded-2xl p-3 sm:p-4 border border-[#E2E8F0] shadow-xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          
          {/* Date Navigator */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => shiftDate(-1)}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-black rounded-lg transition-colors cursor-pointer"
                title="Jour précédent (-1)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <button
                onClick={() => setSelectedDate(getTodayString())}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  isToday ? 'bg-[#0F172A] text-white shadow-2xs' : 'text-slate-600 hover:text-black hover:bg-white'
                }`}
              >
                Aujourd'hui
              </button>

              <button
                onClick={() => shiftDate(1)}
                className="p-1.5 hover:bg-white text-slate-600 hover:text-black rounded-lg transition-colors cursor-pointer"
                title="Jour suivant (+1)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Date Input */}
            <div className="relative flex items-center">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="pl-8 pr-3 py-1.5 text-xs font-semibold bg-[#F8F9FA] border border-[#E2E8F0] rounded-xl text-slate-800 focus:outline-hidden focus:border-slate-800 cursor-pointer"
              />
            </div>

            <span className="text-xs font-bold text-slate-700 capitalize hidden lg:inline">
              📅 {getFormattedDateLabel(selectedDate)}
            </span>
          </div>

          {/* Worker Filter & Refresh */}
          <div className="flex items-center gap-2">
            <select
              value={selectedWorkerId}
              onChange={(e) => setSelectedWorkerId(e.target.value)}
              className="flex-1 sm:flex-initial px-3 py-2 text-xs border border-[#E2E8F0] rounded-xl bg-[#F8F9FA] focus:outline-hidden focus:border-slate-800 font-semibold text-slate-700 min-w-[180px]"
            >
              <option value="all">👷 Tous les ouvriers</option>
              {(data.allWorkers || []).map((w) => (
                <option key={w._id} value={w._id}>
                  {w.name}
                </option>
              ))}
            </select>

            <button
              onClick={loadDailyReport}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer shrink-0"
              title="Actualiser le rapport"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

        </div>
      </div>

      {/* KPI Cards for the Selected Day */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {/* Total Pieces Produced */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Pièces Produites Ce Jour
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-[#0F172A]">
                {data.totalQuantity || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">pièces au total</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              {isToday ? 'En direct aujourd’hui' : `Le ${selectedDate}`}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Total Worker Remuneration / Earnings */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[11px] font-semibold text-emerald-600 uppercase tracking-wider block mb-0.5">
              Gains Cumulés des Ouvriers
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-emerald-600">
                {(data.totalEarnings || 0).toFixed(3)}
              </span>
              <span className="text-xs text-emerald-700 font-bold">DT (TND)</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Montant calculé selon le tarif de chaque pièce
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <Coins className="w-6 h-6" />
          </div>
        </div>

        {/* Active Workers Today */}
        <div className="bg-white rounded-2xl p-4 border border-[#E2E8F0] shadow-xs flex items-center justify-between sm:col-span-2 lg:col-span-1">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
              Ouvriers Ayant Produit
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold font-mono text-slate-800">
                {data.activeWorkersCount || 0}
              </span>
              <span className="text-xs text-slate-500 font-medium">ouvrier(s) actif(s)</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">
              Sur {data.allWorkers?.length || 0} ouvriers inscrits
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-[#E2E8F0] text-slate-400 text-xs">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-400" />
          <span>Chargement du relevé de production du {selectedDate}...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl border border-red-200 text-center text-xs">
          <AlertCircle className="w-6 h-6 mx-auto mb-1 text-red-500" />
          <span>{error}</span>
        </div>
      ) : (data.workersSummary || []).length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-[#E2E8F0] max-w-lg mx-auto">
          <Layers className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-800 text-sm mb-1">
            Aucune production enregistrée pour cette date
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Aucun ouvrier n'a enregistré de pièces pour le {getFormattedDateLabel(selectedDate)}.
          </p>
          <button
            onClick={() => setSelectedDate(getTodayString())}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
          >
            Revenir à aujourd'hui
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          
          {/* SECTION 1: Summary Table by Worker */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-3.5 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Répartition par Ouvrier (Gains & Quantités)
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {data.workersSummary.length} ouvrier(s)
              </span>
            </div>

            <div className="divide-y divide-slate-100">
              {data.workersSummary.map((worker) => (
                <div key={worker.worker_id || worker.worker_name} className="p-4 hover:bg-slate-50/70 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold text-xs flex items-center justify-center shrink-0">
                        {worker.worker_name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900 leading-tight">
                          {worker.worker_name}
                        </h4>
                        <span className="text-[10px] text-slate-400 font-medium">
                          Identifiant : {worker.worker_id || 'N/A'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-medium">Quantité totale</span>
                        <span className="font-mono text-xs sm:text-sm font-extrabold text-slate-800">
                          {worker.total_pieces} pièces
                        </span>
                      </div>

                      <div className="text-right pl-3 border-l border-slate-200">
                        <span className="text-[10px] text-emerald-600 block font-medium">Gains pour ce jour</span>
                        <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-600">
                          {worker.total_earned.toFixed(3)} DT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Breakdown of Patterns produced by this worker */}
                  <div className="bg-[#F8F9FA] rounded-xl p-3 border border-slate-200/80">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                      Détail des modèles produits par {worker.worker_name} :
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                      {worker.patterns_breakdown.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-white p-2.5 rounded-lg border border-slate-200 flex items-center justify-between gap-2 shadow-2xs"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[9px] font-bold text-slate-700 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 inline-block mb-0.5">
                              {item.pattern_sku || 'PAT'}
                            </span>
                            <div className="text-xs font-semibold text-slate-800 truncate" title={item.pattern_name}>
                              {item.pattern_name}
                            </div>
                            <span className="text-[10px] text-slate-400">
                              Tarif : {parseFloat(item.unit_price || 0).toFixed(3)} DT/u
                            </span>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-mono text-xs font-bold text-slate-900 block">
                              × {item.quantity} pcs
                            </span>
                            <span className="font-mono text-xs font-bold text-emerald-600 block">
                              {parseFloat(item.total_amount || 0).toFixed(3)} DT
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>

          {/* SECTION 2: Chronological Production Log Table */}
          <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-xs overflow-hidden">
            <div className="p-3.5 bg-[#F8F9FA] border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-700" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Journal Chronologique de Production du {selectedDate}
                </h3>
              </div>
              <span className="text-[11px] font-semibold text-slate-400">
                {data.logs.length} opération(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[11px] uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3 w-20">Heure</th>
                    <th className="py-2.5 px-3 min-w-[140px]">Ouvrier</th>
                    <th className="py-2.5 px-3 min-w-[180px]">Modèle / Patron</th>
                    <th className="py-2.5 px-3 text-center w-24">Quantité</th>
                    <th className="py-2.5 px-3 text-center w-28">Tarif / Pièce</th>
                    <th className="py-2.5 px-4 text-right min-w-[120px]">Montant Ajouté</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.logs.map((log) => {
                    const timeStr = new Date(log.created_at).toLocaleTimeString('fr-FR', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    });

                    const unitRate = typeof log.unit_price === 'number' ? log.unit_price : (log.pattern_id?.price || 0);
                    const totalGain = typeof log.total_price === 'number'
                      ? log.total_price
                      : (log.quantity_changed * unitRate);

                    return (
                      <tr key={log._id} className="hover:bg-slate-50/70 transition-colors">
                        {/* Time */}
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {timeStr}
                        </td>

                        {/* Worker */}
                        <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                          {log.user_name}
                        </td>

                        {/* Pattern */}
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {log.pattern_id?.image_url && (
                              <img
                                src={log.pattern_id.image_url}
                                alt=""
                                onClick={() =>
                                  onPreviewImage &&
                                  onPreviewImage({
                                    url: log.pattern_id.image_url,
                                    title: log.pattern_name,
                                    sku: log.pattern_sku,
                                  })
                                }
                                className="w-7 h-7 rounded object-cover border border-slate-200 shrink-0 cursor-pointer hover:scale-110 transition-transform"
                              />
                            )}
                            <div className="min-w-0">
                              <span className="font-mono text-[9px] font-bold text-slate-600 bg-slate-100 px-1 py-0.2 rounded border border-slate-200 inline-block mr-1">
                                {log.pattern_sku || 'PAT'}
                              </span>
                              <span className="font-semibold text-slate-800 text-xs">
                                {log.pattern_name}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            +{log.quantity_changed}
                          </span>
                        </td>

                        {/* Unit price */}
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600 whitespace-nowrap">
                          {unitRate.toFixed(3)} DT
                        </td>

                        {/* Total Gain */}
                        <td className="py-2.5 px-4 text-right font-mono font-bold text-emerald-600 whitespace-nowrap">
                          +{totalGain.toFixed(3)} DT
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

