import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Print mode configuration
 * Set to 'pdf' for testing (generates downloadable PDF)
 * Set to 'print' for production (uses browser print dialog)
 */
const PRINT_MODE = 'pdf'; // 'pdf' or 'print'

/**
 * Opens receipt HTML in a new window with PDF download capability
 * @param {string} html - The complete HTML content for the receipt
 * @param {string} filename - The filename for the PDF (without extension)
 */
export const openReceiptWindow = (html, filename = 'receipt') => {
  if (PRINT_MODE === 'pdf') {
    openReceiptAsPDF(html, filename);
  } else {
    // Original print behavior
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  }
};

/**
 * Opens receipt HTML and converts it to a downloadable PDF
 * @param {string} html - The complete HTML content for the receipt
 * @param {string} filename - The filename for the PDF (without extension)
 */
export const openReceiptAsPDF = async (html, filename = 'receipt') => {
  // Create a hidden iframe to render the HTML
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.top = '-9999px';
  iframe.style.width = '320px'; // Receipt width
  iframe.style.height = '800px';
  document.body.appendChild(iframe);

  // Write HTML to iframe
  const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  // Wait for content to load (including images)
  await new Promise(resolve => {
    if (iframeDoc.readyState === 'complete') {
      setTimeout(resolve, 500); // Extra time for images
    } else {
      iframe.onload = () => setTimeout(resolve, 500);
    }
  });

  try {
    // Get the body element to capture
    const body = iframeDoc.body;

    // Hide no-print elements
    const noPrintElements = body.querySelectorAll('.no-print');
    noPrintElements.forEach(el => el.style.display = 'none');

    // Use html2canvas to capture the content
    const canvas = await html2canvas(body, {
      scale: 2, // Higher quality
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: 300,
      windowWidth: 300,
    });

    // Calculate PDF dimensions (receipt width ~80mm for thermal printers)
    const imgWidth = 80; // mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    // Create PDF with custom size
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: [imgWidth, imgHeight + 10] // Add small margin
    });

    // Add image to PDF
    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 0, 5, imgWidth, imgHeight);

    // Generate timestamp for unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fullFilename = `${filename}_${timestamp}.pdf`;

    // Save the PDF
    pdf.save(fullFilename);

    // Also open in new tab for viewing
    const pdfBlob = pdf.output('blob');
    const pdfUrl = URL.createObjectURL(pdfBlob);
    window.open(pdfUrl, '_blank');

  } catch (error) {
    console.error('Error generating PDF:', error);
    // Fallback to regular print window
    const printWindow = window.open('', '_blank');
    printWindow.document.write(html);
    printWindow.document.close();
  } finally {
    // Clean up iframe
    document.body.removeChild(iframe);
  }
};

/**
 * Generates receipt HTML buttons based on current print mode
 * Returns HTML string for buttons
 */
export const getReceiptButtons = () => {
  if (PRINT_MODE === 'pdf') {
    return `
      <button onclick="window.generatePDF ? window.generatePDF() : window.print()" style="padding: 10px 30px; font-size: 14px; cursor: pointer; background-color: #1976d2; color: white; border: none; border-radius: 4px;">
        Save as PDF
      </button>
      <button onclick="window.close()" style="padding: 10px 30px; font-size: 14px; margin-left: 10px; cursor: pointer; border-radius: 4px;">
        Close
      </button>
    `;
  }
  return `
    <button onclick="window.print()" style="padding: 10px 30px; font-size: 14px; cursor: pointer;">Print</button>
    <button onclick="window.close()" style="padding: 10px 30px; font-size: 14px; margin-left: 10px; cursor: pointer;">Close</button>
  `;
};

/**
 * Gets the current print mode
 * @returns {string} 'pdf' or 'print'
 */
export const getPrintMode = () => PRINT_MODE;

/**
 * Injects PDF generation script into receipt HTML
 * This allows the receipt window to generate its own PDF
 * @param {string} html - Original HTML
 * @param {string} filename - Filename for PDF
 * @returns {string} Modified HTML with PDF generation capability
 */
export const injectPDFScript = (html, filename = 'receipt') => {
  if (PRINT_MODE !== 'pdf') return html;

  // Add script before closing body tag
  const pdfScript = `
    <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>
    <script>
      window.generatePDF = async function() {
        const { jsPDF } = window.jspdf;

        // Hide buttons during capture
        const noPrint = document.querySelector('.no-print');
        if (noPrint) noPrint.style.display = 'none';

        try {
          const canvas = await html2canvas(document.body, {
            scale: 2,
            useCORS: true,
            backgroundColor: '#ffffff',
            width: 300,
            windowWidth: 300,
          });

          const imgWidth = 80;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;

          const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [imgWidth, imgHeight + 10]
          });

          const imgData = canvas.toDataURL('image/png');
          pdf.addImage(imgData, 'PNG', 0, 5, imgWidth, imgHeight);

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
          pdf.save('${filename}_' + timestamp + '.pdf');
        } catch (e) {
          console.error('PDF generation failed:', e);
          window.print();
        } finally {
          if (noPrint) noPrint.style.display = 'block';
        }
      };
    </script>
  `;

  // Replace print button with PDF button
  let modifiedHtml = html.replace(
    /onclick="window\.print\(\)"/g,
    'onclick="window.generatePDF ? window.generatePDF() : window.print()"'
  );

  // Change button text from "Print" to "Save as PDF"
  modifiedHtml = modifiedHtml.replace(
    />Print<\/button>/g,
    ' style="background-color: #1976d2; color: white; border: none; border-radius: 4px;">Save as PDF</button>'
  );

  // Insert script before </body>
  modifiedHtml = modifiedHtml.replace('</body>', pdfScript + '</body>');

  return modifiedHtml;
};

export default {
  openReceiptWindow,
  openReceiptAsPDF,
  getReceiptButtons,
  getPrintMode,
  injectPDFScript,
};
