import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { AuthService } from './auth.service';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(AuthService);

  await authService.seedDefaultAdmin();
  await app.close();
  // eslint-disable-next-line no-console
  console.log('Seeded default admin (admin@example.com / admin123)');
}

seed().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
