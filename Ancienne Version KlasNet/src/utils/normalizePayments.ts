import { db } from './database';
import { Paiement } from '../types';

type SuspiciousGroup = {
  eleveId: string;
  date: string;
  montant: number;
  paiements: Paiement[];
};

// Find groups of payments that share eleveId + montant + date and contain both
// an 'inscription' payment and a 'scolarite' payment that looks like V1.
export function findSuspiciousPayments(): SuspiciousGroup[] {
  const all = db.getAll<Paiement>('paiements');

  const groups = new Map<string, Paiement[]>();

  for (const p of all) {
    const key = `${p.eleveId}::${String(p.montant || 0)}::${(p.datePaiement || p.date || '').slice(0, 10)}`;
    const arr = groups.get(key) || [];
    arr.push(p);
    groups.set(key, arr);
  }

  const suspicious: SuspiciousGroup[] = [];

  for (const [key, items] of groups.entries()) {
    if (items.length < 2) continue;
    const hasInscription = items.some(i => (i as any).typeFrais === 'inscription');
    const hasV1Like = items.some(i => {
      const anyI: any = i as any;
      if (anyI.typeFrais === 'scolarite' && typeof anyI.versementIndex !== 'undefined' && Number(anyI.versementIndex) === 1) return true;
      if (typeof anyI.modalite !== 'undefined' && Number(anyI.modalite) === 1) return true;
      return false;
    });
    if (hasInscription && hasV1Like) {
      const [eleveId, montantStr, dateStr] = key.split('::');
      suspicious.push({ eleveId, date: dateStr, montant: Number(montantStr), paiements: items });
    }
  }

  return suspicious;
}

// Normalize a single suspicious group by merging all payments into a single
// inscription payment: keep the earliest inscription (or earliest overall) and
// sum montants; delete other payments.
export function normalizeGroupToInscription(group: SuspiciousGroup) {
  const inscriptionPays = group.paiements.filter(p => (p as any).typeFrais === 'inscription');
  const sorted = [...group.paiements].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  const keeper = inscriptionPays.length ? inscriptionPays.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))[0] : sorted[0];

  const total = group.paiements.reduce((s, p) => s + Number(p.montant || 0), 0);

  // Update keeper to inscription
  db.update<Paiement>('paiements', keeper.id, {
    montant: total,
    typeFrais: 'inscription',
    modalite: 1,
    versementIndex: undefined as any
  } as Partial<Paiement>);

  // Delete other payments
  for (const p of group.paiements) {
    if (p.id === keeper.id) continue;
    db.delete('paiements', p.id);
  }

  return { kept: keeper.id, total };
}

export function normalizeAllSuspicious(): { groups: number; normalized: number } {
  const groups = findSuspiciousPayments();
  let normalized = 0;
  for (const g of groups) {
    normalizeGroupToInscription(g);
    normalized += 1;
  }
  return { groups: groups.length, normalized };
}

export default { findSuspiciousPayments, normalizeGroupToInscription, normalizeAllSuspicious };
