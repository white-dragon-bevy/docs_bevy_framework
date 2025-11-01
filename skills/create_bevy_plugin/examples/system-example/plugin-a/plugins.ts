import { Plugin } from "@white-dragon-bevy/bevy_framework";

export class PluginA implements Plugin {
    name(): string {
        return "PluginA";
    }

    build(app: App): void {
    }
}