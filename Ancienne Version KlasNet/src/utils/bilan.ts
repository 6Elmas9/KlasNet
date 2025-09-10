import { db } from './database';
import { Eleve, Note, Matiere, CompositionConfig, Classe } from '../types';

export function calculerMoyenneAnnuelle(eleve: Eleve): number {
  const notes = db.getAll<Note>('notes').filter(n => n.eleveId === eleve.id);
  const matieres = db.getAll<Matiere>('matieres');
  const compositions = db.getAll<CompositionConfig>('compositions');
  const classe = db.getAll<Classe>('classes').find(c => c.id === eleve.classeId);
  if (!classe) return 0;

  // Pour chaque matière, calculer la moyenne pondérée sur toutes les compositions
  let total = 0;
  let totalCoeff = 0;
  matieres.forEach(matiere => {
    // On ne prend que les matières de la classe
    if (!matiere.classeIds.includes(classe.id)) return;
    let somme = 0;
    let coeffTotal = 0;
    compositions.forEach(comp => {
      const note = notes.find(n => n.matiereId === matiere.id && n.compositionId === comp.id);
      if (note) {
        somme += note.valeur * comp.coefficient;
        coeffTotal += comp.coefficient;
      }
    });
    if (coeffTotal > 0) {
      const moyenneMatiere = somme / coeffTotal;
      total += moyenneMatiere * matiere.coefficient;
      totalCoeff += matiere.coefficient;
    }
  });
  if (totalCoeff === 0) return 0;
  return Math.round((total / totalCoeff) * 100) / 100;
}
