import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface InvoiceLineItem {
    codigo: string;
    detalle: string;
    cantidad: number;
    precioUnitario: number;
    recDesc: number;
}

export interface InvoiceData {
    senor: string;
    rutCliente: string;
    fechaDocumento: string;
    comentario: string;
    lineItems: InvoiceLineItem[];
    folioNumero: number;
}

@Component({
    selector: 'app-invoice',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './invoice.component.html',
    styleUrl: './invoice.component.css',
})
export class InvoiceComponent {
    @Input() data: InvoiceData | null = null;

    get lineItems(): InvoiceLineItem[] {
        return this.data?.lineItems ?? [];
    }

    get folioNumero(): number {
        return this.data?.folioNumero ?? 0;
    }

    get total(): number {
        return this.lineItems.reduce((sum, item) => {
            return sum + (item.cantidad || 0) * (item.precioUnitario || 0) - (item.recDesc || 0);
        }, 0);
    }

    get totalEnPalabras(): string {
        return this.total > 0 ? this.numberToWords(this.total) : '';
    }

    getLineTotal(item: InvoiceLineItem): number {
        return (item.cantidad || 0) * (item.precioUnitario || 0) - (item.recDesc || 0);
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

    formatDate(dateStr: string): string {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T12:00:00');
        return d.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    // --- Number to Spanish words (for Chilean peso amounts) ---
    numberToWords(n: number): string {
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
