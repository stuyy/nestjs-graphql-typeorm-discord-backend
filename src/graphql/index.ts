
/** ------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */
export interface IQuery {
    getUser(): User | Promise<User>;
}

export interface User {
    discordId: string;
    username: string;
    avatar?: string;
    discriminator: string;
}
