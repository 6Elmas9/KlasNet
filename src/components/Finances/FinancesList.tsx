import { useMemo, useState } from 'react';
import { Search, Plus, DollarSign, Users, FileText, Printer } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import PaymentForm from './PaymentForm';
import RecuPaiement from './RecuPaiement';

export default function FinancesList() {
  const { showToast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClasse, setFilterClasse] = useState('');
  const [filterStatut, setFilterStatut] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [showRecuModal, setShowRecuModal] = useState(false);
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [lastPayment, setLastPayment] = useState<Paiement | null>(null);

  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');

  const situationsFinancieres = useMemo(() => {
    return eleves.map(eleve => {
      const classe = classes.find(c => c.id === eleve.classeId);
      const frais = classe ? fraisScolaires.find(f => 
        f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire
      ) : undefined;

      const totalDu = frais ? 
        (frais.fraisInscription || 0) + 
        (frais.fraisScolarite || 0) + 
        (frais.fraisCantine || 0) + 
        (frais.fraisTransport || 0) + 
        (frais.fraisFournitures || 0)
        : 0;

      const paiementsEleve = paiements.filter(p => p.eleveId === eleve.id);
      const totalPaye = paiementsEleve.reduce((sum, p) => sum + p.montant, 0);
      const solde = totalDu - totalPaye;

      let statut: 'Payé' | 'Partiel' | 'Impayé' = 'Impayé';
      if (solde <= 0 && totalDu > 0) statut = 'Payé';
      else if (totalPaye > 0 && totalPaye < totalDu) statut = 'Partiel';

      return {
        eleve,
        classe,
        totalDu,
        totalPaye,
        solde,
        statut,
        dernierPaiement: paiementsEleve.length > 0 ? 
          paiementsEleve.sort((a, b) => new Date(b.datePaiement).getTime() - new Date(a.datePaiement).getTime())[0]
          : null
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

  const handlePaymentSubmit = (eleveId: string, _montant: number, _type: string, _modalite: number | 'auto', paiement?: Paiement | null) => {
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

  const handlePrintRecu = (eleve: Eleve, paiement: Paiement) => {
    const classe = classes.find(c => c.id === eleve.classeId);
    const situation = situationsFinancieres.find(s => s.eleve.id === eleve.id);
    
    if (!situation) return;

    const newWindow = window.open('', '_blank', 'width=800,height=600');
    if (newWindow) {
      newWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Reçu</title></head><body>` +
        `<h2>Reçu de paiement</h2>` +
        `<p><strong>Élève:</strong> ${eleve.prenoms} ${eleve.nom}</p>` +
        `<p><strong>Matricule:</strong> ${eleve.matricule}</p>` +
        `<p><strong>Classe:</strong> ${classe ? `${classe.niveau} ${classe.section}` : ''}</p>` +
        `<p><strong>Montant:</strong> ${paiement.montant.toLocaleString('fr-FR')} FCFA</p>` +
        `<p><strong>Date:</strong> ${paiement.datePaiement}</p>` +
        `</body></html>`);
      newWindow.document.close();
      setTimeout(() => newWindow.print(), 300);
    }
  };

  const handlePrintConvocation = (eleve: Eleve) => {
    try {
      // fallback simple convocation (computeScheduleForEleve may not be available)
      const classe = classes.find(c => c.id === eleve.classeId);
      const newWindow = window.open('', '_blank', 'width=800,height=600');
      if (newWindow) {
        newWindow.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Convocation</title></head><body>` +
          `<h2>Convocation de paiement</h2>` +
          `<p><strong>Élève:</strong> ${eleve.prenoms} ${eleve.nom}</p>` +
          `<p><strong>Classe:</strong> ${classe ? `${classe.niveau} ${classe.section}` : ''}</p>` +
          `</body></html>`);
        newWindow.document.close();
        setTimeout(() => newWindow.print(), 300);
      }
    } catch (error) {
      console.error('Erreur convocation:', error);
      showToast('Erreur lors de la génération de la convocation', 'error');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion Financière</h1>
          <p className="text-gray-600">{filteredSituations.length} élève(s) trouvé(s)</p>
        </div>
        <button 
          onClick={() => setShowPaymentForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          <Plus className="h-4 w-4" />
          <span>Nouveau Paiement</span>
        </button>
      </div>

      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un élève..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterClasse}
            onChange={(e) => setFilterClasse(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
          >
            <option value="">Tous les statuts</option>
            <option value="Payé">Payé</option>
            <option value="Partiel">Partiel</option>
            <option value="Impayé">Impayé</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Recettes</p>
              <p className="text-2xl font-bold text-green-600">
                {formatMontant(paiements.reduce((sum, p) => sum + p.montant, 0))}
              </p>
            </div>
            <DollarSign className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Payé</p>
              <p className="text-2xl font-bold text-green-600">
                {situationsFinancieres.filter(s => s.statut === 'Payé').length}
              </p>
            </div>
            <Users className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Partiel</p>
              <p className="text-2xl font-bold text-orange-600">
                {situationsFinancieres.filter(s => s.statut === 'Partiel').length}
              </p>
            </div>
            <Users className="h-8 w-8 text-orange-600" />
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Impayé</p>
              <p className="text-2xl font-bold text-red-600">
                {situationsFinancieres.filter(s => s.statut === 'Impayé').length}
              </p>
            </div>
            <Users className="h-8 w-8 text-red-600" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Élève</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Classe</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Dû</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Total Payé</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Solde</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Statut</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Dernier Paiement</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredSituations.map((situation) => (
                <tr key={situation.eleve.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center space-x-3">
                      {situation.eleve.photo && (
                        <img 
                          src={situation.eleve.photo} 
                          alt={`${situation.eleve.prenoms} ${situation.eleve.nom}`}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {situation.eleve.prenoms} {situation.eleve.nom}
                        </div>
                        <div className="text-xs text-gray-500">
                          {situation.eleve.matricule}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {situation.classe ? `${situation.classe.niveau} ${situation.classe.section}` : 'Non assigné'}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatMontant(situation.totalDu)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 text-right font-medium">
                    {formatMontant(situation.totalPaye)}
                  </td>
                  <td className="px-4 py-3 text-sm text-right font-medium">
                    <span className={situation.solde > 0 ? 'text-red-600' : 'text-green-600'}>
                      {formatMontant(Math.abs(situation.solde))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatutColor(situation.statut)}`}>
                      {situation.statut}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-sm text-gray-600">
                    {situation.dernierPaiement ? 
                      new Date(situation.dernierPaiement.datePaiement).toLocaleDateString('fr-FR')
                      : '-'
                    }
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center space-x-2">
                      <button
                        onClick={() => setShowPaymentForm(true)}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Nouveau paiement"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                      {situation.dernierPaiement && (
                        <button
                          onClick={() => situation.dernierPaiement && handlePrintRecu(situation.eleve, situation.dernierPaiement)}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="Imprimer reçu"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      )}
                      {situation.solde > 0 && (
                        <button
                          onClick={() => handlePrintConvocation(situation.eleve)}
                          className="p-1 text-red-600 hover:bg-red-50 rounded"
                          title="Convocation de paiement"
                        >
                          <FileText className="h-4 w-4" />
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
            <DollarSign className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucune situation financière trouvée</p>
          </div>
        )}
      </div>

      {showPaymentForm && (
        <PaymentForm
          onSubmit={handlePaymentSubmit}
          onCancel={() => setShowPaymentForm(false)}
        />
      )}

      {showRecuModal && selectedEleve && lastPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <RecuPaiement
              eleve={{
                nom: selectedEleve.nom,
                prenoms: selectedEleve.prenoms,
                matricule: selectedEleve.matricule,
                classe: classes.find(c => c.id === selectedEleve.classeId)?.niveau + ' ' + 
                        classes.find(c => c.id === selectedEleve.classeId)?.section || ''
              }}
              montantRegle={lastPayment.montant}
              date={lastPayment.datePaiement}
              mode={lastPayment.modePaiement}
              cumulReglement={situationsFinancieres.find(s => s.eleve.id === selectedEleve.id)?.totalPaye || 0}
              resteAPayer={Math.max(0, situationsFinancieres.find(s => s.eleve.id === selectedEleve.id)?.solde || 0)}
              anneeScolaire={classes.find(c => c.id === selectedEleve.classeId)?.anneeScolaire || ''}
              operateur={lastPayment.operateur}
              numeroRecu={lastPayment.numeroRecu}
            />
            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowRecuModal(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
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