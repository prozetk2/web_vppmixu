import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto';

@UseGuards(JwtAuthGuard)
@Controller('settings')
export class SettingsController {
    constructor(private readonly settingsService: SettingsService) { }

    /**
     * GET /settings
     * Get application settings
     */
    @Get()
    getSettings() {
        return this.settingsService.getSettings();
    }

    /**
     * PUT /settings
     * Update application settings
     */
    @Put()
    updateSettings(@Body() dto: UpdateSettingsDto) {
        return this.settingsService.updateSettings(dto);
    }
}
