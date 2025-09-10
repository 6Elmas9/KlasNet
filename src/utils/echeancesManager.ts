import { db } from './database';
import { Eleve, Classe, FraisScolaire, Paiement } from '../types';

export interface EcheanceStatus {
  echeanceId: string;
  modalite: number;
  label: string;
  date: string;
  montant: number;
  montantPaye: number;
  montantRestant: number;
  isEchue: boolean;
  joursRetard: number;
}

export interface SituationEcheances {
  eleveId: string;
  eleve: Eleve;
  classe: Classe | null;
  echeances: EcheanceStatus[];
  totalDu: number;
  totalPaye: number;
  totalRestant: number;
  echeancesEchues: EcheanceStatus[];
  prochainEcheance: EcheanceStatus | null;
}

export class EcheancesManager {
  private static instance: EcheancesManager;
  
  static getInstance(): EcheancesManager {
    if (!EcheancesManager.instance) {
      EcheancesManager.instance = new EcheancesManager();
    }
    return EcheancesManager.instance;
  }

  // Calculer la situation des échéances pour un élève
  getSituationEcheances(eleveId: string): SituationEcheances | null {
    const eleve = db.getById<Eleve>('eleves', eleveId);
    if (!eleve) return null;

    const classe = db.getById<Classe>('classes', eleve.classeId);
    if (!classe) return null;

    const frais = db.getAll<FraisScolaire>('fraisScolaires').find(f => 
      f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire
    );
    if (!frais || !frais.echeances) return null;

    const paiements = db.getAll<Paiement>('paiements').filter(p => p.eleveId === eleveId);
    const today = new Date();

    // Calculer le montant payé par modalité
    const montantParModalite: Record<number, number> = {};
    
    paiements.forEach(paiement => {
      if (paiement.allocations && paiement.allocations.length > 0) {
        // Utiliser les allocations si disponibles
        paiement.allocations.forEach(allocation => {
          const echeance = frais.echeances!.find(e => e.id === allocation.echeanceId);
          if (echeance && echeance.modalite) {
            montantParModalite[echeance.modalite] = (montantParModalite[echeance.modalite] || 0) + allocation.montant;
          }
        });
      } else {
        // Fallback : utiliser le type de frais et modalité
        const anyPaiement = paiement as any;
        let modalite: number | null = null;

        if (anyPaiement.modalite) {
          modalite = Number(anyPaiement.modalite);
        } else if (anyPaiement.typeFrais === 'inscription') {
          modalite = 1;
        } else if (anyPaiement.typeFrais === 'scolarite' && anyPaiement.versementIndex) {
          modalite = Number(anyPaiement.versementIndex) + 1;
        }

        if (modalite) {
          montantParModalite[modalite] = (montantParModalite[modalite] || 0) + paiement.montant;
        }
      }
    });

    // Créer le statut de chaque échéance
    const echeances: EcheanceStatus[] = frais.echeances.map(echeance => {
      const montantPaye = montantParModalite[echeance.modalite || 0] || 0;
      const montantRestant = Math.max(0, echeance.montant - montantPaye);
      const dateEcheance = new Date(echeance.date);
      const isEchue = dateEcheance < today && montantRestant > 0;
      const joursRetard = isEchue ? Math.floor((today.getTime() - dateEcheance.getTime()) / (1000 * 60 * 60 * 24)) : 0;

      return {
        echeanceId: echeance.id || `${classe.niveau}-${echeance.modalite}`,
        modalite: echeance.modalite || 0,
        label: echeance.label || `Versement ${echeance.modalite}`,
        date: echeance.date,
        montant: echeance.montant,
        montantPaye,
        montantRestant,
        isEchue,
        joursRetard
      };
    });

    const totalDu = echeances.reduce((sum, e) => sum + e.montant, 0);
    const totalPaye = echeances.reduce((sum, e) => sum + e.montantPaye, 0);
    const totalRestant = echeances.reduce((sum, e) => sum + e.montantRestant, 0);
    const echeancesEchues = echeances.filter(e => e.isEchue);
    const prochainEcheance = echeances
      .filter(e => e.montantRestant > 0 && !e.isEchue)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0] || null;

    return {
      eleveId,
      eleve,
      classe,
      echeances,
      totalDu,
      totalPaye,
      totalRestant,
      echeancesEchues,
      prochainEcheance
    };
  }

  // Obtenir toutes les alertes d'échéances
  getAlertesEcheances(): {
    echeancesEchues: Array<{ eleve: Eleve; echeances: EcheanceStatus[]; totalDu: number }>;
    echeancesProches: Array<{ eleve: Eleve; echeance: EcheanceStatus; joursRestants: number }>;
  } {
    const eleves = db.getAll<Eleve>('eleves').filter(e => e.statut === 'Actif');
    const today = new Date();
    const echeancesEchues: Array<{ eleve: Eleve; echeances: EcheanceStatus[]; totalDu: number }> = [];
    const echeancesProches: Array<{ eleve: Eleve; echeance: EcheanceStatus; joursRestants: number }> = [];

    eleves.forEach(eleve => {
      const situation = this.getSituationEcheances(eleve.id);
      if (!situation) return;

      // Échéances échues
      if (situation.echeancesEchues.length > 0) {
        const totalDu = situation.echeancesEchues.reduce((sum, e) => sum + e.montantRestant, 0);
        echeancesEchues.push({
          eleve,
          echeances: situation.echeancesEchues,
          totalDu
        });
      }

      // Prochaines échéances (dans les 7 jours)
      if (situation.prochainEcheance) {
        const dateEcheance = new Date(situation.prochainEcheance.date);
        const joursRestants = Math.ceil((dateEcheance.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (joursRestants <= 7 && joursRestants > 0) {
          echeancesProches.push({
            eleve,
            echeance: situation.prochainEcheance,
            joursRestants
          });
        }
      }
    });

    return { echeancesEchues, echeancesProches };
  }

  // Traiter un paiement intelligent avec allocation automatique
  processPaymentIntelligent(eleveId: string, montant: number, date: string, meta: Record<string, any> = {}) {
    const situation = this.getSituationEcheances(eleveId);
    if (!situation) throw new Error('Impossible de calculer la situation des échéances');

    let montantRestant = montant;
    const allocations: Array<{ echeanceId: string; montant: number }> = [];

    // Allouer d'abord aux échéances échues (par ordre chronologique)
    const echeancesATraiter = [
      ...situation.echeancesEchues.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
      ...situation.echeances.filter(e => !e.isEchue && e.montantRestant > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    ];

    for (const echeance of echeancesATraiter) {
      if (montantRestant <= 0) break;
      if (echeance.montantRestant <= 0) continue;

      const montantAAllouer = Math.min(montantRestant, echeance.montantRestant);
      allocations.push({
        echeanceId: echeance.echeanceId,
        montant: montantAAllouer
      });
      montantRestant -= montantAAllouer;
    }

    // Créer le paiement avec allocations
    const paiementData = {
      eleveId,
      montant,
      datePaiement: date,
      allocations,
      avance: montantRestant,
      ...meta
    };

    const paiement = db.create<Paiement>('paiements', paiementData);

    return {
      paiement,
      allocations,
      avance: montantRestant,
      situation: this.getSituationEcheances(eleveId) // Situation mise à jour
    };
  }

  // Générer les convocations pour les échéances échues
  generateConvocations(): Array<{
    eleve: Eleve;
    classe: Classe;
    echeancesEchues: EcheanceStatus[];
    totalDu: number;
    anneeScolaire: string;
  }> {
    const alertes = this.getAlertesEcheances();
    
    return alertes.echeancesEchues.map(alerte => ({
      eleve: alerte.eleve,
      classe: db.getById<Classe>('classes', alerte.eleve.classeId)!,
      echeancesEchues: alerte.echeances,
      totalDu: alerte.totalDu,
      anneeScolaire: db.getById<Classe>('classes', alerte.eleve.classeId)?.anneeScolaire || ''
    }));
  }
}

export const echeancesManager = EcheancesManager.getInstance();