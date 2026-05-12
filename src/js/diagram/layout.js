export const layoutMethods = {
    assignCoordinates(nodes, links) {
        // базовые размеры
        const baseNodeWidth = 150;
        const baseNodeHeight = 100;
    
        // высоты/ширины нод
        nodes.forEach(node => {
            node.computedWidth = baseNodeWidth;
            if (node.fields && node.fields.length > 0) {
                let total = 0;
                node.fields.forEach((f, i) => {
                    total += this.computeItemHeight(f);
                    if (i < node.fields.length - 1) total += this.gap;
                });
                node.computedHeight = total;
            } else {
                node.computedHeight = baseNodeHeight;
            }
        });
    
        // степени
        const degreeMap = {};
        nodes.forEach(n => degreeMap[n.id] = { in: 0, out: 0 });
        for (let i = 0; i < links.length; i++) {
            const l = links[i];
            const sId = typeof l.source === 'object' && l.source.node ? l.source.node : l.source;
            const tId = typeof l.target === 'object' && l.target.node ? l.target.node : l.target;
            if (degreeMap[sId]) degreeMap[sId].out++;
            if (degreeMap[tId]) degreeMap[tId].in++;
        }
        nodes.forEach(n => {
            const d = degreeMap[n.id] || { in: 0, out: 0 };
            n.inDegree = d.in; n.outDegree = d.out; n.diff = d.out - d.in;
        });
    
        // триггеры
        const externalTriggers = nodes.filter(n => this.getTriggerKind(n) === 'external');
        const internalTriggers = nodes.filter(n => this.getTriggerKind(n) === 'internal');
        const triggerIds = new Set([...externalTriggers, ...internalTriggers].map(n => n.id));
        const rest = nodes.filter(n => !triggerIds.has(n.id));
    
        // группировка остальных
        const sources = rest.filter(n => n.inDegree === 0 && n.outDegree > 0).sort((a, b) => b.outDegree - a.outDegree);
        const sinks   = rest.filter(n => n.outDegree === 0 && n.inDegree > 0).sort((a, b) => a.inDegree - b.inDegree);
        const intermediates = rest.filter(n =>
            !((n.inDegree === 0 && n.outDegree > 0) || (n.outDegree === 0 && n.inDegree > 0))
        ).sort((a, b) => a.diff - b.diff);
    
        const horizontalMargin = 50;
        const verticalMargin   = 60;
        const maxWidth = Math.max(...nodes.map(n => n.computedWidth));
        const colX = (col) => col * (maxWidth + horizontalMargin);
    
        // helpers с учётом startY
        function assignGroupGrid(groupNodes, startColumn, startY){
            if (!groupNodes.length) return 0;
            const rows    = Math.ceil(Math.sqrt(groupNodes.length));
            const columns = Math.ceil(groupNodes.length / rows);
            let currentY = startY;
            for (let r = 0; r < rows; r++){
                const rowNodes = groupNodes.slice(r*columns, (r+1)*columns);
                const rowMaxH  = Math.max(...rowNodes.map(n => n.computedHeight));
                rowNodes.forEach((node, i) => {
                    const col = i;
                    node.x = colX(startColumn + col);
                    node.y = currentY;
                });
                currentY += rowMaxH + verticalMargin;
            }
            return columns;
        }
    
        function assignGroupColumn(groupNodes, columnIndex, startY){
            if (!groupNodes.length) return;
            let curY = startY;
            groupNodes.forEach(n => {
                n.x = colX(columnIndex);
                n.y = curY;
                curY += n.computedHeight + verticalMargin;
            });
        }
    
        // ===== NEW: helpers для колонок по sort =====
        function groupBySort(nodesArr){
            const map = new Map();
            nodesArr.forEach(n => {
                if (Number.isFinite(n.sort)) {
                    const s = Number(n.sort);
                    if (!map.has(s)) map.set(s, []);
                    map.get(s).push(n);
                }
            });
            return map;
        }
        function assignSortColumns(sortMap, startColumn, startY){
            // sort-значения слева направо по возрастанию
            const keys = Array.from(sortMap.keys()).sort((a,b)=>a-b);
            let col = startColumn;
            keys.forEach(k => {
                const colNodes = sortMap.get(k);
                // одна колонка на одно значение sort (вертикальный стек)
                assignGroupColumn(colNodes, col, startY);
                col += 1;
            });
            return col - startColumn; // сколько колонок заняли
        }
    
        // ===== ВЕРХ: внутренние триггеры БЕЗ sort — сеткой =====
        let internalRowHeight = 0;
        const internalTop = internalTriggers.filter(n => !Number.isFinite(n.sort));
        if (internalTop.length){
                 const topRows = Math.ceil(Math.sqrt(internalTop.length));
                 const topCols = Math.ceil(internalTop.length / topRows);
                 let currentY  = 0;
                 for (let r = 0; r < topRows; r++){
                         const rowNodes = internalTop.slice(r*topCols, (r+1)*topCols);
                         const rowMaxH  = Math.max(...rowNodes.map(n => n.computedHeight));
                         rowNodes.forEach((n, i) => {
                                 n.x = colX(i);
                                 n.y = currentY;
                             });
                         currentY += rowMaxH + verticalMargin;
                     }
                 internalRowHeight = currentY;
             }
    
             // ===== ЛЕВО: внешние триггеры БЕЗ sort — одной колонкой =====
        const externalLeft = externalTriggers.filter(n => !Number.isFinite(n.sort));
         const leftColumnsUsed = externalLeft.length ? 1 : 0;
         if (externalLeft.length) assignGroupColumn(externalLeft, 0, internalRowHeight);
    
         // ===== КОЛОНКИ ПО sort: триггеры с sort → сверху своей колонки, затем узлы с тем же sort =====
             const trigWithSort = [...internalTriggers, ...externalTriggers].filter(n => Number.isFinite(n.sort));
         const nonTriggerWithSort = rest.filter(n => Number.isFinite(n.sort)); // rest — это НЕ триггеры
    
             // sort -> массив узлов
                 const bySortTrig = Object.create(null);
         const bySortBody = Object.create(null);
         for (const n of trigWithSort){
                 const k = Number(n.sort);
                 (bySortTrig[k] ||= []).push(n);
             }
         for (const n of nonTriggerWithSort){
                 const k = Number(n.sort);
                 (bySortBody[k] ||= []).push(n);
             }
    
             // ключи sort слева-направо
                 let currentColumn = leftColumnsUsed;
         const sortKeys = Array.from(new Set([
                 ...Object.keys(bySortTrig).map(Number),
                 ...Object.keys(bySortBody).map(Number)
             ])).sort((a,b)=>a-b);
    
             for (const k of sortKeys){
                 const columnNodes = [
                         ...(bySortTrig[k] || []), // "шапка" — триггеры с этим sort
                         ...(bySortBody[k] || [])  // тело — обычные узлы с этим sort
                     ];
                 if (columnNodes.length){
                         assignGroupColumn(columnNodes, currentColumn, internalRowHeight);
                         currentColumn += 1;
                     }
             }
    
        // ===== ОСТАЛЬНЫЕ: справа от левой колонки, под верхним блоком =====
        // 2.1 Сначала рисуем колонки по sort (слева → направо по возрастанию sort)
        // const sortGroups = groupBySort(restWithSort);
        currentColumn = leftColumnsUsed;
        let used = 0;

        // 2.2 Узлы без sort — как раньше: sources → intermediates → sinks (гридом)
        used = assignGroupGrid(sources.filter(n => !Number.isFinite(n.sort)), currentColumn, internalRowHeight);
        currentColumn += used;
        used = assignGroupGrid(intermediates.filter(n => !Number.isFinite(n.sort)), currentColumn, internalRowHeight);
        currentColumn += used;
        used = assignGroupGrid(sinks.filter(n => !Number.isFinite(n.sort)), currentColumn, internalRowHeight);
        currentColumn += used;
        // габариты и нормализация в +область
        let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
        nodes.forEach(n=>{
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.computedWidth);
            maxY = Math.max(maxY, n.y + n.computedHeight);
        });
        const margin = 60;
        const shiftX = (isFinite(minX) ? -minX : 0) + margin/2;
        const shiftY = (isFinite(minY) ? -minY : 0) + margin/2;
        nodes.forEach(n => { n.x += shiftX; n.y += shiftY; });
    
        // пересчёт bbox после сдвига
        minX=Infinity; minY=Infinity; maxX=-Infinity; maxY=-Infinity;
        nodes.forEach(n=>{
            minX = Math.min(minX, n.x);
            minY = Math.min(minY, n.y);
            maxX = Math.max(maxX, n.x + n.computedWidth);
            maxY = Math.max(maxY, n.y + n.computedHeight);
        });
    
        const diagramWidth  = (maxX - minX) + margin;
        const diagramHeight = (maxY - minY) + margin;
    
        return { nodes, links, diagramWidth, diagramHeight };
    },

    isTriggerNode(node){
        if (!node) return false;
        const t = String(node.type || '').toLowerCase();
        const kind = String(node.triggerTypes || '').toLowerCase();
        return t === 'trigger' && (kind === 'internal' || kind === 'external');
    },

    getTriggerKind(node){
        if (!this.isTriggerNode(node)) return null;
        return String(node.triggerTypes).toLowerCase(); // 'internal' | 'external'
    }
};
