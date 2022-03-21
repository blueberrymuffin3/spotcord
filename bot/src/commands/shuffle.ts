import { t } from 'i18next';
import { CommandInteraction } from 'discord.js';
import { Command } from '../command.js';

// Fischer Yates shuffle
function shuffle<T>(array: Array<T>) {
    for (var i = array.length - 1; i > 0; i--) {
        var rand = Math.floor(Math.random() * (i + 1));
        [array[i], array[rand]] = [array[rand], array[i]]
    }
}

export default class ShuffleCommand extends Command {
    protected async _execute(interaction: CommandInteraction<'cached'>) {
        const subscription = this.getSubscription(interaction)

        if (subscription.queue.length == 0) {
            await interaction.reply(t('command.shuffle.response.empty'))
        } else {
            shuffle(subscription.queue)
            await interaction.reply(t('command.shuffle.response.success', { count: subscription.queue.length }))
        }
    }
}
