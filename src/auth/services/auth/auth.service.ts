import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../../typeorm';
import { UserDetails } from '../../../utils/types';
import { AuthenticationProvider } from './auth';

@Injectable()
export class AuthService implements AuthenticationProvider {
  constructor(@InjectRepository(User) private userRepo: Repository<User>) {}

  async validateUser(details: UserDetails) {
    const { discordId } = details;
    const user = await this.userRepo.findOne({ discordId });
    if (user) return user;
    return this.createUser(details);
  }

  createUser(details: UserDetails) {
    const user = this.userRepo.create(details);
    return this.userRepo.save(user);
  }

  findUser(discordId: string): Promise<User | undefined> {
    return this.userRepo.findOne({ discordId });
  }
}
