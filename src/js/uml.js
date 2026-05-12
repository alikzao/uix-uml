// uml.js
import { ExtendedComponent } from "/modules/core/js/extendedComponent.js";
import { layoutMethods } from './diagram/layout.js';
import { geometryMethods } from './diagram/geometry.js';
import { svgDefMethods } from './diagram/svgDefs.js';
import { linkingMethods } from './diagram/linking.js';
import { popupMethods } from './diagram/popups.js';
import { sceneMethods } from './diagram/scene.js';
import { itemMethods } from './diagram/items.js';
import { nodeMethods } from './diagram/nodes.js';
import { menuMethods } from './diagram/menus.js';
import { searchMethods } from './diagram/search.js';
import { hbarMethods } from './diagram/hbar.js';
import { eventMethods } from './diagram/events.js';
import { templateMethods } from './diagram/template.js';

export class UML extends ExtendedComponent {

    constructor(selector, props) {
        super(selector, props);
        // this._uid = this._uid || Math.random().toString(36).slice(2);
        // this._uid = this._uid || selector;
        const rawUid = (this._uid || selector || Math.random().toString(36).slice(2)).toString();
        this._uid = rawUid
            .replace(/^#/, '')                  // срезаем начальный #
            .replace(/[^a-zA-Z0-9_-]/g, '_');
        this.ids = {
            root: `uml-${this._uid}`,
            container: `diagram-container-${this._uid}`,
            inner: `diagram-inner-${this._uid}`,
            svg: `diagram-${this._uid}`,
            zoom: `zoomContainer-${this._uid}`,
            btnAdd: `addNode-${this._uid}`,
            btnIn: `zoomIn-${this._uid}`,
            btnOut: `zoomOut-${this._uid}`,
            btnReset: `reset-${this._uid}`,

            searchInput: `searchInput-${this._uid}`,
            btnSearch: `btnSearch-${this._uid}`,

            glow: `soft-glow-${this._uid}`,
            glowStrong: `soft-glow-strong-${this._uid}`,
            gradGreen: `linearGradientGreen-${this._uid}`,
            gradRose: `linearGradientRose-${this._uid}`,
            gradYellow: `linearGradientYellow-${this._uid}`,
            gradBruin: `linearGradientBruin-${this._uid}`,
            marker: `uml-arrowhead-${this._uid}`,
        };
        this.sel = (k) => `#${this.ids[k]}`;
        // this.el  = (k) => document.getElementById(this.ids[k]);
        this.getEl  = (k) => document.getElementById(this.ids[k]);
        this.markerId = this.ids.marker;
        // this.markerId = `uml-arrowhead-${this._uid}`;
        // this.procId = null;
        this.procId = props.pipeId ?? props.data?.id ?? null;
        this.container = props.container;
        this.addFieldEndpoint = props.addFieldEndpoint;
        // this.containerId = props.containerId;
        this.containerId = selector;
        this.socket = props.socket ? props.socket : null;
        this.isSimulation = false;
        this.isOwnSimulation = true;
        this.isHalloLines = true;
        this.init_url = props.init_url ? props.init_url : '/get/list/maps';
        // this.tablePopups = new TablePopups(`${this.containerId}`,{socket:props.socket, container: this.container,
        // containerId: this.containerId, tableId: this._tableId});

        // this.addSocketEvent(`addItem${this._tableId}`, this.socketOnAddItem);
        // this.addSocketEvent('delItem', this.socketOnDelItem);

        // КЛЮЧИ приходили снаружи как конфиг диаграммы (строки)
        this.popupKeys = {
            createNode: props.popupKeys?.createNode,
            editNode: props.popupKeys?.editNode || props.popupKeys?.createNode,

            createItem: props.popupKeys?.createItem,
            editItem: props.popupKeys?.editItem || props.popupKeys?.createItem,
        };
        this.popupMountSelector = props.popupMountSelector || '#list-items';
        this.popupContainerId   = props.popupContainerId   || 'list-items';
        const defaultMount = document.querySelector('#list-items') ? '#list-items' : 'body';
        this.popupMountSelector = props.popupMountSelector || defaultMount;
        this.popupContainerId   = props.popupContainerId   || (defaultMount === 'body' ? null : 'list-items');
        this.deleteLinkEndpoint = props.deleteLinkEndpoint || '/uml/delete/link';
        this.createLinkEndpoint = props.createLinkEndpoint || "/uml/add/link";
        this._activeLinkEl = null;
        this._debounced = null;
        this.linkKeys = {
            api: props.linkKeys?.api || "link.api.uml",
        };
        this.createLinkEndpoint = props.createLinkEndpoint;
        this.deleteLinkEndpoint = props.deleteLinkEndpoint;
    }


    async getData(){
        try{
            const data = this.props.data || {};
            const result = await req(this.init_url, {data});
            // console.log("getData data => ", data);
            this.state.data = result;
            this.procId = result?.pipeId ?? result?.procId ?? this.procId;

            return result;
        }catch (e) {
            console.error("getData Error => ", e);
        }
    }

    async refreshFromServer() {
        // 1) забрать свежие данные
        await this.getData();

        // 2) снести старую сцену внутри <svg> (без пересоздания всего компонента)
        const svgRoot = d3.select(this.sel('svg'));
        svgRoot.selectAll("*").remove();

        // 3) сбросить ссылки/меню, чтобы componentUpdate собрал всё заново чисто
        this.svg = null;
        this.nodeSelection = null;
        this.linkSelection = null;
        this._closeItemMenu?.();
        this._closeNodeMenu?.();
        this._nodeMenu = null;
        this._itemMenu = null;

        // (опционально) сбросить временный линк, если вдруг был
        this.tempLink = null;
        // this._eventsAttached = false;

        // 4) перерисовать как при первом рендере
        this.componentUpdate();
    }
    // layout
    assignCoordinates1(...args) {
        return layoutMethods.assignCoordinates1.apply(this, args);
    }

    assignCoordinates(...args) {
        return layoutMethods.assignCoordinates.apply(this, args);
    }

    isTriggerNode(...args) {
        return layoutMethods.isTriggerNode.apply(this, args);
    }

    getTriggerKind(...args) {
        return layoutMethods.getTriggerKind.apply(this, args);
    }

    // geometry
    fitTextToWidth(...args) {
        return geometryMethods.fitTextToWidth.apply(this, args);
    }

    clientToGroupPoint(...args) {
        return geometryMethods.clientToGroupPoint.apply(this, args);
    }

    _closestPointOnPath(...args) {
        return geometryMethods._closestPointOnPath.apply(this, args);
    }

    isLayoutReady(...args) {
        return geometryMethods.isLayoutReady.apply(this, args);
    }

    clientToSvgPoint(...args) {
        return geometryMethods.clientToSvgPoint.apply(this, args);
    }

    getItemPosition(...args) {
        return geometryMethods.getItemPosition.apply(this, args);
    }

    getConnectorPosition(...args) {
        return geometryMethods.getConnectorPosition.apply(this, args);
    }

    // svgDef
    initSvgMarker(...args) {
        return svgDefMethods.initSvgMarker.apply(this, args);
    }

    // linking
    _resolveLinkApi(...args) {
        return linkingMethods._resolveLinkApi.apply(this, args);
    }

    persistCreatedLink(...args) {
        return linkingMethods.persistCreatedLink.apply(this, args);
    }

    _scheduleHideLinkTrash(...args) {
        return linkingMethods._scheduleHideLinkTrash.apply(this, args);
    }

    ensureSharedLinkTrash(...args) {
        return linkingMethods.ensureSharedLinkTrash.apply(this, args);
    }

    _hideLinkTrash(...args) {
        return linkingMethods._hideLinkTrash.apply(this, args);
    }

    _onLinkTrashClick(...args) {
        return linkingMethods._onLinkTrashClick.apply(this, args);
    }

    safeUpdateLinks(...args) {
        return linkingMethods.safeUpdateLinks.apply(this, args);
    }

    updateLinks(...args) {
        return linkingMethods.updateLinks.apply(this, args);
    }

    dragStart(...args) {
        return linkingMethods.dragStart.apply(this, args);
    }

    dragging(...args) {
        return linkingMethods.dragging.apply(this, args);
    }

    dragEnd(...args) {
        return linkingMethods.dragEnd.apply(this, args);
    }

    startLink(...args) {
        return linkingMethods.startLink.apply(this, args);
    }

    endLink(...args) {
        return linkingMethods.endLink.apply(this, args);
    }

    // popup
    _resolveItemCtx(...args) {
        return popupMethods._resolveItemCtx.apply(this, args);
    }

    openDeleteItemPopup(...args) {
        return popupMethods.openDeleteItemPopup.apply(this, args);
    }

    openDeleteNodePopup(...args) {
        return popupMethods.openDeleteNodePopup.apply(this, args);
    }

    openEditNodePopup(...args) {
        return popupMethods.openEditNodePopup.apply(this, args);
    }

    openCreateNodePopup(...args) {
        return popupMethods.openCreateNodePopup.apply(this, args);
    }

    openCreateItemPopup(...args) {
        return popupMethods.openCreateItemPopup.apply(this, args);
    }

    openEditItemPopup(...args) {
        return popupMethods.openEditItemPopup.apply(this, args);
    }

    openAddChildItemPopup(...args) {
        return popupMethods.openAddChildItemPopup.apply(this, args);
    }

    _redrawFromLocalState(...args) {
        return popupMethods._redrawFromLocalState.apply(this, args);
    }

    addNode(...args) {
        return popupMethods.addNode.apply(this, args);
    }

    addItemToNode(...args) {
        return popupMethods.addItemToNode.apply(this, args);
    }

    // scene
    componentUpdate(...args) {
        return sceneMethods.componentUpdate.apply(this, args);
    }

    forceCoordinateUpdate(...args) {
        return sceneMethods.forceCoordinateUpdate.apply(this, args);
    }

    cacheConnectorPositions(...args) {
        return sceneMethods.cacheConnectorPositions.apply(this, args);
    }

    simulation(...args) {
        return sceneMethods.simulation.apply(this, args);
    }

    // item
    computeItemHeight(...args) {
        return itemMethods.computeItemHeight.apply(this, args);
    }

    drawItem(...args) {
        return itemMethods.drawItem.apply(this, args);
    }

    // node
    applyNodeFields(...args) {
        return nodeMethods.applyNodeFields.apply(this, args);
    }

    redrawSingleNode(...args) {
        return nodeMethods.redrawSingleNode.apply(this, args);
    }

    reRenderNode(...args) {
        return nodeMethods.reRenderNode.apply(this, args);
    }

    drawNode(...args) {
        return nodeMethods.drawNode.apply(this, args);
    }

    drawNodeHeader(...args) {
        return nodeMethods.drawNodeHeader.apply(this, args);
    }

    // menu
    ensureSharedNodeMenu(...args) {
        return menuMethods.ensureSharedNodeMenu.apply(this, args);
    }

    _openNodeMenuAt(...args) {
        return menuMethods._openNodeMenuAt.apply(this, args);
    }

    _closeNodeMenu(...args) {
        return menuMethods._closeNodeMenu.apply(this, args);
    }

    ensureSharedItemMenu(...args) {
        return menuMethods.ensureSharedItemMenu.apply(this, args);
    }

    _openItemMenuAt(...args) {
        return menuMethods._openItemMenuAt.apply(this, args);
    }

    _closeItemMenu(...args) {
        return menuMethods._closeItemMenu.apply(this, args);
    }

    // search
    _getScrollHost(...args) {
        return searchMethods._getScrollHost.apply(this, args);
    }

    _openSearchUI(...args) {
        return searchMethods._openSearchUI.apply(this, args);
    }

    _closeSearchUI(...args) {
        return searchMethods._closeSearchUI.apply(this, args);
    }

    _toggleSearchUI(...args) {
        return searchMethods._toggleSearchUI.apply(this, args);
    }

    _clearFoundNode(...args) {
        return searchMethods._clearFoundNode.apply(this, args);
    }

    _getNodeStrokeFill(...args) {
        return searchMethods._getNodeStrokeFill.apply(this, args);
    }

    _findNodesByQuery(...args) {
        return searchMethods._findNodesByQuery.apply(this, args);
    }

    _focusNode(...args) {
        return searchMethods._focusNode.apply(this, args);
    }

    _scrollNodeIntoView(...args) {
        return searchMethods._scrollNodeIntoView.apply(this, args);
    }

    _searchAndFocus(...args) {
        return searchMethods._searchAndFocus.apply(this, args);
    }

    // hbar
    initHBar(...args) {
        return hbarMethods.initHBar.apply(this, args);
    }

    // event
    addEvents(...args) {
        return eventMethods.addEvents.apply(this, args);
    }

    // template
    render(...args) {
        return templateMethods.render.apply(this, args);
    }

}
