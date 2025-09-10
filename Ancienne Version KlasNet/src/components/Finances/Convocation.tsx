import EnteteFiche from '../EnteteFiche';

interface ConvocationProps {
  eleve: any;
  echeances: { modalite: number; date: string; attendu: number; paye: number; reste: number }[];
  totalDue: number;
  classe?: any;
  anneeScolaire?: string;
}

export default function Convocation({ eleve, echeances, totalDue, classe, anneeScolaire }: ConvocationProps) {
  return (
    <div className="p-4 print-compact" style={{ pageBreakAfter: 'always' }}>
      <EnteteFiche type="recu" libelle={`Convocation de paiement — ${anneeScolaire || ''}`} />
      <div className="mt-2 mb-4">
        <div><strong>Élève:</strong> {eleve.prenoms} {eleve.nom}</div>
        <div><strong>Classe:</strong> {classe ? `${classe.niveau} ${classe.section || ''}` : ''}</div>
        <div><strong>Matricule:</strong> {eleve.matricule || ''}</div>
      </div>

      <div>
        <h4 className="font-semibold mb-2">Modalités impayées</h4>
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              <th className="border px-2 py-1">Modalité</th>
              <th className="border px-2 py-1">Période</th>
              <th className="border px-2 py-1">Attendu</th>
              <th className="border px-2 py-1">Payé</th>
              <th className="border px-2 py-1">Reste</th>
            </tr>
          </thead>
          <tbody>
            {echeances.map(e => (
              <tr key={e.modalite}>
                <td className="border px-2 py-1 text-center">{e.modalite}</td>
                <td className="border px-2 py-1 text-center">{e.date}</td>
                <td className="border px-2 py-1 text-right">{e.attendu.toLocaleString('fr-FR')} FCFA</td>
                <td className="border px-2 py-1 text-right">{e.paye.toLocaleString('fr-FR')} FCFA</td>
                <td className="border px-2 py-1 text-right">{e.reste.toLocaleString('fr-FR')} FCFA</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 text-right font-bold">
        Montant total dû : {totalDue.toLocaleString('fr-FR')} FCFA
      </div>

      <div className="mt-6 text-sm">
        Merci de régulariser le paiement avant la date indiquée. Pour toute information, contactez l'administration.
      </div>
    </div>
  );
}
