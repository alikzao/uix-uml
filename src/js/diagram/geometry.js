export const geometryMethods = {
    fitTextToWidth(textSel, maxWidth, opts = {}) {
        const minFont = opts.minFont || 8;
        const step = opts.step || 0.5;
        let fontSize = +(textSel.attr("data-initial-font") || 12);

        textSel.style("font-size", fontSize + "px");
        while (textSel.node().getComputedTextLength() > maxWidth && fontSize > minFont) {
            fontSize = Math.max(minFont, fontSize - step);
            textSel.style("font-size", fontSize + "px");
        }

        if (textSel.node().getComputedTextLength() > maxWidth) {
            const full = textSel.attr("data-full-text") || textSel.text();
            let lo = 0, hi = full.length;
            let best = 0;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                textSel.text(full.slice(0, mid) + "…");
                if (textSel.node().getComputedTextLength() <= maxWidth) {
                    best = mid; lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            textSel.text(full.slice(0, best) + "…");
        }
    },

    clientToGroupPoint(clientX, clientY) {
        const svgRoot = this.getEl('svg');
        const groupEl = this.svg?.node();
        if (!svgRoot) return null;
        const pt = svgRoot.createSVGPoint();
        pt.x = clientX; pt.y = clientY;
        // Если группа уже есть — переводим в её систему координат,
            // иначе хотя бы в систему svg (на ранней стадии монтирования)
                const m = (groupEl && groupEl.getScreenCTM) ? groupEl.getScreenCTM() : svgRoot.getScreenCTM();
        if (!m) return null;
        const inv = m.inverse();
        const sp = pt.matrixTransform(inv);
        return { x: sp.x, y: sp.y };
    },

    _closestPointOnPath(pathEl, x, y, samples = 30) {
        const L = pathEl.getTotalLength();
        let best = { t: 0, d2: Infinity, p: null };
    
        for (let i = 0; i <= samples; i++) {
            const t = (i / samples) * L;
            const p = pathEl.getPointAtLength(t);
            const dx = p.x - x, dy = p.y - y;
            const d2 = dx*dx + dy*dy;
            if (d2 < best.d2) best = { t, d2, p };
        }
    
        // уточняем вокруг лучшего t
        const step = L / samples;
        for (let dt = -step; dt <= step; dt += step/5) {
            const t = Math.max(0, Math.min(L, best.t + dt));
            const p = pathEl.getPointAtLength(t);
            const dx = p.x - x, dy = p.y - y;
            const d2 = dx*dx + dy*dy;
            if (d2 < best.d2) best = { t, d2, p };
        }
    
        return { ...best, L };
    },

    isLayoutReady() {
        const svgRoot = this.getEl('svg');
        if (!svgRoot) return false;
        const r = svgRoot.getBoundingClientRect();
        // видим и ненулевые размеры
        return r.width > 0 && r.height > 0 && document.visibilityState === 'visible';
    },

    clientToSvgPoint(clientX, clientY) {
        const svgRoot = this.getEl('svg');
        const pt = svgRoot.createSVGPoint();
        pt.x = clientX; pt.y = clientY;
        const ctm = svgRoot.getScreenCTM();
        if (!ctm) return { x: 0, y: 0 };
        const inv = ctm.inverse();
        const sp = pt.matrixTransform(inv);
        return { x: sp.x, y: sp.y };
    },

    getItemPosition(node, fieldId, port, subId) {
        let f = node.fields.find(item => item.id == fieldId);
        if (subId && f.children) {
            let subItem = f.children.find(child => child.id == subId);
            if (subItem && subItem.absoluteInConnector) {
                return port === "outgoing" ?
                    { x: subItem.absoluteOutConnector.x, y: subItem.absoluteOutConnector.y } :
                    { x: subItem.absoluteInConnector.x, y: subItem.absoluteInConnector.y };
            }
        }
        if (f && f.absoluteInConnector) {
            return port === "outgoing" ?
                { x: f.absoluteOutConnector.x, y: f.absoluteOutConnector.y } :
                { x: f.absoluteInConnector.x, y: f.absoluteInConnector.y };
        }
        return { x: node.x + (port === "outgoing" ? 140 : 10), y: node.y + 40 };
    },

    getConnectorPosition(connectorElement) {
        if (!connectorElement) {
            console.warn('Connector element is null');
            return null;
        }
        // Wait for element to be visible and have dimensions
        const r = connectorElement.getBoundingClientRect();
        // console.log('Connector rect:', r, 'ID:', connectorElement.id);
    
        if (!r || (r.width === 0 && r.height === 0)) {
            // Element not ready, return fallback position
            return null;
        }
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        // Ensure we have valid coordinates
        if (isNaN(cx) || isNaN(cy)) return null;
        return this.clientToGroupPoint(cx, cy);
    }
};
