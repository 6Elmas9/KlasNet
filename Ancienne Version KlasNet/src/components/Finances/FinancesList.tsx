import React, { useState, useMemo } from 'react';
import { Search, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe } from '../../types';
import EnteteFiche from '../EnteteFiche';
import PaymentForm from './PaymentForm';
import { useToast } from '../Layout/ToastProvider';
import { openPrintPreviewFromElementId } from '../../utils/printPreview';
import { getCurrentUser } from '../../utils/auth';

export default function FinancesList() {
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [refreshKey, setRefreshKey] = React.useState(0);
  const [showPaymentModal, setShowPaymentModal] = React.useState(false);
  const [formMontant, setFormMontant] = React.useState('');
  const [formType, setFormType] = React.useState('scolarite');
  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');

  const [selectedClasse, setSelectedClasse] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const filteredEleves = useMemo(() => {
    let filtered = eleves;
    if (selectedClasse) {
      filtered = filtered.filter(e => e.classeId === selectedClasse);
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nom.toLowerCase().includes(term) ||
        e.prenoms.toLowerCase().includes(term) ||
        e.matricule.toLowerCase().includes(term)
      );
    }
    return filtered;
  }, [eleves, selectedClasse, searchTerm]);

  const [elevePaiement, setElevePaiement] = useState<string | null>(null);
  const [selectedModalite, setSelectedModalite] = useState<number | 'auto'>(1);
  const [showRecuPicker, setShowRecuPicker] = useState(false);
  const [selectedPaiementsIds, setSelectedPaiementsIds] = useState<string[]>([]);
  const { showToast } = useToast();

  // Écouteur global pour navigation depuis d'autres composants (ex: EleveForm)
  React.useEffect(() => {
    const handler = (e: Event) => {
      const ev = e as CustomEvent;
      if (ev?.detail?.page === 'finances') {
        setElevePaiement(ev.detail.eleveId || null);
      }
    };
    window.addEventListener('navigate', handler as EventListener);
    return () => window.removeEventListener('navigate', handler as EventListener);
  }, []);

  // Situation financière calculation removed: we display explicit inscription and versements columns instead

  const getSommeParType = (eleveId: string, type?: string) => {
    const paiementsEleve = paiements.filter(p => p.eleveId === eleveId);
    if (type) {
      return paiementsEleve.filter(p => (p as any).typeFrais === type).reduce((s, p) => s + (p.montant || 0), 0);
    }
    return paiementsEleve.reduce((s, p) => s + (p.montant || 0), 0);
  };

  const getSommeVersementIndex = (eleveId: string, idx: number) => {
  // idx is the versement number displayed to users (V1..Vn).
  // Internally modalité = versementIndex + 1, so map V1 -> modalité 2.
  const modalite = Number(idx) + 1;
  return getSommeParModalite(eleveId, modalite);
  };

  const getTotalPaye = (eleveId: string) => getSommeParType(eleveId);

  // helper: optionally read frais inscription directly from fraisScolaires when needed

  const getInscriptionValue = (eleve: Eleve) => {
    // Show amount actually paid for inscription (paiements de type 'inscription')
    return getSommeParType(eleve.id, 'inscription');
  };

  function getFraisForEleve(eleve: Eleve) {
    const classe = classes.find(c => c.id === eleve.classeId);
    if (!classe) return null;
  const frais = fraisScolaires.find(f => f.niveau === classe.niveau && (f.anneeScolaire === classe.anneeScolaire));
    return frais || null;
  }

  function getTotalAttenduForEleve(eleveId: string) {
    const ele = eleves.find(e => e.id === eleveId);
    if (!ele) return 0;
    const frais = getFraisForEleve(ele) as any;
    if (!frais || !(frais.echeances || []).length) return 0;
    return (frais.echeances || []).reduce((s: number, e: any) => s + Number(e.montant || 0), 0);
  }

  function getSommeParModalite(eleveId: string, modaliteIdx: number) {
    const paiementsEleveAll = paiements.filter(p => p.eleveId === eleveId);

    // modalite 1 = inscription only (and any payment explicitly tagged modalite=1)
    if (Number(modaliteIdx) === 1) {
      const sommeInscription = paiementsEleveAll.filter(p => (p as any).typeFrais === 'inscription').reduce((s, p) => s + (p.montant || 0), 0);
      const sommeMeta = paiementsEleveAll.filter(p => Number((p as any).modalite) === 1).reduce((s, p) => s + (p.montant || 0), 0);
      return (sommeInscription + sommeMeta) || 0;
    }

    // For modalites >1, map modalite -> versementIndex = modalite - 1
    const expectedVersementIndex = Number(modaliteIdx) - 1;
    const sommeVersement = paiementsEleveAll
      .filter(p => (p as any).typeFrais === 'scolarite' && Number((p as any).versementIndex) === expectedVersementIndex)
      .reduce((s, p) => s + (p.montant || 0), 0);
    const sommeMeta = paiementsEleveAll
      .filter(p => Number((p as any).modalite) === Number(modaliteIdx))
      .reduce((s, p) => s + (p.montant || 0), 0);
    return (sommeVersement + sommeMeta) || 0;
  }

  // Allouer un paiement automatiquement aux échéances non réglées pour un élève
  function allocatePaymentToEcheances(eleveId: string, montant: number) {
    const ele = eleves.find(e => e.id === eleveId);
    if (!ele) return;
    const frais = getFraisForEleve(ele);
    if (!frais || !(frais as any).echeances || (frais as any).echeances.length === 0) {
      // Pas d'échéances connues : créer paiement libre
      const numero = 'REC' + Date.now().toString().slice(-8);
      db.create<Paiement>('paiements', { eleveId, montant, typeFrais: 'scolarite', datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      return;
    }

    let remaining = Number(montant || 0);
  const echeances: any[] = ((frais as any).echeances || []).slice().sort((a: any, b: any) => (a.modalite || 0) - (b.modalite || 0));
    for (const e of echeances) {
      if (remaining <= 0) break;
      const modalite = Number(e.modalite || 0);
      const expected = Number(e.montant || 0);
      const already = getSommeParModalite(eleveId, modalite) || 0;
      const due = Math.max(0, expected - already);
      if (due <= 0) continue;
      const alloc = Math.min(remaining, due);
      const numero = 'REC' + Date.now().toString().slice(-8) + '-' + modalite;
      if (modalite === 1) {
        db.create<Paiement>('paiements', { eleveId, montant: alloc, typeFrais: 'inscription', datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      } else {
        // versementIndex is 1-based for V1..Vn, but we store versementIndex starting at 1 for V1 semantics;
        // internal convention: versementIndex = modalite - 1
        db.create<Paiement>('paiements', { eleveId, montant: alloc, typeFrais: 'scolarite', versementIndex: modalite - 1, datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
      }
      remaining -= alloc;
    }

    if (remaining > 0) {
      // Surplus : créer paiement non rattaché
      const numero = 'REC' + Date.now().toString().slice(-8) + '-SUR';
      db.create<Paiement>('paiements', { eleveId, montant: remaining, typeFrais: 'scolarite', datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() } as any);
    }
  }

  // Supprimer les paiements historiques de montant 0 pour un élève
  function cleanupZeroPayments(eleveId: string) {
    const zeros = paiements.filter(p => p.eleveId === eleveId && Number((p as any).montant || 0) === 0);
    if (!zeros.length) {
      showToast('Aucun paiement à 0 FCFA trouvé', 'info');
      return;
    }
    zeros.forEach(z => {
      try {
        db.delete('paiements', (z as any).id);
      } catch (err) {
        // ignore individual errors
      }
    });
    showToast(`${zeros.length} paiement(s) à 0 FCFA supprimé(s)`, 'success');
    setRefreshKey(k => k + 1);
  }

  function handleReglerEcheance(modalite: number, reste: number) {
    // Pré-sélectionne la modalité et le montant restant
    setSelectedModalite(modalite);
    setFormMontant(String(reste));
    setFormType('scolarite');
    showToast(`Modalité ${modalite} sélectionnée (${reste.toLocaleString('fr-FR')} FCFA)`, 'info');
  }

  return (
    <div>
      {/* force-read refreshKey to avoid unused variable lint */}
      <span className="hidden">{refreshKey}</span>
      
      {/* En-tête moderne pour caissière */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 rounded-t-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">💰 Gestion Financière</h1>
            <p className="text-teal-100">Interface caissière - Paiements et reçus</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-teal-100">Total élèves</div>
            <div className="text-2xl font-bold">{filteredEleves.length}</div>
          </div>
        </div>
      </div>

      {/* Barre d'actions principale */}
      <div className="bg-white border-x border-gray-200 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow-sm transition-all"
              onClick={() => setShowPaymentModal(true)}
            >
              <DollarSign className="h-4 w-4" />
              <span>Nouveau Paiement</span>
            </button>
            
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm transition-all" 
              onClick={() => {
            setSelectedPaiementsIds([]);
            setShowRecuPicker(true);
              }}
            >
              <FileText className="h-4 w-4" />
              <span>Aperçu Reçus</span>
            </button>
            
            <button 
              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 shadow-sm transition-all" 
              onClick={async () => {
            // Imprimer convocations: collect unpaid échéances for all élèves filtrés
            try {
              const containerId = `convocations-print-${Date.now()}`;
              const div = document.createElement('div'); div.id = containerId; document.body.appendChild(div);
              // build convocations data
              const convocations: Array<{ ele: Eleve; echeances: any[]; totalDue: number } > = [];
              for (const ele of filteredEleves) {
                const frais = getFraisForEleve(ele) as any;
                if (!frais || !(frais.echeances || []).length) continue;
                const unpaid: any[] = [];
                let totalDue = 0;
                for (const ech of (frais.echeances || [])) {
                  const modal = Number(ech.modalite || 0);
                  const attendu = Number(ech.montant || 0);
                  const paye = getSommeParModalite(ele.id, modal);
                  const reste = Math.max(0, attendu - paye);
                  if (reste > 0) {
                    unpaid.push({ modalite: modal, attendu, paye, reste, date: ech.date });
                    totalDue += reste;
                  }
                }
                if (unpaid.length) convocations.push({ ele, echeances: unpaid, totalDue });
              }

              if (!convocations.length) {
                showToast('Aucune convocation à imprimer', 'info');
                div.remove();
                return;
              }

              // dynamic import Convocation and react-dom client
              const [{ default: Conv }] = await Promise.all([import('./Convocation')]);
              const { createRoot } = await import('react-dom/client');
              // render each convocation
              convocations.forEach((c) => {
                const mount = document.createElement('div'); div.appendChild(mount);
                const root = (createRoot as any)(mount);
                const classeObj = classes.find(cl => cl.id === c.ele.classeId)!;
                root.render(React.createElement(Conv, {
                  eleve: c.ele,
                  echeances: c.echeances,
                  totalDue: c.totalDue,
                  classe: classeObj,
                  anneeScolaire: (classeObj as any)?.anneeScolaire || ''
                }));
              });

              // All convocations rendered — open preview
              setTimeout(() => {
                openPrintPreviewFromElementId(containerId, 'Convocations de paiement');
                setTimeout(() => { const d = document.getElementById(containerId); if (d) d.remove(); }, 2000);
              }, 200);
            } catch (err) {
              showToast('Erreur lors de la génération des convocations', 'error');
              console.error(err);
            }
              }}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>Convocations</span>
            </button>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'grid' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Cartes
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  viewMode === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                }`}
              >
                Tableau
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres améliorés */}
      <div className="bg-white border-x border-gray-200 p-4 border-t">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-64">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Rechercher un élève (nom, prénom, matricule)..." 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)} 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select 
            value={selectedClasse} 
            onChange={e => setSelectedClasse(e.target.value)} 
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
          >
            <option value="">📚 Toutes les classes</option>
            {classes.map(c => (
              <option key={c.id} value={c.id}>{c.niveau} {c.section}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="bg-white border border-gray-200 rounded-b-xl">
        {viewMode === 'grid' ? (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEleves.map((eleve) => {
                const totalPaye = getTotalPaye(eleve.id);
                const inscription = getInscriptionValue(eleve);
                const statutInscription = (eleve as any).statutInscription || 'non-inscrit';
                
                return (
                  <div 
                    key={eleve.id} 
                    className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all cursor-pointer"
                    onClick={() => setElevePaiement(eleve.id)}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-3">
                        {eleve.photo ? (
                          <img src={eleve.photo} alt="" className="h-12 w-12 rounded-full object-cover" />
                        ) : (
                          <div className="h-12 w-12 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                            {eleve.prenoms.charAt(0)}{eleve.nom.charAt(0)}
                          </div>
                        )}
                        <div>
                          <h3 className="font-semibold text-gray-900">{eleve.prenoms} {eleve.nom}</h3>
                          <p className="text-sm text-gray-500">{eleve.matricule}</p>
                        </div>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        statutInscription === 'inscrit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {statutInscription === 'inscrit' ? '✅ Inscrit' : '❌ Non inscrit'}
                      </span>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Inscription</span>
                        <span className="font-semibold text-teal-600">{inscription.toLocaleString()} FCFA</span>
                      </div>
                      
                      <div className="grid grid-cols-5 gap-2 text-center">
                        {[1,2,3,4,5].map(v => {
                          const montant = getSommeVersementIndex(eleve.id, v);
                          return (
                            <div key={v} className="bg-gray-50 rounded-lg p-2">
                              <div className="text-xs text-gray-500">V{v}</div>
                              <div className="text-sm font-medium">{montant.toLocaleString()}</div>
                            </div>
                          );
                        })}
                      </div>
                      
                      <div className="pt-3 border-t border-gray-100">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-700">Total payé</span>
                          <span className="text-lg font-bold text-green-600">{totalPaye.toLocaleString()} FCFA</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Élève</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Statut</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Inscription</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">V1</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">V2</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">V3</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">V4</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">V5</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredEleves.map((eleve, idx) => {
                  const totalPaye = getTotalPaye(eleve.id);
                  const inscription = getInscriptionValue(eleve);
                  const statutInscription = (eleve as any).statutInscription || 'non-inscrit';
                  
                  return (
                    <tr 
                      key={eleve.id} 
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setElevePaiement(eleve.id)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {eleve.photo ? (
                            <img src={eleve.photo} alt="" className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 bg-gradient-to-br from-teal-400 to-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                              {eleve.prenoms.charAt(0)}{eleve.nom.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-gray-900">{eleve.prenoms} {eleve.nom}</div>
                            <div className="text-sm text-gray-500">{eleve.matricule}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          statutInscription === 'inscrit' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {statutInscription === 'inscrit' ? 'Inscrit' : 'Non inscrit'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-medium">{inscription.toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-center">{getSommeVersementIndex(eleve.id, 1).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-center">{getSommeVersementIndex(eleve.id, 2).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-center">{getSommeVersementIndex(eleve.id, 3).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-center">{getSommeVersementIndex(eleve.id, 4).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-center">{getSommeVersementIndex(eleve.id, 5).toLocaleString()} FCFA</td>
                      <td className="px-4 py-3 text-center font-bold text-green-600">{totalPaye.toLocaleString()} FCFA</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Gestion financière par élève : ouvert en cliquant sur le nom */}
      {/* Modal d'édition financière */}
      {elevePaiement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-900">💰 Gestion Financière</h3>
                <p className="text-gray-600">{ (eleves.find(e => e.id === elevePaiement) as any)?.prenoms } { (eleves.find(e => e.id === elevePaiement) as any)?.nom }</p>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  className="text-sm px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" 
                  onClick={() => cleanupZeroPayments(elevePaiement!)}
                >
                  🧹 Nettoyer
                </button>
                <button 
                  className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-lg transition-colors" 
                  onClick={() => setElevePaiement(null)}
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div>
                <div className="bg-gray-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">📋 Statut d'inscription</h4>
                  <select 
                    value={ ((eleves.find(e => e.id === elevePaiement) as any)?.statutInscription) || 'non-inscrit' } 
                    onChange={(e) => {
                  const newStatus = e.target.value;
                  const ele = eleves.find(x => x.id === elevePaiement);
                  if (!ele) return;
                  db.update<Eleve>('eleves', ele.id, { ...(ele as any), statutInscription: newStatus });
                  // si on passe à inscrit, créer paiement d'inscription au montant du niveau
                  if (newStatus === 'inscrit') {
                    const classe = classes.find(c => c.id === ele.classeId);
                    const frais = fraisScolaires.find(f => f.niveau === classe?.niveau && f.anneeScolaire === classe?.anneeScolaire);
                    const montantInscription = frais ? ((frais as any).fraisInscription || 0) : 0;
                    // éviter création de paiement à 0 : ne créer que si montant connu > 0
                    if (montantInscription > 0) {
                      // éviter doublons : vérifier s'il existe déjà un paiement d'inscription non nul
                      const deja = paiements.find(p => p.eleveId === ele.id && ((p as any).typeFrais === 'inscription' || (p as any).typeFrais === 'inscription'));
                      if (!deja) {
                        db.create<Paiement>('paiements', {
                          eleveId: ele.id,
                          montant: montantInscription,
                          typeFrais: 'inscription',
                          numeroRecu: 'REC' + Date.now().toString().slice(-8),
                          datePaiement: new Date().toISOString(),
                          modePaiement: 'Espèces',
                          createdAt: new Date().toISOString(),
                        } as any);
                      } else if (deja && Number((deja as any).montant || 0) === 0) {
                        // si paiement d'inscription existant mais à 0, on met à jour avec le vrai montant
                        db.update<Paiement>('paiements', (deja as any).id, { ...(deja as any), montant: montantInscription, updatedAt: new Date().toISOString() } as any);
                      }
                    }
                    setRefreshKey(k => k + 1);
                  }
                  // feedback
                  showToast('Statut mis à jour', 'success');
                  setRefreshKey(k => k + 1);
                    }} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent bg-white"
                  >
                  <option value="non-inscrit">Non-inscrit</option>
                  <option value="inscrit">Inscrit</option>
                </select>
                </div>
              </div>
              
              <div>
                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">💳 Nouveau versement</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input 
                        placeholder="Montant (FCFA)" 
                        type="number" 
                        value={formMontant} 
                        onChange={e => setFormMontant(e.target.value)} 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <select 
                        value={formType} 
                        onChange={e => setFormType(e.target.value)} 
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                    <option value="scolarite">Scolarité (V)</option>
                    <option value="inscription">Inscription</option>
                    <option value="cantine">Cantine</option>
                  </select>
                    </div>
                    
                    <div className="flex gap-2 items-center">
                      <span className="text-sm font-medium text-gray-700">Modalité:</span>
                      <select 
                        value={selectedModalite} 
                        onChange={e => setSelectedModalite(e.target.value === 'auto' ? 'auto' : Number(e.target.value))} 
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                      >
                    <option value="auto">Auto</option>
                    <option value={1}>1 - V1</option>
                    <option value={2}>2 - V2</option>
                    <option value={3}>3 - V3</option>
                    <option value={4}>4 - V4</option>
                    <option value={5}>5 - V5</option>
                    <option value={6}>6 - V6</option>
                    <option value={7}>7 - V7</option>
                  </select>
                    </div>
                    
                    <button 
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors" 
                      onClick={() => {
                    const montant = Number(formMontant || 0);
                    const type = formType || 'scolarite';
                    if (!montant || !elevePaiement) { showToast('Montant invalide', 'error'); return; }
                    const numero = 'REC' + Date.now().toString().slice(-8);
                    const paiementPayload: any = {
                      eleveId: elevePaiement,
                      montant,
                      typeFrais: type,
                      datePaiement: new Date().toISOString(),
                      numeroRecu: numero,
                      modePaiement: 'Espèces',
                      createdAt: new Date().toISOString()
                    };
                    if (type === 'scolarite') {
                      if (selectedModalite === 'auto') {
                        // répartir automatiquement si montant > 0
                        if (montant > 0) {
                          allocatePaymentToEcheances(elevePaiement, montant);
                        } else {
                          showToast('Montant invalide pour allocation automatique', 'error');
                        }
                      } else {
                        if (montant > 0) {
                          const modal = Number(selectedModalite);
                          if (modal === 1) {
                            // Treat modalite 1 as inscription (store as type 'inscription')
                            const payload = { ...paiementPayload, typeFrais: 'inscription' } as any;
                            db.create<Paiement>('paiements', payload);
                          } else {
                              paiementPayload.versementIndex = modal - 1;
                              db.create<Paiement>('paiements', paiementPayload as any);
                          }
                        } else {
                          showToast('Montant invalide', 'error');
                        }
                      }
                    } else {
                      if (montant > 0) db.create<Paiement>('paiements', paiementPayload as any);
                      else showToast('Montant invalide', 'error');
                    }
                    showToast('Versement enregistré', 'success');
                    setFormMontant('');
                    setFormType('scolarite');
                    setRefreshKey(k => k + 1);
                      }}
                    >
                      💾 Enregistrer le versement
                    </button>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-green-50 rounded-xl p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">🖨️ Impression</h4>
                  <button 
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors" 
                    onClick={async () => {
                      // Render RecuPaiement components into a temporary container for faithful preview
                      if (!elevePaiement) return;
                      const paiementsEleve = paiements.filter(p => p.eleveId === elevePaiement);
                      if (!paiementsEleve.length) { showToast('Aucun paiement pour cet élève', 'info'); return; }
                      const containerId = `print-area-eleve-${elevePaiement}-${Date.now()}`;
                      const div = document.createElement('div');
                      div.id = containerId;
                      document.body.appendChild(div);

                      // Import once and render all receipts synchronously so the content exists when opening preview
                      const [{ createRoot }, { default: Recu }] = await Promise.all([import('react-dom/client'), import('./RecuPaiement')]);
                      const ele = eleves.find(e => e.id === elevePaiement)!;
                      paiementsEleve.forEach((p, i) => {
                        const mount = document.createElement('div');
                        mount.id = `${containerId}-${i}`;
                        div.appendChild(mount);
                        const root = (createRoot as any)(mount);
                          const totalAttendu = getTotalAttenduForEleve(elevePaiement);
                          const cumul = getTotalPaye(elevePaiement);
                          root.render(React.createElement(Recu, {
                          eleve: { nom: ele.nom, prenoms: ele.prenoms, matricule: ele.matricule, classe: (classes.find(c => c.id === ele.classeId) as any)?.niveau || '' },
                          montantRegle: (p as any).montant || 0,
                          date: (p as any).datePaiement || new Date().toISOString(),
                          mode: (p as any).modePaiement || 'Espèces',
                          cumulReglement: cumul,
                          resteAPayer: Math.max(0, totalAttendu - cumul),
                          anneeScolaire: (classes.find(c => c.id === ele.classeId) as any)?.anneeScolaire || '',
                          operateur: (getCurrentUser() ? `${getCurrentUser()!.prenoms} ${getCurrentUser()!.nom}` : 'Inconnu'),
                          numeroRecu: (p as any).numeroRecu || ('REC' + Date.now().toString().slice(-8)),
                          printMode: true
                        }));
                      });

                      // slight delay to ensure React paints, then open preview
                      setTimeout(() => {
                        openPrintPreviewFromElementId(containerId, `Reçus ${elevePaiement}`);
                        setTimeout(() => { const d = document.getElementById(containerId); if (d) d.remove(); }, 2000);
                      }, 150);
                    }}
                  >
                    📄 Aperçu des reçus
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-4">
              <div className="bg-white rounded-xl border border-gray-200">
                <div className="px-4 py-3 bg-gray-50 rounded-t-xl border-b border-gray-200">
                  <h4 className="font-semibold text-gray-900">📊 Historique des paiements</h4>
                </div>
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-sm">
                  <thead>
                      <tr className="bg-gray-50">
                        <th className="px-3 py-2 text-left font-medium text-gray-700">Date</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-700">Montant</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-700">Type</th>
                        <th className="px-3 py-2 text-center font-medium text-gray-700">Reçu</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paiements.filter(p => p.eleveId === elevePaiement).map(p => (
                        <tr key={(p as any).id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 border-b border-gray-100">{new Date((p as any).datePaiement || (p as any).date || '').toLocaleDateString('fr-FR')}</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-right font-medium">{(p as any).montant.toLocaleString()} FCFA</td>
                          <td className="px-3 py-2 border-b border-gray-100 text-center">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {(p as any).typeFrais}
                            </span>
                          </td>
                          <td className="px-3 py-2 border-b border-gray-100 text-center font-mono text-xs">{(p as any).numeroRecu || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>

        {/* Modal sélecteur de reçus */}
            {showRecuPicker && (
              <div className="fixed inset-0 z-60 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-6">
                  <h3 className="text-lg font-semibold mb-3">Sélectionner les reçus à imprimer</h3>
                  <div className="text-sm text-gray-600 mb-2">Choisissez une ou plusieurs opérations (cocher). Vous pouvez imprimer séparément ou combiner les paiements sélectionnés en un seul reçu.</div>
                  <div className="max-h-64 overflow-auto border rounded p-2 mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="px-2 py-1"> <input type="checkbox" onChange={e=>{
                            const list = paiements.filter(p=>p.eleveId===elevePaiement).map(p=>(p as any).id);
                            setSelectedPaiementsIds(e.target.checked ? list : []);
                          }} checked={selectedPaiementsIds.length>0 && selectedPaiementsIds.length===paiements.filter(p=>p.eleveId===elevePaiement).length} /></th>
                          <th className="px-2 py-1">Date</th>
                          <th className="px-2 py-1">Montant</th>
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1">Reçu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paiements.filter(p => p.eleveId === elevePaiement).map(p => {
                          const id = (p as any).id;
                          return (
                            <tr key={id} className="hover:bg-gray-50">
                              <td className="px-2 py-1 text-center"><input type="checkbox" checked={selectedPaiementsIds.includes(id)} onChange={e=>{
                                setSelectedPaiementsIds(prev => e.target.checked ? [...prev, id] : prev.filter(x=>x!==id));
                              }} /></td>
                              <td className="px-2 py-1">{new Date((p as any).datePaiement || (p as any).date || '').toLocaleDateString('fr-FR')}</td>
                              <td className="px-2 py-1">{(p as any).montant} FCFA</td>
                              <td className="px-2 py-1">{(p as any).typeFrais}</td>
                              <td className="px-2 py-1">{(p as any).numeroRecu || '-'}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end gap-3">
                    <button className="px-3 py-1 bg-gray-300 rounded" onClick={()=>{ setShowRecuPicker(false); setSelectedPaiementsIds([]); }}>Annuler</button>
                    <button className="px-3 py-1 bg-blue-600 text-white rounded" onClick={async ()=>{
                      // imprimer séparé: chaque paiement comme reçu
                      if (!elevePaiement) return;
                      const toPrint = paiements.filter(p=>selectedPaiementsIds.includes((p as any).id));
                      if (toPrint.length===0) { showToast('Sélectionnez au moins une opération', 'error'); return; }
                      const containerId = `print-area-eleve-${elevePaiement}-${Date.now()}`;
                      const div = document.createElement('div'); div.id = containerId; document.body.appendChild(div);
                      const [{ createRoot }, { default: Recu }, { default: Combined }] = await Promise.all([import('react-dom/client'), import('./RecuPaiement'), import('./CombinedRecu')]);
                      const ele = eleves.find(e => e.id === elevePaiement)!;
                      if (selectedPaiementsIds.length === 1) {
                        // single paiement -> render single Recu
                        const p = toPrint[0];
                        const mount = document.createElement('div'); div.appendChild(mount);
                        const root = (createRoot as any)(mount);
                        const totalAttendu = getTotalAttenduForEleve(elevePaiement);
                        const cumul = getTotalPaye(elevePaiement);
                        root.render(React.createElement(Recu, {
                          eleve: { nom: ele.nom, prenoms: ele.prenoms, matricule: ele.matricule, classe: (classes.find(c => c.id === ele.classeId) as any)?.niveau || '' },
                          montantRegle: (p as any).montant || 0,
                          date: (p as any).datePaiement || new Date().toISOString(),
                          mode: (p as any).modePaiement || 'Espèces',
                          cumulReglement: cumul,
                          resteAPayer: Math.max(0, totalAttendu - cumul),
                          anneeScolaire: (classes.find(c => c.id === ele.classeId) as any)?.anneeScolaire || '',
                          operateur: (getCurrentUser() ? `${getCurrentUser()!.prenoms} ${getCurrentUser()!.nom}` : 'Inconnu'),
                          numeroRecu: (p as any).numeroRecu || ('REC' + Date.now().toString().slice(-8)),
                          printMode: true
                        }));
                      } else {
                        // multiple -> render combined recu
                        const mount = document.createElement('div'); div.appendChild(mount);
                        const root = (createRoot as any)(mount);
                        root.render(React.createElement(Combined, {
                          eleve: ele,
                          paiements: toPrint,
                          classe: classes.find(c => c.id === ele.classeId),
                          anneeScolaire: (classes.find(c => c.id === ele.classeId) as any)?.anneeScolaire || ''
                        }));
                      }
                      setShowRecuPicker(false);
                      setTimeout(()=>{ openPrintPreviewFromElementId(containerId, `Reçus ${elevePaiement}`); setTimeout(()=>{ const d=document.getElementById(containerId); if (d) d.remove(); },2000); }, 200);
                    }}>Imprimer sélection</button>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4">
              <h4 className="font-semibold">Échéances & Statut</h4>
              <div className="max-h-40 overflow-auto mt-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="border px-2 py-1">Modalité</th>
                      <th className="border px-2 py-1">Date</th>
                      <th className="border px-2 py-1">Attendu</th>
                      <th className="border px-2 py-1">Payé</th>
                      <th className="border px-2 py-1">Reste</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const ele = eleves.find(e => e.id === elevePaiement);
                      if (!ele) return null;
                      const frais = getFraisForEleve(ele) as any;
                      if (!frais || !(frais.echeances || []).length) return <tr><td colSpan={5} className="text-gray-500 text-center py-2">Aucune échéance configurée</td></tr>;
                      return (frais.echeances || []).map((ech: any) => {
                        const modal = Number(ech.modalite || 0);
                        const attendu = Number(ech.montant || 0);
                        const paye = getSommeParModalite(elevePaiement!, modal);
                        const reste = Math.max(0, attendu - paye);
                        const status = reste === 0 ? 'paid' : (paye > 0 ? 'partial' : 'unpaid');
                        const statusColor = status === 'paid' ? 'bg-green-100 text-green-800' : (status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700');
                        return (
                          <tr key={modal}>
                            <td className="border px-2 py-1">{modal}</td>
                            <td className="border px-2 py-1">{ech.date}</td>
                            <td className="border px-2 py-1">{attendu.toLocaleString('fr-FR')} FCFA</td>
                            <td className="border px-2 py-1">{paye.toLocaleString('fr-FR')} FCFA</td>
                            <td className="border px-2 py-1 flex items-center justify-between">
                              <span>{reste.toLocaleString('fr-FR')} FCFA</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-0.5 rounded text-xs ${statusColor}`}>{status === 'paid' ? 'Payé' : (status === 'partial' ? 'Partiel' : 'Non payé')}</span>
                                <button className="text-sm px-2 py-1 bg-blue-600 text-white rounded" onClick={() => handleReglerEcheance(modal, reste)}>Régler</button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <PaymentForm onCancel={() => setShowPaymentModal(false)} onSubmit={(eleveId, montant, type, modalite) => {
          // use existing allocation logic when scolarite + auto
          if (type === 'scolarite' && modalite === 'auto') {
            allocatePaymentToEcheances(eleveId, montant);
          } else {
            const numero = 'REC' + Date.now().toString().slice(-8);
            const payload: any = { eleveId, montant, typeFrais: type, datePaiement: new Date().toISOString(), numeroRecu: numero, modePaiement: 'Espèces', createdAt: new Date().toISOString() };
            if (type === 'scolarite' && modalite !== 'auto') payload.versementIndex = modalite;
            if (type === 'inscription') payload.typeFrais = 'inscription';
            db.create('paiements', payload as any);
          }
          setShowPaymentModal(false);
          setRefreshKey(k => k + 1);
        }} />
      )}

      {/* Zone imprimable */}
      <div id="print-area" className="hidden print:block bg-white p-4 mb-4 print-compact">
        <EnteteFiche type="recu" libelle="Relevé des paiements" />
        {/* Header hors-table sous forme de table pour alignement des colonnes */}
        <div className="mb-2 overflow-x-auto">
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px', tableLayout: 'fixed'}}>
            <colgroup>
                <col style={{ width: '6%' }} />
                <col style={{ width: '30%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
                <col style={{ width: '8%' }} />
            </colgroup>
            <thead>
                <tr>
                  <th className="border px-2 py-1">N°</th>
                  <th className="border px-2 py-1">Nom</th>
                  <th className="border px-2 py-1">Inscription</th>
                  <th className="border px-2 py-1">V1</th>
                  <th className="border px-2 py-1">V2</th>
                  <th className="border px-2 py-1">V3</th>
                  <th className="border px-2 py-1">V4</th>
                  <th className="border px-2 py-1">V5</th>
                  <th className="border px-2 py-1">Total</th>
                </tr>
            </thead>
          </table>
        </div>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:'13px', tableLayout: 'fixed'}}>
          <colgroup>
              <col style={{ width: '6%' }} />
              <col style={{ width: '30%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
          </colgroup>
          <tbody>
            {filteredEleves.map((eleve, idx) => (
              <tr key={eleve.id}>
                <td className="border px-2 py-1">{idx + 1}</td>
                <td className="border px-2 py-1 cursor-pointer text-blue-600" onClick={() => setElevePaiement(eleve.id)}>{eleve.nom} {eleve.prenoms}</td>
                <td className="border px-2 py-1">{getInscriptionValue(eleve)} FCFA</td>
                <td className="border px-2 py-1">{getSommeVersementIndex(eleve.id, 1)} FCFA</td>
                <td className="border px-2 py-1">{getSommeVersementIndex(eleve.id, 2)} FCFA</td>
                <td className="border px-2 py-1">{getSommeVersementIndex(eleve.id, 3)} FCFA</td>
                <td className="border px-2 py-1">{getSommeVersementIndex(eleve.id, 4)} FCFA</td>
                <td className="border px-2 py-1">{getSommeVersementIndex(eleve.id, 5)} FCFA</td>
                <td className="border px-2 py-1">{getTotalPaye(eleve.id)} FCFA</td>
              </tr>
            ))}
            {/* Totaux */}
            <tr className="font-semibold bg-gray-50">
              <td className="border px-2 py-1" />
              <td className="border px-2 py-1">Totaux</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getInscriptionValue(e), 0)} FCFA</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getSommeVersementIndex(e.id, 1), 0)} FCFA</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getSommeVersementIndex(e.id, 2), 0)} FCFA</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getSommeVersementIndex(e.id, 3), 0)} FCFA</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getSommeVersementIndex(e.id, 4), 0)} FCFA</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getSommeVersementIndex(e.id, 5), 0)} FCFA</td>
              <td className="border px-2 py-1">{filteredEleves.reduce((s, e) => s + getTotalPaye(e.id), 0)} FCFA</td>
            </tr>
          </tbody>
        </table>
      </div>

    {/* Le tableau principal est rendu dans le bloc conditionnel plus haut
      (viewMode === 'grid' ? cartes : tableau). Cette table dupliquée
      à la fin provoquait l'affichage permanent du tableau; elle a été
      supprimée pour respecter le choix de l'utilisateur. */}
    </div>
  );
}
