declare namespace NodeJS {
  export interface ProcessEnv {
    MYSQL_DB_HOST?: string;
    MYSQL_DB_PORT?: string;
    MYSQL_DB_USER?: string;
    MYSQL_DB_PASS?: string;
    MYSQL_DB_NAME?: string;
    PORT?: string;
    ENVIRONMENT: Environment;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    DISCORD_CALLBACK_URL?: string;
    REDIS_URI?: string;
  }
  export type Environment = 'DEVELOPMENT' | 'PRODUCTION' | 'TEST';
}
