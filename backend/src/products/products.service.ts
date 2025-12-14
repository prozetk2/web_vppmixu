import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly supabase: SupabaseService) { }

  async create(dto: CreateProductDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('product')
      .insert({
        name: dto.name,
        sku: dto.sku,
        description: dto.description,
        default_price: dto.defaultPrice,
        default_cost: dto.defaultCost,
        category_id: dto.categoryId ? BigInt(dto.categoryId) : null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('product')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('product')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return data;
  }

  async update(id: string, dto: UpdateProductDto) {
    const updateData: any = {};
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.sku !== undefined) updateData.sku = dto.sku;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.defaultPrice !== undefined) updateData.default_price = dto.defaultPrice;
    if (dto.defaultCost !== undefined) updateData.default_cost = dto.defaultCost;
    if (dto.categoryId !== undefined) updateData.category_id = dto.categoryId ? BigInt(dto.categoryId) : null;

    const { data, error } = await this.supabase
      .getClient()
      .from('product')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return data;
  }

  async remove(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('product')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('PRODUCT_NOT_FOUND');
    }
    return data;
  }
}
