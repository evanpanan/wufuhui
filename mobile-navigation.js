/* Shared page history for the mobile prototype. Business IDs stay stable. */
(function () {
    const titles = {
        'activity-detail-modal': '活动详情', 'booking-modal': '确认预约',
        'special-access-modal': '特批邀请码', 'payment-success-modal': '预约与支付结果',
        'mall-detail-modal': '严选详情', 'mall-buy-modal': '确认订单',
        'badge-modal': '会员与权益', 'live-modal': '观看',
        'all-previews-modal': '直播预告', 'preview-detail-modal': '预告详情',
        'replay-library-modal': '全部回放', 'notification-modal': '消息通知',
        'activity-calendar-modal': '活动日历', 'my-bookings-modal': '我的行程',
        'trade-records-modal': '我的订单', 'settings-modal': '设置',
        'compliance-modal': '投资者认证', 'password-modal': '修改密码',
        'e-ticket-modal': '电子票', 'after-sales-modal': '售后申请',
        'home-column-modal': '专栏回放', 'customer-service-modal': '专属客服',
        'ai-chat-modal': '老师 AI 分身', 'teacher-reference-modal': '原声试听',
        'teacher-call-page': '语音对话',
        'wealth-assessment-modal': 'AI 五富评估'
    };
    const minimumPhase = {
        'mall-detail-modal': 2, 'mall-buy-modal': 2, 'badge-modal': 2,
        'all-previews-modal': 2, 'preview-detail-modal': 2, 'notification-modal': 2,
        'activity-calendar-modal': 2, 'special-access-modal': 2,
        'ai-chat-modal': 3, 'teacher-reference-modal': 3, 'wealth-assessment-modal': 3,
        'teacher-call-page': 3,
        'compliance-modal': 3, 'after-sales-modal': 3
    };
    const overlays = new Set([
        'e-ticket-modal', 'badge-modal', 'special-access-modal', 'teacher-reference-modal'
    ]);
    const pages = new Map();
    const positions = new Map();
    const focusOrigins = new Map();
    let route = { tab: 'home', pages: [] };
    let shell;
    let pendingHistory = false;
    let painting = false;
    const queue = [];

    function snapshotScroll() {
        const id = route.pages.at(-1) || 'root';
        const host = id === 'root' ? document.getElementById('app-body') : pages.get(id);
        if (!host) return;
        positions.set(id, [host, ...host.querySelectorAll('*')].filter(el => el.scrollTop)
            .map(el => [el, el.scrollTop]));
    }
    function rememberRoute(replace = false) {
        const id = route.pages.at(-1);
        const kind = overlays.has(id) ? 'dialog' : 'page';
        const search = new URLSearchParams(location.search);
        search.set('phase', PHASE);
        const url = location.pathname + '?' + search + (id ? '#' + kind + '=' + encodeURIComponent(id) : '');
        history[replace ? 'replaceState' : 'pushState']({ mobileApp: true, ...route }, '', url);
    }
    function registerPages() {
        shell ||= document.getElementById('mobile-app-shell');
        if (!shell) return;
        Object.entries(titles).forEach(([id, title]) => {
            const page = document.getElementById(id);
            if (!page || pages.has(id)) return;
            const content = page.firstElementChild;
            page.classList.add('app-page');
            if (overlays.has(id)) {
                page.classList.add('app-overlay');
                content.classList.add('app-overlay-content');
                page.setAttribute('role', 'dialog');
                page.setAttribute('aria-modal', 'true');
                const heading = content.querySelector('h2, h3');
                if (heading) {
                    heading.id ||= 'app-overlay-title-' + id;
                    page.setAttribute('aria-labelledby', heading.id);
                } else page.setAttribute('aria-label', title);
                page.querySelectorAll('button[onclick]').forEach(button => {
                    if (/^close\w+\(/.test(button.getAttribute('onclick'))) {
                        button.classList.add('app-overlay-dismiss');
                        if (!button.textContent.trim() && !button.hasAttribute('aria-label')) {
                            button.setAttribute('aria-label', '关闭' + title);
                        }
                    }
                });
                page.addEventListener('click', event => {
                    if (event.target === page) closeAppPage(id);
                });
                shell.append(page);
                pages.set(id, page);
                return;
            }
            page.setAttribute('role', 'region');
            page.removeAttribute('aria-modal');
            page.setAttribute('aria-labelledby', 'app-page-title-' + id);
            content.classList.add('app-page-content');
            if (content.classList.contains('flex-col')) page.classList.add('app-page-structured');
            page.querySelectorAll('button[onclick]').forEach(button => {
                if (/^(close\w+\([^;]*\);?$|backToActivityDetail|backToMallDetail)/.test(button.getAttribute('onclick'))) {
                    button.classList.add('app-obsolete-close');
                }
            });
            const header = document.createElement('header');
            header.className = 'app-page-header';
            const back = document.createElement('button');
            back.type = 'button';
            back.className = 'app-page-back';
            back.setAttribute('aria-label', '返回上一页');
            back.innerHTML = '<i class="fa-solid fa-chevron-left" aria-hidden="true"></i><span>返回</span>';
            back.onclick = () => closeAppPage(id);
            const heading = document.createElement('h1');
            heading.id = 'app-page-title-' + id;
            heading.textContent = title;
            header.append(back, heading);
            page.prepend(header);
            shell.append(page);
            pages.set(id, page);
        });
    }
    function paint(next) {
        registerPages();
        const previousTop = route.pages.at(-1);
        const nextTop = next.pages.at(-1);
        const previousTab = route.tab;
        route = { tab: next.tab, pages: [...next.pages] };
        painting = true;
        if (previousTab !== route.tab && typeof switchTab === 'function') switchTab(route.tab);
        painting = false;
        const basePage = [...route.pages].reverse().find(id => !overlays.has(id));
        const visiblePages = overlays.has(nextTop)
            ? route.pages.slice(basePage ? route.pages.indexOf(basePage) : 0) : [nextTop];
        shell.classList.toggle('has-app-page', Boolean(basePage));
        document.querySelectorAll('#app-body, #app-header, #app-tab-bar').forEach(el => {
            el.inert = Boolean(nextTop);
        });
        pages.forEach((page, id) => {
            page.classList.toggle('hidden', !visiblePages.includes(id));
            page.inert = id !== nextTop;
            page.setAttribute('aria-hidden', String(id !== nextTop));
            if (overlays.has(id)) page.style.setProperty('z-index', String(70 + route.pages.indexOf(id)), 'important');
        });
        if (previousTop && previousTop !== nextTop) {
            document.getElementById(previousTop)?.dispatchEvent(new Event('app-page-leave'));
        }
        if (nextTop && previousTop !== nextTop) {
            document.getElementById(nextTop)?.dispatchEvent(new Event('app-page-enter'));
        }
        if (nextTop) {
            const page = pages.get(nextTop);
            if (overlays.has(nextTop)) {
                page.querySelector('.app-overlay-dismiss')?.focus({ preventScroll: true });
            } else {
                const originalTitle = page.querySelector('#home-column-title, #teacher-chat-name, #teacher-reference-title, #teacher-call-name');
                page.querySelector('.app-page-header h1').textContent = page.dataset.navigationTitle || originalTitle?.textContent || titles[nextTop];
                page.querySelector('.app-page-back').focus({ preventScroll: true });
            }
        }
        if (overlays.has(previousTop) && !route.pages.includes(previousTop)) {
            const saved = focusOrigins.get(previousTop);
            const origin = saved?.element?.isConnected ? saved.element :
                [...(document.getElementById(saved?.parent)?.querySelectorAll('[onclick]') || [])]
                    .find(el => el.getAttribute('onclick') === saved?.action);
            if (origin?.isConnected && !origin.closest('[inert]') && origin.getClientRects().length) {
                origin.focus({ preventScroll: true });
            }
        }
        requestAnimationFrame(() => {
            (positions.get(nextTop || 'root') || []).forEach(([el, top]) => { el.scrollTop = top; });
        });
    }
    function flushQueue() {
        while (!pendingHistory && queue.length) queue.shift()();
    }
    function travelBack(count, next, after) {
        if (!count) { paint(next); after?.(); return; }
        snapshotScroll();
        pendingHistory = true;
        paint(next);
        if (after) queue.push(after);
        history.go(-count);
    }
    window.openAppPage = function (id) {
        if (pendingHistory) { queue.push(() => openAppPage(id)); return; }
        if (PHASE < (minimumPhase[id] || 1)) return;
        registerPages();
        if (!pages.has(id)) return;
        const existing = route.pages.indexOf(id);
        if (existing >= 0) {
            if (existing < route.pages.length - 1) {
                travelBack(route.pages.length - existing - 1, { ...route, pages: route.pages.slice(0, existing + 1) });
            }
            return;
        }
        snapshotScroll();
        positions.delete(id);
        const origin = document.activeElement;
        focusOrigins.set(id, {
            element: origin,
            parent: origin?.closest('.app-page')?.id || 'app-body',
            action: origin?.getAttribute('onclick')
        });
        paint({ ...route, pages: [...route.pages, id] });
        rememberRoute();
    };
    window.closeAppPage = function (id) {
        if (pendingHistory) { queue.push(() => closeAppPage(id)); return; }
        const index = route.pages.indexOf(id);
        if (index < 0) return;
        travelBack(route.pages.length - index, { ...route, pages: route.pages.slice(0, index) });
    };
    function compatibleRoute(source) {
        const firstUnavailable = source.pages.findIndex(id => !pages.has(id) || PHASE < (minimumPhase[id] || 1));
        return {
            tab: source.tab === 'mall' && PHASE < 2 ? 'home' : source.tab,
            pages: firstUnavailable < 0 ? [...source.pages] : source.pages.slice(0, firstUnavailable)
        };
    }
    window.MobileNavigation = {
        setRootTab(tab) {
            if (painting || route.pages.length) return;
            route.tab = tab;
            rememberRoute(true);
        },
        refreshPhase() {
            if (pendingHistory) { queue.push(() => this.refreshPhase()); return; }
            const next = compatibleRoute(route);
            const count = route.pages.length - next.pages.length;
            if (count) travelBack(count, next, () => rememberRoute(true));
            else {
                if (next.tab !== route.tab) paint(next);
                rememberRoute(true);
            }
        },
        finishFlow(tab, after) {
            if (pendingHistory) { queue.push(() => this.finishFlow(tab, after)); return; }
            travelBack(route.pages.length, { tab: tab || route.tab, pages: [] }, () => {
                rememberRoute(true);
                after?.();
            });
        },
        getRoute: () => ({ tab: route.tab, pages: [...route.pages] }),
        registerPages
    };
    window.addEventListener('popstate', event => {
        const state = event.state;
        const next = compatibleRoute(state?.mobileApp ? state : { tab: route.tab, pages: [] });
        // Explicit back already painted the requested destination.
        if (!pendingHistory) {
            snapshotScroll();
            paint(next);
        }
        pendingHistory = false;
        rememberRoute(true);
        flushQueue();
    });
    document.addEventListener('keydown', event => {
        const top = route.pages.at(-1);
        if (event.key === 'Tab' && overlays.has(top)) {
            const elements = [...pages.get(top).querySelectorAll('button:not(:disabled), input:not(:disabled), select, textarea, audio[controls], [tabindex="0"]')]
                .filter(element => element.getClientRects().length);
            const first = elements[0], last = elements.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        }
        if (event.key === 'Escape' && route.pages.length) {
            event.preventDefault();
            event.stopImmediatePropagation();
            closeAppPage(route.pages.at(-1));
        }
    }, true);
    document.addEventListener('DOMContentLoaded', () => queueMicrotask(() => {
        registerPages();
        history.scrollRestoration = 'manual';
        rememberRoute(true);
        if (window.visualViewport) {
            const resize = () => document.documentElement.style.setProperty('--app-height', window.visualViewport.height + 'px');
            window.visualViewport.addEventListener('resize', resize);
            resize();
        }
    }));
})();
