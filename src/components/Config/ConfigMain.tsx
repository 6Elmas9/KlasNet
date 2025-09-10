import { useState } from 'react';
import { db } from '../../utils/database';
import { Building2, DollarSign, BookOpen, FileText, Settings, Database, History, GraduationCap } from 'lucide-react';
import ConfigEcole from './ConfigEcole';
import ConfigFraisDetaille from './ConfigFraisDetaille';
import ConfigCompositions from './ConfigCompositions';
import ConfigImpression from './ConfigImpression';
import ConfigBackup from './ConfigBackup';
import HistoriqueList from './HistoriqueList';

type ConfigSection = 'menu' | 'ecole' | 'frais' | 'compositions' | 'impression' | 'backup' | 'historique';

const configSections = [
  {
    id: 'ecole' as ConfigSection,
    title: 'Configuration École',
    description: 'Nom, logo, coordonnées de l\'établissement',
    icon: Building2,
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600'
  },
  {
    id: 'frais' as ConfigSection,
    title: 'Configuration Frais',
    description: 'Modalités et échéances de paiement par niveau',
    icon: DollarSign,
    color: 'from-green-500 to-green-600',
    bgColor: 'bg-green-50',
    textColor: 'text-green-600'
  },
  {
    id: 'compositions' as ConfigSection,
    title: 'Configuration Compositions',
    description: 'Périodes d\'évaluation et coefficients',
    icon: BookOpen,
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600'
  },
  {
    id: 'impression' as ConfigSection,
    title: 'Configuration Impression',
    description: 'Entêtes, logos et mise en page des documents',
    icon: FileText,
    color: 'from-indigo-500 to-indigo-600',
    bgColor: 'bg-indigo-50',
    textColor: 'text-indigo-600'
  },
  {
    id: 'backup' as ConfigSection,
    title: 'Sauvegarde & Restauration',
    description: 'Export, import et gestion des données',
    icon: Database,
    color: 'from-teal-500 to-teal-600',
    bgColor: 'bg-teal-50',
    textColor: 'text-teal-600'
  },
  {
    id: 'historique' as ConfigSection,
    title: 'Historique des Actions',
    description: 'Journal des modifications et opérations',
    icon: History,
    color: 'from-gray-500 to-gray-600',
    bgColor: 'bg-gray-50',
    textColor: 'text-gray-600'
  }
];

export default function ConfigMain() {
  const [currentSection, setCurrentSection] = useState<ConfigSection>('menu');

  const renderContent = () => {
    switch (currentSection) {
      case 'ecole':
        return <ConfigEcole />;
      case 'frais':
        return <ConfigFraisDetaille />;
      case 'compositions':
        return <ConfigCompositions />;
      case 'impression':
        return <ConfigImpression />;
      case 'backup':
        return <ConfigBackup />;
      case 'historique':
        return <HistoriqueList />;
      default:
        return (
          <div className="max-w-6xl mx-auto">
            {/* En-tête principal */}
            <div className="bg-gradient-to-r from-teal-600 to-blue-600 text-white p-8 rounded-2xl shadow-lg mb-8">
              <div className="flex items-center space-x-4">
                <div className="bg-white bg-opacity-20 p-4 rounded-xl">
                  <Settings className="h-10 w-10" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold">Configuration Système</h1>
                  <p className="text-teal-100 mt-2 text-lg">Paramètres généraux de votre école</p>
                </div>
              </div>
            </div>

            {/* Grille des sections */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {configSections.map((section) => {
                const IconComponent = section.icon;
                return (
                  <button
                    key={section.id}
                    onClick={() => setCurrentSection(section.id)}
                    className="group bg-white rounded-2xl shadow-lg border border-gray-100 p-8 hover:shadow-xl transition-all duration-300 text-left transform hover:-translate-y-1"
                  >
                    <div className={`${section.bgColor} rounded-xl p-4 mb-6 inline-block group-hover:scale-110 transition-transform`}>
                      <IconComponent className={`h-8 w-8 ${section.textColor}`} />
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-3 group-hover:text-gray-700 transition-colors">
                      {section.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed">
                      {section.description}
                    </p>
                    
                    <div className="mt-6 flex items-center text-sm font-medium text-gray-400 group-hover:text-gray-600 transition-colors">
                      <span>Configurer</span>
                      <svg className="ml-2 h-4 w-4 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Informations système */}
            <div className="mt-12 bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
              <div className="flex items-center space-x-4 mb-6">
                <div className="bg-teal-50 p-3 rounded-xl">
                  <GraduationCap className="h-6 w-6 text-teal-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Informations Système</h3>
                  <p className="text-gray-600">État actuel de votre configuration</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-blue-50 rounded-xl">
                  <div className="text-2xl font-bold text-blue-600">
                    {db.getAll('eleves').length}
                  </div>
                  <p className="text-blue-800 font-medium">Élèves</p>
                </div>
                
                <div className="text-center p-4 bg-green-50 rounded-xl">
                  <div className="text-2xl font-bold text-green-600">
                    {db.getAll('classes').length}
                  </div>
                  <p className="text-green-800 font-medium">Classes</p>
                </div>
                
                <div className="text-center p-4 bg-purple-50 rounded-xl">
                  <div className="text-2xl font-bold text-purple-600">
                    {db.getAll('matieres').length}
                  </div>
                  <p className="text-purple-800 font-medium">Matières</p>
                </div>
              </div>
            </div>
          </div>
        );
    }
  };

  if (currentSection !== 'menu') {
    return (
      <div className="p-6">
        {/* Breadcrumb */}
        <div className="mb-6">
          <button
            onClick={() => setCurrentSection('menu')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span>Retour à la configuration</span>
          </button>
        </div>
        
        {renderContent()}
      </div>
    );
  }

  return (
    <div className="p-6">
      {renderContent()}
    </div>
  );
}