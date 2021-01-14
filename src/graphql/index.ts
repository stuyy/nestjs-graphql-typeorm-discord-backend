
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
    guilds?: Guild[];
}

export interface Guild {
    id: string;
    name: string;
    icon?: string;
    description?: string;
    banner?: string;
    owner_id?: string;
    roles?: Role[];
}

export interface Role {
    id: string;
    name: string;
    permissions: string;
    position: number;
    color: number;
}
