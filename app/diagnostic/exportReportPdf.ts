const CAPTURE_SCALE = 2;
const JPEG_QUALITY = 0.9;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_MARGIN_MM = 10;
const MODEL_PAGE_COUNT = 3;

// Coupe entre les blocs [data-pdf-block] pour ne jamais trancher un texte.
// [data-pdf-break] force un debut de page pour suivre le modele a 3 pages ; au-dela,
// seul le manque de place ouvre une page.
function findPageStarts(root: HTMLElement, pageHeightPx: number) {
  const rootTop = root.getBoundingClientRect().top;
  const starts = [0];

  for (const block of root.querySelectorAll<HTMLElement>("[data-pdf-block]")) {
    const { top, bottom } = block.getBoundingClientRect();
    const pageStart = starts[starts.length - 1];
    const blockTop = top - rootTop;
    const forced = "pdfBreak" in block.dataset && starts.length < MODEL_PAGE_COUNT;
    if (blockTop > pageStart && (forced || bottom - rootTop - pageStart > pageHeightPx)) {
      starts.push(blockTop);
    }
  }
  return starts;
}

// html2canvas mesure la ligne de base avec une image GIF en ligne, ajoutee au document
// reel : le display:block du reset Tailwind decalerait tout le texte vers le bas.
async function captureWithTextMetricsFix(root: HTMLElement) {
  const { default: html2canvas } = await import("html2canvas");
  const style = document.createElement("style");
  style.textContent = 'img[src^="data:image/gif"] { display: inline-block; }';
  document.head.appendChild(style);
  try {
    return await html2canvas(root, { scale: CAPTURE_SCALE, backgroundColor: "#ffffff", logging: false });
  } finally {
    style.remove();
  }
}

export async function exportReportPdf(root: HTMLElement, filename: string) {
  // Charges au clic : ces deux librairies ne servent qu'ici.
  const { jsPDF } = await import("jspdf");
  const canvas = await captureWithTextMetricsFix(root);

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const contentWidthMm = PAGE_WIDTH_MM - 2 * PAGE_MARGIN_MM;
  const mmPerPx = contentWidthMm / root.offsetWidth;
  const pageHeightPx = (PAGE_HEIGHT_MM - 2 * PAGE_MARGIN_MM) / mmPerPx;
  const starts = findPageStarts(root, pageHeightPx);

  starts.forEach((start, index) => {
    const end = starts[index + 1] ?? root.offsetHeight;
    const slice = document.createElement("canvas");
    slice.width = canvas.width;
    // Arrondi par defaut : un pixel de plus montrerait le bord du bloc de la page suivante.
    slice.height = Math.floor((end - start) * CAPTURE_SCALE);
    const context = slice.getContext("2d");
    if (!context) throw new Error("Canvas indisponible");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, slice.width, slice.height);
    context.drawImage(canvas, 0, -Math.round(start * CAPTURE_SCALE));

    if (index > 0) pdf.addPage();
    // JPEG : en PNG, trois pages A4 en double resolution pesent pres de 20 Mo.
    pdf.addImage(
      slice.toDataURL("image/jpeg", JPEG_QUALITY),
      "JPEG",
      PAGE_MARGIN_MM,
      PAGE_MARGIN_MM,
      contentWidthMm,
      slice.height / CAPTURE_SCALE * mmPerPx
    );
  });

  pdf.save(filename);
}
