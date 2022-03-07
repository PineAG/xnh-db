import { ConfigData, ExportData, ImportData } from "./utils";

export type CharacterConfig = ConfigData<'character'>
export type ImportedCharacter = ImportData<'character'>
export type CharacterExport = ExportData<'character'>

export type ArtworkConfig = ConfigData<'artwork'>
export type ImportedArtwork = ImportData<'artwork'>
export type ArtworkExport = ExportData<'artwork'>

export type VoiceActorConfig = ConfigData<'voice-actor'>
export type ImportedVoiceActor = ImportData<'voice-actor'>
export type VoiceActorExport = ExportData<'voice-actor'>

export type CreatorConfig = ConfigData<'creator'>
export type ImportedCreator = ImportData<'creator'>
export type CreatorExport = ExportData<'creator'>

export type XNHImportedData = ImportedArtwork | ImportedCharacter | ImportedVoiceActor | ImportedCreator
