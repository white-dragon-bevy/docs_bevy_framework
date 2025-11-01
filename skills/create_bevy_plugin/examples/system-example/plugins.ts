import { PluginGroup, PluginGroupBuilder } from "@white-dragon-bevy/bevy_framework";
import { PluginA } from "./plugin-a/plugins";
import { PluginB } from "./plugin-b/plugins";

export class SystemExamplePlugins implements PluginGroup {
    __brand: "PluginGroup";
    name(): string {
        return "SystemExamplePlugins";
    }

    build(): PluginGroupBuilder {
        const builder = new PluginGroupBuilder();
        builder.add(new PluginA());
        builder.add(new PluginB());
        return builder;
    }
}   