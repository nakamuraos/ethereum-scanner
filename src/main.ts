import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import config from './config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(config.server.port, config.server.host);
  console.info(
    `Server running on http://${config.server.host}:${config.server.port}`,
  );
}

void bootstrap();
