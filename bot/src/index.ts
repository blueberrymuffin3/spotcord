import './i18n.js'

import { Client, Intents } from 'discord.js';
import { isProd } from './util.js';
import { MusicSubscription } from './music/subscription.js';
import { SelectMenuCommands, SlashCommands } from './command-list.js';
import { t } from 'i18next';
import { envVars } from './env-vars.js';
const { DISCORD_TOKEN } = envVars;

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_VOICE_STATES] });

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
		const command = SlashCommands.get(interaction.commandName);

		try {
			await command!.execute(interaction);
		} catch (error) {
			console.error(error);

			const content = { content: t('error.command_generic'), ephemeral: true }
			if (interaction.replied || interaction.deferred) {
				await interaction.followUp(content);
			} else {
				await interaction.reply(content);
			}
		}
	} else if (interaction.isSelectMenu()) {
		const command = SelectMenuCommands.get(interaction.customId);

		try {
			await command!.selectMenuInteract(interaction).catch();
		} catch (error) {
			console.error(error);
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

await client.login(DISCORD_TOKEN);
