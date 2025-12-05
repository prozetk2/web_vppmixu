import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly supabase: SupabaseService) { }

  async create(dto: CreateCategoryDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('category')
      .insert({
        name: dto.name,
        code: dto.code,
        parent_id: dto.parentId || null,
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async findAll() {
    const { data, error } = await this.supabase
      .getClient()
      .from('category')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async findOne(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('category')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return data;
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const { data, error } = await this.supabase
      .getClient()
      .from('category')
      .update({
        name: dto.name,
        code: dto.code,
        parent_id: dto.parentId || null,
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return data;
  }

  async remove(id: string) {
    const { data, error } = await this.supabase
      .getClient()
      .from('category')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      throw new NotFoundException('CATEGORY_NOT_FOUND');
    }
    return data;
  }
}
