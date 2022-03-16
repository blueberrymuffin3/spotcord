import dotenv from 'dotenv';
dotenv.config()

import './i18n.js'

import { Client, Intents } from 'discord.js';
import { readdirSync } from 'node:fs';
import { isProd } from './util.js';
import { MusicSubscription } from './music/subscription.js';
const { DISCORD_TOKEN } = process.env as Record<string, string>;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });

let commands: Record<string, any> = {};
let interactions: Record<string, any> = {};
const commandFiles = readdirSync('./dist/commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
	const command = await import(`./commands/${file}`);
	// Set a new item in the Collection
	// With the key as the command name and the value as the exported module
	commands[command.data.name] = command;
	if (command.interactionIds !== undefined) {
		for (let customId of command.interactionIds) {
			interactions[customId] = command
		}
	}
}

client.once('ready', () => {
	console.log('Ready!');
	client.user!.setPresence({
		status: 'online',
		activities: [{
			type: 'LISTENING',
			name: isProd() ? 'Spotify' : 'Spotify (dev)'
		}]
	})
});

client.on('interactionCreate', async interaction => {
	if (interaction.isCommand()) {
		const command = commands[interaction.commandName];

		if (!command) return;

		try {
			await command.execute(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	} else if (interaction.isSelectMenu()) {
		const command = interactions[interaction.customId];

		if (!command) return;

		try {
			await command.interact(interaction);
		} catch (error) {
			console.error(error);
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
			} else {
				await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
			}
		}
	}
});

const shutdown = async (signal: string) => {
	console.log(`Shutting down due to ${signal}...`)
	await MusicSubscription.closeAllSubscriptions()
	client.destroy();
	console.log(`Done shutting down`)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
client.on('error', console.warn);

// await setupSpotifyClient()
await client.login(DISCORD_TOKEN);
