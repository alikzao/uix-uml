export const hbarMethods = {
    initHBar() {
        const hb    = document.getElementById(`hbar-${this._uid}`);
        const rail  = document.getElementById(`hbar-inner-${this._uid}`);
        const inner = this.getEl('inner');
        const svgEl = this.getEl('svg');
    
        if (!hb || !rail || !inner || !svgEl) return;
        hb.scrollLeft = 0;                 // сброс позиции скролла
        svgEl.style.transform = 'translateX(0px)';  // сброс сдвига
    
        // 1) Рассчитать реальную ширину контента
        let svgW = 0;
        // приоритет: явная диаграмма → inline-стили → bbox
        svgW = this.diagramWidth || parseInt(svgEl.style.width || 0) || 0;
        if (!svgW && svgEl.getBBox) {
            try { svgW = Math.ceil(svgEl.getBBox().width); } catch(e) {}
        }
        if (!svgW) svgW = 1200; // безопасный дефолт
    
        // ширина "рельсы" = max(видимой ширины, контента)
        rail.style.width = Math.max(inner.clientWidth + 1, svgW) + 'px';
    
        // запрещаем родной горизонтальный скролл у inner — скроллим только нижней полосой
        inner.style.overflowX = 'hidden';
        inner.style.position  = inner.style.position || 'relative';
    
        // контент двигаем трансформацией — дёшево
        svgEl.style.willChange = 'transform';
        svgEl.style.transform  = 'translateX(0px)';
    
        // 2) Позиционирование и показ/скрытие полосы относительно контейнера
        const cont = this.getEl('container');
        const placeBar = () => {
            if (!cont) return;
            const r = cont.getBoundingClientRect();
            const onScreen = r.bottom > 0 && r.top < window.innerHeight;
            // hb.style.display = onScreen ? 'block' : 'none';
            // hb.classList.add('uml-hbar--fixed');  // фиксированная полоска
            // Класс уже есть с рендера; просто обновляем позицию/ширину
            hb.style.left  = `${Math.max(0, r.left)}px`;
            hb.style.width = `${Math.min(window.innerWidth - Math.max(0, r.left), r.width)}px`;
            // Показываем только после первого корректного позиционирования
            if (!this._hbarShownOnce) {
                hb.style.visibility = 'visible';
                this._hbarShownOnce = true;
            }
            hb.style.left  = `${Math.max(0, r.left)}px`;
            hb.style.width = `${Math.min(window.innerWidth - Math.max(0, r.left), r.width)}px`;
        };
        placeBar();
    
        // 3) Связка прокрутки
        // let raf = 0, wantX = 0;
        let raf = 0, wantX = hb.scrollLeft || 0;
        const apply = () => { raf = 0; svgEl.style.transform = `translateX(${-wantX}px)`; };
        hb.onscroll = () => { wantX = hb.scrollLeft; if (!raf) raf = requestAnimationFrame(apply); };
        hb.onwheel  = (e) => {
            const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
            hb.scrollLeft += d;
            e.preventDefault();
        };
    
        // 4) Один раз навешиваем наблюдателей — чтобы не зависеть от таймингов
        if (!this._hbarObserved) {
            this._hbarObserved = true;
    
            const ro = new ResizeObserver(() => {
                // при изменении размеров пересчитать ширину рельсы и позицию
                let w = this.diagramWidth || parseInt(svgEl.style.width || 0) || 0;
                if (!w && svgEl.getBBox) {
                    try { w = Math.ceil(svgEl.getBBox().width); } catch(e) {}
                }
                if (!w) w = 1200;
                rail.style.width = Math.max(inner.clientWidth + 1, w) + 'px';
                placeBar();
            });
    
            try { ro.observe(inner); } catch(e) {}
            try { ro.observe(svgEl); } catch(e) {}
            try { ro.observe(document.body); } catch(e) {}
    
            window.addEventListener('resize', placeBar, { passive: true });
            window.addEventListener('scroll', placeBar, { passive: true });
        }
    }
    
    // Внутри class UML …
};
