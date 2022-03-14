import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, GuildMember, Util } from 'discord.js';
import { Track } from '../music/track.js';
import { getSubscription } from '../music/subscription.js';
import * as spotify from '../spotify-api.js';


export const data = new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a song from spotify')
    .addStringOption(option => option.setName('query')
        .setDescription('Song to play')
        .setRequired(true)
    );

export async function execute(interaction: CommandInteraction) {
    if (!interaction.guildId) return;
    if (!(interaction.member instanceof GuildMember)) return

    let query = interaction.options.getString("query") as string
    let results = await spotify.search(query, ['track'], 1)

    if (results.tracks?.items.length == 0) {
        interaction.reply({
            content: `No results found for query \`${Util.escapeInlineCode(query)}\``,
            ephemeral: true
        })
    } else {
        let subscription = getSubscription(interaction.guildId, true, interaction.member.voice.channel, interaction.channel)
        if (!subscription) {
            await interaction.reply({
                content: 'Join a voice channel and then try that again!',
                ephemeral: true
            });
            return;
        }

        const track = await Track.from(results.tracks!.items[0].id, interaction.user);
        subscription.enqueue(track);
        interaction.reply(`${track.generateInlineName()} added to queue`)
    }
}
