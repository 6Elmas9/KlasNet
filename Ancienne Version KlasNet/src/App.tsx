import { useState, useEffect, useRef } from 'react';
import LoginForm from './components/Auth/LoginForm';
import auth from './utils/auth';
import { db } from './utils/database';
import { Eleve, Classe, Enseignant, Matiere, Paiement } from './types';
import { Search } from 'lucide-react';
import ConfigIndex from './components/Config/ConfigIndex';
import FinancesList from './components/Finances/FinancesList';
import NotesList from './components/Notes/NotesList';
import Header from './components/Layout/Header';
import Guide from './components/Guide';
import Dashboard from './components/Dashboard/Dashboard';
import ElevesList from './components/Eleves/ElevesList';
import EleveForm from './components/Eleves/EleveForm';
import ClassesList from './components/Classes/ClassesList';
import ClasseForm from './components/Classes/ClasseForm';
import MatieresList from './components/Matieres/MatieresList';
import MatiereForm from './components/Matieres/MatiereForm';
import EnseignantsList from './components/Enseignants/EnseignantsList';
import EnseignantForm from './components/Enseignants/EnseignantForm';

import { ToastProvider } from './components/Layout/ToastProvider';
import { Loader2 } from 'lucide-react';
import { ensureDefaultFrais } from './utils/defaultFraisScolaires';
import { seedDefaults } from './utils/seedDefaults';


function App() {
  // État d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Vérifier l'authentification au démarrage
  useEffect(() => {
    const user = auth.getCurrentUser();
    if (user) {
      setCurrentUser(user);
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogin = (user: any) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    auth.logout();
    setCurrentUser(null);
    setIsAuthenticated(false);
  };


  // Gérer la navigation via CustomEvent (pour Dashboard)
  // Hooks d'état principaux (déclarés une seule fois)
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedEleve, setSelectedEleve] = useState<Eleve | null>(null);
  const [showEleveForm, setShowEleveForm] = useState(false);
  // Hooks d'état pour les classes
  const [selectedClasse, setSelectedClasse] = useState<Classe | null>(null);
  const [showClasseForm, setShowClasseForm] = useState(false);
  // Hooks d'état pour les matières
  const [selectedMatiere, setSelectedMatiere] = useState<Matiere | null>(null);
  const [showMatiereForm, setShowMatiereForm] = useState(false);
  // Hooks d'état pour les enseignants
  const [selectedEnseignant, setSelectedEnseignant] = useState<Enseignant | null>(null);
  const [showEnseignantForm, setShowEnseignantForm] = useState(false);
  // Utilisateur courant (admin par défaut)
  // currentUser est maintenant géré par l'authentification

  useEffect(() => {
    const listener = (e: Event) => {
      const custom = e as CustomEvent;
      if (custom.detail && custom.detail.page) {
        // allow navigate event to carry a tab for config pages
        if (custom.detail.page === 'config' && custom.detail.tab) {
          // encode desired tab in state via a small hack: use localStorage for cross-component signalling
          localStorage.setItem('configInitialTab', String(custom.detail.tab));
        }
        setCurrentPage(custom.detail.page);
        if (custom.detail.page === 'eleves' && custom.detail.action === 'new') {
          setSelectedEleve(null);
          setShowEleveForm(true);
        }
        if (custom.detail.page === 'finances' && custom.detail.action === 'new') {
          // Pas de formulaire spécial, juste aller à la page finances
        }
        if (custom.detail.page === 'notes' && custom.detail.action === 'new') {
          // Pas de formulaire spécial, juste aller à la page notes
        }
      }
    };
    window.addEventListener('navigate', listener as EventListener);
    return () => window.removeEventListener('navigate', listener as EventListener);
  }, [setCurrentPage, setSelectedEleve, setShowEleveForm]);
  // Initialiser les frais scolaires par défaut au démarrage (si manquants)
  useEffect(() => {
    try {
      const defaultAnnee = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);
      const anneeActive = localStorage.getItem('anneeActive') || defaultAnnee;
      const created = ensureDefaultFrais(anneeActive);
      if (created && created > 0) {
        console.log(`ensureDefaultFrais: ${created} enregistrements créés pour ${anneeActive}`);
      }
      // Seed default classes and placeholder teachers if missing
      try {
        seedDefaults();
      } catch (err) {
        console.error('Erreur seedDefaults', err);
      }
    } catch (err) {
      console.error('Erreur lors de l\'initialisation des frais par défaut', err);
    }
  }, []);
  const [showGuide, setShowGuide] = useState(() => {
    return localStorage.getItem('guideShown') !== '1';
  });

  const handleCloseGuide = () => {
    setShowGuide(false);
    localStorage.setItem('guideShown', '1');
  };
  const [loading, setLoading] = useState(false);
  // (Supprimé les doublons de hooks d'état déjà déclarés plus haut)
  const [searchTerm, setSearchTerm] = useState('');
  type SearchResult =
    | { type: 'Élève'; label: string; id: string; data: Eleve }
    | { type: 'Classe'; label: string; id: string; data: Classe }
    | { type: 'Enseignant'; label: string; id: string; data: Enseignant }
    | { type: 'Matière'; label: string; id: string; data: Matiere }
    | { type: 'Paiement'; label: string; id: string; data: Paiement };
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Recherche globale sur toutes les entités principales
  useEffect(() => {
    if (!searchTerm.trim()) {
      setSearchResults([]);
      return;
    }
    const eleves = db.getAll<Eleve>('eleves') || [];
    const classes = db.getAll<Classe>('classes') || [];
    const enseignants = db.getAll<Enseignant>('enseignants') || [];
    const matieres = db.getAll<Matiere>('matieres') || [];
    const paiements = db.getAll<Paiement>('paiements') || [];
    const term = searchTerm.toLowerCase();
    const results: SearchResult[] = [];
    eleves.forEach((e) => {
      if (
        e.nom?.toLowerCase().includes(term) ||
        e.prenoms?.toLowerCase().includes(term) ||
        e.matricule?.toLowerCase().includes(term)
      ) {
        results.push({ type: 'Élève', label: `${e.prenoms} ${e.nom}`, id: e.id, data: e });
      }
    });
    classes.forEach((c) => {
      if (
        c.niveau?.toLowerCase().includes(term) ||
        c.section?.toLowerCase().includes(term)
      ) {
        results.push({ type: 'Classe', label: `${c.niveau} ${c.section || ''}`.trim(), id: c.id, data: c });
      }
    });
    enseignants.forEach((ens) => {
      if (
        ens.nom?.toLowerCase().includes(term) ||
        ens.prenoms?.toLowerCase().includes(term)
      ) {
        results.push({ type: 'Enseignant', label: `${ens.prenoms} ${ens.nom}`, id: ens.id, data: ens });
      }
    });
    matieres.forEach((m) => {
      if (m.nom?.toLowerCase().includes(term)) {
        results.push({ type: 'Matière', label: m.nom, id: m.id, data: m });
      }
    });
    paiements.forEach((p) => {
      if ((p as any).numeroRecu && String((p as any).numeroRecu).toLowerCase().includes(term)) {
        results.push({ type: 'Paiement', label: (p as any).numeroRecu, id: p.id, data: p });
      }
    });
    setSearchResults(results);
  }, [searchTerm]);

  // Navigation rapide depuis la recherche
  const handleSearchSelect = (item: SearchResult) => {
    setShowSearchDropdown(false);
    setSearchTerm('');
    if (item.type === 'Élève') {
      setCurrentPage('eleves');
      setSelectedEleve(item.data);
      setShowEleveForm(true);
    } else if (item.type === 'Classe') {
      setCurrentPage('classes');
      setSelectedClasse(item.data);
      setShowClasseForm(true);
    } else if (item.type === 'Enseignant') {
      setCurrentPage('enseignants');
      setSelectedEnseignant(item.data);
      setShowEnseignantForm(true);
    } else if (item.type === 'Matière') {
      setCurrentPage('matieres');
      setSelectedMatiere(item.data);
      setShowMatiereForm(true);
    } else if (item.type === 'Paiement') {
      setCurrentPage('finances');
    }
  };

  // ...autres hooks déjà déclarés plus haut...

  const handleNavigate = (page: string) => {
    setCurrentPage(page);
    setSelectedEleve(null);
    setShowEleveForm(false);
    setSelectedClasse(null);
    setShowClasseForm(false);
    setSelectedMatiere(null);
    setShowMatiereForm(false);
    setSelectedEnseignant(null);
    setShowEnseignantForm(false);
  };

  const handleEleveSelect = (eleve: Eleve | null) => {
    setSelectedEleve(eleve);
    setShowEleveForm(true);
  };

  const handleNewEleve = () => {
    setSelectedEleve(null);
    setShowEleveForm(true);
  };

  const handleEleveSave = () => {
    setLoading(true);
    setTimeout(() => {
      setShowEleveForm(false);
      setSelectedEleve(null);
      setLoading(false);
    }, 600);
  };

  const handleEleveCancel = () => {
    setShowEleveForm(false);
    setSelectedEleve(null);
  };

  // Handlers pour les classes
  const handleClasseSelect = (classe: Classe | null) => {
    setSelectedClasse(classe);
    setShowClasseForm(true);
  };

  const handleNewClasse = () => {
    setSelectedClasse(null);
    setShowClasseForm(true);
  };

  const handleClasseSave = () => {
    setLoading(true);
    setTimeout(() => {
      setShowClasseForm(false);
      setSelectedClasse(null);
      setLoading(false);
    }, 600);
  };

  const handleClasseCancel = () => {
    setShowClasseForm(false);
    setSelectedClasse(null);
  };

  // Handlers pour les matières
  const handleMatiereSelect = (matiere: Matiere | null) => {
    setSelectedMatiere(matiere);
    setShowMatiereForm(true);
  };

  const handleNewMatiere = () => {
    setSelectedMatiere(null);
    setShowMatiereForm(true);
  };

  const handleMatiereSave = () => {
    setLoading(true);
    setTimeout(() => {
      setShowMatiereForm(false);
      setSelectedMatiere(null);
      setLoading(false);
    }, 600);
  };

  const handleMatiereCancel = () => {
    setShowMatiereForm(false);
    setSelectedMatiere(null);
  };

  // Handlers pour les enseignants
  const handleEnseignantSelect = (enseignant: Enseignant | null) => {
    setSelectedEnseignant(enseignant);
    setShowEnseignantForm(true);
  };

  const handleNewEnseignant = () => {
    setSelectedEnseignant(null);
    setShowEnseignantForm(true);
  };

  const handleEnseignantSave = () => {
    setLoading(true);
    setTimeout(() => {
      setShowEnseignantForm(false);
      setSelectedEnseignant(null);
      setLoading(false);
    }, 600);
  };

  const handleEnseignantCancel = () => {
    setShowEnseignantForm(false);
    setSelectedEnseignant(null);
  };

  const renderMainContent = () => {
    if (currentPage === 'eleves') {
      if (showEleveForm) {
        return (
          <EleveForm
            eleve={selectedEleve}
            onSave={handleEleveSave}
            onCancel={handleEleveCancel}
          />
        );
      }
      return (
        <ElevesList
          onEleveSelect={handleEleveSelect}
          onNewEleve={handleNewEleve}
        />
      );
    }

    if (currentPage === 'classes') {
      if (showClasseForm) {
        return (
          <ClasseForm
            classe={selectedClasse}
            onSave={handleClasseSave}
            onCancel={handleClasseCancel}
          />
        );
      }
      return (
        <ClassesList
          onClasseSelect={handleClasseSelect}
          onNewClasse={handleNewClasse}
        />
      );
    }

    if (currentPage === 'matieres') {
      if (showMatiereForm) {
        return (
          <MatiereForm
            matiere={selectedMatiere}
            onSave={handleMatiereSave}
            onCancel={handleMatiereCancel}
          />
        );
      }
      return (
        <MatieresList
          onMatiereSelect={handleMatiereSelect}
          onNewMatiere={handleNewMatiere}
        />
      );
    }

    if (currentPage === 'enseignants') {
      if (showEnseignantForm) {
        return (
          <EnseignantForm
            enseignant={selectedEnseignant}
            onSave={handleEnseignantSave}
            onCancel={handleEnseignantCancel}
          />
        );
      }
      return (
        <EnseignantsList
          onEnseignantSelect={handleEnseignantSelect}
          onNewEnseignant={handleNewEnseignant}
        />
      );
    }

    if (currentPage === 'finances') {
  return <FinancesList />;
    }

    if (currentPage === 'notes') {
  return <NotesList />;
    }


    if (currentPage === 'config' || currentPage === 'config-impression') {
      // read requested tab if any (set by navigate events)
      const requested = localStorage.getItem('configInitialTab');
      // map legacy page to tab key
      const defaultTab = currentPage === 'config-impression' ? 'impression' : undefined;
      const initialTab = requested || defaultTab;
      // clear the temporary key
      if (requested) localStorage.removeItem('configInitialTab');
      return <ConfigIndex initialTab={initialTab} />;
    }

    return <Dashboard />;
  };

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50 relative">
        <Header
          currentUser={currentUser}
          onLogout={handleLogout}
          onNavigate={handleNavigate}
          currentPage={currentPage}
          onShowGuide={() => setShowGuide(true)}
        />
        {/* Si pas authentifié, afficher le formulaire de connexion */}
        {!isAuthenticated ? (
          <div className="flex items-center justify-center min-h-[50vh]">
            <LoginForm onLogin={handleLogin} />
          </div>
        ) : (
          <div className="flex justify-center mt-2 mb-2">
            <div className="relative w-full max-w-xl">
              <input
                ref={searchInputRef}
                type="text"
                className="w-full px-4 py-2 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Recherche rapide (élève, classe, enseignant, matière, paiement...)"
                value={searchTerm}
                onChange={e => {
                  setSearchTerm(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 200)}
              />
              <Search className="absolute right-3 top-2.5 text-gray-400" />
              {showSearchDropdown && searchResults.length > 0 && (
                <div className="absolute z-50 w-full bg-white border rounded-lg shadow-lg mt-1 max-h-64 overflow-y-auto">
                  {searchResults.map((item, idx) => (
                    <button
                      key={item.type + '-' + item.id + '-' + idx}
                      className="w-full text-left px-4 py-2 hover:bg-teal-50 border-b last:border-b-0 text-sm"
                      onMouseDown={() => handleSearchSelect(item)}
                    >
                      <span className="font-semibold text-teal-700">[{item.type}]</span> {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        <main>
          {loading && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
              <div className="flex flex-col items-center">
                <Loader2 className="animate-spin h-12 w-12 text-teal-600 mb-4" />
                <span className="text-white text-lg font-semibold">Chargement...</span>
              </div>
            </div>
          )}
          {isAuthenticated ? renderMainContent() : null}
    {showGuide && <Guide onClose={handleCloseGuide} />}
        </main>
      </div>
    </ToastProvider>
  );
}

export default App;