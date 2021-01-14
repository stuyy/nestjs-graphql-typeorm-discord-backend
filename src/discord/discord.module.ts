import { HttpModule, Module } from '@nestjs/common';
import { DiscordService } from './discord.service';

@Module({
  imports: [HttpModule],
  providers: [
    {
      provide: 'DISCORD_SERVICE',
      useClass: DiscordService,
    },
  ],
  exports: [
    {
      provide: 'DISCORD_SERVICE',
      useClass: DiscordService,
    },
  ],
})
export class DiscordModule {}
