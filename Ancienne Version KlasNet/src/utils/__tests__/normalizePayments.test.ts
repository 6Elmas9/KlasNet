import { db } from '../database';
import seedDefaults from '../seedDefaults';
import { normalizeAllSuspicious, findSuspiciousPayments } from '../normalizePayments';

describe('normalizePayments util', () => {
  beforeEach(() => {
    db.resetData();
    seedDefaults();
  });

  it('detects and normalizes inscription/V1 duplicates', () => {
    const eleve = db.create('eleves', { nom: 'Dup', prenoms: 'Test', classeId: db.getAll('classes')[0].id, matricule: 'DUP01', createdAt: new Date().toISOString() } as any);

    // Create an inscription payment
    const p1 = db.create('paiements', { eleveId: eleve.id, montant: 35000, datePaiement: '2025-09-01', createdAt: '2025-09-01T10:00:00Z', typeFrais: 'inscription' } as any);
    // Create a V1-like scolarite payment same amount
    const p2 = db.create('paiements', { eleveId: eleve.id, montant: 35000, datePaiement: '2025-09-01', createdAt: '2025-09-01T10:05:00Z', typeFrais: 'scolarite', versementIndex: 1 } as any);

    const suspicious = findSuspiciousPayments();
    expect(suspicious.length).toBeGreaterThan(0);

    const res = normalizeAllSuspicious();
    expect(res.groups).toBeGreaterThan(0);

    const paiements = db.getAll('paiements').filter(p => p.eleveId === eleve.id);
    expect(paiements.length).toBe(1);
    const kept = paiements[0] as any;
    expect(kept.typeFrais).toBe('inscription');
    expect(Number(kept.montant)).toBe(70000);
  });
});
