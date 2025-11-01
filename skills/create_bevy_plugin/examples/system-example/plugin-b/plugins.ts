import { Plugin } from "@white-dragon-bevy/bevy_framework";

export class PluginB implements Plugin {
    name(): string {
        return "PluginB";
    }

    build(app: App): void {
    }
}