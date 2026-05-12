export const sceneMethods = {
    componentUpdate() {
        this.gap = 4; // отступ между полями
        this.baseItemHeight = 25;  // базовая высота айтема без вложенных элементов
    
        const svgContainer = d3.select(this.sel('svg'));
    
        d3.select(this.sel('svg'))
            .attr('overflow', 'visible')
            .style('overflow', 'visible'); // чтобы края не резались
    
        // жёсткий скоуп-стиль внутри самого SVG, чтобы перебить внешние CSS
        d3.select(this.sel('svg'))
            .append("style")
            .text(`#${this.ids.svg} .uml-link {
                fill: none !important;
                stroke: #7da4ec !important;
                stroke-width: 2.5 !important;
                stroke-linecap: round;
                stroke-linejoin: round;
                vector-effect: non-scaling-stroke;
                opacity: 1 !important;
                visibility: visible !important;
                display: inline !important;
                pointer-events: stroke;
              }
              
              /* FOUND NODE highlight */
              #${this.ids.svg} .uml-node-found .node-container {
                  stroke: #ffd166 !important;
                  stroke-width: 4 !important;
              }`);
    
    
        this.svg = svgContainer.append("g").attr("id", this.ids.zoom);
        // 1) СНАЧАЛА defs (фильтры, маркеры, градиенты)
        this.initSvgMarker();
    
        const self = this;
        self.tempLink = null; // Временная связь при перетаскивании
        if(!this.state.data) {
            self.nodes = [
                {id: 1, x: 100, y: 100, fields: [{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}]},
                {id: 2, x: 350, y: 150, fields: [{id: 1}, {id: 2}, {id: 3},
                        {id: 4,
                            children: [
                                {id: '4.1', label: "Nested 1"},
                                {id: '4.2', label: "Nested 2"}
                            ]
                        },
                        {id: 5}
                    ]
                },
                {id: 3, x: 600, y: 100, fields: [{id: 1}, {id: 2}, {id: 3}, {id: 4}, {id: 5}]}
            ];
            self.links = [
                {source: {node: 1, field: 1}, target: {node: 2, field: 3}},
                {source: {node: 1, field: 2}, target: {node: 3, field: 4}},
                {source: {node: 1, field: 2}, target: {node: 2, field: 4, sub: '4.2'}}
            ];
        } else {
            self.nodes = this.state.data.maps.nodes;
            self.links = this.state.data.maps.links;
        }
        // === АВТОПАЛИТРА ДЛЯ НОД: вставить сразу после self.nodes/self.links ===
        // Если у тебя уже есть hashHue/hslToHex в классе — используй их.
        // Если нет, этот блок самодостаточен: локальные мини-хелперы объявлены внутри.
        (() => {
            function hashHue(str) {
                let h = 0; str = String(str);
                for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0;
                return h % 360;
            }
            function hslToHex(h, s, l){
                s/=100; l/=100;
                const k = n => (n + h/30) % 12;
                const a = s * Math.min(l, 1 - l);
                const f = n => l - a * Math.max(-1, Math.min(k(n)-3, Math.min(9-k(n),1)));
                const toHex = x => Math.round(255*x).toString(16).padStart(2,'0');
                return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
            }
    
            self.nodes.forEach(n => {
                const key = n.directory || n.type || n.id;       // выбираем стабильный ключ
                const hue = hashHue(key);                         // 0..359 детерминированно
                n.lineColor = hslToHex(hue, 60, 45);              // красивый насыщенный оттенок
            });
        })();
    
        if(this.isOwnSimulation) {
            const coords = this.assignCoordinates(self.nodes, self.links);
            self.nodes = coords.nodes;
            self.links = coords.links;
            self.diagramWidth = coords.diagramWidth;
            self.diagramHeight = coords.diagramHeight;
            console.log("diagramWidth:", self.diagramWidth, "diagramHeight:", self.diagramHeight);
    
            d3.select(this.sel('svg'))
                .attr("width",  self.diagramWidth)           // число
                .attr("height", self.diagramHeight)
                .style("width",  self.diagramWidth + "px")   // именно px!
                .style("height", self.diagramHeight + "px")
                .style("display", "block");                  // убирает инлайн-артефакты
    
            // const pad = 24; // запас по краям
            // d3.select(this.sel('svg'))
            //     .attr('viewBox', `${-pad} ${-pad} ${self.diagramWidth + pad*2} ${self.diagramHeight + pad*2}`);
                // .attr('viewBox', `${-pad} ${-pad} ${self.diagramWidth + pad*2} ${self.diagramHeight + pad*2}`);
                // .attr('viewBox', `${0} ${0} ${self.diagramWidth + pad} ${self.diagramHeight + pad}`);
    
            const pad = 24;   // общий запас, как было
            const padL = 0;   // слева 0
    
            d3.select(this.sel('svg'))
                .attr('viewBox', `${-padL} ${-pad} ${self.diagramWidth + padL + pad} ${self.diagramHeight + pad*2}`);
            d3.select(this.sel('svg')).attr('preserveAspectRatio', 'xMinYMin meet');
    
            d3.select(this.sel('inner'))
                .style("width",  self.diagramWidth + "px")
                .style("height", self.diagramHeight + "px");
    
            d3.select(this.sel('container'))
                .style("white-space", "nowrap");   // чтобы inline-block не переносился
    
    
        }
        // Создаем группы для нод и подключаем обработчики перетаскивания
        self.nodeSelection = self.svg.selectAll(".node-group")
            .data(self.nodes)
            .enter()
            .append("g")
            .attr("class", "node-group")
            .attr("transform", d => `translate(${d.x},${d.y})`)
            .call(d3.drag()
                .filter((event) => {
                    const t = event.target;
                    if (t?.closest?.('.addNewExec')) return false;
                    if (t?.closest?.('.connector'))  return false;
                    if (t?.closest?.('.field-group')) return false;
    
                    // ===== ДОБАВИТЬ ВОТ ЭТО =====
                    if (t?.closest?.('.uml-node-menu-trigger')) return false;   // ⋮ меню ноды
                    if (t?.closest?.('.uml-node-edit-icon')) return false;      // ✎
                    if (t?.closest?.('.uml-node-trash-icon')) return false;     // 🗑
    
                    // (опционально) чтобы клики по меню не пытались драгать ноду
                    // if (t?.closest?.('.uml-node-menu')) return false;
                    return true;
                })
                .on("start", function(event, d) {self.dragStart(event, d, this)})
                .on("drag", function(event, d)  {self.dragging(event, d, this)})
                .on("end", function(event, d) {self.dragEnd(event, d, this)}));
    
        // В каждой ноде вычисляем динамическую высоту
        // и рисуем контейнер + поля (с учётом вложенных children)
        self.nodeSelection.each(function(nodeData) {
            const group = d3.select(this);
            self.drawNode(group, nodeData);
            // Отрисовка полей ноды с использованием рекурсии
            let currentY = 30;
            nodeData.fields.forEach(field => {
                self.drawItem(group, field, 0, currentY, 140, 0, nodeData);
                currentY += self.computeItemHeight(field) + 4;
            });
            // Ширина ноды фиксирована (140), а высота = currentY + некоторый отступ
            nodeData.width = 140;
            nodeData.height = currentY + 10;
        });
    
        // Отрисовка уже существующих связей (links)
        // 3) линии — ТЕПЕРЬ ПОСЛЕ defs
            if(!this.isHalloLines){
               self.linkSelection = self.svg.selectAll(".uml-link")
                     .data(self.links)
                .enter()
                 .append("path")
                 .attr("class", "uml-link")
                 .attr("marker-end", `url(#${this.markerId})`);
            } else {
               self.linkSelection = self.svg.selectAll(".uml-link")
                 .data(self.links)
                 .enter()
                 .append("path")
                 .attr("class", "uml-link")
                 .attr("marker-end", `url(#${this.markerId})`)
                 .attr("filter", `url(#${this.ids.glow})`)
                 .style("fill", "none")
                 .style("stroke-linecap", "round");
            }
    
        // queueMicrotask(() => this.safeUpdateLinks(true));
    
        const ensureLinksReady = () => {
            // Проверяем, что хотя бы один коннектор имеет реальные координаты
            const firstConnector = this.svg.select(".connector").node();
            if (firstConnector) {
                const testPos = this.getConnectorPosition(firstConnector);
                if (testPos && testPos.x !== 0 && testPos.y !== 0) {
                    // DOM готов, можем обновлять связи
                    this.forceCoordinateUpdate();
                    this.safeUpdateLinks(true);
                    self.linkSelection.raise();
    
                    // Дополнительное обновление для стабильности
                    setTimeout(() => {
                        this.forceCoordinateUpdate();
                        this.safeUpdateLinks(true);
                        this.initHBar();
                    }, 150);
                    return;
                }
            }
            // Если не готовы - повторяем проверку
            requestAnimationFrame(ensureLinksReady);
        };
        // Начинаем проверку после небольшой задержки
        setTimeout(ensureLinksReady, 50);
        setTimeout(() => this.initHBar(), 250);
        if (this.isHalloLines) {
            self.linkSelection
                .on("mouseenter", function (event, d) {
                    // если была активная линия и это другая — снять подсветку с предыдущей
                    if (self._activeLinkEl && self._activeLinkEl !== this) {
                        d3.select(self._activeLinkEl)
                            .attr("filter", `url(#${self.ids.glow})`)
                            .attr("stroke-width", 2.5);
                    }
                    self._activeLinkEl = this;
    
                    d3.select(this)
                        .attr("filter", `url(#${self.ids.glowStrong})`)
                        .attr("stroke-width", 2.5);
    
                    if (self._hideTrashTimer) clearTimeout(self._hideTrashTimer);
                    self.ensureSharedLinkTrash();
                    const p0 = self.clientToGroupPoint(event.clientX, event.clientY);
                    const { t, L } = self._closestPointOnPath(this, p0.x, p0.y, 30);
    
                    const ahead = Math.min(L, t + 18);
                    const p = this.getPointAtLength(ahead);
    
                    const pA = this.getPointAtLength(Math.max(0, ahead - 2));
                    const pB = this.getPointAtLength(Math.min(L, ahead + 2));
                    let vx = pB.x - pA.x, vy = pB.y - pA.y;
                    const vlen = Math.hypot(vx, vy) || 1;
                    vx /= vlen; vy /= vlen;
    
                    const nx = -vy, ny = vx;
                    const ox = vx * 10 + nx * 12;
                    const oy = vy * 10 + ny * 12;
    
                    self._linkTrash.sel
                        .attr("transform", `translate(${p.x + ox},${p.y + oy - 10})`)
                        .style("display", "block")
                        .raise();
                    self._linkTrash.open = true;
                    self._linkTrash.ctx = d;          // вот что удаляем при клике
                    self._linkTrash.pathEl = this;
                })
                .on("mousemove", function (event) { })
                .on("mouseleave", function () {
                    // d3.select(this)
                    //     .attr("filter", `url(#${self.ids.glow})`)
                    //     .attr("stroke-width", 2.5);
                });
        }
    
        // this.safeUpdateLinks();
        self.linkSelection.raise();
        // this.postInitKick();
    // 1) Форсим тот же шаг, что делает drag (проставляем transform ещё раз)
        this.nodeSelection.each(function(d){
            const g = d3.select(this);
            g.attr("transform", `translate(${d.x},${d.y})`);
        });
    
    // 2) Одним проходом кешируем абсолютные позиции коннекторов (как после drag)
        this.svg.selectAll(".field-group .connector").each((_, i, arr) => {
            const el = arr[i];
            const pos = this.getConnectorPosition(el); // уже существующий метод!
            if (!pos) return;
    
            // у нас datum() на .field-group — это сам field
            const field = d3.select(el.parentNode).datum();
            if (!field) return;
    
            if (el.classList.contains("outgoing")) {
                field.absoluteOutConnector = pos;
            } else {
                field.absoluteInConnector = pos;
            }
        });
    
    // 3) Гарантированный пересчёт кривых
        this.safeUpdateLinks(true);
    
        self.addEvents();
        if(this.isSimulation) {
            this.simulation(self.nodes, self.nodeSelection);
        }
        this.svg.style("pointer-events", "all");
        // this.updateSVGSize();
    },

    forceCoordinateUpdate() {
        // Cache all connector positions after DOM is ready
        this.nodeSelection.each((nodeData) => {
            nodeData.fields.forEach(field => {
                this.cacheConnectorPositions(field, nodeData);
            });
        });
    },

    cacheConnectorPositions(field, nodeData) {
        // Cache main field connectors
        const pref = this._uid;
    
        const outId = `node-${pref}-${nodeData.id}-connector-out-${field.id}`;
        const inId  = `node-${pref}-${nodeData.id}-connector-in-${field.id}`;
    
        const outConnector = document.getElementById(outId);
        const inConnector = document.getElementById(inId);
    
        if (outConnector) {
            field.absoluteOutConnector = this.getConnectorPosition(outConnector);
        }
        if (inConnector) {
            field.absoluteInConnector = this.getConnectorPosition(inConnector);
        }
    
        // Cache child connector positions if they exist
        if (field.children && field.children.length > 0) {
            field.children.forEach(child => {
                const childOutId = `node-${pref}-${nodeData.id}-connector-out-${field.id}-${child.id}`;
                const childInId  = `node-${pref}-${nodeData.id}-connector-in-${field.id}-${child.id}`;
    
                const childOutConnector = document.getElementById(childOutId);
                const childInConnector = document.getElementById(childInId);
    
                if (childOutConnector) {
                    child.absoluteOutConnector = this.getConnectorPosition(childOutConnector);
                }
                if (childInConnector) {
                    child.absoluteInConnector = this.getConnectorPosition(childInConnector);
                }
            });
        }
    },

    simulation(nodes, nodeSelection) {
        const simulation = d3.forceSimulation(nodes)
            // Усиливаем отталкивание для крупных нод
            .force("charge", d3.forceManyBody().strength(-300))
            // Центр (можно подобрать координаты под ваш canvas)
            .force("center", d3.forceCenter(600, 300))
            // Учитываем «столкновения» на основе диагонали прямоугольника
            .force("collide", d3.forceCollide(d => {
                const rx = (d.width || 140) / 2;
                const ry = (d.height || 50) / 2;
                // Радиус берем как половину диагонали
                return Math.sqrt(rx * rx + ry * ry);
            }).iterations(3))
            // Небольшие силы по осям, чтобы не «разлетались» сильно
            .force("x", d3.forceX(600).strength(0.1))
            .force("y", d3.forceY(300).strength(0.1))
            .on("tick", () => {
                // При каждом тике симуляции обновляем позиции групп нод
                nodeSelection.attr("transform", d => `translate(${d.x},${d.y})`);
                // и связи
                this.safeUpdateLinks();
            })
    
        simulation.on("end", () => {
            // Определяем границы из координат нод
            const xExtent = d3.extent(nodes, d => d.x);
            const yExtent = d3.extent(nodes, d => d.y);
    
            // Добавляем отступы
            const width = xExtent[1] - xExtent[0] + 200;
            const height = yExtent[1] - yExtent[0] + 100;
            console.log("########################## width => ", width);
            // Устанавливаем размер SVG
            d3.select(this.sel('svg'))
                .attr("width", width)
                .attr("height", height)
                .style("width", width + "px")
                .style("height", height + "px")
                .style("overflow", "visible");
            // .style("overflow", "auto");
    
            // d3.select(this.sel('container'))
            //     .style("position", "relative")
            //     .style("min-width", "0")
            //     .style("min-height", "0")
            //     .style("display", "block")
            //     .style("width", "100%")
            //     .style("height", "70vh")     // фиксируем видимую высоту окна
            //     .style("overflow-x", "auto") // горизонтальный скролл здесь
            //     .style("overflow-y", "auto"); // и вертикальный при необходимости
            // const cont = this.getEl('container');
            // cont.style.overflowX = 'scroll';  // дубль-приказ на случай каскада
            // cont.style.overflowY = 'auto';
    
            console.log('clientWidth=', cont.clientWidth, 'scrollWidth=', cont.scrollWidth);
        });
    }
};
