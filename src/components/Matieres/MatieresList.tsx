import React, { useState, useMemo } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { Search, Plus, Edit2, Trash2, BookOpen } from 'lucide-react';
import { db } from '../../utils/database';
import { Matiere, Classe } from '../../types';

interface MatieresListProps {
  onMatiereSelect: (matiere: Matiere | null) => void;
  onNewMatiere: () => void;
}

export default function MatieresList({ onMatiereSelect, onNewMatiere }: MatieresListProps) {
  const { showToast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');

  const matieres = db.getAll<Matiere>('matieres');
  const classes = db.getAll<Classe>('classes');

  const [localMatieres, setLocalMatieres] = useState(matieres);
  const filteredMatieres = useMemo(() => {
    let filtered = [...localMatieres];
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(matiere =>
        matiere.nom.toLowerCase().includes(term) ||
        matiere.type.toLowerCase().includes(term)
      );
    }
    if (filterType) {
      filtered = filtered.filter(matiere => matiere.type === filterType);
    }
    return filtered.sort((a, b) => a.nom.localeCompare(b.nom));
  }, [localMatieres, searchTerm, filterType]);

  const handleDelete = (matiere: Matiere) => {
    setIsLoading(true);
    const classesUtilisant = classes.filter(c => 
      c.matieres.some(m => m.id === matiere.id)
    );
    if (classesUtilisant.length > 0) {
      showToast(`Impossible de supprimer cette matière car elle est utilisée dans ${classesUtilisant.length} classe(s).`, 'error');
      setIsLoading(false);
      return;
    }
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer la matière "${matiere.nom}" ?`)) {
      db.delete('matieres', matiere.id);
      setLocalMatieres(localMatieres.filter(m => m.id !== matiere.id));
      showToast('Matière supprimée avec succès', 'success');
    }
    setIsLoading(false);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Fondamentale': return 'bg-blue-100 text-blue-800';
      case 'Éveil': return 'bg-green-100 text-green-800';
      case 'Expression': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getClassesUtilisant = (matiereId: string) => {
    return classes.filter(c => c.matieres.some(m => m.id === matiereId));
  };

  return (
    <div className="p-6 space-y-6 relative">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
          <div className="flex flex-col items-center">
            <svg className="animate-spin h-10 w-10 text-teal-600 mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-white text-lg font-semibold">Chargement...</span>
          </div>
        </div>
      )}
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Matières</h1>
          <p className="text-gray-600">{filteredMatieres.length} matière(s) trouvée(s)</p>
        </div>
        <button 
          onClick={onNewMatiere}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" />
          <span>Nouvelle Matière</span>
        </button>
      </div>

      {/* Filtres */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher une matière..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          >
            <option value="">Tous les types</option>
            <option value="Fondamentale">Fondamentale</option>
            <option value="Éveil">Éveil</option>
            <option value="Expression">Expression</option>
          </select>
        </div>
      </div>

      {/* Grille des matières */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMatieres.map((matiere) => {
          const classesUtilisant = getClassesUtilisant(matiere.id);
          
          return (
            <div key={matiere.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
              {/* En-tête de la carte */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <BookOpen className="h-5 w-5 text-teal-600" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {matiere.nom}
                  </h3>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => onMatiereSelect(matiere)}
                    className="p-2 text-gray-600 hover:bg-gray-50 rounded"
                    title="Modifier"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(matiere)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Informations */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(matiere.type)}`}>
                    {matiere.type}
                  </span>
                  {matiere.obligatoire && (
                    <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                      Obligatoire
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Coefficient:</span>
                  <span className="text-lg font-bold text-teal-600">{matiere.coefficient}</span>
                </div>

                <div>
                  <span className="text-sm text-gray-600">
                    Utilisée dans {classesUtilisant.length} classe(s)
                  </span>
                  {classesUtilisant.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {classesUtilisant.slice(0, 3).map((classe) => (
                        <span 
                          key={classe.id}
                          className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                        >
                          {classe.niveau} {classe.section}
                        </span>
                      ))}
                      {classesUtilisant.length > 3 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                          +{classesUtilisant.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-500">
                    Créée le {new Date(matiere.createdAt).toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredMatieres.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">Aucune matière trouvée</p>
          <button 
            onClick={onNewMatiere}
            className="mt-4 text-teal-600 hover:text-teal-700"
          >
            Créer votre première matière
          </button>
        </div>
      )}
    </div>
  );
}