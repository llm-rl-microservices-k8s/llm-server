import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';
import * as cors from 'cors';


async function bootstrap() {
dotenv.config();
const app = await NestFactory.create(AppModule);
app.use(cors());
const port = Number(process.env.PORT || 3001);
await app.listen(port);
// eslint-disable-next-line no-console
console.log(`LLM API (Nest) listening on http://localhost:${port}`);
}
bootstrap();