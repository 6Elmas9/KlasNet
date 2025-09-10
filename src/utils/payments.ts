import { db } from './database';
import { Eleve, Classe, FraisScolaire, Paiement } from '../types';

export interface ScheduleItem {
  echeanceId: string;
  modalite: number;
  dueDate: string;
  montant: number;
  remaining: number;
  label: string;
}

export function computeScheduleForEleve(eleveId: string): ScheduleItem[] {
  const eleve = db.getById<Eleve>('eleves', eleveId);
  if (!eleve) return [];

  const classe = db.getById<Classe>('classes', eleve.classeId);
  if (!classe) return [];

  const frais = db.getAll<FraisScolaire>('fraisScolaires').find(f => 
    f.niveau === classe.niveau && f.anneeScolaire === classe.anneeScolaire
  );
  if (!frais || !frais.echeances) return [];

  const paiements = db.getAll<Paiement>('paiements').filter(p => p.eleveId === eleveId);

  return frais.echeances.map(echeance => {
    const paiementsEcheance = paiements.filter(p => 
      p.typeFrais === 'scolarite' && 
      (p as any).modalite === echeance.modalite
    );
    const totalPaye = paiementsEcheance.reduce((sum, p) => sum + p.montant, 0);
    const remaining = Math.max(0, echeance.montant - totalPaye);

    return {
      echeanceId: echeance.id,
      modalite: echeance.modalite,
      dueDate: echeance.date,
      montant: echeance.montant,
      remaining,
      label: echeance.label
    };
  });
}

export function processPayment(
  eleveId: string, 
  montant: number, 
  datePaiement: string, 
  metadata: Record<string, any> = {}
) {
  const schedule = computeScheduleForEleve(eleveId);
  const allocations: Array<{ echeanceId: string; montant: number }> = [];
  
  let remainingAmount = montant;

  // Allouer le paiement aux échéances dans l'ordre
  for (const item of schedule) {
    if (remainingAmount <= 0) break;
    if (item.remaining <= 0) continue;

    const allocation = Math.min(remainingAmount, item.remaining);
    allocations.push({
      echeanceId: item.echeanceId,
      montant: allocation
    });
    remainingAmount -= allocation;
  }

  // Créer le paiement
  const paiement = db.create<Paiement>('paiements', {
    eleveId,
    montant,
    datePaiement,
    typeFrais: metadata.type || 'scolarite',
    modePaiement: metadata.mode || 'Espèces',
    numeroRecu: metadata.numeroRecu || 'REC' + Date.now().toString().slice(-8),
    operateur: metadata.utilisateur || 'ADMIN',
    notes: metadata.note || '',
    ...metadata
  });

  return {
    paiement,
    allocations,
    remainingAmount
  };
}

export default {
  computeScheduleForEleve,
  processPayment
};