import {
  createParamDecorator,
  ExecutionContext,
  Inject,
  UseGuards,
} from '@nestjs/common';
import {
  GqlExecutionContext,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { GraphQLAuthGuard } from 'src/auth/utils/Guards';
import { AuthenticationProvider } from 'src/auth/services/auth/auth';
import { User } from 'src/typeorm';
import { DiscordService } from 'src/discord/discord.service';
import { DiscordProvider } from 'src/discord/discord';

export const CurrentUser = createParamDecorator(
  (data: unknown, context: ExecutionContext) => {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  },
);

@Resolver('User')
@UseGuards(GraphQLAuthGuard)
export class UserResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: AuthenticationProvider,
    @Inject('DISCORD_SERVICE')
    private readonly discordService: DiscordProvider,
  ) {}

  @Query('getUser')
  async getUser(@CurrentUser() user: User): Promise<User> {
    console.log(user);
    return user;
  }

  @ResolveField()
  async guilds(@Parent() user: User) {
    console.log(user);
    console.log('Guilds Resolve Field');
    return this.discordService.fetchGuilds(user.accessToken);
  }
}
