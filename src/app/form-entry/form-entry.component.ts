import { Component, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    FormArray,
} from '@angular/forms';
import { jsPDF } from 'jspdf';

@Component({
    selector: 'app-form-entry',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './form-entry.component.html',
    styleUrl: './form-entry.component.css',
})
export class FormEntryComponent {
    form: FormGroup;
    isGenerating = false;
    folioNumero = 1532;

    constructor(
        private fb: FormBuilder,
        private ngZone: NgZone,
        private cdr: ChangeDetectorRef
    ) {
        this.form = this.fb.group({
            senor: [''],
            rutCliente: [''],
            fechaDocumento: [''],
            comentario: [''],
            lineItems: this.fb.array([]),
        });

        this.addLineItem();
    }

    get lineItems(): FormArray {
        return this.form.get('lineItems') as FormArray;
    }

    addLineItem(): void {
        this.lineItems.push(
            this.fb.group({
                codigo: [''],
                detalle: [''],
                cantidad: [null],
                precioUnitario: [null],
                recDesc: [0],
            })
        );
    }

    removeLineItem(index: number): void {
        if (this.lineItems.length > 1) {
            this.lineItems.removeAt(index);
        }
    }

    getLineTotal(index: number): number {
        const item = this.lineItems.at(index);
        const cant = item.get('cantidad')?.value || 0;
        const precio = item.get('precioUnitario')?.value || 0;
        const desc = item.get('recDesc')?.value || 0;
        return cant * precio - desc;
    }

    getTotal(): number {
        let total = 0;
        for (let i = 0; i < this.lineItems.length; i++) {
            total += this.getLineTotal(i);
        }
        return total;
    }

    formatCurrency(value: number): string {
        return (
            '$ ' +
            value.toLocaleString('es-CL', {
                minimumFractionDigits: 0,
                maximumFractionDigits: 0,
            })
        );
    }

    emitirComprobante(): void {
        this.isGenerating = true;
        this.cdr.detectChanges();

        const storedFolio = localStorage.getItem('folioNumero');
        this.folioNumero = storedFolio ? parseInt(storedFolio, 10) : 1532;
        localStorage.setItem('folioNumero', String(this.folioNumero + 1));

        this.ngZone.runOutsideAngular(() => {
            setTimeout(() => this.generateVectorPdf(), 100);
        });
    }

    private async generateVectorPdf(): Promise<void> {
        try {
            const formVal = this.form.value;
            const lineItems = formVal.lineItems || [];

            const pdf = new jsPDF('p', 'mm', 'letter');
            const pageW = pdf.internal.pageSize.getWidth();   // ~216mm
            const margin = 14;
            const contentW = pageW - margin * 2;
            let y = margin;

            // ─────────────────────────────────────────────────────
            // HEADER
            // ─────────────────────────────────────────────────────
            const headerY = y;

            // Left: Company info
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(13);
            pdf.setTextColor(30, 41, 59);
            pdf.text('PRO HOME SPA', margin, y + 5);

            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(7.5);
            pdf.setTextColor(71, 85, 105);
            pdf.text('ACTIVIDADES INMOBILIARIAS REALIZADAS A CAMBIO', margin, y + 10);
            pdf.text('DE UNA RETRIBUCION O POR', margin, y + 13.5);
            pdf.text('Avenida Balmaceda 2455 oficina 1209, ANTOFAGASTA', margin, y + 17.5);
            pdf.text('Teléfono: 56931319706', margin, y + 21);
            pdf.text('Email: contacto@pro-home.cl', margin, y + 24.5);

            // Right: RUT box
            const boxW = 62;
            const boxH = 26;
            const boxX = pageW - margin - boxW;
            const boxY = headerY;

            pdf.setDrawColor(220, 38, 38);
            pdf.setLineWidth(0.8);
            pdf.rect(boxX, boxY, boxW, boxH);

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(11);
            pdf.setTextColor(220, 38, 38);
            pdf.text('R.U.T: 77.132.948-9', boxX + boxW / 2, boxY + 7, { align: 'center' });

            pdf.setFontSize(9);
            pdf.text('COMPROBANTE DE PAGO', boxX + boxW / 2, boxY + 13, { align: 'center' });

            pdf.setFontSize(10);
            pdf.text(`Folio N° ${this.folioNumero}`, boxX + boxW / 2, boxY + 19, { align: 'center' });

            // S.I.I. label under box
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(8);
            pdf.setTextColor(71, 85, 105);
            pdf.text('S.I.I. - Antofagasta', boxX + boxW / 2, boxY + boxH + 5, { align: 'center' });

            y = headerY + boxH + 12;

            // Separator line
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(margin, y, pageW - margin, y);
            y += 6;

            // ─────────────────────────────────────────────────────
            // CUSTOMER INFO
            // ─────────────────────────────────────────────────────
            const colW = contentW / 3;

            // Labels
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(100, 116, 139);
            pdf.text('SEÑOR (ES)', margin, y);
            pdf.text('R.U.T', margin + colW, y);
            pdf.text('FECHA DOCUMENTO', margin + colW * 2, y);

            y += 5;

            // Values
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(10);
            pdf.setTextColor(30, 41, 59);
            pdf.text(formVal.senor || '', margin, y);
            pdf.text(formVal.rutCliente || '', margin + colW, y);
            const dateFormatted = this.formatDateForPdf(formVal.fechaDocumento || '');
            pdf.text(dateFormatted, margin + colW * 2, y);

            y += 8;

            // Separator
            pdf.setDrawColor(226, 232, 240);
            pdf.line(margin, y, pageW - margin, y);
            y += 6;

            // ─────────────────────────────────────────────────────
            // LINE ITEMS TABLE
            // ─────────────────────────────────────────────────────
            // Column layout (mm from left margin)
            const cols = [
                { label: 'Item', x: 0, w: 12, align: 'center' as const },
                { label: 'Código', x: 12, w: 22, align: 'left' as const },
                { label: 'Detalle', x: 34, w: 70, align: 'left' as const },
                { label: 'Cant.', x: 104, w: 18, align: 'right' as const },
                { label: 'P. Unitario', x: 122, w: 24, align: 'right' as const },
                { label: 'Rec/Desc', x: 146, w: 20, align: 'right' as const },
                { label: 'Total', x: 166, w: 22, align: 'right' as const },
            ];

            const tableX = margin;
            const rowH = 7;

            // Table header background
            pdf.setFillColor(241, 245, 249);
            pdf.rect(tableX, y, contentW, rowH, 'F');

            // Header text
            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(7);
            pdf.setTextColor(71, 85, 105);

            for (const col of cols) {
                const textX = col.align === 'right'
                    ? tableX + col.x + col.w - 2
                    : col.align === 'center'
                        ? tableX + col.x + col.w / 2
                        : tableX + col.x + 2;
                pdf.text(col.label.toUpperCase(), textX, y + 4.5, { align: col.align });
            }

            // Header bottom line
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(tableX, y + rowH, tableX + contentW, y + rowH);
            y += rowH;

            // Table rows
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(9);
            pdf.setTextColor(30, 41, 59);

            let grandTotal = 0;
            for (let i = 0; i < lineItems.length; i++) {
                const item = lineItems[i];
                const cant = item.cantidad || 0;
                const precio = item.precioUnitario || 0;
                const desc = item.recDesc || 0;
                const lineTotal = cant * precio - desc;
                grandTotal += lineTotal;

                const rowY = y + 4.5;

                // Item number
                pdf.text(String(i + 1), tableX + cols[0].x + cols[0].w / 2, rowY, { align: 'center' });

                // Código
                pdf.text(item.codigo || '', tableX + cols[1].x + 2, rowY);

                // Detalle (truncate if too long)
                const detalle = item.detalle || '';
                const maxDetalleW = cols[2].w - 4;
                const truncated = pdf.getStringUnitWidth(detalle) * 9 / pdf.internal.scaleFactor > maxDetalleW
                    ? detalle.substring(0, 40) + '...'
                    : detalle;
                pdf.text(truncated, tableX + cols[2].x + 2, rowY);

                // Cant
                if (cant) pdf.text(String(cant), tableX + cols[3].x + cols[3].w - 2, rowY, { align: 'right' });

                // Precio
                if (precio) pdf.text(this.formatCurrency(precio), tableX + cols[4].x + cols[4].w - 2, rowY, { align: 'right' });

                // Rec/Desc
                if (desc) pdf.text(this.formatCurrency(desc), tableX + cols[5].x + cols[5].w - 2, rowY, { align: 'right' });

                // Total
                pdf.setFont('helvetica', 'bold');
                pdf.text(this.formatCurrency(lineTotal), tableX + cols[6].x + cols[6].w - 2, rowY, { align: 'right' });
                pdf.setFont('helvetica', 'normal');

                // Row bottom line
                pdf.setDrawColor(241, 245, 249);
                pdf.line(tableX, y + rowH, tableX + contentW, y + rowH);
                y += rowH;
            }

            // Bottom border of table
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.line(tableX, y, tableX + contentW, y);
            y += 10;

            // ─────────────────────────────────────────────────────
            // COMMENT (if any)
            // ─────────────────────────────────────────────────────
            if (formVal.comentario) {
                pdf.setFont('helvetica', 'bold');
                pdf.setFontSize(7);
                pdf.setTextColor(100, 116, 139);
                pdf.text('COMENTARIO', margin, y);
                y += 4;

                pdf.setFont('helvetica', 'normal');
                pdf.setFontSize(9);
                pdf.setTextColor(71, 85, 105);
                const lines = pdf.splitTextToSize(formVal.comentario, contentW * 0.55);
                pdf.text(lines, margin, y);
                y += lines.length * 4 + 4;
            }

            // ─────────────────────────────────────────────────────
            // TOTAL
            // ─────────────────────────────────────────────────────
            // Total box on right side
            const totalBoxW = 65;
            const totalBoxX = pageW - margin - totalBoxW;
            const totalBoxY = y - (formVal.comentario ? 0 : 2);

            pdf.setFillColor(241, 245, 249);
            pdf.setDrawColor(226, 232, 240);
            pdf.setLineWidth(0.3);
            pdf.roundedRect(totalBoxX, totalBoxY, totalBoxW, 14, 2, 2, 'FD');

            pdf.setFont('helvetica', 'bold');
            pdf.setFontSize(9);
            pdf.setTextColor(71, 85, 105);
            pdf.text('Total', totalBoxX + 6, totalBoxY + 9);

            pdf.setFontSize(12);
            pdf.setTextColor(30, 41, 59);
            pdf.text(this.formatCurrency(grandTotal), totalBoxX + totalBoxW - 6, totalBoxY + 9, { align: 'right' });

            y = totalBoxY + 18;

            // Total in words
            if (grandTotal > 0) {
                const words = this.numberToWords(grandTotal);
                pdf.setFont('helvetica', 'italic');
                pdf.setFontSize(8);
                pdf.setTextColor(100, 116, 139);
                pdf.text(words, pageW - margin, y, { align: 'right' });
            }

            // ─────────────────────────────────────────────────────
            // SAVE — use standard jsPDF API
            // ─────────────────────────────────────────────────────
            console.log('[PDF] Saving file via jsPDF standard API...');
            await pdf.save(`comprobante-de-pago-${this.folioNumero}.pdf`, { returnPromise: true });
            console.log('[PDF] Save completed.');

        } catch (error) {
            console.error('[PDF] Error generating PDF:', error);
        } finally {
            this.ngZone.run(() => {
                this.isGenerating = false;
                this.cdr.detectChanges();
            });
        }
    }

    private formatDateForPdf(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // --- Number to Spanish words (for Chilean peso amounts) ---
    private numberToWords(n: number): string {
        if (n === 0) return '';

        const unidades = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
        const decenas = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
        const especiales = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISEIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
        const centenas = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

        const convertGroup = (num: number): string => {
            if (num === 0) return '';
            if (num === 100) return 'CIEN';
            let result = '';
            const c = Math.floor(num / 100);
            const remainder = num % 100;
            const d = Math.floor(remainder / 10);
            const u = remainder % 10;
            if (c > 0) result += centenas[c] + ' ';
            if (remainder >= 10 && remainder <= 19) {
                result += especiales[remainder - 10];
            } else if (remainder === 21) {
                result += 'VEINTIUN';
            } else if (remainder >= 22 && remainder <= 29) {
                result += 'VEINTI' + unidades[u];
            } else {
                if (d > 0) { result += decenas[d]; if (u > 0) result += ' Y '; }
                if (u > 0) result += unidades[u];
            }
            return result.trim();
        };

        if (n < 0) return 'MENOS ' + this.numberToWords(Math.abs(n));

        let words = '';
        const millones = Math.floor(n / 1000000);
        const miles = Math.floor((n % 1000000) / 1000);
        const resto = n % 1000;

        if (millones === 1) words += 'UN MILLON ';
        else if (millones > 1) words += convertGroup(millones) + ' MILLONES ';
        if (miles === 1) words += 'MIL ';
        else if (miles > 1) words += convertGroup(miles) + ' MIL ';
        if (resto > 0) words += convertGroup(resto);

        return (words.trim() + ' PESOS').trim();
    }
}
