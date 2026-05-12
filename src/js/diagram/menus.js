export const menuMethods = {
    ensureSharedNodeMenu() {
        if (this._nodeMenu) return;
    
        const root = this.svg; // <g id="zoom...">
        const menu = root.append("g")
            .attr("class", "uml-node-menu")
            .style("display", "none")
            .style("pointer-events", "all");
    
        const w = 120;
        const rowH = 18;
        const pad = 6;
    
        const items = [
            { label: "✎ Edit",   classes: "uml-node-menu-action uml-node-edit-icon",  action: "edit" },
            { label: "🗑 Delete",classes: "uml-node-menu-action uml-node-trash-icon", action: "del"  },
            { label: "+ Add",    classes: "uml-node-menu-action addNewField addNewExec", action: "add" },
        ];
    
        const h = pad * 2 + items.length * rowH;
    
        menu.append("rect")
            .attr("class", "uml-node-menu-bg")
            .attr("x", 0).attr("y", 0)
            .attr("width", w).attr("height", h)
            .attr("rx", 7)
            .attr("fill", "rgba(20,20,20,0.92)")
            .attr("stroke", "rgba(255,255,255,0.15)")
            .attr("stroke-width", 1);
    
        items.forEach((it, i) => {
            const rowTop = pad + i * rowH;
    
            // hit-area
            menu.append("rect")
                .attr("class", it.classes)
                .attr("data-action", it.action)
                .attr("x", 4).attr("y", rowTop)          // ✅ без -12
                .attr("width", w - 8).attr("height", rowH)
                .attr("rx", 4)
                .attr("fill", "transparent")
                .style("cursor", "pointer");
    
            menu.append("text")
                .attr("class", it.classes)
                .attr("data-action", it.action)
                .attr("x", 10)
                .attr("y", rowTop + rowH / 2)            // ✅ центр строки
                .attr("fill", "#fff")
                .style("font-size", "11px")
                .style("dominant-baseline", "middle")    // ✅ чтобы не baseline
                .style("pointer-events", "none")         // ✅ клики ловит rect
                .text(it.label);
        });
    
        this._nodeMenu = {
            el: menu.node(),
            sel: menu,
            w, h,
            open: false,
            ctx: null,
        };
    },

    _openNodeMenuAt(triggerEl) {
        this.ensureSharedNodeMenu();
    
        const nodeId = triggerEl.getAttribute("data-node-id");
    
        // toggle same node
        if (this._nodeMenu.open && this._nodeMenu.ctx?.nodeId === nodeId) {
            this._closeNodeMenu();
            return;
        }
    
        const r = triggerEl.getBoundingClientRect();
        const anchor = this.clientToGroupPoint(r.left, r.bottom);
    
        this._nodeMenu.ctx = { nodeId };
    
        // ВАЖНО: shared menu → проставляем data-node-id на ВСЕ пункты меню каждый раз при открытии
        this._nodeMenu.sel.selectAll(".uml-node-menu-action")
            .attr("data-node-id", nodeId);
    
        this._nodeMenu.sel
            .attr("transform", `translate(${anchor.x + 4},${anchor.y + 2})`)
            .style("display", "block");
    
        this._nodeMenu.open = true;
    
        if (!this._onDocNodeMenuClose) {
            this._onDocNodeMenuClose = (ev) => {
                if (!this._nodeMenu?.open) return;
                if (this._nodeMenu.el?.contains(ev.target)) return;
                if (ev.target?.closest?.(".uml-node-menu-trigger")) return;
                this._closeNodeMenu();
            };
        }
        document.addEventListener("pointerdown", this._onDocNodeMenuClose, true);
    },

    _closeNodeMenu() {
        if (!this._nodeMenu?.open) return;
        this._nodeMenu.sel.style("display", "none");
        this._nodeMenu.open = false;
        this._nodeMenu.ctx = null;
        document.removeEventListener("pointerdown", this._onDocNodeMenuClose, true);
    },

    ensureSharedItemMenu() {
        if (this._itemMenu) return;
    
        // меню живёт в той же группе, что и ноды/линии (this.svg = <g id=zoom...>)
        const root = this.svg; // d3 selection
        const menu = root.append("g")
            .attr("class", "uml-item-menu")
            .style("display", "none")
            .style("pointer-events", "all");
    
        const w = 110;
        const rowH = 18;
        const pad = 6;
    
        const items = [
            { key: "edit",  label: "✎ Edit" },
            { key: "del",   label: "🗑 Delete" },
            { key: "add",   label: "+ Add child" },
        ];
    
        const h = pad * 2 + items.length * rowH;
    
        menu.append("rect")
            .attr("class", "uml-item-menu-bg")
            .attr("x", 0).attr("y", 0)
            .attr("width", w).attr("height", h)
            .attr("rx", 7)
            .attr("fill", "rgba(20,20,20,0.92)")
            .attr("stroke", "rgba(255,255,255,0.15)")
            .attr("stroke-width", 1);
    
        items.forEach((it, i) => {
            const rowTop = pad + i * rowH;
    
            menu.append("rect")
                .attr("class", "uml-item-menu-action")
                .attr("data-action", it.key)
                .attr("x", 4).attr("y", rowTop)          // ✅ без -12
                .attr("width", w - 8).attr("height", rowH)
                .attr("rx", 4)
                .attr("fill", "transparent")
                .style("cursor", "pointer");
    
            menu.append("text")
                .attr("class", "uml-item-menu-action")
                .attr("data-action", it.key)
                .attr("x", 10)
                .attr("y", rowTop + rowH / 2)            // ✅ центр строки
                .attr("fill", "#fff")
                .style("font-size", "11px")
                .style("dominant-baseline", "middle")    // ✅
                .style("pointer-events", "none")         // ✅
                .text(it.label);
        });
    
        this._itemMenu = {
            el: menu.node(),
            sel: menu,
            w, h,
            open: false,
            ctx: null,
        };
    },

    _openItemMenuAt(triggerEl) {
        this.ensureSharedItemMenu();
    
        const nodeId  = triggerEl.getAttribute("data-node-id");
        const fieldId = triggerEl.getAttribute("data-field-id");
        const subId   = triggerEl.getAttribute("data-sub-id") || "";
    
        // позиция меню: чуть ниже и правее триггера, координаты -> в систему this.svg
        const r = triggerEl.getBoundingClientRect();
        const anchor = this.clientToGroupPoint(r.left, r.bottom);
    
        // закрыть если уже открыто на этом же элементе
        if (this._itemMenu.open &&
            this._itemMenu.ctx &&
            this._itemMenu.ctx.nodeId === nodeId &&
            this._itemMenu.ctx.fieldId === fieldId &&
            this._itemMenu.ctx.subId === subId) {
            this._closeItemMenu();
            return;
        }
    
        // показать
        this._itemMenu.ctx = { nodeId, fieldId, subId, anchorEl: triggerEl };
        this._itemMenu.sel
            .attr("transform", `translate(${anchor.x + 4},${anchor.y + 2})`)
            .style("display", "block");
    
        this._itemMenu.open = true;
    
        // ВАЖНО: слушатель document только пока меню открыто (минимум нагрузки)
        if (!this._onDocMenuClose) {
            this._onDocMenuClose = (ev) => {
                // если кликнули по самому меню или по триггеру — не закрываем
                if (!this._itemMenu?.open) return;
                if (this._itemMenu.el?.contains(ev.target)) return;
                if (ev.target?.closest?.(".uml-item-menu-trigger")) return;
                this._closeItemMenu();
            };
        }
        document.addEventListener("pointerdown", this._onDocMenuClose, true);
    },

    _closeItemMenu() {
        if (!this._itemMenu?.open) return;
        this._itemMenu.sel.style("display", "none");
        this._itemMenu.open = false;
        this._itemMenu.ctx = null;
    
        document.removeEventListener("pointerdown", this._onDocMenuClose, true);
    }
};
