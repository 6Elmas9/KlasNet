import React, { useState, useEffect } from 'react';
import { useToast } from '../Layout/ToastProvider';
import { Save, X, Upload, User, Calendar, MapPin, Phone, Users } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Classe } from '../../types';

interface EleveFormProps {
  eleve?: Eleve | null;
  onSave: () => void;
  onCancel: () => void;
}

export default function EleveForm({ eleve, onSave, onCancel }: EleveFormProps) {
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    matricule: '',
    nom: '',
    prenoms: '',
    sexe: 'M' as 'M' | 'F',
    dateNaissance: '',
    lieuNaissance: '',
    classeId: '',
    anneeEntree: new Date().getFullYear().toString(),
    statut: 'Actif' as 'Actif' | 'Inactif' | 'Transféré',
    pereTuteur: '',
    mereTutrice: '',
    telephone: '',
    adresse: '',
    photo: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const classes = db.getAll<Classe>('classes');

  useEffect(() => {
    if (eleve) {
      setFormData({
        matricule: eleve.matricule,
        nom: eleve.nom,
        prenoms: eleve.prenoms,
        sexe: eleve.sexe,
        dateNaissance: eleve.dateNaissance,
        lieuNaissance: eleve.lieuNaissance,
        classeId: eleve.classeId,
        anneeEntree: eleve.anneeEntree,
        statut: eleve.statut,
        pereTuteur: eleve.pereTuteur,
        mereTutrice: eleve.mereTutrice,
        telephone: eleve.telephone,
        adresse: eleve.adresse,
        photo: eleve.photo || ''
      });
    } else {
      setFormData(prev => ({ ...prev, matricule: db.generateMatricule() }));
    }
  }, [eleve]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenoms.trim()) newErrors.prenoms = 'Les prénoms sont obligatoires';
    if (!formData.dateNaissance) newErrors.dateNaissance = 'La date de naissance est obligatoire';
    if (!formData.classeId) newErrors.classeId = 'La classe est obligatoire';

    const eleves = db.getAll<Eleve>('eleves');
    const existingEleve = eleves.find(e => 
      e.matricule === formData.matricule && e.id !== eleve?.id
    );
    if (existingEleve) {
      newErrors.matricule = 'Ce matricule existe déjà';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      if (eleve) {
        db.update<Eleve>('eleves', eleve.id, formData);
        showToast('Élève mis à jour avec succès', 'success');
      } else {
        db.create<Eleve>('eleves', formData);
        showToast('Élève ajouté avec succès', 'success');
      }
      onSave();
    } catch {
      showToast('Erreur lors de la sauvegarde de l\'élève', 'error');
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
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, photo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* En-tête moderne */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="bg-white bg-opacity-20 p-4 rounded-xl">
                <User className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">
                  {eleve ? 'Modifier l\'élève' : 'Nouvel élève'}
                </h1>
                <p className="text-teal-100 mt-1">
                  {eleve ? 'Modifiez les informations de l\'élève' : 'Ajoutez un nouvel élève'}
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
          {/* Section photo et informations de base */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">👤</span>
              Informations personnelles
            </h3>
            
            <div className="flex items-start space-x-8">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 bg-white rounded-2xl border-4 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-teal-400 transition-colors">
                  {formData.photo ? (
                    <img 
                      src={formData.photo} 
                      alt="Photo élève"
                      className="w-full h-full object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center">
                      <User className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs text-gray-500">Photo élève</p>
                    </div>
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
                  className="mt-3 w-full flex items-center justify-center px-3 py-2 text-sm bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Changer photo
                </button>
              </div>
              
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Matricule <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.matricule}
                    onChange={(e) => handleInputChange('matricule', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-teal-100 transition-all ${
                      errors.matricule ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-teal-500'
                    }`}
                    placeholder="Généré automatiquement"
                  />
                  {errors.matricule && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.matricule}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => handleInputChange('nom', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-teal-100 transition-all ${
                      errors.nom ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-teal-500'
                    }`}
                    placeholder="Nom de famille"
                  />
                  {errors.nom && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.nom}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Prénoms <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.prenoms}
                    onChange={(e) => handleInputChange('prenoms', e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-teal-100 transition-all ${
                      errors.prenoms ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-teal-500'
                    }`}
                    placeholder="Prénoms"
                  />
                  {errors.prenoms && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.prenoms}</p>}
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                    Sexe <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.sexe === 'M' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="sexe"
                        value="M"
                        checked={formData.sexe === 'M'}
                        onChange={(e) => handleInputChange('sexe', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">👦 Masculin</span>
                    </label>
                    <label className={`flex items-center justify-center p-3 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.sexe === 'F' ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="sexe"
                        value="F"
                        checked={formData.sexe === 'F'}
                        onChange={(e) => handleInputChange('sexe', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium">👧 Féminin</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informations scolaires */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-green-100 p-2 rounded-lg mr-3">🎓</span>
              Informations scolaires
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Date de naissance <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="date"
                    value={formData.dateNaissance}
                    onChange={(e) => handleInputChange('dateNaissance', e.target.value)}
                    className={`w-full pl-10 pr-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-teal-100 transition-all ${
                      errors.dateNaissance ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-teal-500'
                    }`}
                  />
                </div>
                {errors.dateNaissance && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.dateNaissance}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Lieu de naissance
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.lieuNaissance}
                    onChange={(e) => handleInputChange('lieuNaissance', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
                    placeholder="Ville de naissance"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Classe <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.classeId}
                  onChange={(e) => handleInputChange('classeId', e.target.value)}
                  className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-4 focus:ring-teal-100 transition-all ${
                    errors.classeId ? 'border-red-300 bg-red-50 focus:border-red-500' : 'border-gray-200 focus:border-teal-500'
                  }`}
                >
                  <option value="">Sélectionner une classe</option>
                  {classes.map(classe => (
                    <option key={classe.id} value={classe.id}>
                      {classe.niveau} {classe.section} ({classe.anneeScolaire})
                    </option>
                  ))}
                </select>
                {errors.classeId && <p className="mt-2 text-sm text-red-600 flex items-center"><span className="mr-1">⚠️</span>{errors.classeId}</p>}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Année d'entrée
                </label>
                <input
                  type="text"
                  value={formData.anneeEntree}
                  onChange={(e) => handleInputChange('anneeEntree', e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
                  placeholder="2025"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Statut
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'Actif', label: '✅ Actif', color: 'green' },
                    { value: 'Inactif', label: '⏸️ Inactif', color: 'gray' },
                    { value: 'Transféré', label: '🔄 Transféré', color: 'blue' }
                  ].map(statut => (
                    <label key={statut.value} className={`flex items-center justify-center p-2 border-2 rounded-xl cursor-pointer transition-all ${
                      formData.statut === statut.value 
                        ? `border-${statut.color}-500 bg-${statut.color}-50 text-${statut.color}-700` 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input
                        type="radio"
                        name="statut"
                        value={statut.value}
                        checked={formData.statut === statut.value}
                        onChange={(e) => handleInputChange('statut', e.target.value)}
                        className="sr-only"
                      />
                      <span className="font-medium text-xs">{statut.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Informations familiales */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-yellow-100 p-2 rounded-lg mr-3">👨‍👩‍👧‍👦</span>
              Informations familiales
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Père / Tuteur
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.pereTuteur}
                    onChange={(e) => handleInputChange('pereTuteur', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
                    placeholder="Nom du père ou tuteur"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Mère / Tutrice
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={formData.mereTutrice}
                    onChange={(e) => handleInputChange('mereTutrice', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
                    placeholder="Nom de la mère ou tutrice"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Téléphone
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => handleInputChange('telephone', e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all"
                    placeholder="+225 XX XX XX XX XX"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <textarea
                    value={formData.adresse}
                    onChange={(e) => handleInputChange('adresse', e.target.value)}
                    rows={3}
                    className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all resize-none"
                    placeholder="Adresse de résidence"
                  />
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
              className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 focus:ring-4 focus:ring-teal-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
              disabled={isSaving}
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="font-semibold">
                {eleve ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour l\'élève') : (isSaving ? 'Sauvegarde...' : 'Enregistrer l\'élève')}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}