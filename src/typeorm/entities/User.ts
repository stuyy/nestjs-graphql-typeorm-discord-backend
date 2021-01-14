import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'users' })
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'discord_id', unique: true })
  discordId: string;

  @Column()
  username: string;

  @Column()
  discriminator: string;

  @Column({ nullable: true })
  avatar: string;

  @Column({ name: 'access_token' })
  accessToken: string;

  @Column({ name: 'refresh_token' })
  refreshToken: string;
}
