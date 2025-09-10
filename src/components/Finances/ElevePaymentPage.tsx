import React, { useState, useMemo } from 'react';
import { ArrowLeft, Printer, Receipt, FileText, CreditCard, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Classe, Paiement } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { echeancesManager } from '../../utils/echeancesManager';
import RecuPaiement from './RecuPaiement';
import CombinedRecu from './CombinedRecu';

interface ElevePaymentPageProps {
  eleve: Eleve;
  onBack: () => void;
}

export default function ElevePaymentPage({ eleve, onBack }: ElevePaymentPageProps) {
  const { showToast } = useToast();
  const [selectedEcheances, setSelectedEcheances] = useState<string[]>([]);
  const [selectedPaiements, setSelectedPaiements] = useState<string[]>([]);
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [showCombinedRecuModal, setShowCombinedRecuModal] = useState(false);
  const [selectedPaiementForRecu, setSelectedPaiementForRecu] = useState<Paiement | null>(null);

  const classe = db.getById<Classe>('classes', eleve.classeId);
  const situationEcheances = echeancesManager.getSituationEcheances(eleve.id);
  const paiements = db.getAll<Paiement>('paiements').filter(p => p.eleveId === eleve.id);

  const montantTotal = useMemo(() => {
    if (!situationEcheances) return 0;
    return situationEcheances.echeances
      .filter(e => selectedEcheances.includes(e.echeanceId))
      .reduce((sum, e) => sum + e.montantRestant, 0);
  }, [selectedEcheances, situationEcheances]);

  const handleSelectEcheance = (echeanceId: string, checked: boolean) => {
    setSelectedEcheances(prev => 
      checked ? [...prev, echeanceId] : prev.filter(id => id !== echeanceId)
    );
  };

  const handleSelectAllEcheances = (checked: boolean) => {
    if (!situationEcheances) return;
    if (checked) {
      const impayees = situationEcheances.echeances
        .filter(e => e.montantRestant > 0)
        .map(e => e.echeanceId);
      setSelectedEcheances(impayees);
    } else {
      setSelectedEcheances([]);
    }
  };

  const handleSelectPaiement = (paiementId: string, checked: boolean) => {
    setSelectedPaiements(prev => 
      checked ? [...prev, paiementId] : prev.filter(id => id !== paiementId)
    );
  };

  const handleSelectAllPaiements = (checked: boolean) => {
    if (checked) {
      setSelectedPaiements(paiements.map(p => p.id));
    } else {
      setSelectedPaiements([]);
    }
  };

  const handleReglerEcheances = async () => {
    if (selectedEcheances.length === 0) {
      showToast('Sélectionnez au moins une échéance à régler', 'error');
      return;
    }

    try {
      const result = echeancesManager.processPaymentIntelligent(
        eleve.id,
        montantTotal,
        new Date().toISOString(),
        {
          typeFrais: 'scolarite',
          modePaiement: 'Espèces',
          numeroRecu: 'REC' + Date.now().toString().slice(-8),
          operateur: 'ADMIN',
          notes: `Règlement de ${selectedEcheances.length} échéance(s)`
        }
      );

      showToast(`Paiement de ${montantTotal.toLocaleString('fr-FR')} FCFA enregistré`, 'success');
      setSelectedEcheances([]);
      
      // Recharger la page pour voir les changements
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Erreur paiement:', error);
      showToast('Erreur lors de l\'enregistrement du paiement', 'error');
    }
  };

  const handleReglerEcheancesAvecOptions = async (modePaiement: string = 'Espèces') => {
    if (selectedEcheances.length === 0) {
      showToast('Sélectionnez au moins une échéance à régler', 'error');
      return;
    }

    try {
      const numeroRecu = 'REC' + Date.now().toString().slice(-8);
      const result = echeancesManager.processPaymentIntelligent(
        eleve.id,
        montantTotal,
        new Date().toISOString(),
        {
          typeFrais: 'scolarite',
          modePaiement,
          numeroRecu,
          operateur: 'ADMIN',
          notes: `Règlement de ${selectedEcheances.length} échéance(s) - ${modePaiement}`
        }
      );

      // Ajouter à l'historique
      db.addHistorique({
        type: 'paiement',
        cible: 'Paiement',
        description: `Paiement de ${montantTotal.toLocaleString('fr-FR')} FCFA pour ${eleve.prenoms} ${eleve.nom} (${numeroRecu})`,
        utilisateur: 'ADMIN'
      });

      showToast(`Paiement de ${montantTotal.toLocaleString('fr-FR')} FCFA enregistré avec succès`, 'success');
      setSelectedEcheances([]);
      
      // Recharger la page pour voir les changements
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Erreur paiement:', error);
      showToast('Erreur lors de l\'enregistrement du paiement', 'error');
    }
  };

  const handlePrintRecu = (paiement: Paiement) => {
    setSelectedPaiementForRecu(paiement);
    setShowRecuModal(true);
  };

  const handlePrintCombinedRecu = () => {
    if (selectedPaiements.length === 0) {
      showToast('Sélectionnez au moins un paiement', 'error');
      return;
    }
    setShowCombinedRecuModal(true);
  };

  const getEcheanceStatusColor = (echeance: any) => {
    if (echeance.montantRestant === 0) return 'bg-green-50 text-green-700 border-green-300';
    if (echeance.isEchue) return 'bg-red-50 text-red-700 border-red-300';
    return 'bg-yellow-50 text-yellow-700 border-yellow-300';
  };

  const getEcheanceStatusIcon = (echeance: any) => {
    if (echeance.montantRestant === 0) return <CheckCircle className="h-4 w-4" />;
    if (echeance.isEchue) return <AlertTriangle className="h-4 w-4" />;
    return <Clock className="h-4 w-4" />;
  };

  if (!situationEcheances) {
    return (
      <div className="p-6">
        <div className="flex items-center space-x-4 mb-6">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Retour</span>
          </button>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-8 text-center">
          <p className="text-gray-500">Aucune configuration de frais trouvée pour cet élève</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* En-tête avec navigation */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="flex items-center space-x-2 text-white hover:bg-white hover:bg-opacity-20 px-4 py-2 rounded-xl transition-all"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Retour aux finances</span>
          </button>
          <div className="h-6 w-px bg-white bg-opacity-30"></div>
          <div>
            <h1 className="text-2xl font-bold">
              {eleve.prenoms} {eleve.nom}
            </h1>
            <p className="text-teal-100">
              {classe ? `${classe.niveau} ${classe.section}` : 'Classe non assignée'} • {eleve.matricule}
            </p>
          </div>
        </div>
        
        <div className="text-right bg-white bg-opacity-20 rounded-xl p-4">
          <div className="text-sm text-teal-100">Reste à payer</div>
          <div className="text-2xl font-bold text-white">
            {situationEcheances.totalRestant.toLocaleString('fr-FR')} FCFA
          </div>
          <div className="text-sm text-teal-100 mt-1">
            sur {situationEcheances.totalDu.toLocaleString('fr-FR')} FCFA
          </div>
        </div>
      </div>

      {/* Résumé financier */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-blue-50 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {situationEcheances.totalDu.toLocaleString('fr-FR')}
          </div>
          <p className="text-gray-600 text-sm">Total dû (FCFA)</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-green-50 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <CheckCircle className="h-6 w-6 text-green-600" />
          </div>
          <div className="text-2xl font-bold text-green-600">
            {situationEcheances.totalPaye.toLocaleString('fr-FR')}
          </div>
          <p className="text-gray-600 text-sm">Total payé (FCFA)</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-red-50 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <AlertTriangle className="h-6 w-6 text-red-600" />
          </div>
          <div className="text-2xl font-bold text-red-600">
            {situationEcheances.totalRestant.toLocaleString('fr-FR')}
          </div>
          <p className="text-gray-600 text-sm">Reste à payer (FCFA)</p>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center shadow-sm hover:shadow-md transition-shadow">
          <div className="bg-orange-50 rounded-full p-3 w-12 h-12 mx-auto mb-3 flex items-center justify-center">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <div className="text-2xl font-bold text-orange-600">
            {situationEcheances.echeancesEchues.length}
          </div>
          <p className="text-gray-600 text-sm">Échéances échues</p>
        </div>
      </div>

      {/* Échéances à payer */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="bg-teal-100 p-2 rounded-lg mr-3">💳</span>
              Échéances de paiement
            </h2>
            <div className="flex items-center space-x-4">
              {selectedEcheances.length > 0 && (
                <div className="text-sm text-gray-600 bg-teal-50 px-3 py-1 rounded-lg border border-teal-200">
                  {selectedEcheances.length} sélectionnée(s) • {montantTotal.toLocaleString('fr-FR')} FCFA
                </div>
              )}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedEcheances.length === situationEcheances.echeances.filter(e => e.montantRestant > 0).length}
                  onChange={(e) => handleSelectAllEcheances(e.target.checked)}
                  className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 font-medium">Tout sélectionner</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-3">
            {situationEcheances.echeances.map((echeance) => (
              <div
                key={echeance.echeanceId}
                className={`border-2 rounded-lg p-4 transition-all ${
                  selectedEcheances.includes(echeance.echeanceId)
                    ? 'border-teal-500 bg-teal-50'
                    : getEcheanceStatusColor(echeance)
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {echeance.montantRestant > 0 && (
                      <input
                        type="checkbox"
                        checked={selectedEcheances.includes(echeance.echeanceId)}
                        onChange={(e) => handleSelectEcheance(echeance.echeanceId, e.target.checked)}
                        className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 transform scale-110"
                      />
                    )}
                    <div className="flex items-center space-x-3">
                      {getEcheanceStatusIcon(echeance)}
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          Modalité {echeance.modalite} - {echeance.label}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Échéance : {new Date(echeance.date).toLocaleDateString('fr-FR')}
                          {echeance.isEchue && echeance.joursRetard > 0 && (
                            <span className="ml-2 text-red-600 font-medium">
                              (En retard de {echeance.joursRetard} jour{echeance.joursRetard > 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-lg font-bold text-gray-900">
                      {echeance.montant.toLocaleString('fr-FR')} FCFA
                    </div>
                    <div className="text-sm text-gray-600">
                      Payé : {echeance.montantPaye.toLocaleString('fr-FR')} FCFA
                    </div>
                    {echeance.montantRestant > 0 && (
                      <div className="text-sm font-medium text-red-600">
                        Reste : {echeance.montantRestant.toLocaleString('fr-FR')} FCFA
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton de règlement */}
          {selectedEcheances.length > 0 && (
            <div className="mt-6 p-6 bg-gradient-to-r from-teal-50 to-blue-50 rounded-xl border border-teal-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-teal-900">
                    Règlement de {selectedEcheances.length} échéance{selectedEcheances.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-teal-700">
                    Montant total : {montantTotal.toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => handleReglerEcheancesAvecOptions('Espèces')}
                    className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                  >
                    <span>💵</span>
                    <span>Espèces</span>
                  </button>
                  <button
                    onClick={() => handleReglerEcheancesAvecOptions('Mobile Money')}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    <span>📱</span>
                    <span>Mobile</span>
                  </button>
                  <button
                    onClick={() => handleReglerEcheancesAvecOptions('Chèque')}
                    className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium"
                  >
                    <CreditCard className="h-4 w-4" />
                    <span>Chèque</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Historique des paiements */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-lg">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">📋</span>
              Historique des paiements
            </h2>
            <div className="flex items-center space-x-4">
              {selectedPaiements.length > 0 && (
                <div className="text-sm text-gray-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                  {selectedPaiements.length} sélectionné{selectedPaiements.length > 1 ? 's' : ''}
                </div>
              )}
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={selectedPaiements.length === paiements.length && paiements.length > 0}
                  onChange={(e) => handleSelectAllPaiements(e.target.checked)}
                  className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700 font-medium">Tout sélectionner</span>
              </label>
            </div>
          </div>
        </div>

        <div className="p-6">
          {paiements.length === 0 ? (
            <div className="text-center py-8">
              <Receipt className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun paiement enregistré</p>
              <p className="text-gray-400 text-sm mt-1">Les paiements apparaîtront ici une fois effectués</p>
            </div>
          ) : (
            <div className="space-y-3">
              {paiements.map((paiement) => (
                <div
                  key={paiement.id}
                  className={`border rounded-lg p-4 transition-all ${
                    selectedPaiements.includes(paiement.id)
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <input
                        type="checkbox"
                        checked={selectedPaiements.includes(paiement.id)}
                        onChange={(e) => handleSelectPaiement(paiement.id, e.target.checked)}
                        className="w-5 h-5 text-teal-600 border-gray-300 rounded focus:ring-teal-500 transform scale-110"
                      />
                      <div>
                        <h3 className="font-semibold text-gray-900">
                          {paiement.montant.toLocaleString('fr-FR')} FCFA
                        </h3>
                        <p className="text-sm text-gray-600">
                          {new Date(paiement.datePaiement || paiement.createdAt).toLocaleDateString('fr-FR')} • 
                          {(paiement as any).modePaiement || 'Espèces'} • 
                          Reçu : {(paiement as any).numeroRecu || 'N/A'}
                        </p>
                        {(paiement as any).notes && (
                          <p className="text-xs text-gray-500 mt-1">{(paiement as any).notes}</p>
                        )}
                      </div>
                    </div>
                    
                    <button
                      onClick={() => handlePrintRecu(paiement)}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors font-medium"
                    >
                      <Printer className="h-4 w-4" />
                      <span>Reçu</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Actions sur les paiements sélectionnés */}
          {selectedPaiements.length > 0 && (
            <div className="mt-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-blue-900">
                    Actions sur {selectedPaiements.length} paiement{selectedPaiements.length > 1 ? 's' : ''}
                  </h3>
                  <p className="text-blue-700 text-sm mt-1">
                    Montant total : {selectedPaiements.reduce((sum, id) => {
                      const p = paiements.find(paiement => paiement.id === id);
                      return sum + (p?.montant || 0);
                    }, 0).toLocaleString('fr-FR')} FCFA
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handlePrintCombinedRecu}
                    className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all font-semibold shadow-lg"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Reçu combiné</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showRecuModal && selectedPaiementForRecu && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <RecuPaiement
              eleve={{
                nom: eleve.nom,
                prenoms: eleve.prenoms,
                matricule: eleve.matricule,
                classe: classe ? `${classe.niveau} ${classe.section}` : ''
              }}
              montantRegle={selectedPaiementForRecu.montant}
              date={selectedPaiementForRecu.datePaiement || selectedPaiementForRecu.createdAt}
              mode={(selectedPaiementForRecu as any).modePaiement || 'Espèces'}
              cumulReglement={situationEcheances.totalPaye}
              resteAPayer={situationEcheances.totalRestant}
              anneeScolaire={classe?.anneeScolaire || ''}
              operateur={(selectedPaiementForRecu as any).operateur || 'ADMIN'}
              numeroRecu={(selectedPaiementForRecu as any).numeroRecu || 'REC' + Date.now().toString().slice(-8)}
            />
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowRecuModal(false)}
                className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {showCombinedRecuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <CombinedRecu
              eleve={eleve}
              paiements={paiements.filter(p => selectedPaiements.includes(p.id))}
              classe={classe}
              anneeScolaire={classe?.anneeScolaire}
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
    </div>
  );
}