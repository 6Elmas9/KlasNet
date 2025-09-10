import EnteteFiche from '../EnteteFiche';
import { Eleve, Paiement, Classe } from '../../types';

interface CombinedRecuProps {
  eleve: Eleve;
  paiements: Paiement[];
  classe?: Classe;
  anneeScolaire?: string;
}

export default function CombinedRecu({ eleve, paiements, classe, anneeScolaire }: CombinedRecuProps) {
  const total = (paiements || []).reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const numero = 'REC' + Date.now().toString().slice(-8);
  return (
    <div className="p-4 print-compact" style={{ pageBreakAfter: 'always' }}>
      <EnteteFiche type="recu" libelle={`Reçu combiné — ${anneeScolaire || ''}`} />
      <div className="mt-2 mb-4">
        <div><strong>Élève:</strong> {eleve.prenoms} {eleve.nom}</div>
        <div><strong>Classe:</strong> {classe ? `${classe.niveau} ${classe.section || ''}` : ''}</div>
        <div><strong>Matricule:</strong> {eleve.matricule || ''}</div>
        <div><strong>N° Reçu:</strong> {numero}</div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Détails des opérations</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Date</th>
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">Montant</th>
            </tr>
          </thead>
          <tbody>
            {paiements.map((p, i) => (
              <tr key={i}>
                <td className="border px-2 py-1">{new Date(p.datePaiement || Date.now()).toLocaleDateString('fr-FR')}</td>
                <td className="border px-2 py-1">{p.typeFrais || '-'}</td>
                <td className="border px-2 py-1 text-right">{(Number(p.montant) || 0).toLocaleString('fr-FR')} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right font-bold">
        Total payé : {total.toLocaleString('fr-FR')} FCFA
      </div>

      <div className="mt-6 text-sm">Opérateur: ADMIN</div>
    </div>
  );
}
