import { t } from "i18next";
import { SlashCommandBuilder } from "@discordjs/builders";
import { CacheType, CommandInteraction, Interaction, SelectMenuInteraction } from "discord.js";
import { getSubscription } from "./music/subscription.js";

class UserNotConnectedException extends Error { }
class BotNotConnectedException extends Error { }

// Classes MUST be exported before trying to import commands
export abstract class Command {
    public readonly data
    public selectMenuCustomIds: Array<string> = []

    public constructor(name: string) {
        const builder = new SlashCommandBuilder()
            .setName(name)
            .setDescription(t(`command.${name}.description`))
        this.configure(builder)
        this.data = builder.toJSON()
    }

    protected getSubscription(interaction: Interaction<'cached'>, createSubscription = false) {
        let subscription = getSubscription(
            interaction.guildId,
            createSubscription,
            interaction.member.voice.channel,
            interaction.channel
        )

        if (!subscription) {
            if (createSubscription) {
                throw new UserNotConnectedException()
            } else {
                throw new BotNotConnectedException()
            }
        } else {
            return subscription
        }
    }

    protected configure(builder: SlashCommandBuilder) { }

    protected abstract _execute(interaction: CommandInteraction<'cached'>): Promise<void>
    public async execute(interaction: CommandInteraction<CacheType>): Promise<void> {
        if (!interaction.inCachedGuild()) {
            throw new Error("Not in a cached guild")
        }

        try {
            await this._execute(interaction)
        } catch (error) {
            if (error instanceof UserNotConnectedException) {
                await interaction.reply({
                    content: t('error.user_not_connected'),
                    ephemeral: true
                });
            } else if (error instanceof BotNotConnectedException) {
                await interaction.reply({
                    content: t('error.bot_not_connected'),
                    ephemeral: true
                });
            } 
        }
    }


    protected async _selectMenuInteract(interaction: SelectMenuInteraction<'cached'>): Promise<void> {
        throw new Error("No select menu handler registered")
    }
    public async selectMenuInteract(interaction: SelectMenuInteraction<CacheType>): Promise<void> {
        if (!interaction.inCachedGuild()) {
            throw new Error("Not in a cached guild")
        }

        await this._selectMenuInteract(interaction)
    }
}
