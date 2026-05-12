import { linkRegistry } from '../registries/linkRegistry.js';

export const linkingMethods = {
    _resolveLinkApi(ctx = {}) {
        // основной путь — registry по ключу
        if (this.linkKeys?.api) {
            return linkRegistry.api(this.linkKeys.api, { diagram: this, ...ctx });
        }
        // fallback если ключа нет
        return {
            create: this.createLinkEndpoint || "/uml/add/link",
            delete: this.deleteLinkEndpoint || "/uml/delete/link",
        };
    },

    async persistCreatedLink(linkData) {
        try {
            const payload = {
                pipeId: this.procId,
                link: {
                    linkType: linkData.linkType || "flow",
                    source: linkData.source,
                    target: linkData.target,
                },
            };
    
            // const r = await req(this.createLinkEndpoint, payload);
            const api = this._resolveLinkApi({ kind: "createLink", linkData });
            const r = await req(api.create, payload);
    
            // если сервер вернул id — сохраним в локальном объекте
            if (r?.id) linkData.id = r.id;
    
            return r;
        } catch (e) {
            console.error("persistCreatedLink failed:", e);
    
            // откат локально
            const idx = this.links.indexOf(linkData);
            if (idx !== -1) this.links.splice(idx, 1);
    
            // убрать линию из DOM (перебиндить data)
            this.linkSelection = this.svg.selectAll(".uml-link").data(this.links);
            this.linkSelection.exit().remove();
            this.safeUpdateLinks(true);
    
            throw e;
        }
    },

    _scheduleHideLinkTrash() {
        if (this._hideTrashTimer) clearTimeout(this._hideTrashTimer);
        this._hideTrashTimer = setTimeout(() => this._hideLinkTrash(), 350);
    },

    ensureSharedLinkTrash() {
        if (this._linkTrash) return;
    
        const root = this.svg; // <g id="zoom...">
        const g = root.append("g")
            .attr("class", "uml-link-trash")
            .style("display", "none")
            .style("pointer-events", "all");
        g.select("circle").style("cursor", "pointer");
        g.select("text").style("cursor", "pointer");
        g.on("click", async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await this._onLinkTrashClick();
        });
    
        g.on("mouseenter", () => {
            if (this._hideTrashTimer) clearTimeout(this._hideTrashTimer);
        });
        g.on("mouseleave", () => {
            this._scheduleHideLinkTrash();
        });
    
        g.append("circle")
            .attr("r", 10)
            .attr("fill", "rgba(20,20,20,0.92)")
            .attr("stroke", "rgba(255,255,255,0.2)")
            .attr("stroke-width", 1)
            .style("cursor", "pointer");
    
        g.append("text")
            .attr("text-anchor", "middle")
            .attr("y", 4)
            .attr("fill", "#fff")
            .style("font-size", "12px")
            .text("🗑")
            .style("pointer-events", "none");
    
        this._linkTrash = { sel: g, open: false };
    },

    _hideLinkTrash() {
        if (!this._linkTrash?.open) return;
        this._linkTrash.sel.style("display", "none");
        this._linkTrash.open = false;
    },

    async _onLinkTrashClick() {
        const link = this._linkTrash?.ctx;
        if (!link) return;
    
        try {
            // await req(this.deleteLinkEndpoint, { pipeId: this.procId, link: { source: link.source, target: link.target} });
            const api = this._resolveLinkApi({ kind: "deleteLink", linkData: link });
            await req(api.delete, {pipeId: this.procId, link: {
                    source: link.source,
                    target: link.target,
                }
            });
            // самый надёжный вариант, чтобы не ловить баги ключей/данных:
            this._hideLinkTrash();
            this._activeLinkEl = null;
            await this.refreshFromServer();
        } catch (e) {
            console.error("delete link failed:", e);
        }
    },

    safeUpdateLinks(force = false) {
        // не трогаем, пока лайаут не готов (вкладка скрыта/контейнер 0x0)
        if (!force && !this.isLayoutReady()) {
            if (!this._debounced) {
                this._debounced = requestAnimationFrame(() => {
                    this._debounced = null;
                    this.safeUpdateLinks(false);
                });
            }
            return;
        }
        this.updateLinks();
    },

    updateLinks() {
        const that = this;
    
        this.linkSelection.attr("d", function(d) {
            const sourceId = typeof d.source === 'object' ? d.source.node : d.source;
            const targetId = typeof d.target === 'object' ? d.target.node : d.target;
    
            const sourceNode = that.nodes?.find(n => String(n.id) === String(sourceId));
            const targetNode = that.nodes?.find(n => String(n.id) === String(targetId));
    
            if (!sourceNode || !targetNode) return null;
    
            const pref = that._uid;
    
            let sourceConnectorId = d.source && d.source.sub
                ? `node-${pref}-${sourceId}-connector-out-${d.source.field}-${d.source.sub}`
                : `node-${pref}-${sourceId}-connector-out-${d.source.field}`;
    
            let targetConnectorId = d.target && d.target.sub
                ? `node-${pref}-${targetId}-connector-in-${d.target.field}-${d.target.sub}`
                : `node-${pref}-${targetId}-connector-in-${d.target.field}`;
    
            let sourceConnector = document.getElementById(sourceConnectorId);
            let targetConnector = document.getElementById(targetConnectorId);
    
            let startPos = null;
            let endPos = null;
    
            // Try connector position first, then fallback to calculated position
            if (sourceConnector) {
                startPos = that.getConnectorPosition(sourceConnector);
            }
            if (!startPos) {
                startPos = that.getItemPosition(sourceNode, d.source.field, "outgoing", d.source.sub);
            }
    
            if (targetConnector) {
                endPos = that.getConnectorPosition(targetConnector);
            }
            if (!endPos) {
                endPos = that.getItemPosition(targetNode, d.target.field, "incoming", d.target.sub);
            }
    
            if (!startPos || !endPos) {
                // If we still don't have positions, try to recalculate after a delay
                setTimeout(() => {
                    that.forceCoordinateUpdate();
                    that.safeUpdateLinks(true);
                }, 50);
                return null;
            }
    
            // Shorten line for arrow placement
            const shorten = 5;
            let dx = endPos.x - startPos.x;
            let dy = endPos.y - startPos.y;
            let len = Math.sqrt(dx * dx + dy * dy);
    
            if (len > 0) {
                endPos.x -= (dx / len) * shorten;
                endPos.y -= (dy / len) * shorten;
            }
    
            let midX = (startPos.x + endPos.x) / 2;
            let curveOffset = Math.abs(startPos.y - endPos.y) / 2 + 30;
    
            return `M ${startPos.x} ${startPos.y} C ${midX} ${startPos.y - curveOffset}, ${midX} ${endPos.y + curveOffset}, ${endPos.x} ${endPos.y}`;
        })
            .each((d, i, nodesArr) => {
                const srcId = (typeof d.source === 'object' && d.source) ? d.source.node : d.source;
                const sourceNode = that.nodes?.find(n => String(n.id) === String(srcId));
                const color = (sourceNode && sourceNode.lineColor) ? sourceNode.lineColor : "#7da4ec";
    
                d3.select(nodesArr[i])
                    .style("stroke", color, "important")
                    // .style("stroke-width", "2.5")
                    .style("fill", "none")
                    .style("opacity", "1")
                    .style("display", "inline")
                    .style("stroke-linecap", "round")
                    .style("stroke-linejoin", "round")
                    .attr("pointer-events", "stroke");
    
            });
    },

    dragStart(event, d, element) {
        console.log("dragStart", d);
        d3.select(element).style("cursor", "grabbing");
        d3.select(element).raise();
    },

    dragging(event, d, element) {
        console.log("dragging", d);
        d.x = event.x;
        d.y = event.y;
        d3.select(element).attr("transform", `translate(${d.x},${d.y})`);
        this.safeUpdateLinks();
    },

    dragEnd(event, d, element) {
        console.log("dragEnd", d);
        d3.select(element).style("cursor", "grab");
        this.safeUpdateLinks();
        this.linkSelection.raise();
    },

    startLink(event, node, fieldId, port, subId, customPos) {
        event.stopPropagation();
        const self = this;
        // Если subId передан, используем его для расчёта позиции
        let startPos = customPos ? customPos : ((subId !== undefined)
            ? self.getItemPosition(node, fieldId, port, subId)
            : self.getItemPosition(node, fieldId, port));
        self.tempLink = this.svg.append("path")
            .attr("class", "temp-link")
            .attr("stroke", "#7da4ec")
            .attr("stroke-width", 4)
            .attr("fill", "none")
            .attr("filter", `url(#${this.ids.glow})`);
        self.tempLink.raise();
        // Формируем объект источника.
        // Если subId передан (то есть связь начинается от вложённого элемента),
        // то в source.field используем родительский id (fieldId),
        // а sub – собственный id вложённого элемента (subId)
        let sourceData = { node: node.id, field: fieldId };
        if (subId !== undefined) {
            sourceData.sub = subId;
        }
        if (customPos) {
            sourceData.customPos = customPos;
        }
        self.tempLink.datum({ source: sourceData });
        d3.select(document)
            .on("mousemove.tempLink", function(event) {
                // let mousePos = d3.pointer(event);
                if (!self.tempLink) return;
                // let mousePos = d3.pointer(event, self.svg.node());
                // self.tempLink.attr("d", `M ${startPos.x} ${startPos.y} C ${(startPos.x + mousePos[0]) / 2} ${startPos.y}, ${(startPos.x + mousePos[0]) / 2} ${mousePos[1]}, ${mousePos[0]} ${mousePos[1]}`);
    
                const { clientX, clientY } = event;
                const mp = self.clientToGroupPoint(clientX, clientY);
                 self.tempLink.attr("d", `M ${startPos.x} ${startPos.y} C ${(startPos.x + mp.x) / 2} ${startPos.y}, ${(startPos.x + mp.x) / 2} ${mp.y}, ${mp.x} ${mp.y}`);
            })
            .on("mouseup.tempLink", function() {
                if (self.tempLink) {
                    self.tempLink.remove();
                    self.tempLink = null;
                }
                d3.select(document).on("mousemove.tempLink", null)
                    .on("mouseup.tempLink", null);
                // Если вы временно отключали pointer-events у нод, не забудьте их вернуть
                self.svg.selectAll(".node-group").style("pointer-events", null);
            });
        self.svg.selectAll(".node-group").style("pointer-events", "none");
        self.svg.selectAll(".node-group").raise();
    },

    endLink(event, node, fieldId, port, sub, customPos) {
        const self = this;
        // port здесь будет "incoming"
        event.stopPropagation();
        if (!this.tempLink) return;
        let linkData = this.tempLink.datum();
        linkData.target = { node: node.id, field: fieldId };
        if (sub) {
            linkData.target.sub = sub;
        }
        // Если customPos передан, сохраняем его в target для использования в updateLinks
        if (customPos) {
            linkData.target.customPos = customPos;
        }
        this.links.push(linkData);
        this.persistCreatedLink(linkData);
        this.tempLink.remove();
        this.tempLink = null;
        this.svg.on("mousemove", null);
        this.svg.on("mouseup", null);
    
        this.linkSelection = this.svg.selectAll(".uml-link").data(this.links);
        this.linkSelection.exit().remove();
        if(!this.isHalloLines) {
            this.linkSelection = this.linkSelection.enter()
                .append("path")
                .attr("class", "uml-link")
                .attr("marker-end", `url(#${this.markerId})`)
        } else {
            this.linkSelection = this.linkSelection.enter()
                .append("path")
                .attr("class", "uml-link")
                .style("fill", "none", "important")
                .style("display", "inline", "important")
                .attr("pointer-events", "stroke")
                .attr("marker-end", `url(#${this.markerId})`)
                .attr("filter", `url(#${this.ids.glow})`)        // <<<<< добавить
                .style("fill", "none", "important")
                .style("stroke-linecap", "round")
                .merge(this.linkSelection);
    
            // const self2 = this;
            // this.linkSelection
            //     .on("mouseenter", function() {
            //         d3.select(this).attr("filter", `url(#${self2.ids.glowStrong})`).attr("stroke-width", 3.5);
            //     })
            //     .on("mouseleave", function() {
            //         d3.select(this).attr("filter", `url(#${self2.ids.glow})`).attr("stroke-width", 2.5);
            //     });
        }
    
        this.safeUpdateLinks();
        console.log("New link:", this.links);
    }
};
