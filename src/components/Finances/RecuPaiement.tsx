import React, { useRef } from 'react';
import EnteteFiche from '../EnteteFiche';
import { getEnteteConfig } from '../../utils/entetesConfig';
import { openPrintPreviewFromElementId } from '../../utils/printPreview';

interface RecuPaiementProps {
  eleve: {
    nom: string;
    prenoms: string;
    matricule: string;
    classe: string;
  };
  montantRegle: number;
  date: string;
  mode: string;
  cumulReglement: number;
  resteAPayer: number;
  anneeScolaire: string;
  operateur: string;
  numeroRecu: string;
  logoUrl?: string;
  printMode?: boolean;
}

const formatMontant = (m: number) => m.toLocaleString('fr-FR', { minimumFractionDigits: 0 }) + ' FCFA';
const formatDate = (d: string) => {
  const dateObj = new Date(d);
  return isNaN(dateObj.getTime()) ? d : dateObj.toLocaleDateString('fr-FR');
};

const RecuPaiement: React.FC<RecuPaiementProps> = ({
  eleve,
  montantRegle,
  date,
  mode,
  cumulReglement,
  resteAPayer,
  anneeScolaire,
  operateur,
  numeroRecu,
  logoUrl
  , printMode = false
}) => {
  const cfg = getEnteteConfig('recu');
  const printRef = useRef<HTMLDivElement | null>(null);
  const refundNote = "Aucun remboursement n'est possible après encaissement.";

  const handlePdfPreview = () => {
  const id = `recu-print-area-${numeroRecu}`;
  if (!printRef.current) return;
  if (!printRef.current.id) printRef.current.id = id;
  openPrintPreviewFromElementId(id, `Reçu ${numeroRecu}`);
  };
  return (
    <div ref={printRef} className={`${printMode ? '' : 'bg-white p-8 rounded-xl shadow-xl max-w-lg mx-auto border border-gray-300 print:max-w-full print:shadow-none print:border-0 font-sans'}`}>
      {printMode ? (
        <div id="print-area" className="print:block">
          {/* EnteteFiche already renders logos/libelle/footer for print */}
          <EnteteFiche type="recu" libelle="REÇU DE PAIEMENT" />
        </div>
      ) : (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            {(cfg.logo || logoUrl) ? (
              <img src={cfg.logo || logoUrl} alt="Logo" className="h-16 w-16 object-contain" />
            ) : (
              <div className="h-16 w-16 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">Logo</div>
            )}
            <div className="text-xs text-gray-700 font-semibold leading-tight">
              <div>GROUPE SCOLAIRE BAPTISTE MISSIONNAIRE DE KOUMASSI CENTRE</div>
              <div className="text-[11px] text-gray-500">Année scolaire : <span className="font-bold">{anneeScolaire}</span></div>
            </div>
          </div>
          <div className="text-xs text-gray-600 text-right">
            <div className="font-bold">N° Reçu : <span className="text-black">{numeroRecu}</span></div>
            <div>Date : {formatDate(date)}</div>
          </div>
        </div>
      )}
      {!printMode && (
        <div className="flex justify-end mb-2">
          <button type="button" onClick={handlePdfPreview} className="inline-flex items-center px-3 py-1 text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 rounded">
            Aperçu PDF
          </button>
        </div>
      )}
      <h2 className="text-xl font-bold text-center mb-2 mt-2 tracking-wide text-teal-700">REÇU DE PAIEMENT</h2>
      <div className="mb-4 text-sm text-gray-700 grid grid-cols-2 gap-x-4 gap-y-1">
        <div><span className="font-semibold">Élève :</span> {eleve.nom} {eleve.prenoms}</div>
        <div><span className="font-semibold">Matricule :</span> {eleve.matricule}</div>
        <div><span className="font-semibold">Classe :</span> {eleve.classe}</div>
        <div><span className="font-semibold">Opérateur :</span> {operateur}</div>
      </div>
      <table className="w-full text-sm border border-gray-300 mb-4 rounded overflow-hidden">
        <thead>
          <tr className="bg-gray-100 text-gray-700">
            <th className="border px-2 py-1">Montant réglé</th>
            <th className="border px-2 py-1">Mode</th>
            <th className="border px-2 py-1">Cumul réglé</th>
            <th className="border px-2 py-1">Reste à payer</th>
          </tr>
        </thead>
        <tbody>
          <tr className="text-center">
            <td className="border px-2 py-1 font-bold text-teal-700">{formatMontant(montantRegle)}</td>
            <td className="border px-2 py-1">{mode}</td>
            <td className="border px-2 py-1">{formatMontant(cumulReglement)}</td>
            <td className="border px-2 py-1 font-bold text-red-600">{formatMontant(resteAPayer)}</td>
          </tr>
        </tbody>
      </table>
      <div className="text-xs text-gray-500 mt-2 border-t pt-2 text-center">
        {(!cfg.footer || !cfg.footer.includes(refundNote)) && (
          <div className="mb-1">{refundNote}</div>
        )}
        <div className="italic">Imprimé le {formatDate(new Date().toISOString())}</div>
      </div>
    </div>
  );
};

export default RecuPaiement;

