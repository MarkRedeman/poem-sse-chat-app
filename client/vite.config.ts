import path from "path";
import { vitePlugin as remix } from "@remix-run/dev";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        remix({
            ssr: false,
            future: {
                v3_fetcherPersist: true,
                v3_relativeSplatPath: true,
                v3_throwAbortReason: true,
            },
            routes(defineRoutes) {
                return defineRoutes((route) => {
                    route("/", "routes/_index.tsx", () => {
                        //route("login", "routes/login.tsx");
                    });
                    // route("/rooms", "routes/rooms/layout.tsx", () => {
                    //     route("", "routes/rooms/route.tsx", { index: true });
                    //     route(":room", "routes/rooms/room.tsx", {
                    //         index: true,
                    //     });
                    // });
                });
            },
        }),
        tsconfigPaths(),
    ],
    resolve: {
        alias: {
            "~": path.resolve(__dirname, "./app"),
        },
    },
});
