export const itemMethods = {
    computeItemHeight(field) {
        // 1) Дополнительные отступы сверху и снизу (по 1px)
        const extraMargin = 1;
        // 2) Толщина жирной границы (если есть дети)
        const borderThickness = 3;
        if (field.children && field.children.length > 0) {
            let childrenTotal = 0;
            field.children.forEach((child, i) => {
                childrenTotal += this.computeItemHeight(child);
                if (i < field.children.length - 1) {
                    childrenTotal += this.gap; // отступ между детьми
                }
            });
            // 3) Итоговая высота родительского айтема:
            //    базовая шапка (25) + gap между шапкой и первым ребёнком +
            //    суммарная высота детей + 2 пикселя сверху/снизу + 3 пикселя под «жирную» границу
            return this.baseItemHeight + this.gap + childrenTotal + extraMargin + borderThickness;
        } else {
            // 4) У айтема без детей: базовая высота + 2 пикселя (верх+низ)
            return this.baseItemHeight + extraMargin;
        }
    },

    drawItem(group, item, x, y, parentWidth, level = 0, nodeData) {
        const self = this;
        const basePadding = 10;
        const padding = basePadding + level * 5;
        const fieldWidth = parentWidth - 2 * padding;
        let fieldHeight = this.computeItemHeight(item);
        const itemKey = item.id ?? item._id ?? item.key;
        if (itemKey == null) {
            console.warn("Item has no id/_id/key", item);
        }
        // Создаем группу для айтема и привязываем к ней объект item
        let fieldGroup = group.append("g")
            .attr("class", "field-group")
            .attr("transform", `translate(0, ${y})`)
            .datum(item);
        // Сохраняем локальные координаты коннекторов и computedY
        // (x здесь – как передано, обычно 0 для верхнего уровня)
        item.inConnectorX = x + padding;                // слева
        item.outConnectorX = x + padding + fieldWidth;    // справа
        item.computedY = y + this.baseItemHeight / 2;            // центр шапки
        item.level = level;
    
        // Применяем перетаскивание айтема (оставляем существующую логику drag)
        fieldGroup.call(d3.drag()
            .filter((event) => {
                const t = event.target;
                if (t?.closest?.('.uml-item-menu-trigger')) return false;
                if (t?.closest?.('.uml-item-menu')) return false;
                if (t?.closest?.('.connector')) return false;
                return true;
            })
            .on("drag", function(event) {
                let currentTransform = d3.select(this).attr("transform");
                let currentY = parseFloat(currentTransform.replace(/translate\(0,\s*([^)]+)\)/, "$1"));
                let newY = currentY + event.dy;
                let minY = 30;  // например, ниже заголовка ноды
                let maxY = nodeData.totalHeight - self.computeItemHeight(item);
                newY = Math.max(minY, Math.min(newY, maxY));
                d3.select(this).attr("transform", `translate(0, ${newY})`);
                item.computedY = newY + self.baseItemHeight / 2;
                self.safeUpdateLinks();
            })
            .on("end", function(event) {
                let currentTransform = d3.select(this).attr("transform");
                let finalY = parseFloat(currentTransform.replace(/translate\(0,\s*([^)]+)\)/, "$1"));
                item.computedY = finalY + self.baseItemHeight / 2;
                // Обновление порядка айтемов и перерисовка ноды
                // (здесь оставляем вашу логику обновления порядка)
                let parentArray = nodeData.fields;
                let oldIndex = parentArray.findIndex(f => f.id === item.id);
                let cumulative = 30;
                let newIndex = 0;
                for (let i = 0; i < parentArray.length; i++) {
                    let f = parentArray[i];
                    let h = self.computeItemHeight(f);
                    let mid = cumulative + h / 2;
                    if (finalY >= mid) {
                        newIndex = i + 1;
                    }
                    cumulative += h + self.gap;
                }
                if (newIndex !== oldIndex) {
                    let movedField = parentArray.splice(oldIndex, 1)[0];
                    parentArray.splice(newIndex, 0, movedField);
                }
                self.reRenderNode(nodeData);
            })
        );
    
        // Рисуем границу айтема (контейнер)
        fieldGroup.append("rect")
            .attr("x", x + padding)
            .attr("y", 0)
            .attr("width", fieldWidth)
            .attr("height", fieldHeight)
            .attr("fill", "none")
            .attr("stroke", item.children && item.children.length > 0 ? "#f8d40a" : "#888")
            .attr("stroke-width", item.children && item.children.length > 0 ? 3 : 1)
            .attr("rx", 5);
    
        // Рисуем шапку (header)
        fieldGroup.append("rect")
            .attr("x", x + padding)
            .attr("y", 0)
            .attr("width", fieldWidth)
            .attr("height", self.baseItemHeight)
            .attr("fill", item.children && item.children.length > 0
                ? `url(#${this.ids.gradYellow})`
                : `url(#${this.ids.gradGreen})`)
            .attr("rx", 5)
            .attr("ry", 5);
    
    
        // const title = item.id.charAt(0).toUpperCase() + item.id.slice(1);
        // const titleRaw = String(item.id);
        // const titleRaw = String((item.label ?? '').trim() || item.id);
    
        const titleRaw = String((item.label ?? '').trim() || item.id);
    
    // место под текст (слева) и под "⋮" + коннектор (справа)
        const leftPadText  = 8;
        const rightPadText = 24; // было 18 — этого не хватало с "⋮" + кружком
    
    // --- CLIP PATH для header текста айтема ---
        const defs = this.svg.select("defs").empty()
            ? d3.select(this.sel('svg')).append("defs")
            : this.svg.select("defs");
    
    // делаем ID безопасным
        const fieldId = (level > 0) ? item.parentFieldId : item.id;
        const subId   = (level > 0) ? item.id : "";
    
        const clipId = `uml-item-clip-${this._uid}-${nodeData.id}-${fieldId}-${subId || "root"}`;
    
        defs.select(`#${clipId}`).remove();
        defs.append("clipPath")
            .attr("id", clipId)
            .attr("clipPathUnits", "userSpaceOnUse")
            .append("rect")
            .attr("x", x + padding + leftPadText)
            .attr("y", 0)
            .attr("width", Math.max(0, fieldWidth - leftPadText - rightPadText))
            .attr("height", self.baseItemHeight);
    
    // --- TEXT ---
        const textEl = fieldGroup.append("text")
            .attr("class", "field-title")
            .attr("x", x + padding + leftPadText)
            .attr("y", self.baseItemHeight / 2 + 5)
            .attr("text-anchor", "start")
            .attr("clip-path", `url(#${clipId})`)
            .attr("fill", "#fff")
            .attr("data-initial-font", 12)
            .attr("data-full-text", titleRaw)
            .style("font-weight", 600)
            .text(titleRaw);
    
    // tooltip
        textEl.append("title").text(titleRaw);
    
    // подгоняем по ширине ТОЛЬКО доступной области
        const maxTextWidth = Math.max(0, fieldWidth - leftPadText - rightPadText);
        self.fitTextToWidth(textEl, maxTextWidth);
    
    
        // const fieldId = (level > 0) ? item.parentFieldId : item.id;
        // const subId   = (level > 0) ? item.id : "";
    
    // "⋮" слева от outgoing-коннектора
        const kebabX = x + padding + fieldWidth - 14;
        const kebabY = self.baseItemHeight / 2 + 5;
    
        fieldGroup.append("text")
            .attr("class", "uml-item-menu-trigger")
            .attr("data-node-id", nodeData.id)
            .attr("data-field-id", fieldId)
            .attr("data-sub-id", subId)
            .attr("x", kebabX)
            .attr("y", kebabY)
            .attr("text-anchor", "middle")
            .attr("fill", "#fff")
            .style("cursor", "pointer")
            .style("font-size", "14px")
            .text("⋮");
    
        const pref = this._uid;
        // Рисуем исходящий коннектор (справа)
        fieldGroup.append("circle")
            .attr("class", "connector outgoing")
            .attr("id", level > 0
                ? `node-${pref}-${nodeData.id}-connector-out-${item.parentFieldId}-${item.id}`
                : `node-${pref}-${nodeData.id}-connector-out-${item.id}`)
            .attr("cx", x + padding + fieldWidth)
            .attr("cy", self.baseItemHeight / 2)
            .attr("r", 5)
            .attr("fill", "#ff5733")
            .style("cursor", "crosshair")
            .on("mousedown", function(event, d) {
                // Поднимаем узел, которому принадлежит этот коннектор, наверх:
                let nodeGroup = d3.select(this.closest(".node-group"));
                nodeGroup.raise();
                const startPos = self.getConnectorPosition(this); // ✅ учитывает scale, scroll, всё
    
                // Если айтем вложённый, используем данные родительской группы
                if (level > 0) {
                    // Для исходящего коннектора: field = родительский id, sub = текущий item's id
                    let parentData = d3.select(this.parentNode.parentNode).datum();
                    // self.startLink(event, nodeData, parentData.id, "outgoing", item.id, { x: absoluteX, y: absoluteY });
                    self.startLink(event, nodeData, parentData.id, "outgoing", item.id, startPos);
                } else {
                    // self.startLink(event, nodeData, item.id, "outgoing", undefined, { x: absoluteX, y: absoluteY });
                    self.startLink(event, nodeData, item.id, "outgoing", undefined, startPos);
                }
            });
        // Рисуем входящий коннектор (слева)
        fieldGroup.append("circle")
            .attr("class", "connector incoming")
            .attr("id", level > 0
                ? `node-${pref}-${nodeData.id}-connector-in-${item.parentFieldId}-${item.id}`
                : `node-${pref}-${nodeData.id}-connector-in-${item.id}`)
            .attr("cx", x + padding)
            .attr("cy", self.baseItemHeight / 2)
            .attr("r", 5)
            .attr("fill", "#337bff")
            .style("cursor", "crosshair")
            .on("mouseup", function(event, d) {
                const endPos = self.getConnectorPosition(this);
                if (level > 0) {
                    // let parentData = d3.select(this.parentNode).datum();
                    // Для исходящего коннектора: field = родительский id, sub = текущий item's id
                    let parentData = d3.select(this.parentNode.parentNode).datum();
                    // self.endLink(event, nodeData, parentData.id, "incoming", item.id, { x: absoluteX, y: absoluteY });
                    self.endLink(event, nodeData, parentData.id, "incoming", item.id, endPos);
                } else {
                    // self.endLink(event, nodeData, item.id, "incoming", undefined, { x: absoluteX, y: absoluteY });
                    self.endLink(event, nodeData, item.id, "incoming", undefined, endPos);
                }
            });
    
        // Если есть вложённые айтемы – отрисовываем их рекурсивно
        if (item.children && item.children.length > 0) {
            let offsetY = self.gap;
            item.children.forEach((child, i) => {
                // child.computedY = y + baseItemHeight + offsetY + baseItemHeight / 2;
                child.parentFieldId = item.id;
                child.computedY = (this.baseItemHeight + offsetY) + this.baseItemHeight / 2;
                this.drawItem(fieldGroup, child, x, this.baseItemHeight + offsetY, parentWidth, level + 1, nodeData);
                offsetY += this.computeItemHeight(child);
                if (i < item.children.length - 1) {
                    offsetY += self.gap;
                }
            });
        }
    }
};
