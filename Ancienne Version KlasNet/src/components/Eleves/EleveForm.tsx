
import React, { useState, useEffect } from 'react';
// Payment UI moved to Finances; no receipt component here
import { useToast } from '../Layout/ToastProvider';
import { Save, Upload } from 'lucide-react';
import { db } from '../../utils/database';
import { Eleve, Classe } from '../../types';
import FormLayout from '../FormLayout';



interface EleveFormProps {
  eleve?: Eleve | null;
  onSave: (eleve: Eleve) => void;
  onCancel: () => void;
}

export default function EleveForm({ eleve, onSave, onCancel }: EleveFormProps) {
  // Tous les hooks doivent être ici !
  // Payment management moved to Finances page

  // Financial status is managed in Finances
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
        lieuNaissance: eleve.lieuNaissance || '',
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
      const matricule = db.generateMatricule();
      setFormData(prev => ({ ...prev, matricule }));
    }
  }, [eleve]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nom.trim()) newErrors.nom = 'Le nom est obligatoire';
    if (!formData.prenoms.trim()) newErrors.prenoms = 'Les prénoms sont obligatoires';
    if (!formData.dateNaissance) newErrors.dateNaissance = 'La date de naissance est obligatoire';
    if (!formData.classeId) newErrors.classeId = 'La classe est obligatoire';
    if (!formData.pereTuteur.trim()) newErrors.pereTuteur = 'Le nom du père/tuteur est obligatoire';
    if (!formData.mereTutrice.trim()) newErrors.mereTutrice = 'Le nom de la mère/tutrice est obligatoire';

    if (formData.dateNaissance) {
      const birthDate = new Date(formData.dateNaissance);
      const today = new Date();
      const age = today.getFullYear() - birthDate.getFullYear();
      if (age < 4 || age > 18) {
        newErrors.dateNaissance = 'L\'âge doit être entre 4 et 18 ans';
      }
    }

    const allEleves = db.getAll<Eleve>('eleves');
    const doublon = allEleves.find(e =>
      e.matricule === formData.matricule &&
      e.classeId === formData.classeId &&
      (!eleve || e.id !== eleve.id)
    );
    if (doublon) {
      newErrors.matricule = 'Un élève avec ce matricule existe déjà dans cette classe';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSaving(true);
    try {
      const eleveData = {
        ...formData,
        updatedAt: new Date().toISOString()
      };
      if (eleve) {
        const updatedEleve = db.update<Eleve>('eleves', eleve.id, eleveData);
        if (updatedEleve) {
          db.addHistorique({
            type: 'modification',
            cible: 'Élève',
            cibleId: updatedEleve.id,
            description: `Modification de l'élève ${updatedEleve.prenoms} ${updatedEleve.nom}`,
            utilisateur: 'ADMIN',
          });
          showToast('Élève mis à jour avec succès', 'success');
          onSave(updatedEleve);
        }
      } else {
        const newEleve = db.create<Eleve>('eleves', eleveData);
        db.addHistorique({
          type: 'création',
          cible: 'Élève',
          cibleId: newEleve.id,
          description: `Ajout de l'élève ${newEleve.prenoms} ${newEleve.nom}`,
          utilisateur: 'ADMIN',
        });
        showToast('Élève ajouté avec succès', 'success');
        onSave(newEleve);
      }
    } catch {
      showToast('Erreur lors de la sauvegarde de l’élève', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // payment UI removed; managed in Finances


  const handleInputChange = (field: keyof typeof formData, value: string) => {
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
    <FormLayout title={eleve ? 'Modifier l\'élève' : 'Nouvel élève'} subtitle={eleve ? 'Modifiez les informations de l\'élève' : 'Ajoutez un nouvel élève'}>
      <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between p-2 border-b border-gray-100">
            <div className="flex items-center gap-4">
              <label className="relative inline-block">
                <input type="file" accept="image/*" onChange={handlePhotoUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                <button
                  type="button"
                  className="mt-2 w-24 flex items-center justify-center px-3 py-1 text-xs border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  <Upload className="h-3 w-3 mr-1" />
                  Photo
                </button>
              </label>
              <div>
                <div className="text-sm font-medium">Matricule</div>
                <div className="font-mono text-sm text-gray-700">{formData.matricule}</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Statut financier et versements gérés dans l'onglet Finances */}
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
                Date de naissance <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={formData.dateNaissance}
                onChange={(e) => handleInputChange('dateNaissance', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.dateNaissance ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              />
              {errors.dateNaissance && <p className="mt-1 text-xs text-red-600">{errors.dateNaissance}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Lieu de naissance
              </label>
              <input
                type="text"
                value={formData.lieuNaissance}
                onChange={(e) => handleInputChange('lieuNaissance', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Classe <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.classeId}
                onChange={(e) => handleInputChange('classeId', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                  errors.classeId ? 'border-red-300 bg-red-50' : 'border-gray-300'
                }`}
              >
                <option value="">Sélectionner une classe</option>
                {classes.map(classe => (
                  <option key={classe.id} value={classe.id}>
                    {classe.niveau} {classe.section} - {classe.enseignantPrincipal}
                  </option>
                ))}
              </select>
              {errors.classeId && <p className="mt-1 text-xs text-red-600">{errors.classeId}</p>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations des Parents</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Statut <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.statut}
                  onChange={e => handleInputChange('statut', e.target.value)}
                  className="w-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                >
                  <option value="Actif">Actif</option>
                  <option value="Inactif">Inactif</option>
                  <option value="Transféré">Transféré</option>
                </select>
              </div>
              {/* Le statut financier est géré depuis l'onglet Finances */}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Père / Tuteur <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.pereTuteur}
                  onChange={(e) => handleInputChange('pereTuteur', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.pereTuteur ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.pereTuteur && <p className="mt-1 text-xs text-red-600">{errors.pereTuteur}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mère / Tutrice <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.mereTutrice}
                  onChange={(e) => handleInputChange('mereTutrice', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent ${
                    errors.mereTutrice ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {errors.mereTutrice && <p className="mt-1 text-xs text-red-600">{errors.mereTutrice}</p>}
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

              {/* Statut financier géré dans Finances */}
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
              aria-label={eleve ? 'Mettre à jour l’élève' : 'Enregistrer l’élève'}
            >
              {isSaving ? (
                <svg className="animate-spin h-4 w-4 mr-2 text-white" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
              ) : (
                <Save className="h-4 w-4" />
              )}
              <span>{eleve ? (isSaving ? 'Sauvegarde...' : 'Mettre à jour') : (isSaving ? 'Sauvegarde...' : 'Enregistrer')}</span>
            </button>
          </div>
        </form>
    </FormLayout>
  );
}