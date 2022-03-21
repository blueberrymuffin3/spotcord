import { t } from 'i18next';
import { CommandInteraction } from 'discord.js';
import { Command } from '../command.js';

export default class SkipCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

        // Automatically plays the next song
        subscription.audioPlayer.stop()
        await interaction.reply(t('command.skip.response'))
    }
}
