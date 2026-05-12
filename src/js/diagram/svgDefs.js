export const svgDefMethods = {
    initSvgMarker() {
        // Создаем блок defs, если его еще нет
        const defs = this.svg.append("defs");
        // Хало/свечение у линий
        const glow = defs.append("filter").attr("id", this.ids.glow);
        glow.append("feGaussianBlur").attr("stdDeviation","2.2").attr("result","blur");
        glow.append("feMerge")
            .selectAll("feMergeNode")
            .data(["blur","SourceGraphic"])
            .enter().append("feMergeNode").attr("in", d=>d);
        let glowStrong = null;
    
        if (this.isHalloLines) {
            glowStrong = defs.append("filter")
                .attr("id", this.ids.glowStrong)
                .attr("x", "-40%").attr("y", "-40%")
                .attr("width", "180%").attr("height", "180%");
    
            glowStrong.append("feGaussianBlur")
                .attr("stdDeviation", "3.2")
                .attr("result", "blur");
    
            glowStrong.append("feComponentTransfer")
                .attr("in", "blur")
                .attr("result", "blurStrong")
                .append("feFuncA")
                .attr("type", "gamma")
                .attr("amplitude", "1.6")
                .attr("exponent", "1.0")
                .attr("offset", "0");
    
            glowStrong.append("feColorMatrix")
                .attr("in", "blurStrong")
                .attr("result", "glowColor")
                .attr("type", "matrix")
                .attr("values", `
      0 0 0 0 0.45
      0 0 0 0 0.65
      0 0 0 0 1.00
      0 0 0 1 0
    `);
    
            glowStrong.append("feMerge")
                .selectAll("feMergeNode")
                .data(["glowColor", "SourceGraphic"])
                .enter().append("feMergeNode")
                .attr("in", d => d);
        }
    
        // Добавляем градиент для шапки
        defs.append("linearGradient")
            .attr("id", this.ids.gradGreen)
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .selectAll("stop")
            .data([
                { offset: "30%", color: "rgba(96, 131, 91, 0.8)" },
                { offset: "70%", color: "rgba(72, 72, 72, 0.8)" }
            ])
            .enter()
            .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
        // В блоке defs (например, внутри initSvgMarker) добавляем второй градиент
        defs.append("linearGradient")
            .attr("id", this.ids.gradRose)
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .selectAll("stop")
            .data([
                { offset: "20%", color: "rgb(134, 65, 112)" },
                { offset: "80%", color: "rgb(72, 72, 72)" }
            ])
            .enter()
            .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
    
        defs.append("linearGradient")
            .attr("id", this.ids.gradYellow)
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .selectAll("stop")
            .data([
                { offset: "20%", color: "rgb(189,198,56)" },
                { offset: "80%", color: "rgb(124,122,122)" }
            ])
            .enter()
            .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
    
        defs.append("linearGradient")
            .attr("id", this.ids.gradBruin)
            .attr("x1", "0%")
            .attr("y1", "100%")
            .attr("x2", "100%")
            .attr("y2", "0%")
            .selectAll("stop")
            .data([
                { offset: "10%", color: "rgb(159, 70, 56)" },
                { offset: "90%", color: "rgb(72, 72, 72)" }
            ])
            .enter()
            .append("stop")
            .attr("offset", d => d.offset)
            .attr("stop-color", d => d.color);
        // Инициализируем маркер (стрелку) для связей
        defs.append("marker")
            .attr("id", this.markerId)
            .attr("viewBox", "0 0 10 5")
            .attr("refX", 8)
            .attr("refY", 3)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", "M 0 0 L 10 3.5 L 0 5 Z")
            .attr("fill", "#6c2e2e")
            .style("stroke", "#9A9FA8FF")
            .style("stroke-width", 0.5);
    }
};
