import React, { useState, useEffect } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { Save, X } from 'lucide-react';
import { db } from '../../utils/database';
import { Matiere } from '../../types';

interface MatiereFormProps {
  matiere?: Matiere | null;
  onSave: (matiere: Matiere) => void;
  onCancel: () => void;
}

export default function MatiereForm({ matiere, onSave, onCancel }: MatiereFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    nom: '',
    coefficient: 1,
    type: 'Fondamentale' as 'Fondamentale' | 'Éveil' | 'Expression',
    obligatoire: true,
    classeIds: [] as string[]
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (matiere) {
      setFormData({
        nom: matiere.nom,
        coefficient: matiere.coefficient,
        type: matiere.type,
        obligatoire: matiere.obligatoire,
        classeIds: matiere.classeIds || []
      });
    }
  }, [matiere]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom de la matière est obligatoire';
    if (formData.coefficient < 1 || formData.coefficient > 10) newErrors.coefficient = 'Le coefficient doit être entre 1 et 10';

    const matieres = db.getAll<Matiere>('matieres');
    const existingMatiere = matieres.find(m => 
      m.nom.toLowerCase() === formData.nom.toLowerCase() && 
      m.id !== matiere?.id
    );
    if (existingMatiere) {
      newErrors.nom = 'Une matière avec ce nom existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (matiere) {
        const updatedMatiere = db.update<Matiere>('matieres', matiere.id, formData);
        if (updatedMatiere) {
          showToast('Matière mise à jour avec succès', 'success');
          onSave(updatedMatiere);
        }
      } else {
        const newMatiere = db.create<Matiere>('matieres', formData);
        showToast('Matière ajoutée avec succès', 'success');
        onSave(newMatiere);
      }
    } catch {
      showToast('Erreur lors de la sauvegarde de la matière', 'error');
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

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* En-tête moderne */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-xl">
                <span className="text-3xl">📚</span>
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {matiere ? 'Modifier la matière' : 'Nouvelle matière'}
                </h1>
                <p className="text-orange-100 mt-1">
                  {matiere ? 'Modifiez les informations de la matière' : 'Créez une nouvelle matière'}
                </p>
              </div>
            </div>
            <button
              onClick={onCancel}
              className="text-white hover:bg-white hover:bg-opacity-20 p-3 rounded-xl transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Informations de base */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">📖</span>
              Informations de base
            </h3>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-3">
                Nom de la matière <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.nom}
                onChange={(e) => handleInputChange('nom', e.target.value)}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-orange-100 transition-all ${
                  errors.nom ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-orange-500'
                }`}
                placeholder="Ex: Mathématiques, Français, Sciences..."
              />
              {errors.nom && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.nom}</p>}
            </div>
          </div>

          {/* Configuration avancée */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-purple-100 p-2 rounded-lg mr-3">⚙️</span>
              Configuration avancée
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Type de matière <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {[
                    { value: 'Fondamentale', label: '🎯 Fondamentale', desc: 'Matières principales (Français, Maths...)', color: 'blue' },
                    { value: 'Éveil', label: '🌱 Éveil', desc: 'Matières d\'éveil (Sciences, Histoire...)', color: 'green' },
                    { value: 'Expression', label: '🎨 Expression', desc: 'Matières d\'expression (Arts, Sport...)', color: 'purple' }
                  ].map(type => (
                    <label key={type.value} className={`flex items-center p-4 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.type === type.value 
                        ? `border-${type.color}-500 bg-${type.color}-50` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="type"
                        value={type.value}
                        checked={formData.type === type.value}
                        onChange={(e) => handleInputChange('type', e.target.value)}
                        className="sr-only"
                      />
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{type.label}</div>
                        <div className="text-sm text-gray-600 mt-1">{type.desc}</div>
                      </div>
                      {formData.type === type.value && (
                        <div className={`w-6 h-6 bg-${type.color}-600 rounded-full flex items-center justify-center ml-3`}>
                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Coefficient <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.coefficient}
                      onChange={(e) => handleInputChange('coefficient', parseInt(e.target.value))}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-orange-100 transition-all ${
                        errors.coefficient ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-orange-500'
                      }`}
                      min="1"
                      max="100"
                    />
                    {errors.coefficient && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.coefficient}</p>}
                    <p className="mt-2 text-xs text-gray-500">
                      Poids de la matière dans le calcul de la moyenne (1-100)
                    </p>
                  </div>
                </div>

                <div>
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={formData.obligatoire}
                      onChange={(e) => handleInputChange('obligatoire', e.target.checked)}
                      className="w-5 h-5 text-orange-600 border-2 border-gray-300 rounded focus:ring-orange-500"
                    />
                    <span className="text-sm font-semibold text-gray-700">
                      Matière obligatoire
                    </span>
                  </label>
                  <p className="mt-2 text-xs text-gray-500 ml-8">
                    Les matières obligatoires doivent être enseignées dans toutes les classes du niveau correspondant
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Exemples de coefficients */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-4 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">💡</span>
              Exemples de coefficients par niveau
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
              <div className="bg-white rounded-xl p-4 border border-blue-200">
                <p className="font-semibold text-blue-800 mb-2">CE1 à CM2</p>
                <div className="space-y-1 text-blue-700">
                  <p>• Maths: /50</p>
                  <p>• Éveil au Milieu: /50</p>
                  <p>• Exploitation de texte: /50</p>
                  <p>• Orthographe: /20</p>
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 border border-blue-200">
                <p className="font-semibold text-blue-800 mb-2">CP1 et CP2</p>
                <div className="space-y-1 text-blue-700">
                  <p>• Français: /20</p>
                  <p>• Maths: /20</p>
                  <p>• Sciences: /20</p>
                  <p>• Arts: /20</p>
                  <p>• Sport: /20</p>
                  <p>• + autres matières...</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-8 py-4 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-xl hover:from-orange-700 hover:to-red-700 focus:ring-4 focus:ring-orange-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="font-semibold">
                {matiere ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour la matière') : (isSaving ? 'Sauvegarde...' : 'Créer la matière')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}