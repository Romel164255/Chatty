import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({

  plugins:[

    react(),

    VitePWA({

      registerType:"autoUpdate",

      includeAssets:[

      "favicon.png",
       "apple-touch-icon.png"
       
      ],

      manifest:{

        name:"Cyphr",

        short_name:"Cyphr",

        description:
        "Secure encrypted messaging",

        theme_color:"#181C14",

        background_color:"#181C14",

        display:"standalone",

        orientation:"portrait",

        start_url:"/",

        scope:"/",

        icons:[

          {
            src:"pwa-192x192.png",
            sizes:"192x192",
            type:"image/png"
          },

          {
            src:"pwa-512x512.png",
            sizes:"512x512",
            type:"image/png"
          },

          {
            src:"pwa-maskable.png",
            sizes:"512x512",
            type:"image/png",
            purpose:"maskable"
          }

        ]

      }

    })

  ],

  server:{

    port:5173,

    proxy:{

      "/auth":
      "http://localhost:5000",

      "/users":
      "http://localhost:5000",

      "/conversations":
      "http://localhost:5000",

      "/messages":
      "http://localhost:5000",

      "/groups":
      "http://localhost:5000",

      "/socket.io":{

        target:
        "http://localhost:5000",

        ws:true

      }

    }

  }

});