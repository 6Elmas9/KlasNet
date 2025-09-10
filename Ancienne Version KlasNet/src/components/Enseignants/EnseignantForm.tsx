import React, { useState, useEffect } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { Save, X, Upload, User } from 'lucide-react';
import { db } from '../../utils/database';
import { Enseignant } from '../../types';
import FormLayout from '../FormLayout';

interface EnseignantFormProps {
  enseignant?: Enseignant | null;
  onSave: (enseignant: Enseignant) => void;
  onCancel: () => void;
};

  const EnseignantForm: React.FC<EnseignantFormProps> = ({ enseignant, onSave, onCancel }) => {
    const { showToast } = useToast();
    const [formData, setFormData] = useState({
      nom: '',
      prenoms: '',
      sexe: 'M' as 'M' | 'F',
      telephone: '',
      email: '',
      adresse: '',
      specialite: '',
      diplome: '',
      dateEmbauche: new Date().toISOString().split('T')[0],
      statut: 'Actif' as 'Actif' | 'Inactif' | 'Congé',
      salaire: 0,
      photo: '',
      classesPrincipales: [] as string[],
      matieresEnseignees: [] as string[]
    });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (enseignant) {
      setFormData({
        nom: enseignant.nom,
        prenoms: enseignant.prenoms,
        sexe: enseignant.sexe,
        telephone: enseignant.telephone,
        email: enseignant.email,
        adresse: enseignant.adresse,
        specialite: enseignant.specialite,
        diplome: enseignant.diplome,
        dateEmbauche: enseignant.dateEmbauche.split('T')[0],
        statut: enseignant.statut,
        salaire: enseignant.salaire || 0,
        photo: enseignant.photo || '',
        classesPrincipales: enseignant.classesPrincipales || [],
        matieresEnseignees: enseignant.matieresEnseignees || []
      });
    }
  }, [enseignant]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenoms.trim()) newErrors.prenoms = 'Les prénoms sont obligatoires';
    if (!formData.specialite.trim()) newErrors.specialite = 'La spécialité est obligatoire';
    if (!formData.diplome.trim()) newErrors.diplome = 'Le diplôme est obligatoire';
    if (!formData.dateEmbauche) newErrors.dateEmbauche = 'La date d\'embauche est obligatoire';

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Format d\'email invalide';
    }

    if (formData.email) {
      const enseignants = db.getAll<Enseignant>('enseignants');
      const existingEnseignant = enseignants.find(e => 
        e.email.toLowerCase() === formData.email.toLowerCase() && 
        e.id !== enseignant?.id
      );
      if (existingEnseignant) {
        newErrors.email = 'Un enseignant avec cet email existe déjà';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (enseignant) {
        const updatedEnseignant = db.update<Enseignant>('enseignants', enseignant.id, formData);
        if (updatedEnseignant) {
          showToast('Enseignant mis à jour avec succès', 'success');
          onSave(updatedEnseignant);
        }
      } else {
        const newEnseignant = db.create<Enseignant>('enseignants', {
          ...formData,
          updatedAt: new Date().toISOString()
        });
        showToast('Enseignant ajouté avec succès', 'success');
        onSave(newEnseignant);
      }
    } catch {
      showToast('Erreur lors de la sauvegarde de l’enseignant', 'error');
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
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
          showToast('Erreur lors de la sauvegarde de l’enseignant', 'error');
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, photo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <FormLayout title={enseignant ? 'Modifier l\'enseignant' : 'Nouvel enseignant'} subtitle={enseignant ? 'Modifiez les informations de l\'enseignant' : 'Ajoutez un nouvel enseignant'}>
      <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex items-start space-x-6">
            <div className="flex-shrink-0">
              <div className="w-24 h-24 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center relative">
                {formData.photo ? (
                  <img 
                    src={formData.photo} 
                    alt="Photo enseignant"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <User className="h-8 w-8 text-gray-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
              </div>
              <button
                type="button"
                className="mt-2 w-24 flex items-center justify-center px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Upload className="h-3 w-3 mr-1" />
                Photo
              </button>
            </div>
            
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => handleInputChange('nom', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.nom ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.nom && <p className="mt-1 text-xs text-red-600">{errors.nom}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Prénoms <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.prenoms}
                  onChange={(e) => handleInputChange('prenoms', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.prenoms ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.prenoms && <p className="mt-1 text-xs text-red-600">{errors.prenoms}</p>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sexe <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.sexe}
                onChange={(e) => handleInputChange('sexe', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Téléphone
              </label>
              <input
                type="tel"
                value={formData.telephone}
                onChange={(e) => handleInputChange('telephone', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="+225 XX XX XX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="email@exemple.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Professionnelles</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Spécialité <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.specialite}
                  onChange={(e) => handleInputChange('specialite', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.specialite ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Instituteur, Professeur des écoles..."
                />
                {errors.specialite && <p className="mt-1 text-xs text-red-600">{errors.specialite}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Diplôme <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.diplome}
                  onChange={(e) => handleInputChange('diplome', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.diplome ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                  placeholder="Ex: CEAP, Licence, Master..."
                />
                {errors.diplome && <p className="mt-1 text-xs text-red-600">{errors.diplome}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date d'embauche <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.dateEmbauche}
                  onChange={(e) => handleInputChange('dateEmbauche', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.dateEmbauche ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.dateEmbauche && <p className="mt-1 text-xs text-red-600">{errors.dateEmbauche}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut
                </label>
                <select
                  value={formData.statut}
                  onChange={(e) => handleInputChange('statut', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Congé">En congé</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Salaire (FCFA)
                </label>
                <input
                  type="number"
                  value={formData.salaire}
                  onChange={(e) => handleInputChange('salaire', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  min="0"
                  placeholder="0"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse
              </label>
              <textarea
                value={formData.adresse}
                onChange={(e) => handleInputChange('adresse', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Adresse complète de résidence"
              />
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
              aria-label={enseignant ? 'Mettre à jour l’enseignant' : 'Enregistrer l’enseignant'}
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{enseignant ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour') : (isSaving ? 'Sauvegarde...' : 'Enregistrer')}</span>
            </button>
          </div>
      </form>
    </FormLayout>
  );
};

export default EnseignantForm;