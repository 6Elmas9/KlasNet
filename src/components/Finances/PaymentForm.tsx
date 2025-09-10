import { useState } from 'react';
import { db } from '../../utils/database';
import { Eleve, Classe } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { processPayment } from '../../utils/payments';
import { computeScheduleForEleve } from '../../utils/payments';

type Props = {
  onCancel: () => void;
  onSubmit: (eleveId: string, montant: number, type: string, modalite: number | 'auto', paiement?: any) => void;
};

export default function PaymentForm({ onCancel, onSubmit }: Props) {
  const classes = db.getAll<Classe>('classes');
  const [selectedClasse, setSelectedClasse] = useState<string>('');
  const [eleveId, setEleveId] = useState<string | ''>('');
  const [montant, setMontant] = useState<string>('');
  const [type, setType] = useState<string>('scolarite');
  const [modalite, setModalite] = useState<number | 'auto'>('auto');
  const [mode, setMode] = useState<'espece' | 'mobile' | 'cheque' | 'virement'>('espece');
  const [note, setNote] = useState<string>('');
  const { showToast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const generateNumeroRecu = () => 'REC' + Date.now().toString().slice(-8);

  // auto-select modalite: pick first unpaid échéance modalite if available
  const onEleveChange = (id: string) => {
    setEleveId(id);
    try {
      const schedule = computeScheduleForEleve(id);
      const firstDue = schedule.find(s => s.remaining > 0);
      if (firstDue) {
        // attempt to parse modality from echeanceId suffix (stable IDs used in seed)
        const parts = String(firstDue.echeanceId).split('-');
        const last = parts[parts.length - 1];
        const n = Number(last);
        if (Number.isFinite(n) && n >= 1 && n <= 7) setModalite(n);
      }
    } catch (err) { console.debug('compute schedule failed', err); }
  };

  const onClasseChange = (id: string) => {
    setSelectedClasse(id);
    // select first eleve of this classe if present
    const list = db.getAll<Eleve>('eleves').filter(x => !id || x.classeId === id);
    if (list.length) {
      onEleveChange(list[0].id);
    } else {
      setEleveId('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-2xl font-bold text-gray-900">💰 Nouveau Paiement</h3>
          <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={onCancel}>✕</button>
        </div>
        
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Classe</label>
            <select 
              value={selectedClasse} 
              onChange={e => onClasseChange(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
            >
              <option value="">-- Toutes les classes --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.niveau} {c.section}</option>)}
            </select>

            <label className="block text-sm font-semibold text-gray-700 mb-2 mt-4">Élève</label>
            <select 
              value={eleveId} 
              onChange={e => onEleveChange(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
            >
              <option value="">-- Sélectionner élève --</option>
              {db.getAll<Eleve>('eleves').filter(el => !selectedClasse || el.classeId === selectedClasse).map(el => <option key={el.id} value={el.id}>{el.nom} {el.prenoms} ({el.matricule})</option>)}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Montant (FCFA)</label>
            <input 
              type="number" 
              value={montant} 
              onChange={e => setMontant(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all text-lg font-bold"
              placeholder="0"
            />
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Type de frais</label>
            <select 
              value={type} 
              onChange={e => setType(e.target.value)} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
            >
              <option value="scolarite">Scolarité</option>
              <option value="inscription">Inscription</option>
              <option value="cantine">Cantine</option>
              <option value="transport">Transport</option>
              <option value="fournitures">Fournitures</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Modalité de versement</label>
            <select 
              value={String(modalite)} 
              onChange={e => setModalite(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} 
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
            >
              <option value="auto">Auto</option>
              <option value={1}>1️⃣ Inscription</option>
              <option value={2}>2️⃣ Versement 1</option>
              <option value={3}>3️⃣ Versement 2</option>
              <option value={4}>4️⃣ Versement 3</option>
              <option value={5}>5️⃣ Versement 4</option>
              <option value={6}>6️⃣ Versement 5</option>
              <option value={7}>7️⃣ Versement 6</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mode de paiement</label>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 lg:gap-3">
              {[
                { value: 'espece', label: '💵 Espèces', color: 'green' },
                { value: 'mobile', label: '📱 Mobile Money', color: 'blue' },
                { value: 'cheque', label: '📄 Chèque', color: 'purple' },
                { value: 'virement', label: '🏦 Virement', color: 'indigo' }
              ].map(modeOption => (
                <label key={modeOption.value} className={`flex items-center justify-center p-2 lg:p-3 border-2 rounded-xl cursor-pointer transition-all ${
                  mode === modeOption.value 
                    ? `border-${modeOption.color}-500 bg-${modeOption.color}-50 text-${modeOption.color}-700` 
                    : 'border-gray-200 hover:border-gray-300'
                }`}>
                  <input
                    type="radio"
                    name="mode"
                    value={modeOption.value}
                    checked={mode === modeOption.value}
                    onChange={(e) => setMode(e.target.value as any)}
                    className="sr-only"
                  />
                  <span className="font-medium text-xs lg:text-sm">{modeOption.label}</span>
                </label>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Note ou commentaire (optionnel)</label>
            <textarea 
              value={note} 
              onChange={e => setNote(e.target.value)} 
              className="w-full px-3 lg:px-4 py-2 lg:py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all resize-none text-sm lg:text-base" 
              rows={3}
              placeholder="Commentaire sur ce paiement..."
            />
          </div>
          
          <div className="flex flex-col sm:flex-row justify-end gap-2 lg:gap-4 pt-4 lg:pt-6 border-t border-gray-200">
            <button 
              className="w-full sm:w-auto px-4 lg:px-6 py-2 lg:py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-semibold" 
              onClick={onCancel} 
              disabled={isSaving}
            >
              Annuler
            </button>
            <button 
              className="w-full sm:w-auto flex items-center justify-center space-x-2 px-4 lg:px-6 py-2 lg:py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50 font-semibold shadow-lg" 
              onClick={async () => {
              if (!eleveId) { showToast('Sélectionnez un élève', 'error'); return; }
              const m = Number(montant || 0);
              if (!m || m <= 0) { showToast('Montant invalide', 'error'); return; }
              setIsSaving(true);
              const numeroRecu = generateNumeroRecu();
              try {
                const meta = { mode, note, numeroRecu, type, modalite } as Record<string, unknown>;
                // include current user if available
                try { const { getCurrentUser } = await import('../../utils/auth'); const cur = getCurrentUser(); if (cur) meta.utilisateur = `${cur.prenoms} ${cur.nom}`; } catch (err) { console.debug('getCurrentUser failed', err); }
                const res = processPayment(eleveId, m, new Date().toISOString(), meta);
                // add historique with current user
                try {
                  const cur = (await import('../../utils/auth')).getCurrentUser();
                  const r = res as ProcessPaymentResult;
                  const paiementId = r && r.paiement && r.paiement.id ? String(r.paiement.id) : undefined;
                  db.addHistorique({ type: 'paiement', cible: 'Paiement', cibleId: paiementId, description: `Paiement de ${m} FCFA pour élève ${eleveId} (reçu ${meta.numeroRecu})`, utilisateur: cur ? `${cur.prenoms} ${cur.nom}` : 'Inconnu' });
                } catch (err) { console.debug('historique skip:', err); }
                // show preview in new window
                try {
                  const eleve = db.getById<Eleve>('eleves', eleveId);
                  const html = `
                    <html><head><title>Reçu ${meta.numeroRecu}</title></head><body>
                      <h2>Reçu de paiement</h2>
                      <div>Reçu: ${meta.numeroRecu}</div>
                      <div>Élève: ${eleve?.nom} ${eleve?.prenoms} (${eleve?.matricule})</div>
                      <div>Montant: ${m} FCFA</div>
                      <div>Mode: ${meta.mode}</div>
                      <div>Date: ${new Date().toLocaleString()}</div>
                    </body></html>`;
                  const w = window.open('', '_blank', 'width=600,height=800');
                  if (w) {
                    w.document.write(html);
                    w.document.close();
                    // trigger print automatically
                    setTimeout(() => { try { w.print(); } catch (err) { console.debug('print failed', err); } }, 300);
                  }
                } catch (err) { console.debug('preview failed', err); }
                // call parent handler for compatibility
                try { onSubmit(eleveId, m, type, modalite, res.paiement); } catch (err) { console.debug('onSubmit handler error', err); }
                showToast('Paiement enregistré', 'success');
                onCancel();
              } catch (err) {
                console.error(err);
                showToast('Erreur lors de l\'enregistrement du paiement', 'error');
              } finally {
                setIsSaving(false);
              }
            }} 
            disabled={isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 lg:h-5 lg:w-5 border-b-2 border-white"></div>
              ) : (
                <span>💾</span>
              )}
              <span className="text-sm lg:text-base">{isSaving ? 'Enregistrement...' : 'Enregistrer le paiement'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
