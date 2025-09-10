import { db } from './database';
import { Classe, Enseignant } from '../types';

const anneeScolaire = new Date().getFullYear() + '-' + (new Date().getFullYear() + 1);

const requestedClasses: Omit<Classe, 'id' | 'createdAt' | 'updatedAt'>[] = [
  { niveau: 'Petite Section', section: 'PS', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: 'PS', matieres: [] },
  { niveau: 'Moyenne Section', section: 'MS', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: 'MS', matieres: [] },
  { niveau: 'Grande Section', section: 'GS', anneeScolaire, enseignantPrincipal: '', effectifMax: 35, salle: 'GS', matieres: [] },
  { niveau: 'CP1', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CP1-A', matieres: [] },
  { niveau: 'CP1', section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CP1-B', matieres: [] },
  { niveau: 'CP2', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CP2-A', matieres: [] },
  { niveau: 'CP2', section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CP2-B', matieres: [] },
  { niveau: 'CE1', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CE1-A', matieres: [] },
  { niveau: 'CE1', section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CE1-B', matieres: [] },
  { niveau: 'CE2', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CE2-A', matieres: [] },
  { niveau: 'CE2', section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CE2-B', matieres: [] },
  { niveau: 'CM1', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CM1-A', matieres: [] },
  { niveau: 'CM1', section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CM1-B', matieres: [] },
  { niveau: 'CM2', section: 'A', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CM2-A', matieres: [] },
  { niveau: 'CM2', section: 'B', anneeScolaire, enseignantPrincipal: '', effectifMax: 40, salle: 'CM2-B', matieres: [] },
];

export function seedDefaults() {
  // For each requested class, ensure a placeholder teacher exists and assign
  requestedClasses.forEach(cl => {
    const teacherPrenoms = 'ENS';
    const teacherNom = `${cl.niveau} ${cl.section}`;
    const teacherDisplay = `${teacherPrenoms} ${teacherNom}`;
    const enseignants = db.getAll<Enseignant>('enseignants');
    let enseignant = enseignants.find(e => `${e.prenoms} ${e.nom}` === teacherDisplay);
    if (!enseignant) {
      const enseignantPayload: Partial<Enseignant> = {
        nom: teacherNom,
        prenoms: teacherPrenoms,
        sexe: 'F',
        telephone: '',
        email: '',
        adresse: '',
        specialite: '',
        diplome: '',
        dateEmbauche: new Date().toISOString(),
        statut: 'Actif',
        classesPrincipales: [],
        matieresEnseignees: [],
        salaire: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
  enseignant = db.create<Enseignant>('enseignants', enseignantPayload as Enseignant);
      
    }

    const exist = db.getAll<Classe>('classes').find(c => c.niveau === cl.niveau && c.section === cl.section && c.anneeScolaire === cl.anneeScolaire);
    if (!exist) {
      const payload: Omit<Classe, 'id' | 'createdAt' | 'updatedAt'> = { ...cl, enseignantPrincipal: `${enseignant.prenoms} ${enseignant.nom}` };
      db.create<Classe>('classes', payload as any);
    }
  });

  console.log('Seed defaults: classes et enseignants créés si manquants');

  // --- Seed frais scolaires pour 2025-2026 (valeurs fournies) ---
  const anneeTarget = '2025-2026';
  const defaultFrais: Array<Omit<import('../types').FraisScolaire, 'id' | 'createdAt' | 'updatedAt'>> = [
    {
      niveau: 'Petite Section',
      anneeScolaire: anneeTarget,
      fraisInscription: 0,
      echeances: [
        { id: 'Petite Section-2025-2026-1', date: '2025-09-01', montant: 35000, modalite: 1 },
        { id: 'Petite Section-2025-2026-2', date: '2025-10-05', montant: 15000, modalite: 2 },
        { id: 'Petite Section-2025-2026-3', date: '2025-11-05', montant: 10000, modalite: 3 },
        { id: 'Petite Section-2025-2026-4', date: '2025-12-05', montant: 10000, modalite: 4 },
        { id: 'Petite Section-2025-2026-5', date: '2026-01-05', montant: 10000, modalite: 5 },
        { id: 'Petite Section-2025-2026-6', date: '2026-02-05', montant: 10000, modalite: 6 },
        { id: 'Petite Section-2025-2026-7', date: '2026-03-05', montant: 10000, modalite: 7 }
      ]
    },
  { niveau: 'Moyenne Section', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'Moyenne Section-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'Moyenne Section-2025-2026-2', date: '2025-10-05', montant: 15000, modalite:2 }, { id: 'Moyenne Section-2025-2026-3', date: '2025-11-05', montant: 10000, modalite:3 }, { id: 'Moyenne Section-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'Moyenne Section-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'Moyenne Section-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'Moyenne Section-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'Grande Section', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'Grande Section-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'Grande Section-2025-2026-2', date: '2025-10-05', montant: 15000, modalite:2 }, { id: 'Grande Section-2025-2026-3', date: '2025-11-05', montant: 10000, modalite:3 }, { id: 'Grande Section-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'Grande Section-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'Grande Section-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'Grande Section-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'CP1', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'CP1-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'CP1-2025-2026-2', date: '2025-10-05', montant: 15000, modalite:2 }, { id: 'CP1-2025-2026-3', date: '2025-11-05', montant: 15000, modalite:3 }, { id: 'CP1-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'CP1-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'CP1-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'CP1-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'CP2', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'CP2-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'CP2-2025-2026-2', date: '2025-10-05', montant: 15000, modalite:2 }, { id: 'CP2-2025-2026-3', date: '2025-11-05', montant: 15000, modalite:3 }, { id: 'CP2-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'CP2-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'CP2-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'CP2-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'CE1', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'CE1-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'CE1-2025-2026-2', date: '2025-10-05', montant: 15000, modalite:2 }, { id: 'CE1-2025-2026-3', date: '2025-11-05', montant: 15000, modalite:3 }, { id: 'CE1-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'CE1-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'CE1-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'CE1-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'CE2', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'CE2-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'CE2-2025-2026-2', date: '2025-10-05', montant: 15000, modalite:2 }, { id: 'CE2-2025-2026-3', date: '2025-11-05', montant: 15000, modalite:3 }, { id: 'CE2-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'CE2-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'CE2-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'CE2-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'CM1', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'CM1-2025-2026-1', date: '2025-09-01', montant: 35000, modalite:1 }, { id: 'CM1-2025-2026-2', date: '2025-10-05', montant: 20000, modalite:2 }, { id: 'CM1-2025-2026-3', date: '2025-11-05', montant: 15000, modalite:3 }, { id: 'CM1-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'CM1-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'CM1-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'CM1-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] },
  { niveau: 'CM2', anneeScolaire: anneeTarget, fraisInscription: 0, echeances: [ { id: 'CM2-2025-2026-1', date: '2025-09-01', montant: 45000, modalite:1 }, { id: 'CM2-2025-2026-2', date: '2025-10-05', montant: 20000, modalite:2 }, { id: 'CM2-2025-2026-3', date: '2025-11-05', montant: 15000, modalite:3 }, { id: 'CM2-2025-2026-4', date: '2025-12-05', montant: 10000, modalite:4 }, { id: 'CM2-2025-2026-5', date: '2026-01-05', montant: 10000, modalite:5 }, { id: 'CM2-2025-2026-6', date: '2026-02-05', montant: 10000, modalite:6 }, { id: 'CM2-2025-2026-7', date: '2026-03-05', montant: 10000, modalite:7 } ] }
  ];

  defaultFrais.forEach(f => {
    const exist = db.getAll('fraisScolaires').find((x: any) => x.niveau === f.niveau && x.anneeScolaire === f.anneeScolaire);
    if (!exist) {
      const payload: Omit<import('../types').FraisScolaire, 'id' | 'createdAt' | 'updatedAt'> & { createdAt: string; updatedAt: string } = { ...f, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
      db.create<import('../types').FraisScolaire>('fraisScolaires', payload as import('../types').FraisScolaire);
    }
  });

  console.log('Seed defaults: frais scolaires pour 2025-2026 ajoutés si manquants');
}

export default seedDefaults;
