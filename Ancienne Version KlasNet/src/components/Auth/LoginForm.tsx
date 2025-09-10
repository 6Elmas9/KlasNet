import { useState } from 'react';
import { School, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useToast } from '../Layout/ToastProvider';
import auth from '../../utils/auth';
import FormLayout from '../FormLayout';

interface LoginFormProps {
  onLogin: (user: any) => void;
}

export default function LoginForm({ onLogin }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { showToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      showToast('Veuillez remplir tous les champs', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const user = auth.login(email, password);
      if (user) {
        showToast(`Bienvenue ${user.prenoms} ${user.nom}`, 'success');
        onLogin(user);
      } else {
        showToast('Email ou mot de passe incorrect', 'error');
      }
    } catch (error) {
      showToast('Erreur de connexion', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickLogin = (userEmail: string, userPassword: string) => {
    setEmail(userEmail);
    setPassword(userPassword);
    setTimeout(() => {
      const user = auth.login(userEmail, userPassword);
      if (user) {
        showToast(`Connexion rapide - ${user.prenoms} ${user.nom}`, 'success');
        onLogin(user);
      }
    }, 100);
  };

  return (
    <FormLayout
      title="KlasNet"
      subtitle="Gestion Scolaire Moderne"
      icon={<School className="h-10 w-10 text-teal-600" />}
      footer={<p className="text-xs text-gray-500">© 2025 KlasNet - Gestion Scolaire Côte d'Ivoire</p>}
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
              placeholder="votre.email@ecole.local"
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe</label>
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
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600">
              {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full bg-gradient-to-r from-teal-600 to-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:from-teal-700 hover:to-blue-700 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
              Connexion...
            </div>
          ) : (
            'Se connecter'
          )}
        </button>

        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-sm text-gray-600 text-center mb-3">Connexions rapides (démo)</p>
          <div className="space-y-2">
            <button type="button" onClick={() => handleQuickLogin('poupouya@ecole.local', 'eyemon2024')} className="w-full text-left p-3 bg-teal-50 hover:bg-teal-100 rounded-lg border border-teal-200 transition-colors">
              <div className="font-medium text-teal-800">Mme POUPOUYA</div>
              <div className="text-sm text-teal-600">Secrétaire / Caissière</div>
            </button>
            <button type="button" onClick={() => handleQuickLogin('directeur@ecole.local', 'director2024')} className="w-full text-left p-3 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors">
              <div className="font-medium text-blue-800">M. DIRECTEUR</div>
              <div className="text-sm text-blue-600">Administrateur</div>
            </button>
          </div>
        </div>
      </form>
    </FormLayout>
  );
}