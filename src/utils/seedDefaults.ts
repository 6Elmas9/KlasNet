import { db } from './database';
import { Matiere, Classe, CompositionConfig, Enseignant, Ecole } from '../types';

export function seedDefaults() {
  // Vérifier si déjà initialisé
  if (db.getAll('matieres').length > 0) return;

  const now = new Date().toISOString();
  const anneeScolaire = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);

  // 1. Créer les matières par défaut
  const matieresFondamentales = [
    { nom: 'Mathématiques', coefficient: 4, type: 'Fondamentale' as const },
    { nom: 'Français', coefficient: 4, type: 'Fondamentale' as const },
    { nom: 'Lecture', coefficient: 3, type: 'Fondamentale' as const },
    { nom: 'Écriture', coefficient: 3, type: 'Fondamentale' as const },
  ];

  const matieresEveil = [
    { nom: 'Éveil Scientifique', coefficient: 2, type: 'Éveil' as const },
    { nom: 'Histoire-Géographie', coefficient: 2, type: 'Éveil' as const },
    { nom: 'Instruction Civique', coefficient: 1, type: 'Éveil' as const },
  ];

  const matieresExpression = [
    { nom: 'Éducation Artistique', coefficient: 1, type: 'Expression' as const },
    { nom: 'Éducation Physique', coefficient: 1, type: 'Expression' as const },
    { nom: 'Chant', coefficient: 1, type: 'Expression' as const },
  ];

  const toutesMatieresData = [...matieresFondamentales, ...matieresEveil, ...matieresExpression];
  const matieresCreees: Matiere[] = [];

  toutesMatieresData.forEach(matiereData => {
    const matiere = db.create<Matiere>('matieres', {
      ...matiereData,
      obligatoire: matiereData.type === 'Fondamentale',
      classeIds: []
    });
    matieresCreees.push(matiere);
  });

  // 2. Créer les compositions par défaut (système ivoirien)
  const compositionsDefaut = [
    { nom: '1ère Composition', coefficient: 1, ordre: 1 },
    { nom: '2ème Composition', coefficient: 1, ordre: 2 },
    { nom: '3ème Composition', coefficient: 1, ordre: 3 },
    { nom: 'Composition de fin d\'année', coefficient: 2, ordre: 4 }, // coefficient plus élevé
  ];

  compositionsDefaut.forEach(comp => {
    db.create<CompositionConfig>('compositions', comp);
  });

  // 3. Créer les classes par défaut
  const niveaux = [
    'Petite Section', 'Moyenne Section', 'Grande Section',
    'CP1', 'CP2', 'CE1', 'CE2', 'CM1', 'CM2'
  ];

  niveaux.forEach(niveau => {
    ['A', 'B'].forEach(section => {
      // Ne créer que section A pour les maternelles
      if (['Petite Section', 'Moyenne Section', 'Grande Section'].includes(niveau) && section === 'B') {
        return;
      }

      const classe = db.create<Classe>('classes', {
        niveau,
        section,
        anneeScolaire,
        enseignantPrincipal: '',
        effectifMax: 35,
        salle: `Salle ${niveau} ${section}`,
        matieres: matieresCreees.filter(m => 
          // Toutes les matières pour le primaire, seulement fondamentales + expression pour maternelle
          niveau.includes('Section') 
            ? ['Fondamentale', 'Expression'].includes(m.type)
            : true
        )
      });

      // Mettre à jour les matières avec l'ID de la classe
      matieresCreees.forEach(matiere => {
        if (classe.matieres.some(m => m.id === matiere.id)) {
          db.update<Matiere>('matieres', matiere.id, {
            classeIds: [...(matiere.classeIds || []), classe.id]
          });
        }
      });
    });
  });

  // 4. Créer quelques enseignants par défaut
  const enseignantsDefaut = [
    {
      nom: 'KOUASSI',
      prenoms: 'Marie',
      sexe: 'F' as const,
      telephone: '+225 07 XX XX XX XX',
      adresse: 'Abidjan, Cocody',
      specialite: 'Institutrice',
      diplome: 'CEAP',
      dateEmbauche: '2020-09-01',
      statut: 'Actif' as const,
      salaire: 150000,
      photo: '',
      classesPrincipales: [],
      matieresEnseignees: []
    },
    {
      nom: 'TRAORE',
      prenoms: 'Amadou',
      sexe: 'M' as const,
      telephone: '+225 05 XX XX XX XX',
      adresse: 'Abidjan, Yopougon',
      specialite: 'Professeur des écoles',
      diplome: 'Licence Pédagogie',
      dateEmbauche: '2019-09-01',
      statut: 'Actif' as const,
      salaire: 180000,
      photo: '',
      classesPrincipales: [],
      matieresEnseignees: []
    }
  ];

  enseignantsDefaut.forEach(enseignant => {
    db.create<Enseignant>('enseignants', enseignant);
  });

  // 5. Mettre à jour la configuration de l'école avec les compositions
  const ecole = db.getAll<Ecole>('ecole')[0];
  if (ecole) {
    const compositions = db.getAll<CompositionConfig>('compositions');
    db.update<Ecole>('ecole', ecole.id, { compositions });
  }

  console.log('Données par défaut initialisées avec succès');
}