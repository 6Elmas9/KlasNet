import React, { useMemo, useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Users, DollarSign, BookOpen, TrendingUp, XCircle, BarChart3, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { db } from '../../utils/database';
import { Eleve, Paiement, FraisScolaire, Classe, Note, Ecole, SituationFinanciere } from '../../types';

import { format } from 'date-fns';
import ParamEntetesModal from '../Config/ParamEntetesModal';
import { echeancesManager } from '../../utils/echeancesManager';

export default function Dashboard() {
  const [showParamEntetes, setShowParamEntetes] = useState(false);
  // Fonctions pour navigation rapide
  const handleNouvelEleve = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'eleves', action: 'new' } }));
  };
  const handleNouveauPaiement = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'finances', action: 'new' } }));
  };
  const handleSaisirNotes = () => {
    window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'notes', action: 'new' } }));
  };

  const eleves = db.getAll<Eleve>('eleves');
  const paiements = db.getAll<Paiement>('paiements');
  const fraisScolaires = db.getAll<FraisScolaire>('fraisScolaires');
  const classes = db.getAll<Classe>('classes');
  const notes = db.getAll<Note>('notes');

  // Alertes d'échéances intelligentes
  const alertesEcheances = useMemo(() => {
    return echeancesManager.getAlertesEcheances();
  }, []);
  // Alertes : élèves sans notes et paiements en retard
  const elevesSansNotes = useMemo(() => {
    return eleves.filter(eleve => !notes.some(note => note.eleveId === eleve.id));
  }, [eleves, notes]);

  const paiementsEnRetard = useMemo(() => {
    // Un élève est en retard si son solde est positif et qu'il est actif
    return eleves.filter(eleve => {
      const frais = fraisScolaires.find(f => f.niveau === eleve.classeId);
      const totalDu = frais ?
        frais.fraisInscription + frais.fraisScolarite + frais.fraisCantine + frais.fraisTransport + frais.fraisFournitures
        : 0;
      const totalPaye = paiements.filter(p => p.eleveId === eleve.id).reduce((sum, p) => sum + p.montant, 0);
      return eleve.statut === 'Actif' && totalDu > 0 && totalPaye < totalDu;
    });
  }, [eleves, paiements, fraisScolaires]);
  // Répartition des élèves par classe
  const repartitionParClasse = useMemo(() => {
    const data = classes.map(classe => ({
      nom: classe.niveau + (classe.section ? ' ' + classe.section : ''),
      value: eleves.filter(e => e.classeId === classe.id).length
    })).filter(c => c.value > 0);
    return data;
  }, [classes, eleves]);

  // Répartition des élèves par niveau
  const repartitionParNiveau = useMemo(() => {
    const niveaux = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];
    return niveaux.map(niveau => ({
      niveau,
      value: classes.filter(c => c.niveau === niveau).reduce((acc, c) => acc + eleves.filter(e => e.classeId === c.id).length, 0)
    })).filter(n => n.value > 0);
  }, [classes, eleves]);

  // Récupérer l'école et l'année scolaire active
  const [ecole, setEcole] = useState<Ecole | null>(null);
  useEffect(() => {
    const ecoleData = db.getAll<Ecole>('ecole')[0] || null;
    setEcole(ecoleData);
  }, []);



  const stats = useMemo(() => {
    const totalEleves = eleves.length;
    const elevesActifs = eleves.filter(e => e.statut === 'Actif').length;
    
    const totalRecettes = paiements.reduce((sum, p) => sum + p.montant, 0);
    const recettesMoisCourant = paiements
      .filter(p => {
        const paiementDate = new Date(p.datePaiement);
        const maintenant = new Date();
        return paiementDate.getMonth() === maintenant.getMonth() &&
               paiementDate.getFullYear() === maintenant.getFullYear();
      })
      .reduce((sum, p) => sum + p.montant, 0);

    // Calcul des situations financières
    const situationsFinancieres = eleves.map(eleve => {
      // Trouver la classe de l'élève puis chercher les frais pour son niveau/année
      const classeObj = classes.find(c => c.id === eleve.classeId);
      const frais = classeObj ? fraisScolaires.find(f => f.niveau === classeObj.niveau && f.anneeScolaire === classeObj.anneeScolaire) : undefined;
      
      // Calculer le total dû à partir des échéances
      let totalDu = 0;
      if (frais && frais.echeances && frais.echeances.length > 0) {
        totalDu = frais.echeances.reduce((sum, echeance) => sum + (echeance.montant || 0), 0);
      }

      const paiementsEleve = paiements.filter(p => p.eleveId === eleve.id);
      const totalPaye = paiementsEleve.reduce((sum, p) => sum + p.montant, 0);
      const solde = totalDu - totalPaye;

      let statut: SituationFinanciere['statut'] = 'Non Payé';
      if (totalDu > 0 && solde <= 0) statut = 'Payé';
      else if (totalDu === 0) statut = 'Non Payé'; // Pas de frais configurés = Non Payé
      else if (totalPaye > 0) statut = 'Partiellement Payé';

      return { eleveId: eleve.id, statut, solde };
    });

    const elevesParStatut = {
      soldes: situationsFinancieres.filter(s => s.statut === 'Payé').length,
      partiels: situationsFinancieres.filter(s => s.statut === 'Partiellement Payé').length,
      impayes: situationsFinancieres.filter(s => s.statut === 'Non Payé').length
    };

    return {
      totalEleves,
      elevesActifs,
      totalRecettes,
      recettesMoisCourant,
      elevesParStatut
    };
  }, [eleves, paiements, fraisScolaires]);

  const recettesParMois = useMemo(() => {
    const mois = Array.from({length: 12}, (_, i) => ({
      mois: format(new Date(2024, i, 1), 'MMM'),
      recettes: 0
    }));

    paiements.forEach(paiement => {
      const date = new Date(paiement.datePaiement);
      const moisIndex = date.getMonth();
      if (moisIndex >= 0 && moisIndex < 12) {
        mois[moisIndex].recettes += paiement.montant;
      }
    });

    return mois;
  }, [paiements]);

  const repartitionPaiements = [
    { name: 'Payé', value: stats.elevesParStatut.soldes, color: '#16A085' },
    { name: 'Partiellement Payé', value: stats.elevesParStatut.partiels, color: '#F39C12' },
    { name: 'Non Payé', value: stats.elevesParStatut.impayes, color: '#E74C3C' }
  ];

  const formatMontant = (montant: number) => {
    return new Intl.NumberFormat('fr-FR').format(montant) + ' FCFA';
  };

  return (
    <div className="p-6 space-y-6">
      {/* En-tête modernisé */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-teal-700 tracking-tight drop-shadow">Tableau de Bord</h1>
          <p className="text-base text-blue-600 font-medium mt-1">Vue d'ensemble de l'école - Année scolaire {ecole?.anneeScolaireActive || 'Non configurée'}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-gray-500">Dernière mise à jour</p>
          <p className="text-sm font-medium text-gray-900">{format(new Date(), 'dd/MM/yyyy à HH:mm')}</p>
        </div>
      </div>

      {/* Alertes */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-lg flex items-start gap-4 mb-4">
        <Info className="h-6 w-6 text-yellow-500 mt-1" />
        <div>
          <h3 className="font-bold text-yellow-700 mb-1">Alertes</h3>
          {elevesSansNotes.length === 0 && paiementsEnRetard.length === 0 && alertesEcheances.echeancesEchues.length === 0 && (
            <p className="text-sm text-gray-700">Aucune alerte à signaler. Tout est à jour.</p>
          )}
          {elevesSansNotes.length > 0 && (
            <p className="text-sm text-yellow-800 mb-1">{elevesSansNotes.length} élève(s) n'ont aucune note enregistrée.</p>
          )}
          {alertesEcheances.echeancesEchues.length > 0 && (
            <p className="text-sm text-yellow-800 mb-1">{alertesEcheances.echeancesEchues.length} élève(s) ont des échéances échues.</p>
          )}
          {alertesEcheances.echeancesProches.length > 0 && (
            <p className="text-sm text-yellow-800">{alertesEcheances.echeancesProches.length} échéance(s) arrivent à terme dans les 7 prochains jours.</p>
          )}
        </div>
      </div>

      {/* Cartes de statistiques */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Élèves Actifs</p>
              <p className="text-3xl font-bold text-gray-900">{stats.elevesActifs}</p>
              <p className="text-sm text-gray-500">Total: {stats.totalEleves}</p>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Recettes Totales</p>
              <p className="text-2xl font-bold text-gray-900">{formatMontant(stats.totalRecettes)}</p>
              <p className="text-sm text-green-600">
                <TrendingUp className="inline h-3 w-3 mr-1" />
                Ce mois: {formatMontant(stats.recettesMoisCourant)}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Paiements Complétés</p>
              <p className="text-3xl font-bold text-green-600">{stats.elevesParStatut.soldes}</p>
              <div className="flex items-center space-x-2 mt-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-sm text-gray-500">Frais payés</span>
              </div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Non Payé</p>
              <p className="text-3xl font-bold text-red-600">{stats.elevesParStatut.impayes}</p>
              <div className="flex items-center space-x-2 mt-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <span className="text-sm text-gray-500">En attente de paiement</span>
              </div>
            </div>
            <div className="bg-red-50 p-3 rounded-lg">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Évolution des recettes */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-teal-600" /> Évolution des Recettes (FCFA)
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={recettesParMois}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="mois" />
              <YAxis tickFormatter={(value) => new Intl.NumberFormat('fr-FR', { notation: 'compact' }).format(value)} />
              <Tooltip formatter={(value) => formatMontant(Number(value))} />
              <Bar dataKey="recettes" fill="#16A085" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des paiements */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" /> Situation des Paiements
          </h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={repartitionPaiements}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
              >
                {repartitionPaiements.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center space-x-6 mt-4">
            {repartitionPaiements.map((item) => (
              <div key={item.name} className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }}></div>
                <span className="text-sm text-gray-600">{item.name} ({item.value})</span>
              </div>
            ))}
          </div>
        </div>

        {/* Répartition des élèves par classe */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-blue-600" /> Répartition des élèves par classe
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={repartitionParClasse} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="nom" type="category" width={80} />
              <Tooltip />
              <Bar dataKey="value" fill="#3498db" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Répartition des élèves par niveau */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-600" /> Répartition des élèves par niveau
          </h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={repartitionParNiveau} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" allowDecimals={false} />
              <YAxis dataKey="niveau" type="category" width={60} />
              <Tooltip />
              <Bar dataKey="value" fill="#9b59b6" radius={[0, 8, 8, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions Rapides</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left" onClick={handleNouvelEleve}>
            <div className="flex items-center space-x-3">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">Nouvel Élève</p>
                <p className="text-sm text-gray-500">Inscrire un nouvel élève</p>
              </div>
            </div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left" onClick={handleNouveauPaiement}>
            <div className="flex items-center space-x-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-gray-900">Nouveau Paiement</p>
                <p className="text-sm text-gray-500">Enregistrer un paiement</p>
              </div>
            </div>
          </button>
          
          <button className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left" onClick={handleSaisirNotes}>
            <div className="flex items-center space-x-3">
              <BookOpen className="h-5 w-5 text-purple-600" />
              <div>
                <p className="font-medium text-gray-900">Saisir Notes</p>
                <p className="text-sm text-gray-500">Enregistrer les notes</p>
              </div>
            </div>
          </button>
          {/* Paramètres d'impression accessibles depuis Configuration */}
        </div>
      </div>
      {showParamEntetes && <ParamEntetesModal onClose={() => setShowParamEntetes(false)} />}
    </div>
  );
}