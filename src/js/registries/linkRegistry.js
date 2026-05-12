class LinkRegistry {
    constructor(map) { this.factories = map; }

    api(key, ctx = {}) {
        const factory = this.factories.get(key);
        if (!factory) throw new Error(`Link API not registered: ${key}`);
        return factory(ctx);
    }
}

export const linkRegistry = new LinkRegistry(new Map([
    ["link.api.uml",      () => ({ create: "/uml/add/link",      delete: "/uml/delete/link" })],
    ["link.api.db",       () => ({ create: "/db/add/link",       delete: "/db/delete/link" })],
    ["link.api.workflow", () => ({ create: "/workflow/add/link", delete: "/workflow/delete/link" })],
]));
