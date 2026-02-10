import { Injectable, BadRequestException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class UploadService {
    constructor(private readonly supabaseService: SupabaseService) { }

    async uploadProductImage(file: Express.Multer.File) {
        if (!file) {
            throw new BadRequestException('Không tìm thấy file');
        }

        const supabase = this.supabaseService.getClient();
        const fileExt = file.originalname.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const filePath = `products/${fileName}`;

        // Upload lên bucket 'product-images'
        const { data, error } = await supabase.storage
            .from('product-images')
            .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                upsert: false,
            });

        if (error) {
            throw new BadRequestException(`Lỗi upload: ${error.message}`);
        }

        // Lấy URL công khai (với giả định bucket của bạn là Public)
        const { data: { publicUrl } } = supabase.storage
            .from('product-images')
            .getPublicUrl(filePath);

        return { url: publicUrl };
    }
}