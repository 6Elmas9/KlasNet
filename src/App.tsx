import React, { useState } from 'react';
import LicenceGuard from './components/Licence/LicenceGuard';
import { ToastProvider } from './components/Layout/ToastProvider';
import LoginForm from './components/Auth/LoginForm';
import Header from './components/Layout/Header';
import Dashboard from './components/Dashboard/Dashboard';
import ElevesList from './components/Eleves/ElevesList';
import EleveForm from './components/Eleves/EleveForm';
import EnseignantsList from './components/Enseignants/EnseignantsList';
import EnseignantForm from './components/Enseignants/EnseignantForm';
import ClassesList from './components/Classes/ClassesList';
import ClasseForm from './components/Classes/ClasseForm';
import MatieresList from './components/Matieres/MatieresList';
import MatiereForm from './components/Matieres/MatiereForm';
import NotesParClasse from './components/Notes/NotesParClasse';
import ConfigMain from './components/Config/ConfigMain';
import FinancesList from './components/Finances/FinancesList';
import Guide from './components/Guide';
import auth from './utils/auth';
import { seedDefaults } from './utils/seedDefaults';
import { initializeDefaultFrais } from './utils/defaultFraisScolaires';
// types imports removed (not used in this file)

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => auth.getCurrentUser());
  const [currentPage, setCurrentPage] = useState('dashboard');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Initialiser les données par défaut si nécessaire
  React.useEffect(() => {
    if (!currentUser) return;
    try {
      seedDefaults();
      // Initialiser les frais scolaires par défaut
      initializeDefaultFrais();
    } catch (error) {
      console.error('Erreur lors de l\'initialisation des données par défaut:', error);
    }
  }, [currentUser]);

  // Écouter les événements de navigation
  React.useEffect(() => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleNavigate = (event: any) => {
      const { page, action } = event.detail;
      setCurrentPage(page);
      if (action === 'new') {
        setSelectedItem(null);
        setShowForm(true);
      }
    };

    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLogin = (user: any) => {
    setCurrentUser(user);
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentUser(null);
    setCurrentPage('dashboard');
  };

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedItem(null);
    setShowForm(false);
  };

  const handleItemSelect = (item: unknown) => {
    setSelectedItem(item);
    setShowForm(true);
  };

  const handleNewItem = () => {
    setSelectedItem(null);
    setShowForm(true);
  };

  const handleFormSave = () => {
    setShowForm(false);
    setSelectedItem(null);
    // Recharger la page pour voir les changements
    window.location.reload();
  };

  const handleFormCancel = () => {
    setShowForm(false);
    setSelectedItem(null);
  };

  if (!currentUser) {
    return (
      <ToastProvider>
        <LoginForm onLogin={handleLogin} />
      </ToastProvider>
    );
  }

  const renderContent = () => {
    if (showForm) {
      switch (currentPage) {
        case 'eleves':
          return (
            <EleveForm
              eleve={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        case 'enseignants':
          return (
            <EnseignantForm
              enseignant={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        case 'classes':
          return (
            <ClasseForm
              classe={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        case 'matieres':
          return (
            <MatiereForm
              matiere={selectedItem}
              onSave={handleFormSave}
              onCancel={handleFormCancel}
            />
          );
        default:
          return <Dashboard />;
      }
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard />;
      case 'finances':
        return <FinancesList />;
      case 'eleves':
        return (
          <ElevesList
            onEleveSelect={handleItemSelect}
            onNewEleve={handleNewItem}
          />
        );
      case 'enseignants':
        return (
          <EnseignantsList
            onEnseignantSelect={handleItemSelect}
            onNewEnseignant={handleNewItem}
          />
        );
      case 'classes':
        return (
          <ClassesList
            onClasseSelect={handleItemSelect}
            onNewClasse={handleNewItem}
          />
        );
      case 'matieres':
        return (
          <MatieresList
            onMatiereSelect={handleItemSelect}
            onNewMatiere={handleNewItem}
          />
        );
      case 'notes':
        return <NotesParClasse />;
      case 'config':
        return <ConfigMain />;
  /* 'config-impression' removed — impression accessible via Configuration */
      default:
        return <Dashboard />;
    }
  };

  return (
    <ToastProvider>
      <LicenceGuard>
        <div className="min-h-screen bg-gray-50">
          <Header
            currentUser={currentUser}
            onLogout={handleLogout}
            onNavigate={handleNavigate}
            currentPage={currentPage}
            onShowGuide={() => setShowGuide(true)}
          />
          <main className="pb-8">
            {renderContent()}
          </main>
          {showGuide && <Guide onClose={() => setShowGuide(false)} />}
        </div>
      </LicenceGuard>
    </ToastProvider>
  );
}