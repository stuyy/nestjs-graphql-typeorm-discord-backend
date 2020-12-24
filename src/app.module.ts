import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { entities } from './typeorm';
import { PassportModule } from '@nestjs/passport';
import { GraphQLModule } from '@nestjs/graphql';
import { join } from 'path';
import { UserResolver } from './graphql/resolvers/User.resolver';

let envFilePath = '.env.development';

console.log(`Running in ${process.env.ENVIRONMENT}`);
if (process.env.ENVIRONMENT === 'PRODUCTION') {
  envFilePath = '.env.production';
} else if (process.env.ENVIRONMENT === 'TEST') {
  envFilePath = '.env.testing';
}

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath }),
    AuthModule,
    PassportModule.register({ session: true }),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.MYSQL_DB_HOST,
      port: Number.parseInt(process.env.MYSQL_DB_PORT),
      username: process.env.MYSQL_DB_USER,
      password: process.env.MYSQL_DB_PASS,
      database: process.env.MYSQL_DB_NAME,
      entities,
      synchronize: true,
    }),
    GraphQLModule.forRoot({
      typePaths: ['./**/*.graphql'],
      definitions: { path: join(process.cwd(), 'src', 'graphql', 'index.ts') },
      useGlobalPrefix: true,
      cors: { origin: 'http://localhost:3000' },
    }),
  ],
  controllers: [],
  providers: [UserResolver],
})
export class AppModule {}
