import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto';

export interface AppSettings {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyEmail: string;
    taxNumber: string;
    taxRate: number;        // VAT percentage
    invoicePrefix: string;
    lowStockThreshold: number;
    autoPrintInvoice: boolean;
    currency: string;
    logo: string;
}

const DEFAULT_SETTINGS: AppSettings = {
    companyName: 'Công ty TNHH VPP Mixu',
    companyAddress: '',
    companyPhone: '',
    companyEmail: '',
    taxNumber: '',
    taxRate: 10,
    invoicePrefix: 'HD',
    lowStockThreshold: 10,
    autoPrintInvoice: false,
    currency: 'VND',
    logo: '',
};

@Injectable()
export class SettingsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Get application settings from first Store record
     */
    async getSettings(): Promise<AppSettings> {
        // Use first store's settings as app-wide settings
        const store = await this.prisma.store.findFirst({
            orderBy: { id: 'asc' },
        });

        if (!store || !store.settings) {
            return DEFAULT_SETTINGS;
        }

        const settings = store.settings as Record<string, any>;
        return {
            companyName: settings.companyName ?? store.name ?? DEFAULT_SETTINGS.companyName,
            companyAddress: settings.companyAddress ?? store.address ?? DEFAULT_SETTINGS.companyAddress,
            companyPhone: settings.companyPhone ?? store.phone ?? DEFAULT_SETTINGS.companyPhone,
            companyEmail: settings.companyEmail ?? store.email ?? DEFAULT_SETTINGS.companyEmail,
            taxNumber: settings.taxNumber ?? store.taxNumber ?? DEFAULT_SETTINGS.taxNumber,
            taxRate: settings.taxRate ?? DEFAULT_SETTINGS.taxRate,
            invoicePrefix: settings.invoicePrefix ?? DEFAULT_SETTINGS.invoicePrefix,
            lowStockThreshold: settings.lowStockThreshold ?? DEFAULT_SETTINGS.lowStockThreshold,
            autoPrintInvoice: settings.autoPrintInvoice ?? DEFAULT_SETTINGS.autoPrintInvoice,
            currency: settings.currency ?? DEFAULT_SETTINGS.currency,
            logo: settings.logo ?? DEFAULT_SETTINGS.logo,
        };
    }

    /**
     * Update application settings
     */
    async updateSettings(dto: UpdateSettingsDto): Promise<AppSettings> {
        // Get or create store
        let store = await this.prisma.store.findFirst({
            orderBy: { id: 'asc' },
        });

        if (!store) {
            // Create default store if none exists
            store = await this.prisma.store.create({
                data: {
                    name: dto.companyName || DEFAULT_SETTINGS.companyName,
                    address: dto.companyAddress || '',
                    phone: dto.companyPhone || '',
                    email: dto.companyEmail || '',
                    taxNumber: dto.taxNumber || '',
                    settings: { ...DEFAULT_SETTINGS, ...dto },
                },
            });
        } else {
            // Merge settings
            const existingSettings = (store.settings as Record<string, any>) || {};
            const newSettings = { ...existingSettings };

            // Update only provided fields
            if (dto.companyName !== undefined) newSettings.companyName = dto.companyName;
            if (dto.companyAddress !== undefined) newSettings.companyAddress = dto.companyAddress;
            if (dto.companyPhone !== undefined) newSettings.companyPhone = dto.companyPhone;
            if (dto.companyEmail !== undefined) newSettings.companyEmail = dto.companyEmail;
            if (dto.taxNumber !== undefined) newSettings.taxNumber = dto.taxNumber;
            if (dto.taxRate !== undefined) newSettings.taxRate = dto.taxRate;
            if (dto.invoicePrefix !== undefined) newSettings.invoicePrefix = dto.invoicePrefix;
            if (dto.lowStockThreshold !== undefined) newSettings.lowStockThreshold = dto.lowStockThreshold;
            if (dto.autoPrintInvoice !== undefined) newSettings.autoPrintInvoice = dto.autoPrintInvoice;
            if (dto.currency !== undefined) newSettings.currency = dto.currency;
            if (dto.logo !== undefined) newSettings.logo = dto.logo;

            store = await this.prisma.store.update({
                where: { id: store.id },
                data: {
                    name: dto.companyName ?? store.name,
                    address: dto.companyAddress ?? store.address,
                    phone: dto.companyPhone ?? store.phone,
                    email: dto.companyEmail ?? store.email,
                    taxNumber: dto.taxNumber ?? store.taxNumber,
                    settings: newSettings,
                },
            });
        }

        return this.getSettings();
    }
}
