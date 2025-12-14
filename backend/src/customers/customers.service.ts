import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
    constructor(private readonly supabase: SupabaseService) { }

    async create(dto: CreateCustomerDto) {
        const { data, error } = await this.supabase
            .getClient()
            .from('customer')
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
            .from('customer')
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        return data || [];
    }

    async findOne(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('customer')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !data) {
            throw new NotFoundException('CUSTOMER_NOT_FOUND');
        }
        return data;
    }

    async update(id: string, dto: UpdateCustomerDto) {
        const updateData: any = {};
        if (dto.name !== undefined) updateData.name = dto.name;
        if (dto.email !== undefined) updateData.email = dto.email;
        if (dto.phone !== undefined) updateData.phone = dto.phone;
        if (dto.address !== undefined) updateData.address = dto.address;

        const { data, error } = await this.supabase
            .getClient()
            .from('customer')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('CUSTOMER_NOT_FOUND');
        }
        return data;
    }

    async remove(id: string) {
        const { data, error } = await this.supabase
            .getClient()
            .from('customer')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error || !data) {
            throw new NotFoundException('CUSTOMER_NOT_FOUND');
        }
        return data;
    }
}
