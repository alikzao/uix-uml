export const nodeMethods = {
    applyNodeFields(nodeId, nodeFields) {
        const node = this.nodes?.find(n => String(n.id) === String(nodeId));
        if (!node) return;
    
        node.fields = Array.isArray(nodeFields) ? nodeFields : [];
    
        this.redrawSingleNode(node);
        this.forceCoordinateUpdate();
        this.safeUpdateLinks(true);
    },

    redrawSingleNode(nodeData) {
        const g = this.svg.selectAll(".node-group")
            .filter(d => String(d.id) === String(nodeData.id));
        if (g.empty()) return;
    
        // важно: не удаляем node-group, только его внутренности (drag останется)
        g.selectAll("*").remove();
    
        // контейнер + header
        this.drawNode(g, nodeData);
    
        // поля
        let currentY = 30;
        (nodeData.fields || []).forEach(field => {
            this.drawItem(g, field, 0, currentY, 140, 0, nodeData);
            currentY += this.computeItemHeight(field) + this.gap;
        });
    
        nodeData.width = 140;
        nodeData.height = currentY + 10;
    },

    reRenderNode(nodeData) {
        // Снова считаем суммарную высоту и позицию (newY) каждого верхнеуровневого поля
        let currentY = 30;
        nodeData.fields.forEach(f => {
            f.newY = currentY;
            f.computedY = currentY + this.baseItemHeight / 2;
            currentY += this.computeItemHeight(f) + this.gap;
        });
        nodeData.totalHeight = currentY + 10;
        // Обновляем абсолютные координаты коннекторов
        // Находим группу ноды
        let nodeGroup = this.svg.selectAll(".node-group").filter(d => d.id === nodeData.id);
        // Анимируем изменение высоты «рамки» ноды
        nodeGroup.select(".node-container")
            .transition()
            .duration(500)
            .attr("height", nodeData.totalHeight);
        // Достаём группы .field-group, но только те, что соответствуют верхнеуровневым полям nodeData.fields
        let fieldGroups = nodeGroup.selectAll(".field-group").filter(d => nodeData.fields.includes(d));
        // d здесь – это сам объект field, т.к. в drawItem вы сделали .datum(field)
        // Сортируем и анимируем только эти верхнеуровневые поля
        fieldGroups.sort((a, b) => nodeData.fields.indexOf(a) - nodeData.fields.indexOf(b))
            .transition()
            .duration(500)
            .attr("transform", d => `translate(0, ${d.newY})`)
            .on("end", this.updateLinks);
        this.svg.selectAll(".connector.incoming").raise();
        this.svg.selectAll(".connector.outgoing").raise();
    },

    drawNode(group, nodeData) {
        // 1) Считаем суммарную высоту ноды
        // Для каждого поля: базовая высота = 25, если есть children — добавляем по 25 на каждую вложенную строку
        let offsetY = 30; // 30 пикселей под заголовок
        let totalHeight = 30; // Начинаем с высоты заголовка
    
        nodeData.fields.forEach((field) => {
            let fieldHeight = this.computeItemHeight(field);
            // Для коннекторов используем центр шапки, который всегда 25 пикселей высотой
            field.computedY = offsetY + this.baseItemHeight / 2;
            offsetY += fieldHeight + this.gap;
            totalHeight += fieldHeight + this.gap;
        });
    
        totalHeight += 10; // небольшой отступ снизу
        nodeData.totalHeight = totalHeight;
    
        // 2) Рисуем «контейнер» ноды (как на вашем скриншоте — цветная рамка)
        // цвет рамки/фона по типу триггера у НОДЫ
        const kind = (String(nodeData.type||'').toLowerCase() === 'trigger')
            ? String(nodeData.triggerTypes || '').toLowerCase()   // 'internal' | 'external' | ''
            : null;
    
        let containerStroke = "#D66FFF";              // дефолт как было
        let containerFill   = "rgba(255,0,255,0.10)"; // дефолт как было
    
        if (kind === 'internal') {
            containerStroke = "#2e8b57";                // зелёный
            containerFill   = "rgba(46,139,87,0.10)";
        } else if (kind === 'external') {
            containerStroke = "#2b6cb0";                // синий
            containerFill   = "rgba(43,108,176,0.10)";
        }
    
        group.append("rect")
            .attr("class", "node-container")
            .attr("width", 140)
            .attr("height", totalHeight)
            .attr("rx", 10)
            .attr("fill", containerFill)
            .attr("stroke", containerStroke)
            .attr("stroke-width", 2);
    
        // this.drawNodeHeader(group, nodeData);
        this.drawNodeHeader(group, nodeData);
    },

    drawNodeHeader(group, nodeData) {
        const headerHeight = 20; // высота шапки
        const width = 140;       // ширина шапки
        const r = 10;            // радиус скругления для верхних углов
        group.select("g.node-header").remove();
        group.selectAll("g.node-header").remove();
        // Создаем группу для шапки
        const headerGroup = group.append("g").attr("class", "node-header");
        // Определяем путь для шапки с округлением только сверху
        const pathData = ` M0,${headerHeight} L0,${r} A${r},${r} 0 0 1 ${r},0 L${width - r},0 A${r},${r} 0 0 1 ${width},${r} L${width},${headerHeight} Z `;
        // Рисуем фон шапки с градиентом и прозрачностью
        headerGroup.append("path")
            .attr("d", pathData)
            .attr("fill", `url(#${this.ids.gradBruin})`)
            .attr("fill-opacity", 0.2); // задайте нужное значение прозрачности
        // const titleRaw = String(nodeData.id);
    
        // нужно чтобы текст обризался перед иконками и не налезал на них
        const leftPad  = 8;
        const rightPad = 24; // место под ✎ 🗑 + (подгони 40..55)
        const clipId = `uml-title-clip-${this._uid}-${nodeData.id}`;
        const defs = this.svg.select("defs");
        defs.select(`#${clipId}`).remove();
        defs.append("clipPath")
            .attr("id", clipId)
            .append("rect")
            .attr("x", leftPad)
            .attr("y", 0)
            .attr("width", (width - leftPad - rightPad)-5)
            .attr("height", headerHeight);
    
    
        const titleRaw = String((nodeData.label ?? '').trim() || nodeData.id);
        const textEl = headerGroup.append("text")
            // .attr("class", "node-title")
            .attr("x", width / 2)
            .attr("x", 8)
            .attr("y", headerHeight / 2 + 6)
            // .attr("text-anchor", "middle")
            .attr("text-anchor", "start")
            .attr("clip-path", `url(#${clipId})`)
            .attr("fill", "#fff")
            .attr("data-initial-font", 12)    // базовый размер
            .attr("data-full-text", titleRaw) // сохраняем исходный
            .style("font-weight", 600)
            .text(titleRaw);
        // подсказка с полным id при наведении
        textEl.append("title").text(titleRaw);
    
        const maxTextWidth = width - leftPad - rightPad;
        // подгоняем, чтобы влезло
        this.fitTextToWidth(textEl, maxTextWidth);
    
    
        // Иконка редактирования (без логики)
        headerGroup.append("text")
            .attr("class", "uml-node-menu-trigger")
            .attr("data-node-id", nodeData.id)
            .attr("x", width - 10)
            .attr("y", headerHeight / 2 + 6)
            .attr("text-anchor", "end")
            .attr("fill", "#fff")
            .style("cursor", "pointer")
            .style("font-size", "14px")
            .text("⋮");
    }
};
