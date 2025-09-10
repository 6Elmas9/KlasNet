import React, { useState, useEffect } from 'react';
import { db } from '../../utils/database';
import { Ecole } from '../../types';
import { useToast } from '../Layout/ToastProvider';
import { Save, Upload, Building2 } from 'lucide-react';

export default function ConfigEcole() {
  const { showToast } = useToast();
  const [ecole, setEcole] = useState<Ecole | null>(null);
  const [formData, setFormData] = useState({
    nom: '',
    codeEtablissement: '',
    adresse: '',
    telephone: '',
    email: '', // gardé mais optionnel
    logo: '',
    devise: 'FCFA',
    anneeScolaireActive: new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const ecoleData = db.getAll<Ecole>('ecole')[0];
    if (ecoleData) {
      setEcole(ecoleData);
      setFormData({
        nom: ecoleData.nom || '',
        codeEtablissement: ecoleData.codeEtablissement || '',
        adresse: ecoleData.adresse || '',
        telephone: ecoleData.telephone || '',
        email: ecoleData.email || '',
        logo: ecoleData.logo || '',
        devise: ecoleData.devise || 'FCFA',
        anneeScolaireActive: ecoleData.anneeScolaireActive || new Date().getFullYear() + '-' + (new Date().getFullYear() + 1)
      });
    }
  }, []);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setFormData(prev => ({ ...prev, logo: e.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      if (ecole) {
        const updated = db.update<Ecole>('ecole', ecole.id, formData);
        if (updated) {
          setEcole(updated);
          showToast('Configuration de l\'école mise à jour', 'success');
        }
      } else {
        const newEcole = db.create<Ecole>('ecole', formData);
        setEcole(newEcole);
        showToast('Configuration de l\'école créée', 'success');
      }
    } catch (error) {
      showToast('Erreur lors de la sauvegarde', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* En-tête */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-8 rounded-2xl shadow-lg">
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 p-4 rounded-xl">
            <Building2 className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Configuration de l'École</h1>
            <p className="text-blue-100 mt-2">Paramètres généraux et informations de l'établissement</p>
          </div>
        </div>
      </div>

      {/* Formulaire principal */}
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-8 py-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Informations de l'établissement</h2>
          <p className="text-gray-600 mt-1">Ces informations apparaîtront sur tous les documents imprimés</p>
        </div>

        <div className="p-8 space-y-8">
          {/* Logo et nom */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
              <label className="block text-sm font-semibold text-gray-700 mb-4">Logo de l'école</label>
              <div className="relative">
                <div className="w-full h-48 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center relative overflow-hidden group hover:border-blue-400 transition-colors">
                  {formData.logo ? (
                    <img 
                      src={formData.logo} 
                      alt="Logo école"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div className="text-center">
                      <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Cliquez pour ajouter un logo</p>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                  />
                </div>
                {formData.logo && (
                  <button
                    onClick={() => setFormData(prev => ({ ...prev, logo: '' }))}
                    className="mt-3 w-full px-4 py-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Supprimer le logo
                  </button>
                )}
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Nom complet de l'établissement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nom}
                  onChange={(e) => setFormData(prev => ({ ...prev, nom: e.target.value }))}
                  className="w-full px-4 py-3 text-lg font-medium border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="Ex: École Primaire Excellence"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  Code établissement <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.codeEtablissement}
                  onChange={(e) => setFormData(prev => ({ ...prev, codeEtablissement: e.target.value }))}
                  className="w-full px-4 py-3 text-lg font-medium border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="Ex: ECOLE001, EPE2025..."
                />
                <p className="text-xs text-gray-500 mt-2">
                  Code unique d'identification de votre établissement
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Devise</label>
                  <select
                    value={formData.devise}
                    onChange={(e) => setFormData(prev => ({ ...prev, devise: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  >
                    <option value="FCFA">FCFA</option>
                    <option value="EUR">EUR</option>
                    <option value="USD">USD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-3">Année scolaire active</label>
                  <input
                    type="text"
                    value={formData.anneeScolaireActive}
                    onChange={(e) => setFormData(prev => ({ ...prev, anneeScolaireActive: e.target.value }))}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                    placeholder="2025-2026"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Coordonnées */}
          <div className="bg-gray-50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 p-2 rounded-lg mr-3">📞</span>
              Coordonnées de contact
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Téléphone</label>
                <input
                  type="tel"
                  value={formData.telephone}
                  onChange={(e) => setFormData(prev => ({ ...prev, telephone: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="+225 XX XX XX XX XX"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Email (optionnel)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all"
                  placeholder="contact@ecole.ci"
                />
                <p className="text-xs text-gray-500 mt-2">
                  Email de contact pour les communications officielles
                </p>
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Adresse complète</label>
              <textarea
                value={formData.adresse}
                onChange={(e) => setFormData(prev => ({ ...prev, adresse: e.target.value }))}
                rows={4}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all resize-none"
                placeholder="Adresse complète de l'établissement"
              />
            </div>
          </div>

          {/* Aperçu */}
          <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">Aperçu sur les documents</h3>
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <div className="text-center">
                {formData.logo && (
                  <img src={formData.logo} alt="Logo" className="h-16 mx-auto mb-3" />
                )}
                <div className="text-center">
                  <h4 className="text-xl font-bold text-gray-900">{formData.nom || 'Nom de l\'école'}</h4>
                  <p className="text-sm text-gray-600 mt-1">Code: {formData.codeEtablissement || 'CODE_ECOLE'}</p>
                </div>
                <p className="text-gray-600 mt-1">{formData.adresse || 'Adresse de l\'école'}</p>
                <p className="text-gray-600">
                  {formData.telephone || 'Téléphone'}
                  {formData.email && ` • ${formData.email}`}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end pt-6 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center space-x-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:ring-4 focus:ring-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                <Save className="h-5 w-5" />
              )}
              <span className="font-semibold">
                {isSaving ? 'Sauvegarde...' : 'Enregistrer la configuration'}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}