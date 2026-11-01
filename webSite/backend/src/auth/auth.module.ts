import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Module({
  imports: [
    UsersModule,
    // ВАЖНО: именно registerAsync. Метаданные этого модуля вычисляются при импорте —
    // раньше, чем ConfigModule.forRoot() в app.module.ts успеет прочитать .env,
    // поэтому синхронный register({ secret: process.env.PRIVATE_KEY }) получил бы undefined
    // и любой login падал бы с "secretOrPrivateKey must have a value".
    //
    // global: true — JwtService нужен глобальному AuthGuard, который живёт вне этого модуля.
    JwtModule.registerAsync({
      global: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('PRIVATE_KEY'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN') ?? '7d' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
