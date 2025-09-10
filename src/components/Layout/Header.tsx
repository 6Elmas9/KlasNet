import React from 'react';
import { School, User, LogOut } from 'lucide-react';
interface UserType {
  prenoms: string;
  nom: string;
  role: string;
}

interface HeaderProps {
  currentUser: UserType;
  onLogout: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export default function Header({ currentUser, onLogout, onNavigate, currentPage, onShowGuide }: HeaderProps & { onShowGuide?: () => void }) {
  const menuItems = [
    { id: 'dashboard', label: 'Tableau de Bord', icon: 'dashboard' },
    { id: 'eleves', label: 'Élèves', icon: 'users' },
    { id: 'enseignants', label: 'Enseignants', icon: 'user-check' },
    { id: 'classes', label: 'Classes', icon: 'classroom' },
    { id: 'matieres', label: 'Matières', icon: 'book-open' },
    { id: 'finances', label: 'Finances', icon: 'money' },
    { id: 'notes', label: 'Notes', icon: 'book' },
  { id: 'config', label: 'Configuration', icon: 'settings' },
  ];

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo et titre */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <School className="h-8 w-8 text-teal-600" />
              <div>
                <h1 className="text-xl font-bold text-gray-900">École Excellence</h1>
                <p className="text-xs text-gray-500">Gestion Scolaire</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex space-x-1">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPage === item.id
                    ? 'bg-teal-100 text-teal-700 border border-teal-200'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {item.label}
              </button>
            ))}
            <button
              className="px-3 py-1 bg-teal-600 text-white rounded hover:bg-teal-700 transition"
              onClick={onShowGuide}
            >Guide</button>
          </nav>

          {/* Utilisateur */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <User className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">
                {currentUser?.prenoms} {currentUser?.nom}
              </span>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {currentUser?.role}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Déconnexion"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation mobile */}
      <div className="md:hidden border-t border-gray-200 bg-gray-50">
        <div className="px-4 py-2">
          <div className="flex space-x-1 overflow-x-auto">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  currentPage === item.id
                    ? 'bg-teal-100 text-teal-700'
                    : 'text-gray-600 hover:bg-white'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
}