import { t } from 'i18next';
import { SlashCommandBuilder } from '@discordjs/builders';
import { CommandInteraction, MessageActionRow, MessageSelectMenu, SelectMenuInteraction } from 'discord.js';
import { Track } from '../music/track.js';
import { entersState, VoiceConnectionStatus } from '@discordjs/voice';
import * as spotify from '../spotify-api.js';
import { Command } from '../command.js';

type SearchCommandResponse = SpotifyApi.TrackSearchResponse & SpotifyApi.AlbumSearchResponse & SpotifyApi.PlaylistSearchResponse


const customIdSelectSearchResultTrack = "select_search_result_track";
const customIdSelectSearchResultAlbum = "select_search_result_album";
const customIdSelectSearchResultPlaylist = "select_search_result_playlist";
const EMOJI_TRACK = "%F0%9F%8E%B5"; // :musical_note:
const EMOJI_TRACK_EXPLICIT = "%E2%9A%A0%EF%B8%8F"; // :warning:
const EMOJI_ALBUM = "%F0%9F%92%BD"; // :minidisk:
const EMOJI_PLAYLIST = "%F0%9F%93%9C"; // :scroll:

export default class SearchCommand extends Command {
    protected configure(builder: SlashCommandBuilder) {
        builder.addStringOption(option => option
            .setName('query')
            .setDescription(t('command.search.option.query.description'))
            .setRequired(true)
        )

        this.selectMenuCustomIds = [customIdSelectSearchResultTrack, customIdSelectSearchResultAlbum, customIdSelectSearchResultPlaylist]
    }

    protected async _execute(interaction: CommandInteraction<'cached'>) {
        await interaction.deferReply({ ephemeral: true })

        let query = interaction.options.getString("query") as string
        let results = await spotify.search(query, ['track', 'album', 'playlist'], 25) as SearchCommandResponse
        const menus: MessageSelectMenu[] = []

        console.log(`Got results for "${query}" with ${results.tracks.total} tracks, ${results.albums.total} albums, and ${results.playlists.total} playlists`)

        if (results.tracks.items.length > 0) {
            menus.push(new MessageSelectMenu()
                .setCustomId(customIdSelectSearchResultTrack)
                .setPlaceholder(t('command.search.response.tracks.placeholder', { count: results.tracks.total }))
                .addOptions(results.tracks.items
                    .slice(0, 25)
                    .map(track => ({
                        label: t('command.search.response.tracks.label', track),
                        description: t('command.search.response.tracks.description', track),
                        value: track.id,
                        emoji: track.explicit ? EMOJI_TRACK_EXPLICIT : EMOJI_TRACK
                    }))
                )
            )
        }

        if (results.albums.items.length > 0) {
            menus.push(new MessageSelectMenu()
                .setCustomId(customIdSelectSearchResultAlbum)
                .setPlaceholder(t('command.search.response.albums.placeholder', { count: results.albums.total }))
                .addOptions(results.albums.items
                    .slice(0, 25)
                    .map(album => ({
                        label: t('command.search.response.albums.label', album),
                        description: t('command.search.response.albums.description', album),
                        value: album.id,
                        emoji: EMOJI_ALBUM
                    }))
                )
            )
        }

        if (results.playlists.items.length > 0) {
            menus.push(new MessageSelectMenu()
                .setCustomId(customIdSelectSearchResultPlaylist)
                .setPlaceholder(t('command.search.response.playlists.placeholder', { count: results.playlists.total }))
                .addOptions(results.playlists.items
                    .slice(0, 25)
                    .map(playlist => ({
                        label: t('command.search.response.playlists.label', playlist),
                        description: t('command.search.response.playlists.description', playlist),
                        value: playlist.id,
                        emoji: EMOJI_PLAYLIST
                    }))
                )
            )
        }

        if (menus.length == 0) {
            interaction.followUp({
                content: t('error.query_no_results_for', { query }),
                ephemeral: true
            })
        } else {
            await interaction.followUp({
                content: t('command.search.response.content', { query }),
                components: menus.map(menu => new MessageActionRow().addComponents(menu)),
                ephemeral: true
            })
        }
    }

    protected async _selectMenuInteract(interaction: SelectMenuInteraction<'cached'>) {
        const updateAndClear = (content: string) => interaction.update({
            content: content,
            components: []
        })

        let subscription = this.getSubscription(interaction, true)


        // Make sure the connection is ready before processing the user's request
        try {
            await entersState(subscription.voiceConnection, VoiceConnectionStatus.Ready, 20e3);
        } catch (error) {
            console.warn(error);
            await interaction.update(t('error.join_timeout'));
            return;
        }

        switch (interaction.customId) {
            case customIdSelectSearchResultTrack:
                const trackId = interaction.values[0];

                try {
                    const track = await Track.from(trackId, interaction.user);
                    subscription.enqueue(track);
                    await updateAndClear(t('command.search.response.tracks.success'))
                    await interaction.followUp(t('generic.song_added_to_queue', track.info))
                } catch (error) {
                    console.warn(error);
                    await interaction.followUp(t('error.track_play'));
                }
                break;
            case customIdSelectSearchResultAlbum:
                const albumId = interaction.values[0];

                try {
                    const album = await spotify.getAlbum(albumId)

                    for (const { id } of album.tracks.items) {
                        const track = await Track.from(id, interaction.user);
                        subscription.enqueue(track);
                    }

                    await updateAndClear(t('command.search.response.albums.success'))
                    await interaction.followUp(t('generic.album_added_to_queue', album))
                } catch (error) {
                    console.warn(error);
                    await interaction.followUp(t('error.track_play'));
                }
                break;
            case customIdSelectSearchResultPlaylist:
                const playlistId = interaction.values[0];

                try {
                    const playlist = await spotify.getPlaylist(playlistId)

                    for (const trackObject of playlist.tracks.items) {
                        if (trackObject.is_local) continue;
                        const track = await Track.from(trackObject.track.id, interaction.user);
                        subscription.enqueue(track);
                    }

                    await updateAndClear(t('command.search.response.playlists.success'))
                    await interaction.followUp(t('generic.playlist_added_to_queue', playlist))
                } catch (error) {
                    console.warn(error);
                    await interaction.followUp(t('error.track_play'));
                }
                break;
            default:
                throw new Error(`Unknown interaction ID ${interaction.customId}`)
        }
    }
}
