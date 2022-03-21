import { ProcessorType } from "./utils";

function extendProcessor<P extends ProcessorType>(f: string | null, p: P){
    return f === null ? null : `${f}!${p}`
}

export const cropAnimeAvatar = (f: string | null) => extendProcessor(f, 'crop-anime-avatar')
