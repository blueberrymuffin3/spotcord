import { Util } from 'discord.js';
import i18next from 'i18next';
import Backend from 'i18next-fs-backend';

await i18next.use(Backend).init({
    lng: "en",
    debug: true,
    backend: {
        loadPath: 'locales/{{lng}}/{{ns}}.json'
    },
    interpolation: {
        // TODO: What kind of escaping should we do?
        escapeValue: false,
    }
});

const formatInlineBlock = (value: string) => {
    return "`" + Util.escapeInlineCode(value) + "`"
}

i18next.services.formatter?.add('inline_block', formatInlineBlock)

// Needed until https://github.com/microsoft/TypeScript/pull/47254 merges
declare namespace Intl {
    const ListFormat: any
}

export const formatArtists = (artists: SpotifyApi.ArtistObjectSimplified[], lng = 'en') => {
    return new Intl.ListFormat(lng, { type: 'unit' })
        .format(artists
            .map(artist => artist.name)
        )
}
i18next.services.formatter?.add('artists', formatArtists)
