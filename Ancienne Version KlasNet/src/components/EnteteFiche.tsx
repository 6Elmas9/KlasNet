import React from 'react';
import { getEnteteConfig } from '../utils/entetesConfig';
import type { AllConfigs } from '../types/enteteConfig';

interface EnteteFicheProps {
  type: keyof AllConfigs;
  libelle?: string;
  classe?: string;
  enseignant?: string;
}

export default function EnteteFiche({ type, libelle, classe, enseignant }: EnteteFicheProps) {
  const cfg = getEnteteConfig(type);

  const leftLogo = cfg.logo || '';
  const rightLogo = cfg.logoMinistere || '';
  const showRightLogo = rightLogo && rightLogo !== leftLogo;

  return (
    <div className="w-full mb-2">
      {/* Reduced logo column width and gap to avoid wrapping on small/print views */}
      <div className="grid grid-cols-[80px_1fr_80px] items-center gap-2 mb-2 print:mb-1">
        <div className="flex items-center justify-start">
          {leftLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={leftLogo} alt="logo" className="logo-left object-contain max-h-16 w-auto max-w-full" />
          ) : (
            <div className="h-14 w-14 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-600">Logo</div>
          )}
        </div>

        <div className="text-center px-2 min-w-0 overflow-hidden">
          <div className="text-sm text-gray-700">{cfg.pays}</div>
          <div className="font-bold text-lg tracking-wider text-blue-800">{cfg.ministere}</div>
          <div className="font-extrabold text-xl mt-1">{cfg.etablissement}</div>
          <div className="text-base text-teal-700 mt-1 entete-libelle font-semibold">{libelle || cfg.header}</div>
          {(classe || enseignant) && (
            <div className="text-sm text-gray-600 mt-1">
              {classe && <span className="mr-3">Classe: {classe}</span>}
              {enseignant && <span>Enseignant: {enseignant}</span>}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          {showRightLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={rightLogo} alt="logo-ministere" className="logo-right object-contain max-h-16 w-auto max-w-full" />
          ) : (
            // keep space consistent even if no distinct right logo
            <div style={{ height: 64, width: 64 }} />
          )}
        </div>
      </div>

      <div className="text-xs text-right text-gray-600 print:text-xs">{cfg.footer}</div>
    </div>
  );
}
