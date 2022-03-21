import { t } from 'i18next';
import { CommandInteraction } from 'discord.js';
import { Command } from '../command.js';

export default class NowPlayingCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

        if (subscription.nowPlaying) {
            await interaction.reply({
                content: t('command.np.response.success', subscription.nowPlaying.info),
                embeds: [await subscription.nowPlaying.generateEmbed()]
            })
        } else {
            await interaction.reply(t('command.np.response.nothing'))
        }
    }
}
