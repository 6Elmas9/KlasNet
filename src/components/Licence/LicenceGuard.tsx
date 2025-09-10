import React, { useState, useEffect } from 'react';
import { Shield, Key, AlertTriangle, Clock, CheckCircle, X } from 'lucide-react';
import { licenceManager } from '../../utils/licenceManager';

interface LicenceGuardProps {
  children: React.ReactNode;
}

export default function LicenceGuard({ children }: LicenceGuardProps) {
  const [licenceStatus, setLicenceStatus] = useState<any>(null);
  const [showActivation, setShowActivation] = useState(false);
  const [activationKey, setActivationKey] = useState('');
  const [isActivating, setIsActivating] = useState(false);
  const [activationMessage, setActivationMessage] = useState('');

  useEffect(() => {
    checkLicence();
    
    // Vérifier la licence toutes les heures
    const interval = setInterval(checkLicence, 60 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const checkLicence = async () => {
    // Tentative de mise à jour depuis le serveur
    await licenceManager.updateLicenceFromServer();
    
    // Vérification locale
    const status = licenceManager.checkLicenceStatus();
    setLicenceStatus(status);
  };

  const handleActivation = () => {
    if (!activationKey.trim()) {
      setActivationMessage('Veuillez entrer une clé de licence');
      return;
    }

    setIsActivating(true);
    
    try {
      const result = licenceManager.activateLicence(activationKey.trim());
      
      if (result.success) {
        setActivationMessage(result.message);
        setActivationKey('');
        setTimeout(() => {
          setShowActivation(false);
          checkLicence();
        }, 2000);
      } else {
        setActivationMessage(result.message);
      }
    } catch (error) {
      setActivationMessage('Erreur lors de l\'activation de la licence');
    } finally {
      setIsActivating(false);
    }
  };

  // Si la licence n'est pas encore vérifiée
  if (!licenceStatus) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-100 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Vérification de la licence</h2>
            <p className="text-gray-600">Veuillez patienter...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si la licence est valide, afficher l'application
  if (licenceStatus.isValid && !licenceStatus.isExpired) {
    return (
      <>
        {children}
        
        {/* Notification discrète pour les licences qui expirent bientôt */}
        {licenceStatus.daysRemaining <= 7 && (
          <div className="fixed bottom-4 right-4 bg-yellow-500 text-white p-4 rounded-lg shadow-lg max-w-sm">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5" />
              <div>
                <p className="font-semibold">Licence expire bientôt</p>
                <p className="text-sm">Plus que {licenceStatus.daysRemaining} jour(s)</p>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Interface de blocage pour licence expirée/invalide
  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        {/* En-tête */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-8 text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 opacity-90" />
          <h1 className="text-2xl font-bold mb-2">Licence Expirée</h1>
          <p className="text-red-100">Votre licence KlasNet a expiré</p>
        </div>

        {/* Contenu */}
        <div className="p-8">
          {/* Informations sur la licence */}
          <div className="bg-red-50 rounded-xl p-6 mb-6 border border-red-200">
            <div className="flex items-center space-x-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="font-semibold text-red-900">Statut de la licence</h3>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-red-700">Type:</span>
                <span className="font-medium text-red-900 capitalize">{licenceStatus.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">Expiration:</span>
                <span className="font-medium text-red-900">
                  {licenceStatus.dateExpiration ? 
                    new Date(licenceStatus.dateExpiration).toLocaleDateString('fr-FR') : 
                    'Non définie'
                  }
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-red-700">Jours restants:</span>
                <span className="font-bold text-red-900">{licenceStatus.daysRemaining}</span>
              </div>
            </div>
          </div>

          {/* Activation manuelle */}
          <div className="space-y-4">
            <button
              onClick={() => setShowActivation(!showActivation)}
              className="w-full flex items-center justify-center space-x-2 px-6 py-4 bg-gradient-to-r from-teal-600 to-blue-600 text-white rounded-xl hover:from-teal-700 hover:to-blue-700 transition-all font-semibold"
            >
              <Key className="h-5 w-5" />
              <span>Activer une nouvelle licence</span>
            </button>

            {showActivation && (
              <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-900 mb-4">Activation manuelle</h4>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
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

                  {activationMessage && (
                    <div className={`p-4 rounded-lg ${
                      activationMessage.includes('succès') 
                        ? 'bg-green-50 text-green-800 border border-green-200' 
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}>
                      <div className="flex items-center space-x-2">
                        {activationMessage.includes('succès') ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : (
                          <AlertTriangle className="h-5 w-5" />
                        )}
                        <span className="text-sm">{activationMessage}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <button
                      onClick={() => {
                        setShowActivation(false);
                        setActivationKey('');
                        setActivationMessage('');
                      }}
                      className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                    >
                      Annuler
                    </button>
                    <button
                      onClick={handleActivation}
                      disabled={isActivating || !activationKey.trim()}
                      className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-teal-600 text-white rounded-xl hover:bg-teal-700 transition-all disabled:opacity-50"
                    >
                      {isActivating ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Key className="h-4 w-4" />
                      )}
                      <span>{isActivating ? 'Activation...' : 'Activer'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Informations de contact */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-3">Besoin d'une licence ?</h4>
              <div className="text-sm text-blue-800 space-y-2">
                <p>📞 <strong>Téléphone:</strong> +225 XX XX XX XX XX</p>
                <p>📧 <strong>Email:</strong> licence@klasnet.ci</p>
                <p>🌐 <strong>Site web:</strong> www.klasnet.ci</p>
              </div>
              <div className="mt-4 p-3 bg-blue-100 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>Astuce:</strong> Contactez-nous pour obtenir votre clé de licence personnalisée
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center border-t border-gray-200">
          <p className="text-xs text-gray-500">
            © 2025 KlasNet - Logiciel de Gestion Scolaire
          </p>
        </div>
      </div>
    </div>
  );
}