import React, { useState } from 'react';
import { School, Lock, User, Eye, EyeOff, UserCheck } from 'lucide-react';
import { useToast } from '../Layout/ToastProvider';
import auth from '../../utils/auth';

interface LoginFormProps {
  onLogin: (user: any) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [nomUtilisateur, setNomUtilisateur] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomUtilisateur || !password) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.login(nomUtilisateur, password);
      if (user) {
        showToast(`Bienvenue ${user.prenoms} ${user.nom}`, 'success');
        onLogin(user);
      } else {
        showToast('Nom d\'utilisateur ou mot de passe incorrect', 'error');
      }
    } catch (error) {
      showToast('Erreur de connexion', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (username: string, userPassword: string) => {
    setNomUtilisateur(username);
    setPassword(userPassword);
    setTimeout(() => {
      const user = auth.login(username, userPassword);
      if (user) {
        showToast(`Connexion rapide - ${user.prenoms} ${user.nom}`, 'success');
        onLogin(user);
      }
    }, 100);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header avec logo */}
        <div className="bg-gradient-to-r from-teal-600 to-blue-600 p-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-white rounded-full p-4 shadow-lg">
              <School className="h-12 w-12 text-teal-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">KlasNet</h1>
          <p className="text-teal-100">Gestion Scolaire Moderne</p>
        </div>

        {/* Formulaire */}
        <div className="p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nom d'utilisateur
              </label>
              <div className="relative">
                <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={nomUtilisateur}
                  onChange={(e) => setNomUtilisateur(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="votre_nom_utilisateur"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-teal-700 hover:to-blue-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Connexion...
                </div>
              ) : (
                'Se connecter'
              )}
            </button>
          </form>

          {/* Connexions rapides pour demo */}
          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center mb-4">Connexions rapides (démo)</p>
            <div className="space-y-2">
              <button
                onClick={() => handleQuickLogin('poupouya', 'eyemon2024')}
                className="w-full text-left p-3 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors"
              >
                <div className="font-medium text-teal-800">Mme POUPOUYA</div>
                <div className="text-sm text-teal-600">Secrétaire / Caissière</div>
              </button>
              <button
                onClick={() => handleQuickLogin('directeur', 'director2024')}
                className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
              >
                <div className="font-medium text-blue-800">M. DIRECTEUR</div>
                <div className="text-sm text-blue-600">Administrateur</div>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 text-center">
          <p className="text-xs text-gray-500">
            © 2025 KlasNet - Gestion Scolaire Côte d'Ivoire
          </p>
        </div>
      </div>
    </div>
  );
}