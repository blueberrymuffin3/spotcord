import { t } from 'i18next';
import { CommandInteraction } from 'discord.js';
import { Command } from '../command.js';

export default class ClearCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

        if (subscription.queue.length == 0) {
            await interaction.reply(t('command.clear.response.empty'))
        } else {
            subscription.queue = []

            await interaction.reply(t('command.clear.response.success'))
        }
    }
}
