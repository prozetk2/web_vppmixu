import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SuppliersService {
    constructor(private readonly supabase: SupabaseService) { }

    async create(dto: CreateSupplierDto) {
        const { data, error } = await this.supabase
            .getClient()
            .from('supplier')
            .insert({
                name: dto.name,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async findAll() {
        const { data, error } = await this.supabase
            .getClient()
            .from('supplier')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('supplier')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException('SUPPLIER_NOT_FOUND');
        }
        return data;
    }

    async update(id: string, dto: UpdateSupplierDto) {
        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.email !== undefined) updateData.email = dto.email;
        if (dto.phone !== undefined) updateData.phone = dto.phone;
        if (dto.address !== undefined) updateData.address = dto.address;

        const { data, error } = await this.supabase
            .getClient()
            .from('supplier')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('SUPPLIER_NOT_FOUND');
        }
        return data;
    }

    async remove(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('supplier')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('SUPPLIER_NOT_FOUND');
        }
        return data;
    }
}
