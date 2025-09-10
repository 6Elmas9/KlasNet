import React, { useState, useEffect } from 'react';
import { db } from '../../utils/database';
import { CompositionConfig, Ecole } from '../../types';
import ConfigBackup from './ConfigBackup';
import HistoriqueList from './HistoriqueList';
import { calculerMoyenneAnnuelle } from '../../utils/bilan';
import { X } from 'lucide-react';

export default function ConfigCompositions() {
  // Aperçu DFA avant passage d'année
  const [showDfaPreview, setShowDfaPreview] = useState(false);
  const [dfaPreview, setDfaPreview] = useState<{ eleve: import('../../types').Eleve, moyenne: number, admis: boolean }[]>([]);
  const handlePreviewDfa = () => {
    const eleves = db.getAll<import('../../types').Eleve>('eleves');
    const preview = eleves.map(eleve => {
      const moyenne = calculerMoyenneAnnuelle(eleve);
      return {
        eleve,
        moyenne,
        admis: moyenne >= seuilAdmission
      };
    });
    setDfaPreview(preview);
    setShowDfaPreview(true);
  };
  const handleValiderPassage = () => {
    import('../../utils/passageAnnee').then(mod => {
      const dfa = Object.fromEntries(dfaPreview.map(p => [p.eleve.id, p.moyenne]));
      mod.passageAnneeScolaire({ dfa, seuilAdmission, nouvelleAnnee: anneeInput || anneeActive });
      setShowDfaPreview(false);
      window.location.reload();
    });
  };
  const [anneeActive, setAnneeActive] = useState(new Date().getFullYear() + '-' + (new Date().getFullYear() + 1));
  const [anneeInput, setAnneeInput] = useState('');
  
  const [ecole, setEcole] = useState<Ecole | null>(null);
  const [compositions, setCompositions] = useState<CompositionConfig[]>([]);
  const [editing, setEditing] = useState<CompositionConfig | null>(null);
  const [nom, setNom] = useState('');
  const [coefficient, setCoefficient] = useState(1);
  const [error, setError] = useState('');
  const [showBackup, setShowBackup] = useState(false);
  const [showHistorique, setShowHistorique] = useState(false);
  const [seuilAdmission, setSeuilAdmission] = useState(10);

  // Clôture d'année scolaire
  const handleClotureAnnee = () => {
    if (!window.confirm("Clôturer l'année ? Cette opération est irréversible. Les moyennes seront calculées, les admis promus, les autres redoublent, et les données sensibles seront archivées puis remises à zéro.")) return;
    const niveaux = ['CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'];
    const eleves = db.getAll('eleves');
    const classes = db.getAll('classes');
    let nbPromus = 0, nbRedoublants = 0;
    eleves.forEach((eleve) => {
      if (eleve.statut === 'Actif') {
        const moyenne = calculerMoyenneAnnuelle(eleve, '');
        const classe = classes.find((c) => c.id === eleve.classeId);
        if (!classe) return;
        const idx = niveaux.indexOf(classe.niveau);
        if (idx >= 0 && idx < niveaux.length - 1 && moyenne >= seuilAdmission) {
          // Promotion
          const nextNiveau = niveaux[idx + 1];
          const nextClasse = classes.find((c) => c.niveau === nextNiveau && c.section === classe.section);
          if (nextClasse) {
            db.update('eleves', eleve.id, { classeId: nextClasse.id });
            nbPromus++;
          }
        } else if (idx === niveaux.length - 1 && moyenne >= seuilAdmission) {
          // Dernier niveau, admis sortant
          db.update('eleves', eleve.id, { statut: 'Inactif' });
          nbPromus++;
        } else {
          // Redoublement
          nbRedoublants++;
        }
      }
    });
    // Archivage (sauvegarde JSON)
    const archive = {
      date: new Date().toISOString(),
      eleves,
      notes: db.getAll('notes'),
      paiements: db.getAll('paiements'),
      compositions: db.getAll('compositions'),
      fraisScolaires: db.getAll('fraisScolaires'),
      type: 'archive_annuelle'
    };
    const blob = new Blob([JSON.stringify(archive, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `archive_annee_${new Date().getFullYear()}.json`;
    a.click();
    window.URL.revokeObjectURL(url);
    // Reset des données sensibles
    db.resetData();
    db.addHistorique({
      type: 'autre',
      cible: 'Élève',
      description: `Clôture d'année : ${nbPromus} promus, ${nbRedoublants} redoublants. Données archivées et réinitialisées.`,
      utilisateur: 'ADMIN',
    });
    window.location.reload();
  };

  // NOTE: passageAnnee logic is available via DFA validation; separate bulk passage action removed to avoid duplication

  useEffect(() => {
    const ecoleData = db.getAll<Ecole>('ecole')[0];
    if (ecoleData) {
      setEcole(ecoleData);
      setCompositions(ecoleData.compositions || []);
      if (ecoleData.anneeScolaireActive) {
        setAnneeActive(ecoleData.anneeScolaireActive);
      }
    }
  }, []);

  

  const handleAdd = () => {
    if (!nom.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    if (compositions.some(c => c.nom.toLowerCase() === nom.trim().toLowerCase())) {
      setError('Ce nom existe déjà');
      return;
    }
    const newComp: CompositionConfig = {
      id: Date.now().toString(),
      nom: nom.trim(),
      coefficient: coefficient
    };
    const newList = [...compositions, newComp];
    setCompositions(newList);
    setNom('');
    setCoefficient(1);
    setError('');
    saveToDb(newList);
  };

  const handleEdit = (comp: CompositionConfig) => {
    setEditing(comp);
    setNom(comp.nom);
    setCoefficient(comp.coefficient);
    setError('');
  };

  const handleUpdate = () => {
    if (!editing) return;
    if (!nom.trim()) {
      setError('Le nom est obligatoire');
      return;
    }
    if (compositions.some(c => c.nom.toLowerCase() === nom.trim().toLowerCase() && c.id !== editing.id)) {
      setError('Ce nom existe déjà');
      return;
    }
    const newList = compositions.map(c => c.id === editing.id ? { ...c, nom, coefficient } : c);
    setCompositions(newList);
    setEditing(null);
    setNom('');
    setCoefficient(1);
    setError('');
    saveToDb(newList);
  };

  const handleDelete = (id: string) => {
    const newList = compositions.filter(c => c.id !== id);
    setCompositions(newList);
    if (editing && editing.id === id) {
      setEditing(null);
      setNom('');
      setCoefficient(1);
    }
    saveToDb(newList);
  };

  const saveToDb = (comps: CompositionConfig[]) => {
    if (!ecole) return;
    db.update<Ecole>('ecole', ecole.id, { compositions: comps });
  };

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto px-6">
      {/* En-tête moderne */}
      <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-6 rounded-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">⚙️ Configuration Système</h1>
            <p className="text-teal-100">Paramètres généraux de l'école</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-teal-100">Année active</div>
            <div className="text-xl font-bold">{anneeActive}</div>
          </div>
        </div>
      </div>

      {/* Actions principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all text-left"
          onClick={handlePreviewDfa}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-blue-100 p-3 rounded-lg">
              <span className="text-2xl">📊</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Aperçu DFA</div>
              <div className="text-sm text-gray-600">Voir les résultats</div>
            </div>
          </div>
        </button>

        <button
          className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all text-left"
          onClick={() => setShowBackup(!showBackup)}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-teal-100 p-3 rounded-lg">
              <span className="text-2xl">💾</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Sauvegarde</div>
              <div className="text-sm text-gray-600">Export/Import</div>
            </div>
          </div>
        </button>

        <button
          className="p-4 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all text-left"
          onClick={() => setShowHistorique(!showHistorique)}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-gray-100 p-3 rounded-lg">
              <span className="text-2xl">📋</span>
            </div>
            <div>
              <div className="font-semibold text-gray-900">Historique</div>
              <div className="text-sm text-gray-600">Actions système</div>
            </div>
          </div>
        </button>

        <button
          className="p-4 bg-white rounded-xl border border-red-200 hover:shadow-lg transition-all text-left"
          onClick={handleClotureAnnee}
        >
          <div className="flex items-center space-x-3">
            <div className="bg-red-100 p-3 rounded-lg">
              <span className="text-2xl">🔒</span>
            </div>
            <div>
              <div className="font-semibold text-red-900">Clôturer l'année</div>
              <div className="text-sm text-red-600">Action définitive</div>
            </div>
          </div>
        </button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-2xl mr-2">🎓</span>
          Année Scolaire Active
        </h2>
        
        <div className="bg-teal-50 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-4">
            <span className="font-semibold text-teal-700 text-lg">{anneeActive}</span>
            <input
              type="text"
              value={anneeInput}
              onChange={e => setAnneeInput(e.target.value)}
              className="border border-teal-300 rounded-lg px-3 py-2 w-40 focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              placeholder="Ex: 2025-2026"
            />
            <button
              className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors"
              onClick={() => {
                if (!anneeInput.trim()) return;
                setAnneeActive(anneeInput.trim());
                setAnneeInput('');
                if (ecole) db.update<Ecole>('ecole', ecole.id, { anneeScolaireActive: anneeInput.trim() });
              }}
            >
              Changer
            </button>
          </div>
          <p className="text-sm text-teal-600 mt-2">L'année scolaire active sera utilisée pour toutes les nouvelles saisies</p>
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">Seuil d'admission (sur 20)</label>
          <div className="flex items-center gap-2 mt-2">
            <input type="number" min={0} max={20} value={seuilAdmission} onChange={e => setSeuilAdmission(Number(e.target.value))} className="w-24 px-3 py-2 border rounded" />
            <div className="text-sm text-gray-500">Les élèves avec une moyenne &gt;= seuil seront marqués admis dans l'aperçu DFA.</div>
          </div>
        </div>

  </div>

      {/* Affichage conditionnel des modules */}
      {showBackup && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-xl mr-2">💾</span>
              Sauvegarde et Restauration
            </h3>
            <button 
              onClick={() => setShowBackup(false)}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <ConfigBackup />
        </div>
      )}

      {showHistorique && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <span className="text-xl mr-2">📋</span>
              Historique des Actions
            </h3>
            <button 
              onClick={() => setShowHistorique(false)}
              className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
          <HistoriqueList />
        </div>
      )}

      {/* Aperçu DFA Modal */}
      {showDfaPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-6xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">📊 Aperçu DFA - Délibération de Fin d'Année</h3>
              <button 
                onClick={() => setShowDfaPreview(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-blue-900">Seuil d'admission: {seuilAdmission}/20</div>
                  <div className="text-sm text-blue-700">
                    Admis: {dfaPreview.filter(p => p.admis).length} | 
                    Redoublants: {dfaPreview.filter(p => !p.admis).length}
                  </div>
                </div>
                <button
                  onClick={handleValiderPassage}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
                >
                  ✅ Valider le passage
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left font-semibold">Élève</th>
                    <th className="px-4 py-3 text-center font-semibold">Moyenne</th>
                    <th className="px-4 py-3 text-center font-semibold">Décision</th>
                  </tr>
                </thead>
                <tbody>
                  {dfaPreview.map(p => (
                    <tr key={p.eleve.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">{p.eleve.prenoms} {p.eleve.nom}</td>
                      <td className="px-4 py-3 text-center font-bold">{p.moyenne.toFixed(2)}/20</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          p.admis ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {p.admis ? '✅ Admis' : '❌ Redouble'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
          <span className="text-xl mr-2">📝</span>
          Configuration des Compositions
        </h2>
        {/* ...composition config UI unchanged... */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-4">
          <div className="flex space-x-3">
            <input
              type="text"
              placeholder="Nom de la composition"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={nom}
              onChange={e => setNom(e.target.value)}
            />
            <input
              type="number"
              min={1}
              max={10}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              value={coefficient}
              onChange={e => setCoefficient(Number(e.target.value))}
            />
            {editing ? (
              <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors" onClick={handleUpdate}>Modifier</button>
            ) : (
              <button className="bg-teal-600 text-white px-4 py-2 rounded-lg hover:bg-teal-700 transition-colors" onClick={handleAdd}>Ajouter</button>
            )}
            {editing && (
              <button className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-lg transition-colors" onClick={() => { setEditing(null); setNom(''); setCoefficient(1); }}>
                <X className="h-5 w-5" />
              </button>
            )}
          </div>
          {error && <div className="text-red-500 text-sm">{error}</div>}
        </div>
        
        <div className="mt-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
            <thead>
                <tr className="bg-gray-100">
                  <th className="px-4 py-3 text-left font-semibold text-gray-900">Nom</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Coefficient</th>
                  <th className="px-4 py-3 text-center font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              {compositions.map(comp => (
                  <tr key={comp.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 border-b border-gray-100">{comp.nom}</td>
                    <td className="px-4 py-3 border-b border-gray-100 text-center font-medium">{comp.coefficient}</td>
                    <td className="px-4 py-3 border-b border-gray-100 text-center space-x-2">
                      <button className="text-blue-600 hover:bg-blue-50 px-2 py-1 rounded transition-colors" onClick={() => handleEdit(comp)}>Éditer</button>
                      <button className="text-red-600 hover:bg-red-50 px-2 py-1 rounded transition-colors" onClick={() => handleDelete(comp.id)}>Supprimer</button>
                  </td>
                </tr>
              ))}
              {compositions.length === 0 && (
                  <tr><td colSpan={3} className="text-center text-gray-500 py-8">Aucune composition configurée</td></tr>
              )}
            </tbody>
          </table>
          </div>
        </div>
      </div>
        
    </div>
  );
}