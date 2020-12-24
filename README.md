# Nest.JS API w/ TypeORM, GraphQL, Discord OAuth2

This is a base template that we will use for the Discord Dashboard Tutorial.

# Installation & Setup

1. Clone this repository
2. Run `npm i` or `yarn install` to install all dependencies
3. Install MySQL using Docker or natively on your computer
4. Configure your environment variables
5. Run `yarn start:dev`

# Project Details

This project uses TypeORM & MySQL. You will need to install MySQL on your computer or use Docker. You can also easily swap the Database to PostgreSQL or any supported database driver from TypeORM.

I've left a basic `.env` file in this repository with all of the environment variables used. They're pretty self explanatory but I will walk you through each one:

**MySQL Environment Variables**

These are all of the environment variables you'll need to connect to your MySQL database.

```
MYSQL_DB_HOST=
MYSQL_DB_PORT=
MYSQL_DB_USER=
MYSQL_DB_PASS=
MYSQL_DB_NAME=
```

`MYSQL_DB_HOST` is the hostname of the server of MySQL. Typically this will be `localhost` unless you connect to a remote database.

`MYSQL_DB_PORT` is the Port that the MySQL server listens for TCP connections on.

`MYSQL_DB_USER` is the username to use to connect to the MySQL server (if you have authentication enabled)

`MYSQL_DB_PASS` is the password for the MySQL server

`MYSQL_DB_NAME` is the name of the database. You will need to create it since TypeORM will not create it for you.

**Server Environment Variables**

`PORT` is the port the Nest.JS Server will listen to requests on.

**Discord OAuth2 Environment Variables**

`DISCORD_CLIENT_ID` The Client ID of the Discord Application

`DISCORD_CLIENT_SECRET` The client secret of the Discord Application (THIS IS SENSITIVE INFO)

`DISCORD_CALLBACK_URL` The callback URL upon successful authorization from Discord.

_You'll need to go over to https://discord.com/developers/applications to create an application and get the credentials_

# Handling CORS

Read about CORS [here](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

By default, React applications generated with Create React App run on Port 3000. So in this application, we have handled CORS to allow origins from localhost:3000. If you have your app running on a different Port, you'll need to change the cors configuration inside `src/main.ts` and `src/app.module.ts`

We also have `credentials: true` set to ensure we are handling cookies/credentials sent from the client.

```TS
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 3003;
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  await app.listen(PORT, () => console.log(`Running on Port ${PORT}`));
}
bootstrap();
```

Read more about [Access-Control-Allow-Credentials](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Access-Control-Allow-Credentials)

_Note: When using GraphQL Playground, make sure you click on "Settings" and set request.credentials to include_

# Getting Discord Credentials

Visit https://discord.com/developers/applications and click "Create Application"

Give your application a name. Afterwards, you will see "CLIENT ID" and "CLIENT SECRET" on the page. Copy both of them and save it to the .env file in the correponding environment variable.

```
DISCORD_CLIENT_ID=123
DISCORD_CLIENT_SECRET=1234567891013324
```

You will need to go to the "OAuth2" tab and then add a redirect URI. A Redirect URI is for the OAuth2 Provider to call the endpoint with a `code` upon successful authorization. The `code` is used by your authentication method (in our case it would be Passport.js), to exchange it with the provider (Discord) for a pair of access & refresh tokens, user details, or anything that we are given based on `scopes` we provide.

In this project, in `src/auth/controllers/auth/auth.controller.ts`, we have created a route to handle the redirect URI.

This route is `/api/auth/redirect`, the full path is `http://{hostname}/api/auth/redirect`

```TS
@Get('redirect')
@UseGuards(DiscordAuthGuard)
redirect(@Res() res: Response) {
  res.send(200);
}
```

Make sure you add the correct redirect URI on Discord's OAuth2 Tab:

![img](https://i.imgur.com/d5GXJ5r.png)

If you add the wrong redirect URI, you will see an "invalid redirect uri" error.

# Authentication with Passport

## DiscordStrategy

In our `src/auth/utils/DiscordStrategy.ts` file, we have created the `DiscordStrategy` class. This class extends `PassportStrategy`. We pass in `Strategy`, which is imported from `passport-discord` so that Nest knows what provider we're working with.

```TS
import { Profile, Strategy } from 'passport-discord';
import { PassportStrategy } from '@nestjs/passport';
import { Inject, Injectable } from '@nestjs/common';
import { AuthenticationProvider } from '../services/auth/auth';

@Injectable()
export class DiscordStrategy extends PassportStrategy(Strategy) {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: AuthenticationProvider,
  ) {
    super({
      clientID: process.env.DISCORD_CLIENT_ID,
      clientSecret: process.env.DISCORD_CLIENT_SECRET,
      callbackURL: process.env.DISCORD_CALLBACK_URL,
      scope: ['identify', 'guilds'],
    });
  }

  async validate(accessToken: string, refreshToken: string, profile: Profile) {
    const { username, discriminator, id: discordId, avatar } = profile;
    const details = { username, discriminator, discordId, avatar };
    return this.authService.validateUser(details);
  }
}
```

We only have the `scope` set to provide the user's details and their guilds, if you want their email, you'll need to add the `email` scope in the array.

If you want more scopes, you can visit the OAuth2 tab in the application portal on Discord. Here's a quick screenshot of all current scopes as of the time writing this, 12/24/2020

![img](https://i.imgur.com/ZsmZ3Iz.png)

Our `DiscordStrategy` is a provider that will be used by Nest. We invoke the strategy by using NestJS' `AuthGuards`.

## DiscordAuthGuard

In `src/auth/utils/Guards.ts` we have:

```TS
@Injectable()
export class DiscordAuthGuard extends AuthGuard('discord') {
  async canActivate(context: ExecutionContext) {
    const activate = (await super.canActivate(context)) as boolean;
    const request = context.switchToHttp().getRequest();
    await super.logIn(request);
    return activate;
  }
}
```

This Guard extends the `AuthGuard` class, passing in the string `discord` which is the name of our strategy. The nice thing about Passport is we can easily swap strategies. If you want to use Google or Github you would just change the name to `google` or `github`.

We must invoke `DiscordAuthGuard` in our two route handlers in `AuthController`.

```TS
@Get('login')
@UseGuards(DiscordAuthGuard)
login() {
  return;
}

@Get('redirect')
@UseGuards(DiscordAuthGuard)
redirect(@Res() res: Response) {
  res.send(200);
}
```

One is the main route we visit to authenticate users, the other is the redirect route for the provider to send us the `code` as a query parameter.

## Saving User to Database upon Authentication

We save the user to the database upon their first time authenticating with our OAuth2 provider. Remember that the Discord Strategy will be invoked internally. It will call the `validate` function:

```TS
async validate(accessToken: string, refreshToken: string, profile: Profile) {
  const { username, discriminator, id: discordId, avatar } = profile;
  const details = { username, discriminator, discordId, avatar };
  return this.authService.validateUser(details);
}
```

This is where we receive our access token, refresh token, and profile. `Profile` will give us the users details such as username, unique id, avatar, etc.

Our main responsibility in this function is to return a `User` instance. Unlike Passport Local, we don't need to worry about checking if the user's credentials are valid, we always return a user instance because we will either return an existing User, or create a new user and return the new record.

So we extract the fields we need to match our `User` entity from `src/typeorm/entities/User.ts` and we pass it along to `authServie.validateUser()` to handle our logic to keep our application within the Single Responsibility Principle.

## AuthService

The `AuthService` class is a `Provider` which we can inject anywhere in our application so as long we correctly import the module it lives in. We have three methods in this class:

```TS
// src/auth/services/auth.service.ts
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
```

`AuthService` implements the `AuthenticationProvider` interface. There's nothing forcing us to actually follow this pattern, but we _should_ for best practices. Following this practice ensure that we program to the _interface_ rather than _implementation_. Something for you to read up on.

Putting our main focus to `validateUser`, here we reference our `userRepo` field which is a Typeorm repository for our User entity. This allows us to perform basic CRUD operations. We search for a user by `discordId`. If the user is found, we return the user. If not, we call `createUser()`.

`createUser()` will simply create the user, and then save it. Note that our `UserDetails` type was structured to match our Typeorm entity so we can safely pass it in `userRepo.create()` without any type errors.

```TS
type UserDetails = {
  username: string;
  discriminator: string;
  discordId: string;
  avatar: string;
};
```

Once we return from `validateUser`, we are back in `validate` in the `DiscordStrategy` class, which will return the user instance. From here, we're done with the logic of Passport & saving users to the database. However, this application is not complete. We only have users saved to the database, but we have no way of persisting the user's session, so we'll never know if they're logged in or not. In the next section, we will walk through sessions and how we handle them in this project.

In the `app.module.ts` file, make sure you include `PassportModule.register({ session: true })` in the `imports`

```TS
@Module({
  imports: [
    PassportModule.register({ session: true }),
  ],
  controllers: [],
})
export class AppModule {}
```

In the `main.ts` file, make sure you register `passport` middleware. Here we import passport and then initialize it along with session.

```TS
app.use(passport.initialize());
app.use(passport.session());
```

```TS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as passport from 'passport';
import { getRepository } from 'typeorm';
import { TypeORMSession } from './typeorm/entities/Session';
import { TypeormStore } from 'connect-typeorm';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 3003;
  const sessionRepo = getRepository(TypeORMSession);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  app.use(
    session({
      cookie: {
        maxAge: 86400000,
      },
      secret: 'secret',
      resave: false,
      saveUninitialized: false,
      store: new TypeormStore().connect(sessionRepo),
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  await app.listen(PORT, () => console.log(`Running on Port ${PORT}`));
}
bootstrap();
```

# Sessions

A Session is just a unique identifier that maps to a user and the user's "session" data. Because HTTP is stateless, every request made is seen as a new request, providing us zero context from the client that's making those requests. Because many complex applications depend heavily on state, we need a way to keep track of authenticated users.

We use sessions to map a unique identifier, typically a random Base64 string or a UUID, to a user. The session ID is usually generated on the backend, and sent back to the client with specific headers telling the client (Browser, Postman, etc.) to set the cookie with the given value.

From there, our client will usually send the cookie by default. On the server, we can see in the headers that there is a cookie present that corresponds to the Session ID we generated. We know we generated this session ID for user xyz, so we can then perform some business logic for said user.

This is just a simple overview of sessions. It's important to understand, but let's go into our `src/auth/utils/Serializer.ts` file since that's where the Session Serialization & Deserialization takes place.

```TS
// src/auth/utils/Serializer.ts
export type Done = (err: Error, user: User) => void;

@Injectable()
export class SessionSerializer extends PassportSerializer {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: AuthenticationProvider,
  ) {
    super();
  }

  serializeUser(user: User, done: Done) {
    done(null, user);
  }

  async deserializeUser(user: User, done: Done) {
    const userDB = await this.authService.findUser(user.discordId);
    return userDB ? done(null, userDB) : done(null, null);
  }
}
```

Our main focus is the `serializeUser` and `deserializeUser` methods. `serializeUser` tells Passport how to save the session. You pass in whatever field you want into the 2nd parameter of the `done` function. Here, we pass in the user instance. We could get away with just passing in the user's discordId. You should pass in a unique value for the user since whatever you pass in will be the first parameter that `deserializeUser` expects.

Since we pass a `User` type, we can expect the first parameter of `deserializeUser` to also be a `User` type. If we passed in `user.discordId`, then our `deserializeUser` method signature would look like:

```TS
async deserializeUser(discordId: string, done: Done) {
  const userDB = await this.authService.findUser(discordId);
  return userDB ? done(null, userDB) : done(null, null);
}
```

It's important you handle `deserializeUser` properly. Every request made to your API will go through this method. It will search for the correct user by its `discordId` and return it if it was found by calling the `done` function. If not, it returns `null`.

In order for all of this to work, we need to make sure we provide our `SessionSerializer` class in the module. Since `SessionSerializer` lives in `src/auth` module, we can just provide it in the `AuthModule`, which is imported in `AppModule`, making it available in our application.

```TS
// auth.module.ts
@Module({
  controllers: [AuthController],
  providers: [
    DiscordStrategy,
    SessionSerializer,
    {
      provide: 'AUTH_SERVICE',
      useClass: AuthService,
    },
  ],
  imports: [TypeOrmModule.forFeature([User])],
  exports: [
    {
      provide: 'AUTH_SERVICE',
      useClass: AuthService,
    },
  ],
})
export class AuthModule {}
```

You need to also make sure you have installed `express-session` and `@types/express-session` in order for sessions to work. You should also verify you installed `passport`, `passport-discord`, `@nestjs/passport` as well. All of the dependencies for this repository have been installed, however.

In the `app.module.ts` file, make sure you register the PassportModule.

```TS
@Module({
  imports: [
    PassportModule.register({ session: true }),
  ],
  controllers: [],
})
export class AppModule {}
```

Then, make sure you import `express-session` and `passport`. Let's walk through this step by step.

```TS
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as session from 'express-session';
import * as passport from 'passport';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const PORT = process.env.PORT || 3003;
  const sessionRepo = getRepository(TypeORMSession);
  app.setGlobalPrefix('api');
  app.enableCors({
    origin: ['http://localhost:3000'],
    credentials: true,
  });
  app.use(
    session({
      cookie: {
        maxAge: 86400000,
      },
      secret: 'secret',
      resave: false,
      saveUninitialized: false,
      store: new TypeormStore().connect(sessionRepo),
    }),
  );
  app.use(passport.initialize());
  app.use(passport.session());
  await app.listen(PORT, () => console.log(`Running on Port ${PORT}`));
}
bootstrap();
```

Here we register our session middleware. All of the session options are documented on the official docs [here](https://www.npmjs.com/package/express-session#options).

```TS
app.use(
  session({
    cookie: {
      maxAge: 86400000,
    },
    secret: 'secret',
    resave: false,
    saveUninitialized: false,
    store: new TypeormStore().connect(sessionRepo),
  }),
);
```

That's really it. The `store` property is for saving sessions to our Database. This allows us to have a persistent session for each user, in the event of our server crashing or restarting, we will have our session saved in the database which will allow the session to be restored, making it so the user does not need to re-login or re-authenticate.

# More on AuthGuards

## AuthenticatedGuard

```TS
@Injectable()
export class AuthenticatedGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    return req.isAuthenticated();
  }
}
```

This guard is used for protecting our routes at the Controller-level to prevent certain routes from being accessed if the user is not authenticated. We have used this in `src/auth/controllers/auth/auth.controller.ts`

```TS
@Get('status')
@UseGuards(AuthenticatedGuard)
status(@Req() req: Request) {
  return req.user;
}
```

This will protect our `/api/auth/status` route. If the user is authenticated, it will return the user details. If not, it will return a 403 status.

## GraphQLAuthGuard

This is similar to `AuthenticatedGuard` except it's for GraphQL. We can apply this to our resolvers.

```TS
@Injectable()
export class GraphQLAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const ctx = GqlExecutionContext.create(context);
    return ctx.getContext().req.user;
  }
}
```

```TS
@Resolver('User')
@UseGuards(GraphQLAuthGuard)
export class UserResolver {
  constructor(
    @Inject('AUTH_SERVICE')
    private readonly authService: AuthenticationProvider,
  ) {}

  @Query('getUser')
  async getUser(@CurrentUser() user: User): Promise<User> {
    console.log(user);
    return user;
  }
}
```

This will protect our entire resolver. To protect only a single query, you can place the `@UseGuards(GraphQLAuthGuard)` decorator on the corresponding function.
