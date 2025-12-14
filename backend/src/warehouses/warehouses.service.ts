import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { UpdateWarehouseDto } from './dto/update-warehouse.dto';

@Injectable()
export class WarehousesService {
    constructor(private readonly supabase: SupabaseService) { }

    async create(dto: CreateWarehouseDto) {
        const { data, error } = await this.supabase
            .getClient()
            .from('warehouse')
            .insert({
                name: dto.name,
                code: dto.code,
                address: dto.address,
                store_id: dto.storeId ? BigInt(dto.storeId) : null,
            })
            .select()
            .single();

        if (error) throw error;
        return data;
    }

    async findAll() {
        const { data, error } = await this.supabase
            .getClient()
            .from('warehouse')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('warehouse')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }
        return data;
    }

    async update(id: string, dto: UpdateWarehouseDto) {
        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.code !== undefined) updateData.code = dto.code;
        if (dto.address !== undefined) updateData.address = dto.address;
        if (dto.storeId !== undefined) updateData.store_id = dto.storeId ? BigInt(dto.storeId) : null;

        const { data, error } = await this.supabase
            .getClient()
            .from('warehouse')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }
        return data;
    }

    async remove(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('warehouse')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('WAREHOUSE_NOT_FOUND');
        }
        return data;
    }
}
