import { useState, useMemo, useEffect } from 'react';
import { db } from '../../utils/database';
import { Eleve, Classe, Matiere, Note, CompositionConfig, MoyenneEleve } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { Save, BookOpen, Users, Calculator } from 'lucide-react';

export default function NotesParClasse() {
  const { showToast } = useToast();
  const [selectedClasseId, setSelectedClasseId] = useState('');
  const [selectedComposition, setSelectedComposition] = useState('');
  const [selectedMatiere, setSelectedMatiere] = useState('');
  const [notes, setNotes] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [showMoyennes, setShowMoyennes] = useState(false);

  const classes = db.getAll<Classe>('classes');
  // const matieres = db.getAll<Matiere>('matieres'); // unused
  const compositions = db.getAll<CompositionConfig>('compositions');
  const allNotes = db.getAll<Note>('notes');

  const selectedClasse = classes.find(c => c.id === selectedClasseId);
  const elevesClasse = db.getAll<Eleve>('eleves').filter(e => 
    e.classeId === selectedClasseId && e.statut === 'Actif'
  );

  // Compositions pour le niveau de la classe sélectionnée
  const compositionsNiveau = useMemo(() => {
    if (!selectedClasse) return compositions;
    return compositions.filter(c => 
      !c.niveau || c.niveau === selectedClasse.niveau
    ).sort((a, b) => a.ordre - b.ordre);
  }, [selectedClasse, compositions]);

  // Matières de la classe sélectionnée
  const matieresClasse = useMemo(() => {
    if (!selectedClasse) return [];
    return selectedClasse.matieres || [];
  }, [selectedClasse]);

  // Charger les notes existantes
  useEffect(() => {
    if (!selectedComposition || !selectedMatiere || !selectedClasseId) return;
    
    const notesExistantes: Record<string, number> = {};
    elevesClasse.forEach(eleve => {
      const note = allNotes.find(n => 
        n.eleveId === eleve.id && 
        n.matiereId === selectedMatiere && 
        n.compositionId === selectedComposition &&
        n.classeId === selectedClasseId
      );
      if (note) {
        notesExistantes[eleve.id] = note.valeur;
      }
    });
    setNotes(notesExistantes);
  }, [selectedComposition, selectedMatiere, selectedClasseId, elevesClasse, allNotes]);

  const handleNoteChange = (eleveId: string, valeur: number) => {
    setNotes(prev => ({ ...prev, [eleveId]: valeur }));
  };

  const handleSaveNotes = async () => {
    if (!selectedComposition || !selectedMatiere || !selectedClasseId) {
      showToast('Sélectionnez une classe, composition et matière', 'error');
      return;
    }

    const selectedMatiereObj = matieresClasse.find(m => m.id === selectedMatiere);
    if (!selectedMatiereObj) return;

    const bareme = getBaremeNote(selectedMatiereObj);

    setIsSaving(true);
    try {
      Object.entries(notes).forEach(([eleveId, valeur]) => {
        if (valeur >= 0 && valeur <= bareme) {
          const existingNote = allNotes.find(n => 
            n.eleveId === eleveId && 
            n.matiereId === selectedMatiere && 
            n.compositionId === selectedComposition &&
            n.classeId === selectedClasseId
          );

          const noteData = {
            eleveId,
            matiereId: selectedMatiere,
            compositionId: selectedComposition,
            classeId: selectedClasseId,
            valeur,
            bareme,
            date: new Date().toISOString()
          };

          if (existingNote) {
            db.update<Note>('notes', existingNote.id, noteData as Partial<Note>);
          } else {
            db.create('notes', noteData);
          }
        }
      });
      
      // Recalculer les moyennes pour cette composition
      calculerMoyennesComposition();
      
      showToast('Notes enregistrées avec succès', 'success');
    } catch (error) {
      console.error(error);
      showToast('Erreur lors de l\'enregistrement des notes', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const calculerMoyennesComposition = () => {
    if (!selectedComposition || !selectedClasseId) return;

    elevesClasse.forEach(eleve => {
      const notesEleve = allNotes.filter(n => 
        n.eleveId === eleve.id && 
        n.compositionId === selectedComposition &&
        n.classeId === selectedClasseId
      );

      if (notesEleve.length === 0) return;

      let totalPoints = 0;
      let totalCoefficients = 0;

      notesEleve.forEach(note => {
        const matiere = matieresClasse.find(m => m.id === note.matiereId);
        if (matiere) {
          // Normaliser la note sur 20
          const noteNormalisee = (note.valeur / note.bareme) * 20;
          totalPoints += noteNormalisee * matiere.coefficient;
          totalCoefficients += matiere.coefficient;
        }
      });

      const moyenne = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;

      // Sauvegarder ou mettre à jour la moyenne
      const existingMoyenne = db.getAll<MoyenneEleve>('moyennesGenerales').find(m =>
        m.eleveId === eleve.id &&
        m.compositionId === selectedComposition &&
        m.classeId === selectedClasseId
      );

      const moyenneData = {
        eleveId: eleve.id,
        classeId: selectedClasseId,
        compositionId: selectedComposition,
        moyenne: Math.round(moyenne * 100) / 100,
        dateCalcul: new Date().toISOString()
      };

      if (existingMoyenne) {
        db.update<MoyenneEleve>('moyennesGenerales', existingMoyenne.id, moyenneData as Partial<MoyenneEleve>);
      } else {
        db.create('moyennesGenerales', moyenneData);
      }
    });
  };

  const getMoyenneEleve = (eleveId: string, compositionId: string) => {
    const moyenne = db.getAll<MoyenneEleve>('moyennesGenerales').find(m =>
      m.eleveId === eleveId &&
      m.compositionId === compositionId &&
      m.classeId === selectedClasseId
    );
    return moyenne ? moyenne.moyenne : 0;
  };

  const getBaremeNote = (matiere: Matiere) => {
    if (!selectedClasse) return 20;
    
    const niveau = selectedClasse.niveau;
    
    // CE1 à CM2 : barèmes spéciaux selon le système ivoirien
    if (['CE1', 'CE2', 'CM1', 'CM2'].includes(niveau)) {
      if (matiere.nom.toLowerCase().includes('math')) return 50;
      if (matiere.nom.toLowerCase().includes('éveil')) return 50;
      if (matiere.nom.toLowerCase().includes('exploitation') || matiere.nom.toLowerCase().includes('texte')) return 50;
      if (matiere.nom.toLowerCase().includes('orthographe')) return 20;
    }
    
    // CP1, CP2 et maternelles : /20 par défaut
    return 20;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-8 rounded-2xl shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white bg-opacity-20 p-4 rounded-xl">
              <BookOpen className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Gestion des Notes par Classe</h1>
              <p className="text-indigo-100 mt-2">Saisie et suivi des évaluations par classe et composition</p>
            </div>
          </div>
          <button
            onClick={() => setShowMoyennes(!showMoyennes)}
            className="flex items-center space-x-2 px-6 py-3 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-xl transition-all"
          >
            <Calculator className="h-5 w-5" />
            <span>{showMoyennes ? 'Masquer' : 'Voir'} Moyennes</span>
          </button>
        </div>
      </div>

      {/* Sélection de classe, composition et matière */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
          <span className="bg-blue-100 p-2 rounded-lg mr-3">🎯</span>
          Sélection des paramètres
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Classe</label>
            <select
              value={selectedClasseId}
              onChange={(e) => {
                setSelectedClasseId(e.target.value);
                setSelectedMatiere('');
                setSelectedComposition('');
                setNotes({});
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
            >
              <option value="">Sélectionner une classe</option>
              {classes.map(classe => {
                const effectif = db.getAll<Eleve>('eleves').filter(e => 
                  e.classeId === classe.id && e.statut === 'Actif'
                ).length;
                return (
                  <option key={classe.id} value={classe.id}>
                    {classe.niveau} {classe.section} ({effectif} élèves)
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Composition</label>
            <select
              value={selectedComposition}
              onChange={(e) => {
                setSelectedComposition(e.target.value);
                setNotes({});
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              disabled={!selectedClasseId}
            >
              <option value="">Sélectionner une composition</option>
              {compositionsNiveau.map(comp => (
                <option key={comp.id} value={comp.id}>
                  {comp.nom} (coeff. {comp.coefficient})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Matière</label>
            <select
              value={selectedMatiere}
              onChange={(e) => {
                setSelectedMatiere(e.target.value);
                setNotes({});
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
              disabled={!selectedClasseId}
            >
              <option value="">Sélectionner une matière</option>
              {matieresClasse.map(matiere => {
                const bareme = getBaremeNote(matiere);
                return (
                  <option key={matiere.id} value={matiere.id}>
                    {matiere.nom} (/{bareme})
                  </option>
                );
              })}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={handleSaveNotes}
              disabled={isSaving || !selectedComposition || !selectedMatiere}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-xl hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{isSaving ? 'Sauvegarde...' : 'Enregistrer'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tableau de saisie des notes */}
      {selectedClasseId && selectedComposition && selectedMatiere && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Saisie des notes - {selectedClasse?.niveau} {selectedClasse?.section}
                </h3>
                <p className="text-gray-600 text-sm">
                  {matieresClasse.find(m => m.id === selectedMatiere)?.nom} - 
                  {compositions.find(c => c.id === selectedComposition)?.nom}
                  (/{getBaremeNote(matieresClasse.find(m => m.id === selectedMatiere)!)})
                </p>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-600">Notes saisies</div>
                <div className="text-2xl font-bold text-indigo-600">
                  {Object.keys(notes).filter(k => notes[k] !== undefined && notes[k] !== null).length}/{elevesClasse.length}
                </div>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">N°</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Élève</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      Note /{getBaremeNote(matieresClasse.find(m => m.id === selectedMatiere)!)}
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Moyenne générale</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {elevesClasse.map((eleve, index) => {
                    const bareme = getBaremeNote(matieresClasse.find(m => m.id === selectedMatiere)!);
                    const moyenneGenerale = getMoyenneEleve(eleve.id, selectedComposition);
                    
                    return (
                      <tr key={eleve.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center space-x-3">
                            {eleve.photo && (
                              <img 
                                src={eleve.photo} 
                                alt={`${eleve.prenoms} ${eleve.nom}`}
                                className="h-8 w-8 rounded-full object-cover"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {eleve.prenoms} {eleve.nom}
                              </div>
                              <div className="text-xs text-gray-500">
                                {eleve.matricule}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="number"
                            min="0"
                            max={bareme}
                            step="0.5"
                            value={notes[eleve.id] || ''}
                            onChange={(e) => handleNoteChange(eleve.id, Number(e.target.value))}
                            className="w-20 px-3 py-2 border-2 border-gray-200 rounded-lg focus:ring-4 focus:ring-indigo-100 focus:border-indigo-500 transition-all text-center font-bold"
                            placeholder="0"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            moyenneGenerale >= 10 
                              ? 'bg-green-100 text-green-800' 
                              : moyenneGenerale >= 8 
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {moyenneGenerale.toFixed(2)}/20
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {elevesClasse.length === 0 && (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Aucun élève dans cette classe</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tableau des moyennes par composition */}
      {showMoyennes && selectedClasseId && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-50 to-teal-50 px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Calculator className="h-5 w-5 mr-2 text-green-600" />
              Moyennes par composition - {selectedClasse?.niveau} {selectedClasse?.section}
            </h3>
          </div>

          <div className="p-6 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Élève</th>
                  {compositionsNiveau.map(comp => (
                    <th key={comp.id} className="px-4 py-3 text-center text-sm font-semibold text-gray-900">
                      {comp.nom}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-900">Moyenne Annuelle</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {elevesClasse.map((eleve) => {
                  const moyennesCompositions = compositionsNiveau.map(comp => 
                    getMoyenneEleve(eleve.id, comp.id)
                  );
                  
                  // Calcul de la moyenne annuelle pondérée
                  let totalPoints = 0;
                  let totalCoefficients = 0;
                  compositionsNiveau.forEach((comp, idx) => {
                    const moyenne = moyennesCompositions[idx];
                    if (moyenne > 0) {
                      totalPoints += moyenne * comp.coefficient;
                      totalCoefficients += comp.coefficient;
                    }
                  });
                  const moyenneAnnuelle = totalCoefficients > 0 ? totalPoints / totalCoefficients : 0;
                  
                  return (
                    <tr key={eleve.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center space-x-3">
                          {eleve.photo && (
                            <img 
                              src={eleve.photo} 
                              alt={`${eleve.prenoms} ${eleve.nom}`}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {eleve.prenoms} {eleve.nom}
                            </div>
                            <div className="text-xs text-gray-500">{eleve.matricule}</div>
                          </div>
                        </div>
                      </td>
                      {moyennesCompositions.map((moyenne, idx) => (
                        <td key={idx} className="px-4 py-3 text-center">
                          {moyenne > 0 ? (
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              moyenne >= 10 
                                ? 'bg-green-100 text-green-800' 
                                : moyenne >= 8 
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {moyenne.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-bold ${
                          moyenneAnnuelle >= 10 
                            ? 'bg-green-100 text-green-800' 
                            : moyenneAnnuelle >= 8 
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {moyenneAnnuelle.toFixed(2)}/20
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Statistiques de la classe */}
      {selectedClasseId && (
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <span className="bg-green-100 p-2 rounded-lg mr-3">📊</span>
            Statistiques de la classe
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <div className="text-2xl font-bold text-blue-600">{elevesClasse.length}</div>
              <p className="text-blue-800 font-medium">Élèves actifs</p>
            </div>
            
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <div className="text-2xl font-bold text-purple-600">{matieresClasse.length}</div>
              <p className="text-purple-800 font-medium">Matières</p>
            </div>
            
            <div className="text-center p-4 bg-indigo-50 rounded-xl">
              <div className="text-2xl font-bold text-indigo-600">{compositionsNiveau.length}</div>
              <p className="text-indigo-800 font-medium">Compositions</p>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <div className="text-2xl font-bold text-green-600">
                {elevesClasse.filter(e => {
                  const moyenne = getMoyenneEleve(e.id, selectedComposition);
                  return moyenne >= 10;
                }).length}
              </div>
              <p className="text-green-800 font-medium">Admissibles</p>
            </div>
            
            <div className="text-center p-4 bg-orange-50 rounded-xl">
              <div className="text-2xl font-bold text-orange-600">
                {Object.keys(notes).filter(k => notes[k] !== undefined && notes[k] !== null).length}
              </div>
              <p className="text-orange-800 font-medium">Notes saisies</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}