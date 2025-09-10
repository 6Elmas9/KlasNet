export function openPrintPreviewFromElementId(elementId: string, title = 'Aperçu') {
  const el = document.getElementById(elementId);
  if (!el) return;
  try {
    const content = el.innerHTML;
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, 'text/html');
    // remove preview buttons
    const buttons = doc.querySelectorAll('button');
    buttons.forEach(b => {
      if (b.textContent && b.textContent.toLowerCase().includes('aperçu')) b.remove();
    });

    const cleaned = doc.body.innerHTML;

    const style = `
      <style>
        body { font-family: 'Times New Roman', Times, serif; color: #111827; padding: 0; margin: 0; background: #f9fafb; }
        .receipt-wrapper { max-width: 760px; margin: 20px auto; padding: 16px; background: #ffffff; border-radius: 6px; border: 1px solid #e5e7eb; }
        img.h-16, img.h-12, img.object-contain, img.logo { max-height: 64px; height: auto; width: auto; }
        img { max-width: 100%; height: auto; }
        h1,h2,h3 { color: #0f766e; }
        table { border-collapse: collapse; width: 100%; font-size: 13px; }
        th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        th { background: #f3f4f6; font-weight: 600; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .muted { color: #6b7280; font-size: 11px; margin-top: 12px; text-align: center; }
      </style>
    `;

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>${style}</head><body><div class="receipt-wrapper">${cleaned}</div></body></html>`;

    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.open();
    newWindow.document.write(html);
    newWindow.document.close();
    newWindow.focus();
    setTimeout(() => {
      try { newWindow.print(); } catch (e) { /* ignore */ }
    }, 300);
  } catch (e) {
    // fallback simple print
    const newWindow = window.open('', '_blank');
    if (!newWindow) return;
    newWindow.document.open();
    newWindow.document.write('<html><head><title>' + title + '</title></head><body>' + el.innerHTML + '</body></html>');
    newWindow.document.close();
    newWindow.print();
  }
}
