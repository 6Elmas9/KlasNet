
import { useState, useEffect } from 'react';
import { Users, DollarSign, BookOpen, Settings, Search, AlertTriangle, TrendingUp, CheckCircle, Home, Upload } from 'lucide-react';

const steps = [
  {
    title: "Bienvenue sur KlasNet !",
    description: "Bienvenue dans votre application de gestion scolaire KlasNet ! Ce guide va vous accompagner pas à pas pour découvrir chaque fonctionnalité. Prenez le temps de lire chaque étape, puis cliquez sur 'Suivant'.\n\nAstuce : Vous pouvez relancer ce guide à tout moment en cliquant sur le bouton 'Guide' en haut à droite.",
    icon: <Home className="h-10 w-10 text-teal-600 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Tableau de Bord",
    description: "Le Tableau de Bord est la page d'accueil. Il affiche en temps réel :\n- Le nombre total d'élèves et d'élèves actifs\n- Les recettes totales et celles du mois\n- Les paiements complétés et en attente\n- Des graphiques pour visualiser l'évolution des finances\n\nEn bas, retrouvez les 'Actions Rapides' pour accéder directement aux fonctions principales.\n\nExemple : Cliquez sur 'Nouvel Élève' pour inscrire un nouvel élève en un seul clic.",
    icon: <TrendingUp className="h-10 w-10 text-blue-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Gestion des élèves",
    description: "Dans le menu 'Élèves', vous pouvez :\n- Voir la liste de tous les élèves\n- Ajouter un nouvel élève (bouton 'Nouvel Élève')\n- Modifier ou supprimer un élève existant\n\nAstuce : Utilisez la barre de recherche pour retrouver rapidement un élève par nom, prénom ou matricule.\n\nExemple : Pour inscrire un nouvel élève, cliquez sur 'Nouvel Élève', remplissez le formulaire puis validez.",
    icon: <Users className="h-10 w-10 text-purple-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Finances et paiements",
    description: "Dans la section 'Finances', vous pouvez :\n- Enregistrer un paiement pour un élève\n- Consulter l'historique des paiements\n- Voir la situation financière de chaque élève (solde, montant dû, etc.)\n\nExemple : Pour enregistrer un paiement, cliquez sur 'Nouveau Paiement', sélectionnez l'élève concerné et saisissez le montant.",
    icon: <DollarSign className="h-10 w-10 text-green-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Saisie des notes",
    description: "Dans la section 'Notes', vous pouvez :\n- Saisir les notes des élèves pour chaque matière et période\n- Consulter les moyennes et les résultats\n\nAstuce : Saisissez régulièrement les notes pour suivre la progression des élèves et générer les bulletins facilement.",
    icon: <BookOpen className="h-10 w-10 text-indigo-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Configuration",
    description: "Dans 'Configuration', personnalisez votre application :\n- Définissez l'année scolaire active\n- Ajoutez ou modifiez les frais scolaires\n- Gérez les compositions et les paramètres de l'école\n\nExemple : Pour changer d'année scolaire, saisissez la nouvelle année puis cliquez sur 'Changer'.\n\nAstuce : Vérifiez toujours que l'année scolaire active est correcte avant de saisir de nouvelles données.",
    icon: <Settings className="h-10 w-10 text-gray-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Recherche rapide",
    description: "La barre de recherche (en haut de chaque page) vous permet de retrouver rapidement :\n- Un élève\n- Une classe\n- Un enseignant\n- Une opération financière\n\nTapez simplement un mot-clé (nom, prénom, etc.) et les résultats s'affichent instantanément.",
    icon: <Search className="h-10 w-10 text-pink-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Historique et alertes",
    description: "KlasNet vous informe en temps réel :\n- Alertes sur les paiements en retard\n- Notifications pour les actions à effectuer (ex : élèves sans notes)\n- Historique des modifications (ajout, suppression, paiement, etc.)\n\nAstuce : Consultez régulièrement l'historique pour suivre l'activité de l'école et anticiper les besoins.",
    icon: <AlertTriangle className="h-10 w-10 text-red-500 mx-auto mb-2" />,
    scrollTo: null
  },
  {
    title: "Import/Export Excel",
    description: "Gagnez du temps grâce à l'importation et l'exportation des listes d'élèves au format Excel !\n\n- Importez facilement une liste d'élèves depuis un fichier Excel.\n- Prévisualisez les données avant de valider l'importation.\n- Sélectionnez la classe d'affectation et vérifiez les colonnes importantes (Matricule, Nom, Prénoms).\n- Exportez la liste actuelle pour la partager ou l'archiver.\n\nAstuce : Vérifiez toujours l'aperçu avant de valider pour éviter les erreurs de saisie.",
    icon: <Upload className="h-10 w-10 text-orange-500 mx-auto mb-2 animate-pulse" />,
    scrollTo: null
  },
  {
    title: "C'est parti !",
    description: "Vous êtes prêt à utiliser KlasNet !\n\nN'hésitez pas à explorer chaque menu, à utiliser la recherche et à consulter ce guide en cas de besoin.\n\nBonne gestion et merci d'utiliser KlasNet !",
    icon: <CheckCircle className="h-10 w-10 text-teal-600 mx-auto mb-2 animate-bounce" />,
    scrollTo: null
  }
];

export default function Guide({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Scroll contextuel si besoin (exemple pour l'avenir)
  const handleStepClick = (idx: number) => {
    setStep(idx);
    if (steps[idx].scrollTo) {
      const el = document.getElementById(steps[idx].scrollTo);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full p-8 relative animate-fade-in">
        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-700 text-2xl" onClick={onClose}>&times;</button>
        {/* Barre de progression */}
        <div className="flex items-center mb-6">
          {steps.map((s, idx) => (
            <button
              key={s.title}
              className={`flex-1 h-2 mx-1 rounded-full transition-all duration-300 ${
                idx <= step ? 'bg-teal-500' : 'bg-gray-200'
              }`}
              style={{ minWidth: 20, maxWidth: 40, opacity: idx === step ? 1 : 0.7, height: idx === step ? 6 : 2 }}
              onClick={() => handleStepClick(idx)}
              aria-label={`Aller à l'étape ${idx + 1}`}
            />
          ))}
        </div>
        {/* Icône et titre */}
        <div className="flex flex-col items-center mb-4">
          {steps[step].icon}
          <h2 className="text-2xl font-bold text-teal-700 mb-2 text-center">{steps[step].title}</h2>
        </div>
        <p className="mb-8 text-gray-700 text-center text-lg min-h-[60px]">{steps[step].description}</p>
        <div className="flex justify-between items-center mt-4">
          <button
            className="px-4 py-2 bg-gray-200 rounded text-gray-700 font-semibold disabled:opacity-50"
            onClick={() => setStep(s => Math.max(0, s - 1))}
            disabled={step === 0}
          >Précédent</button>
          <span className="text-sm text-gray-500">{step + 1} / {steps.length}</span>
          {step < steps.length - 1 ? (
            <button
              className="px-4 py-2 bg-teal-600 text-white rounded font-semibold shadow hover:bg-teal-700 transition"
              onClick={() => setStep(s => s + 1)}
            >Suivant</button>
          ) : (
            <button
              className="px-4 py-2 bg-teal-600 text-white rounded font-semibold shadow hover:bg-teal-700 transition"
              onClick={onClose}
            >Terminer</button>
          )}
        </div>
      </div>
    </div>
  );
}

