import { defineConfig } from 'vite';
import laravel from 'laravel-vite-plugin';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.js'],
            refresh: true,
        }),
        tailwindcss(),
    ],
    preview: {
        allowedHosts: ['fitnessclubfrontend-production.up.railway.app']
    },
    server: {
        watch: {
            ignored: ['**/storage/framework/views/**'],
        },
    },
});
