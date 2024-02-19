
// this is a quick way of making all the assets available
// as URLs to be loaded without having to import each one
// The import.meta.glob is a vite thing.
const ASSETS_IMPORTS = import.meta.glob("../assets/**/*", {
    query: '?url',
    import: 'default',
});
// map from the name of the assets (the path) to the
// URL it's hosted at
export const ASSETS: Record<string, string> = {};

// Resolve all the imports for the assets in the src folder
export async function resolveAllAssetImports() {
    const promises: Promise<unknown>[] = [];

    for (const path in ASSETS_IMPORTS) {
        const promise = ASSETS_IMPORTS[path]();
        promises.push(promise);
        promise.then((result) => {
            ASSETS[path.substring("../assets/".length)] = result as string;
        })
    }

    await Promise.all(promises);
}