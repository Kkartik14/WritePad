'use client';
import React, { useState, useMemo, useEffect, useCallback } from 'react';

// --- SIZE_MAP and related constants ---
const SIZE_MAP: Record<string, { width: string; height: string }> = {
  A0: { width: '841mm', height: '1189mm' }, A1: { width: '594mm', height: '841mm' }, A2: { width: '420mm', height: '594mm' }, A3: { width: '297mm', height: '420mm' }, A4: { width: '210mm', height: '297mm' }, A5: { width: '148mm', height: '210mm' }, A6: { width: '105mm', height: '148mm' }, A7: { width: '74mm', height: '105mm' }, A8: { width: '52mm', height: '74mm' }, A9: { width: '37mm', height: '52mm' }, A10: { width: '26mm', height: '37mm' },
  B0: { width: '1000mm', height: '1414mm' }, B1: { width: '707mm', height: '1000mm' }, B2: { width: '500mm', height: '707mm' }, B3: { width: '353mm', height: '500mm' }, B4: { width: '250mm', height: '353mm' }, B5: { width: '176mm', height: '250mm' }, B6: { width: '125mm', height: '176mm' }, B7: { width: '88mm', height: '125mm' }, B8: { width: '62mm', height: '88mm' }, B9: { width: '44mm', height: '62mm' }, B10: { width: '31mm', height: '44mm' },
  C0: { width: '917mm', height: '1297mm' }, C1: { width: '648mm', height: '917mm' }, C2: { width: '458mm', height: '648mm' }, C3: { width: '324mm', height: '458mm' }, C4: { width: '229mm', height: '324mm' }, C5: { width: '162mm', height: '229mm' }, C6: { width: '114mm', height: '162mm' }, DL: { width: '110mm', height: '220mm' },
  Letter: { width: '8.5in', height: '11in' }, Legal: { width: '8.5in', height: '14in' }, Tabloid: { width: '11in', height: '17in' }, Ledger: { width: '17in', height: '11in' }, Statement: { width: '5.5in', height: '8.5in' }, Executive: { width: '7.25in', height: '10.5in' }, Folio: { width: '8.5in', height: '13in' }, Quarto: { width: '8in', height: '10in' }, 'Junior Legal': { width: '5in', height: '8in' },
  'Arch A': { width: '9in', height: '12in' }, 'Arch B': { width: '12in', height: '18in' }, 'Arch C': { width: '18in', height: '24in' }, 'Arch D': { width: '24in', height: '36in' }, 'Arch E': { width: '36in', height: '48in' }, 'Arch E1': { width: '30in', height: '42in' },
  'Photo 4R (4x6)': { width: '4in', height: '6in' }, 'Photo 5R (5x7)': { width: '5in', height: '7in' }, 'Photo 8R (8x10)': { width: '8in', height: '10in' }, 'Photo S8R (Super 8R / 8x12)': { width: '8in', height: '12in' }, 'Photo A3+ (Super B)': { width: '13in', height: '19in' },

  'Business Card (US)': { width: '3.5in', height: '2in' }, 'Business Card (EU)': { width: '85mm', height: '55mm' },
  'Index Card (3x5)': { width: '3in', height: '5in' }, 'Index Card (4x6)': { width: '4in', height: '6in' }, 'Index Card (5x8)': { width: '5in', height: '8in' },
};
type PaperSize = keyof typeof SIZE_MAP;
const PAPER_SIZES = Object.keys(SIZE_MAP) as PaperSize[];
const selectOptions = PAPER_SIZES.map((key) => (<option key={key} value={key}>{key} ({SIZE_MAP[key].width} × {SIZE_MAP[key].height})</option>));
const getDefaultSize = (): PaperSize => { if ((PAPER_SIZES as string[]).includes('A4')) return 'A4'; if ((PAPER_SIZES as string[]).includes('Letter')) return 'Letter'; return PAPER_SIZES[0] || ('A4' as PaperSize); };
// --- End of SIZE_MAP and related constants ---


// --- Placeholder Styling Helper with Explicit Types ---
type StyleFunction<T extends object = React.CSSProperties> = (...args: any[]) => T;

const ps: {
  container: StyleFunction<React.CSSProperties>;
  header: StyleFunction<React.CSSProperties>;
  paragraph: StyleFunction<React.CSSProperties>;
  footer: StyleFunction<React.CSSProperties>;
  smallText: StyleFunction<React.CSSProperties>;
  centered: React.CSSProperties;
  imageArea: React.CSSProperties;
  addressBlock: React.CSSProperties;
} = {
  container: (padding = '5%', display = 'flex', flexDirection = 'column', justifyContent = 'space-between'): React.CSSProperties => ({
    padding, width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'hidden', textAlign: 'left', display, flexDirection, justifyContent, color: '#333', fontSize: 'calc(0.4vw + 0.4vh + 3px)', lineHeight: '1.3',
  }),
  header: (fontSize = '1.5em', marginBottom = '0.5em'): React.CSSProperties => ({
    fontSize, margin: `0 0 ${marginBottom} 0`, borderBottom: '1px solid #eee', paddingBottom: '0.25em', fontWeight: 'bold',
  }),
  paragraph: (fontSize = '0.8em', marginBottom = '0.5em'): React.CSSProperties => ({
    fontSize, margin: `0 0 ${marginBottom} 0`,
  }),
  footer: (fontSize = '0.6em', marginTop = '1em'): React.CSSProperties => ({
    fontSize, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '0.5em', marginTop,
  }),
  smallText: (fontSize = '0.7em'): React.CSSProperties => ({ fontSize, margin: '0.2em 0', }),
  centered: { alignItems: 'center', justifyContent: 'center', textAlign: 'center', },
  imageArea: { border: '2px dashed #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', flexGrow: 1, margin: '1em 0', minHeight: '50px', },
  addressBlock: { marginBottom: '1.5em', fontSize: '0.9em' },
};

// --- Category-Specific Placeholder Format Components ---
const GenericFormatPlaceholder = ({ sizeName }: { sizeName: PaperSize }) => ( <div style={ps.container()}> <div> <h3 style={ps.header()}>Document: {sizeName}</h3> <p style={ps.paragraph()}>This is a generic placeholder. Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p> </div> <div style={ps.footer()}>Page 1</div> </div> );
const LetterFormatPlaceholder = ({ sizeName }: { sizeName: PaperSize }) => ( <div style={ps.container('8% 8% 5% 8%')}> <div> <div style={{ ...ps.addressBlock, textAlign: 'right' }}> <div>[Your Name/Company]</div> <div>[Your Address Line 1]</div> <div>[City, State, Zip]</div> <div>[Date]</div> </div> <div style={ps.addressBlock}> <div>[Recipient Name]</div> <div>[Recipient Address Line 1]</div> <div>[City, State, Zip]</div> </div> <h4 style={{ fontSize: '1.1em', margin: '2em 0 1em 0' }}>Subject: Regarding {sizeName} Document</h4> <p style={ps.paragraph()}>Dear [Recipient Name],</p> <p style={ps.paragraph(undefined, '1em')}>This document is a basic letter format placeholder. Please replace this content with your own text. The purpose is to illustrate a typical layout for a {sizeName} sized paper.</p> <p style={ps.paragraph()}>Sincerely,</p> <div style={{ height: '3em' }}></div> <p style={ps.paragraph('0.9em', '0')}>[Your Typed Name]</p> </div> <div style={ps.footer('0.7em', '2em')}>Page 1</div> </div> );
const BusinessCardFormatPlaceholder = ({ sizeName }: { sizeName: PaperSize }) => ( <div style={{...ps.container('10%', 'flex', 'column', 'center'), ...ps.centered }}> <h3 style={{ fontSize: '1.6em', fontWeight: 'bold', margin: '0 0 0.1em 0' }}>[Your Name]</h3> <p style={{ fontSize: '0.9em', margin: '0 0 0.5em 0' }}>[Your Title / Profession]</p> <hr style={{width: '60%', margin: '0.5em auto', borderColor: '#ddd'}} /> <div style={{fontSize: '0.75em'}}> <p style={ps.smallText()}>P: [Your Phone]</p> <p style={ps.smallText()}>E: [Your Email]</p> <p style={ps.smallText()}>W: [Your Website (optional)]</p> </div> <p style={{ fontSize: '0.6em', color: '#999', marginTop: 'auto', paddingTop: '0.5em'}}>({sizeName})</p> </div> );
const LargeFormatPlaceholder = ({ sizeName }: { sizeName: PaperSize }) => ( <div style={{...ps.container('5%'), ...ps.centered}}> <h1 style={{ fontSize: '3em', fontWeight: 'bold', margin: '0.1em 0 0.3em 0' }}>PROJECT TITLE</h1> <h2 style={{ fontSize: '1.8em', margin: '0 0 1em 0' }}>Subtitle or Section Name ({sizeName})</h2> <div style={{ ...ps.imageArea, width: '80%', height: '50%'}}><span>Main Content / Diagram Area</span></div> <div style={{display: 'flex', justifyContent: 'space-between', width: '90%', marginTop: 'auto', fontSize: '0.7em', borderTop: '1px solid #eee', paddingTop: '0.5em'}}> <span>[Drawing No.]</span> <span>[Scale]</span> <span>[Date]</span> </div> </div> );
const PhotoFormatPlaceholder = ({ sizeName }: { sizeName: PaperSize }) => ( <div style={ps.container('3%', 'flex', 'column', 'center')}> <div style={{...ps.imageArea, width: '90%', height: '80%', margin: '0' }}><span>Photo Area</span></div> <p style={{fontSize: '0.8em', textAlign: 'center', marginTop: '0.5em', color: '#777'}}>{sizeName}</p> </div> );
const EnvelopeFormatPlaceholder = ({ sizeName }: { sizeName: PaperSize }) => ( <div style={ps.container('10%')}> <div style={{ position: 'absolute', top: '15%', left: '8%', fontSize: '0.9em', ...ps.addressBlock, marginBottom: '0' }}> <div>[Your Name/Company]</div> <div>[Return Address Line 1]</div> <div>[City, State, Zip]</div> </div> <div style={{ position: 'absolute', top: '45%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center', fontSize: '1.1em', width: '50%' }}> <div>[Recipient Name]</div> <div>[Recipient Address Line 1]</div> <div>[Recipient Address Line 2 (Optional)]</div> <div>[City, State, Zip]</div> </div> <div style={{ position: 'absolute', top: '10%', right: '8%', width: '20%', height: '20%', border: '1px solid #ccc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7em', color: '#aaa'}}> Postage </div> <p style={{ fontSize: '0.6em', color: '#999', marginTop: 'auto', textAlign: 'center' }}>({sizeName} Envelope)</p> </div> );

// --- Default Content Dispatcher ---
const DefaultPreviewContent = ({ sizeName }: { sizeName: PaperSize }) => {
  if (sizeName === 'A4' || sizeName === 'Letter' || sizeName === 'Legal' || sizeName === 'Executive' || sizeName === 'Folio') { return <LetterFormatPlaceholder sizeName={sizeName} />; }
  if (sizeName.startsWith('Business Card')) { return <BusinessCardFormatPlaceholder sizeName={sizeName} />; }
  if (sizeName.startsWith('Photo') || sizeName === 'A6' || sizeName === 'A7' || sizeName === 'A8' || sizeName.startsWith('Index Card')) { return <PhotoFormatPlaceholder sizeName={sizeName} />; }
  if (sizeName.startsWith('Arch') || sizeName === 'A0' || sizeName === 'A1' || sizeName === 'A2' || sizeName === 'A3' || sizeName === 'B0' || sizeName === 'B1' || sizeName === 'B2' || sizeName === 'B3' || sizeName === 'Tabloid' || sizeName === 'Ledger') { return <LargeFormatPlaceholder sizeName={sizeName} />; }
  if (sizeName.startsWith('C') || sizeName === 'DL') { return <EnvelopeFormatPlaceholder sizeName={sizeName} />; }
  return <GenericFormatPlaceholder sizeName={sizeName} />;
};

// --- DocumentSizer Component ---
interface DocumentSizerProps { children?: React.ReactNode; }
export default function DocumentSizer({ children }: DocumentSizerProps) {
  const [selectedSize, setSelectedSize] = useState<PaperSize>(getDefaultSize());
  const handleChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => { setSelectedSize(e.target.value as PaperSize); }, []);
  const handlePrint = useCallback(() => { window.print(); }, []);
  const dimensions = useMemo(() => SIZE_MAP[selectedSize], [selectedSize]);

  useEffect(() => {
    const styleId = 'dynamic-print-style';
    let styleElement = document.getElementById(styleId) as HTMLStyleElement | null;
    if (!styleElement) { styleElement = document.createElement('style'); styleElement.id = styleId; document.head.appendChild(styleElement); }
    styleElement.textContent = `
      @media print {
        @page { size: ${dimensions.width} ${dimensions.height}; margin: 1cm; }
        body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        .non-printable { display: none !important; }
        .print-container { padding: 0 !important; margin: 0 !important; max-width: none !important; }
        .printable-area {
          width: 100% !important; height: 100% !important; margin: 0 !important; padding: 0 !important;
          border: 1px solid #ccc !important; box-shadow: none !important;
          display: flex !important; align-items: stretch !important; justify-content: stretch !important;
          transition: none !important; page-break-inside: avoid; color: #000 !important;
          a { color: inherit !important; text-decoration: none !important; }
        }
      }
    `;
    return () => { /* styleElement?.remove(); */ };
  }, [dimensions]);

  return (
    <div className="p-6 max-w-5xl mx-auto print-container">
      <div className="non-printable">
        <h2 className="text-xl font-bold mb-4">Choose Document Size</h2>
        <div className="flex flex-wrap items-center gap-4 mb-4">
          <label htmlFor="doc-size" className="text-sm font-medium">Select Size:</label>
          <select id="doc-size" className="p-2 border rounded" value={selectedSize} onChange={handleChange}>{selectOptions}</select>
          <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Print</button>
        </div>
      </div>
      <div
        className="bg-white border shadow printable-area"
        style={{
          width: dimensions.width, height: dimensions.height,
          transition: 'width 0.3s, height 0.3s',
          minWidth: '100px', minHeight: '70px',
          overflow: 'hidden', position: 'relative',
        }}
      >
        {children ? children : <DefaultPreviewContent sizeName={selectedSize} />}
      </div>
    </div>
  );
}