import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction } from 'discord.js';
import { Track } from '../music/track.js';
import * as spotify from '../spotify-api.js';
import { Command } from '../command.js';


export default class PlayCommand extends Command {
    protected configure(builder: SlashCommandBuilder) {
        builder.addStringOption(option => option
            .setName('query')
            .setDescription(t('command.play.option.query.description'))
            .setRequired(true)
        )
    }

    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction, true)

        let query = interaction.options.getString("query") as string
        let results = await spotify.search(query, ['track'], 1)

        if (results.tracks?.items.length == 0) {
            interaction.reply({
                content: t('error.query_no_results_for', { query }),
                ephemeral: true
            })
        } else {
            const track = await Track.from(results.tracks!.items[0].id, interaction.user);
            subscription.enqueue(track);
            interaction.reply(t('generic.song_added_to_queue', track.info))
        }
    }
}
