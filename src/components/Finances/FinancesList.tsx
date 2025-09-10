import React, { useState, useMemo } from 'react';
import { Search, Plus, DollarSign, FileText, AlertTriangle, Printer } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Classe, Paiement, FraisScolaire } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import PaymentForm from './PaymentForm';
import RecuPaiement from './RecuPaiement';
import CombinedRecu from './CombinedRecu';
import Convocation from './Convocation';
import { computeScheduleForEleve } from '../../utils/payments';
import { openPrintPreviewFromElementId } from '../../utils/printPreview';
import { echeancesManager } from '../../utils/echeancesManager';
import ElevePaymentPage from './ElevePaymentPage';

export default function FinancesList() {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showAlertesEcheances, setShowAlertesEcheances] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [showCombinedRecuModal, setShowCombinedRecuModal] = useState(false);
  const [showConvocationModal, setShowConvocationModal] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [lastPayment, setLastPayment] = useState<Paiement | null>(null);

  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');

  // Alertes d'échéances
  const alertesEcheances = useMemo(() => {
    return echeancesManager.getAlertesEcheances();
  }, []);
  // Calcul des situations financières avec l'ancienne logique
  const situationsFinancieres = useMemo(() => {
    return eleves.map(eleve => {
      const situationEcheances = echeancesManager.getSituationEcheances(eleve.id);
      
      if (situationEcheances) {
        const paiementsEleve = paiements.filter(p => p.eleveId === eleve.id);
        let statut: 'Payé' | 'Partiel' | 'Impayé' = 'Impayé';
        
        if (situationEcheances.totalRestant <= 0 && situationEcheances.totalDu > 0) {
          statut = 'Payé';
        } else if (situationEcheances.totalPaye > 0 && situationEcheances.totalRestant > 0) {
          statut = 'Partiel';
        } else if (situationEcheances.totalDu > 0 && situationEcheances.totalPaye === 0) {
          statut = 'Impayé';
        }

        return {
          eleve,
          classe: situationEcheances.classe,
          totalDu: situationEcheances.totalDu,
          totalPaye: situationEcheances.totalPaye,
          solde: situationEcheances.totalRestant,
          statut,
          paiementsEleve,
          dernierPaiement: paiementsEleve.length > 0 ? 
            paiementsEleve.sort((a, b) => new Date(b.datePaiement || b.createdAt).getTime() - new Date(a.datePaiement || a.createdAt).getTime())[0]
            : null,
          situationEcheances
        };
      }

      // Fallback pour élèves sans frais configurés
      const classe = classes.find(c => c.id === eleve.classeId);
      const paiementsEleve = paiements.filter(p => p.eleveId === eleve.id);
      const totalPaye = paiementsEleve.reduce((sum, p) => sum + (p.montant || 0), 0);

      return {
        eleve,
        classe,
        totalDu: 0,
        totalPaye,
        solde: 0,
        statut: 'Payé' as const,
        paiementsEleve,
        dernierPaiement: paiementsEleve.length > 0 ? 
          paiementsEleve.sort((a, b) => new Date(b.datePaiement || b.createdAt).getTime() - new Date(a.datePaiement || a.createdAt).getTime())[0]
          : null,
        situationEcheances: null
      };
    });
  }, [eleves, paiements, fraisScolaires, classes]);

  const filteredSituations = useMemo(() => {
    let filtered = [...situationsFinancieres];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.eleve.nom.toLowerCase().includes(term) ||
        s.eleve.prenoms.toLowerCase().includes(term) ||
        s.eleve.matricule.toLowerCase().includes(term)
      );
    }

    if (filterClasse) {
      filtered = filtered.filter(s => s.eleve.classeId === filterClasse);
    }

    if (filterStatut) {
      filtered = filtered.filter(s => s.statut === filterStatut);
    }

    return filtered.sort((a, b) => a.eleve.nom.localeCompare(b.eleve.nom));
  }, [situationsFinancieres, searchTerm, filterClasse, filterStatut]);

  const handlePaymentSubmit = (eleveId: string, montant: number, type: string, modalite: number | 'auto', paiement?: Paiement) => {
    setShowPaymentForm(false);
    if (paiement) {
      setLastPayment(paiement);
      const eleve = eleves.find(e => e.id === eleveId);
      if (eleve) {
        setSelectedEleve(eleve);
        setShowRecuModal(true);
      }
    }
    showToast('Paiement enregistré avec succès', 'success');
    // Recharger la page pour voir les changements
    setTimeout(() => window.location.reload(), 1000);
  };

  const [showElevePaymentPage, setShowElevePaymentPage] = useState(false);
  const [selectedEleveForPayment, setSelectedEleveForPayment] = useState<Eleve | null>(null);

  const handleOpenElevePaymentPage = (eleve: Eleve) => {
    setSelectedEleveForPayment(eleve);
    setShowElevePaymentPage(true);
  };

  const handleCloseElevePaymentPage = () => {
    setShowElevePaymentPage(false);
    setSelectedEleveForPayment(null);
    // Recharger pour voir les changements
    setTimeout(() => window.location.reload(), 100);
  };

  const getStatutColor = (statut: string) => {
    switch (statut) {
      case 'Payé': return 'bg-green-100 text-green-800';
      case 'Partiel': return 'bg-orange-100 text-orange-800';
      case 'Impayé': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
  };

  const handlePrintCombinedRecu = (eleve: Eleve) => {
    const situation = situationsFinancieres.find(s => s.eleve.id === eleve.id);
    if (!situation || situation.paiementsEleve.length === 0) {
      showToast('Aucun paiement trouvé pour cet élève', 'error');
      return;
    }

    setSelectedEleve(eleve);
    setShowCombinedRecuModal(true);
  };

  const handlePrintConvocation = (eleve: Eleve) => {
    try {
      const schedule = computeScheduleForEleve(eleve.id);
      const echeancesImpayees = schedule.filter(s => s.remaining > 0);
      
      if (echeancesImpayees.length === 0) {
        showToast('Aucune échéance impayée pour cet élève', 'info');
        return;
      }

      setSelectedEleve(eleve);
      setShowConvocationModal(true);
    } catch (error) {
      console.error('Erreur convocation:', error);
      showToast('Erreur lors de la génération de la convocation', 'error');
    }
  };

  // Statistiques financières
  const stats = useMemo(() => {
    const totalRecettes = paiements.reduce((sum, p) => sum + (p.montant || 0), 0);
    const elevesPayes = situationsFinancieres.filter(s => s.statut === 'Payé').length;
    const elevesPartiels = situationsFinancieres.filter(s => s.statut === 'Partiel').length;
    const elevesImpayes = situationsFinancieres.filter(s => s.statut === 'Impayé').length;
    const totalDu = situationsFinancieres.reduce((sum, s) => sum + s.totalDu, 0);
    const totalSolde = situationsFinancieres.reduce((sum, s) => sum + s.solde, 0);

    return {
      totalRecettes,
      elevesPayes,
      elevesPartiels,
      elevesImpayes,
      totalDu,
      totalSolde
    };
  }, [paiements, situationsFinancieres]);

  return (
    <div className="p-6 space-y-6">
      {/* Page de paiement d'un élève spécifique */}
      {showElevePaymentPage && selectedEleveForPayment ? (
        <ElevePaymentPage
          eleve={selectedEleveForPayment}
          onBack={handleCloseElevePaymentPage}
        />
      ) : (
        <>
      {/* En-tête avec statistiques */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 rounded-xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold">Gestion Financière</h1>
            <p className="text-teal-100 mt-1">Suivi des paiements et situations financières</p>
          </div>
          <button 
            onClick={() => setShowPaymentForm(true)}
            className="flex items-center space-x-2 px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all"
          >
            <Plus className="h-5 w-5" />
            <span className="font-semibold">Nouveau Paiement</span>
          </button>
        </div>

        {/* Alertes d'échéances */}
        {(alertesEcheances.echeancesEchues.length > 0 || alertesEcheances.echeancesProches.length > 0) && (
          <div className="mt-4 p-4 bg-white bg-opacity-20 rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white">Alertes d'Échéances</h3>
              <button
                onClick={() => setShowAlertesEcheances(!showAlertesEcheances)}
                className="text-white hover:bg-white hover:bg-opacity-20 px-3 py-1 rounded-lg transition-colors text-sm"
              >
                {showAlertesEcheances ? 'Masquer' : 'Voir Détails'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {alertesEcheances.echeancesEchues.length > 0 && (
                <div className="bg-red-500 bg-opacity-20 rounded-lg p-3">
                  <div className="font-semibold text-red-100">Échéances Échues</div>
                  <div className="text-red-200">{alertesEcheances.echeancesEchues.length} élève(s) en retard</div>
                </div>
              )}
              
              {alertesEcheances.echeancesProches.length > 0 && (
                <div className="bg-yellow-500 bg-opacity-20 rounded-lg p-3">
                  <div className="font-semibold text-yellow-100">Échéances Prochaines</div>
                  <div className="text-yellow-200">{alertesEcheances.echeancesProches.length} échéance(s) dans 7 jours</div>
                </div>
              )}
            </div>

            {showAlertesEcheances && (
              <div className="mt-4 space-y-3">
                {alertesEcheances.echeancesEchues.length > 0 && (
                  <div className="bg-white bg-opacity-10 rounded-lg p-3">
                    <h4 className="font-semibold text-white mb-2">Élèves avec échéances échues :</h4>
                    <div className="space-y-1 text-sm">
                      {alertesEcheances.echeancesEchues.slice(0, 5).map(alerte => (
                        <div key={alerte.eleve.id} className="text-red-200">
                          {alerte.eleve.prenoms} {alerte.eleve.nom} - {alerte.totalDu.toLocaleString('fr-FR')} FCFA en retard
                        </div>
                      ))}
                      {alertesEcheances.echeancesEchues.length > 5 && (
                        <div className="text-red-300">... et {alertesEcheances.echeancesEchues.length - 5} autre(s)</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Statistiques en ligne */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{formatMontant(stats.totalRecettes)}</div>
            <div className="text-teal-100 text-sm">Total Recettes</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-300">{stats.elevesPayes}</div>
            <div className="text-teal-100 text-sm">Payés</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-300">{stats.elevesPartiels}</div>
            <div className="text-teal-100 text-sm">Partiels</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-300">{stats.elevesImpayes}</div>
            <div className="text-teal-100 text-sm">Impayés</div>
          </div>
          <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold">{formatMontant(stats.totalSolde)}</div>
            <div className="text-teal-100 text-sm">Reste à encaisser</div>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Toutes les classes</option>
            {classes.map(classe => (
              <option key={classe.id} value={classe.id}>
                {classe.niveau} {classe.section}
              </option>
            ))}
          </select>

          <select
            value={filterStatut}
            onChange={(e) => setFilterStatut(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            <option value="Payé">Payé</option>
            <option value="Partiel">Partiel</option>
            <option value="Impayé">Impayé</option>
          </select>

          <button 
            onClick={() => openPrintPreviewFromElementId('finances-print-area', 'Situation financière')}
            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Printer className="h-4 w-4" />
            <span>Imprimer Liste</span>
          </button>
        </div>
      </div>

      {/* Zone d'impression cachée */}
      <div id="finances-print-area" className="hidden print:block bg-white p-4 mb-4 print-compact">
        <div className="text-center mb-4">
          <h2 className="text-xl font-bold">SITUATION FINANCIÈRE DES ÉLÈVES</h2>
          <p className="text-sm text-gray-600">Année scolaire {classes[0]?.anneeScolaire || ''}</p>
          <p className="text-xs text-gray-500">Imprimé le {new Date().toLocaleDateString('fr-FR')}</p>
        </div>
        
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1 text-left">N°</th>
              <th className="border px-2 py-1 text-left">Matricule</th>
              <th className="border px-2 py-1 text-left">Nom et Prénoms</th>
              <th className="border px-2 py-1 text-left">Classe</th>
              <th className="border px-2 py-1 text-right">Total Dû</th>
              <th className="border px-2 py-1 text-right">Total Payé</th>
              <th className="border px-2 py-1 text-right">Reste</th>
              <th className="border px-2 py-1 text-center">Statut</th>
            </tr>
          </thead>
          <tbody>
            {filteredSituations.map((situation, idx) => (
              <tr key={situation.eleve.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="border px-2 py-1">{idx + 1}</td>
                <td className="border px-2 py-1">{situation.eleve.matricule}</td>
                <td className="border px-2 py-1">{situation.eleve.prenoms} {situation.eleve.nom}</td>
                <td className="border px-2 py-1">{situation.classe ? `${situation.classe.niveau} ${situation.classe.section}` : '-'}</td>
                <td className="border px-2 py-1 text-right">{situation.totalDu.toLocaleString('fr-FR')}</td>
                <td className="border px-2 py-1 text-right">{situation.totalPaye.toLocaleString('fr-FR')}</td>
                <td className="border px-2 py-1 text-right">{situation.solde.toLocaleString('fr-FR')}</td>
                <td className="border px-2 py-1 text-center">{situation.statut}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Tableau principal avec design amélioré */}
      <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-4 lg:px-6 py-3 lg:py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg lg:text-xl font-semibold text-gray-900">Situations Financières</h2>
            <p className="text-gray-600 text-sm lg:text-base">{filteredSituations.length} élève(s) trouvé(s)</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900">Élève</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-left text-xs lg:text-sm font-semibold text-gray-900 hidden sm:table-cell">Classe</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-right text-xs lg:text-sm font-semibold text-gray-900">Total Dû</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-right text-xs lg:text-sm font-semibold text-gray-900">Total Payé</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-right text-xs lg:text-sm font-semibold text-gray-900">Reste</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900">Statut</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900 hidden lg:table-cell">Dernier Paiement</th>
                <th className="px-2 lg:px-4 py-2 lg:py-3 text-center text-xs lg:text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSituations.map((situation) => (
                <tr key={situation.eleve.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-2 lg:px-4 py-3 lg:py-4">
                    <div className="flex items-center space-x-3">
                      {situation.eleve.photo && (
                        <img 
                          src={situation.eleve.photo} 
                          alt={`${situation.eleve.prenoms} ${situation.eleve.nom}`}
                          className="h-8 w-8 lg:h-10 lg:w-10 rounded-full object-cover border-2 border-gray-200"
                        />
                      )}
                      <div>
                        <div className="text-xs lg:text-sm font-semibold text-gray-900">
                          {situation.eleve.prenoms} {situation.eleve.nom}
                        </div>
                        <div className="text-xs text-gray-500 font-mono hidden sm:block">
                          {situation.eleve.matricule}
                        </div>
                        <div className="text-xs text-gray-500 sm:hidden">
                          {situation.classe ? `${situation.classe.niveau} ${situation.classe.section}` : 'Non assigné'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-gray-700 font-medium hidden sm:table-cell">
                    {situation.classe ? `${situation.classe.niveau} ${situation.classe.section}` : 'Non assigné'}
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-gray-900 text-right font-bold">
                    {formatMontant(situation.totalDu)}
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-green-700 text-right font-bold">
                    {formatMontant(situation.totalPaye)}
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4 text-xs lg:text-sm text-right font-bold">
                    <span className={situation.solde > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatMontant(situation.solde)}
                    </span>
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4 text-center">
                    <span className={`px-2 lg:px-3 py-1 rounded-full text-xs font-semibold ${getStatutColor(situation.statut)}`}>
                      {situation.statut}
                    </span>
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4 text-center text-xs lg:text-sm text-gray-600 hidden lg:table-cell">
                    {situation.dernierPaiement ? (
                      <div>
                        <div className="font-medium">
                          {formatMontant(situation.dernierPaiement.montant)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(situation.dernierPaiement.datePaiement || situation.dernierPaiement.createdAt).toLocaleDateString('fr-FR')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Aucun</span>
                    )}
                  </td>
                  <td className="px-2 lg:px-4 py-3 lg:py-4">
                    <div className="flex items-center justify-center space-x-1 lg:space-x-2">
                      <button
                        onClick={() => handleOpenElevePaymentPage(situation.eleve)}
                        className="p-1 lg:p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Gérer les paiements"
                      >
                        <Plus className="h-3 w-3 lg:h-4 lg:w-4" />
                      </button>
                      
                      <button
                        onClick={() => handleOpenElevePaymentPage(situation.eleve)}
                        className="p-1 lg:p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Voir détails et reçus"
                      >
                        <Printer className="h-3 w-3 lg:h-4 lg:w-4" />
                      </button>
                      
                      {situation.solde > 0 && (
                        <button
                          onClick={() => handlePrintConvocation(situation.eleve)}
                          className="p-1 lg:p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Convocation de paiement"
                        >
                          <AlertTriangle className="h-3 w-3 lg:h-4 lg:w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredSituations.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 lg:h-16 lg:w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-base lg:text-lg">Aucune situation financière trouvée</p>
            <p className="text-gray-400 text-xs lg:text-sm mt-2">Ajustez vos filtres ou ajoutez des élèves</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {showPaymentForm && (
        <PaymentForm
          onSubmit={handlePaymentSubmit}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}


      {showCombinedRecuModal && selectedEleve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CombinedRecu
              eleve={selectedEleve}
              paiements={situationsFinancieres.find(s => s.eleve.id === selectedEleve.id)?.paiementsEleve || []}
              classe={classes.find(c => c.id === selectedEleve.classeId)}
              anneeScolaire={classes.find(c => c.id === selectedEleve.classeId)?.anneeScolaire}
            />
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowCombinedRecuModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showConvocationModal && selectedEleve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            {(() => {
              try {
                const schedule = computeScheduleForEleve(selectedEleve.id);
                const echeancesImpayees = schedule.filter(s => s.remaining > 0).map(s => ({
                  modalite: s.modalite || 1,
                  date: s.dueDate || s.date || '',
                  attendu: s.montant || 0,
                  paye: (s.montant || 0) - (s.remaining || 0),
                  reste: s.remaining || 0
                }));
                const totalDue = echeancesImpayees.reduce((sum, e) => sum + e.reste, 0);

                return (
                  <Convocation
                    eleve={selectedEleve}
                    echeances={echeancesImpayees}
                    totalDue={totalDue}
                    classe={classes.find(c => c.id === selectedEleve.classeId)}
                    anneeScolaire={classes.find(c => c.id === selectedEleve.classeId)?.anneeScolaire}
                  />
                );
              } catch (error) {
                return (
                  <div className="p-8 text-center">
                    <p className="text-red-600">Erreur lors de la génération de la convocation</p>
                  </div>
                );
              }
            })()}
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowConvocationModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
}