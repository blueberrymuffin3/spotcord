import './i18n.js'

import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';
import { isProd } from './util.js';
import { envVars } from './env-vars.js';
import { SlashCommands } from './command-list.js';
const { DISCORD_TOKEN, DISCORD_CLIENT_ID, DISCORD_GUILD_ID } = envVars;

const body = []
for (const command of SlashCommands.values()) {
    body.push(command.data)
}

const rest = new REST({ version: '9' }).setToken(DISCORD_TOKEN);

console.log(`Started refreshing application (/) commands. (global: ${isProd()})`);

if (isProd()) {
    await rest.put(
        Routes.applicationCommands(DISCORD_CLIENT_ID),
        { body },
    );
} else {
    await rest.put(
        Routes.applicationGuildCommands(DISCORD_CLIENT_ID, DISCORD_GUILD_ID),
        { body },
    );
}

console.log('Successfully reloaded application (/) commands.');
