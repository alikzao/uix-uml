export const eventMethods = {
    addEvents() {
        const svgEl = this.getEl('svg');
        if (!svgEl) return;
        // if (this._eventsAttached) return;
        // this._eventsAttached = true;
        // Изначальный коэффициент масштабирования
        let scale = 1;
        // Получаем ссылки на группу и кнопки
        const addNode   = this.getEl('btnAdd');
        const contentGp = this.getEl('zoom');     // <g id="zoomContainer-...">
        const zoomInBtn = this.getEl('btnIn');
        const zoomOutBtn= this.getEl('btnOut');
        const resetBtn  = this.getEl('btnReset');
        // Функция обновления трансформации группы
        function updateTransform() {
            contentGp.setAttribute('transform', 'scale(' + scale + ')');
        }
    
        this.addEvent(this.containerId, `#${this.ids.btnAdd}`, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
    
            this.openCreateNodePopup(addNode, {
                mountSelector: this.popupMountSelector,
                containerId: this.popupContainerId,
            });
        });
    
        // this.addEvent(this.containerId, `#${this.ids.svg}`, 'uml:itemMenu', (e) => {
        //     const { action, nodeId, fieldId, subId, anchorEl } = e.detail || {};
        //     if (action === "edit") return this.openEditItemPopup({ nodeId, fieldId, subId, anchorEl });
        //     if (action === "del")  return this.openDeleteItemPopup({ nodeId, fieldId, subId, anchorEl });
        //     if (action === "add")  return this.openAddChildItemPopup({ nodeId, fieldId, subId, anchorEl });
        // });
    
        this.addEvent(this.containerId, `#${this.ids.svg}`, 'click', (e) => {
            // NODE MENU: клик по ⋮ в заголовке ноды
            const nTrig = e.target.closest?.('.uml-node-menu-trigger');
            if (nTrig && svgEl.contains(nTrig)) {
                e.preventDefault();
                e.stopPropagation();
                this._openNodeMenuAt(nTrig);
                return;
            }
    
            // NODE MENU: клик по пункту меню
            // Просто закрываем меню и даём клику "дойти" до твоих существующих обработчиков
            const nAct = e.target.closest?.('.uml-node-menu-action');
            if (nAct && this._nodeMenu?.open) {
                const action = nAct.getAttribute("data-action");
                const nodeId  = nAct.getAttribute("data-node-id");
    
                this._closeNodeMenu();
    
                if (action === "edit") {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openEditNodePopup({ nodeId, anchorEl: nAct });
                    return;
                }
                if (action === "del") {
                    e.preventDefault();
                    e.stopPropagation();
                    this.openDeleteNodePopup({ nodeId, anchorEl: nAct });
                    return;
                }
            }
    
    
            // 0) открыть/закрыть меню по триггеру ⋮
            const trig = e.target.closest?.('.uml-item-menu-trigger');
            if (trig && svgEl.contains(trig)) {
                e.preventDefault();
                e.stopPropagation();
                this._openItemMenuAt(trig);
                return;
            }
    
            // 1) клик по пункту меню
            const act = e.target.closest?.('.uml-item-menu-action');
            if (act && this._itemMenu?.open) {
                e.preventDefault();
                e.stopPropagation();
    
                const action = act.getAttribute('data-action');
                const ctx = this._itemMenu.ctx; // {nodeId, fieldId, subId}
                this._closeItemMenu();
    
                // НИКАКОЙ бизнес-логики тут не вешаем.
                // Просто эмитим событие наружу — это не обработчик, а сигнал.
                // svgEl.dispatchEvent(new CustomEvent('uml:itemMenu', {
                //     detail: { action, ...ctx }
                // }));
                if (action === "edit") return this.openEditItemPopup(ctx);
                if (action === "del")  return this.openDeleteItemPopup(ctx);
                if (action === "add")  return this.openAddChildItemPopup(ctx);
                return;
            }
    
            // 2) твой существующий плюсик (как было)
            const plusEl = e.target.closest?.('.addNewExec');
            if (!plusEl) return;
            if (!svgEl.contains(plusEl)) return;
    
            e.preventDefault();
            e.stopPropagation();
    
            const nodeId = plusEl.getAttribute('data-node-id');
            const node = this.nodes?.find(n => String(n.id) === String(nodeId));
            if (!node) return;
    
            this.openCreateItemPopup(node, plusEl, {
                mountSelector: this.popupMountSelector,
                containerId: this.popupContainerId,
                endpoint: this.addFieldEndpoint,
            });
        });
    
        // Обработчик для кнопки увеличения
        this.addEvent(this.containerId, `#${this.ids.btnIn}`, 'click', () => {
            scale += 0.1;
            updateTransform();
        });
        // Обработчик для кнопки уменьшения
        this.addEvent(this.containerId, `#${this.ids.btnOut}`, 'click', () => {
            scale = Math.max(scale - 0.1, 0.1); // защита от отрицательного или нулевого масштаба
            updateTransform();
        });
        // Обработчик для кнопки сброса
        this.addEvent(this.containerId, `#${this.ids.btnReset}`, 'click', () => {
            scale = 1;
            updateTransform();
        });
    
        // === SEARCH events ===
        this.addEvent(this.containerId, `#${this.ids.btnSearch}`, 'click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this._toggleSearchUI();
        });
    
        this.addEvent(this.containerId, `#${this.ids.searchInput}`, 'keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                this._closeSearchUI();
                return;
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                const q = e.target.value || '';
                const ok = this._searchAndFocus(q);
                // если нашли — можно оставить поле открытым, либо закрывать:
                // if (ok) this._closeSearchUI();
            }
        });
    
        // клик вне поля — закрыть (аккуратно, чтобы не ломать другие меню)
        if (!this._onDocSearchClose) {
            this._onDocSearchClose = (ev) => {
                if (!this._searchOpen) return;
                const input = this.getEl('searchInput');
                const btn = this.getEl('btnSearch');
                if (input?.contains(ev.target) || btn?.contains(ev.target)) return;
                this._closeSearchUI();
            };
            document.addEventListener('pointerdown', this._onDocSearchClose, true);
        }
    
    }
};
