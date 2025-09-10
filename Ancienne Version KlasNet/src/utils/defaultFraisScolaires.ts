import { db } from './database';

type Echeance = { modalite: number; label: string; date: string; montant: number };

function parseStartYear(annee: string) {
  const parts = annee.split('-');
  const y = parseInt(parts[0], 10);
  return isNaN(y) ? new Date().getFullYear() : y;
}

export function getDefaultFraisForNiveau(niveau: string, annee: string) {
  const start = parseStartYear(annee);
  const next = start + 1;

  // modality dates
  const dates = [
    `${start}-09-01`, // inscription (septembre)
    `${start}-10-05`, // 1er versement
    `${start}-11-05`, // 2e
    `${start}-12-05`, // 3e
    `${next}-01-05`, // 4e
    `${next}-02-05`, // 5e
    `${next}-03-05`, // 6e
  ];

  // amounts by niveau group
  let inscription = 35000;
  let v1 = 15000;
  let v2 = 15000;
  if (['CM1', 'CM2'].includes(niveau)) {
    v1 = 20000;
  }
  if (niveau === 'CM2') {
    inscription = 45000; // includes 10000 exam fee
  }
  // special case: maternelle (PS, MS, GS) same as inscription=35000 and v1=15000, v2=10000
  if (['Petite Section', 'Moyenne Section', 'Grande Section'].includes(niveau)) {
    v2 = 10000;
  }

  // Build echeances array (modalite numbering 1..7)
  const echeances: Echeance[] = [
    { modalite: 1, label: 'Inscription', date: dates[0], montant: inscription },
    { modalite: 2, label: 'Versement 1', date: dates[1], montant: v1 },
    { modalite: 3, label: 'Versement 2', date: dates[2], montant: v2 },
    { modalite: 4, label: 'Versement 3', date: dates[3], montant: 10000 },
    { modalite: 5, label: 'Versement 4', date: dates[4], montant: 10000 },
    { modalite: 6, label: 'Versement 5', date: dates[5], montant: 10000 },
    { modalite: 7, label: 'Versement 6', date: dates[6], montant: 10000 },
  ];

  const total = echeances.reduce((s, e) => s + e.montant, 0);

  return {
    niveau,
    anneeScolaire: annee,
    montant: total,
    echeances: echeances.map(e => ({ date: e.date, montant: e.montant, modalite: e.modalite, label: e.label }))
  };
}

const NIVEAUX = [
  'Petite Section','Moyenne Section','Grande Section',
  'CP1','CP2','CE1','CE2','CM1','CM2'
];

export function ensureDefaultFrais(annee: string) {
  const existing = db.getAll<any>('fraisScolaires') || [];
  // migration: convert legacy 'annee' property to 'anneeScolaire' if present
  existing.forEach((f: any) => {
    if (f && f.annee && !f.anneeScolaire) {
      try {
        db.update('fraisScolaires', f.id, { ...f, anneeScolaire: f.annee, updatedAt: new Date().toISOString() });
      } catch (err) {
        // ignore migration errors
      }
    }
  });
  let created = 0;
  NIVEAUX.forEach(niveau => {
    const found = (db.getAll<any>('fraisScolaires') || []).find((f: any) => f.niveau === niveau && f.anneeScolaire === annee);
    if (!found) {
      const payload = getDefaultFraisForNiveau(niveau, annee);
      db.create('fraisScolaires', payload);
      created++;
    }
  });
  return created;
}
