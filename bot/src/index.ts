import dotenv from 'dotenv';
import { getVoiceConnections } from '@discordjs/voice'
dotenv.config()

import { Client, Intents } from 'discord.js';
import { readdirSync } from 'node:fs';
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
			name: 'Spotify'
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
		}
	}
});

const shutdown = (signal: string) => {
	console.log(`Shutting down due to ${signal}...`)
	for (let [id, connection] of getVoiceConnections()) {
		console.log(`Closing connection ${id}`)
		connection.destroy();
	}
	client.destroy();
	console.log(`Done shutting down`)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
client.on('error', console.warn);

client.login(DISCORD_TOKEN);
