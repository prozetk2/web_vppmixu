import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { StoresService } from './stores.service';

@UseGuards(JwtAuthGuard)
@Controller('stores')
export class StoresController {
    constructor(private readonly storesService: StoresService) { }

    @Get()
    findAll() {
        return this.storesService.findAll();
    }
}
