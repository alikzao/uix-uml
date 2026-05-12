import { DbNodePopup } from '../dbNodePopup.js';
import { DbItemPopup } from '../dbItemPopup.js';
import { WorkflowNodePopup } from '../workflowNodePopup.js';
import { WorkflowActionPopup } from '../workflowActionPopup.js';

class PopupRegistry {
    constructor(factoriesMap) {
        this.factories = factoriesMap;
    }

    open(key, ctx = {}) {
        if (!key) throw new Error("Popup key is empty");

        const factory = this.factories.get(key);
        if (!factory) throw new Error(`Popup not registered: ${key}`);

        const popup = factory(ctx);

        if (ctx.kind === "createItem" || ctx.kind === "createNode") {
            return popup.addRow(ctx);
        }

        if (ctx.kind === "editItem" || ctx.kind === "editNode") {
            return popup.editRow(ctx);
        }

        if (ctx.kind === "deleteNode") {
            if (typeof popup.deleteNode === "function") return popup.deleteNode(ctx);
            throw new Error(`Popup has no deleteNode(): ${key}`);
        }

        if (ctx.kind === "deleteItem") {
            if (typeof popup.deleteRow === "function") return popup.deleteRow(ctx);
            throw new Error(`Popup has no deleteRow(): ${key}`);
        }

        if (ctx.kind === "addChildItem") {
            if (typeof popup.addChildRow === "function") return popup.addChildRow(ctx);
            return popup.addRow(ctx);
        }
        return popup.open(ctx);
    }
}

export const popupRegistry = new PopupRegistry(new Map([
    ["node.popup.db",       (ctx) => new DbNodePopup(ctx.mountSelector || "#list-items", ctx)],
    ["node.popup.workflow", (ctx) => new WorkflowNodePopup(ctx.mountSelector || "#list-items", ctx)],
    ["item.popup.db",       (ctx) => new DbItemPopup(ctx.mountSelector || "#list-items", ctx)],
    ["item.popup.workflow", (ctx) => new WorkflowActionPopup(ctx.mountSelector || "#list-items", ctx)],
]));
