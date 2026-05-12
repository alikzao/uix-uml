export const searchMethods = {
    _getScrollHost() {
        // чаще всего скролл именно на container (scroll-area)
        const cont = this.getEl('container');
        const inner = this.getEl('inner');
        // выбираем тот, который реально скроллится по Y
        if (cont && cont.scrollHeight > cont.clientHeight) return cont;
        return inner || cont || document.documentElement;
    },

    _openSearchUI() {
        const input = this.getEl('searchInput');
        if (!input) return;
    
        input.style.width = '220px';
        input.style.opacity = '1';
        input.style.pointerEvents = 'auto';
        input.style.padding = '0.25rem 0.5rem';
        input.style.border = '1px solid rgba(0,0,0,0.2)';
        input.style.background = '#fff';
        input.focus();
        input.select();
    
        this._searchOpen = true;
    },

    _closeSearchUI() {
        const input = this.getEl('searchInput');
        if (!input) return;
    
        input.value = '';
        input.style.width = '0px';
        input.style.opacity = '0';
        input.style.pointerEvents = 'none';
        input.style.padding = '0';
        input.style.border = '0';
    
        this._searchOpen = false;
        this._clearFoundNode();
    },

    _toggleSearchUI() {
        if (this._searchOpen) this._closeSearchUI();
        else this._openSearchUI();
    },

    _clearFoundNode() {
        if (!this._foundNodeId) return;
        const g = this.svg?.selectAll(".node-group")
            .filter(d => String(d.id) === String(this._foundNodeId));
        if (!g || g.empty()) { this._foundNodeId = null; return; }
    
        // восстановим stroke как при drawNode()
        const nodeData = g.datum();
        const { stroke } = this._getNodeStrokeFill(nodeData);
        g.classed("uml-node-found", false);
        g.select(".node-container")
            .attr("filter", null)
            .attr("stroke", stroke)
            .attr("stroke-width", 2);
    
        this._foundNodeId = null;
    },

    _getNodeStrokeFill(nodeData) {
        const isTrigger = (String(nodeData?.type || '').toLowerCase() === 'trigger');
        const kind = isTrigger ? String(nodeData.triggerTypes || '').toLowerCase() : null;
    
        let stroke = "#D66FFF";
        let fill = "rgba(255,0,255,0.10)";
    
        if (kind === 'internal') { stroke = "#2e8b57"; fill = "rgba(46,139,87,0.10)"; }
        else if (kind === 'external') { stroke = "#2b6cb0"; fill = "rgba(43,108,176,0.10)"; }
    
        return { stroke, fill };
    },

    _findNodesByQuery(q) {
        q = String(q || '').trim().toLowerCase();
        if (!q) return [];
    
        const exactId = this.nodes?.find(n => String(n.id).toLowerCase() === q);
        if (exactId) return [exactId];
    
        const exactLabel = this.nodes?.find(n => String((n.label ?? '')).trim().toLowerCase() === q);
        if (exactLabel) return [exactLabel];
    
        // includes id or label
        return (this.nodes || []).filter(n => {
            const id = String(n.id ?? '').toLowerCase();
            const label = String((n.label ?? '')).trim().toLowerCase();
            return id.includes(q) || label.includes(q);
        });
    },

    _focusNode(nodeData) {
        if (!nodeData || !this.svg) return;
    
        // снять старую подсветку
        this._clearFoundNode();
    
        // найти DOM группы ноды
        const g = this.svg.selectAll(".node-group")
            .filter(d => String(d.id) === String(nodeData.id));
    
        if (g.empty()) return;
    
        this._foundNodeId = nodeData.id;
    
        // подсветка
        g.classed("uml-node-found", true).raise();
    
        // (опционально) легкий glow, если есть
        const filterId = (this.isHalloLines && this.ids.glowStrong) ? this.ids.glowStrong : this.ids.glow;
        g.select(".node-container").attr("filter", `url(#${filterId})`);
    
        // доскроллить/додвигать
        const nodeEl = g.node();
        this._scrollNodeIntoView(nodeEl);
    
        // авто-снятие подсветки через время (не обязательно)
        if (this._foundTimer) clearTimeout(this._foundTimer);
        this._foundTimer = setTimeout(() => this._clearFoundNode(), 2500);
    },

    _scrollNodeIntoView(nodeEl) {
        const host = this._getScrollHost();
        const hb = document.getElementById(`hbar-${this._uid}`);
        if (!host || !nodeEl) return;
    
        const nodeRect = nodeEl.getBoundingClientRect();
        const hostRect = host.getBoundingClientRect();
    
        const nodeCx = nodeRect.left + nodeRect.width / 2;
        const nodeCy = nodeRect.top + nodeRect.height / 2;
        const hostCx = hostRect.left + hostRect.width / 2;
        const hostCy = hostRect.top + hostRect.height / 2;
    
        const dx = nodeCx - hostCx;
        const dy = nodeCy - hostCy;
    
        // vertical: обычный scrollTop
        if (Math.abs(dy) > 8) {
            host.scrollTop += dy;
        }
    
        // horizontal: через hbar, если он есть
        if (hb && Math.abs(dx) > 8) {
            hb.scrollLeft += dx;
        }
    },

    _searchAndFocus(q) {
        const hits = this._findNodesByQuery(q);
        if (!hits.length) return false;
    
        // если жмём Enter на том же запросе — циклим совпадения
        const normalized = String(q || '').trim().toLowerCase();
        if (this._lastSearchQ === normalized && this._lastHits?.length) {
            this._hitIndex = (this._hitIndex + 1) % this._lastHits.length;
        } else {
            this._lastSearchQ = normalized;
            this._lastHits = hits;
            this._hitIndex = 0;
        }
    
        this._focusNode(this._lastHits[this._hitIndex]);
        return true;
    }
};
