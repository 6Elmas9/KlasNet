import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../database';
import { seedDefaults } from '../seedDefaults';
import payments from '../payments';
import { Classe } from '../../types';

describe('payments util', () => {
  beforeEach(() => {
    // reset localStorage-like DB
    db.resetData();
    seedDefaults();
    // create minimal eleve and classe
  const classes = db.getAll<Classe>('classes');
  const classe = classes[0] as Classe;
  db.create('eleves', { matricule: '240001', nom: 'Test', prenoms: 'Eleve', sexe: 'M', dateNaissance: '2018-01-01', lieuNaissance: '', classeId: classe.id, anneeEntree: classe.anneeScolaire, statut: 'Actif', pereTuteur: '', mereTutrice: '', telephone: '', adresse: '', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    // ensure frais exist for that classe niveau
  });

  it('compute schedule returns list of échéances', () => {
    const eleves = db.getAll<any>('eleves');
    const e = eleves[0] as any;
    const schedule = payments.computeScheduleForEleve(e.id);
    expect(Array.isArray(schedule)).toBe(true);
    expect(schedule.length).toBeGreaterThan(0);
    expect(schedule[0]).toHaveProperty('echeanceId');
  });

  it('processPayment allocates to échéances and creates paiement', () => {
    const eleves = db.getAll<any>('eleves');
    const e = eleves[0] as any;
    const scheduleBefore = payments.computeScheduleForEleve(e.id);
    const totalDue = scheduleBefore.reduce((s:any, x:any) => s + x.montant, 0);
    const res = payments.processPayment(e.id, totalDue, new Date().toISOString(), {});
    expect(res.allocations.reduce((s:any,a:any)=>s+a.montant,0)).toBe(totalDue);
    const paiements = db.getAll('paiements');
    expect(paiements.length).toBeGreaterThan(0);
  });
});
