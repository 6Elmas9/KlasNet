import * as XLSX from 'xlsx';
import { db } from './database';
import { Eleve } from '../types';

// Correspondance des niveaux
const niveauMap: Record<string, string> = {
  'GS': 'Grande Section',
  'MS': 'Moyenne Section',
  'PS': 'Petite Section',
  'CP1': 'CP1',
  'CP2': 'CP2',
  'CE1': 'CE1',
  'CE2': 'CE2',
  'CM1': 'CM1',
  'CM2': 'CM2',
};

function cleanString(str: string | undefined): string {
  return (str || '').toString().trim();
}

export async function importElevesDepuisFichierExcel(filePath: string) {
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  const [headerRaw, ...body] = rows;
  const header: string[] = Array.isArray(headerRaw) ? headerRaw.map(h => String(h)) : [];

  // Index des colonnes utiles
  const idx = {
    matricule: header.findIndex(h => h.toLowerCase().includes('matricule')),
    nom: header.findIndex(h => h.toLowerCase().includes('nom')),
    prenom: header.findIndex(h => h.toLowerCase().includes('prénom')),
    sexe: header.findIndex(h => h.toLowerCase().includes('sexe')),
    dateNaissance: header.findIndex(h => h.toLowerCase().includes('nais')),
    lieu: header.findIndex(h => h.toLowerCase().includes('lieu')),
    niveau: header.findIndex(h => h.toLowerCase().includes('niv')),
    annee: header.findIndex(h => h.toLowerCase().includes('annee')),
    statut: header.findIndex(h => h.toLowerCase().includes('statut')),
    dateEntree: header.findIndex(h => h.toLowerCase().includes('entr')),
  };

  let countAjoutes = 0, countMaj = 0;
  for (const row of body) {
    const matricule = cleanString(row[idx.matricule]);
    const nom = cleanString(row[idx.nom]);
    const prenoms = cleanString(row[idx.prenom]);
    const sexe = cleanString(row[idx.sexe]) || 'M';
    const dateNaissance = cleanString(row[idx.dateNaissance]);
    const lieuNaissance = cleanString(row[idx.lieu]);
    const niveau = niveauMap[cleanString(row[idx.niveau])] || cleanString(row[idx.niveau]);
    const anneeEntree = cleanString(row[idx.annee]) || new Date().getFullYear().toString();
    const statut = cleanString(row[idx.statut]) || 'Actif';
    const dateEntree = cleanString(row[idx.dateEntree]);

    if (!nom || !prenoms) continue;

    // Recherche d'un doublon (matricule ou nom/prénoms/date naissance)
    const allEleves = db.getAll<Eleve>('eleves');
    let exist = null;
    if (matricule) {
      exist = allEleves.find(e => e.matricule === matricule);
    }
    if (!exist) {
      exist = allEleves.find(e =>
        e.nom.toLowerCase() === nom.toLowerCase() &&
        e.prenoms.toLowerCase() === prenoms.toLowerCase() &&
        (!dateNaissance || e.dateNaissance === dateNaissance)
      );
    }

    const eleveData = {
      matricule: matricule || db.generateMatricule(),
      nom,
      prenoms,
      sexe: sexe === 'F' ? 'F' : 'M',
      dateNaissance,
      lieuNaissance,
      classeId: '', // à lier manuellement si besoin
      anneeEntree,
      statut,
      pereTuteur: '',
      mereTutrice: '',
      telephone: '',
      adresse: '',
      photo: '',
    };

    if (exist) {
      db.update<Eleve>('eleves', exist.id, eleveData);
      countMaj++;
    } else {
      db.create<Eleve>('eleves', eleveData);
      countAjoutes++;
    }
  }
  console.log(`Import terminé : ${countAjoutes} ajoutés, ${countMaj} mis à jour.`);
}

// Exemple d'utilisation :
// importElevesDepuisFichierExcel('chemin/vers/ton_fichier.xlsx');
