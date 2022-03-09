import { ArtworkBase, CharacterBase, CreatorBase, VoiceActorBase } from "./base";
import { ConfigData, ExportData, ImportData } from "./utils";

export type CharacterConfig = ConfigData<CharacterBase>
export type ImportedCharacter = ImportData<CharacterBase>
export type CharacterExport = ExportData<CharacterBase>

export type ArtworkConfig = ConfigData<ArtworkBase>
export type ImportedArtwork = ImportData<ArtworkBase>
export type ArtworkExport = ExportData<ArtworkBase>

export type VoiceActorConfig = ConfigData<VoiceActorBase>
export type ImportedVoiceActor = ImportData<VoiceActorBase>
export type VoiceActorExport = ExportData<VoiceActorBase>

export type CreatorConfig = ConfigData<CreatorBase>
export type ImportedCreator = ImportData<CreatorBase>
export type CreatorExport = ExportData<CreatorBase>

export type XNHBaseData = CharacterBase | CreatorBase | ArtworkBase | VoiceActorBase
export type XNHImportedData = ImportedArtwork | ImportedCharacter | ImportedVoiceActor | ImportedCreator
export type XNHExportedData = CharacterExport | ArtworkExport | VoiceActorExport | CreatorExport
export type XNHClasses = XNHImportedData["type"]
export type XNHBaseClassIndices = {
    [K in XNHClasses]: XNHBaseData & {type: K}
}
export type XNHImportedClassIndices = {
    [K in XNHClasses]: ImportData<XNHBaseClassIndices[K]>
}