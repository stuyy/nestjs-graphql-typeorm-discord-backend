import { AxiosResponse } from 'axios';
import { Observable } from 'rxjs';
import { Guild } from 'src/graphql';

export interface DiscordProvider {
  fetchGuilds(accessToken: string): Observable<AxiosResponse<Guild[]>>;
  fetchGuildRoles(guildId: string);
}
