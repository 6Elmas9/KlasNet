import { useState } from 'react';
import { db } from '../../utils/database';
import { Eleve, Classe, Paiement } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { processPayment } from '../../utils/payments';
import { computeScheduleForEleve } from '../../utils/payments';

type Props = {
  onCancel: () => void;
  // onSubmit may receive the created paiement as fifth optional param
  onSubmit: (eleveId: string, montant: number, type: string, modalite: number | 'auto', paiement?: Paiement) => void;
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
  type ProcessPaymentResult = { paiement?: { id?: string } } | null;

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
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Nouveau paiement</h3>
          <button className="text-gray-500" onClick={onCancel}>✕</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm">Classe</label>
            <select value={selectedClasse} onChange={e => onClasseChange(e.target.value)} className="border rounded px-2 py-1 w-full mb-2">
              <option value="">-- Toutes les classes --</option>
              {classes.map(c => <option key={c.id} value={c.id}>{c.niveau} {c.section}</option>)}
            </select>

            <label className="block text-sm">Élève</label>
            <select value={eleveId} onChange={e => onEleveChange(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="">-- Sélectionner élève --</option>
              {db.getAll<Eleve>('eleves').filter(el => !selectedClasse || el.classeId === selectedClasse).map(el => <option key={el.id} value={el.id}>{el.nom} {el.prenoms} ({el.matricule})</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm">Montant</label>
            <input type="number" value={montant} onChange={e => setMontant(e.target.value)} className="border rounded px-2 py-1 w-full" />
          </div>
          <div>
            <label className="block text-sm">Type</label>
            <select value={type} onChange={e => setType(e.target.value)} className="border rounded px-2 py-1 w-full">
              <option value="scolarite">Scolarité</option>
              <option value="inscription">Inscription</option>
              <option value="cantine">Cantine</option>
            </select>
          </div>
          <div>
            <label className="block text-sm">Modalité</label>
            <select value={String(modalite)} onChange={e => setModalite(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} className="border rounded px-2 py-1 w-full">
              <option value="auto">Auto</option>
              <option value={1}>1</option>
              <option value={2}>2</option>
              <option value={3}>3</option>
              <option value={4}>4</option>
              <option value={5}>5</option>
              <option value={6}>6</option>
              <option value={7}>7</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Mode de paiement</label>
            <select value={mode} onChange={e => setMode(e.target.value as 'espece' | 'mobile' | 'cheque' | 'virement')} className="mt-1 block w-full border rounded px-2 py-1">
              <option value="espece">Espèces</option>
              <option value="mobile">Mobile Money</option>
              <option value="cheque">Chèque</option>
              <option value="virement">Virement</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Note (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} className="mt-1 block w-full border rounded px-2 py-1" rows={2} />
          </div>
          <div className="flex justify-end gap-2">
            <button className="px-3 py-1 bg-gray-200 rounded" onClick={onCancel} disabled={isSaving}>Annuler</button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded disabled:opacity-60" onClick={async () => {
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
                try { const r = res as ProcessPaymentResult; onSubmit(eleveId, m, type, modalite, r?.paiement as Paiement | undefined); } catch (err) { console.debug('onSubmit handler error', err); }
                showToast('Paiement enregistré', 'success');
                onCancel();
              } catch (err) {
                console.error(err);
                showToast('Erreur lors de l\'enregistrement du paiement', 'error');
              } finally {
                setIsSaving(false);
              }
            }} disabled={isSaving}>{isSaving ? 'Enregistrement...' : 'Enregistrer'}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
