import React, { useState, useEffect } from 'react';
import { Shield, Key, CheckCircle, AlertTriangle, Clock, RefreshCw, Copy } from 'lucide-react';
import { licenceManager } from '../../utils/licenceManager';
import { useToast } from '../Layout/ToastProvider';

export default function ConfigLicence() {
  const { showToast } = useToast();
  const [licenceStatus, setLicenceStatus] = useState<any>(null);
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showKeyGenerator, setShowKeyGenerator] = useState(false);
  const [generatedKeys, setGeneratedKeys] = useState<any>(null);

  useEffect(() => {
    refreshLicenceStatus();
  }, []);

  const refreshLicenceStatus = async () => {
    setIsRefreshing(true);
    try {
      await licenceManager.updateLicenceFromServer();
      const status = licenceManager.checkLicenceStatus();
      setLicenceStatus(status);
    } catch (error) {
      console.error('Erreur refresh licence:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleActivation = async () => {
    if (!activationKey.trim()) {
      showToast('Veuillez entrer une clé de licence', 'error');
      return;
    }

    setIsActivating(true);
    try {
      const result = licenceManager.activateLicence(activationKey.trim());
      
      if (result.success) {
        showToast(result.message, 'success');
        setActivationKey('');
        await refreshLicenceStatus();
      } else {
        showToast(result.message, 'error');
      }
    } catch (error) {
      showToast('Erreur lors de l\'activation', 'error');
    } finally {
      setIsActivating(false);
    }
  };

  const handleGenerateKeys = () => {
    const keys = licenceManager.generateLicenceKeys();
    setGeneratedKeys(keys);
    setShowKeyGenerator(true);
    showToast('Clés de test générées', 'success');
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      showToast(`Clé ${type} copiée`, 'success');
    }).catch(() => {
      showToast('Erreur lors de la copie', 'error');
    });
  };

  const getStatusIcon = () => {
    if (!licenceStatus) return <Clock className="h-8 w-8 text-gray-400" />;
    if (licenceStatus.isValid && !licenceStatus.isExpired) {
      return <CheckCircle className="h-8 w-8 text-green-600" />;
    }
    return <AlertTriangle className="h-8 w-8 text-red-600" />;
  };

  const getStatusColor = () => {
    if (!licenceStatus) return 'from-gray-500 to-gray-600';
    if (licenceStatus.isValid && !licenceStatus.isExpired) {
      if (licenceStatus.daysRemaining <= 7) return 'from-yellow-500 to-orange-500';
      return 'from-green-500 to-teal-500';
    }
    return 'from-red-500 to-red-600';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* En-tête */}
      <div className={`bg-gradient-to-r ${getStatusColor()} text-white p-8 rounded-2xl shadow-lg`}>
        <div className="flex items-center space-x-4">
          <div className="bg-white bg-opacity-20 p-4 rounded-xl">
            {getStatusIcon()}
          </div>
          <div>
            <h1 className="text-3xl font-bold">Gestion des Licences</h1>
            <p className="text-white text-opacity-90 mt-2">
              {licenceStatus?.isValid ? 
                `Licence ${licenceStatus.type} active - ${licenceStatus.daysRemaining} jour(s) restant(s)` :
                'Licence expirée ou invalide'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Statut détaillé */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Statut de la Licence</h2>
            <button
              onClick={refreshLicenceStatus}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Actualiser</span>
            </button>
          </div>
        </div>

        <div className="p-6">
          {licenceStatus ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-blue-50 rounded-xl">
                <div className="text-2xl font-bold text-blue-600 capitalize">
                  {licenceStatus.type}
                </div>
                <p className="text-blue-800 font-medium">Type de licence</p>
              </div>
              
              <div className="text-center p-6 bg-purple-50 rounded-xl">
                <div className="text-2xl font-bold text-purple-600">
                  {licenceStatus.daysRemaining}
                </div>
                <p className="text-purple-800 font-medium">Jours restants</p>
              </div>
              
              <div className="text-center p-6 bg-green-50 rounded-xl">
                <div className="text-2xl font-bold text-green-600">
                  {licenceStatus.isValid ? '✅' : '❌'}
                </div>
                <p className="text-green-800 font-medium">
                  {licenceStatus.isValid ? 'Valide' : 'Expirée'}
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600 mx-auto mb-4"></div>
              <p className="text-gray-500">Vérification en cours...</p>
            </div>
          )}

          {licenceStatus && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-900 mb-3">Détails</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Date d'expiration:</span>
                  <div className="font-medium text-gray-900">
                    {licenceStatus.dateExpiration ? 
                      new Date(licenceStatus.dateExpiration).toLocaleDateString('fr-FR', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : 
                      'Non définie'
                    }
                  </div>
                </div>
                <div>
                  <span className="text-gray-600">Dernière vérification:</span>
                  <div className="font-medium text-gray-900">
                    {new Date(licenceStatus.lastCheck).toLocaleString('fr-FR')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Activation de licence */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-teal-50 to-blue-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Activation de Licence</h2>
          <p className="text-gray-600 text-sm mt-1">Entrez votre clé de licence pour activer ou renouveler</p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">
              Clé de licence
            </label>
            <textarea
              value={activationKey}
              onChange={(e) => setActivationKey(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-teal-100 focus:border-teal-500 transition-all resize-none font-mono text-sm"
              rows={4}
              placeholder="Collez votre clé de licence ici..."
            />
          </div>

          <div className="flex justify-end space-x-4">
            <button
              onClick={() => setActivationKey('')}
              className="px-6 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Effacer
            </button>
            <button
              onClick={handleActivation}
              disabled={isActivating || !activationKey.trim()}
              className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 transition-all disabled:opacity-50"
            >
              {isActivating ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Key className="h-4 w-4" />
              )}
              <span>{isActivating ? 'Activation...' : 'Activer la licence'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Générateur de clés de test (développement) */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Générateur de Clés (Test)</h2>
          <p className="text-gray-600 text-sm mt-1">Pour les tests et démonstrations uniquement</p>
        </div>

        <div className="p-6">
          <button
            onClick={handleGenerateKeys}
            className="flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
          >
            <Key className="h-5 w-5" />
            <span>Générer des clés de test</span>
          </button>

          {showKeyGenerator && generatedKeys && (
            <div className="mt-6 space-y-4">
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-green-900">Licence d'essai (7 jours)</h4>
                  <button
                    onClick={() => copyToClipboard(generatedKeys.trial, 'essai')}
                    className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-xs break-all border">
                  {generatedKeys.trial}
                </div>
              </div>

              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-blue-900">Licence mensuelle (30 jours)</h4>
                  <button
                    onClick={() => copyToClipboard(generatedKeys.monthly, 'mensuelle')}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-xs break-all border">
                  {generatedKeys.monthly}
                </div>
              </div>

              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-purple-900">Licence annuelle (365 jours)</h4>
                  <button
                    onClick={() => copyToClipboard(generatedKeys.yearly, 'annuelle')}
                    className="p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition-colors"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="bg-white rounded-lg p-3 font-mono text-xs break-all border">
                  {generatedKeys.yearly}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Actions avancées */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-red-50 to-orange-50 px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Actions Avancées</h2>
          <p className="text-gray-600 text-sm mt-1">Utilisez avec précaution</p>
        </div>

        <div className="p-6">
          <div className="flex space-x-4">
            <button
              onClick={() => {
                if (window.confirm('Réinitialiser la licence ? Cela supprimera la licence actuelle.')) {
                  licenceManager.resetLicence();
                  refreshLicenceStatus();
                  showToast('Licence réinitialisée', 'success');
                }
              }}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
            >
              Réinitialiser la licence
            </button>
          </div>
        </div>
      </div>

      {/* Informations système */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Informations Système</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-600">Version KlasNet:</span>
            <div className="font-medium text-gray-900">v1.0.1</div>
          </div>
          <div>
            <span className="text-gray-600">Dernière vérification:</span>
            <div className="font-medium text-gray-900">
              {licenceStatus?.lastCheck ? 
                new Date(licenceStatus.lastCheck).toLocaleString('fr-FR') : 
                'Jamais'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}