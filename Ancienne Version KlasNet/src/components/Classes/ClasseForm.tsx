import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import { db } from '../../utils/database';
import { useToast } from '../Layout/ToastProvider';
import { Classe, Matiere, Enseignant } from '../../types';
import FormLayout from '../FormLayout';

interface ClasseFormProps {
  classe?: Classe | null;
  onSave: (classe: Classe) => void;
  onCancel: () => void;
}

export default function ClasseForm({ classe, onSave, onCancel }: ClasseFormProps) {
  type Niveau = 'CP1' | 'CP2' | 'CE1' | 'CE2' | 'CM1' | 'CM2';

  const [formData, setFormData] = useState({
    niveau: 'CP1' as Niveau,
    section: 'A',
    anneeScolaire: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1),
    enseignantPrincipal: '',
    effectifMax: 35,
    salle: ''
  });

  const { showToast } = useToast();
  const [selectedMatieres, setSelectedMatieres] = useState<Matiere[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const matieres = db.getAll<Matiere>('matieres');
  const enseignants = db.getAll<Enseignant>('enseignants');

  useEffect(() => {
    if (classe) {
      setFormData({
        niveau: classe.niveau,
        section: classe.section,
        anneeScolaire: classe.anneeScolaire,
        enseignantPrincipal: classe.enseignantPrincipal,
        effectifMax: classe.effectifMax,
        salle: classe.salle
      });
      setSelectedMatieres(classe.matieres);
    }
  }, [classe]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.niveau) newErrors.niveau = 'Le niveau est obligatoire';
    if (!formData.section.trim()) newErrors.section = 'La section est obligatoire';
    if (!formData.anneeScolaire.trim()) newErrors.anneeScolaire = 'L\'année scolaire est obligatoire';
    if (!formData.enseignantPrincipal.trim()) newErrors.enseignantPrincipal = 'L\'enseignant principal est obligatoire';
    if (formData.effectifMax < 1 || formData.effectifMax > 50) newErrors.effectifMax = 'L\'effectif maximum doit être entre 1 et 50';
    if (!formData.salle.trim()) newErrors.salle = 'La salle est obligatoire';
    if (selectedMatieres.length === 0) newErrors.matieres = 'Au moins une matière doit être sélectionnée';

    const classes = db.getAll<Classe>('classes');
    const existingClasse = classes.find(c => 
      c.niveau === formData.niveau && 
      c.section === formData.section && 
      c.anneeScolaire === formData.anneeScolaire &&
      c.id !== classe?.id
    );
    if (existingClasse) {
      newErrors.section = 'Cette classe existe déjà pour cette année scolaire';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const classeData = {
        ...formData,
        matieres: selectedMatieres,
        updatedAt: now,
        ...(classe ? {} : { createdAt: now })
      };
      if (classe) {
        const updatedClasse = db.update<Classe>('classes', classe.id, classeData);
        if (updatedClasse) {
          showToast('Classe mise à jour avec succès', 'success');
          onSave(updatedClasse);
        }
      } else {
        const newClasse = db.create<Classe>('classes', classeData);
        showToast('Classe ajoutée avec succès', 'success');
        onSave(newClasse);
      }
    } catch {
      showToast('Erreur lors de la sauvegarde de la classe', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleMatiereToggle = (matiere: Matiere) => {
    setSelectedMatieres(prev => {
      const exists = prev.find(m => m.id === matiere.id);
      if (exists) {
        return prev.filter(m => m.id !== matiere.id);
      } else {
        return [...prev, matiere];
      }
    });

    if (errors.matieres) {
      setErrors(prev => ({ ...prev, matieres: '' }));
    }
  };

  const getMatieresByType = (type: string) => {
    return matieres.filter(m => m.type === type);
  };

  return (
    <FormLayout title={classe ? 'Modifier la classe' : 'Nouvelle classe'} subtitle={classe ? 'Modifiez les informations de la classe' : 'Créez une nouvelle classe'}>
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Niveau <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.niveau}
                onChange={(e) => handleInputChange('niveau', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.niveau ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="Petite Section">Petite Section</option>
                <option value="Moyenne Section">Moyenne Section</option>
                <option value="Grande Section">Grande Section</option>
                <option value="CP1">CP1</option>
                <option value="CP2">CP2</option>
                <option value="CE1">CE1</option>
                <option value="CE2">CE2</option>
                <option value="CM1">CM1</option>
                <option value="CM2">CM2</option>
              </select>
              {errors.niveau && <p className="mt-1 text-xs text-red-600">{errors.niveau}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Section <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => handleInputChange('section', e.target.value.toUpperCase())}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.section ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="A, B, C..."
                maxLength={2}
              />
              {errors.section && <p className="mt-1 text-xs text-red-600">{errors.section}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Année scolaire <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.anneeScolaire}
                onChange={(e) => handleInputChange('anneeScolaire', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.anneeScolaire ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="2024-2025"
              />
              {errors.anneeScolaire && <p className="mt-1 text-xs text-red-600">{errors.anneeScolaire}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enseignant principal <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.enseignantPrincipal}
                onChange={(e) => handleInputChange('enseignantPrincipal', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.enseignantPrincipal ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner un enseignant</option>
                {enseignants.filter(e => e.statut === 'Actif').map(enseignant => (
                  <option key={enseignant.id} value={`${enseignant.prenoms} ${enseignant.nom}`}>
                    {enseignant.prenoms} {enseignant.nom}
                  </option>
                ))}
              </select>
              {errors.enseignantPrincipal && <p className="mt-1 text-xs text-red-600">{errors.enseignantPrincipal}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Effectif maximum <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={formData.effectifMax}
                onChange={(e) => handleInputChange('effectifMax', parseInt(e.target.value))}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.effectifMax ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                min="1"
                max="50"
              />
              {errors.effectifMax && <p className="mt-1 text-xs text-red-600">{errors.effectifMax}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Salle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.salle}
                onChange={(e) => handleInputChange('salle', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.salle ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="Salle 1, Salle A..."
              />
              {errors.salle && <p className="mt-1 text-xs text-red-600">{errors.salle}</p>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Matières enseignées <span className="text-red-500">*</span>
            </h3>
            
            {errors.matieres && <p className="mb-4 text-sm text-red-600">{errors.matieres}</p>}

            <div className="space-y-6">
              {['Fondamentale', 'Éveil', 'Expression'].map(type => (
                <div key={type}>
                  <h4 className="font-medium text-gray-700 mb-3">{type}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {getMatieresByType(type).map(matiere => {
                      const isSelected = selectedMatieres.find(m => m.id === matiere.id);
                      return (
                        <label
                          key={matiere.id}
                          className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected 
                              ? 'border-teal-500 bg-teal-50' 
                              : 'border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={() => handleMatiereToggle(matiere)}
                            className="sr-only"
                          />
                          <div className="flex-1">
                            <div className="font-medium text-gray-900">{matiere.nom}</div>
                            <div className="text-sm text-gray-500">
                              Coefficient: {matiere.coefficient}
                              {matiere.obligatoire && (
                                <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                  Obligatoire
                                </span>
                              )}
                            </div>
                          </div>
                          {isSelected && (
                            <div className="w-5 h-5 bg-teal-600 rounded-full flex items-center justify-center">
                              <div className="w-2 h-2 bg-white rounded-full"></div>
                            </div>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>{selectedMatieres.length}</strong> matière(s) sélectionnée(s)
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Coefficient total: {selectedMatieres.reduce((sum, m) => sum + m.coefficient, 0)}
              </p>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 disabled:opacity-50"
              disabled={isSaving}
              aria-busy={isSaving}
              aria-label={classe ? 'Mettre à jour la classe' : 'Créer la classe'}
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{classe ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour') : (isSaving ? 'Sauvegarde...' : 'Créer la classe')}</span>
            </button>
          </div>
        </form>
    </FormLayout>
  );
}