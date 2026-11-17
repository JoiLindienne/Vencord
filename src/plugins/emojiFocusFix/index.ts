
/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 Vendicated and contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Logger } from "@utils/Logger";
import definePlugin from "@utils/types";
import { ComponentDispatch, SelectedChannelStore } from "@webpack/common";

type EditorRef = { current: { focus(): void; } | null; };

const logger = new Logger("EmojiFocusFix");

export default definePlugin({
    name: "EmojiFocusFix",
    description: "Restores chat input focus after selecting emojis, GIFs or stickers.",
    authors: [{ name: "JoiLindienne", id: 0n }],
    dependencies: ["GifPaste", "StickerPaste"],

    patches: [
        {
            find: /onSelectSticker:\i,onSelectSound:\i,channel:\i,closeOnModalOuterClick:/,
            replacement: [
                {
                    match: /\{emoji:(\i),willClose:(\i)\}=\i,(\i)=(\i)\.current;null!=\1&&null!=\3&&\3\.insertEmoji\(\{emoji:\1,willClose:\2\}\),\2&&\(0,\i\.\i\)\(\)/,
                    replace: "$&,$1!=null&&$2&&$self.refocus($4)"
                },
                {
                    match: /onSelectSticker:(\i)(?=,onSelectSound:\i,channel:\i,closeOnModalOuterClick:)/,
                    replace: "onSelectSticker:$self.wrapSticker($1)"
                }
            ]
        },
        {
            find: "handleSelectGIF=",
            replacement: {
                match: /handleSelectGIF=\(\i,\i\)=>\{/,
                replace: "$&$self.refocusComposer();"
            }
        }
    ],

    refocus(editorRef: EditorRef) {
        const editor = editorRef.current;
        if (!editor) return;

        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (editorRef.current !== editor) return;
            try {
                editor.focus();
            } catch (error) {
                logger.error("Could not restore composer focus", error);
            }
        }));
    },

    refocusComposer() {
        const channelId = SelectedChannelStore.getChannelId();

        requestAnimationFrame(() => requestAnimationFrame(() => {
            if (SelectedChannelStore.getChannelId() !== channelId) return;
            try {
                ComponentDispatch.dispatchToLastSubscribed("TEXTAREA_FOCUS");
            } catch (error) {
                logger.error("Could not restore composer focus", error);
            }
        }));
    },

    wrapSticker(handler: (...args: unknown[]) => unknown) {
        const plugin = this;
        return function (this: unknown, ...args: unknown[]) {
            const result = handler.apply(this, args);
            plugin.refocusComposer();
            return result;
        };
    }
});
