// Historique des actions
export interface HistoriqueAction {
  id: string;
  type: 'création' | 'modification' | 'suppression' | 'paiement' | 'connexion' | 'autre';
  cible: string; // ex: 'Élève', 'Classe', 'Paiement', etc.
  cibleId?: string;
  description: string;
  date: string;
  utilisateur?: string;
}

export interface Eleve {
  id: string;
  matricule: string;
  nom: string;
  prenoms: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  classeId: string;
  anneeEntree: string;
  statut: 'Actif' | 'Inactif' | 'Transféré';
  // Statut d'inscription utilisé par l'interface Finances
  statutInscription?: 'inscrit' | 'non-inscrit';
  pereTuteur: string;
  mereTutrice: string;
  telephone: string;
  adresse: string;
  photo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Classe {
  id: string;
  niveau: 'Petite Section' | 'Moyenne Section' | 'Grande Section' | 'CP1' | 'CP2' | 'CE1' | 'CE2' | 'CM1' | 'CM2';
  section: string;
  enseignantPrincipal: string;
  effectifMax: number;
  salle: string;
  matieres: Matiere[];
  anneeScolaire: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Matiere {
  id: string;
  nom: string;
  coefficient: number;
  bareme?: number;
  type: 'Fondamentale' | 'Éveil' | 'Expression';
  obligatoire: boolean;
  classeIds: string[]; // Classes où cette matière est enseignée
  createdAt?: string;
}

export interface Enseignant {
  id: string;
  nom: string;
  prenoms: string;
  sexe: 'M' | 'F';
  telephone: string;
  email: string;
  adresse: string;
  specialite: string;
  diplome: string;
  dateEmbauche: string;
  statut: 'Actif' | 'Inactif' | 'Congé';
  salaire?: number;
  photo?: string;
  classesPrincipales: string[];
  matieresEnseignees: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FraisScolaire {
  id: string;
  niveau: Classe['niveau'];
  anneeScolaire: string;
  fraisInscription?: number;
  fraisScolarite?: number;
  fraisCantine?: number;
  fraisTransport?: number;
  fraisFournitures?: number;
  echeances?: Echeance[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Echeance {
  id: string;
  modalite?: number;
  label?: string;
  date: string;
  montant: number;
}

export interface Allocation {
  echeanceId: string;
  montant: number;
}

export interface Paiement {
  id: string;
  eleveId: string;
  montant: number;
  // typeFrais: 'inscription' | 'scolarite' | 'cantine' | 'transport' | 'fournitures' | custom
  typeFrais?: string;
  // pour scolarité : versement index (1..5)
  versementIndex?: number;
  datePaiement?: string;
  numeroRecu?: string;
  modePaiement?: string;
  // allocations détaillées vers échéances (pour les paiements scolarité)
  allocations?: Allocation[];
  // avance ou crédit généré si montant > total attendu
  avance?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface MoyenneGenerale {
  id: string;
  eleveId: string;
  classeId: string;
  anneeScolaire: string;
  moyenneGenerale: number;
  rang?: number;
  mention?: 'Très Bien' | 'Bien' | 'Assez Bien' | 'Passable' | 'Insuffisant';
  admis?: boolean;
  compositions?: { id: string; nom: string; coefficient: number }[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Ecole {
  id: string;
  nom: string;
  adresse?: string;
  telephone?: string;
  email?: string;
  logo?: string;
  anneeScolaireActive?: string;
  compositions?: CompositionConfig[];
  devise?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CompositionConfig {
  id: string;
  nom: string;
  coefficient: number;
}

export interface Utilisateur {
  id: string;
  nom: string;
  prenoms: string;
  email: string;
  role: 'Admin' | 'Secrétaire' | 'Enseignant';
  actif: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type StatutPaiement = 'Payé' | 'Partiellement Payé' | 'Non Payé';

export interface SituationFinanciere {
  eleveId: string;
  classeId: string;
  anneeScolaire: string;
  montantTotal: number;
  montantPaye: number;
  statut: StatutPaiement;
  detailsPaiements: {
    typeFrais: string;
    montantDu: number;
    montantPaye: number;
  }[];
}