import { popupRegistry } from '../registries/popupRegistry.js';
import { DemoUMLPopup } from '../demoUMLPopup.js';

function ensureDiagramData(diagram) {
    if (!diagram.state) diagram.state = {};
    if (!diagram.state.data) {
        diagram.state.data = { status: 'ok', pipeId: diagram.procId, maps: { nodes: [], links: [] } };
    }
    if (!diagram.state.data.maps) diagram.state.data.maps = {};
    if (!Array.isArray(diagram.state.data.maps.nodes)) diagram.state.data.maps.nodes = [];
    if (!Array.isArray(diagram.state.data.maps.links)) diagram.state.data.maps.links = [];
    return diagram.state.data.maps;
}

function slugify(value, fallback) {
    const slug = String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '');
    return slug || fallback;
}

function uniqueId(base, existingIds) {
    let id = base;
    let i = 2;
    while (existingIds.has(String(id))) {
        id = `${base}_${i}`;
        i += 1;
    }
    return id;
}

export const popupMethods = {
    _redrawFromLocalState() {
        const svgRoot = d3.select(this.sel('svg'));
        svgRoot.selectAll("*").remove();
        this.svg = null;
        this.nodeSelection = null;
        this.linkSelection = null;
        this._closeItemMenu?.();
        this._closeNodeMenu?.();
        this._nodeMenu = null;
        this._itemMenu = null;
        this.tempLink = null;
        this.componentUpdate();
    },

    addNode(nodeData = {}) {
        const maps = ensureDiagramData(this);
        const existingIds = new Set(maps.nodes.map(node => String(node.id)));
        const label = String(nodeData.label || nodeData.id || 'New node').trim();
        const id = uniqueId(slugify(nodeData.id || label, `node_${maps.nodes.length + 1}`), existingIds);
        const fields = Array.isArray(nodeData.fields) && nodeData.fields.length
            ? nodeData.fields
            : [{ id: 'value', label: 'Value', type: 'string' }];

        maps.nodes.push({
            id,
            label,
            type: nodeData.type || 'action_group',
            triggerTypes: nodeData.triggerTypes || '',
            sort: Number.isFinite(Number(nodeData.sort)) ? Number(nodeData.sort) : maps.nodes.length,
            fields
        });

        this._redrawFromLocalState();
        return id;
    },

    addItemToNode(node, itemData = {}) {
        const maps = ensureDiagramData(this);
        const target = maps.nodes.find(candidate => String(candidate.id) === String(node?.id));
        if (!target) return null;

        if (!Array.isArray(target.fields)) target.fields = [];
        const existingIds = new Set(target.fields.map(field => String(field.id)));
        const label = String(itemData.label || itemData.id || 'New item').trim();
        const id = uniqueId(slugify(itemData.id || label, `item_${target.fields.length + 1}`), existingIds);

        target.fields.push({
            id,
            label,
            type: itemData.type || 'string'
        });

        this._redrawFromLocalState();
        return id;
    },

    _resolveItemCtx({ nodeId, fieldId, subId }) {
        const node = this.nodes?.find(n => String(n.id) === String(nodeId));
        if (!node) return null;
    
        const field = node.fields?.find(f => String(f.id) === String(fieldId));
        if (!field) return null;
    
        if (subId && field.children?.length) {
            const child = field.children.find(c => String(c.id) === String(subId));
            if (!child) return null;
            return { node, field, item: child, isChild: true };
        }
        return { node, field, item: field, isChild: false };
    },

    openDeleteItemPopup({ nodeId, fieldId, subId = "", anchorEl, extra = {} }) {
        const key = this.popupKeys.editItem;
        if (!key) return;
    
        const ctxResolved = this._resolveItemCtx({ nodeId, fieldId, subId });
        if (!ctxResolved) return;
    
        const { node, field, item, isChild } = ctxResolved;
    
        popupRegistry.open(key, {
            kind: "deleteItem",
            diagram: this,
    
            pipeId: this.procId,
            nodeId,
            fieldId,
            subId,
            itemId: item.id,
    
            node,
            field,
            item,
            isChild,
            anchorEl,
    
            mountSelector: this.popupMountSelector,
            containerId: this.popupContainerId,
            ...extra,
        });
    },

    openDeleteNodePopup({ nodeId, anchorEl, extra = {} }) {
        const key = this.popupKeys.editNode; // или createNode — главное чтобы это был node.popup.workflow
        if (!key) return;
    
        const node = this.nodes?.find(n => String(n.id) === String(nodeId));
        if (!node) return;
    
        popupRegistry.open(key, {
            kind: "deleteNode",
            diagram: this,
            pipeId: this.procId,
            nodeId: node.id,
            procId: node.id,
            node,
            anchorEl,
    
            mountSelector: this.popupMountSelector,
            containerId: this.popupContainerId,
    
            ...extra,
        });
    },

    openEditNodePopup({ nodeId, anchorEl, extra = {} }) {
        const key = this.popupKeys.editNode;
        if (!key) return;
    
        const node = this.nodes?.find(n => String(n.id) === String(nodeId));
        if (!node) return;
    
        popupRegistry.open(key, {
            kind: "editNode",
            diagram: this,
            pipeId: this.procId,
            nodeId: node.id,
            procId: node.id,
            node,
            anchorEl,
    
            mountSelector: this.popupMountSelector,
            containerId: this.popupContainerId,
    
            ...extra,
        });
    },

    openCreateNodePopup(anchorEl, extra = {}) {
        const key = this.popupKeys.createNode;
        if (!key) {
            return new DemoUMLPopup(this.popupMountSelector || 'body', {
                kind: 'createNode',
                diagram: this,
                anchorEl,
                ...extra,
                onCreate: (nodeData) => this.addNode(nodeData),
            }).addRow();
        }

        popupRegistry.open(key, {kind: "createNode",
            diagram: this, anchorEl, ...extra,
            pipeId: this.procId,
            onCreate: (nodeData) => this.addNode(nodeData),
        });
    },

    openCreateItemPopup(node, anchorEl, extra = {}) {
        const key = this.popupKeys.createItem;
        if (!key) {
            return new DemoUMLPopup(this.popupMountSelector || 'body', {
                kind: 'createItem',
                diagram: this,
                node,
                anchorEl,
                ...extra,
                onCreate: (itemData) => this.addItemToNode(node, itemData),
            }).addRow();
        }
    
        popupRegistry.open(key, {
            kind: "createItem",
            diagram: this,
            pipeId: this.procId,
            nodeId: node.id,
            procId: node.id,
            node,
            anchorEl,
            ...extra,
            onCreate: (itemData) => this.addItemToNode(node, itemData),
        });
    },

    openEditItemPopup({ nodeId, fieldId, subId = "", anchorEl, extra = {} }) {
        const key = this.popupKeys.editItem;
        if (!key) return;
    
        const ctxResolved = this._resolveItemCtx({ nodeId, fieldId, subId });
        if (!ctxResolved) return;
    
        const { node, field, item, isChild } = ctxResolved;
    
        popupRegistry.open(key, {
            kind: "editItem",
            diagram: this,
    
            pipeId: this.procId,
            nodeId,
            procId: this.procId,
            itemId: item.id,
    
            node,
            field,
            item,
            isChild,
            anchorEl,
            parentItemId: isChild ? field.id : null,
    
            mountSelector: this.popupMountSelector,
            containerId: this.popupContainerId,
            ...extra,
        });
    },

    openAddChildItemPopup({ nodeId, fieldId, subId = "", anchorEl, extra = {} }) {
        const key = this.popupKeys.createItem; // тот же попап что и создание item
        if (!key) return;
    
        const ctxResolved = this._resolveItemCtx({ nodeId, fieldId, subId });
        if (!ctxResolved) return;
    
        const { node, field, item, isChild } = ctxResolved;
    
        popupRegistry.open(key, {
            kind: "addChildItem",
            diagram: this,
    
            pipeId: this.procId,
            procId: this.procId,
            nodeId,
            fieldId,
            subId,
    
            parentItem: item,
    
            node,
            field,
            item,
            isChild,
            anchorEl,
            parentItemId: item.id,
    
            mountSelector: this.popupMountSelector,
            containerId: this.popupContainerId,
            ...extra,
    
            // можно reuse твою текущую addItemToNode или сделать отдельный хендлер
            onCreate: (childData) => {
                // самый безопасный вариант без влезания в локальную структуру:
                this.refreshFromServer();
            },
        });
    }
};
